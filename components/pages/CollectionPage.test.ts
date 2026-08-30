import { describe, it, expect } from 'vitest';
import { matchesCompadexFilters, compareCompadexEntries, type CollectionEntry } from './CollectionPage';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { getAffinityForId } from '@/lib/game/affinities';
import type { OwnedCharacter } from '@/types/game';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL) sans coder en dur
// d'id précis, pour que ces tests restent stables si le contenu évolue —
// cf. convention de CompanionsPage.test.ts.
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
  it("filter 'missing' exclut un personnage déjà vu (seen), même si univers/affinité correspondent", () => {
    const entry = makeEntry(tplA, { seen: true });
    expect(matchesCompadexFilters(entry, 'missing', 'all', 'all')).toBe(false);
  });

  it("filter 'missing' inclut un personnage jamais vu (seen: false)", () => {
    const entry = makeEntry(tplA, { seen: false });
    expect(matchesCompadexFilters(entry, 'missing', 'all', 'all')).toBe(true);
  });

  it("filter 'owned' se base sur le Compadex (seen), pas sur la possession actuelle", () => {
    const entry = makeEntry(tplA, { seen: true, owned: null });
    expect(matchesCompadexFilters(entry, 'owned', 'all', 'all')).toBe(true);
  });

  it("filter 'all' inclut aussi bien seen que non-seen (seuls univers/affinité s'appliquent)", () => {
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: true }), 'all', 'all', 'all')).toBe(true);
    expect(matchesCompadexFilters(makeEntry(tplA, { seen: false }), 'all', 'all', 'all')).toBe(true);
  });

  it("exclut un personnage dont l'univers ne correspond pas au filtre univers", () => {
    const entry = makeEntry(tplA);
    expect(matchesCompadexFilters(entry, 'all', tplB.universe!, 'all')).toBe(false);
    expect(matchesCompadexFilters(entry, 'all', tplA.universe!, 'all')).toBe(true);
  });

  it("exclut un personnage dont l'affinité ne correspond pas au filtre affinité", () => {
    const entry = makeEntry(tplA);
    const otherAffinity = getAffinityForId(tplA.id) === getAffinityForId(tplB.id) ? undefined : getAffinityForId(tplB.id);
    if (otherAffinity) {
      expect(matchesCompadexFilters(entry, 'all', 'all', otherAffinity)).toBe(false);
    }
    expect(matchesCompadexFilters(entry, 'all', 'all', getAffinityForId(tplA.id))).toBe(true);
  });

  it('filtre par rareté exacte quand filter est un code de rareté', () => {
    const entry = makeEntry(tplA);
    expect(matchesCompadexFilters(entry, tplA.rarity, 'all', 'all')).toBe(true);
    expect(matchesCompadexFilters(entry, tplB.rarity, 'all', 'all')).toBe(false);
  });
});

describe('compareCompadexEntries', () => {
  it("sort 'rarity' place le personnage le plus rare en premier", () => {
    const rarer = ['T','P','CO','S','M','L','E','R','U','C'].indexOf(tplA.rarity) < ['T','P','CO','S','M','L','E','R','U','C'].indexOf(tplB.rarity) ? tplA : tplB;
    const commoner = rarer === tplA ? tplB : tplA;
    const entryRarer = makeEntry(rarer);
    const entryCommoner = makeEntry(commoner);
    expect(compareCompadexEntries(entryRarer, entryCommoner, 'rarity')).toBeLessThan(0);
    expect(compareCompadexEntries(entryCommoner, entryRarer, 'rarity')).toBeGreaterThan(0);
  });

  it("sort 'name' trie par ordre alphabétique", () => {
    const [nameFirst, nameSecond] = [tplA, tplB].sort((x, y) => x.name.localeCompare(y.name));
    expect(compareCompadexEntries(makeEntry(nameFirst), makeEntry(nameSecond), 'name')).toBeLessThanOrEqual(0);
  });

  it("sort 'dps_desc' et 'dps_asc' sont inverses l'un de l'autre", () => {
    const high = makeEntry(tplA, { owned: makeOwned({ templateId: tplA.id, level: 50 }) });
    const low  = makeEntry(tplB, { owned: makeOwned({ templateId: tplB.id, level: 1 }) });
    const desc = compareCompadexEntries(high, low, 'dps_desc');
    const asc  = compareCompadexEntries(high, low, 'dps_asc');
    expect(Math.sign(desc)).toBe(-Math.sign(asc));
  });

  it("sort 'dps_desc' traite un personnage non possédé (owned: null) comme un DPS de zéro", () => {
    const owned = makeEntry(tplA, { owned: makeOwned({ templateId: tplA.id, level: 10 }) });
    const notOwned = makeEntry(tplB, { owned: null });
    expect(compareCompadexEntries(owned, notOwned, 'dps_desc')).toBeLessThan(0);
  });
});
