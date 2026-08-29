import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDocsMock   = vi.fn();
const updateDocMock = vi.fn(async (..._args: unknown[]) => {});

// doc()/collection() renvoient un objet distinguable {col[, id]} — assez pour
// que le mock de getDocs sache quelle collection on lui demande, sans avoir
// besoin d'un faux SDK Firestore complet (même approche que leaderboard.test.ts).
vi.mock('firebase/firestore', () => ({
  doc:        vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  collection: vi.fn((_db: unknown, col: string) => ({ col })),
  getDocs:    (...args: unknown[]) => getDocsMock(...args),
  updateDoc:  (...args: unknown[]) => updateDocMock(...args),
  setDoc:     vi.fn(async () => {}),
  getDoc:     vi.fn(),
}));

// `db` n'est initialisé que côté navigateur (voir config.ts) — toujours null
// en environnement de test (Vitest en mode 'node'), ce qui court-circuite
// toute lecture/écriture (`if (!db) return`). On le mocke à un objet non-nul
// pour exercer le vrai chemin.
vi.mock('./config', () => ({ db: {} }));

import { normalizeAccessRequest, findUsernameMismatches, applyUsernameSync } from './accessRequests';

function fakeSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
}

// Configure getDocs() pour répondre différemment selon la collection
// interrogée (users vs saves) — mêmes noms que ceux utilisés par
// findUsernameMismatches.
function mockCollections(users: Array<{ id: string; data: Record<string, unknown> }>, saves: Array<{ id: string; data: Record<string, unknown> }>) {
  getDocsMock.mockImplementation(async (ref: { col: string }) => {
    if (ref.col === 'users') return fakeSnapshot(users);
    if (ref.col === 'saves') return fakeSnapshot(saves);
    throw new Error(`collection inattendue: ${ref.col}`);
  });
}

// Ces tests couvrent la compatibilité avec les documents Firestore déjà en
// base AVANT le renommage discordUsername -> discordHandle : aucun script de
// migration n'a été écrit, normalizeAccessRequest doit donc convertir les
// anciens documents à la lecture, pour toujours.
describe('normalizeAccessRequest', () => {
  it('lit discordHandle sur un document déjà migré', () => {
    const r = normalizeAccessRequest('uid1', {
      email: 'a@b.com', username: 'Neko', discordHandle: 'neko#1234',
      approved: true, createdAt: 42,
    });
    expect(r).toEqual({
      uid: 'uid1', email: 'a@b.com', username: 'Neko', discordHandle: 'neko#1234',
      approved: true, createdAt: 42,
    });
  });

  it('retombe sur l\'ancien champ discordUsername si discordHandle est absent (doc pré-renommage)', () => {
    const r = normalizeAccessRequest('uid2', {
      email: 'a@b.com', username: 'Neko', discordUsername: 'neko#1234',
      approved: true, createdAt: 42,
    });
    expect(r.discordHandle).toBe('neko#1234');
  });

  it('préfère discordHandle à discordUsername si les deux sont présents', () => {
    const r = normalizeAccessRequest('uid3', {
      discordHandle: 'nouveau', discordUsername: 'ancien',
    });
    expect(r.discordHandle).toBe('nouveau');
  });

  it('renvoie des valeurs par défaut sûres pour un document vide ou incomplet', () => {
    const r = normalizeAccessRequest('uid4', {});
    expect(r).toEqual({
      uid: 'uid4', email: '', username: '', discordHandle: '',
      approved: false, createdAt: 0,
    });
  });
});

// Ces tests couvrent le rattrapage des comptes renommés AVANT le correctif
// qui synchronise users/{uid} et saves/{uid} à chaque renommage (voir
// updatePlayerScore dans leaderboard.ts) — équivalent en lecture/écriture de
// scripts/sync_usernames.js, exposé par le bouton "Vérifier les pseudos" du
// panel admin.
describe('findUsernameMismatches / applyUsernameSync', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
    updateDocMock.mockClear();
    updateDocMock.mockResolvedValue(undefined);
  });

  it('détecte un compte dont le pseudo admin (users) a divergé du pseudo réel (saves)', async () => {
    mockCollections(
      [{ id: 'u1', data: { username: 'AncienPseudo' } }],
      [{ id: 'u1', data: { username: 'NouveauPseudo' } }],
    );

    const mismatches = await findUsernameMismatches();
    expect(mismatches).toEqual([{ uid: 'u1', from: 'AncienPseudo', to: 'NouveauPseudo' }]);
  });

  it('ne remonte rien quand les deux pseudos sont déjà identiques', async () => {
    mockCollections(
      [{ id: 'u1', data: { username: 'Neko' } }],
      [{ id: 'u1', data: { username: 'Neko' } }],
    );
    expect(await findUsernameMismatches()).toEqual([]);
  });

  it('ignore les comptes présents seulement dans saves (pas de fiche users/{uid} à corriger)', async () => {
    mockCollections(
      [], // aucune fiche users
      [{ id: 'save-only', data: { username: 'Solo' } }],
    );
    expect(await findUsernameMismatches()).toEqual([]);
  });

  it('ignore un pseudo saves vide (rien de fiable à propager)', async () => {
    mockCollections(
      [{ id: 'u1', data: { username: 'AncienPseudo' } }],
      [{ id: 'u1', data: { username: '' } }],
    );
    expect(await findUsernameMismatches()).toEqual([]);
  });

  it('normalise (trim + 20 caractères max) avant de comparer, comme updatePlayerScore', async () => {
    mockCollections(
      [{ id: 'u1', data: { username: 'x'.repeat(20) } }],
      [{ id: 'u1', data: { username: '  ' + 'x'.repeat(30) + '  ' } }],
    );
    // Une fois normalisés, les deux valent "x".repeat(20) -> pas de mismatch.
    expect(await findUsernameMismatches()).toEqual([]);
  });

  it('applyUsernameSync écrit users/{uid} pour chaque mismatch et renvoie le nombre corrigé', async () => {
    const fixed = await applyUsernameSync([
      { uid: 'u1', from: 'A', to: 'B' },
      { uid: 'u2', from: 'C', to: 'D' },
    ]);

    expect(fixed).toBe(2);
    expect(updateDocMock).toHaveBeenCalledTimes(2);
    expect(updateDocMock).toHaveBeenCalledWith({ col: 'users', id: 'u1' }, { username: 'B' });
    expect(updateDocMock).toHaveBeenCalledWith({ col: 'users', id: 'u2' }, { username: 'D' });
  });

  it('un échec isolé (ex: compte supprimé entre-temps) ne bloque pas les autres corrections', async () => {
    updateDocMock.mockImplementation(async (...args: unknown[]) => {
      if ((args[0] as { id: string }).id === 'u1') throw new Error('No document to update');
    });

    const fixed = await applyUsernameSync([
      { uid: 'u1', from: 'A', to: 'B' },
      { uid: 'u2', from: 'C', to: 'D' },
    ]);

    expect(fixed).toBe(1); // seul u2 a réussi
    expect(updateDocMock).toHaveBeenCalledTimes(2);
  });
});
