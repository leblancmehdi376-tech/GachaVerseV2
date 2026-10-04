import { describe, it, expect } from 'vitest';
import { generateDailyShopCharacters, getVoidOrbsForCharacter, liquidateChampionInventory } from './shop';
import { getCharacterById } from './characters';

describe('generateDailyShopCharacters', () => {
  it('peut proposer des raretés autres que Commun à haut palier', () => {
    let sawNonCommon = false;
    for (let i = 0; i < 500 && !sawNonCommon; i++) {
      const ids = generateDailyShopCharacters(40);
      for (const id of ids) {
        const char = getCharacterById(id);
        if (char && char.rarity !== 'C') sawNonCommon = true;
      }
    }
    expect(sawNonCommon).toBe(true);
  });

  it('ne propose que du Commun au palier 1 (comportement attendu de la gacha à ce palier)', () => {
    let sawNonCommon = false;
    for (let i = 0; i < 100; i++) {
      const ids = generateDailyShopCharacters(1);
      for (const id of ids) {
        const char = getCharacterById(id);
        if (char && char.rarity !== 'C') sawNonCommon = true;
      }
    }
    expect(sawNonCommon).toBe(false);
  });
});

describe('liquidateChampionInventory', () => {
  it("convertit les doublons restants en Orbes du Néant et vide l'inventaire", () => {
    const data: Record<string, unknown> = { voidOrbs: 10, totalVoidOrbsEarned: 50, championInventory: { minato: 2, jinwoo: 0 } };
    const orbs = liquidateChampionInventory(data);
    expect(orbs).toBe(2 * getVoidOrbsForCharacter('minato'));
    expect(data.voidOrbs).toBe(10 + orbs);
    expect(data.totalVoidOrbsEarned).toBe(50 + orbs);
    expect(data.championInventory).toEqual({});
    expect(liquidateChampionInventory(data)).toBe(0);
    expect(data.voidOrbs).toBe(10 + orbs);
  });

  it('ne touche pas à une save partielle sans voidOrbs', () => {
    const data: Record<string, unknown> = { championInventory: { minato: 1 } };
    expect(liquidateChampionInventory(data)).toBe(0);
    expect(data.championInventory).toEqual({ minato: 1 });
  });
});
