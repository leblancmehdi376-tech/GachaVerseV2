import { describe, it, expect } from 'vitest';
import { computeSleepMode, INPUT_GRACE_MS, SOFT_SLEEP_MS } from './autoSleep';

const base = { blurAt: 1_000_000, lastInputAt: 0 };

describe('computeSleepMode', () => {
  it('reste éveillé tant que la fenêtre a le focus', () => {
    expect(computeSleepMode({ ...base, now: base.blurAt + 10 * SOFT_SLEEP_MS, focused: true, delay: 'instant' })).toBe('awake');
  });

  it('veille complète après le délai choisi sans focus', () => {
    expect(computeSleepMode({ ...base, now: base.blurAt + 29_000, focused: false, delay: '30s' })).toBe('awake');
    expect(computeSleepMode({ ...base, now: base.blurAt + 30_000, focused: false, delay: '30s' })).toBe('full');
    expect(computeSleepMode({ ...base, now: base.blurAt + 120_000, focused: false, delay: '2m' })).toBe('full');
  });

  it('« Immédiat » : veille dès la perte du focus', () => {
    expect(computeSleepMode({ ...base, now: base.blurAt, focused: false, delay: 'instant' })).toBe('full');
  });

  it('un clic dans le jeu juste avant de le quitter ne retarde pas la veille', () => {
    const lastInputAt = base.blurAt - 200;
    expect(computeSleepMode({ ...base, lastInputAt, now: base.blurAt, focused: false, delay: 'instant' })).toBe('full');
    expect(computeSleepMode({ ...base, lastInputAt, now: base.blurAt + 30_000, focused: false, delay: '30s' })).toBe('full');
  });

  it('un clic sans focus (tactile) laisse un délai de grâce, même en « Immédiat »', () => {
    const lastInputAt = base.blurAt + 5_000;
    expect(computeSleepMode({ ...base, lastInputAt, now: lastInputAt + 1_000, focused: false, delay: 'instant' })).toBe('awake');
    expect(computeSleepMode({ ...base, lastInputAt, now: lastInputAt + INPUT_GRACE_MS, focused: false, delay: 'instant' })).toBe('full');
  });

  it('« Jamais » : seulement la veille douce, au bout de 5 min', () => {
    expect(computeSleepMode({ ...base, now: base.blurAt + SOFT_SLEEP_MS - 1, focused: false, delay: 'never' })).toBe('awake');
    expect(computeSleepMode({ ...base, now: base.blurAt + SOFT_SLEEP_MS, focused: false, delay: 'never' })).toBe('soft');
    expect(computeSleepMode({ ...base, now: base.blurAt + 100 * SOFT_SLEEP_MS, focused: false, delay: 'never' })).toBe('soft');
  });
});
