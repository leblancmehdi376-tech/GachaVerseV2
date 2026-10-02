// Combat : boucle ennemi/boss (vagues, voyage entre paliers), ultimes,
// dépense de pixelCoins. Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { generateEnemy } from '@/lib/game/enemies';
import { getPalierConfig } from '@/lib/game/paliers';
import { calcCharDps } from '@/lib/game/formulas';
import { getCharacterById } from '@/lib/game/characters';
import { getUltimateDef } from '@/lib/game/ultimates';
import { parseInstanceKey } from '@/lib/game/editions';
import { resolveEnemyDeath, runPeakPalierOf } from '../gameStoreHelpers';
import { addStats, bossFailPatch } from '@/lib/game/achievementStats';
import { STAT } from '@/lib/game/achievements';
import type { GameStore, CombatActions } from '../gameStore.types';
import { BN_ZERO, bnAdd, bnFromNumber, bnGte, bnIsZero, bnMax, bnMulScalar, bnSub, bnToNumber } from '@/lib/game/bignum';

// Idle : plancher de DPS pour qu'un joueur SANS compagnon progresse quand même
// (lentement) en début de partie. Exprimé en fraction des PV de l'ennemi courant
// → temps de kill ~constant, mais trop faible pour battre un boss dans les temps.
const BASE_IDLE_DPS_HP_FRACTION = 0.006; // ~167 s pour tuer un mob sans aucun compagnon

type CombatSet = Parameters<StateCreator<GameStore, [], [], CombatActions>>[0];

// Lancement effectif d'un ulti (dégâts/monnaie instantanés + buff et
// démarrage du cooldown via activateUlt). Appelé directement si aucun ulti
// n'est actif, sinon plus tard depuis la file (launchNextQueuedUlt).
function launchUltimate(set: CombatSet, get: () => GameStore, templateId: string, formIndex: number) {
  const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (ulti partagé entre éditions)
  const def = getUltimateDef(pureId);
  if (!def) return;

  // Marque ce perso comme ayant utilisé son ult pendant ce combat
  set(s => ({
    ultUsedThisFight: s.ultUsedThisFight.includes(templateId)
      ? s.ultUsedThisFight
      : [...s.ultUsedThisFight, templateId],
  }));

  const eff   = def.effect;
  const state = get();
  const teamDps   = state.getTotalDps();
  const ownedSelf = state.collection[templateId];
  const tplSelf   = getCharacterById(pureId);
  const selfDps   = (ownedSelf && tplSelf) ? calcCharDps(tplSelf, ownedSelf) : BN_ZERO;

  // ── Dégâts instantanés (one-shot, calculés à l'activation) ────────
  let instantDmg = BN_ZERO;
  if (eff.instantDamagePctSelfDps) instantDmg = bnAdd(instantDmg, bnMulScalar(selfDps, eff.instantDamagePctSelfDps / 100));
  if (eff.instantDamagePctTeamDps) instantDmg = bnAdd(instantDmg, bnMulScalar(teamDps, eff.instantDamagePctTeamDps / 100));
  if (eff.instantDamagePctMaxHp)   instantDmg = bnAdd(instantDmg, bnMulScalar(state.currentEnemy.maxHp, eff.instantDamagePctMaxHp / 100));

  // ── Monnaie instantanée (one-shot) ────────────────────────────────
  let instantCoins = BN_ZERO;
  if (eff.instantCoinMultiplierBurst) {
    instantCoins = bnMulScalar(state.currentEnemy.pixelCoinsReward, eff.instantCoinMultiplierBurst - 1);
  }

  if (!bnIsZero(instantDmg) || !bnIsZero(instantCoins)) {
    set(s => {
      const withCoins = !bnIsZero(instantCoins) ? { pixelCoins: bnAdd(s.pixelCoins, instantCoins) } : {};
      const newHp = bnSub(s.currentEnemy.currentHp, instantDmg);
      if (bnIsZero(newHp)) return { ...withCoins, ...resolveEnemyDeath({ ...s, weeklyQuests: s.weeklyQuests ?? [], raidQuests: s.raidQuests ?? [], currentEnemy:{ ...s.currentEnemy, currentHp:newHp }, ...withCoins }) };
      return { ...withCoins, currentEnemy: { ...s.currentEnemy, currentHp: newHp } };
    });
  }

  // ── Activer le buff (cooldown, durée, gestion cooldowns alliés) ────
  get().activateUlt(templateId, formIndex, get().equippedTeam);
}

export const createCombatSlice: StateCreator<GameStore, [], [], CombatActions> = (set, get) => ({
  clearBossVictory: () => set({ lastBossVictory: null }),

  getRunPeakPalier: () => runPeakPalierOf(get()),

  retreatFromBoss: () => {
    const state = get();
    if (!state.bossActive && state.wave !== 10) return;
    set({
      // Fuir un boss en cours casse la série de victoires (défi "Série Invaincue").
      ...(state.bossActive && bossFailPatch(state)),
      wave:         1,
      bossActive:   false,
      bossTimeLeft: 0,
      bossAvoided:  true,
      currentEnemy: generateEnemy(1, state.palier, runPeakPalierOf(state)),
    });
  },

  challengeBoss: () => {
    const state = get();
    if (state.palier < runPeakPalierOf(state)) return; // pas de boss en mode farm
    set({
      wave:         10,
      bossActive:   true,
      bossAvoided:  false,
      bossTimeLeft: getPalierConfig(state.palier).bossTimerSeconds,
      currentEnemy: generateEnemy(10, state.palier, runPeakPalierOf(state)),
    });
  },

  // Voyage vers un palier déjà atteint CETTE RUN (1..runPeakPalier) pour
  // re-farmer coins / drops. Interdit pendant un combat de boss chronométré.
  travelToPalier: (target) => {
    const state = get();
    const dest = Math.floor(target);
    const peak = runPeakPalierOf(state);
    if (dest < 1 || dest > peak) return;
    if (state.bossActive) return;              // pas de fuite du boss via voyage
    if (dest === state.palier && state.wave === 1 && !state.bossAvoided) return; // déjà ici, rien à faire
    set({
      palier:        dest,
      wave:          1,
      bossActive:    false,
      bossTimeLeft:  0,
      bossAvoided:   false,
      ultUsedThisFight: [],
      currentEnemy:  generateEnemy(1, dest, peak),
    });
  },

  tickDps: () => {
    const baseTeamDps   = get().getTotalDps(); // inclut déjà dpsMultiplier/selfDpsMultiplier par perso
    const bonusFlat      = get().getActiveBonusDpsFlat(baseTeamDps);
    const enemyMult       = get().getActiveEnemyDamageTakenMultiplier();
    const damageToCoinPct  = get().getActiveDamageToCoinPct();

    // Filet de sécurité "sans aucun compagnon" : uniquement si l'équipe
    // est VRAIMENT vide (0 perso équipé). Avant ce correctif, ce filet
    // s'ajoutait TOUJOURS en plus du DPS réel, calculé comme un
    // pourcentage des PV de l'ennemi — donc à PV d'ennemi très élevés
    // (fin de partie), il dépassait largement le DPS réel de l'équipe et
    // rendait toute la puissance du joueur insignifiante : n'importe
    // quel ennemi mourait en ~167s peu importe l'équipe (voire sans
    // équipe du tout), ce qui cassait complètement la difficulté.
    const hasNoTeam = get().equippedTeam.every(id => !id);
    const idleFloor = hasNoTeam ? bnMax(bnFromNumber(1), bnMulScalar(get().currentEnemy.maxHp, BASE_IDLE_DPS_HP_FRACTION)) : BN_ZERO;

    const finalDps = bnAdd(bnMulScalar(bnAdd(baseTeamDps, bonusFlat), enemyMult * get().getEventDpsMult()), idleFloor);
    if (bnIsZero(finalDps)) return;

    const bonusCoins = bnMulScalar(finalDps, damageToCoinPct / 100);

    set(state => {
      const newHp = bnSub(state.currentEnemy.currentHp, finalDps);
      const withCoins = !bnIsZero(bonusCoins) ? { pixelCoins: bnAdd(state.pixelCoins, bonusCoins) } : {};
      if (bnIsZero(newHp)) return { ...withCoins, ...resolveEnemyDeath({ ...state, weeklyQuests: state.weeklyQuests ?? [], raidQuests: state.raidQuests ?? [], currentEnemy:{ ...state.currentEnemy, currentHp:newHp }, ...withCoins }) };
      return { ...withCoins, currentEnemy: { ...state.currentEnemy, currentHp: newHp } };
    });
  },

  tickBossTimer: () => set(state => {
    if (!state.bossActive || state.bossTimeLeft <= 0) return state;
    const t = state.bossTimeLeft - 1;
    // Défaite (timer écoulé) : même état qu'une retraite volontaire —
    // bossAvoided:true permet de retenter le boss directement (bouton
    // "⚡ BOSS") au lieu de forcer un reclear complet des vagues 1-9.
    if (t <= 0) return { ...bossFailPatch(state), bossActive:false, bossTimeLeft:0, bossAvoided:true, wave:1, currentEnemy: generateEnemy(1, state.palier, runPeakPalierOf(state)) };
    return { bossTimeLeft: t };
  }),

  activateCharacterUltimate: (templateId, formIndex) => {
    if (!getUltimateDef(parseInstanceKey(templateId).templateId)) return;
    const s = get();
    // Déjà en file : re-cliquer l'annule (le cooldown n'a jamais démarré).
    if (s.ultQueue.some(q => q.templateId === templateId)) {
      set(st => ({ ultQueue: st.ultQueue.filter(q => q.templateId !== templateId) }));
      return;
    }
    if ((s.ultCooldowns[templateId] ?? 0) > 0) return; // pas prêt, sécurité
    if (s.ultActiveUlts.some(a => a.templateId === templateId)) return;

    // Un ulti tourne déjà (ou d'autres attendent) : on stacke, il partira
    // juste après — cooldown démarré seulement au lancement effectif.
    if (s.ultActiveUlts.length > 0 || s.ultQueue.length > 0) {
      // Combo = ultis actifs + file d'attente (succès "Combo Dévastateur").
      const combo = s.ultActiveUlts.length + s.ultQueue.length + 1;
      set(st => ({
        ultQueue: [...st.ultQueue, { templateId, formIndex }],
        ...(combo > (st.achievementStats[STAT.ultComboMax] ?? 0) && { achievementStats: { ...st.achievementStats, [STAT.ultComboMax]: combo } }),
      }));
      return;
    }
    launchUltimate(set, get, templateId, formIndex);
  },

  launchNextQueuedUlt: () => {
    while (get().ultActiveUlts.length === 0 && get().ultQueue.length > 0) {
      const [next, ...rest] = get().ultQueue;
      set({ ultQueue: rest });
      // Perso retiré de l'équipe entre-temps : on l'ignore et on passe au suivant.
      if (!get().equippedTeam.includes(next.templateId)) continue;
      if ((get().ultCooldowns[next.templateId] ?? 0) > 0) continue;
      const formIndex = get().collection[next.templateId]?.currentForm ?? next.formIndex;
      launchUltimate(set, get, next.templateId, formIndex);
    }
  },

  spendPixelCoins: (cost) => {
    if (!bnGte(get().pixelCoins, cost)) return false;
    set(s => ({ pixelCoins: bnSub(s.pixelCoins, cost), achievementStats: addStats(s.achievementStats, { [STAT.coinsSpent]: bnToNumber(cost) }) }));
    return true;
  },

  // Debug localhost uniquement (voir bouton dans EnemyHud) : tue l'ennemi courant.
  debugKillEnemy: () => {
    set(state => resolveEnemyDeath({
      ...state,
      weeklyQuests: state.weeklyQuests ?? [],
      raidQuests: state.raidQuests ?? [],
      currentEnemy: { ...state.currentEnemy, currentHp: BN_ZERO },
    }));
  },
});
