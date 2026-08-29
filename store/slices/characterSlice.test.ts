import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { bnFromNumber } from '@/lib/game/bignum';
import { EVOLUTION_STONE_ITEM_ID } from '@/types/game';
import type { OwnedCharacter } from '@/types/game';

// 'minato' a 2 formes sans requiredItemIds (voir lib/game/characters.ts) —
// seules les Pierres d'Évolution + les pixelCoins sont nécessaires, ce qui
// simplifie le setup par rapport à un perso avec items d'évolution dédiés.
function setEvolvableMinato() {
  const owned: OwnedCharacter = { templateId: 'minato', rank: 1, copies: 1, level: 1, currentForm: 0, xp: 0 };
  useGameStore.setState({
    collection: { minato: owned },
    pixelCoins: bnFromNumber(2_000_000_000),
    expeditionDropInventory: { [EVOLUTION_STONE_ITEM_ID]: 999 },
  });
}

describe('evolveCharacter — progression des quêtes "Améliorer tes personnages"', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('fait bien évoluer le personnage quand les conditions sont réunies', () => {
    setEvolvableMinato();
    useGameStore.getState().evolveCharacter('minato');
    expect(useGameStore.getState().collection.minato.currentForm).toBe(1);
  });

  it('incrémente les quêtes journalière et hebdomadaire "d_upgrade"/"w_upgrade"', () => {
    setEvolvableMinato();
    const before = useGameStore.getState();
    const dBefore = before.quests.find(q => q.id === 'd_upgrade')!.current;
    const wBefore = before.weeklyQuests.find(q => q.id === 'w_upgrade')!.current;

    useGameStore.getState().evolveCharacter('minato');

    const after = useGameStore.getState();
    expect(after.quests.find(q => q.id === 'd_upgrade')!.current).toBe(dBefore + 1);
    expect(after.weeklyQuests.find(q => q.id === 'w_upgrade')!.current).toBe(wBefore + 1);
  });

  it('incrémente le cumul à vie totalUpgradesPerformed (comme levelUpCharacter)', () => {
    setEvolvableMinato();
    const before = useGameStore.getState().totalUpgradesPerformed ?? 0;

    useGameStore.getState().evolveCharacter('minato');

    expect(useGameStore.getState().totalUpgradesPerformed).toBe(before + 1);
  });

  it("ne bouge rien si l'évolution est refusée (pierres insuffisantes)", () => {
    setEvolvableMinato();
    useGameStore.setState({ expeditionDropInventory: {} });
    const before = useGameStore.getState();
    const dBefore = before.quests.find(q => q.id === 'd_upgrade')!.current;

    useGameStore.getState().evolveCharacter('minato');

    const after = useGameStore.getState();
    expect(after.collection.minato.currentForm).toBe(0);
    expect(after.quests.find(q => q.id === 'd_upgrade')!.current).toBe(dBefore);
  });
});
