// Fusion d'équipement : calculs purs partagés par l'établi de la Forge
// (components/pages/EquipmentWorkbench.tsx) et le store (cascadeEquipment).
import { getEquipmentGroup } from '@/lib/game/items';
import { RARITY_ORDER_ASC, getEquipmentUpgradeCost, getNextRarity, type EquipmentSlot, type Rarity } from '@/types/game';

export interface RarityStock {
  rarity: Rarity;
  qty: number;        // total possédé (génériques + spéciaux)
  specialQty: number; // objets liés à un personnage (bonusFor)
  usable: number;     // objets que la fusion a le droit de consommer
}

// Stock d'un emplacement, rareté par rareté (ordre C → T). Avec
// protectSpecials, les objets spéciaux ne comptent pas dans `usable`.
export function getSlotStock(inventory: Record<string, number>, slot: EquipmentSlot, protectSpecials: boolean): RarityStock[] {
  return RARITY_ORDER_ASC.map(rarity => {
    let qty = 0;
    let specialQty = 0;
    for (const item of getEquipmentGroup(slot, rarity)) {
      const n = inventory[item.id] ?? 0;
      qty += n;
      if (item.bonusFor) specialQty += n;
    }
    return { rarity, qty, specialQty, usable: protectSpecials ? qty - specialQty : qty };
  });
}

// Une fusion vers `rarity + 1` n'est possible que si cette rareté est débloquée.
export function canFuseInto(rarity: Rarity, unlocked: readonly Rarity[]): boolean {
  const next = getNextRarity(rarity);
  return !!next && unlocked.includes(next);
}

// Nombre de fusions immédiatement possibles (sans cascade) sur un emplacement.
export function countSlotFusions(stock: RarityStock[], unlocked: readonly Rarity[]): number {
  return stock.reduce((sum, s) =>
    sum + (canFuseInto(s.rarity, unlocked) ? Math.floor(s.usable / getEquipmentUpgradeCost(s.rarity)) : 0), 0);
}

export interface CascadeStep { from: Rarity; to: Rarity; count: number }

// Simule une fusion en cascade : fusionne tout ce qui peut l'être, de la
// rareté la plus basse jusqu'à produire des objets de rareté `upTo`. Les
// objets créés à une étape alimentent l'étape suivante.
export function simulateCascade(stock: RarityStock[], unlocked: readonly Rarity[], upTo: Rarity): CascadeStep[] {
  const target = RARITY_ORDER_ASC.indexOf(upTo);
  const steps: CascadeStep[] = [];
  let carried = 0;
  for (let i = 0; i < target && i < stock.length; i++) {
    const from = stock[i].rarity;
    const available = stock[i].usable + carried;
    carried = 0;
    if (!canFuseInto(from, unlocked)) break;
    const count = Math.floor(available / getEquipmentUpgradeCost(from));
    if (count > 0) {
      steps.push({ from, to: RARITY_ORDER_ASC[i + 1], count });
      carried = count;
    }
  }
  return steps;
}

// Raretés proposées comme cible de cascade : celles qu'une fusion peut
// produire (débloquées, au-dessus de Commun).
export function cascadeTargets(unlocked: readonly Rarity[]): Rarity[] {
  return RARITY_ORDER_ASC.filter((r, i) => i > 0 && unlocked.includes(r));
}
