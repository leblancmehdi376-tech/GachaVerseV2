import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COLLECTION_FILTERS as F, matchesCharacterFilters, compareCharacters, countActiveFilters, normalizeSearch,
} from './collectionFilters';
import { CHARACTER_POOL } from './characters';
import { getAffinityForId } from './affinities';
import type { OwnedCharacter } from '@/types/game';

// Vrai contenu du jeu, sans id codé en dur (cf. CompanionsPage.test.ts).
const nonHeroes = CHARACTER_POOL.filter(c => !c.isHero && c.universe);
const tplA = nonHeroes[0];
const tplB = nonHeroes.find(c => c.universe !== tplA.universe && c.rarity !== tplA.rarity)!;
const RANK = ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P', 'T'];

function owned(templateId: string, overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
}

describe('matchesCharacterFilters', () => {
  it('sans aucun filtre, tout passe', () => {
    expect(matchesCharacterFilters(tplA, F)).toBe(true);
  });

  it('filtre par rareté exacte', () => {
    expect(matchesCharacterFilters(tplA, { ...F, rarity: tplA.rarity })).toBe(true);
    expect(matchesCharacterFilters(tplA, { ...F, rarity: tplB.rarity })).toBe(false);
  });

  it('filtre par univers', () => {
    expect(matchesCharacterFilters(tplA, { ...F, universe: tplA.universe! })).toBe(true);
    expect(matchesCharacterFilters(tplA, { ...F, universe: tplB.universe! })).toBe(false);
  });

  it('filtre par type (affinité)', () => {
    expect(matchesCharacterFilters(tplA, { ...F, affinity: getAffinityForId(tplA.id) })).toBe(true);
    const other = getAffinityForId(tplB.id);
    if (other !== getAffinityForId(tplA.id)) {
      expect(matchesCharacterFilters(tplA, { ...F, affinity: other })).toBe(false);
    }
  });

  it("recherche insensible à la casse et aux accents, sur le nom ou l'univers", () => {
    expect(matchesCharacterFilters(tplA, { ...F, search: tplA.name.toUpperCase() })).toBe(true);
    expect(matchesCharacterFilters(tplA, { ...F, search: `  ${normalizeSearch(tplA.name)} ` })).toBe(true);
    expect(matchesCharacterFilters(tplA, { ...F, search: tplA.universe! })).toBe(true);
    expect(matchesCharacterFilters(tplA, { ...F, search: 'zzz-aucun-perso-zzz' })).toBe(false);
  });
});

describe('compareCharacters', () => {
  const rarer = RANK.indexOf(tplA.rarity) > RANK.indexOf(tplB.rarity) ? tplA : tplB;
  const commoner = rarer === tplA ? tplB : tplA;
  const R = { tpl: rarer, owned: null };
  const C = { tpl: commoner, owned: null };

  it("rareté : le plus rare d'abord, inversé sinon", () => {
    expect(compareCharacters(R, C, 'rarity', false)).toBeLessThan(0);
    expect(compareCharacters(R, C, 'rarity', true)).toBeGreaterThan(0);
  });

  it('nom : A→Z, inversé Z→A', () => {
    const [first, second] = [tplA, tplB].sort((x, y) => x.name.localeCompare(y.name));
    expect(compareCharacters({ tpl: first, owned: null }, { tpl: second, owned: null }, 'name', false)).toBeLessThanOrEqual(0);
    expect(compareCharacters({ tpl: first, owned: null }, { tpl: second, owned: null }, 'name', true)).toBeGreaterThanOrEqual(0);
  });

  it("DPS : le plus fort d'abord, non possédé = 0, inversion symétrique", () => {
    const strong = { tpl: tplA, owned: owned(tplA.id, { level: 50 }) };
    const none = { tpl: tplB, owned: null };
    expect(compareCharacters(strong, none, 'dps', false)).toBeLessThan(0);
    expect(compareCharacters(strong, none, 'dps', true)).toBeGreaterThan(0);
  });

  it("maîtrise : le plus maîtrisé d'abord, jamais joué = 0, inversion symétrique", () => {
    const mastery = { [tplA.id]: { k: 1_000_000, w: 1_000_000, lv: 1_000, f: 1_000 } };
    const A = { tpl: tplA, owned: null };
    const B = { tpl: tplB, owned: null };
    expect(compareCharacters(A, B, 'mastery', false, mastery)).toBeLessThan(0);
    expect(compareCharacters(A, B, 'mastery', true, mastery)).toBeGreaterThan(0);
  });
});

describe('countActiveFilters', () => {
  it("ne compte le statut que si la page l'affiche, jamais la recherche ni le tri", () => {
    const f = { ...F, status: 'owned' as const, rarity: tplA.rarity, search: 'x', sortKey: 'dps' as const };
    expect(countActiveFilters(f, true)).toBe(2);
    expect(countActiveFilters(f, false)).toBe(1);
  });
});
