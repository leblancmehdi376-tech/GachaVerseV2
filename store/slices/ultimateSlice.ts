// Ultimes de personnage : cooldowns, effet actif, animation. Fusionné dans
// gameStore depuis l'ancien store/ultimateStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { getUltimateDef } from '@/lib/game/ultimates';
import { parseInstanceKey } from '@/lib/game/editions';
import type { GameStore, UltimateActions } from '../gameStore.types';
import { BN_ZERO, bnAdd, bnMulScalar } from '@/lib/game/bignum';

export const createUltimateSlice: StateCreator<GameStore, [], [], UltimateActions> = (set, get) => ({
  startCooldown: (id, dur) =>
    set(s => ({ ultCooldowns: { ...s.ultCooldowns, [id]: dur } })),

  activateUlt: (templateId, formIndex, equippedTeam = []) => {
    const def = getUltimateDef(parseInstanceKey(templateId).templateId); // clé composite -> id pur (ulti partagé entre éditions)
    if (!def) return;
    const now = Date.now();
    const eff = def.effect;

    // ── 1 SEULE ULT ACTIVE À LA FOIS : on annule l'ult en cours ──────────
    if (get().ultActiveUlts[0]) {
      set({ ultActiveUlts: [] });
    }

    set(() => ({ ultAnimating: templateId }));
    setTimeout(() => set(() => ({ ultAnimating: null })), def.animDuration);

    set(s => {
      const newCooldowns = { ...s.ultCooldowns, [templateId]: def.cooldown };
      const others = (equippedTeam ?? []).filter((id): id is string => !!id && id !== templateId);

      if (eff.reduceOtherCooldownsSeconds) {
        for (const id of others) newCooldowns[id] = Math.max(0, (newCooldowns[id] ?? 0) - eff.reduceOtherCooldownsSeconds!);
      }
      if (eff.haltTeamCooldownHalved) {
        for (const id of others) newCooldowns[id] = Math.floor((newCooldowns[id] ?? 0) / 2);
      }
      if (eff.resetBestOtherCooldown) {
        let bestId: string | null = null; let bestVal = 0;
        for (const id of others) { const v = newCooldowns[id] ?? 0; if (v > bestVal) { bestVal = v; bestId = id; } }
        if (bestId) newCooldowns[bestId] = 0;
      }

      return {
        ultCooldowns: newCooldowns,
        ultActiveUlts: [{ templateId, formIndex, endsAt: now + def.duration * 1000, effect: eff }],
      };
    });

    setTimeout(() => {
      set(s => ({
        ultActiveUlts: s.ultActiveUlts.filter(a => a.templateId !== templateId),
      }));
    }, def.duration * 1000);
  },

  tickUlt: () => set(s => {
    const newCds: Record<string, number> = {};
    for (const [id, cd] of Object.entries(s.ultCooldowns)) newCds[id] = Math.max(0, cd - 1);
    const now = Date.now();
    const ultActiveUlts = s.ultActiveUlts.filter(a => a.endsAt > now);
    return { ultCooldowns: newCds, ultActiveUlts };
  }),

  getDpsMultiplierFor: (templateId) => {
    let mult = 1;
    for (const a of get().ultActiveUlts) {
      if (a.effect.dpsMultiplier) mult *= a.effect.dpsMultiplier;
      if (a.effect.selfDpsMultiplier && a.templateId === templateId) mult *= a.effect.selfDpsMultiplier;
    }
    return mult;
  },

  getActiveCritChance: () => {
    let best: number | null = null;
    for (const a of get().ultActiveUlts) {
      if (a.effect.critChance != null) best = best === null ? a.effect.critChance : Math.max(best, a.effect.critChance);
    }
    return best;
  },

  getActiveEnemyDamageTakenMultiplier: () =>
    get().ultActiveUlts.reduce((m, a) => a.effect.enemyDamageTakenBonusPct ? m * (1 + a.effect.enemyDamageTakenBonusPct / 100) : m, 1),

  getActiveBonusDpsFlat: (teamDps) => {
    let bonus = BN_ZERO;
    for (const a of get().ultActiveUlts) {
      if (a.effect.autoStrikes) {
        const { perSecond, value } = a.effect.autoStrikes;
        bonus = bnAdd(bonus, bnMulScalar(teamDps, perSecond * (value / 100)));
      }
    }
    return bonus;
  },

  getActiveDamageToCoinPct: () =>
    get().ultActiveUlts.reduce((sum, a) => sum + (a.effect.damageToCoinPct ?? 0), 0),
});
