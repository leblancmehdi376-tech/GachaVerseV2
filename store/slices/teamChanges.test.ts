import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { defaultEquippedItems, type OwnedCharacter } from '@/types/game';
import { BOND_DUO_BONUS } from '@/lib/game/bonds';

function owned(templateId: string, equippedItems = defaultEquippedItems()): OwnedCharacter {
  return { templateId, copies: 1, level: 10, currentForm: 0, xp: 0, equippedItems };
}

describe("retrait de l'équipe — l'équipement retourne à l'inventaire", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      maxPalierReached: 40, runPeakPalier: 40,
      collection: {
        goku: owned('goku', { ...defaultEquippedItems(), helmet: 'helmet_common', weapon: 'weapon_common' }),
        vegeta: owned('vegeta'),
      },
      equipmentInventory: { helmet_common: 2 },
      equippedTeam: ['goku', null, null, null],
    });
  });

  it('unequipCharacter rend tout l\'équipement porté', () => {
    useGameStore.getState().unequipCharacter(0);
    const s = useGameStore.getState();
    expect(s.equippedTeam[0]).toBeNull();
    expect(s.collection.goku.equippedItems).toEqual(defaultEquippedItems());
    expect(s.equipmentInventory.helmet_common).toBe(3);
    expect(s.equipmentInventory.weapon_common).toBe(1);
  });

  it('remplacer un perso par un autre déséquipe le perso remplacé', () => {
    useGameStore.getState().equipCharacter('vegeta', 0);
    const s = useGameStore.getState();
    expect(s.equippedTeam[0]).toBe('vegeta');
    expect(s.collection.goku.equippedItems).toEqual(defaultEquippedItems());
    expect(s.equipmentInventory.helmet_common).toBe(3);
  });

  it("déplacer un perso d'un emplacement à l'autre garde son équipement", () => {
    useGameStore.getState().equipCharacter('goku', 2);
    const s = useGameStore.getState();
    expect(s.equippedTeam).toEqual([null, null, 'goku', null]);
    expect(s.collection.goku.equippedItems?.helmet).toBe('helmet_common');
    expect(s.equipmentInventory.helmet_common).toBe(2);
  });

  it("un retrait bloqué (ultime utilisé pendant le boss) ne touche pas à l'équipement", () => {
    useGameStore.setState({ bossActive: true, ultUsedThisFight: ['goku'] });
    useGameStore.getState().unequipCharacter(0);
    const s = useGameStore.getState();
    expect(s.equippedTeam[0]).toBe('goku');
    expect(s.collection.goku.equippedItems?.helmet).toBe('helmet_common');
  });
});

describe('Liens légendaires — découverte et DPS', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({
      maxPalierReached: 40, runPeakPalier: 40, suppressToasts: true,
      collection: { goku: owned('goku'), vegeta: owned('vegeta') },
      equippedTeam: ['goku', null, null, null],
    });
  });

  it('découvre un lien quand tous ses membres sont réunis, une seule fois', () => {
    useGameStore.getState().discoverActiveBonds();
    expect(useGameStore.getState().discoveredBonds).toEqual({});
    useGameStore.getState().equipCharacter('vegeta', 1);
    useGameStore.getState().discoverActiveBonds();
    const first = useGameStore.getState().discoveredBonds;
    expect(first).toEqual({ rivaux_eternels: true });
    useGameStore.getState().discoverActiveBonds();
    expect(useGameStore.getState().discoveredBonds).toBe(first);
  });

  it('applique le bonus du lien au DPS de chaque membre', () => {
    const solo = useGameStore.getState().getDpsBreakdown().chars.find(c => c.templateId === 'goku')!;
    expect(solo.bondMult).toBe(1);
    useGameStore.getState().equipCharacter('vegeta', 1);
    const duo = useGameStore.getState().getDpsBreakdown().chars;
    for (const c of duo) {
      expect(c.bondMult).toBeCloseTo(1 + BOND_DUO_BONUS / 100);
      expect(c.bonds.map(b => b.name)).toEqual(['Rivaux Éternels']);
    }
  });
});
