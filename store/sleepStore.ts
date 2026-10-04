'use client';
import { create } from 'zustand';
import type { SleepMode } from '@/lib/ui/autoSleep';

// État courant de la veille automatique (piloté par hooks/useAutoSleep.ts).
// Non persisté : on se réveille toujours au chargement.
interface SleepState {
  mode: SleepMode;
  setMode: (mode: SleepMode) => void;
}

export const useSleepStore = create<SleepState>()((set) => ({
  mode: 'awake',
  setMode: (mode) => set({ mode }),
}));
