import { describe, it, expect } from 'vitest';
import { getDleDayKey, getDleRanking, getRankColor, getRankDisplay } from './LeaderboardPage';
import type { LeaderboardEntry } from '@/lib/firebase/leaderboard';

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

describe("Classement GachaDle — bascule Aujourd'hui / Hier", () => {
  const TODAY = '2026-10-01';
  const e = (uid: string, dleWins: Record<string, number>) => ({ uid, username: uid, dleWins }) as unknown as LeaderboardEntry;
  const entries = [
    e('ana', { '2026-10-01': 3, '2026-09-30': 6 }),
    e('bob', { '2026-09-30': 2 }),            // a joué hier seulement
    e('cid', { '2026-10-01': 1 }),            // a joué aujourd'hui seulement
    e('dan', { '2026-09-29': 1 }),            // avant-hier : n'apparaît nulle part
  ];

  it('calcule la veille, y compris au changement de mois', () => {
    expect(getDleDayKey('today', TODAY)).toBe('2026-10-01');
    expect(getDleDayKey('yesterday', TODAY)).toBe('2026-09-30');
  });

  it("affiche le classement du jour ou celui d'hier selon l'onglet choisi, à partir des mêmes données", () => {
    expect(getDleRanking(entries, 'today', TODAY).map(r => [r.entry.uid, r.guesses, r.rank]))
      .toEqual([['cid', 1, 1], ['ana', 3, 2]]);
    expect(getDleRanking(entries, 'yesterday', TODAY).map(r => [r.entry.uid, r.guesses, r.rank]))
      .toEqual([['bob', 2, 1], ['ana', 6, 2]]);
    // Revenir sur "Aujourd'hui" redonne le même classement (aucun état caché).
    expect(getDleRanking(entries, 'today', TODAY).map(r => r.entry.uid)).toEqual(['cid', 'ana']);
  });

  it('utilise mes victoires locales plutôt que la copie Firestore, pour les deux jours', () => {
    const me = { uid: 'bob', data: { dleRecentWins: [{ date: '2026-10-01', guesses: 2 }, { date: '2026-09-30', guesses: 2 }] } };
    expect(getDleRanking(entries, 'today', TODAY, me).map(r => [r.entry.uid, r.rank])).toEqual([['cid', 1], ['bob', 2], ['ana', 3]]);
    expect(getDleRanking(entries, 'yesterday', TODAY, me).map(r => [r.entry.uid, r.rank])).toEqual([['bob', 1], ['ana', 2]]);
  });
});
