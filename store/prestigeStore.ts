'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  PRESTIGE_UPGRADES, calcPrestigeBonuses, ActivePrestigeBonuses,
  PRESTIGE_PASSIVE_DPS_PER_LEVEL, PRESTIGE_PASSIVE_COIN_PER_LEVEL,
} from '@/lib/game/prestige';
import { toast } from '@/hooks/useToast';

interface PrestigeStore {
  // Niveau de prestige (nombre de fois qu'on a reset)
  level:       number;
  // Points de prestige non dépensés
  points:      number;
  // Upgrades achetés : id → nombre de niveaux achetés
  purchased:   Record<string, number>;

  // ── Actions ────────────────────────────────────────────────────────────
  canPrestige: (maxPalierReached: number) => boolean;
  doPrestige:  () => void;   // appelé depuis gameStore
  buyUpgrade:  (id: string) => void;

  // ── Calculs ────────────────────────────────────────────────────────────
  getShopBonuses: () => ActivePrestigeBonuses;
  getTotalDpsMult:  () => number;  // passif + shop
  getTotalCoinsMult:() => number;
  getStartGems:     () => number;
  getStartPalier:   () => number;
  getUpgradeDiscount: () => number;
  resetPrestige: () => void;
}

export const usePrestigeStore = create<PrestigeStore>()(
  persist(
    (set, get) => ({
      level:     0,
      points:    0,
      purchased: {},

      // Remet le prestige à zéro (utilisé par "Réinitialiser mon compte").
      resetPrestige: () => set({ level: 0, points: 0, purchased: {} }),

      canPrestige: (maxPalierReached) => maxPalierReached >= 40,

      doPrestige: () => {
        const newLevel = get().level + 1;
        set(s => ({
          level:  newLevel,
          points: s.points + 3,  // 3 points par prestige
        }));
        toast.palier(
          `⭐ PRESTIGE ${newLevel} ATTEINT !`,
          `+3 Points de Prestige · Bonus passifs activés`
        );
      },

      buyUpgrade: (id) => {
        const upg = PRESTIGE_UPGRADES.find(u => u.id === id);
        if (!upg) return;
        const currentLevel = get().purchased[id] ?? 0;
        if (currentLevel >= upg.maxLevel) {
          toast.error('Niveau maximum', `${upg.name} est déjà au niveau max`);
          return;
        }
        if (get().points < upg.cost) {
          toast.error('Points insuffisants', `Il te faut ${upg.cost} points de prestige`);
          return;
        }
        set(s => ({
          points: s.points - upg.cost,
          purchased: {
            ...s.purchased,
            [id]: (s.purchased[id] ?? 0) + 1,
          },
        }));
        toast.levelup(`✦ ${upg.name} amélioré !`, upg.description);
      },

      getShopBonuses: () => calcPrestigeBonuses(get().purchased),

      getTotalDpsMult: () => {
        const passive = 1 + get().level * PRESTIGE_PASSIVE_DPS_PER_LEVEL;
        return passive * get().getShopBonuses().dpsMult;
      },

      getTotalCoinsMult: () => {
        const passive = 1 + get().level * PRESTIGE_PASSIVE_COIN_PER_LEVEL;
        return passive * get().getShopBonuses().coinsMult;
      },

      getStartGems:         () => get().getShopBonuses().startGems,
      getStartPalier:       () => get().getShopBonuses().startPalier,
      getUpgradeDiscount:   () => get().getShopBonuses().upgradeDiscount,
    }),
    {
      name: 'gachaverse_prestige',
      partialize: (s) => ({
        level:     s.level,
        points:    s.points,
        purchased: s.purchased,
      }),
    }
  )
);

// Helper global pour utilisation dans gameStore sans hook
// Mémo : chacun des 6 getters ci-dessous relance calcPrestigeBonuses() sur tout
// le shop. Or cette fonction est appelée plusieurs fois par rendu de combat
// (DPS total + DPS de chaque allié) et chaque seconde. On ne recalcule donc que
// si l'état de prestige a réellement changé (niveau ou achats).
let _pbLevel = -1;
let _pbPurchased: unknown = null;
let _pbValue: {
  dpsMult: number; coinsMult: number;
  startGems: number; startPalier: number; upgradeDiscount: number;
} | null = null;

export function getPrestigeBonuses() {
  const s = usePrestigeStore.getState();
  if (_pbValue && _pbLevel === s.level && _pbPurchased === s.purchased) return _pbValue;

  _pbValue = {
    dpsMult:          s.getTotalDpsMult(),
    coinsMult:        s.getTotalCoinsMult(),
    startGems:        s.getStartGems(),
    startPalier:      s.getStartPalier(),
    upgradeDiscount:  s.getUpgradeDiscount(),
  };
  _pbLevel = s.level;
  _pbPurchased = s.purchased;
  return _pbValue;
}
