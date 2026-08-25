import { describe, it, expect } from 'vitest';
import {
  initialBonusLevels, calcPrestigeBonuses, calcTokensAwarded,
  getRankRecoveryCost, rankRecoveryCap, RANK_RECOVERY_MAX_LEVEL, RANK_RECOVERY_COSTS,
} from './prestige';

describe('calcPrestigeBonuses', () => {
  it('à niveau 0 partout, tous les multiplicateurs sont neutres', () => {
    const bonuses = calcPrestigeBonuses(initialBonusLevels());
    expect(bonuses.dpsMult).toBe(1);
    expect(bonuses.coinsMult).toBe(1);
    expect(bonuses.shinyGoldBonusPct).toBe(0);
    expect(bonuses.shinyDiamondBonusPct).toBe(0);
    expect(bonuses.equipDropRateMult).toBe(1);
    expect(bonuses.tokenGainBonus).toBe(0);
  });

  it('chaque niveau de bonus dps augmente le multiplicateur de DPS de 10%', () => {
    const bonuses = calcPrestigeBonuses({ ...initialBonusLevels(), dps: 3 });
    expect(bonuses.dpsMult).toBeCloseTo(1.3, 10);
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

describe('getRankRecoveryCost / rankRecoveryCap', () => {
  it('renvoie le coût du niveau suivant tant que le niveau max n\'est pas atteint', () => {
    expect(getRankRecoveryCost(0)).toBe(RANK_RECOVERY_COSTS[0]);
    expect(getRankRecoveryCost(RANK_RECOVERY_MAX_LEVEL - 1)).toBe(RANK_RECOVERY_COSTS[RANK_RECOVERY_MAX_LEVEL - 1]);
  });

  it('renvoie null une fois le niveau max atteint', () => {
    expect(getRankRecoveryCost(RANK_RECOVERY_MAX_LEVEL)).toBeNull();
  });

  it('rankRecoveryCap est 0 tant que le bonus n\'est pas acheté (niveau 0)', () => {
    expect(rankRecoveryCap(0)).toBe(0);
  });

  it('rankRecoveryCap vaut niveau + 1 une fois le bonus acheté', () => {
    expect(rankRecoveryCap(1)).toBe(2);
    expect(rankRecoveryCap(RANK_RECOVERY_MAX_LEVEL)).toBe(RANK_RECOVERY_MAX_LEVEL + 1);
  });
});
