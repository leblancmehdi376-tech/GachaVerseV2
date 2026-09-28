import { describe, it, expect } from 'vitest';
import {
  bnFromNumber, bnToNumber, bnPow, bnMulScalar, bnMul, bnAdd, bnSub,
  bnCompare, bnGte, bnLt, bnIsZero, bnDivRatio, bnLog10, bnFormat, coerceBigNum, setNumberNotation,
} from './bignum';

describe('bnFromNumber / bnToNumber', () => {
  it('fait l\'aller-retour sur des valeurs simples', () => {
    expect(bnToNumber(bnFromNumber(1234))).toBeCloseTo(1234);
    expect(bnToNumber(bnFromNumber(0))).toBe(0);
  });

  it('clampe à zéro les valeurs négatives ou non-finies (jamais utilisées dans ce jeu)', () => {
    expect(bnIsZero(bnFromNumber(-5))).toBe(true);
    expect(bnIsZero(bnFromNumber(NaN))).toBe(true);
    expect(bnIsZero(bnFromNumber(Infinity))).toBe(true);
  });
});

describe('bnPow — le coeur du correctif (remplace Math.pow, ne déborde jamais)', () => {
  it('reproduit Math.pow pour de petits exposants', () => {
    expect(bnToNumber(bnPow(1.13, 10))).toBeCloseTo(Math.pow(1.13, 10), 5);
  });

  it("ne déborde jamais vers Infinity, même à un exposant qui ferait déborder Math.pow", () => {
    // Math.pow(1.13, 6000) déborde vers Infinity en double JS — c'est
    // exactement le bug corrigé (lib/game/enemies.ts, palier ≈ 582+).
    expect(Math.pow(1.13, 6000)).toBe(Infinity);
    const result = bnPow(1.13, 6000);
    expect(Number.isFinite(result.mantissa)).toBe(true);
    expect(Number.isFinite(result.exponent)).toBe(true);
    expect(bnFormat(result)).not.toBe('0');
    expect(bnFormat(result)).toMatch(/[a-z]{2}$/); // ~1e318 : suffixe alphabétique (aa, ab...) au-delà de Ce
    expect(bnFormat(bnPow(10, 3000))).toMatch(/e\d+$/); // notation scientifique au-delà du plafond des suffixes
  });
});

describe('bnAdd / bnSub', () => {
  it('additionne correctement deux petites valeurs', () => {
    expect(bnToNumber(bnAdd(bnFromNumber(3), bnFromNumber(4)))).toBeCloseTo(7);
  });

  it('un très petit ajout à une très grande valeur ne la change pas de façon perceptible', () => {
    const huge = bnPow(10, 50);
    const sum = bnAdd(huge, bnFromNumber(1));
    expect(bnCompare(sum, huge)).toBeGreaterThanOrEqual(0);
  });

  it('soustraction clampée à zéro (jamais de négatif, comme Math.max(0, a-b))', () => {
    const result = bnSub(bnFromNumber(5), bnFromNumber(10));
    expect(bnIsZero(result)).toBe(true);
  });

  it('soustraction normale', () => {
    expect(bnToNumber(bnSub(bnFromNumber(10), bnFromNumber(4)))).toBeCloseTo(6);
  });
});

describe('bnMul / bnMulScalar', () => {
  it('multiplie deux BigNum', () => {
    expect(bnToNumber(bnMul(bnFromNumber(6), bnFromNumber(7)))).toBeCloseTo(42);
  });

  it('multiplie par un scalaire classique', () => {
    expect(bnToNumber(bnMulScalar(bnFromNumber(10), 1.5))).toBeCloseTo(15);
  });
});

describe('bnCompare / bnGte / bnLt', () => {
  it('compare correctement deux valeurs de magnitudes différentes', () => {
    expect(bnCompare(bnPow(10, 100), bnFromNumber(999))).toBeGreaterThan(0);
    expect(bnGte(bnFromNumber(5), bnFromNumber(5))).toBe(true);
    expect(bnLt(bnFromNumber(4), bnFromNumber(5))).toBe(true);
  });
});

describe('bnDivRatio / bnLog10', () => {
  it('calcule un ratio borné (ex: barre de vie)', () => {
    expect(bnDivRatio(bnFromNumber(50), bnFromNumber(200))).toBeCloseTo(0.25);
  });

  it('bnLog10 reste fini même pour des BigNum extrêmes (contrairement à bnDivRatio)', () => {
    const extreme = bnPow(10, 500);
    expect(Number.isFinite(bnLog10(extreme))).toBe(true);
    expect(bnLog10(extreme)).toBeCloseTo(500, 5);
  });
});

describe('bnFormat', () => {
  it('utilise les suffixes existants pour les valeurs usuelles', () => {
    expect(bnFormat(bnFromNumber(1500))).toBe('1.5K');
    expect(bnFormat(bnFromNumber(0))).toBe('0');
  });

  it('utilise les nouvelles unités au-delà de No (1e30)', () => {
    expect(bnFormat(bnPow(10, 33))).toBe('1Dc');
    expect(bnFormat(bnPow(10, 36))).toBe('1UDc');
    expect(bnFormat(bnPow(10, 63))).toBe('1Vg');
    expect(bnFormat(bnPow(10, 303))).toBe('1Ce');
    expect(bnFormat(bnPow(10, 306))).toBe('1aa');
    expect(bnFormat(bnPow(10, 309))).toBe('1ab');
  });

  it('passe en notation scientifique si le joueur la choisit', () => {
    setNumberNotation('scientific');
    try {
      expect(bnFormat(bnFromNumber(1500))).toBe('1.50e3');
      expect(bnFormat(bnFromNumber(42))).toBe('42');
    } finally {
      setNumberNotation('suffix');
    }
  });
});

describe('coerceBigNum — migration des anciennes sauvegardes', () => {
  it('convertit un ancien number brut', () => {
    expect(bnToNumber(coerceBigNum(42))).toBeCloseTo(42);
  });

  it('traite null/undefined comme zéro (ex: save déjà corrompue par le bug Infinity)', () => {
    expect(bnIsZero(coerceBigNum(null))).toBe(true);
    expect(bnIsZero(coerceBigNum(undefined))).toBe(true);
  });

  it('laisse passer une valeur déjà au format BigNum', () => {
    const b = bnFromNumber(99);
    expect(bnToNumber(coerceBigNum(b))).toBeCloseTo(99);
  });
});
