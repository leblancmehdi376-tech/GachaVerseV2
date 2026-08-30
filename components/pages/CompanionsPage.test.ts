import { describe, it, expect } from 'vitest';
import {
  RARITY_PRIORITY,
  getEquipScore,
  hasEquippedItems,
  matchesCollectionFilters,
  compareCollectionEntries,
} from './CompanionsPage';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import { getAffinityForId } from '@/lib/game/affinities';
import type { OwnedCharacter } from '@/types/game';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL / EQUIPMENT_DEFS)
// sans coder en dur d'id précis, pour que ces tests restent stables si le
// contenu évolue — cf. convention de lib/game/dpsCalculation.test.ts.
const nonHeroes = CHARACTER_POOL.filter(c => !c.isHero && c.universe);
const tplA = nonHeroes[0];
const tplB = nonHeroes.find(c => c.universe !== tplA.universe && c.rarity !== tplA.rarity)!;

const equipmentWithBonus = Object.values(EQUIPMENT_DEFS).find(e => e.bonusFor)!;
const equipmentWithoutBonus = Object.values(EQUIPMENT_DEFS).find(e => !e.bonusFor)!;

function makeOwned(templateId: string, overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId, rank: 1, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
}

describe('getEquipScore', () => {
  it('vaut le dpsMultiplier de base pour un équipement sans bonus personnage', () => {
    expect(getEquipScore(equipmentWithoutBonus, tplA.id)).toBe(equipmentWithoutBonus.dpsMultiplier);
  });

  it("applique le bonus perso quand l'équipement cible ce personnage", () => {
    const targetId = Array.isArray(equipmentWithBonus.bonusFor!.templateId)
      ? equipmentWithBonus.bonusFor!.templateId[0]
      : equipmentWithBonus.bonusFor!.templateId;
    const score = getEquipScore(equipmentWithBonus, targetId);
    expect(score).toBeCloseTo(equipmentWithBonus.dpsMultiplier * equipmentWithBonus.bonusFor!.multiplier);
  });

  it("n'applique pas le bonus perso pour un autre personnage que la cible", () => {
    const score = getEquipScore(equipmentWithBonus, 'un_perso_qui_nest_pas_la_cible');
    expect(score).toBe(equipmentWithBonus.dpsMultiplier);
  });
});

describe('hasEquippedItems', () => {
  it("vaut false quand equippedItems est absent", () => {
    expect(hasEquippedItems(makeOwned(tplA.id))).toBe(false);
  });

  it('vaut false quand tous les slots sont null', () => {
    const owned = makeOwned(tplA.id, { equippedItems: { helmet: null, chest: null, pants: null, boots: null, weapon: null } });
    expect(hasEquippedItems(owned)).toBe(false);
  });

  it('vaut true dès qu’un slot a un objet équipé', () => {
    const owned = makeOwned(tplA.id, { equippedItems: { helmet: 'helmet_common', chest: null, pants: null, boots: null, weapon: null } });
    expect(hasEquippedItems(owned)).toBe(true);
  });
});

describe('matchesCollectionFilters', () => {
  it("filter 'missing' exclut toujours, même si univers/affinité correspondent", () => {
    expect(matchesCollectionFilters(tplA, 'missing', 'all', 'all')).toBe(false);
  });

  it("filter 'all' et 'owned' se comportent de façon identique (seuls univers/affinité s'appliquent)", () => {
    expect(matchesCollectionFilters(tplA, 'all', 'all', 'all')).toBe(true);
    expect(matchesCollectionFilters(tplA, 'owned', 'all', 'all')).toBe(true);
  });

  it('exclut un personnage dont l’univers ne correspond pas au filtre univers', () => {
    expect(matchesCollectionFilters(tplA, 'all', tplB.universe!, 'all')).toBe(false);
    expect(matchesCollectionFilters(tplA, 'all', tplA.universe!, 'all')).toBe(true);
  });

  it('exclut un personnage dont l’affinité ne correspond pas au filtre affinité', () => {
    const otherAffinity = getAffinityForId(tplA.id) === getAffinityForId(tplB.id) ? undefined : getAffinityForId(tplB.id);
    if (otherAffinity) {
      expect(matchesCollectionFilters(tplA, 'all', 'all', otherAffinity)).toBe(false);
    }
    expect(matchesCollectionFilters(tplA, 'all', 'all', getAffinityForId(tplA.id))).toBe(true);
  });

  it('filtre par rareté exacte quand filter est un code de rareté', () => {
    expect(matchesCollectionFilters(tplA, tplA.rarity, 'all', 'all')).toBe(true);
    expect(matchesCollectionFilters(tplA, tplB.rarity, 'all', 'all')).toBe(false);
  });
});

describe('compareCollectionEntries', () => {
  const rarer = RARITY_PRIORITY[tplA.rarity] < RARITY_PRIORITY[tplB.rarity] ? tplA : tplB;
  const commoner = rarer === tplA ? tplB : tplA;
  const entryA: [string, OwnedCharacter] = ['a', makeOwned(rarer.id)];
  const entryB: [string, OwnedCharacter] = ['b', makeOwned(commoner.id)];

  it("sort 'rarity' place le personnage le plus rare en premier", () => {
    expect(compareCollectionEntries(entryA, entryB, 'rarity')).toBeLessThan(0);
    expect(compareCollectionEntries(entryB, entryA, 'rarity')).toBeGreaterThan(0);
  });

  it("sort 'name' trie par ordre alphabétique", () => {
    const [nameFirst, nameSecond] = [tplA, tplB].sort((x, y) => x.name.localeCompare(y.name));
    const first: [string, OwnedCharacter] = ['a', makeOwned(nameFirst.id)];
    const second: [string, OwnedCharacter] = ['b', makeOwned(nameSecond.id)];
    expect(compareCollectionEntries(first, second, 'name')).toBeLessThanOrEqual(0);
  });

  it("sort 'dps_desc' et 'dps_asc' sont inverses l'un de l'autre", () => {
    const high = makeOwned(tplA.id, { level: 50 });
    const low = makeOwned(tplB.id, { level: 1 });
    const highEntry: [string, OwnedCharacter] = ['a', high];
    const lowEntry: [string, OwnedCharacter] = ['b', low];
    const desc = compareCollectionEntries(highEntry, lowEntry, 'dps_desc');
    const asc = compareCollectionEntries(highEntry, lowEntry, 'dps_asc');
    expect(Math.sign(desc)).toBe(-Math.sign(asc));
  });
});
