import { describe, it, expect } from 'vitest';
import { matchesCompadexFilters, compareCompadexEntries, type CollectionEntry } from './CollectionPage';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { DEFAULT_COLLECTION_FILTERS as F } from '@/lib/game/collectionFilters';
import type { OwnedCharacter } from '@/types/game';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL) sans coder en dur
// d'id précis, pour que ces tests restent stables si le contenu évolue —
// cf. convention de CompanionsPage.test.ts. Les filtres communs (rareté,
// univers, type, recherche, tri) sont testés dans lib/game/collectionFilters.test.ts.
const nonHeroes = CHARACTER_POOL.filter(c => !c.isHero && c.universe);
const tplA = nonHeroes[0];
const tplB = nonHeroes.find(c => c.universe !== tplA.universe && c.rarity !== tplA.rarity)!;

function makeOwned(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId: tplA.id, rank: 1, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
}

function makeEntry(tpl: typeof tplA, overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return { tpl, key: tpl.id, owned: null, seen: false, ...overrides };
}

describe('matchesCompadexFilters', () => {
  it("statut 'missing' exclut un personnage déjà vu (seen) et inclut un jamais vu", () => {
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: true }), { ...F, status: 'missing' })).toBe(false);
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: false }), { ...F, status: 'missing' })).toBe(true);
  });

  it("statut 'owned' se base sur le Compadex (seen), pas sur la possession actuelle", () => {
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: true, owned: null }), { ...F, status: 'owned' })).toBe(true);
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: false }), { ...F, status: 'owned' })).toBe(false);
  });

  it('sans statut, inclut aussi bien seen que non-seen', () => {
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: true }), F)).toBe(true);
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: false }), F)).toBe(true);
  });

  it('combine le statut avec les filtres communs (rareté)', () => {
    const entry = makeEntry(tplA, { seen: true });
    expect(matchesCompadexFilters(entry, { ...F, status: 'owned', rarity: tplA.rarity })).toBe(true);
    expect(matchesCompadexFilters(entry, { ...F, status: 'owned', rarity: tplB.rarity })).toBe(false);
  });
});

describe('compareCompadexEntries', () => {
  it('traite un personnage non possédé (owned: null) comme un DPS de zéro', () => {
    const owned = makeEntry(tplA, { owned: makeOwned({ templateId: tplA.id, level: 10 }) });
    const notOwned = makeEntry(tplB, { owned: null });
    expect(compareCompadexEntries(owned, notOwned, { ...F, sortKey: 'dps' })).toBeLessThan(0);
  });
});
