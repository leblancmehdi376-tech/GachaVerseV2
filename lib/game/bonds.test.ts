import { describe, it, expect } from 'vitest';
import { BANNER_POOL, GACHA_EXCLUDED_IDS, getCharacterById } from './characters';
import { BONDS, BOND_DUO_BONUS, BOND_TRIO_BONUS, BOND_QUATUOR_BONUS, computeActiveBonds, countDiscoveredBonds, getBondDpsMult } from './bonds';

describe('Liens légendaires — définitions', () => {
  it('ont des id uniques et des membres distincts, tous existants', () => {
    expect(new Set(BONDS.map(b => b.id)).size).toBe(BONDS.length);
    for (const b of BONDS) {
      expect(new Set(b.members).size).toBe(b.members.length);
      for (const id of b.members) expect(getCharacterById(id), `${b.id} → ${id}`).toBeDefined();
    }
  });

  it("chaque membre s'obtient (gacha, Forge ou raid) : tout lien est découvrable", () => {
    const obtainable = new Set([...BANNER_POOL.map(c => c.id), ...GACHA_EXCLUDED_IDS]);
    for (const b of BONDS) for (const id of b.members) expect(obtainable.has(id), `${b.id} → ${id}`).toBe(true);
  });

  it('tiennent dans une équipe de 4, avec le bonus de duo, de trio ou de quatuor', () => {
    const bonus: Record<number, number> = { 2: BOND_DUO_BONUS, 3: BOND_TRIO_BONUS, 4: BOND_QUATUOR_BONUS };
    for (const b of BONDS) {
      expect(b.members.length).toBeGreaterThanOrEqual(2);
      expect(b.members.length).toBeLessThanOrEqual(4);
      expect(b.dpsBonus).toBe(bonus[b.members.length]);
    }
  });
});

describe('computeActiveBonds / getBondDpsMult', () => {
  it("n'active un lien que si TOUS ses membres sont dans l'équipe", () => {
    expect(computeActiveBonds(['goku', null, null, null]).map(b => b.id)).toEqual([]);
    expect(computeActiveBonds(['goku', 'vegeta', null, null]).map(b => b.id)).toEqual(['rivaux_eternels']);
    expect(computeActiveBonds(['naruto', 'sasuke', null, 'goku']).map(b => b.id)).toEqual([]);
    expect(computeActiveBonds(['naruto', 'sasuke', 'sakura', 'goku']).map(b => b.id)).toEqual(['equipe_7']);
  });

  it('reconnaît les clés de collection composites (perso::édition)', () => {
    expect(computeActiveBonds(['goku::gold', 'vegeta', null, null]).map(b => b.id)).toEqual(['rivaux_eternels']);
  });

  it('applique le bonus aux seuls membres du lien', () => {
    const active = computeActiveBonds(['goku', 'vegeta', 'naruto', null]);
    expect(getBondDpsMult('goku', active)).toBeCloseTo(1 + BOND_DUO_BONUS / 100);
    expect(getBondDpsMult('vegeta', active)).toBeCloseTo(1 + BOND_DUO_BONUS / 100);
    expect(getBondDpsMult('naruto', active)).toBe(1);
  });

  it('countDiscoveredBonds ignore les liens qui n\'existent plus', () => {
    expect(countDiscoveredBonds({ rivaux_eternels: true, lien_supprime: true })).toBe(1);
  });
});

describe('Ceux qui restent (lien secret des Chill&Cool)', () => {
  it("demande les quatre Chill&Cool, et donne +20 % à chacun", () => {
    expect(computeActiveBonds(['nekoz', 'ouchuu', 'elfuzzion', null]).map(b => b.id)).toEqual([]);
    const active = computeActiveBonds(['nekoz', 'ouchuu', 'elfuzzion', 'rokoul_ayro']);
    expect(active.map(b => b.id)).toEqual(['ceux_qui_restent']);
    expect(getBondDpsMult('rokoul_ayro', active)).toBeCloseTo(1 + BOND_QUATUOR_BONUS / 100);
  });
});
