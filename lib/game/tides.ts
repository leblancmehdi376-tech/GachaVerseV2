// lib/game/tides.ts — Marées cosmiques : chaque jour (reset à 2h, heure de
// Paris, comme les quêtes — voir getTodayDayKey), un des 8 types est en
// marée haute et le type opposé sur la roue (4 crans plus loin) en marée
// basse. Le multiplicateur s'applique aux dégâts des persos de ce type au
// combat de l'accueil (voir characterSlice) et à leur ATQ dans le Château de
// Nakime (marée du jour d'entrée, figée pour toute la run — voir createRun).
// Pas aux raids (les PV du boss s'adaptent au DPS de l'équipe, un bonus de
// DPS n'y changerait rien) ni aux expéditions.
import { AFFINITY_ORDER, type Affinity } from './affinities';
import { getTodayDayKey } from './shop';

export const TIDE_UP_MULT   = 1.25; // marée haute : +25 % de dégâts
export const TIDE_DOWN_MULT = 0.85; // marée basse : −15 % de dégâts

export interface CosmicTide {
  dayKey: string;
  up:     Affinity;
  down:   Affinity;
}

// Pas de 3 (premier avec 8) : sur 8 jours consécutifs, chaque type passe une
// fois en marée haute et une fois en marée basse, jamais deux jours de suite.
const TIDE_STEP = 3;

/** Marée d'une journée de jeu (clé 'YYYY-MM-DD' de getTodayDayKey). */
export function getTideForDayKey(dayKey: string): CosmicTide {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dayNum = Math.floor(Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 86_400_000);
  const n = AFFINITY_ORDER.length;
  const i = (((dayNum * TIDE_STEP) % n) + n) % n;
  return { dayKey, up: AFFINITY_ORDER[i], down: AFFINITY_ORDER[(i + n / 2) % n] };
}

// getTodayDayKey construit un Intl.DateTimeFormat à chaque appel, alors que la
// marée est relue à chaque calcul de DPS : on ne revérifie la journée qu'une
// fois par minute, et on renvoie le MÊME objet tant qu'elle ne change pas
// (dépendance de mémo stable, voir dpsDeps dans characterSlice).
let cachedTide: CosmicTide | null = null;
let cachedAt = 0;

/** Marée de la journée de jeu en cours. */
export function getCosmicTide(): CosmicTide {
  const now = Date.now();
  if (!cachedTide || now - cachedAt >= 60_000) {
    const dayKey = getTodayDayKey();
    if (!cachedTide || cachedTide.dayKey !== dayKey) cachedTide = getTideForDayKey(dayKey);
    cachedAt = now;
  }
  return cachedTide;
}

/** Marée de la journée de jeu suivante (affichée pour s'organiser). */
export function getNextTide(tide: CosmicTide): CosmicTide {
  const [y, m, d] = tide.dayKey.split('-').map(Number);
  const next = new Date(Date.UTC(y || 1970, (m || 1) - 1, (d || 1) + 1));
  const pad = (v: number) => String(v).padStart(2, '0');
  return getTideForDayKey(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`);
}

/** Multiplicateur de dégâts d'un perso de type `affinity` sous cette marée. */
export function tideMultFor(affinity: Affinity, tide: Pick<CosmicTide, 'up' | 'down'> | null | undefined): number {
  if (!tide) return 1;
  if (affinity === tide.up) return TIDE_UP_MULT;
  if (affinity === tide.down) return TIDE_DOWN_MULT;
  return 1;
}
