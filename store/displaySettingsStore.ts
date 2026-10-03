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
}

function applyEcoAttr(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on) document.documentElement.setAttribute('data-lowfx', '');
  else document.documentElement.removeAttribute('data-lowfx');
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
