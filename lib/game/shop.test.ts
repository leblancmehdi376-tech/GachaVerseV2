import { describe, it, expect } from 'vitest';
import { generateDailyShopCharacters } from './shop';
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
