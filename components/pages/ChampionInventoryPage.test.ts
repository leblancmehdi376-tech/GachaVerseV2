import { describe, it, expect } from 'vitest';
import { groupChampionsByRarity } from './ChampionInventoryPage';
import { getVoidOrbsForRarity } from '@/lib/game/shop';

describe('groupChampionsByRarity', () => {
  it('retourne un tableau vide sans champion', () => {
    expect(groupChampionsByRarity([])).toEqual([]);
  });

  it('ignore les entrées sans template résolu', () => {
    expect(groupChampionsByRarity([{ qty: 3, tpl: null }])).toEqual([]);
  });

  it('regroupe les quantités et somme les orbes par rareté', () => {
    const groups = groupChampionsByRarity([
      { qty: 2, tpl: { rarity: 'C' } },
      { qty: 3, tpl: { rarity: 'C' } },
      { qty: 1, tpl: { rarity: 'U' } },
    ]);
    const cGroup = groups.find(g => g.rarity === 'C')!;
    const uGroup = groups.find(g => g.rarity === 'U')!;
    expect(cGroup.count).toBe(5);
    expect(cGroup.orbs).toBe(5 * getVoidOrbsForRarity('C'));
    expect(uGroup.count).toBe(1);
    expect(uGroup.orbs).toBe(1 * getVoidOrbsForRarity('U'));
  });

  it('ne crée pas de groupe pour une rareté absente des champions', () => {
    const groups = groupChampionsByRarity([{ qty: 1, tpl: { rarity: 'C' } }]);
    expect(groups.find(g => g.rarity === 'U')).toBeUndefined();
  });
});
