// Crédits partagés par les événements (Grand Périple, Plinko Multiversel) :
// mêmes effets qu'une invocation ou qu'un coffre obtenus ailleurs dans le jeu.
import type { CardEdition } from '@/types/game';
import { rollEquipmentChest } from '@/lib/game/items';
import type { GameStore } from '../gameStore.types';

type Set = (fn: (s: GameStore) => Partial<GameStore>) => void;
type Get = () => GameStore;

export interface EventPull { templateId: string; edition: CardEdition }

/**
 * Ajoute des persos déjà tirés à la collection, comme pullSingle : quêtes
 * d'invocation, historique du gacha et Jeton d'Anomalie tous les 100 tirages.
 */
export function creditEventPulls(set: Set, get: Get, ids: string[]): EventPull[] {
  if (ids.length === 0) return [];
  const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
  get().recordGachaResults(ids, false);
  get().bumpQuestProgress('d_gacha', ids.length);
  get().bumpQuestProgress('w_gacha', ids.length);
  set(s => {
    const before = s.totalGachaPulls ?? 0;
    const total = before + ids.length;
    return { totalGachaPulls: total, anomalyTokens: s.anomalyTokens + Math.floor(total / 100) - Math.floor(before / 100) };
  });
  return results;
}

/** Ouvre `count` coffres d'équipement et renvoie les ids obtenus. */
export function creditEventChests(set: Set, tier: 'rare' | 'epic', count: number): string[] {
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    const itemId = rollEquipmentChest(tier);
    items.push(itemId);
    set(s => ({ equipmentInventory: { ...s.equipmentInventory, [itemId]: (s.equipmentInventory[itemId] ?? 0) + 1 } }));
  }
  return items;
}
