// lib/game/featuredBanner.ts — Bannière vedette : chaque jour (reset à 2h,
// heure de Paris, comme les quêtes — voir getTodayDayKey), un univers tiré au
// hasard est mis à l'honneur, le même pour tous les joueurs. Même pool et
// mêmes taux par rareté que la Vol.1, mais à rareté égale ses persos ont
// FEATURED_RATE_UP fois plus de chances de tomber (voir rollCharacter).
//
// Étincelles : chaque invocation sur cette bannière en rapporte 1. Elles sont
// conservées d'un jour à l'autre et s'échangent contre un perso de l'univers
// vedette AU CHOIX, à un prix qui dépend de sa rareté (SPARK_COSTS) : un prix
// unique ferait d'un Transcendant (0,01 % par tirage) un achat à 200 tirages.
import { BANNER_POOL } from './characters';
import { FEATURED_BANNER_BASE, RARITY_GATES, type GachaBanner } from './gacha';
import { getTodayDayKey } from './shop';
import { makeRng, subSeed } from './nakimeContent';
import { RARITY_ORDER_ASC, type CharacterTemplate, type Rarity } from '@/types/game';

// Univers pouvant être tirés : uniquement des univers riches en persos et en
// hautes raretés.
export const FEATURED_UNIVERSES: string[] = [
  'Dragon Ball Z', 'Demon Slayer', 'Jujutsu Kaisen', 'One Piece', 'Pokémon', 'Naruto',
  'Chainsaw Man', 'Bleach', 'Tensei Slime', 'Hollow Knight', 'Attaque des Titans', 'Fate',
];

// Tirage "sans remise" : l'ordre des univers est mélangé au hasard par cycles
// de FEATURED_UNIVERSES.length jours (graine = numéro du cycle). Chaque
// univers revient donc une fois par cycle, et jamais deux jours de suite.
function cycleOrder(cycle: number): number[] {
  const rng = makeRng(subSeed(cycle, 0, 17)); // 17 : sel propre à la bannière vedette
  const order = FEATURED_UNIVERSES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Univers vedette d'une journée de jeu (clé 'YYYY-MM-DD' de getTodayDayKey). */
export function getFeaturedUniverse(dayKey: string = getTodayDayKey()): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const day = Math.floor(Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 86_400_000);
  const n = FEATURED_UNIVERSES.length;
  const cycle = Math.floor(day / n);
  const order = cycleOrder(cycle);
  // Jonction de deux cycles : le premier jour ne reprend pas l'univers de la veille.
  if (order[0] === cycleOrder(cycle - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  return FEATURED_UNIVERSES[order[day - cycle * n]];
}

const RARITY_DESC = [...RARITY_ORDER_ASC].reverse();

/** Persos tirables de l'univers, du plus rare au plus commun. */
export function getFeaturedCharacters(universe: string): CharacterTemplate[] {
  return BANNER_POOL
    .filter(c => c.universe === universe)
    .sort((a, b) => RARITY_DESC.indexOf(a.rarity) - RARITY_DESC.indexOf(b.rarity) || b.baseDps - a.baseDps);
}

/** Bannière vedette du jour : univers en sous-titre, ses 6 persos les plus rares en vitrine. */
export function getFeaturedBanner(dayKey: string = getTodayDayKey()): GachaBanner {
  const universe = getFeaturedUniverse(dayKey);
  return {
    ...FEATURED_BANNER_BASE,
    subtitle: universe,
    featuredIds: getFeaturedCharacters(universe).slice(0, 6).map(c => c.id),
  };
}

// ── Étincelles ──────────────────────────────────────────────────────────────
export const SPARK_COSTS: Record<Rarity, number> = {
  C: 40, U: 60, R: 80, E: 120, L: 200, M: 400, S: 800, CO: 2000, P: 4000, T: 8000,
};

/** Un perso est échangeable s'il est de l'univers vedette et que sa rareté est débloquée. */
export function canExchangeForCharacter(tpl: CharacterTemplate, universe: string, runPeakPalier: number): boolean {
  return tpl.universe === universe
    && BANNER_POOL.includes(tpl)
    && runPeakPalier >= RARITY_GATES[tpl.rarity].unlockPalier;
}
