import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { GACHA_COSTS } from '@/lib/game/gacha';
import type { Anomaly } from '@/lib/game/anomalies';

function anomaly(overrides: Partial<Anomaly>): Anomaly {
  return { id: `a_${Math.random()}`, rarity: 'C', bonusType: 'gachaCostReduction', value: 0.1, target: null, locked: false, ...overrides };
}

describe('gachaSlice — Jetons d\'Anomalie (1 tous les 100 tirages cumulés)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ nekoGems: 1_000_000 });
  });

  it("un tirage ×1 qui fait franchir le palier de 100 accorde 1 jeton", () => {
    useGameStore.setState({ totalGachaPulls: 99 });
    useGameStore.getState().pullSingle();
    const s = useGameStore.getState();
    expect(s.totalGachaPulls).toBe(100);
    expect(s.anomalyTokens).toBe(1);
  });

  it("un tirage ×1 qui ne franchit aucun palier n'accorde rien", () => {
    useGameStore.setState({ totalGachaPulls: 10 });
    useGameStore.getState().pullSingle();
    expect(useGameStore.getState().anomalyTokens).toBe(0);
  });

  it("un tirage ×10 qui chevauche un palier de 100 accorde exactement 1 jeton", () => {
    useGameStore.setState({ totalGachaPulls: 95 });
    useGameStore.getState().pullMulti();
    const s = useGameStore.getState();
    expect(s.totalGachaPulls).toBe(105);
    expect(s.anomalyTokens).toBe(1);
  });

  it("un tirage ×10 qui ne chevauche aucun palier n'accorde rien", () => {
    useGameStore.setState({ totalGachaPulls: 50 });
    useGameStore.getState().pullMulti();
    expect(useGameStore.getState().anomalyTokens).toBe(0);
  });

  it("un tirage ×100 accorde toujours exactement 1 jeton, quel que soit le compteur de départ", () => {
    for (const start of [0, 37, 99, 250]) {
      useGameStore.getState().resetGame();
      useGameStore.setState({ nekoGems: 1_000_000, totalGachaPulls: start });
      useGameStore.getState().pullMulti100();
      const s = useGameStore.getState();
      expect(s.totalGachaPulls).toBe(start + 100);
      expect(s.anomalyTokens).toBe(1);
    }
  });

  it('les jetons gagnés au fil de plusieurs tirages ×1 s\'accumulent (2 paliers franchis = 2 jetons)', () => {
    useGameStore.setState({ totalGachaPulls: 199 });
    useGameStore.getState().pullSingle(); // -> 200 : franchit le palier 200
    useGameStore.setState({ totalGachaPulls: 99 });
    useGameStore.getState().pullSingle(); // -> 100 : franchit le palier 100
    expect(useGameStore.getState().anomalyTokens).toBe(2);
  });
});

describe('gachaSlice — getGachaCosts (réduction via anomalies "Réduc. Coût Gacha")', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('sans anomalie, les coûts sont ceux de base', () => {
    const costs = useGameStore.getState().getGachaCosts();
    expect(costs).toEqual({ single: GACHA_COSTS.single, multi10: GACHA_COSTS.multi10, multi100: GACHA_COSTS.multi100 });
  });

  it('une anomalie "Réduc. Coût Gacha" réduit les 3 coûts proportionnellement', () => {
    useGameStore.setState({ ownedAnomalies: [anomaly({ value: 10 })] }); // -10%
    const costs = useGameStore.getState().getGachaCosts();
    expect(costs.single).toBe(Math.max(1, Math.round(GACHA_COSTS.single * 0.9)));
    expect(costs.multi10).toBe(Math.round(GACHA_COSTS.multi10 * 0.9));
    expect(costs.multi100).toBe(Math.round(GACHA_COSTS.multi100 * 0.9));
  });

  it('pullSingle dépense bien le coût réduit, pas le coût de base', () => {
    useGameStore.setState({ ownedAnomalies: [anomaly({ value: 50 })], nekoGems: 100 }); // -50%
    const reducedCost = useGameStore.getState().getGachaCosts().single;
    useGameStore.getState().pullSingle();
    expect(useGameStore.getState().nekoGems).toBe(100 - reducedCost);
    expect(reducedCost).toBeLessThan(GACHA_COSTS.single);
  });
});
