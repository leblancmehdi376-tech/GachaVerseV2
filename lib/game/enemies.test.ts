import { describe, it, expect } from 'vitest';
import { generateEnemy, getPalierBossHp } from './enemies';
import { bnIsZero } from './bignum';

describe('generateEnemy — non-régression du débordement vers Infinity', () => {
  it('reste fini à un palier normal', () => {
    const e = generateEnemy(1, 50);
    expect(Number.isFinite(e.maxHp.mantissa)).toBe(true);
    expect(Number.isFinite(e.pixelCoinsReward.mantissa)).toBe(true);
    expect(bnIsZero(e.maxHp)).toBe(false);
  });

  it('reste fini à un palier extrême (≈582+), là où l\'ancienne formule Math.pow(1.13, n) débordait vers Infinity', () => {
    const e = generateEnemy(10, 1000, 1000);
    expect(Number.isFinite(e.maxHp.mantissa)).toBe(true);
    expect(Number.isFinite(e.maxHp.exponent)).toBe(true);
    expect(Number.isFinite(e.pixelCoinsReward.mantissa)).toBe(true);
    expect(Number.isFinite(e.pixelCoinsReward.exponent)).toBe(true);
    expect(bnIsZero(e.maxHp)).toBe(false);
    expect(bnIsZero(e.pixelCoinsReward)).toBe(false);
  });

  it('getPalierBossHp reste fini au même palier extrême', () => {
    const hp = getPalierBossHp(1000);
    expect(Number.isFinite(hp.mantissa)).toBe(true);
    expect(Number.isFinite(hp.exponent)).toBe(true);
  });
});
