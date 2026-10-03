// Prestige (New Game+) : jetons, bonus, Mémoire des Pierres. Fusionné dans
// gameStore depuis l'ancien store/prestigeStore.ts (voir Phase 2 du refacto).
// L'action `doPrestige(maxPalierReached)` de l'ancien store a été supprimée
// (collisionnait avec MetaProgressionActions.doPrestige() côté UI) — son
// corps (incrément de prestigeLevel, calcul des jetons, toast) est inliné
// directement dans metaProgressionSlice.ts::doPrestige().
import type { StateCreator } from 'zustand';
import {
  PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES,
  getStoneMemoryCost,
} from '@/lib/game/prestige';
import type { PrestigeBonusType } from '@/lib/game/prestige';
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

  // "Tout utiliser" : même tirage que spendToken, répété sur tous les jetons
  // mais appliqué en un seul set() (pas de N mises à jour du store).
  spendAllTokens: () => {
    const levels = { ...get().prestigeBonusLevels };
    let tokens = get().prestigeTokens;
    const gained: Partial<Record<PrestigeBonusType, number>> = {};
    while (tokens > 0) {
      const pool = PRESTIGE_BONUS_TYPES.filter(t => {
        const maxLevel = PRESTIGE_BONUS_DEFS[t].maxLevel;
        return !maxLevel || levels[t] < maxLevel;
      });
      if (pool.length === 0) break;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      levels[picked] += 1;
      gained[picked] = (gained[picked] ?? 0) + 1;
      tokens -= 1;
    }
    if (tokens !== get().prestigeTokens) set({ prestigeTokens: tokens, prestigeBonusLevels: levels });
    return gained;
  },

  // Achat direct (pas de tirage) du niveau suivant de "Mémoire des Pierres".
  buyStoneMemory: () => {
    const level = get().prestigeRankRecoveryLevel;
    const cost = getStoneMemoryCost(level);
    if (cost === null || get().prestigeTokens < cost) return false;
    set(s => ({ prestigeTokens: s.prestigeTokens - cost, prestigeRankRecoveryLevel: s.prestigeRankRecoveryLevel + 1 }));
    return true;
  },
});
