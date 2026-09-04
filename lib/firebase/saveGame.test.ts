import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.fn(async (..._args: unknown[]) => {});

vi.mock('firebase/firestore', () => ({
  doc:              vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
  setDoc:           (...args: unknown[]) => setDocMock(...args),
  getDoc:           vi.fn(),
  getDocFromServer: vi.fn(),
  serverTimestamp:  vi.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp:        {},
}));

// `db` n'est initialisé que côté navigateur (voir config.ts) — toujours null
// en environnement de test (Vitest en mode 'node'), même approche que
// accessRequests.test.ts/leaderboard.test.ts.
vi.mock('./config', () => ({ db: {} }));

import { saveGameToFirestore } from './saveGame';

type SetDocCall = [unknown, Record<string, unknown>, { merge?: boolean; mergeFields?: string[] }];

// Ces tests couvrent le passage merge:true -> mergeFields (voir discussion
// architecture) : un champ-objet imbriqué (collection/inventory/...) envoyé
// vide (ex: après un Prestige) doit ENTIÈREMENT remplacer le champ côté
// cloud, pas juste s'y fusionner (merge:true fusionne récursivement et ne
// supprime jamais une sous-clé absente du payload — un reset ne se
// propageait donc jamais réellement au cloud).
describe('saveGameToFirestore', () => {
  beforeEach(() => setDocMock.mockClear());

  it('écrit avec mergeFields (pas merge:true)', async () => {
    await saveGameToFirestore('u1', { collection: {}, nekoGems: 5 }, 'test');

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, , options] = setDocMock.mock.calls[0] as SetDocCall;
    expect(options.merge).toBeUndefined();
    expect(options.mergeFields).toBeDefined();
  });

  it('mergeFields liste EXACTEMENT les champs du payload (dont lastSaved), rien de plus/moins', async () => {
    await saveGameToFirestore('u1', { collection: {}, nekoGems: 5, equipmentInventory: { a: 1 } }, 'test');

    const [, data, options] = setDocMock.mock.calls[0] as SetDocCall;
    expect((options.mergeFields ?? []).slice().sort()).toEqual(Object.keys(data).sort());
  });

  it('un champ-objet vidé (ex: collection:{} après Prestige) est listé dans mergeFields, donc réellement effacé côté cloud', async () => {
    await saveGameToFirestore('u1', { collection: {}, equipmentInventory: {}, championInventory: {} }, 'prestige');

    const [, , options] = setDocMock.mock.calls[0] as SetDocCall;
    expect(options.mergeFields).toEqual(expect.arrayContaining(['collection', 'equipmentInventory', 'championInventory']));
  });
});
