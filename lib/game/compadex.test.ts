import { describe, it, expect } from 'vitest';
import { getCompadexProgress } from './compadex';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_DEFS } from '@/lib/game/items';

describe('getCompadexProgress', () => {
  it('retourne 0/total quand rien n\'a jamais été vu', () => {
    const { count, total } = getCompadexProgress({}, {});
    expect(count).toBe(0);
    expect(total).toBe(CHARACTER_POOL.length + Object.keys(EQUIPMENT_DEFS).length);
  });

  it('additionne personnages et équipements vus', () => {
    const charIds = CHARACTER_POOL.slice(0, 2).map(c => c.id);
    const equipIds = Object.keys(EQUIPMENT_DEFS).slice(0, 3);
    const seenChars = Object.fromEntries(charIds.map(id => [id, true as const]));
    const seenEquip = Object.fromEntries(equipIds.map(id => [id, true as const]));
    const { count } = getCompadexProgress(seenChars, seenEquip);
    expect(count).toBe(charIds.length + equipIds.length);
  });

  it("ne compte pas deux fois un personnage vu dans plusieurs éditions (indexé par templateId, pas par édition)", () => {
    // `compadexCharactersSeen` est une map indexée par templateId : obtenir la
    // version Or/Diamant d'un perso déjà vu écrit sous la MÊME clé, donc ne
    // peut pas faire progresser le compteur au-delà du nombre de templates.
    const tpl = CHARACTER_POOL[0];
    const { count } = getCompadexProgress({ [tpl.id]: true }, {});
    expect(count).toBe(1);
  });

  it('le total ne dépend pas de ce qui a été vu', () => {
    const allChars = Object.fromEntries(CHARACTER_POOL.map(c => [c.id, true as const]));
    const allEquip = Object.fromEntries(Object.keys(EQUIPMENT_DEFS).map(id => [id, true as const]));
    const { count, total } = getCompadexProgress(allChars, allEquip);
    expect(count).toBe(total);
  });
});
