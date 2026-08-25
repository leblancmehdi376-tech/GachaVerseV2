import { describe, it, expect } from 'vitest';
import { getDynamicRates, rollRarity, rollCharacter, rollMulti, rollMulti100, RARITY_GATES } from './gacha';
import type { Rarity } from '@/types/game';

describe('getDynamicRates', () => {
  it('les taux retournés totalisent toujours 100% (aux arrondis près)', () => {
    for (const palier of [1, 5, 10, 20, 30, 40, 60]) {
      const rates = getDynamicRates(palier);
      const total = Object.values(rates).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeCloseTo(100, 2);
    }
  });

  it('ne retourne que des raretés débloquées au palier donné', () => {
    const rates = getDynamicRates(1);
    expect(Object.keys(rates)).toEqual(['C']);
    expect(rates.C).toBe(100);
  });

  it('débloque progressivement les raretés à mesure que le palier augmente', () => {
    const ratesAtGate    = getDynamicRates(RARITY_GATES.U.unlockPalier);
    const ratesBeforeGate = getDynamicRates(RARITY_GATES.U.unlockPalier - 1);
    expect(ratesAtGate.U).toBeGreaterThan(0);
    expect(ratesBeforeGate.U ?? 0).toBe(0);
  });

  it('au-delà du palier 40, les taux sont identiques à ceux du palier 40 (pas d\'extrapolation)', () => {
    const at40 = getDynamicRates(40);
    const at100 = getDynamicRates(100);
    expect(at100).toEqual(at40);
  });
});

describe('rollRarity', () => {
  it('ne retourne que des raretés débloquées au palier donné', () => {
    for (let i = 0; i < 200; i++) {
      expect(rollRarity(1)).toBe('C');
    }
  });

  it('retourne toujours une clé de rareté valide', () => {
    const valid: Rarity[] = ['C','U','R','E','L','M','S','CO','P','T'];
    for (let i = 0; i < 200; i++) {
      expect(valid).toContain(rollRarity(40));
    }
  });
});

describe('rollCharacter / rollMulti / rollMulti100', () => {
  it('rollCharacter retourne toujours un id non vide', () => {
    for (let i = 0; i < 50; i++) {
      expect(typeof rollCharacter(20)).toBe('string');
      expect(rollCharacter(20).length).toBeGreaterThan(0);
    }
  });

  it('rollMulti retourne exactement 10 tirages', () => {
    expect(rollMulti(20)).toHaveLength(10);
  });

  it('rollMulti100 retourne exactement 100 tirages', () => {
    expect(rollMulti100(20)).toHaveLength(100);
  });
});
