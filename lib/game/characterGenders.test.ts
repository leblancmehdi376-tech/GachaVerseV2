import { describe, it, expect } from 'vitest';
import { CHARACTER_POOL } from './characters';
import { CHARACTER_GENDERS } from './characterGenders';

describe('CHARACTER_GENDERS', () => {
  it('chaque personnage du roster a un genre', () => {
    const missing = CHARACTER_POOL.filter(c => !c.isHero && !(c.id in CHARACTER_GENDERS)).map(c => c.id);
    expect(missing).toEqual([]);
  });

  it("ne référence que des personnages existants", () => {
    const ids = new Set(CHARACTER_POOL.map(c => c.id));
    expect(Object.keys(CHARACTER_GENDERS).filter(id => !ids.has(id))).toEqual([]);
  });
});
