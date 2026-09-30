import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Protection contre un appareil périmé (voir le bloc "Protection contre un
// appareil périmé" dans cloudSaveSync.ts) : une sauvegarde cloud écrite par
// un AUTRE navigateur doit toujours gagner sur l'état en mémoire.
const mocks = vi.hoisted(() => ({
  loadGameFromFirestore: vi.fn(),
  saveGameToFirestore: vi.fn(),
  readSaveFromServer: vi.fn(),
}));
vi.mock('@/lib/firebase/saveGame', () => ({
  loadGameFromFirestore: mocks.loadGameFromFirestore,
  saveGameToFirestore: mocks.saveGameToFirestore,
  readSaveFromServer: mocks.readSaveFromServer,
  probeClockOffset: vi.fn(async () => null),
}));
vi.mock('@/lib/firebase/session', () => ({ getBrowserId: () => 'me' }));

import { useGameStore } from '@/store/gameStore';
import { bumpSessionGeneration, getLastSaveFailed, handleRemoteSaveSnapshot, loadAndApply, resetSyncState, saveToFirebase } from './cloudSaveSync';

async function login(remote: Record<string, unknown> | null) {
  mocks.loadGameFromFirestore.mockResolvedValueOnce({ data: remote, reachable: true });
  await loadAndApply('u1', bumpSessionGeneration());
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSyncState();
  mocks.saveGameToFirestore.mockImplementation(async () => Date.now());
});
afterEach(() => { vi.restoreAllMocks(); });

describe('loadAndApply — sauvegarde écrite par un autre appareil', () => {
  it('prend la sauvegarde cloud même si le savedAt local est plus récent', async () => {
    useGameStore.setState({ nekoGems: 999, savedAt: 5_000 });
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'other' });
    expect(useGameStore.getState().nekoGems).toBe(10);
  });

  it('garde "plus récent gagne" quand la sauvegarde vient de cet appareil', async () => {
    useGameStore.setState({ nekoGems: 999, savedAt: 5_000 });
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    expect(useGameStore.getState().nekoGems).toBe(999);
  });
});

describe('handleRemoteSaveSnapshot — écoute en direct', () => {
  it("reprend l'état cloud quand un autre appareil vient de sauvegarder", async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    useGameStore.setState({ nekoGems: 50 });
    handleRemoteSaveSnapshot({ nekoGems: 70, lastSaved: 2_000, lastSavedBy: 'other' });
    expect(useGameStore.getState().nekoGems).toBe(70);
  });

  it('ignore notre propre sauvegarde et la version déjà connue', async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'other' });
    useGameStore.setState({ nekoGems: 50 });
    handleRemoteSaveSnapshot({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'other' }); // déjà chargée
    handleRemoteSaveSnapshot({ nekoGems: 40, lastSaved: 2_000, lastSavedBy: 'me' });
    handleRemoteSaveSnapshot({ nekoGems: 30, lastSaved: 3_000, lastSavedBy: 'admin' }); // géré par buildAdminCorrectionPatch
    expect(useGameStore.getState().nekoGems).toBe(50);
  });
});

describe('saveToFirebase — retour après une longue absence (onglet gelé)', () => {
  it("n'écrase pas une sauvegarde plus récente d'un autre appareil : la reprend", async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    useGameStore.setState({ nekoGems: 11 });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
    mocks.readSaveFromServer.mockResolvedValueOnce({ nekoGems: 500, lastSaved: 9_000, lastSavedBy: 'other' });

    expect(await saveToFirebase('u1', 'periodic')).toBe(true);
    expect(mocks.saveGameToFirestore).not.toHaveBeenCalled();
    expect(useGameStore.getState().nekoGems).toBe(500);
  });

  it("écrit normalement si personne d'autre n'a sauvegardé entre-temps", async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
    mocks.readSaveFromServer.mockResolvedValueOnce({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'other' });

    expect(await saveToFirebase('u1', 'periodic')).toBe(true);
    expect(mocks.saveGameToFirestore).toHaveBeenCalledTimes(1);
  });

  it("n'écrit rien si le serveur est injoignable pour vérifier", async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 3600_000);
    mocks.readSaveFromServer.mockResolvedValueOnce(undefined);

    expect(await saveToFirebase('u1', 'periodic')).toBe(false);
    expect(mocks.saveGameToFirestore).not.toHaveBeenCalled();
  });

  it("signale l'échec (plus de \"Synchronisé\") quand Firestore refuse l'écriture", async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    mocks.saveGameToFirestore.mockRejectedValueOnce(new Error('resource-exhausted'));
    expect(await saveToFirebase('u1', 'periodic')).toBe(false);
    expect(getLastSaveFailed()).toBe(true);

    expect(await saveToFirebase('u1', 'periodic')).toBe(true);
    expect(getLastSaveFailed()).toBe(false);
  });

  it("repasse en synchronisé si l'écriture en file finit par passer après le timeout", async () => {
    vi.useFakeTimers();
    try {
      await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
      let ack!: (ts: number) => void;
      mocks.saveGameToFirestore.mockReturnValueOnce(new Promise<number>(r => { ack = r; }));
      const pending = saveToFirebase('u1', 'periodic');
      await vi.advanceTimersByTimeAsync(5_000);
      expect(await pending).toBe(false);
      expect(getLastSaveFailed()).toBe(true);

      ack(2_000);
      await vi.advanceTimersByTimeAsync(0);
      expect(getLastSaveFailed()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne relit pas le serveur pour une sauvegarde normale (onglet actif)', async () => {
    await login({ nekoGems: 10, lastSaved: 1_000, lastSavedBy: 'me' });
    expect(await saveToFirebase('u1', 'periodic')).toBe(true);
    expect(mocks.readSaveFromServer).not.toHaveBeenCalled();
  });
});
