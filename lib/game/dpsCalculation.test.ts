import { describe, it, expect } from 'vitest';
import { calculateEquippedTeamDps, calculateCharacterEquippedDps, getEquipmentMultiplier } from './dpsCalculation';
import { CHARACTER_POOL } from './characters';
import type { OwnedCharacter } from '@/types/game';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL) sans coder en dur
// d'id précis, pour que ces tests restent stables si le contenu évolue.
// equippedTeam contient des clés d'instance (= templateId ici, édition de base)
// qui servent aussi de clé dans `collection` — cf. calculateEquippedTeamDps.
const nonHeroes = CHARACTER_POOL.filter(c => !c.isHero);
const sampleTpl = nonHeroes[0];
const sampleTpl2 = nonHeroes[1];

function makeOwned(templateId: string, overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId, rank: 1, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
}

describe('getEquipmentMultiplier', () => {
  it('vaut 1 sans personnage ou template', () => {
    expect(getEquipmentMultiplier(undefined, null)).toBe(1);
  });

  it('vaut 1 pour un personnage sans équipement', () => {
    expect(getEquipmentMultiplier(makeOwned(sampleTpl.id), sampleTpl)).toBe(1);
  });
});

describe('calculateCharacterEquippedDps', () => {
  it('renvoie 0 si le templateId ne correspond à aucun personnage connu', () => {
    const owned = makeOwned('ne_existe_pas_xyz');
    expect(calculateCharacterEquippedDps(owned.templateId, owned, [])).toBe(0);
  });

  it('renvoie un DPS positif pour un personnage valide', () => {
    const owned = makeOwned(sampleTpl.id, { level: 10 });
    const dps = calculateCharacterEquippedDps(sampleTpl.id, owned, []);
    expect(dps).toBeGreaterThan(0);
  });
});

describe('calculateEquippedTeamDps', () => {
  it('vaut 0 pour une équipe vide', () => {
    expect(calculateEquippedTeamDps([null, null, null], {})).toBe(0);
  });

  it('ignore les emplacements vides et les personnages absents de la collection', () => {
    const collection = { [sampleTpl.id]: makeOwned(sampleTpl.id, { level: 5 }) };
    const dps = calculateEquippedTeamDps([sampleTpl.id, null, 'inconnu_dans_collection'], collection);
    expect(dps).toBeGreaterThan(0);
  });

  it("le DPS total croît quand on ajoute un deuxième personnage à l'équipe", () => {
    const collection = {
      [sampleTpl.id]:  makeOwned(sampleTpl.id,  { level: 10 }),
      [sampleTpl2.id]: makeOwned(sampleTpl2.id, { level: 10 }),
    };
    const oneChar  = calculateEquippedTeamDps([sampleTpl.id, null], collection);
    const twoChars = calculateEquippedTeamDps([sampleTpl.id, sampleTpl2.id], collection);
    expect(twoChars).toBeGreaterThan(oneChar);
  });
});
