import { describe, it, expect } from 'vitest';
import {
  getEquipScore,
  hasEquippedItems,
} from './CompanionsPage';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import type { OwnedCharacter } from '@/types/game';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL / EQUIPMENT_DEFS)
// sans coder en dur d'id précis, pour que ces tests restent stables si le
// contenu évolue — cf. convention de lib/game/dpsCalculation.test.ts.
const nonHeroes = CHARACTER_POOL.filter(c => !c.isHero && c.universe);
const tplA = nonHeroes[0];

const equipmentWithBonus = Object.values(EQUIPMENT_DEFS).find(e => e.bonusFor)!;
const equipmentWithoutBonus = Object.values(EQUIPMENT_DEFS).find(e => !e.bonusFor)!;

function makeOwned(templateId: string, overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
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
