import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getEquipmentUpgradeCost } from '@/types/game';
import type { Rarity } from '@/types/game';

describe('equipmentSlice — coût de fusion dépendant de la rareté', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('refuse la fusion s\'il manque un seul objet par rapport au coût requis', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_common: 9 },
      unlockedEquipRarities: ['C', 'U'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'C');
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('10');
  });

  it('C→U coûte exactement 10 objets communs', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_common: 10 },
      unlockedEquipRarities: ['C', 'U'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'C');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().equipmentInventory.helmet_common ?? 0).toBe(0);
  });

  it('U→R coûte exactement 9 objets peu communs', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_uncommon: 9 },
      unlockedEquipRarities: ['C', 'U', 'R'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'U');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().equipmentInventory.helmet_uncommon ?? 0).toBe(0);
  });

  it('R→E coûte exactement 8 objets rares', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_rare: 8 },
      unlockedEquipRarities: ['C', 'U', 'R', 'E'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'R');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().equipmentInventory.helmet_rare ?? 0).toBe(0);
  });

  it('le coût atteint son plancher de 6 à partir de Mythique→Stellaire et ne descend pas plus bas', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_mythique: 6 },
      unlockedEquipRarities: ['C', 'U', 'R', 'E', 'L', 'M', 'S'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'M');
    expect(res.ok).toBe(true);
    expect(useGameStore.getState().equipmentInventory.helmet_mythique ?? 0).toBe(0);
  });

  it('refuse une fusion Stellaire→Cosmique avec seulement 5 objets (plancher = 6, pas 5)', () => {
    useGameStore.setState({
      equipmentInventory: { helmet_stellar: 5 },
      unlockedEquipRarities: ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO'],
    });
    const res = useGameStore.getState().upgradeEquipment('helmet', 'S');
    expect(res.ok).toBe(false);
  });

  it('le coût du store correspond toujours à getEquipmentUpgradeCost pour chaque rareté fusionnable', () => {
    const rarities: Rarity[] = ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P'];
    const idByRarity: Record<string, string> = {
      C: 'helmet_common', U: 'helmet_uncommon', R: 'helmet_rare', E: 'helmet_epic',
      L: 'helmet_legendary', M: 'helmet_mythique', S: 'helmet_stellar', CO: 'helmet_cosmic', P: 'helmet_primordial',
    };
    for (const rarity of rarities) {
      useGameStore.getState().resetGame();
      const cost = getEquipmentUpgradeCost(rarity);
      const id = idByRarity[rarity];
      useGameStore.setState({
        equipmentInventory: { [id]: cost },
        unlockedEquipRarities: [...rarities, 'T'],
      });
      const res = useGameStore.getState().upgradeEquipment('helmet', rarity);
      expect(res.ok).toBe(true);
      expect(useGameStore.getState().equipmentInventory[id] ?? 0).toBe(0);
    }
  });
});
