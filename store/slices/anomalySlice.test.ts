import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { Anomaly } from '@/lib/game/anomalies';
import { ANOMALY_MAX_SLOTS, ANOMALY_SLOT_COSTS_CROWNS } from '@/lib/game/anomalies';

function anomaly(overrides: Partial<Anomaly>): Anomaly {
  return { id: `a_${Math.random()}`, rarity: 'C', bonusType: 'globalDps', value: 1, target: null, locked: false, ...overrides };
}

describe('anomalySlice', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('état initial : 0 jeton, aucune anomalie, 1 emplacement', () => {
    const s = useGameStore.getState();
    expect(s.anomalyTokens).toBe(0);
    expect(s.ownedAnomalies).toEqual([]);
    expect(s.anomalySlots).toBe(1);
  });

  describe('getAnomalyRerollCost', () => {
    it("vaut 1 sans anomalie verrouillée", () => {
      expect(useGameStore.getState().getAnomalyRerollCost()).toBe(1);
    });

    it('double par anomalie verrouillée possédée', () => {
      useGameStore.setState({
        ownedAnomalies: [anomaly({ id: 'a1', locked: true }), anomaly({ id: 'a2', locked: true })],
      });
      expect(useGameStore.getState().getAnomalyRerollCost()).toBe(4);
    });
  });

  describe('rerollAnomalies', () => {
    it('ne fait rien si le joueur n\'a pas assez de jetons', () => {
      useGameStore.setState({ anomalyTokens: 0 });
      useGameStore.getState().rerollAnomalies();
      expect(useGameStore.getState().ownedAnomalies).toEqual([]);
      expect(useGameStore.getState().anomalyTokens).toBe(0);
    });

    it('consomme 1 jeton et remplit le seul emplacement disponible', () => {
      useGameStore.setState({ anomalyTokens: 3, anomalySlots: 1 });
      useGameStore.getState().rerollAnomalies();
      const s = useGameStore.getState();
      expect(s.anomalyTokens).toBe(2);
      expect(s.ownedAnomalies).toHaveLength(1);
    });

    it('remplit tous les emplacements disponibles en un seul reroll', () => {
      useGameStore.setState({ anomalyTokens: 5, anomalySlots: 3 });
      useGameStore.getState().rerollAnomalies();
      expect(useGameStore.getState().ownedAnomalies).toHaveLength(3);
    });

    it('préserve les anomalies verrouillées et ne remplace que les autres', () => {
      const locked = anomaly({ id: 'locked1', locked: true, bonusType: 'goldGain', value: 42 });
      useGameStore.setState({ anomalyTokens: 10, anomalySlots: 3, ownedAnomalies: [locked] });

      useGameStore.getState().rerollAnomalies();

      const s = useGameStore.getState();
      expect(s.ownedAnomalies).toHaveLength(3);
      expect(s.ownedAnomalies.find(a => a.id === 'locked1')).toEqual(locked);
      // Les 2 nouvelles anomalies ont des ids différents de l'ancienne.
      expect(s.ownedAnomalies.filter(a => a.id !== 'locked1')).toHaveLength(2);
    });

    it('le coût du reroll augmente avec les anomalies verrouillées (double par lock)', () => {
      const locked = anomaly({ id: 'locked1', locked: true });
      useGameStore.setState({ anomalyTokens: 1, anomalySlots: 2, ownedAnomalies: [locked] });

      // Coût = 2 (1 lock) mais seulement 1 jeton disponible : ne doit rien faire.
      useGameStore.getState().rerollAnomalies();
      expect(useGameStore.getState().anomalyTokens).toBe(1);
      expect(useGameStore.getState().ownedAnomalies).toEqual([locked]);
    });
  });

  describe('toggleAnomalyLock', () => {
    it('verrouille puis déverrouille une anomalie possédée par son id', () => {
      useGameStore.setState({ ownedAnomalies: [anomaly({ id: 'a1', locked: false })] });

      useGameStore.getState().toggleAnomalyLock('a1');
      expect(useGameStore.getState().ownedAnomalies[0].locked).toBe(true);

      useGameStore.getState().toggleAnomalyLock('a1');
      expect(useGameStore.getState().ownedAnomalies[0].locked).toBe(false);
    });

    it("ne fait rien pour un id inconnu", () => {
      useGameStore.setState({ ownedAnomalies: [anomaly({ id: 'a1', locked: false })] });
      useGameStore.getState().toggleAnomalyLock('inconnu');
      expect(useGameStore.getState().ownedAnomalies[0].locked).toBe(false);
    });
  });

  describe('buyAnomalySlot', () => {
    it('refuse avant le premier Prestige, même avec assez de couronnes', () => {
      useGameStore.setState({ prestigeLevel: 0, bossCrowns: 1_000_000, anomalySlots: 1 });
      useGameStore.getState().buyAnomalySlot();
      expect(useGameStore.getState().anomalySlots).toBe(1);
    });

    it('refuse si pas assez de BossCrowns', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: 0, anomalySlots: 1 });
      useGameStore.getState().buyAnomalySlot();
      expect(useGameStore.getState().anomalySlots).toBe(1);
    });

    it('achète le slot suivant et déduit le coût exact en BossCrowns', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: ANOMALY_SLOT_COSTS_CROWNS[0], anomalySlots: 1 });
      useGameStore.getState().buyAnomalySlot();
      const s = useGameStore.getState();
      expect(s.anomalySlots).toBe(2);
      expect(s.bossCrowns).toBe(0);
    });

    it('refuse une fois ANOMALY_MAX_SLOTS atteint', () => {
      useGameStore.setState({ prestigeLevel: 1, bossCrowns: 1_000_000, anomalySlots: ANOMALY_MAX_SLOTS });
      useGameStore.getState().buyAnomalySlot();
      expect(useGameStore.getState().anomalySlots).toBe(ANOMALY_MAX_SLOTS);
    });
  });

  describe('persistance au Prestige', () => {
    it("les anomalies, jetons et emplacements survivent à doPrestige (bonus permanents)", async () => {
      const owned = [anomaly({ id: 'a1', bonusType: 'globalDps', value: 5 })];
      useGameStore.setState({
        maxPalierReached: 45, runPeakPalier: 45,
        anomalyTokens: 7, ownedAnomalies: owned, anomalySlots: 2,
      });

      await useGameStore.getState().doPrestige();

      const s = useGameStore.getState();
      expect(s.anomalyTokens).toBe(7);
      expect(s.ownedAnomalies).toEqual(owned);
      expect(s.anomalySlots).toBe(2);
    });
  });
});
