import { describe, it, expect } from 'vitest';
import {
  initialBonusLevels, calcPrestigeBonuses, calcTokensAwarded, coerceBonusLevels,
  getStoneMemoryCost, stoneMemoryCapPoints, stoneMemoryCapEdition, STONE_MEMORY_MAX_LEVEL, STONE_MEMORY_COSTS,
} from './prestige';

describe('calcPrestigeBonuses', () => {
  it('à niveau 0 partout, tous les multiplicateurs sont neutres', () => {
    const bonuses = calcPrestigeBonuses(initialBonusLevels());
    expect(bonuses.dpsMult).toBe(1);
    expect(bonuses.coinsMult).toBe(1);
    expect(bonuses.editionRateBonusPct).toBe(0);
    expect(bonuses.equipDropRateMult).toBe(1);
    expect(bonuses.tokenGainBonus).toBe(0);
  });

  it('Taux d\'édition : +2.5% relatifs par niveau', () => {
    const bonuses = calcPrestigeBonuses({ ...initialBonusLevels(), editionRate: 4 });
    expect(bonuses.editionRateBonusPct).toBeCloseTo(10, 10);
  });

  it('chaque niveau de bonus dps augmente le multiplicateur de DPS de 10%', () => {
    const bonuses = calcPrestigeBonuses({ ...initialBonusLevels(), dps: 3 });
    expect(bonuses.dpsMult).toBeCloseTo(1.3, 10);
  });
});

describe('coerceBonusLevels', () => {
  it('additionne les anciens Taux Shiny Or + Diamant dans Taux d\'édition (plafonné à 40)', () => {
    expect(coerceBonusLevels({ dps: 2, shinyGold: 5, shinyDiamond: 3 }).editionRate).toBe(8);
    expect(coerceBonusLevels({ shinyGold: 20, shinyDiamond: 25 }).editionRate).toBe(40);
  });

  it('garde editionRate tel quel une fois migré', () => {
    expect(coerceBonusLevels({ editionRate: 12, shinyGold: 20 }).editionRate).toBe(12);
  });
});

describe('calcTokensAwarded', () => {
  it('donne 1 jeton pile au palier 40 (seuil de prestige), avant bonus', () => {
    expect(calcTokensAwarded(40, 0)).toBe(1);
  });

  it('donne plus de jetons pour un palier atteint plus élevé', () => {
    expect(calcTokensAwarded(80, 0)).toBeGreaterThan(calcTokensAwarded(50, 0));
  });

  it('ajoute le bonus tokenGain au résultat', () => {
    expect(calcTokensAwarded(50, 5)).toBe(calcTokensAwarded(50, 0) + 5);
  });
});

describe('Mémoire des Pierres', () => {
  it('renvoie le coût du niveau suivant tant que le niveau max (7) n\'est pas atteint', () => {
    expect(STONE_MEMORY_MAX_LEVEL).toBe(7);
    expect(getStoneMemoryCost(0)).toBe(STONE_MEMORY_COSTS[0]);
    expect(getStoneMemoryCost(6)).toBe(10_000_000);
    expect(getStoneMemoryCost(STONE_MEMORY_MAX_LEVEL)).toBeNull();
  });

  it('plafond : aucune récupération au niveau 0, puis un palier d\'édition par niveau', () => {
    expect(stoneMemoryCapPoints(0)).toBe(0);
    expect(stoneMemoryCapEdition(1)).toBe('bronze');
    expect(stoneMemoryCapPoints(1)).toBe(2);
    expect(stoneMemoryCapEdition(4)).toBe('diamond');
    expect(stoneMemoryCapEdition(5)).toBe('ruby');
    expect(stoneMemoryCapEdition(7)).toBe('prismatic');
    expect(stoneMemoryCapPoints(7)).toBe(128);
  });
});
