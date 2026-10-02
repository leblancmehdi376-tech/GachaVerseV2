// Personnages : héros, niveaux/évolutions, composition d'équipe, calcul de DPS.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { EVOLUTION_STONE_ITEM_ID } from '@/types/game';
import { calcCharDps, levelUpCost, heroLevelUpCost, evoCost, canEvolve, canEvolveHero, evoStoneCost } from '@/lib/game/formulas';
import { getCharacterById, HERO_TEMPLATE } from '@/lib/game/characters';
import { computeEquippedMultiplier } from '@/lib/game/items';
import { computeActiveSynergies, calcDpsWithSynergies } from '@/lib/game/synergies';
import { parseInstanceKey } from '@/lib/game/editions';
import { getAffinityForId, getAffinityMultiplier } from '@/lib/game/affinities';
import { RARITY_GATES } from '@/lib/game/gacha';
import { BOOST_MULTIPLIER } from '@/lib/game/shop';
import { calcAnomalyBonuses } from '@/lib/game/anomalies';
import { computeCohesion } from '@/lib/game/cohesion';
import { getGoldChestCost, getGoldGainBreakdown, runPeakPalierOf, getPrestigeBonuses } from '../gameStoreHelpers';
import type { GameStore, CharacterSlice, DpsBreakdownChar } from '../gameStore.types';
import { BN_ZERO, bnAdd, bnDivRatio, bnGte, bnMulScalar, bnSub, bnToNumber, type BigNum } from '@/lib/game/bignum';
import { addStats } from '@/lib/game/achievementStats';
import { STAT, getMasteryDpsMult } from '@/lib/game/achievements';
import { bumpQuestsIn } from './questSlice';

// Compteurs communs à toute amélioration (quêtes "Améliorer tes personnages"
// jour/semaine + cumul à vie), sous forme de patch à fusionner dans le set()
// de l'action : une amélioration = une seule mise à jour du store.
// `spent` : Pixel-Coins dépensés par cette amélioration (succès "Dépenser X").
function upgradeCountersPatch(state: GameStore, count: number, spent: BigNum): Partial<GameStore> {
  const daily = bumpQuestsIn(state, 'd_upgrade', count);
  const weekly = bumpQuestsIn({
    quests: daily.quests ?? state.quests,
    weeklyQuests: daily.weeklyQuests ?? state.weeklyQuests,
    raidQuests: daily.raidQuests ?? state.raidQuests,
  }, 'w_upgrade', count);
  return {
    ...daily, ...weekly,
    totalUpgradesPerformed: (state.totalUpgradesPerformed ?? 0) + count,
    achievementStats: addStats(state.achievementStats, { [STAT.coinsSpent]: bnToNumber(spent) }),
  };
}

// Cache des calculs de DPS / or : ils sont relus plusieurs fois par seconde
// (tick de combat, zone de combat, cartes alliées, suivi des succès) alors que
// leurs entrées ne changent que rarement. Les entrées sont comparées par
// référence (le store ne les mute jamais en place) ; les boosts limités dans
// le temps sont comparés par leur valeur courante. Renvoyer le même objet tant
// que rien ne change permet aussi aux composants de s'abonner au résultat sans
// se re-rendre à chaque tick.
type Memo<T> = { deps: unknown[]; value: T };
function memoize<T>(memo: Memo<T> | undefined, deps: unknown[], compute: () => T): Memo<T> {
  if (memo && memo.deps.length === deps.length && memo.deps.every((d, i) => Object.is(d, deps[i]))) return memo;
  return { deps, value: compute() };
}

export const createCharacterSlice: StateCreator<GameStore, [], [], CharacterSlice> = (set, get) => {
  let dpsMemo: Memo<ReturnType<GameStore['getDpsBreakdown']>> | undefined;
  let goldMemo: Memo<ReturnType<GameStore['getGoldBreakdown']>> | undefined;
  const charDpsMemo = new Map<string, Memo<ReturnType<GameStore['getCharDpsBreakdown']>>>();
  const dpsDeps = (s: GameStore) => [
    s.equippedTeam, s.collection, s.charMastery, s.prestigeBonusLevels, s.prestigeRankRecoveryLevel,
    s.ownedAnomalies, s.currentEnemy?.name, s.ultActiveUlts, s.isDpsBoostActive(), s.dpsBoostEndsAt, s.getEventDpsMult(),
  ];

  function computeCharDpsBreakdown(templateId: string) {
    const { equippedTeam, collection } = get();
    const owned = collection[templateId];
    const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/ulti/type/synergie partagés entre éditions)
    const tpl   = getCharacterById(pureId);
    if (!owned || !tpl) return { base: BN_ZERO, typeMult: 1, final: BN_ZERO };

    const activeSynergies = computeActiveSynergies(equippedTeam);
    const boostMult    = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
    const prestigeMult = getPrestigeBonuses(get().prestigeBonusLevels, get().prestigeRankRecoveryLevel).dpsMult;
    const anomalyBonuses = calcAnomalyBonuses(get().ownedAnomalies);
    const anomalySynMult = 1 + (anomalyBonuses.synergyBoostByUniverse[tpl.universe ?? ''] ?? 0);

    // Bonus de maîtrise propre au personnage (+5% à +20%, voir MASTERY_DPS_TIERS).
    const equippedMult = computeEquippedMultiplier(owned.equippedItems, tpl.id) * getMasteryDpsMult(get().charMastery[pureId], tpl.rarity);

    const dpsWithEquip = bnMulScalar(calcCharDps(tpl, owned), equippedMult);
    const withSyn = bnMulScalar(calcDpsWithSynergies(templateId, dpsWithEquip, activeSynergies), anomalySynMult);
    const ultMult = get().getDpsMultiplierFor(templateId);

    const cohesionMult = get().getTeamCohesion().mult;
    const base     = bnMulScalar(withSyn, ultMult * boostMult * prestigeMult * anomalyBonuses.globalDpsMult * cohesionMult);
    const charAffinity = getAffinityForId(pureId);
    const anomalyTypeMult = 1 + (anomalyBonuses.typeDamageByAffinity[charAffinity] ?? 0);
    const typeMult = getAffinityMultiplier(charAffinity, getAffinityForId(get().currentEnemy?.name ?? '')) * anomalyTypeMult;
    return { base, typeMult, final: bnMulScalar(base, typeMult) };
  }

  function computeDpsBreakdown(): ReturnType<GameStore['getDpsBreakdown']> {
    const { equippedTeam, collection, charMastery } = get();
    const activeSynergies = computeActiveSynergies(equippedTeam);
    const boostMult = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
    const prestigeMult = getPrestigeBonuses(get().prestigeBonusLevels, get().prestigeRankRecoveryLevel).dpsMult; // passif +15%/niveau × shop "Transcendance"
    const anomalyBonuses = calcAnomalyBonuses(get().ownedAnomalies);
    const enemyAffinity = getAffinityForId(get().currentEnemy?.name ?? ''); // type de l'ennemi courant
    const teamUltMult = get().ultActiveUlts.reduce((m, a) => m * (a.effect.dpsMultiplier ?? 1), 1);
    const cohesionMult = get().getTeamCohesion().mult; // combat de l'accueil uniquement (pas raids/expéditions)
    const globalMult = prestigeMult * anomalyBonuses.globalDpsMult * cohesionMult;

    const chars: DpsBreakdownChar[] = [];
    let teamDps: BigNum = BN_ZERO;
    for (const id of equippedTeam) {
      if (!id) continue;
      const owned = collection[id];
      const pureId = parseInstanceKey(id).templateId; // clé composite -> id pur
      const tpl   = getCharacterById(pureId);
      if (!owned || !tpl) continue;
      const baseDps  = calcCharDps(tpl, owned);
      const equipMult = computeEquippedMultiplier(owned.equippedItems, tpl.id);
      // Bonus de maîtrise propre au personnage (+5% à +20%, voir MASTERY_DPS_TIERS).
      const masteryMult = getMasteryDpsMult(charMastery[pureId], tpl.rarity);
      const dpsWithEquip = bnMulScalar(baseDps, equipMult * masteryMult);
      const anomalySynMult = 1 + (anomalyBonuses.synergyBoostByUniverse[tpl.universe ?? ''] ?? 0);
      const withSyn  = bnMulScalar(calcDpsWithSynergies(id, dpsWithEquip, activeSynergies), anomalySynMult);
      const ultMult  = get().getDpsMultiplierFor(id);
      const charAffinity = getAffinityForId(pureId);
      const anomalyTypeMult = 1 + (anomalyBonuses.typeDamageByAffinity[charAffinity] ?? 0);
      const typeMult = getAffinityMultiplier(charAffinity, enemyAffinity) * anomalyTypeMult; // avantage de type + anomalies
      const charDps = bnMulScalar(withSyn, ultMult * boostMult * typeMult);
      teamDps = bnAdd(teamDps, charDps);
      chars.push({
        key: id, templateId: pureId, name: tpl.name,
        dps: bnMulScalar(charDps, globalMult),
        ownDps: bnMulScalar(withSyn, (ultMult / teamUltMult) * typeMult),
        equipMult, masteryMult,
        synergyMult: bnDivRatio(withSyn, dpsWithEquip) || 1,
        // Même règle que calcDpsWithSynergies : bonus d'univers pour les persos
        // de l'univers, bonus global pour toute l'équipe.
        synergies: activeSynergies.flatMap(syn => [
          ...(syn.def.universe === tpl.universe && syn.threshold.dpsBonus > 0 ? [{ label: syn.def.label, color: syn.def.color, global: false }] : []),
          ...(syn.threshold.globalBonus > 0 ? [{ label: syn.def.label, color: syn.def.color, global: true }] : []),
        ]),
        selfUltMult: ultMult / teamUltMult,
        typeMult,
      });
    }

    return {
      total: bnMulScalar(teamDps, globalMult),
      chars,
      teamUltMult, boostMult, cohesionMult, prestigeMult,
      anomalyMult: anomalyBonuses.globalDpsMult,
      eventMult: get().getEventDpsMult(),
    };
  }

  return {
  setUsername: (name) => set({ username: name.trim().slice(0, 20) }),

  setSelectedAvatarChampionId: (templateId) => {
    if (templateId !== null) {
      const owned = Object.keys(get().collection).some(k => parseInstanceKey(k).templateId === templateId);
      if (!owned) return;
    }
    set({ selectedAvatarChampionId: templateId });
  },

  upgradeGold: () => {
    const s = get();
    const level = s.goldUpgradeLevel ?? 0;
    const maxLevel = runPeakPalierOf(s);
    if (level >= maxLevel) return; // pas encore débloqué par la progression de palier
    const anomalyMult = 1 - calcAnomalyBonuses(s.ownedAnomalies).upgradeCostReductionPct;
    const cost = bnMulScalar(getGoldChestCost(level), anomalyMult);
    if (!bnGte(s.pixelCoins, cost)) return;
    set(state => ({
      pixelCoins: bnSub(state.pixelCoins, cost),
      goldUpgradeLevel: (state.goldUpgradeLevel ?? 0) + 1,
      ...upgradeCountersPatch(state, 1, cost),
    }));
  },

  getGoldMultiplier: () => get().getGoldBreakdown().total,

  getGoldBreakdown: () => {
    const s = get();
    goldMemo = memoize(goldMemo, [
      s.goldUpgradeLevel, s.unlockedTitles, s.ultActiveUlts, s.isGoldBoostActive(), s.goldBoostEndsAt,
      s.prestigeBonusLevels, s.prestigeRankRecoveryLevel, s.ownedAnomalies,
    ], () => getGoldGainBreakdown({
      goldUpgradeLevel: s.goldUpgradeLevel ?? 0,
      unlockedTitles: s.unlockedTitles ?? [],
      ultActiveUlts: s.ultActiveUlts,
      goldBoostEndsAt: s.goldBoostEndsAt,
      prestigeBonusLevels: s.prestigeBonusLevels,
      prestigeRankRecoveryLevel: s.prestigeRankRecoveryLevel,
      ownedAnomalies: s.ownedAnomalies,
    }));
    return goldMemo.value;
  },

  getGoldUpgradeCost: () => {
    const level = get().goldUpgradeLevel ?? 0;
    const maxLevel = runPeakPalierOf(get());
    if (level >= maxLevel) return BN_ZERO;
    const anomalyMult = 1 - calcAnomalyBonuses(get().ownedAnomalies).upgradeCostReductionPct;
    return bnMulScalar(getGoldChestCost(level), anomalyMult);
  },

  levelUpHero: () => {
    const { hero, ownedAnomalies, pixelCoins } = get();
    const anomalyMult = 1 - calcAnomalyBonuses(ownedAnomalies).upgradeCostReductionPct;
    const cost = bnMulScalar(heroLevelUpCost(hero.level), anomalyMult);
    if (!bnGte(pixelCoins, cost)) return;
    set(state => ({
      pixelCoins: bnSub(state.pixelCoins, cost),
      hero: { ...state.hero, level: state.hero.level + 1, xp: 0 },
      ...upgradeCountersPatch(state, 1, cost),
    }));
  },

  evolveHero: () => {
    const { hero, ownedAnomalies, pixelCoins } = get();
    const forms = HERO_TEMPLATE.forms ?? [];
    if (!canEvolveHero(forms, hero)) return;
    const anomalyMult = 1 - calcAnomalyBonuses(ownedAnomalies).upgradeCostReductionPct;
    const cost = bnMulScalar(evoCost('L', hero.currentForm), anomalyMult);
    if (!bnGte(pixelCoins, cost)) return;
    set(state => ({
      pixelCoins: bnSub(state.pixelCoins, cost),
      hero: { ...state.hero, currentForm: state.hero.currentForm + 1, level: state.hero.level + 1 },
      ...upgradeCountersPatch(state, 1, cost),
    }));
  },

  // ─── Personnages ──────────────────────────────────────────────────
  levelUpCharacter: (templateId) => get().levelUpCharacterN(templateId, 1),

  // Monte jusqu'à `count` niveaux d'affilée (s'arrête dès qu'un niveau n'est
  // plus payable), en UN SEUL set() — le bouton ×10 appelait avant
  // levelUpCharacter 10 fois, soit ~50 mises à jour du store (chacune
  // notifiant tous les abonnés et réécrivant la sauvegarde locale).
  levelUpCharacterN: (templateId, count) => {
    const s = get();
    const owned = s.collection[templateId];
    if (!owned || count <= 0) return;
    const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
    if (!tpl) return;
    const anomalyMult = 1 - calcAnomalyBonuses(s.ownedAnomalies).upgradeCostReductionPct;
    let coins = s.pixelCoins;
    let levels = 0;
    while (levels < count) {
      const cost = bnMulScalar(levelUpCost(owned.level + levels), anomalyMult);
      if (!bnGte(coins, cost)) break;
      coins = bnSub(coins, cost);
      levels++;
    }
    if (levels === 0) return;
    set(state => ({
      pixelCoins: coins,
      collection: {
        ...state.collection,
        [templateId]: { ...owned, level: owned.level + levels, xp: 0 },
      },
      ...upgradeCountersPatch(state, levels, bnSub(s.pixelCoins, coins)),
    }));
  },

  evolveCharacter: (templateId) => {
    const s = get();
    const owned = s.collection[templateId];
    if (!owned) return;
    const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
    if (!tpl || !canEvolve(tpl, owned, s.inventory, s.expeditionDropInventory)) return;
    const anomalyMult = 1 - calcAnomalyBonuses(s.ownedAnomalies).upgradeCostReductionPct;
    const cost = bnMulScalar(evoCost(tpl.rarity, owned.currentForm), anomalyMult);
    if (!bnGte(s.pixelCoins, cost)) return;
    // Pierres d'Évolution (drop d'expédition) requises — sauf pour les persos
    // marqués noEvoStones (aucun actuellement).
    const stonesCost = tpl.noEvoStones ? 0 : evoStoneCost(tpl.rarity, owned.currentForm);
    // Items requis pour cette évolution si applicable (1 de chacun —
    // cumulatif d'une forme à l'autre, voir EvoForm.requiredItemIds)
    const nextForm = tpl.forms?.[owned.currentForm + 1];
    const requiredItems = nextForm?.requiredItemIds;
    set(state => {
      const newInventory = requiredItems?.length
        ? { ...state.inventory }
        : state.inventory;
      if (requiredItems?.length) {
        for (const id of requiredItems) newInventory[id] = Math.max(0, (newInventory[id] ?? 0) - 1);
      }
      const stonesHave = state.expeditionDropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0;
      return {
        pixelCoins: bnSub(state.pixelCoins, cost),
        inventory: newInventory,
        ...(stonesCost > 0 && stonesHave >= stonesCost && {
          expeditionDropInventory: { ...state.expeditionDropInventory, [EVOLUTION_STONE_ITEM_ID]: stonesHave - stonesCost },
        }),
        collection: {
          ...state.collection,
          [templateId]: { ...owned, currentForm: owned.currentForm + 1, level: owned.level + 1 },
        },
        ...upgradeCountersPatch(state, 1, cost),
      };
    });
  },

  // Détail du DPS d'UN allié équipé : base (avant type), multiplicateur de
  // type vs l'ennemi courant, et DPS final. Utilise la même math que getTotalDps.
  getCharDpsBreakdown: (templateId: string) => {
    const memo = memoize(charDpsMemo.get(templateId), dpsDeps(get()), () => computeCharDpsBreakdown(templateId));
    charDpsMemo.set(templateId, memo);
    return memo.value;
  },

  getTotalDps: () => get().getDpsBreakdown().total,

  getDpsBreakdown: () => {
    dpsMemo = memoize(dpsMemo, dpsDeps(get()), computeDpsBreakdown);
    return dpsMemo.value;
  },
  // Slot vide (ou perso introuvable) = niveau 0.
  getTeamCohesion: () => {
    const { equippedTeam, collection } = get();
    return computeCohesion(equippedTeam.map(id => (id ? collection[id]?.level ?? 0 : 0)));
  },
  equipCharacter: (id, slot) => {
    const character = get().collection[id];
    if (!character) return;
    const tpl = getCharacterById(parseInstanceKey(id).templateId);
    if (!tpl) return;
    if (runPeakPalierOf(get()) < RARITY_GATES[tpl.rarity].unlockPalier) return;
    // Exclusivité expédition ↔ équipe active : un perso en expédition ne
    // peut pas être équipé (voir aussi canStart dans expeditionSlice.ts,
    // qui bloque le sens inverse).
    if (get().isCharOnExpedition(parseInstanceKey(id).templateId)) return;
    set(state => {
      const team = [...state.equippedTeam] as (string | null)[];
      const currentSlot = team.findIndex(entry => entry === id);
      if (currentSlot === slot) return { equippedTeam: team };
      // Bloque l'échange si le perso actuellement dans ce slot a utilisé son
      // ult pendant le combat de boss en cours (même règle que unequipCharacter,
      // sinon on pouvait contourner le verrou en écrasant le slot).
      const onBoss = state.bossActive || state.wave === 10;
      const occupant = team[slot];
      if (occupant && occupant !== id && onBoss && state.ultUsedThisFight.includes(occupant)) return { equippedTeam: team };
      if (currentSlot !== -1) team[currentSlot] = null;
      team[slot] = id;
      return { equippedTeam: team };
    });
  },
  unequipCharacter: (slot) => set(s => {
    const tid = s.equippedTeam[slot];
    // Bloque le retrait uniquement si : ult utilisé ET on est sur le boss (wave 10)
    const onBoss = s.bossActive || s.wave === 10;
    if (tid && onBoss && s.ultUsedThisFight.includes(tid)) return s;
    const t = [...s.equippedTeam] as (string|null)[];
    t[slot] = null;
    return { equippedTeam: t };
  }),
  };
};
