// Prestige (New Game+) : jetons, bonus, Mémoire des Rangs. Fusionné dans
// gameStore depuis l'ancien store/prestigeStore.ts (voir Phase 2 du refacto).
// L'action `doPrestige(maxPalierReached)` de l'ancien store a été supprimée
// (collisionnait avec MetaProgressionActions.doPrestige() côté UI) — son
// corps (incrément de prestigeLevel, calcul des jetons, toast) est inliné
// directement dans metaProgressionSlice.ts::doPrestige().
import type { StateCreator } from 'zustand';
import {
  PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES,
  getRankRecoveryCost,
} from '@/lib/game/prestige';
import type { GameStore, PrestigeActions } from '../gameStore.types';

export const createPrestigeSlice: StateCreator<GameStore, [], [], PrestigeActions> = (set, get) => ({
  canPrestige: (maxPalierReached) => maxPalierReached >= 41,

  spendToken: () => {
    if (get().prestigeTokens <= 0) return null;
    const levels = get().prestigeBonusLevels;
    const pool = PRESTIGE_BONUS_TYPES.filter(t => {
      const maxLevel = PRESTIGE_BONUS_DEFS[t].maxLevel;
      return !maxLevel || levels[t] < maxLevel;
    });
    if (pool.length === 0) return null; // tout est déjà au max (cas limite)
    const picked = pool[Math.floor(Math.random() * pool.length)];
    set(s => ({
      prestigeTokens: s.prestigeTokens - 1,
      prestigeBonusLevels: { ...s.prestigeBonusLevels, [picked]: s.prestigeBonusLevels[picked] + 1 },
    }));
    return picked;
  },

  // Achat direct (pas de tirage) du niveau suivant de "Mémoire des Rangs".
  buyRankRecovery: () => {
    const level = get().prestigeRankRecoveryLevel;
    const cost = getRankRecoveryCost(level);
    if (cost === null || get().prestigeTokens < cost) return false;
    set(s => ({ prestigeTokens: s.prestigeTokens - cost, prestigeRankRecoveryLevel: s.prestigeRankRecoveryLevel + 1 }));
    return true;
  },
});
