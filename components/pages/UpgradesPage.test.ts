import { describe, it, expect } from 'vitest';
import { levelBarProgress } from './UpgradesPage';

describe('levelBarProgress', () => {
  it('au niveau 0, vise le palier 100 avec 0% de progression', () => {
    expect(levelBarProgress(0)).toEqual({ pct: 0, nextTier: 100 });
  });

  it('à mi-palier, calcule 50% de progression vers le même palier', () => {
    expect(levelBarProgress(50)).toEqual({ pct: 50, nextTier: 100 });
  });

  it("juste avant un palier de 100, vise le palier suivant", () => {
    expect(levelBarProgress(99)).toEqual({ pct: 99, nextTier: 100 });
  });

  it('pile sur un multiple de 100, repart à 0% vers le palier suivant', () => {
    expect(levelBarProgress(100)).toEqual({ pct: 0, nextTier: 200 });
  });

  it('fonctionne au-delà du premier millier de niveaux', () => {
    expect(levelBarProgress(1250)).toEqual({ pct: 50, nextTier: 1300 });
  });
});
