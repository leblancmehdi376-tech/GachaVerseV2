import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractDleWins, getLeaderboardEntries, rankByDleGuesses, updatePlayerScore, type LeaderboardEntry } from './leaderboard';

const setDocMock    = vi.fn(async (..._args: unknown[]) => {});
const updateDocMock = vi.fn(async (..._args: unknown[]) => {});
const getDocsMock   = vi.fn(async (..._args: unknown[]) => ({
  docs: [{ id: 'uid1', data: () => ({ username: 'Neko', palier: 3 }) }],
}));

// doc() renvoie un objet distinguable {col, id} — assez pour vérifier QUEL
// document (saves/{uid} vs users/{uid}) reçoit quel appel, sans avoir besoin
// d'un faux SDK Firestore complet.
vi.mock('firebase/firestore', () => ({
  doc:             vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  setDoc:          (...args: unknown[]) => setDocMock(...args),
  updateDoc:       (...args: unknown[]) => updateDocMock(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  collection:      vi.fn(),
  getDocs:         (...args: unknown[]) => getDocsMock(...args),
  query:           vi.fn(),
  limit:           vi.fn(),
}));

// `db` n'est initialisé que côté navigateur (voir config.ts) — toujours null
// dans l'environnement de test (Vitest en mode 'node'), ce qui court-circuite
// toute écriture (`if (!db) return`). On le mocke ici à un objet non-nul pour
// exercer le vrai chemin d'écriture.
vi.mock('./config', () => ({ db: {} }));

describe('updatePlayerScore — synchro username entre saves/{uid} et users/{uid}', () => {
  beforeEach(() => {
    setDocMock.mockClear();
    updateDocMock.mockClear();
  });

  it('écrit le pseudo dans saves/{uid} (copie dénormalisée) ET users/{uid} (source de vérité)', async () => {
    await updatePlayerScore('uid1', { username: 'Neko', palier: 5, wave: 3 });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [savesRef, savesPatch] = setDocMock.mock.calls[0];
    expect(savesRef).toEqual({ col: 'saves', id: 'uid1' });
    expect((savesPatch as { username: string }).username).toBe('Neko');

    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [usersRef, usersPatch] = updateDocMock.mock.calls[0];
    expect(usersRef).toEqual({ col: 'users', id: 'uid1' });
    expect(usersPatch).toEqual({ username: 'Neko' });
  });

  it('tronque et trim le pseudo à 20 caractères, de façon identique dans les deux documents', async () => {
    await updatePlayerScore('uid1', { username: '  ' + 'x'.repeat(30) + '  ' });

    const savesPatch = setDocMock.mock.calls[0][1] as { username: string };
    const usersPatch = updateDocMock.mock.calls[0][1] as { username: string };
    expect(savesPatch.username).toBe('x'.repeat(20));
    expect(usersPatch.username).toBe('x'.repeat(20));
  });

  it('n\'écrit PAS users/{uid} quand la mise à jour ne concerne pas le pseudo (ex: progression courante)', async () => {
    await updatePlayerScore('uid1', { palier: 7, wave: 2 });

    expect(setDocMock).toHaveBeenCalledTimes(1); // saves toujours mis à jour
    expect(updateDocMock).not.toHaveBeenCalled(); // pas de renommage -> pas de synchro identité
  });

  it('ne fait pas échouer toute la mise à jour si users/{uid} n\'existe pas encore (vieux compte save-only)', async () => {
    updateDocMock.mockRejectedValueOnce(new Error('No document to update'));

    await expect(
      updatePlayerScore('uid-legacy', { username: 'Ancien' })
    ).resolves.not.toThrow();

    // saves/{uid} a bien reçu le nouveau pseudo malgré l'échec de users/{uid}
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const savesPatch = setDocMock.mock.calls[0][1] as { username: string };
    expect(savesPatch.username).toBe('Ancien');
  });
});

describe('Classement GachaDle', () => {
  it("lit les victoires récentes (aujourd'hui + hier) depuis dleRecentWins", () => {
    const { dleWins } = extractDleWins({
      dleDailyDate: '2026-09-29', dleLastWinDate: '2026-09-29', dleDailyGuesses: ['a', 'b', 'c'],
      dleRecentWins: [{ date: '2026-09-29', guesses: 3 }, { date: '2026-09-28', guesses: 5 }],
    });
    expect(dleWins).toEqual({ '2026-09-29': 3, '2026-09-28': 5 });
  });

  it("garde la victoire d'hier même quand les essais du jour l'ont écrasée", () => {
    // Joueur qui a gagné hier en 4 et vient de faire un 1er essai raté aujourd'hui.
    const { dleWins } = extractDleWins({
      dleDailyDate: '2026-09-29', dleLastWinDate: '2026-09-28', dleDailyGuesses: ['x'],
      dleRecentWins: [{ date: '2026-09-28', guesses: 4 }],
    });
    expect(dleWins).toEqual({ '2026-09-28': 4 });
  });

  it('retombe sur les essais du jour pour les saves antérieures à dleRecentWins', () => {
    expect(extractDleWins({ dleDailyDate: '2026-09-28', dleLastWinDate: '2026-09-28', dleDailyGuesses: ['a', 'b'] }).dleWins)
      .toEqual({ '2026-09-28': 2 });
    expect(extractDleWins({ dleDailyDate: '2026-09-29', dleLastWinDate: '2026-09-28', dleDailyGuesses: ['a'] }).dleWins).toEqual({});
    expect(extractDleWins({}).dleWins).toEqual({});
  });

  it('trie par essais croissants, ne garde que le jour demandé et partage les rangs ex æquo', () => {
    const e = (uid: string, dleWins: Record<string, number>) => ({ uid, username: uid, dleWins }) as unknown as LeaderboardEntry;
    const entries = [
      e('d', { '2026-09-29': 5 }), e('b', { '2026-09-29': 2 }), e('c', { '2026-09-29': 2, '2026-09-28': 1 }),
      e('old', { '2026-09-28': 3 }), e('a', { '2026-09-29': 1 }),
    ];
    expect(rankByDleGuesses(entries, '2026-09-29').map(r => [r.entry.uid, r.guesses, r.rank]))
      .toEqual([['a', 1, 1], ['b', 2, 2], ['c', 2, 2], ['d', 5, 4]]);
    expect(rankByDleGuesses(entries, '2026-09-28').map(r => [r.entry.uid, r.rank])).toEqual([['c', 1], ['old', 2]]);
  });
});

describe('getLeaderboardEntries — aucune lecture Firestore en trop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getDocsMock.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('ne relit jamais rien tout seul, même page ouverte pendant des heures', async () => {
    await getLeaderboardEntries(true);
    expect(getDocsMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3 * 3600_000);
    expect(getDocsMock).toHaveBeenCalledTimes(1);
  });

  it("réutilise le cache pendant 2 min (retour sur la page, changement d'onglet)", async () => {
    await getLeaderboardEntries(true);
    await getLeaderboardEntries();
    await vi.advanceTimersByTimeAsync(119_000);
    await getLeaderboardEntries();
    expect(getDocsMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2_000);
    await getLeaderboardEntries();
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it('relit seulement sur demande explicite (bouton Actualiser)', async () => {
    await getLeaderboardEntries(true);
    await getLeaderboardEntries(true);
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });
});
