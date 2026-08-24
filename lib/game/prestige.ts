// lib/game/prestige.ts — Définitions du système de Prestige (New Game+)
//
// Un prestige donne des jetons ; dépenser un jeton (voir prestigeStore.spendToken)
// tire au hasard UN des 6 bonus ci-dessous et l'incrémente d'un niveau. Chaque
// niveau applique `perLevel` (stack sans limite, sauf shinyGold/shinyDiamond
// plafonnés à `maxLevel`).

export type PrestigeBonusType =
  | 'dps' | 'gold' | 'shinyGold' | 'shinyDiamond' | 'equipDrop' | 'tokenGain';

export interface PrestigeBonusDef {
  label:     string;
  icon:      string;
  perLevel:  number;
  maxLevel?: number;
}

export const PRESTIGE_BONUS_DEFS: Record<PrestigeBonusType, PrestigeBonusDef> = {
  dps:          { label: 'DPS',                          icon: '🔥', perLevel: 0.10 },
  gold:         { label: 'Golds',                         icon: '🪙', perLevel: 0.10 },
  shinyGold:    { label: 'Taux Shiny Or',                 icon: '✨', perLevel: 0.25, maxLevel: 20 },
  shinyDiamond: { label: 'Taux Shiny Diamant',            icon: '💠', perLevel: 0.05, maxLevel: 20 },
  equipDrop:    { label: 'Taux de drop d\'équipements',  icon: '🛡️', perLevel: 0.10 },
  tokenGain:    { label: 'Jetons de Prestige supplémentaires gagnés',     icon: '🎫', perLevel: 1 },
};

export const PRESTIGE_BONUS_TYPES = Object.keys(PRESTIGE_BONUS_DEFS) as PrestigeBonusType[];

export type PrestigeBonusLevels = Record<PrestigeBonusType, number>;

export function initialBonusLevels(): PrestigeBonusLevels {
  return { dps: 0, gold: 0, shinyGold: 0, shinyDiamond: 0, equipDrop: 0, tokenGain: 0 };
}

export interface ActivePrestigeBonuses {
  dpsMult:              number;
  coinsMult:            number;
  shinyGoldBonusPct:    number;
  shinyDiamondBonusPct: number;
  equipDropRateMult:    number;
  tokenGainBonus:       number;
}

export function calcPrestigeBonuses(bonusLevels: PrestigeBonusLevels): ActivePrestigeBonuses {
  return {
    dpsMult:              1 + PRESTIGE_BONUS_DEFS.dps.perLevel * bonusLevels.dps,
    coinsMult:            1 + PRESTIGE_BONUS_DEFS.gold.perLevel * bonusLevels.gold,
    shinyGoldBonusPct:    PRESTIGE_BONUS_DEFS.shinyGold.perLevel * bonusLevels.shinyGold,
    shinyDiamondBonusPct: PRESTIGE_BONUS_DEFS.shinyDiamond.perLevel * bonusLevels.shinyDiamond,
    equipDropRateMult:    1 + PRESTIGE_BONUS_DEFS.equipDrop.perLevel * bonusLevels.equipDrop,
    tokenGainBonus:       PRESTIGE_BONUS_DEFS.tokenGain.perLevel * bonusLevels.tokenGain,
  };
}

// Jetons gagnés en prestigeant au palier `maxPalierReached` (>=41) :
// ARRONDI(1 + 2*((palier-40)/10)^1,7 ; 0), plus le bonus tokenGain éventuel.
export function calcTokensAwarded(maxPalierReached: number, tokenGainBonus: number): number {
  return Math.round(1 + 2 * Math.pow((maxPalierReached - 40) / 10, 1.7)) + tokenGainBonus;
}

// ── Bonus "Mémoire des Rangs" — achat DIRECT (pas de tirage aléatoire) ─────
// Chaque niveau (6 max) permet, lors de la toute première obtention d'une
// carte après un Prestige, de la récupérer directement au rang qu'elle avait
// atteint dans une vie précédente — plafonné à (niveau + 1)★ — au lieu de
// repartir à 1★. Coût multiplié par 10 à chaque niveau (10 → 100 → ... →
// 1 000 000 jetons). Voir historicalMaxRank/addToCollection dans gameStore.ts.
export const RANK_RECOVERY_MAX_LEVEL = 6;
export const RANK_RECOVERY_COSTS: number[] = [10, 100, 1_000, 10_000, 100_000, 1_000_000];

export function getRankRecoveryCost(currentLevel: number): number | null {
  return currentLevel < RANK_RECOVERY_MAX_LEVEL ? RANK_RECOVERY_COSTS[currentLevel] : null;
}

// Rang max récupérable pour ce niveau (0 = bonus pas encore acheté = pas de récupération).
export function rankRecoveryCap(level: number): number {
  return level > 0 ? level + 1 : 0;
}
