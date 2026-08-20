import { Rarity, RARITY_CONFIG } from '@/types/game';
import { BANNER_POOL } from './characters';

export const GACHA_COSTS = { single: 10, multi10: 95, multi100: 900 };

// ── Courbes de taux (déblocage progressif par palier) ─────────────────────
// Chaque rareté n'est tirable qu'à partir du palier `unlockPalier` (cf. tableau
// de déblocage). En dessous, son taux est nul et le budget est reporté sur les
// raretés déjà débloquées. Une fois débloquée, son taux progresse linéairement
// entre rateAtUnlock et rateAtMax jusqu'au palier 40.
// rateAtUnlock : taux (%) brut au palier de déblocage (avant normalisation à 100%)
// rateAtMax    : taux (%) brut au palier 40

export const RARITY_GATES: Record<Rarity, {
  unlockPalier: number;
  rateAtUnlock: number;
  rateAtMax:    number;
}> = {
  C:  { unlockPalier: 1,  rateAtUnlock: 70.0000, rateAtMax: 30.000 },
  U:  { unlockPalier: 3,  rateAtUnlock: 22.0000, rateAtMax: 20.000 },
  R:  { unlockPalier: 5,  rateAtUnlock:  7.0000, rateAtMax: 15.000 },
  E:  { unlockPalier: 7,  rateAtUnlock:  1.0000, rateAtMax: 10.000 },
  L:  { unlockPalier: 9,  rateAtUnlock:  0.1500, rateAtMax:  4.000 },
  M:  { unlockPalier: 11, rateAtUnlock:  0.0300, rateAtMax:  1.500 },
  S:  { unlockPalier: 13, rateAtUnlock:  0.0060, rateAtMax:  0.500 },
  CO: { unlockPalier: 15, rateAtUnlock:  0.0015, rateAtMax:  0.100 },
  P:  { unlockPalier: 17, rateAtUnlock:  0.0006, rateAtMax:  0.050 },
  T:  { unlockPalier: 19, rateAtUnlock:  0.0002, rateAtMax:  0.010 },
};

const MAX_PALIER = 40;
const RARITY_ORDER: Rarity[] = ['T','P','CO','S','M','L','E','R','U','C'];

/**
 * Calcule les taux dynamiques normalisés selon le palier max atteint.
 * - Retourne uniquement les raretés débloquées.
 * - Les taux progressent linéairement entre rateAtUnlock et rateAtMax.
 * - La somme est toujours normalisée à exactement 100%.
 */
export function getDynamicRates(maxPalier: number): Partial<Record<Rarity, number>> {
  const raw: Partial<Record<Rarity, number>> = {};
  let total = 0;

  for (const r of RARITY_ORDER) {
    const gate = RARITY_GATES[r];
    if (maxPalier < gate.unlockPalier) continue;

    // Interpolation linéaire entre unlock et max
    const range = MAX_PALIER - gate.unlockPalier;
    const progress = range <= 0 ? 1 : (maxPalier - gate.unlockPalier) / range;
    const rate = gate.rateAtUnlock + (gate.rateAtMax - gate.rateAtUnlock) * progress;

    raw[r] = Math.max(0, rate);
    total += raw[r]!;
  }

  // Normalisation à 100%
  if (total === 0) return { C: 100 };
  const normalized: Partial<Record<Rarity, number>> = {};
  for (const [r, v] of Object.entries(raw) as [Rarity, number][]) {
    normalized[r] = parseFloat(((v / total) * 100).toFixed(4));
  }
  return normalized;
}

export function rollRarity(maxPalier = 1): Rarity {
  const rates = getDynamicRates(maxPalier);
  const rand = Math.random() * 100;
  let cum = 0;
  for (const r of RARITY_ORDER) {
    cum += rates[r] ?? 0;
    if (rand <= cum) return r;
  }
  return 'C';
}

export function rollCharacter(maxPalier = 1): string {
  const rarity = rollRarity(maxPalier);
  const pool   = BANNER_POOL.filter(c => c.rarity === rarity);
  if (pool.length === 0) {
    const fallback = BANNER_POOL.filter(c => c.rarity === 'R');
    return fallback[Math.floor(Math.random() * fallback.length)].id;
  }
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function rollMulti(maxPalier = 1): string[] {
  return Array.from({ length: 10 }, () => rollCharacter(maxPalier));
}

export function rollMulti100(maxPalier = 1): string[] {
  return Array.from({ length: 100 }, () => rollCharacter(maxPalier));
}

// Pour compatibilité avec les affichages (taux à palier actuel)
export const DISPLAY_RATES = getDynamicRates;

