import { describe, it, expect } from 'vitest';
import { DEFAULT_EQUIP_FILTERS as F, EQUIPMENT_LIST, equipBonusTargets, equipRarity, matchesEquipmentFilters } from './CompadexEquipment';
import { COLLECTION_RARITY_ORDER } from '@/lib/game/collectionFilters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';

// Basé sur le vrai contenu (EQUIPMENT_DEFS), sans id codé en dur — cf. CollectionPage.test.ts.
const generic = EQUIPMENT_LIST.find(i => !i.bonusFor)!;
const perso = EQUIPMENT_LIST.find(i => i.bonusFor)!;

describe('EQUIPMENT_LIST', () => {
  it('contient tous les équipements, triés du plus rare au plus commun', () => {
    expect(EQUIPMENT_LIST).toHaveLength(Object.keys(EQUIPMENT_DEFS).length);
    const ranks = EQUIPMENT_LIST.map(i => COLLECTION_RARITY_ORDER.indexOf(equipRarity(i)));
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
  });

  it('chaque rareté est une rareté connue', () => {
    for (const item of EQUIPMENT_LIST) expect(item.rarity).toBe(equipRarity(item));
  });
});

describe('equipBonusTargets', () => {
  it('donne le nom du personnage ciblé, pas son id', () => {
    const names = equipBonusTargets(perso);
    expect(names.length).toBeGreaterThan(0);
    const ids = ([] as string[]).concat(perso.bonusFor!.templateId);
    expect(names.some(n => !ids.includes(n))).toBe(true);
  });

  it('vide pour un objet générique', () => {
    expect(equipBonusTargets(generic)).toEqual([]);
  });
});

describe('matchesEquipmentFilters', () => {
  it("statut 'owned' / 'missing' se base sur le Compadex (seen)", () => {
    expect(matchesEquipmentFilters(generic, true, { ...F, status: 'owned' })).toBe(true);
    expect(matchesEquipmentFilters(generic, false, { ...F, status: 'owned' })).toBe(false);
    expect(matchesEquipmentFilters(generic, true, { ...F, status: 'missing' })).toBe(false);
    expect(matchesEquipmentFilters(generic, false, { ...F, status: 'missing' })).toBe(true);
  });

  it('filtre par emplacement et par rareté', () => {
    expect(matchesEquipmentFilters(generic, false, { ...F, slot: generic.slot })).toBe(true);
    expect(matchesEquipmentFilters(generic, false, { ...F, slot: generic.slot === 'weapon' ? 'helmet' : 'weapon' })).toBe(false);
    expect(matchesEquipmentFilters(generic, false, { ...F, rarity: equipRarity(generic) })).toBe(true);
    expect(matchesEquipmentFilters(generic, false, { ...F, rarity: equipRarity(generic) === 'T' ? 'C' : 'T' })).toBe(false);
  });

  it('« personnalisés » ne garde que les objets avec bonus perso', () => {
    expect(matchesEquipmentFilters(perso, false, { ...F, persoOnly: true })).toBe(true);
    expect(matchesEquipmentFilters(generic, false, { ...F, persoOnly: true })).toBe(false);
  });

  it('la recherche trouve un objet par son nom ou par le personnage ciblé, sans accents ni casse', () => {
    expect(matchesEquipmentFilters(perso, false, { ...F, search: perso.name.toUpperCase() })).toBe(true);
    expect(matchesEquipmentFilters(perso, false, { ...F, search: equipBonusTargets(perso)[0] })).toBe(true);
    expect(matchesEquipmentFilters(perso, false, { ...F, search: 'zzz-introuvable' })).toBe(false);
  });
});
