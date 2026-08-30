import { describe, it, expect } from 'vitest';
import { getPullsToNextToken, formatDropRate } from './GachaPage';

describe('getPullsToNextToken', () => {
  it("vaut 100 tirages restants pile après l'obtention d'un jeton (cycle à 0)", () => {
    expect(getPullsToNextToken(0)).toEqual({ pullsInCycle: 0, pullsToNextToken: 100 });
    expect(getPullsToNextToken(200)).toEqual({ pullsInCycle: 0, pullsToNextToken: 100 });
  });

  it('calcule la progression au milieu du cycle', () => {
    expect(getPullsToNextToken(37)).toEqual({ pullsInCycle: 37, pullsToNextToken: 63 });
  });

  it('boucle correctement sur les cycles de 100 tirages cumulés', () => {
    expect(getPullsToNextToken(250)).toEqual({ pullsInCycle: 50, pullsToNextToken: 50 });
  });
});

describe('formatDropRate', () => {
  it('affiche 0% pour un taux nul', () => {
    expect(formatDropRate(0)).toBe('0%');
  });

  it('affiche 2 décimales pour un taux normal', () => {
    expect(formatDropRate(12.3)).toBe('12.30%');
  });

  it('affiche 4 décimales pour un taux très petit (< 0.01%)', () => {
    expect(formatDropRate(0.0042)).toBe('0.0042%');
  });

  it('affiche 2 décimales pile au seuil de 0.01%', () => {
    expect(formatDropRate(0.01)).toBe('0.01%');
  });
});
