// Stockage du middleware `persist` avec écriture différée.
//
// Le stockage par défaut (createJSONStorage) fait JSON.stringify de TOUTE la
// sauvegarde + localStorage.setItem, de façon synchrone, à CHAQUE set() du
// store : à chaque tick de combat, et une dizaine de fois par clic (un level
// up déclenche coins → collection → maîtrise → succès…). Ça bloquait le fil
// principal et faisait exploser l'INP.
//
// Ici on garde seulement la dernière valeur en mémoire et on l'écrit au plus
// une fois par WRITE_DELAY_MS, plus immédiatement quand l'onglet est masqué
// ou fermé, pour ne rien perdre.
import type { PersistStorage, StorageValue } from 'zustand/middleware';

const WRITE_DELAY_MS = 1000;

export function createThrottledStorage<S>(): PersistStorage<S> | undefined {
  if (typeof window === 'undefined') return undefined;

  const pending = new Map<string, StorageValue<S>>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    for (const [name, value] of pending) {
      try { localStorage.setItem(name, JSON.stringify(value)); } catch {}
    }
    pending.clear();
  };

  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  return {
    getItem: (name) => {
      const queued = pending.get(name);
      if (queued) return queued;
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
    },
    setItem: (name, value) => {
      pending.set(name, value);
      timer ??= setTimeout(flush, WRITE_DELAY_MS);
    },
    removeItem: (name) => {
      pending.delete(name);
      try { localStorage.removeItem(name); } catch {}
    },
  };
}
