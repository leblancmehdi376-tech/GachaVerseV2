import { describe, it, expect } from 'vitest';
import { formatTimeLeft } from './format';

describe('formatTimeLeft', () => {
  it('affiche heures + minutes au-delà d\'une heure', () => {
    expect(formatTimeLeft(5 * 3600_000 + 7 * 60_000)).toBe('5 h 07 min');
    expect(formatTimeLeft(23 * 3600_000 + 59 * 60_000 + 30_000)).toBe('24 h 00 min');
  });

  it('passe en jours au-delà de 48 h', () => {
    expect(formatTimeLeft(7 * 86_400_000)).toBe('7 j 0 h');
    expect(formatTimeLeft(2 * 86_400_000 + 5 * 3600_000 + 1)).toBe('2 j 5 h');
    expect(formatTimeLeft(47 * 3600_000)).toBe('47 h 00 min');
  });

  it('affiche les minutes seules sous une heure, jamais 0', () => {
    expect(formatTimeLeft(42 * 60_000)).toBe('42 min');
    expect(formatTimeLeft(10_000)).toBe('1 min');
    expect(formatTimeLeft(0)).toBe('1 min');
  });
});
