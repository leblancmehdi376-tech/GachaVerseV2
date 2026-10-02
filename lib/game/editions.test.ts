import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EDITION_CONFIG, EDITION_ORDER, EDITION_MAX_POINTS,
  editionFromPoints, nextEdition, rollCardEdition, migrateEditionSave, migrateEditionFields,
} from './editions';
import { defaultEquippedItems, type OwnedCharacter } from '@/types/game';

const owned = (over: Partial<OwnedCharacter> = {}): OwnedCharacter => ({
  templateId: 'x', copies: 1, level: 1, currentForm: 0, xp: 0,
  equippedItems: defaultEquippedItems(), ...over,
});

describe('barème des éditions', () => {
  it('chaque palier vaut le double du précédent, jusqu’à 128', () => {
    EDITION_ORDER.forEach((ed, i) => expect(EDITION_CONFIG[ed].points).toBe(2 ** i));
    expect(EDITION_MAX_POINTS).toBe(128);
  });

  it('les taux de drop totalisent 100 %', () => {
    const total = EDITION_ORDER.reduce((s, ed) => s + EDITION_CONFIG[ed].dropChancePct, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('editionFromPoints renvoie le plus haut palier atteint', () => {
    expect(editionFromPoints(1)).toBe('base');
    expect(editionFromPoints(3)).toBe('bronze');
    expect(editionFromPoints(8)).toBe('emerald');   // 2 Bronzes + 4 Normales
    expect(editionFromPoints(13)).toBe('emerald');
    expect(editionFromPoints(128)).toBe('prismatic');
  });

  it('nextEdition s’arrête à Prismatique', () => {
    expect(nextEdition('base')).toBe('bronze');
    expect(nextEdition('prismatic')).toBeNull();
  });
});

describe('rollCardEdition', () => {
  afterEach(() => vi.restoreAllMocks());

  it('tire Prismatique tout en bas de la plage et Normale tout en haut', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollCardEdition()).toBe('prismatic');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(rollCardEdition()).toBe('base');
  });

  it('le bonus de Prestige élargit les chances des éditions', () => {
    // 5 % (Bronze) + 2 % (Or) + … ≈ 8 % sans bonus : 0.09 tombe sur Normale…
    vi.spyOn(Math, 'random').mockReturnValue(0.09);
    expect(rollCardEdition(0)).toBe('base');
    // … mais plus avec +100 % de taux.
    expect(rollCardEdition(100)).not.toBe('base');
  });
});

describe('migrateEditionSave', () => {
  it('ne fait rien sur une save déjà migrée', () => {
    expect(migrateEditionSave({
      collection: { a: owned({ templateId: 'a', editionPoints: 5, edition: 'bronze' }) },
      equippedTeam: ['a', null], equipmentInventory: {}
    })).toBeNull();
  });

  it('fusionne les éditions d’un perso : points additionnés, max de copies/niveau, ancien rang retiré', () => {
    const res = migrateEditionSave({
      collection: {
        a: { ...owned({ templateId: 'a', copies: 5, level: 40, xp: 12, edition: 'base' }), rank: 5 } as OwnedCharacter,
        'a::gold': owned({ templateId: 'a', copies: 2, level: 90, xp: 7, currentForm: 1, edition: 'gold' }),
      },
      equippedTeam: ['a::gold', 'a', null, null],
      equipmentInventory: {},
    })!;
    const a = res.collection.a;
    expect(Object.keys(res.collection)).toEqual(['a']);
    expect(a.editionPoints).toBe(5 + 2 * 4);
    expect(a.edition).toBe('emerald');
    expect(a.copies).toBe(5);
    expect(a.level).toBe(90);
    expect(a.xp).toBe(7);
    expect(a.currentForm).toBe(1);
    expect(res.equippedTeam).toEqual(['a', null, null, null]);
    expect('rank' in a).toBe(false);
  });

  it('remet dans l’inventaire les équipements des cartes fusionnées', () => {
    const res = migrateEditionSave({
      collection: {
        a: owned({ templateId: 'a', equippedItems: { ...defaultEquippedItems(), helmet: 'casque' } }),
        'a::diamond': owned({ templateId: 'a', edition: 'diamond', equippedItems: { ...defaultEquippedItems(), helmet: 'casque', weapon: 'epee' } }),
      },
      equippedTeam: [], equipmentInventory: { casque: 1 }
    })!;
    expect(res.equipmentInventory).toEqual({ casque: 3, epee: 1 });
    expect(Object.values(res.collection.a.equippedItems!).every(v => v === null)).toBe(true);
  });

  it('remplit la jauge d’une carte seule sans toucher à son équipement', () => {
    const res = migrateEditionSave({
      collection: { b: owned({ templateId: 'b', copies: 3, equippedItems: { ...defaultEquippedItems(), boots: 'bottes' } }) },
      equippedTeam: ['b'], equipmentInventory: {}
    })!;
    expect(res.collection.b.editionPoints).toBe(3);
    expect(res.collection.b.edition).toBe('bronze');
    expect(res.collection.b.equippedItems!.boots).toBe('bottes');
    expect(res.equipmentInventory).toEqual({});
  });

  it('une ancienne carte Diamant reste Diamant (16 points, sous Rubis)', () => {
    const res = migrateEditionSave({
      collection: { d: owned({ templateId: 'd' }), 'd::diamond': owned({ templateId: 'd', edition: 'diamond' }) },
      equippedTeam: [], equipmentInventory: {}
    })!;
    expect(res.collection.d.editionPoints).toBe(1 + 16);
    expect(res.collection.d.edition).toBe('diamond');
    expect(nextEdition('diamond')).toBe('ruby');
  });

  it('plafonne la jauge à Prismatique', () => {
    const res = migrateEditionSave({
      collection: { c: owned({ templateId: 'c', copies: 7, edition: 'obsidian' }) },
      equippedTeam: [], equipmentInventory: {}
    })!;
    expect(res.collection.c.editionPoints).toBe(128);
    expect(res.collection.c.edition).toBe('prismatic');
  });

  it('migrateEditionFields réécrit un état brut de sauvegarde', () => {
    const data: Record<string, unknown> = {
      collection: { a: owned({ templateId: 'a' }), 'a::gold': owned({ templateId: 'a', edition: 'gold' }) },
      equippedTeam: ['a::gold'],
    };
    migrateEditionFields(data);
    expect(Object.keys(data.collection as object)).toEqual(['a']);
    expect(data.equippedTeam).toEqual(['a']);
  });
});
