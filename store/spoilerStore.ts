'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { getPalierConfig } from '@/lib/game/paliers';
import type { Enemy } from '@/types/game';

// Anti-spoil : un univers "protégé" (case cochée = "je n'ai pas encore vu")
// fait que le jeu n'affiche jamais l'art d'une forme évoluée d'un personnage
// de cet univers — il garde toujours celui de sa forme de base (Evo0), même
// après une ou plusieurs évolutions. Ne touche que le visuel, pas le nom affiché.
// Les ennemis des paliers de cet univers sont aussi masqués : ils s'affichent
// en Saibaman (nom et sprite), sans changer leurs stats ni leur affinité.
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

// Univers des paliers nommés autrement que celui des persos (et donc que
// l'univers proposé dans les réglages anti-spoil).
const PALIER_UNIVERSE_ALIASES: Record<string, string> = {
  'Dragon Ball': 'Dragon Ball Z',
  'Fullmetal Alchemist': 'Fullmetal Alchemist Brotherhood',
};

/** Vrai si l'univers du palier (cycle compris) est protégé par l'anti-spoil. */
export function isPalierProtected(palier: number): boolean {
  const universe = getPalierConfig(palier).universe;
  return useSpoilerStore.getState().isProtected(PALIER_UNIVERSE_ALIASES[universe] ?? universe);
}

const SAIBAMAN_SPRITES = ['saibaman', 'saibaman2', 'saibaman3', 'saibaman4', 'saibaman5', 'saibaman6'];

/** Nom et sprite à afficher pour un ennemi : un Saibaman si son palier est protégé. */
export function getSafeEnemyDisplay(enemy: Pick<Enemy, 'name' | 'spritePath' | 'wave' | 'palier' | 'isBoss'>): { name: string; spritePath: string } {
  if (!isPalierProtected(enemy.palier)) return { name: enemy.name, spritePath: enemy.spritePath };
  const sprite = SAIBAMAN_SPRITES[(Math.max(1, enemy.wave) - 1) % SAIBAMAN_SPRITES.length];
  return {
    name: enemy.isBoss ? '★ BOSS — Saibaman' : 'Saibaman',
    spritePath: `/sprites/enemies/palier1/${sprite}.png`,
  };
}
