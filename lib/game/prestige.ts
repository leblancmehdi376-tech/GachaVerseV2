// lib/game/prestige.ts — Définitions du système de Prestige (New Game+)
//
// Un prestige donne des jetons ; dépenser un jeton (voir prestigeStore.spendToken)
// tire au hasard UN des 5 bonus ci-dessous et l'incrémente d'un niveau. Chaque
// niveau applique `perLevel` (stack sans limite, sauf editionRate plafonné à
// `maxLevel`).
import { EDITION_CONFIG, EDITION_ORDER, type CardEdition } from './editions';

export type PrestigeBonusType =
  | 'dps' | 'gold' | 'editionRate' | 'equipDrop' | 'tokenGain';

export interface PrestigeBonusDef {
  label:     string;
  icon:      string;
  perLevel:  number;
  maxLevel?: number;
}

export const PRESTIGE_BONUS_DEFS: Record<PrestigeBonusType, PrestigeBonusDef> = {
  dps:          { label: 'DPS',                          icon: '🔥', perLevel: 0.10 },
  gold:         { label: 'Golds',                         icon: '🪙', perLevel: 0.10 },
  // +2.5% RELATIFS sur les chances de toutes les éditions au-dessus de
  // Normale (×2 au niveau max) — remplace Taux Shiny Or / Taux Shiny Diamant.
  editionRate:  { label: 'Taux d\'édition',               icon: '✨', perLevel: 0.025, maxLevel: 40 },
  equipDrop:    { label: 'Taux de drop d\'équipements',  icon: '🛡️', perLevel: 0.10 },
  tokenGain:    { label: 'Jetons bonus',  icon: '🎫', perLevel: 1 },
};

export const PRESTIGE_BONUS_TYPES = Object.keys(PRESTIGE_BONUS_DEFS) as PrestigeBonusType[];

export type PrestigeBonusLevels = Record<PrestigeBonusType, number>;

export function initialBonusLevels(): PrestigeBonusLevels {
  return { dps: 0, gold: 0, editionRate: 0, equipDrop: 0, tokenGain: 0 };
}

export interface ActivePrestigeBonuses {
  dpsMult:              number;
  coinsMult:            number;
  editionRateBonusPct:  number;
  equipDropRateMult:    number;
  tokenGainBonus:       number;
}

export function calcPrestigeBonuses(bonusLevels: PrestigeBonusLevels): ActivePrestigeBonuses {
  return {
    dpsMult:              1 + PRESTIGE_BONUS_DEFS.dps.perLevel * bonusLevels.dps,
    coinsMult:            1 + PRESTIGE_BONUS_DEFS.gold.perLevel * bonusLevels.gold,
    editionRateBonusPct:  PRESTIGE_BONUS_DEFS.editionRate.perLevel * bonusLevels.editionRate * 100,
    equipDropRateMult:    1 + PRESTIGE_BONUS_DEFS.equipDrop.perLevel * bonusLevels.equipDrop,
    tokenGainBonus:       PRESTIGE_BONUS_DEFS.tokenGain.perLevel * bonusLevels.tokenGain,
  };
}

// Valeur totale d'un bonus à ce niveau, telle qu'affichée (page Prestige, admin).
export function formatBonusValue(type: PrestigeBonusType, level: number): string {
  const def = PRESTIGE_BONUS_DEFS[type];
  const total = def.perLevel * level;
  if (type === 'tokenGain') return `+${total}`;
  if (type === 'editionRate') return `+${(total * 100).toFixed(1)}%`;
  return `+${(total * 100).toFixed(0)}%`;
}

// Niveaux de bonus lus depuis une sauvegarde brute (champs manquants → 0).
// Les anciens niveaux Taux Shiny Or + Taux Shiny Diamant (20 max chacun) sont
// additionnés dans Taux d'édition (40 max).
export function coerceBonusLevels(raw: unknown): PrestigeBonusLevels {
  const levels = initialBonusLevels();
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const type of PRESTIGE_BONUS_TYPES) {
      const v = r[type];
      if (typeof v === 'number') levels[type] = v;
    }
    if (typeof r.editionRate !== 'number') {
      const legacy = (typeof r.shinyGold === 'number' ? r.shinyGold : 0) + (typeof r.shinyDiamond === 'number' ? r.shinyDiamond : 0);
      levels.editionRate = Math.min(PRESTIGE_BONUS_DEFS.editionRate.maxLevel!, legacy);
    }
  }
  return levels;
}

// Jetons gagnés en prestigeant au palier `maxPalierReached` (>=41) :
// ARRONDI(1 + 2*((palier-40)/10)^1,7 ; 0), plus le bonus tokenGain éventuel.
export function calcTokensAwarded(maxPalierReached: number, tokenGainBonus: number): number {
  return Math.round(1 + 2 * Math.pow((maxPalierReached - 40) / 10, 1.7)) + tokenGainBonus;
}

// ── Bonus "Mémoire des Pierres" — achat DIRECT (pas de tirage aléatoire) ───
// Chaque niveau (7 max) permet, lors de la toute première obtention d'une
// carte après un Prestige, de lui rendre la jauge d'édition qu'elle avait
// atteinte dans une vie précédente — plafonnée au palier d'édition du niveau
// (niv. 1 = Bronze … niv. 7 = Prismatique). Coût ×10 à chaque niveau
// (10 → 100 → … → 10 000 000 jetons). Voir historicalEditionPoints /
// addToCollection. Le niveau reste stocké dans prestigeRankRecoveryLevel
// (nom historique, ex-"Mémoire des Rangs").
export const STONE_MEMORY_MAX_LEVEL = 7;
export const STONE_MEMORY_COSTS: number[] = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];

export function getStoneMemoryCost(currentLevel: number): number | null {
  return currentLevel < STONE_MEMORY_MAX_LEVEL ? STONE_MEMORY_COSTS[currentLevel] : null;
}

// Édition max récupérable pour ce niveau (null = bonus pas encore acheté).
export function stoneMemoryCapEdition(level: number): CardEdition | null {
  return level > 0 ? EDITION_ORDER[Math.min(level, EDITION_ORDER.length - 1)] : null;
}

// Points de jauge max récupérables pour ce niveau (0 = pas de récupération).
export function stoneMemoryCapPoints(level: number): number {
  const ed = stoneMemoryCapEdition(level);
  return ed ? EDITION_CONFIG[ed].points : 0;
}
