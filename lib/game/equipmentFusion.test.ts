import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getSlotStock, countSlotFusions, simulateCascade, cascadeTargets } from './equipmentFusion';
import type { Rarity } from '@/types/game';

const ALL_UP_TO_L: Rarity[] = ['C', 'U', 'R', 'E', 'L'];

describe('equipmentFusion — calculs purs', () => {
  it('getSlotStock sépare les objets spéciaux et les exclut de `usable` quand ils sont protégés', () => {
    const inv = { chest_cosmic: 4, chest_primordial_cid: 2 };
    const co = getSlotStock(inv, 'chest', true).find(s => s.rarity === 'CO')!;
    expect(co).toMatchObject({ qty: 6, specialQty: 2, usable: 4 });
    expect(getSlotStock(inv, 'chest', false).find(s => s.rarity === 'CO')!.usable).toBe(6);
  });

  it('countSlotFusions ignore les fusions vers une rareté verrouillée', () => {
    const stock = getSlotStock({ helmet_common: 34, helmet_uncommon: 12 }, 'helmet', true);
    expect(countSlotFusions(stock, ALL_UP_TO_L)).toBe(3 + 1);
    expect(countSlotFusions(stock, ['C', 'U'])).toBe(3);
    expect(countSlotFusions(stock, ['C'])).toBe(0);
  });

  it('simulateCascade réinjecte les objets créés dans l’étape suivante', () => {
    const stock = getSlotStock({ helmet_common: 34, helmet_uncommon: 12 }, 'helmet', true);
    // 34 C → 3 U ; 12 + 3 = 15 U → 1 R ; 1 R < 8 → stop.
    expect(simulateCascade(stock, ALL_UP_TO_L, 'L')).toEqual([
      { from: 'C', to: 'U', count: 3 },
      { from: 'U', to: 'R', count: 1 },
    ]);
    // S'arrête à la rareté cible.
    expect(simulateCascade(stock, ALL_UP_TO_L, 'U')).toEqual([{ from: 'C', to: 'U', count: 3 }]);
  });

  it('cascadeTargets propose les raretés débloquées au-dessus de Commun', () => {
    expect(cascadeTargets(['C', 'U', 'R'])).toEqual(['U', 'R']);
    expect(cascadeTargets(['C'])).toEqual([]);
  });
});

describe('equipmentSlice — cascade et protection des objets spéciaux', () => {
  beforeEach(() => { useGameStore.getState().resetGame(); });

  it('cascadeEquipment applique les mêmes étapes que la simulation', () => {
    useGameStore.setState({ equipmentInventory: { helmet_common: 34, helmet_uncommon: 12 }, unlockedEquipRarities: ALL_UP_TO_L });
    const steps = useGameStore.getState().cascadeEquipment('helmet', 'L', true);
    expect(steps).toEqual([
      { from: 'C', to: 'U', count: 3 },
      { from: 'U', to: 'R', count: 1 },
    ]);
    const inv = useGameStore.getState().equipmentInventory;
    expect(inv.helmet_common).toBe(4);
  });

  it('upgradeEquipment avec protection ne consomme jamais un objet spécial', () => {
    useGameStore.setState({
      equipmentInventory: { chest_cosmic: 4, chest_primordial_cid: 2 },
      unlockedEquipRarities: ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P'],
    });
    const res = useGameStore.getState().upgradeEquipment('chest', 'CO', 1, true);
    expect(res.ok).toBe(false);
    expect(useGameStore.getState().equipmentInventory.chest_primordial_cid).toBe(2);
  });

  it('upgradeEquipment sans protection peut compléter avec les objets spéciaux', () => {
    useGameStore.setState({
      equipmentInventory: { chest_cosmic: 4, chest_primordial_cid: 2 },
      unlockedEquipRarities: ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P'],
    });
    const res = useGameStore.getState().upgradeEquipment('chest', 'CO', 1, false);
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().equipmentInventory.chest_primordial_cid).toBe(0);
  });
});
