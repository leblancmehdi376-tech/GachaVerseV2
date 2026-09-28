'use client';
// File d'attente des bannières de déblocage de succès (voir
// components/game/AchievementUnlockBanner.tsx) — état purement visuel, jamais
// persisté. Alimentée par setProgress (store/slices/achievementSlice.ts).
import { create } from 'zustand';

export interface AchievementFx {
  key: number;
  id: string;
}

interface AchievementFxStore {
  queue: AchievementFx[];
  push: (id: string) => void;
  shift: () => void;
}

let seq = 0;

export const useAchievementFxStore = create<AchievementFxStore>((set) => ({
  queue: [],
  // Plafonné : un rattrapage massif (vieille sauvegarde qui débloque 30
  // succès d'un coup) ne doit pas enchaîner 30 bannières.
  push: (id) => set(s => (s.queue.length >= 6 ? s : { queue: [...s.queue, { key: ++seq, id }] })),
  shift: () => set(s => ({ queue: s.queue.slice(1) })),
}));
