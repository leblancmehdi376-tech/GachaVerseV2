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
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()(
  persist(
    (set) => ({
      numberNotation: 'suffix',
      setNotation: (n) => {
        setNumberNotation(n);
        set({ numberNotation: n });
      },
    }),
    {
      name: 'gachaverse-display-settings',
      onRehydrateStorage: () => (state) => {
        if (state) setNumberNotation(state.numberNotation);
      },
    }
  )
);
