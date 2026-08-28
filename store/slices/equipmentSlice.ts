// Équipement : inventaire d'objets, équipement de personnages, fusion d'objets.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { defaultEquippedItems, getNextRarity, EquippedItems } from '@/types/game';
import {
  ITEM_DEFS, getEquipmentDef, getEquipmentGroup, pickEquipmentUpgradeOutput,
  getSpecialWeaponGroup, pickRandomSpecialWeapon, isSpecialWeaponFusionRarity, SPECIAL_WEAPON_FUSION_COST,
} from '@/lib/game/items';
import type { GameStore, EquipmentActions } from '../gameStore.types';
import { bnAdd, bnFromNumber } from '@/lib/game/bignum';

export const createEquipmentSlice: StateCreator<GameStore, [], [], EquipmentActions> = (set, get) => ({
  addItem: (itemId, qty = 1) => set(s => ({
    inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + qty },
  })),

  sellItem: (itemId, qty) => {
    const item = ITEM_DEFS[itemId];
    if (!item) return;
    const current = get().inventory[itemId] ?? 0;
    const toSell = Math.min(qty, current);
    if (toSell <= 0) return;
    const gained = (item.sellGems ?? 100) * toSell;
    set(s => ({
      inventory:  { ...s.inventory, [itemId]: s.inventory[itemId] - toSell },
      nekoGems:   s.nekoGems + gained,
    }));
  },
  addEquipment: (equipmentId, qty = 1) => set(s => ({
    equipmentInventory: { ...s.equipmentInventory, [equipmentId]: (s.equipmentInventory[equipmentId] ?? 0) + qty },
  })),
  recycleEquipment: (equipmentId, qty = 1) => {
    const def = getEquipmentDef(equipmentId);
    if (!def) return;
    set(s => {
      const current = s.equipmentInventory[equipmentId] ?? 0;
      if (current <= 0) return {};
      const removed = Math.min(current, qty);
      return {
        equipmentInventory: { ...s.equipmentInventory, [equipmentId]: current - removed },
        pixelCoins: bnAdd(s.pixelCoins, bnFromNumber(def.recycleValue * removed)),
      };
    });
  },
  unlockEquipRarity: (rarity) => set(s =>
    s.unlockedEquipRarities.includes(rarity) ? {} : { unlockedEquipRarities: [...s.unlockedEquipRarities, rarity] }
  ),
  unlockEquipDropRarity: (rarity) => set(s =>
    s.unlockedEquipDropRarities.includes(rarity) ? {} : { unlockedEquipDropRarities: [...s.unlockedEquipDropRarities, rarity] }
  ),
  upgradeEquipment: (slot, rarity) => {
    const nextRarity = getNextRarity(rarity);
    if (!nextRarity) return { ok: false, reason: 'Rareté maximale atteinte' };
    if (!get().unlockedEquipRarities.includes(nextRarity)) {
      return { ok: false, reason: 'Fusion non débloquée pour cette rareté' };
    }

    const fodderGroup = getEquipmentGroup(slot, rarity);
    const inv = get().equipmentInventory;
    const totalOwned = fodderGroup.reduce((sum, item) => sum + (inv[item.id] ?? 0), 0);
    if (totalOwned < 10) return { ok: false, reason: 'Pas assez d’objets (10 requis)' };

    const output = pickEquipmentUpgradeOutput(slot, nextRarity);
    if (!output) return { ok: false, reason: 'Aucun objet disponible à cette rareté' };

    set(s => {
      let toConsume = 10;
      const newInv = { ...s.equipmentInventory };
      for (const item of fodderGroup) {
        if (toConsume <= 0) break;
        const have = newInv[item.id] ?? 0;
        const take = Math.min(have, toConsume);
        newInv[item.id] = have - take;
        toConsume -= take;
      }
      newInv[output.id] = (newInv[output.id] ?? 0) + 1;
      return { equipmentInventory: newInv };
    });

    return { ok: true, resultId: output.id };
  },
  fuseSpecialWeapons: (rarity) => {
    if (!isSpecialWeaponFusionRarity(rarity)) {
      return { ok: false, reason: 'Fusion réservée aux armes Cosmiques et plus' };
    }

    const pool = getSpecialWeaponGroup(rarity);
    if (pool.length === 0) return { ok: false, reason: 'Aucune arme spéciale à cette rareté' };

    const inv = get().equipmentInventory;
    const totalOwned = pool.reduce((sum, item) => sum + (inv[item.id] ?? 0), 0);
    if (totalOwned < SPECIAL_WEAPON_FUSION_COST) {
      return { ok: false, reason: `Pas assez d’armes spéciales (${SPECIAL_WEAPON_FUSION_COST} requises)` };
    }

    const output = pickRandomSpecialWeapon(rarity);
    if (!output) return { ok: false, reason: 'Aucune arme disponible à cette rareté' };

    set(s => {
      let toConsume = SPECIAL_WEAPON_FUSION_COST;
      const newInv = { ...s.equipmentInventory };
      for (const item of pool) {
        if (toConsume <= 0) break;
        const have = newInv[item.id] ?? 0;
        const take = Math.min(have, toConsume);
        newInv[item.id] = have - take;
        toConsume -= take;
      }
      newInv[output.id] = (newInv[output.id] ?? 0) + 1;
      return { equipmentInventory: newInv };
    });

    return { ok: true, resultId: output.id };
  },
  equipItem: (templateId, slot, equipmentId) => {
    const owned = get().collection[templateId];
    const def = getEquipmentDef(equipmentId);
    if (!owned || !def || def.slot !== slot) return;
    const currentQty = get().equipmentInventory[equipmentId] ?? 0;
    if (currentQty <= 0) return;
    set(state => {
      const existing = state.collection[templateId];
      if (!existing) return {};
      const equipped = existing.equippedItems ?? defaultEquippedItems();
      if (equipped[slot] === equipmentId) return {};
      const previousId = equipped[slot];
      const newInventory = {
        ...state.equipmentInventory,
        [equipmentId]: currentQty - 1,
      };
      if (previousId) {
        newInventory[previousId] = (newInventory[previousId] ?? 0) + 1;
      }
      return {
        collection: {
          ...state.collection,
          [templateId]: {
            ...existing,
            equippedItems: { ...equipped, [slot]: equipmentId },
          },
        },
        equipmentInventory: newInventory,
      };
    });
  },
  unequipItem: (templateId, slot) => {
    const owned = get().collection[templateId];
    if (!owned || !owned.equippedItems) return;
    const equipped = owned.equippedItems as EquippedItems;
    const equipmentId = equipped[slot];
    if (!equipmentId) return;
    const nextOwned = {
      ...owned,
      equippedItems: { ...equipped, [slot]: null },
    };
    set(state => ({
      collection: {
        ...state.collection,
        [templateId]: nextOwned,
      },
      equipmentInventory: { ...state.equipmentInventory, [equipmentId]: (state.equipmentInventory[equipmentId] ?? 0) + 1 },
    }));
  },

  setLastEquipmentDrop: (id) => set(() => ({ lastEquipmentDrop: id })),
  focusExpedition: (id) => set(() => ({ focusedExpeditionId: id })),
});
