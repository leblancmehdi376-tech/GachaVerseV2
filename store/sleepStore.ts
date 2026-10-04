'use client';
import { create } from 'zustand';
import type { SleepMode } from '@/lib/ui/autoSleep';
import type { SleepRecap, SleepSnapshot } from '@/lib/ui/sleepRecap';

// État courant de la veille automatique (piloté par hooks/useAutoSleep.ts).
// Non persisté : on se réveille toujours au chargement.
interface SleepState {
  mode: SleepMode;
  setMode: (mode: SleepMode) => void;
  // Instantané pris à l'entrée en veille complète, comparé au réveil.
  snapshot: SleepSnapshot | null;
  setSnapshot: (snapshot: SleepSnapshot | null) => void;
  // Récap de ce qui a été obtenu pendant la dernière veille (SleepRecapModal).
  recap: SleepRecap | null;
  setRecap: (recap: SleepRecap | null) => void;
}

export const useSleepStore = create<SleepState>()((set) => ({
  mode: 'awake',
  setMode: (mode) => set({ mode }),
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  recap: null,
  setRecap: (recap) => set({ recap }),
}));
