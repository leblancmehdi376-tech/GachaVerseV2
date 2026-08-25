import { describe, it, expect } from 'vitest';
import { getPalierConfig, PALIERS } from './paliers';

describe('getPalierConfig', () => {
  it('renvoie la config exacte pour un palier dans la plage définie', () => {
    expect(getPalierConfig(1)).toBe(PALIERS[0]);
    expect(getPalierConfig(PALIERS.length)).toBe(PALIERS[PALIERS.length - 1]);
  });

  it('boucle sur les paliers précédents au-delà du dernier palier défini', () => {
    expect(getPalierConfig(PALIERS.length + 1)).toBe(PALIERS[0]);
    expect(getPalierConfig(PALIERS.length * 2)).toBe(PALIERS[PALIERS.length - 1]);
  });

  it('chaque palier a un id unique et croissant', () => {
    const ids = PALIERS.map(p => p.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
