import { describe, it, expect } from 'vitest';
import { getRankColor, getRankDisplay } from './LeaderboardPage';

describe('getRankColor', () => {
  it('donne une couleur dédiée aux 5 premiers rangs', () => {
    expect(getRankColor(0)).toBe('#fbbf24');
    expect(getRankColor(4)).toBe('#6366f1');
  });

  it('retombe sur la couleur par défaut au-delà du top 5', () => {
    expect(getRankColor(5)).toBe('var(--text-dim)');
    expect(getRankColor(49)).toBe('var(--text-dim)');
  });
});

describe('getRankDisplay', () => {
  it('affiche une icône dédiée pour les 3 premiers rangs', () => {
    expect(getRankDisplay(0)).toBe('🥇');
    expect(getRankDisplay(1)).toBe('🥈');
    expect(getRankDisplay(2)).toBe('🥉');
  });

  it('affiche une icône numérotée pour les rangs 4 et 5', () => {
    expect(getRankDisplay(3)).toBe('4️⃣');
    expect(getRankDisplay(4)).toBe('5️⃣');
  });

  it('affiche #N au-delà du top 5', () => {
    expect(getRankDisplay(5)).toBe('#6');
    expect(getRankDisplay(49)).toBe('#50');
  });
});
