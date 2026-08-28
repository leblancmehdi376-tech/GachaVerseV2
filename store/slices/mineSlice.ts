// Mine de gemmes : débloquée au premier Prestige, achetable puis améliorable
// en BossCrowns (plafond de stockage + vitesse de production). Produit des
// gemmes en continu jusqu'à son plafond ; le joueur doit ensuite "collecter"
// pour transférer le stock accumulé dans son solde de gemmes.
import type { StateCreator } from 'zustand';
import { correctedNow } from '@/lib/firebase/clockOffset';
import {
  MINE_PURCHASE_COST_CROWNS, MINE_BASE_RATE_PER_HOUR,
  MINE_CAP_TIERS, MINE_SPEED_MULT_TIERS,
  MINE_CAP_UPGRADE_COSTS, MINE_SPEED_UPGRADE_COSTS,
  broadcastLocalState,
} from '../gameStoreHelpers';
import type { GameStore, MineActions } from '../gameStore.types';

export const createMineSlice: StateCreator<GameStore, [], [], MineActions> = (set, get) => ({
  getMineCap: () => MINE_CAP_TIERS[Math.min(get().mineCapLevel ?? 0, MINE_CAP_TIERS.length - 1)],
  getMineRatePerHour: () => MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[Math.min(get().mineSpeedLevel ?? 0, MINE_SPEED_MULT_TIERS.length - 1)],

  getMineCapUpgradeCost: () => {
    const lvl = get().mineCapLevel ?? 0;
    return lvl >= MINE_CAP_UPGRADE_COSTS.length ? null : MINE_CAP_UPGRADE_COSTS[lvl];
  },
  getMineSpeedUpgradeCost: () => {
    const lvl = get().mineSpeedLevel ?? 0;
    return lvl >= MINE_SPEED_UPGRADE_COSTS.length ? null : MINE_SPEED_UPGRADE_COSTS[lvl];
  },

  buyMine: () => {
    const s = get();
    if (s.mineOwned || s.prestigeLevel < 1 || s.bossCrowns < MINE_PURCHASE_COST_CROWNS) return;
    set(state => ({
      mineOwned: true,
      bossCrowns: state.bossCrowns - MINE_PURCHASE_COST_CROWNS,
      mineLastTickAt: correctedNow(),
    }));
    broadcastLocalState();
  },

  upgradeMineCap: () => {
    if (!get().mineOwned) return;
    const cost = get().getMineCapUpgradeCost();
    if (cost === null || get().bossCrowns < cost) return;
    set(state => ({ bossCrowns: state.bossCrowns - cost, mineCapLevel: (state.mineCapLevel ?? 0) + 1 }));
    broadcastLocalState();
  },
  upgradeMineSpeed: () => {
    if (!get().mineOwned) return;
    const cost = get().getMineSpeedUpgradeCost();
    if (cost === null || get().bossCrowns < cost) return;
    set(state => ({ bossCrowns: state.bossCrowns - cost, mineSpeedLevel: (state.mineSpeedLevel ?? 0) + 1 }));
    broadcastLocalState();
  },

  tickMine: () => {
    const s = get();
    if (!s.mineOwned) return;
    const now = correctedNow();
    const elapsedHours = Math.max(0, (now - s.mineLastTickAt) / 3_600_000);
    if (elapsedHours <= 0) return;
    const cap = s.getMineCap();
    if (s.mineGems >= cap) { set({ mineLastTickAt: now }); return; }
    const produced = s.getMineRatePerHour() * elapsedHours;
    set({ mineGems: Math.min(s.mineGems + produced, cap), mineLastTickAt: now });
  },

  // Rattrapage hors-ligne : même logique que checkOfflineGain (durée
  // plafonnée par getOfflineCapHours, rendement réduit par
  // getOfflineRewardScale) pour que la mine ne contourne pas les quotas AFK
  // déjà en place sur le reste du revenu passif.
  applyMineOfflineProduction: () => {
    const s = get();
    if (!s.mineOwned) return;
    const now = correctedNow();
    const rawSeconds = Math.max(0, Math.floor((now - s.mineLastTickAt) / 1000));
    if (rawSeconds <= 0) return;
    const capSeconds = s.getOfflineCapHours() * 3600;
    const hours = Math.min(rawSeconds, capSeconds) / 3600;
    const produced = s.getMineRatePerHour() * hours * s.getOfflineRewardScale();
    set({ mineGems: Math.min(s.mineGems + produced, s.getMineCap()), mineLastTickAt: now });
  },

  collectMineGems: () => {
    const amount = Math.floor(get().mineGems);
    if (amount <= 0) return;
    set(state => ({ nekoGems: state.nekoGems + amount, mineGems: state.mineGems - amount }));
    broadcastLocalState();
  },
});
