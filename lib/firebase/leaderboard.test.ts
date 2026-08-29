import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatePlayerScore } from './leaderboard';

const setDocMock    = vi.fn(async (..._args: unknown[]) => {});
const updateDocMock = vi.fn(async (..._args: unknown[]) => {});

// doc() renvoie un objet distinguable {col, id} — assez pour vérifier QUEL
// document (saves/{uid} vs users/{uid}) reçoit quel appel, sans avoir besoin
// d'un faux SDK Firestore complet.
vi.mock('firebase/firestore', () => ({
  doc:             vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  setDoc:          (...args: unknown[]) => setDocMock(...args),
  updateDoc:       (...args: unknown[]) => updateDocMock(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  collection:      vi.fn(),
  getDocs:         vi.fn(),
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
    await updatePlayerScore('uid1', { palier: 7, wave: 2, totalClicks: 100 });

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
