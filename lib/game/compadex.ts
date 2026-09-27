import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';

const CHARACTER_IDS = new Set(CHARACTER_POOL.map(c => c.id));

// Nombre d'entrées `seen` qui existent ENCORE dans le jeu. Les maps
// compadex*Seen ne font que grossir (voir hooks/useCompadexTracker.ts) : un
// personnage/équipement renommé ou retiré y reste pour toujours — le compter
// ferait atteindre le total (et débloquer les succès 100%) sans avoir tout
// obtenu parmi ce qui existe aujourd'hui.
export function countSeenCharacters(compadexCharactersSeen: Record<string, true>): number {
  let n = 0;
  for (const id of Object.keys(compadexCharactersSeen)) if (CHARACTER_IDS.has(id)) n++;
  return n;
}

export function countSeenEquipment(compadexEquipmentSeen: Record<string, true>): number {
  let n = 0;
  for (const id of Object.keys(compadexEquipmentSeen)) if (id in EQUIPMENT_DEFS) n++;
  return n;
}

// Progression combinée du Compadex (personnages + équipements), affichée dans
// la sidebar. `seen` est indexé par templateId/itemId uniquement — obtenir une
// édition Or/Diamant d'un personnage déjà vu en Base ne fait donc PAS avancer
// le compteur (voir hooks/useCompadexTracker.ts, qui écrit `owned.templateId`).
export function getCompadexProgress(
  compadexCharactersSeen: Record<string, true>,
  compadexEquipmentSeen: Record<string, true>,
): { count: number; total: number } {
  const count = countSeenCharacters(compadexCharactersSeen) + countSeenEquipment(compadexEquipmentSeen);
  const total = CHARACTER_POOL.length + Object.keys(EQUIPMENT_DEFS).length;
  return { count, total };
}
