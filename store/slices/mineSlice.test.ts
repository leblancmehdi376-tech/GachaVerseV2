import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import {
  MINE_PURCHASE_COST_CROWNS, MINE_BASE_RATE_PER_HOUR, MINE_CAP_TIERS,
  MINE_SPEED_MULT_TIERS, MINE_CAP_UPGRADE_COSTS, MINE_SPEED_UPGRADE_COSTS,
} from '@/store/gameStoreHelpers';

const state = () => useGameStore.getState();
const T0 = 1_700_000_000_000;
const HOUR = 3_600_000;

function ownedMine(extra: Partial<ReturnType<typeof state>> = {}) {
  useGameStore.setState({ prestigeLevel: 1, bossCrowns: 1000, mineOwned: true, mineCapLevel: 0, mineSpeedLevel: 0, mineGems: 0, mineLastTickAt: T0, ...extra });
}

describe('mineSlice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    state().resetGame();
  });
  afterEach(() => { vi.useRealTimers(); });

  describe('achat', () => {
    it('refusé avant le premier Prestige', () => {
      useGameStore.setState({ prestigeLevel: 0, bossCrowns: 100 });
      state().buyMine();
      expect(state().mineOwned).toBe(false);
      expect(state().bossCrowns).toBe(100);
    });

    it('refusé sans assez de BossCrowns', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: MINE_PURCHASE_COST_CROWNS - 1 });
      state().buyMine();
      expect(state().mineOwned).toBe(false);
    });

    it('débite le coût et démarre le chrono à maintenant', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: 25 });
      state().buyMine();
      expect(state().mineOwned).toBe(true);
      expect(state().bossCrowns).toBe(25 - MINE_PURCHASE_COST_CROWNS);
      expect(state().mineLastTickAt).toBe(T0);
    });

    it('ne peut pas être achetée deux fois', () => {
      ownedMine({ bossCrowns: 50 });
      state().buyMine();
      expect(state().bossCrowns).toBe(50);
    });
  });

  describe('améliorations', () => {
    it('plafond et vitesse suivent les paliers', () => {
      ownedMine();
      expect(state().getMineCap()).toBe(MINE_CAP_TIERS[0]);
      expect(state().getMineRatePerHour()).toBe(MINE_BASE_RATE_PER_HOUR);
      state().upgradeMineCap();
      state().upgradeMineSpeed();
      expect(state().getMineCap()).toBe(MINE_CAP_TIERS[1]);
      expect(state().getMineRatePerHour()).toBe(MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[1]);
      expect(state().bossCrowns).toBe(1000 - MINE_CAP_UPGRADE_COSTS[0] - MINE_SPEED_UPGRADE_COSTS[0]);
    });

    it('chaque palier a un coût, un plafond et un multiplicateur', () => {
      expect(MINE_CAP_TIERS.length).toBe(MINE_CAP_UPGRADE_COSTS.length + 1);
      expect(MINE_SPEED_MULT_TIERS.length).toBe(MINE_SPEED_UPGRADE_COSTS.length + 1);
    });

    it('au niveau max : coût null et achat sans effet', () => {
      ownedMine({ mineCapLevel: MINE_CAP_UPGRADE_COSTS.length, mineSpeedLevel: MINE_SPEED_UPGRADE_COSTS.length });
      expect(state().getMineCapUpgradeCost()).toBeNull();
      expect(state().getMineSpeedUpgradeCost()).toBeNull();
      state().upgradeMineCap();
      state().upgradeMineSpeed();
      expect(state().bossCrowns).toBe(1000);
      expect(state().getMineCap()).toBe(MINE_CAP_TIERS[MINE_CAP_TIERS.length - 1]);
    });

    it('refusées sans mine ou sans assez de BossCrowns', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: 1000, mineOwned: false });
      state().upgradeMineCap();
      expect(state().mineCapLevel).toBe(0);
      ownedMine({ bossCrowns: MINE_CAP_UPGRADE_COSTS[0] - 1 });
      state().upgradeMineCap();
      state().upgradeMineSpeed();
      expect(state().mineCapLevel).toBe(0);
      expect(state().mineSpeedLevel).toBe(0);
    });

    it("tous les paliers s'enchaînent au bon coût jusqu'au max", () => {
      ownedMine();
      for (let lvl = 0; lvl < MINE_CAP_UPGRADE_COSTS.length; lvl++) {
        expect(state().getMineCapUpgradeCost()).toBe(MINE_CAP_UPGRADE_COSTS[lvl]);
        const before = state().bossCrowns;
        state().upgradeMineCap();
        expect(state().bossCrowns).toBe(before - MINE_CAP_UPGRADE_COSTS[lvl]);
        expect(state().getMineCap()).toBe(MINE_CAP_TIERS[lvl + 1]);
      }
      for (let lvl = 0; lvl < MINE_SPEED_UPGRADE_COSTS.length; lvl++) {
        expect(state().getMineSpeedUpgradeCost()).toBe(MINE_SPEED_UPGRADE_COSTS[lvl]);
        state().upgradeMineSpeed();
        expect(state().getMineRatePerHour()).toBe(MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[lvl + 1]);
      }
      const spent = [...MINE_CAP_UPGRADE_COSTS, ...MINE_SPEED_UPGRADE_COSTS].reduce((a, b) => a + b, 0);
      expect(state().bossCrowns).toBe(1000 - spent);
      expect(state().getMineCapUpgradeCost()).toBeNull();
      expect(state().getMineSpeedUpgradeCost()).toBeNull();
    });

    it('les paliers sont strictement croissants', () => {
      for (let i = 1; i < MINE_CAP_TIERS.length; i++) expect(MINE_CAP_TIERS[i]).toBeGreaterThan(MINE_CAP_TIERS[i - 1]);
      for (let i = 1; i < MINE_SPEED_MULT_TIERS.length; i++) expect(MINE_SPEED_MULT_TIERS[i]).toBeGreaterThan(MINE_SPEED_MULT_TIERS[i - 1]);
    });

    it('la vitesse améliorée accélère vraiment la production (en ligne et hors-ligne)', () => {
      const lvl = MINE_SPEED_MULT_TIERS.length - 1;
      ownedMine({ mineSpeedLevel: lvl, mineCapLevel: MINE_CAP_TIERS.length - 1 });
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[lvl] / 3600, 6);

      useGameStore.setState({ mineGems: 0, mineLastTickAt: T0 + 1000 - 2 * HOUR });
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[lvl] * 2, 6);
    });

    it("le plafond amélioré laisse la production dépasser l'ancien plafond", () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0] - 0.001 });
      state().upgradeMineCap();
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineGems).toBeGreaterThan(MINE_CAP_TIERS[0]);
      useGameStore.setState({ mineLastTickAt: T0 + 1000 - 100 * HOUR });
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBe(MINE_CAP_TIERS[1]);
    });

    it('niveaux hors bornes (vieille sauvegarde) : retombent sur le dernier palier', () => {
      ownedMine({ mineCapLevel: 99, mineSpeedLevel: 99 });
      expect(state().getMineCap()).toBe(MINE_CAP_TIERS[MINE_CAP_TIERS.length - 1]);
      expect(state().getMineRatePerHour()).toBe(MINE_BASE_RATE_PER_HOUR * MINE_SPEED_MULT_TIERS[MINE_SPEED_MULT_TIERS.length - 1]);
    });

    it('agrandir une mine pleine relance le chrono (pas de rattrapage du temps passé pleine)', () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0], mineLastTickAt: T0 - 5 * HOUR });
      state().upgradeMineCap();
      expect(state().mineLastTickAt).toBe(T0);
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineGems).toBeCloseTo(MINE_CAP_TIERS[0] + MINE_BASE_RATE_PER_HOUR / 3600, 6);
    });
  });

  describe('production en ligne (tickMine)', () => {
    it('produit au taux horaire, seconde par seconde', () => {
      ownedMine();
      for (let i = 1; i <= 360; i++) {
        vi.setSystemTime(T0 + i * 1000);
        state().tickMine();
      }
      expect(state().mineGems).toBeCloseTo(1, 6); // 10/h × 0,1 h
      expect(state().mineLastTickAt).toBe(T0 + 360_000);
    });

    it('ne dépasse jamais le plafond', () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0] - 0.001 });
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineGems).toBe(MINE_CAP_TIERS[0]);
    });

    it('sans mine : rien ne bouge', () => {
      useGameStore.setState({ mineOwned: false, mineLastTickAt: T0 - HOUR });
      state().tickMine();
      expect(state().mineGems).toBe(0);
    });

    it('mine pleine : le chrono ne bouge pas', () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0] });
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineLastTickAt).toBe(T0);
    });

    it("un long trou (page rouverte) est crédité à 100 %, sans double crédit au rattrapage", () => {
      const gap = 20 * HOUR;
      ownedMine({ mineCapLevel: MINE_CAP_TIERS.length - 1, mineLastTickAt: T0 - gap });
      state().tick();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR * 20, 6);
      expect(state().mineLastTickAt).toBe(T0);
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR * 20, 6);
    });
  });

  describe('rattrapage hors-ligne', () => {
    it('produit à 100 %, sans la durée max ni le rendement AFK du profil', () => {
      const gap = 20 * HOUR;
      ownedMine({ mineCapLevel: MINE_CAP_TIERS.length - 1, mineLastTickAt: T0 - gap });
      expect(gap / HOUR).toBeGreaterThan(state().getOfflineCapHours());
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR * 20, 6);
      expect(state().mineLastTickAt).toBe(T0);
    });

    it('plafonné par le stockage', () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0] - 1, mineLastTickAt: T0 - 10 * HOUR });
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBe(MINE_CAP_TIERS[0]);
    });

    it('chrono dans le futur (horloge recalée) : rien ne bouge', () => {
      ownedMine({ mineGems: 3, mineLastTickAt: T0 + HOUR });
      state().applyMineOfflineProduction();
      state().tickMine();
      expect(state().mineGems).toBe(3);
    });

    it('sans mine : rien ne bouge', () => {
      useGameStore.setState({ mineOwned: false, mineLastTickAt: T0 - HOUR });
      state().applyMineOfflineProduction();
      expect(state().mineGems).toBe(0);
    });
  });

  describe('collecte', () => {
    it('transfère la partie entière et garde la fraction', () => {
      ownedMine({ mineGems: 7.4, nekoGems: 100 });
      state().collectMineGems();
      expect(state().nekoGems).toBe(107);
      expect(state().mineGems).toBeCloseTo(0.4, 6);
      expect(state().mineLastTickAt).toBe(T0); // pas pleine : chrono inchangé
    });

    it('moins d\'une gemme : rien n\'est collecté', () => {
      ownedMine({ mineGems: 0.9, nekoGems: 100 });
      state().collectMineGems();
      expect(state().nekoGems).toBe(100);
      expect(state().mineGems).toBe(0.9);
    });

    it('vider une mine pleine relance le chrono (pas de rattrapage du temps passé pleine)', () => {
      ownedMine({ mineGems: MINE_CAP_TIERS[0], mineLastTickAt: T0 - 5 * HOUR, nekoGems: 0 });
      state().collectMineGems();
      expect(state().nekoGems).toBe(MINE_CAP_TIERS[0]);
      expect(state().mineLastTickAt).toBe(T0);
      vi.setSystemTime(T0 + 1000);
      state().tickMine();
      expect(state().mineGems).toBeCloseTo(MINE_BASE_RATE_PER_HOUR / 3600, 6);
    });
  });
});
