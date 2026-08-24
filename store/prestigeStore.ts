'use client';
import { create } from 'zustand';
import {
  PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES, PrestigeBonusType, PrestigeBonusLevels,
  ActivePrestigeBonuses, calcPrestigeBonuses, calcTokensAwarded, initialBonusLevels,
  getRankRecoveryCost, rankRecoveryCap,
} from '@/lib/game/prestige';
import { toast } from '@/hooks/useToast';

interface PrestigeStore {
  // Niveau de prestige (nombre de fois qu'on a reset)
  level:       number;
  // Jetons de prestige non dépensés
  tokens:      number;
  // Niveau atteint pour chaque type de bonus (voir lib/game/prestige.ts)
  bonusLevels: PrestigeBonusLevels;
  // Niveau du bonus "Mémoire des Rangs" (achat direct, 6 niveaux max) — voir
  // lib/game/prestige.ts (RANK_RECOVERY_*) et addToCollection dans gameStore.ts.
  rankRecoveryLevel: number;

  // ── Actions ────────────────────────────────────────────────────────────
  canPrestige: (maxPalierReached: number) => boolean;
  doPrestige:  (maxPalierReached: number) => void;   // appelé depuis gameStore
  spendToken:  () => PrestigeBonusType | null;
  buyRankRecovery: () => boolean;

  // ── Calculs ────────────────────────────────────────────────────────────
  getBonuses: () => ActivePrestigeBonuses;
  resetPrestige: () => void;
}

export const usePrestigeStore = create<PrestigeStore>()(
    (set, get) => ({
      level:       0,
      tokens:      0,
      bonusLevels: initialBonusLevels(),
      rankRecoveryLevel: 0,

      // Remet le prestige à zéro (utilisé par "Réinitialiser mon compte").
      resetPrestige: () => set({ level: 0, tokens: 0, bonusLevels: initialBonusLevels(), rankRecoveryLevel: 0 }),

      canPrestige: (maxPalierReached) => maxPalierReached >= 41,

      doPrestige: (maxPalierReached) => {
        const newLevel = get().level + 1;
        const awarded = calcTokensAwarded(maxPalierReached, get().bonusLevels.tokenGain);
        set(s => ({
          level:  newLevel,
          tokens: s.tokens + awarded,
        }));
        toast.palier(
          `⭐ PRESTIGE ${newLevel} ATTEINT !`,
          `+${awarded} jeton${awarded > 1 ? 's' : ''} de Prestige`
        );
      },

      spendToken: () => {
        if (get().tokens <= 0) return null;
        const levels = get().bonusLevels;
        const pool = PRESTIGE_BONUS_TYPES.filter(t => {
          const maxLevel = PRESTIGE_BONUS_DEFS[t].maxLevel;
          return !maxLevel || levels[t] < maxLevel;
        });
        if (pool.length === 0) return null; // tout est déjà au max (cas limite)
        const picked = pool[Math.floor(Math.random() * pool.length)];
        set(s => ({
          tokens: s.tokens - 1,
          bonusLevels: { ...s.bonusLevels, [picked]: s.bonusLevels[picked] + 1 },
        }));
        return picked;
      },

      getBonuses: () => calcPrestigeBonuses(get().bonusLevels),

      // Achat direct (pas de tirage) du niveau suivant de "Mémoire des Rangs".
      buyRankRecovery: () => {
        const level = get().rankRecoveryLevel;
        const cost = getRankRecoveryCost(level);
        if (cost === null || get().tokens < cost) return false;
        set(s => ({ tokens: s.tokens - cost, rankRecoveryLevel: s.rankRecoveryLevel + 1 }));
        return true;
      },
    })
);

// Helper global pour utilisation dans gameStore sans hook.
// Mémo : recalculer calcPrestigeBonuses() à chaque appel serait gaspillé — cette
// fonction est appelée plusieurs fois par rendu de combat (DPS total + DPS de
// chaque allié) et chaque seconde. On ne recalcule que si bonusLevels a changé.
let _pbLevels: PrestigeBonusLevels | null = null;
let _pbValue: ActivePrestigeBonuses | null = null;

export function getPrestigeBonuses(): ActivePrestigeBonuses & { rankRecoveryCap: number } {
  const s = usePrestigeStore.getState();
  if (!_pbValue || _pbLevels !== s.bonusLevels) {
    _pbValue = calcPrestigeBonuses(s.bonusLevels);
    _pbLevels = s.bonusLevels;
  }
  return { ..._pbValue, rankRecoveryCap: rankRecoveryCap(s.rankRecoveryLevel) };
}
