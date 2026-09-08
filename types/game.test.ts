import { describe, it, expect } from 'vitest';
import { RARITY_ORDER_ASC, getEquipmentUpgradeCost, type Rarity } from './game';

describe('getEquipmentUpgradeCost', () => {
  it('démarre à 10 pour la fusion depuis la rareté la plus basse (Commun → Peu Commun)', () => {
    expect(getEquipmentUpgradeCost('C')).toBe(10);
  });

  it('décroît de 1 par palier de rareté jusqu\'au plancher', () => {
    const expected: Record<Rarity, number> = {
      C: 10, U: 9, R: 8, E: 7, L: 6, M: 6, S: 6, CO: 6, P: 6, T: 6,
    };
    for (const rarity of RARITY_ORDER_ASC) {
      expect(getEquipmentUpgradeCost(rarity)).toBe(expected[rarity]);
    }
  });

  it('ne descend jamais sous 6, même pour les raretés les plus hautes', () => {
    for (const rarity of RARITY_ORDER_ASC.slice(-3)) {
      expect(getEquipmentUpgradeCost(rarity)).toBe(6);
    }
  });
});
