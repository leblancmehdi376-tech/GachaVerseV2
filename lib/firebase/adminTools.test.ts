import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getDocMock    = vi.fn();
const updateDocMock = vi.fn(async (..._args: unknown[]) => {});

// FieldPath a besoin d'exposer ses segments pour que les tests puissent
// vérifier QUEL sous-champ a été ciblé, sans avoir besoin d'un vrai SDK
// Firestore (même approche que accessRequests.test.ts/leaderboard.test.ts).
// Définie DANS le factory (vi.mock est hoisté en haut du fichier — une
// classe top-level référencée ici ne serait pas encore initialisée).
vi.mock('firebase/firestore', () => {
  class FakeFieldPath {
    segments: string[];
    constructor(...segments: string[]) { this.segments = segments; }
  }
  return {
    doc:         vi.fn((_db: unknown, col: string, id: string) => ({ col, id })),
    getDoc:      (...args: unknown[]) => getDocMock(...args),
    updateDoc:   (...args: unknown[]) => updateDocMock(...args),
    deleteField: vi.fn(() => ({ __deleteField: true })),
    FieldPath:   FakeFieldPath,
  };
});

// `db` n'est initialisé que côté navigateur (voir config.ts) — toujours null
// en environnement de test (Vitest en mode 'node'), ce qui court-circuiterait
// toute écriture (`if (!db) return`). On le mocke à un objet non-nul pour
// exercer le vrai chemin.
vi.mock('./config', () => ({ db: {} }));

// Mock PARTIEL (importOriginal) : adminTools.ts importe indirectement
// beaucoup d'autres exports de ces modules via @/store/gameStoreHelpers
// (EVENT_QUESTS -> lib/game/shop.ts -> CHEST_RARITY_RATES, etc.) — un mock
// complet casserait cette chaîne d'imports pour des exports qu'on ne teste
// même pas ici.
vi.mock('@/lib/game/characters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/game/characters')>();
  return {
    ...actual,
    getCharacterById: vi.fn((id: string) =>
      id === 'goku' ? { id: 'goku', name: 'Goku', rarity: 'T', forms: [{ name: 'Base' }, { name: 'SSJ' }] } : undefined
    ),
    getCharFormName: vi.fn((tpl: { forms?: { name: string }[]; name: string }, formIndex: number) =>
      tpl.forms?.[formIndex]?.name ?? tpl.name
    ),
  };
});

vi.mock('@/lib/game/items', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/game/items')>();
  return {
    ...actual,
    getItemDef:      vi.fn((id: string) => (id === 'ember' ? { name: 'Braise', icon: '🔥', color: '#f00' } : undefined)),
    getEquipmentDef: vi.fn((id: string) => (id === 'sword' ? { name: 'Épée', icon: '⚔️', color: '#888', rarity: 'R' } : undefined)),
  };
});

import {
  removePlayerCharacter,
  addPlayerCharacter,
  setPlayerCharacterLevel,
  addPlayerItem,
  addPlayerEquipment,
} from './adminTools';

function fakeSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return { exists: () => exists, data: () => data };
}

type UpdateDocCall = [unknown, { segments: string[] }, unknown, ...unknown[]];

// Le filet verifyAndReapply attend un court délai avant de relire le doc et
// réappliquer si besoin (voir adminTools.ts) — les fake timers évitent de
// vraiment attendre, et advanceTimersByTimeAsync flush les getDoc/updateDoc
// (async) déclenchés par le callback du timer.
beforeEach(() => {
  vi.useFakeTimers();
  getDocMock.mockReset();
  updateDocMock.mockReset();
  updateDocMock.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
});

async function flushVerify() {
  await vi.advanceTimersByTimeAsync(5000);
}

// Ces tests couvrent le remplacement de increment() par une valeur absolue
// (lecture + calcul + écriture) — nécessaire depuis que le vrai risque n'est
// plus la non-atomicité de l'écriture, mais l'autosave du joueur qui
// remplace tout `inventory`/`equipmentInventory` via mergeFields (voir
// saveGame.ts) sans connaître la correction admin. La vérification a besoin
// d'une valeur absolue attendue pour détecter cette collision.
describe('addPlayerItem', () => {
  it('ajoute la quantité au stock déjà présent (valeur absolue, pas un increment aveugle)', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, { inventory: { ember: 3 } }));

    const res = await addPlayerItem('u1', 'ember', 5);

    expect(res.ok).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    const [, path, value] = updateDocMock.mock.calls[0] as UpdateDocCall;
    expect(path.segments).toEqual(['inventory', 'ember']);
    expect(value).toBe(8); // 3 déjà présents + 5 ajoutés
  });

  it('part de 0 si le joueur ne possède pas encore cet objet', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, { inventory: {} }));

    await addPlayerItem('u1', 'ember', 5);

    const [, , value] = updateDocMock.mock.calls[0] as UpdateDocCall;
    expect(value).toBe(5);
  });

  it("échoue proprement sans écrire si la sauvegarde du joueur n'existe pas", async () => {
    getDocMock.mockResolvedValue(fakeSnap(false));

    const res = await addPlayerItem('u1', 'ember', 5);

    expect(res.ok).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('ne réapplique rien si la valeur est toujours correcte après le délai de vérification', async () => {
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { inventory: { ember: 3 } })); // lecture initiale
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { inventory: { ember: 8 } })); // vérification : toujours bon

    await addPlayerItem('u1', 'ember', 5);
    await flushVerify();

    expect(updateDocMock).toHaveBeenCalledTimes(1);
  });

  it("réapplique la correction si l'autosave du joueur l'a écrasée entre-temps", async () => {
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { inventory: { ember: 3 } })); // lecture initiale
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { inventory: { ember: 0 } })); // vérification : écrasé (mergeFields a remplacé tout `inventory`)

    await addPlayerItem('u1', 'ember', 5);
    await flushVerify();

    expect(updateDocMock).toHaveBeenCalledTimes(2);
    const [, path, value] = updateDocMock.mock.calls[1] as UpdateDocCall;
    expect(path.segments).toEqual(['inventory', 'ember']);
    expect(value).toBe(8);
  });
});

describe('addPlayerEquipment', () => {
  it('ajoute la quantité au stock déjà présent', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, { equipmentInventory: { sword: 1 } }));

    const res = await addPlayerEquipment('u1', 'sword', 2);

    expect(res.ok).toBe(true);
    const [, path, value] = updateDocMock.mock.calls[0] as UpdateDocCall;
    expect(path.segments).toEqual(['equipmentInventory', 'sword']);
    expect(value).toBe(3);
  });

  it("réapplique si un save concurrent a écrasé l'ajout", async () => {
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { equipmentInventory: { sword: 1 } }));
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { equipmentInventory: {} }));

    await addPlayerEquipment('u1', 'sword', 2);
    await flushVerify();

    expect(updateDocMock).toHaveBeenCalledTimes(2);
    const [, , value] = updateDocMock.mock.calls[1] as UpdateDocCall;
    expect(value).toBe(3);
  });
});

describe('removePlayerCharacter', () => {
  it('ne réapplique rien si le personnage reste bien absent après le délai', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, { collection: {} }));

    const ok = await removePlayerCharacter('u1', 'goku');
    await flushVerify();

    expect(ok).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
  });

  it('réapplique la suppression si le personnage a réapparu (save concurrent du joueur)', async () => {
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { collection: { goku: { level: 1 } } }));

    const ok = await removePlayerCharacter('u1', 'goku');
    await flushVerify();

    expect(ok).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(2);
    const [, path] = updateDocMock.mock.calls[1] as UpdateDocCall;
    expect(path.segments).toEqual(['collection', 'goku']);
  });
});

describe('setPlayerCharacterLevel', () => {
  it('borne le niveau entre 1 et 999', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, {}));

    await setPlayerCharacterLevel('u1', 'goku', 5000);

    const [, path, value] = updateDocMock.mock.calls[0] as UpdateDocCall;
    expect(path.segments).toEqual(['collection', 'goku', 'level']);
    expect(value).toBe(999);
  });
});

describe('addPlayerCharacter', () => {
  it('préserve copies/xp/equippedItems existants en changeant niveau/rang/forme', async () => {
    getDocMock.mockResolvedValue(fakeSnap(true, {
      collection: { goku: { copies: 3, xp: 120, equippedItems: { weapon: 'sword' } } },
    }));

    const res = await addPlayerCharacter('u1', 'goku', 'base', 10, 3, 1);

    expect(res.ok).toBe(true);
    const [, path, entry] = updateDocMock.mock.calls[0] as UpdateDocCall;
    expect(path.segments).toEqual(['collection', 'goku']);
    expect(entry).toMatchObject({
      copies: 3, xp: 120, equippedItems: { weapon: 'sword' }, level: 10, rank: 3, currentForm: 1,
    });
  });

  it("échoue sans écrire si le templateId n'existe pas", async () => {
    const res = await addPlayerCharacter('u1', 'inexistant', 'base', 1, 1);

    expect(res.ok).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it("réapplique si un save concurrent a écrasé l'ajout du personnage", async () => {
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { collection: {} })); // lecture initiale : pas encore possédé
    getDocMock.mockResolvedValueOnce(fakeSnap(true, { collection: {} })); // vérification : toujours absent -> écrasé

    await addPlayerCharacter('u1', 'goku', 'base', 10, 3);
    await flushVerify();

    expect(updateDocMock).toHaveBeenCalledTimes(2);
  });
});
