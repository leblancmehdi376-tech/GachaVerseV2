'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setNumberNotation, type NumberNotation } from '@/lib/game/bignum';

// Préférences d'affichage propres à l'appareil (non synchronisées dans la
// sauvegarde cloud). La notation est recopiée dans lib/game/bignum.ts, que
// bnFormat/formatNumber lisent directement.
interface DisplaySettingsState {
  numberNotation: NumberNotation;
  setNotation: (n: NumberNotation) => void;
  // Mode économie : coupe les animations en boucle (CSS via [data-lowfx] sur
  // <html>, voir globals.css) et les particules canvas (voir useLowFx).
  ecoMode: boolean;
  setEcoMode: (on: boolean) => void;
  // Veille automatique quand la fenêtre n'a plus le focus (voir
  // hooks/useAutoSleep.ts) : délai avant la veille complète, ou 'never'
  // (veille douce seulement, au bout de 5 min).
  sleepDelay: SleepDelay;
  setSleepDelay: (d: SleepDelay) => void;
}

export type SleepDelay = 'instant' | '30s' | '2m' | '5m' | 'never';

// La veille douce force les effets réduits sans toucher au réglage du joueur.
let sleepLowFx = false;

function applyEcoAttr(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on || sleepLowFx) document.documentElement.setAttribute('data-lowfx', '');
  else document.documentElement.removeAttribute('data-lowfx');
}

export function setSleepLowFx(on: boolean) {
  sleepLowFx = on;
  applyEcoAttr(useDisplaySettingsStore.getState().ecoMode);
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()(
  persist(
    (set) => ({
      numberNotation: 'suffix',
      setNotation: (n) => {
        setNumberNotation(n);
        set({ numberNotation: n });
      },
      ecoMode: false,
      setEcoMode: (on) => {
        applyEcoAttr(on);
        set({ ecoMode: on });
      },
      sleepDelay: '5m',
      setSleepDelay: (d) => set({ sleepDelay: d }),
    }),
    {
      name: 'gachaverse-display-settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setNumberNotation(state.numberNotation);
        applyEcoAttr(!!state.ecoMode);
      },
    }
  )
);
