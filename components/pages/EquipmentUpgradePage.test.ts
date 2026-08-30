import { describe, it, expect, vi } from 'vitest';
import type { EquipmentDef } from '@/lib/game/items';

// Le contenu réel (EQUIPMENT_DEFS) garantit toujours un objet générique par
// slot/rareté, donc les branches "100% personnalisé" et "groupe vide" ne
// sont jamais atteintes avec les vraies données — on mocke getEquipmentGroup
// pour tester ces branches de representativeItem de façon isolée.
vi.mock('@/lib/game/items', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/game/items')>();
  return { ...actual, getEquipmentGroup: vi.fn() };
});

import { getEquipmentGroup } from '@/lib/game/items';
import { representativeItem } from './EquipmentUpgradePage';

const slot = 'helmet';
const rarity = 'C';

function makeItem(id: string, bonusFor?: EquipmentDef['bonusFor']): EquipmentDef {
  return { id, name: id, icon: '❔', color: '#fff', slot: 'helmet', rarity: 'C', dpsMultiplier: 1, description: '', bonusFor } as EquipmentDef;
}

describe('representativeItem', () => {
  it("retourne l'objet générique (sans bonusFor) quand le groupe en contient un", () => {
    const generic = makeItem('generic');
    const personalized = makeItem('perso', { templateId: 'x', multiplier: 2, description: '' });
    vi.mocked(getEquipmentGroup).mockReturnValue([personalized, generic]);
    expect(representativeItem(slot as any, rarity as any)).toBe(generic);
  });

  it("retourne le premier objet personnalisé quand le groupe n'a que des objets liés à un perso", () => {
    const perso1 = makeItem('p1', { templateId: 'x', multiplier: 2, description: '' });
    const perso2 = makeItem('p2', { templateId: 'y', multiplier: 2, description: '' });
    vi.mocked(getEquipmentGroup).mockReturnValue([perso1, perso2]);
    expect(representativeItem(slot as any, rarity as any)).toBe(perso1);
  });

  it('retourne null quand le groupe slot/rareté est vide', () => {
    vi.mocked(getEquipmentGroup).mockReturnValue([]);
    expect(representativeItem(slot as any, rarity as any)).toBeNull();
  });
});
