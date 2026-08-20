'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUltimateDef, UltimateEffect } from '@/lib/game/ultimates';
import { parseInstanceKey } from '@/lib/game/editions';

export interface ActiveUlt {
  templateId: string;
  formIndex:  number;
  endsAt:     number;   // timestamp ms
  effect:     UltimateEffect;
}

interface UltState {
  cooldowns:  Record<string, number>;   // templateId -> secondes restantes
  activeUlts: ActiveUlt[];               // effets en cours
  animating:  string | null;             // templateId en cours d'animation

  startCooldown: (templateId: string, duration: number) => void;
  activateUlt:   (templateId: string, formIndex: number, equippedTeam?: (string | null)[]) => void;
  tick:          () => void;

  // Sélecteurs de combat — utilisés par gameStore pour calculer les dégâts réels
  getDpsMultiplierFor:                 (templateId: string) => number;
  getActiveCritChance:                 () => number | null;
  getActiveEnemyDamageTakenMultiplier: () => number;
  getActiveBonusDpsFlat:               (teamDps: number) => number;
  getActiveDamageToCoinPct:            () => number;
  resetUltimates: () => void;
}

export const useUltimateStore = create<UltState>()(
  persist(
    (set, get) => ({
  cooldowns:  {},
  activeUlts: [],
  animating:  null,

  // Remet les cooldowns/effets à zéro (utilisé par "Réinitialiser mon compte").
  resetUltimates: () => set({
    cooldowns: {}, activeUlts: [], animating: null,
  }),

  startCooldown: (id, dur) =>
    set(s => ({ cooldowns: { ...s.cooldowns, [id]: dur } })),

  activateUlt: (templateId, formIndex, equippedTeam = []) => {
    const def = getUltimateDef(parseInstanceKey(templateId).templateId); // clé composite -> id pur (ulti partagé entre éditions)
    if (!def) return;
    const now = Date.now();
    const eff = def.effect;

    // ── 1 SEULE ULT ACTIVE À LA FOIS : on annule l'ult en cours ──────────
    if (get().activeUlts[0]) {
      set({ activeUlts: [] });
    }

    set(() => ({ animating: templateId }));
    setTimeout(() => set(() => ({ animating: null })), def.animDuration);

    set(s => {
      const newCooldowns = { ...s.cooldowns, [templateId]: def.cooldown };
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
        cooldowns: newCooldowns,
        activeUlts: [{ templateId, formIndex, endsAt: now + def.duration * 1000, effect: eff }],
      };
    });

    setTimeout(() => {
      set(s => ({
        activeUlts: s.activeUlts.filter(a => a.templateId !== templateId),
      }));
    }, def.duration * 1000);
  },

  tick: () => set(s => {
    const newCds: Record<string, number> = {};
    for (const [id, cd] of Object.entries(s.cooldowns)) newCds[id] = Math.max(0, cd - 1);
    const now = Date.now();
    const activeUlts = s.activeUlts.filter(a => a.endsAt > now);
    return { cooldowns: newCds, activeUlts };
  }),

  getDpsMultiplierFor: (templateId) => {
    let mult = 1;
    for (const a of get().activeUlts) {
      if (a.effect.dpsMultiplier) mult *= a.effect.dpsMultiplier;
      if (a.effect.selfDpsMultiplier && a.templateId === templateId) mult *= a.effect.selfDpsMultiplier;
    }
    return mult;
  },

  getActiveCritChance: () => {
    let best: number | null = null;
    for (const a of get().activeUlts) {
      if (a.effect.critChance != null) best = best === null ? a.effect.critChance : Math.max(best, a.effect.critChance);
    }
    return best;
  },

  getActiveEnemyDamageTakenMultiplier: () =>
    get().activeUlts.reduce((m, a) => a.effect.enemyDamageTakenBonusPct ? m * (1 + a.effect.enemyDamageTakenBonusPct / 100) : m, 1),

  getActiveBonusDpsFlat: (teamDps) => {
    let bonus = 0;
    for (const a of get().activeUlts) {
      if (a.effect.autoStrikes) {
        const { perSecond, value } = a.effect.autoStrikes;
        bonus += perSecond * teamDps * (value / 100);
      }
    }
    return bonus;
  },

  getActiveDamageToCoinPct: () =>
    get().activeUlts.reduce((sum, a) => sum + (a.effect.damageToCoinPct ?? 0), 0),
    }),
    {
      name: 'nekoz-ult-v1',
      // Ne persiste QUE les cooldowns (pas les actives — elles expirent au reload)
      partialize: (s) => ({ cooldowns: s.cooldowns }),
    }
  )
);

// ── Sélecteur coin (utilisé dans resolveEnemyDeath de gameStore) ──────────
export function getActiveCoinMultiplier(store: ReturnType<typeof useUltimateStore.getState>): number {
  return store.activeUlts.reduce((m, a) => m * (a.effect.coinMultiplier ?? 1), 1);
}
