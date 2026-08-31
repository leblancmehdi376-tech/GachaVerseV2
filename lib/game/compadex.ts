import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';

// Progression combinée du Compadex (personnages + équipements), affichée dans
// la sidebar. `seen` est indexé par templateId/itemId uniquement — obtenir une
// édition Or/Diamant d'un personnage déjà vu en Base ne fait donc PAS avancer
// le compteur (voir hooks/useCompadexTracker.ts, qui écrit `owned.templateId`).
export function getCompadexProgress(
  compadexCharactersSeen: Record<string, true>,
  compadexEquipmentSeen: Record<string, true>,
): { count: number; total: number } {
  const count = Object.keys(compadexCharactersSeen).length + Object.keys(compadexEquipmentSeen).length;
  const total = CHARACTER_POOL.length + Object.keys(EQUIPMENT_DEFS).length;
  return { count, total };
}
