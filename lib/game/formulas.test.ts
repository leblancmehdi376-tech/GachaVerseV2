import { describe, it, expect } from 'vitest';
import { calcCharDps, levelUpCost, heroLevelUpCost, evoCost, evoStoneCost, canEvolve, canEvolveHero } from './formulas';
import type { CharacterTemplate, OwnedCharacter, EvoForm, HeroState } from '@/types/game';

function makeTemplate(overrides: Partial<CharacterTemplate> = {}): CharacterTemplate {
  return {
    id: 'test_char', name: 'Test', rarity: 'C', baseDps: 10,
    spritePath: '/x.png', description: 'x',
    ...overrides,
  };
}

function makeOwned(overrides: Partial<OwnedCharacter> = {}): OwnedCharacter {
  return { templateId: 'test_char', rank: 1, copies: 0, level: 1, currentForm: 0, xp: 0, ...overrides };
}

describe('calcCharDps', () => {
  it('renvoie le baseDps au niveau 1, forme 1, rang 1, édition de base', () => {
    const tpl = makeTemplate({ baseDps: 10 });
    const owned = makeOwned({ level: 1 });
    expect(calcCharDps(tpl, owned)).toBe(10);
  });

  it('croît strictement avec le niveau', () => {
    const tpl = makeTemplate({ baseDps: 10 });
    const dpsAt1  = calcCharDps(tpl, makeOwned({ level: 1 }));
    const dpsAt50 = calcCharDps(tpl, makeOwned({ level: 50 }));
    const dpsAt200 = calcCharDps(tpl, makeOwned({ level: 200 }));
    expect(dpsAt50).toBeGreaterThan(dpsAt1);
    expect(dpsAt200).toBeGreaterThan(dpsAt50);
  });

  it('garantit au moins +1 DPS par niveau même quand la courbe exponentielle est encore plate', () => {
    const tpl = makeTemplate({ baseDps: 1 });
    const dpsAt1 = calcCharDps(tpl, makeOwned({ level: 1 }));
    const dpsAt2 = calcCharDps(tpl, makeOwned({ level: 2 }));
    expect(dpsAt2).toBeGreaterThanOrEqual(dpsAt1 + 1);
  });

  it('le multiplicateur de forme augmente le DPS proportionnellement à la position de la forme', () => {
    const tpl = makeTemplate({ baseDps: 10 });
    const form0 = calcCharDps(tpl, makeOwned({ level: 1, currentForm: 0 }));
    const form1 = calcCharDps(tpl, makeOwned({ level: 1, currentForm: 1 }));
    expect(form1).toBe(form0 * 2); // formMult = currentForm + 1
  });

  it('une rareté plus élevée donne un DPS plus élevé, toutes choses égales par ailleurs', () => {
    const low  = calcCharDps(makeTemplate({ rarity: 'C', baseDps: 10 }), makeOwned({ level: 100 }));
    const high = calcCharDps(makeTemplate({ rarity: 'T', baseDps: 10 }), makeOwned({ level: 100 }));
    expect(high).toBeGreaterThan(low);
  });

  it("l'édition (or/diamant) multiplie le DPS", () => {
    const base    = calcCharDps(makeTemplate({ baseDps: 10 }), makeOwned({ level: 10, edition: 'base' }));
    const gold    = calcCharDps(makeTemplate({ baseDps: 10 }), makeOwned({ level: 10, edition: 'gold' }));
    const diamond = calcCharDps(makeTemplate({ baseDps: 10 }), makeOwned({ level: 10, edition: 'diamond' }));
    expect(gold).toBeGreaterThan(base);
    expect(diamond).toBeGreaterThan(gold);
  });
});

describe('levelUpCost / heroLevelUpCost', () => {
  it('le coût de niveau croît avec le niveau', () => {
    expect(levelUpCost(10)).toBeGreaterThan(levelUpCost(1));
    expect(levelUpCost(100)).toBeGreaterThan(levelUpCost(10));
  });

  it('le coût de niveau du héros croît plus vite que celui des personnages', () => {
    const charGrowth = levelUpCost(50) / levelUpCost(1);
    const heroGrowth = heroLevelUpCost(50) / heroLevelUpCost(1);
    expect(heroGrowth).toBeGreaterThan(charGrowth);
  });
});

describe('evoCost', () => {
  it('une rareté plus haute coûte plus cher à évoluer', () => {
    expect(evoCost('T', 0)).toBeGreaterThan(evoCost('C', 0));
  });

  it('le coût triple à chaque forme suivante', () => {
    expect(evoCost('C', 1)).toBe(evoCost('C', 0) * 3);
    expect(evoCost('C', 2)).toBe(evoCost('C', 0) * 9);
  });
});

describe('evoStoneCost', () => {
  it('une rareté plus haute coûte plus de pierres', () => {
    expect(evoStoneCost('T', 0)).toBeGreaterThan(evoStoneCost('C', 0));
  });

  it('coûte plus cher à mesure que la forme actuelle avance', () => {
    expect(evoStoneCost('L', 1)).toBeGreaterThan(evoStoneCost('L', 0));
  });
});

describe('canEvolve', () => {
  const forms: EvoForm[] = [
    { formId: 'f0', name: 'Base',  spritePath: '/a.png', dpsFormMult: 1, description: '' },
    { formId: 'f1', name: 'Evo 1', spritePath: '/b.png', dpsFormMult: 2, description: '' },
  ];

  it('refuse si le personnage n\'a pas de formes', () => {
    const tpl = makeTemplate({ forms: undefined });
    expect(canEvolve(tpl, makeOwned())).toBe(false);
  });

  it('refuse si déjà à la dernière forme', () => {
    const tpl = makeTemplate({ forms });
    expect(canEvolve(tpl, makeOwned({ currentForm: 1 }))).toBe(false);
  });

  it('refuse si pas assez de pierres d\'évolution', () => {
    const tpl = makeTemplate({ forms, rarity: 'C' });
    const needed = evoStoneCost('C', 0);
    expect(canEvolve(tpl, makeOwned({ currentForm: 0 }), {}, { pierre_evolution: needed - 1 })).toBe(false);
  });

  it('autorise si assez de pierres d\'évolution', () => {
    const tpl = makeTemplate({ forms, rarity: 'C' });
    const needed = evoStoneCost('C', 0);
    expect(canEvolve(tpl, makeOwned({ currentForm: 0 }), {}, { pierre_evolution: needed })).toBe(true);
  });

  it('refuse si un objet requis par la forme suivante manque', () => {
    const formsWithReq: EvoForm[] = [
      forms[0],
      { ...forms[1], requiredItemIds: ['item_x'] },
    ];
    const tpl = makeTemplate({ forms: formsWithReq, rarity: 'C' });
    const needed = evoStoneCost('C', 0);
    expect(canEvolve(tpl, makeOwned({ currentForm: 0 }), { item_x: 0 }, { pierre_evolution: needed })).toBe(false);
    expect(canEvolve(tpl, makeOwned({ currentForm: 0 }), { item_x: 1 }, { pierre_evolution: needed })).toBe(true);
  });

  it('un perso noEvoStones ignore le coût en pierres', () => {
    const tpl = makeTemplate({ forms, rarity: 'T', noEvoStones: true });
    expect(canEvolve(tpl, makeOwned({ currentForm: 0 }), {}, {})).toBe(true);
  });
});

describe('canEvolveHero', () => {
  it('refuse si pas de formes', () => {
    expect(canEvolveHero([], { level: 1, currentForm: 0, xp: 0 })).toBe(false);
  });

  it('autorise si la forme actuelle n\'est pas la dernière', () => {
    const forms: EvoForm[] = [
      { formId: 'f0', name: 'Base',  spritePath: '/a.png', dpsFormMult: 1, description: '' },
      { formId: 'f1', name: 'Evo 1', spritePath: '/b.png', dpsFormMult: 2, description: '' },
    ];
    const hero: HeroState = { level: 1, currentForm: 0, xp: 0 };
    expect(canEvolveHero(forms, hero)).toBe(true);
    expect(canEvolveHero(forms, { ...hero, currentForm: 1 })).toBe(false);
  });
});
