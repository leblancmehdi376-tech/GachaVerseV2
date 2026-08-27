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
import { getTitleGoldMultiplier } from '@/lib/game/titles';
import { RARITY_GATES } from '@/lib/game/gacha';
import { BOOST_MULTIPLIER } from '@/lib/game/shop';
import { getGoldChestMultiplier, getGoldChestCost, runPeakPalierOf, getPrestigeBonuses } from '../gameStoreHelpers';
import type { GameStore, CharacterSlice } from '../gameStore.types';

export const createCharacterSlice: StateCreator<GameStore, [], [], CharacterSlice> = (set, get) => ({
  setUsername: (name) => set({ username: name.trim().slice(0, 20) }),

  upgradeGold: () => {
    const level = get().goldUpgradeLevel ?? 0;
    const maxLevel = runPeakPalierOf(get());
    if (level >= maxLevel) return; // pas encore débloqué par la progression de palier
    const cost = getGoldChestCost(level);
    if (!get().spendPixelCoins(cost)) return;
    set(state => ({
      goldUpgradeLevel: (state.goldUpgradeLevel ?? 0) + 1,
    }));
    get().bumpQuestProgress('d_upgrade_10', 1);
    get().bumpQuestProgress('w_upgrade_50', 1);
    set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
  },

  getGoldMultiplier: () => {
    const level = get().goldUpgradeLevel ?? 0;
    const chestMult = getGoldChestMultiplier(level);
    const titleMult = getTitleGoldMultiplier(get().activeTitle);
    return chestMult * titleMult;
  },

  getGoldUpgradeCost: () => {
    const level = get().goldUpgradeLevel ?? 0;
    const maxLevel = runPeakPalierOf(get());
    return level >= maxLevel ? 0 : getGoldChestCost(level);
  },

  levelUpHero: () => {
    const { hero } = get();
    const cost = heroLevelUpCost(hero.level);
    if (!get().spendPixelCoins(cost)) return;
    set(state => ({
      hero: { ...state.hero, level: state.hero.level + 1, xp: 0 },
    }));
    get().bumpQuestProgress('d_upgrade_10', 1);
    get().bumpQuestProgress('w_upgrade_50', 1);
    set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
  },

  evolveHero: () => {
    const { hero } = get();
    const forms = HERO_TEMPLATE.forms ?? [];
    if (!canEvolveHero(forms, hero)) return;
    const cost = evoCost('L', hero.currentForm);
    if (!get().spendPixelCoins(cost)) return;
    set(state => ({
      hero: { ...state.hero, currentForm: state.hero.currentForm + 1, level: state.hero.level + 1 },
    }));
  },

  // ─── Personnages ──────────────────────────────────────────────────
  levelUpCharacter: (templateId) => {
    const owned = get().collection[templateId];
    if (!owned) return;
    const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
    if (!tpl) return;
    const cost = levelUpCost(owned.level);
    if (!get().spendPixelCoins(cost)) return;
    set(state => ({
      collection: {
        ...state.collection,
        [templateId]: { ...owned, level: owned.level + 1, xp: 0 },
      },
    }));
    get().bumpQuestProgress('d_upgrade_10', 1);
    get().bumpQuestProgress('w_upgrade_50', 1);
    set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
  },

  evolveCharacter: (templateId) => {
    const owned = get().collection[templateId];
    if (!owned) return;
    const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
    if (!tpl || !canEvolve(tpl, owned, get().inventory, get().expeditionDropInventory)) return;
    const cost = evoCost(tpl.rarity, owned.currentForm);
    if (!get().spendPixelCoins(cost)) return;
    // Consomme les Pierres d'Évolution (drop d'expédition) requises —
    // sauf pour les persos de boss d'événement (noEvoStones), dont
    // l'objet d'évolution dédié suffit.
    if (!tpl.noEvoStones) {
      const stonesCost = evoStoneCost(tpl.rarity, owned.currentForm);
      if (stonesCost > 0) get().consumeDrop(EVOLUTION_STONE_ITEM_ID, stonesCost);
    }
    // Consomme les items requis pour cette évolution si applicable (1 de
    // chacun — cumulatif d'une forme à l'autre, voir EvoForm.requiredItemIds)
    const nextForm = tpl.forms?.[owned.currentForm + 1];
    const requiredItems = nextForm?.requiredItemIds;
    set(state => {
      const newInventory = requiredItems?.length
        ? { ...state.inventory }
        : state.inventory;
      if (requiredItems?.length) {
        for (const id of requiredItems) newInventory[id] = Math.max(0, (newInventory[id] ?? 0) - 1);
      }
      return {
        inventory: newInventory,
        collection: {
          ...state.collection,
          [templateId]: { ...owned, currentForm: owned.currentForm + 1, level: owned.level + 1 },
        },
      };
    });
  },

  // Détail du DPS d'UN allié équipé : base (avant type), multiplicateur de
  // type vs l'ennemi courant, et DPS final. Utilise la même math que getTotalDps.
  getCharDpsBreakdown: (templateId: string) => {
    const { equippedTeam, collection } = get();
    const owned = collection[templateId];
    const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/ulti/type/synergie partagés entre éditions)
    const tpl   = getCharacterById(pureId);
    if (!owned || !tpl) return { base: 0, typeMult: 1, final: 0 };

    const activeSynergies = computeActiveSynergies(equippedTeam);
    const boostMult    = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
    const prestigeMult = getPrestigeBonuses(get().prestigeBonusLevels, get().prestigeRankRecoveryLevel).dpsMult;

    const equippedMult = computeEquippedMultiplier(owned.equippedItems, tpl.id);

    const dpsWithEquip = Math.floor(calcCharDps(tpl, owned) * equippedMult);
    const withSyn = calcDpsWithSynergies(templateId, dpsWithEquip, activeSynergies);
    const ultMult = get().getDpsMultiplierFor(templateId);

    const base     = withSyn * ultMult * boostMult * prestigeMult;
    const typeMult = getAffinityMultiplier(getAffinityForId(pureId), getAffinityForId(get().currentEnemy?.name ?? ''));
    return { base: Math.floor(base), typeMult, final: Math.floor(base * typeMult) };
  },

  getTotalDps: () => {
    const { equippedTeam, collection } = get();
    const activeSynergies = computeActiveSynergies(equippedTeam);
    const boostMult = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
    const prestigeMult = getPrestigeBonuses(get().prestigeBonusLevels, get().prestigeRankRecoveryLevel).dpsMult; // passif +15%/niveau × shop "Transcendance"
    const enemyAffinity = getAffinityForId(get().currentEnemy?.name ?? ''); // type de l'ennemi courant
    const teamDps = equippedTeam.reduce((total, id) => {
      if (!id) return total;
      const owned = collection[id];
      const pureId = parseInstanceKey(id).templateId; // clé composite -> id pur
      const tpl   = getCharacterById(pureId);
      if (!owned || !tpl) return total;
      const baseDps  = calcCharDps(tpl, owned);
      const equippedMult = computeEquippedMultiplier(owned.equippedItems, tpl.id);
      const dpsWithEquip = Math.floor(baseDps * equippedMult);
      const withSyn  = calcDpsWithSynergies(id, dpsWithEquip, activeSynergies);
      const ultMult  = get().getDpsMultiplierFor(id);
      const typeMult = getAffinityMultiplier(getAffinityForId(pureId), enemyAffinity); // avantage de type
      return total + withSyn * ultMult * boostMult * typeMult;
    }, 0);
    return teamDps * prestigeMult;
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
    if (tid && onBoss && s.ultUsedThisFight.includes(tid)) return {};
    const t = [...s.equippedTeam] as (string|null)[];
    t[slot] = null;
    return { equippedTeam: t };
  }),
});
