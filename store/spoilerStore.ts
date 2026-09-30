'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHARACTER_POOL } from '@/lib/game/characters';

// Anti-spoil : un univers "protégé" (case cochée = "je n'ai pas encore vu")
// fait que le jeu n'affiche jamais l'art d'une forme évoluée d'un personnage
// de cet univers — il garde toujours celui de sa forme de base (Evo0), même
// après une ou plusieurs évolutions. Ne touche que le visuel, pas le nom affiché.
interface SpoilerState {
  protectedUniverses: Record<string, boolean>;
  isProtected: (universe: string) => boolean;
  toggleUniverse: (universe: string, protect: boolean) => void;
}

export const useSpoilerStore = create<SpoilerState>()(
  persist(
    (set, get) => ({
      protectedUniverses: {},
      isProtected: (universe) => !!get().protectedUniverses[universe],
      toggleUniverse: (universe, protect) =>
        set(s => ({ protectedUniverses: { ...s.protectedUniverses, [universe]: protect } })),
    }),
    { name: 'gachaverse-spoiler-settings' }
  )
);

/** Index de forme à afficher : la forme de base (0) pour un univers protégé. */
export function getSafeFormIndex(universe: string, realFormIndex: number): number {
  if (realFormIndex <= 0) return 0;
  return useSpoilerStore.getState().isProtected(universe) ? 0 : realFormIndex;
}

/** Univers proposés dans les réglages anti-spoil : tous ceux du pool, triés. */
export function getSpoilerUniverses(): string[] {
  return [...new Set(CHARACTER_POOL.map(c => c.universe).filter((u): u is string => !!u))]
    .sort((a, b) => a.localeCompare(b, 'fr'));
}
