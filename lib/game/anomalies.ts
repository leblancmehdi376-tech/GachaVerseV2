// lib/game/anomalies.ts — Système d'Anomalies : bonus passifs PERMANENTS
// (jamais réinitialisés par le Prestige, voir metaProgressionSlice.ts::doPrestige,
// qui ne les touche pas — même traitement que bossCrowns/voidOrbs).
//
// Obtention : 1 Jeton d'Anomalie tous les 100 tirages gacha cumulés (voir
// gachaSlice.ts). 1 Jeton = 1 tirage aléatoire pondéré par rareté (voir
// ANOMALY_RARITY_TABLE), qui retire toutes les anomalies NON verrouillées et
// les remplace. Réutilise directement le type Rarity/RARITY_CONFIG existant
// (types/game.ts) : mêmes 10 paliers, mêmes couleurs, pas de doublon à maintenir.
import { Rarity, RARITY_ORDER_ASC } from '@/types/game';
import { Affinity, AFFINITY_ORDER } from './affinities';
import { SYNERGIES_LIST } from './synergies';

export type AnomalyBonusType =
  | 'synergyBoost' | 'typeDamage' | 'goldGain' | 'globalDps' | 'gachaCostReduction' | 'upgradeCostReduction';

export const ANOMALY_BONUS_TYPES: AnomalyBonusType[] = [
  'synergyBoost', 'typeDamage', 'goldGain', 'globalDps', 'gachaCostReduction', 'upgradeCostReduction',
];

export interface AnomalyBonusDef {
  label: string;
  icon: string;
  // true si la valeur cible un univers (synergyBoost) ou un type (typeDamage) précis.
  hasTarget: boolean;
}

export const ANOMALY_BONUS_DEFS: Record<AnomalyBonusType, AnomalyBonusDef> = {
  synergyBoost:         { label: 'Boost Synergie Spécifique', icon: '🔗', hasTarget: true },
  typeDamage:           { label: 'Dégâts de Type',            icon: '⚔️', hasTarget: true },
  goldGain:             { label: 'Gain de Gold',               icon: '🪙', hasTarget: false },
  globalDps:            { label: 'DPS Global',                 icon: '🔥', hasTarget: false },
  gachaCostReduction:   { label: 'Réduc. Coût Gacha',          icon: '💎', hasTarget: false },
  upgradeCostReduction: { label: 'Réduc. Coût Amélioration',   icon: '⬆️', hasTarget: false },
};

// ── Table d'équilibrage (taux de drop % + plage min-max % par type de bonus) ──
// Valeurs reprises telles quelles du barème fourni. gachaCostReduction est une
// valeur FIXE par rareté (pas une plage) dans le barème d'origine — modélisée
// ici comme [v, v] pour rester dans le même format que rollAnomalyValue().
export const ANOMALY_RARITY_TABLE: Record<Rarity, {
  dropRate: number; // % (somme = 100 sur les 10 raretés)
  ranges: Record<AnomalyBonusType, [number, number]>;
}> = {
  C:  { dropRate: 50,   ranges: { synergyBoost:[1,3],     typeDamage:[1,2],     goldGain:[1,6],     globalDps:[0.1,0.3],  gachaCostReduction:[0.1,0.1], upgradeCostReduction:[1,3]     } },
  U:  { dropRate: 25,   ranges: { synergyBoost:[4,8],     typeDamage:[3,4],     goldGain:[7,16],    globalDps:[0.4,0.8],  gachaCostReduction:[0.2,0.2], upgradeCostReduction:[4,8]     } },
  R:  { dropRate: 12.15,ranges: { synergyBoost:[9,16],    typeDamage:[5,8],     goldGain:[17,32],   globalDps:[0.9,1.6],  gachaCostReduction:[0.4,0.4], upgradeCostReduction:[9,16]    } },
  E:  { dropRate: 6,    ranges: { synergyBoost:[17,30],   typeDamage:[9,15],    goldGain:[33,60],   globalDps:[1.7,3.0],  gachaCostReduction:[0.8,0.8], upgradeCostReduction:[17,30]   } },
  L:  { dropRate: 3,    ranges: { synergyBoost:[31,50],   typeDamage:[16,25],   goldGain:[61,100],  globalDps:[3.1,5.0],  gachaCostReduction:[1.5,1.5], upgradeCostReduction:[31,50]   } },
  M:  { dropRate: 2,    ranges: { synergyBoost:[51,76],   typeDamage:[26,38],   goldGain:[101,152], globalDps:[5.1,7.6],  gachaCostReduction:[2.5,2.5], upgradeCostReduction:[51,76]   } },
  S:  { dropRate: 1,    ranges: { synergyBoost:[77,110],  typeDamage:[39,55],   goldGain:[153,220], globalDps:[7.7,11.0], gachaCostReduction:[4.0,4.0], upgradeCostReduction:[77,110]  } },
  CO: { dropRate: 0.5,  ranges: { synergyBoost:[111,146], typeDamage:[56,73],   goldGain:[221,292], globalDps:[11.1,14.6],gachaCostReduction:[6.0,6.0], upgradeCostReduction:[111,146] } },
  P:  { dropRate: 0.25, ranges: { synergyBoost:[147,180], typeDamage:[74,90],   goldGain:[293,360], globalDps:[14.7,18.0],gachaCostReduction:[8.5,8.5], upgradeCostReduction:[147,180] } },
  T:  { dropRate: 0.1,  ranges: { synergyBoost:[181,200], typeDamage:[91,100],  goldGain:[361,400], globalDps:[19.0,20.0],gachaCostReduction:[10.0,10.0],upgradeCostReduction:[181,200] } },
};

// Ordre décroissant (rareté la plus haute d'abord) — juste pour l'affichage du tableau récap.
export const ANOMALY_RARITY_ORDER_DESC: Rarity[] = [...RARITY_ORDER_ASC].reverse();

export interface Anomaly {
  id: string;
  rarity: Rarity;
  bonusType: AnomalyBonusType;
  value: number; // en points de pourcentage (ex: 12.34 = +12.34%)
  // Univers ciblé (synergyBoost) ou Affinité ciblée (typeDamage) — `null` pour
  // les 4 autres types de bonus (effet global, pas de cible). TOUJOURS `null`
  // et jamais `undefined` ici : ces anomalies finissent dans un tableau
  // sérialisé vers Firestore (setDoc), qui rejette toute valeur `undefined`
  // (même imbriquée dans un tableau) — voir calcAnomalyBonuses/rollAnomaly.
  target: string | null;
  locked: boolean;
}

export function rollAnomalyRarity(): Rarity {
  const rand = Math.random() * 100;
  let cum = 0;
  for (const r of RARITY_ORDER_ASC) {
    cum += ANOMALY_RARITY_TABLE[r].dropRate;
    if (rand <= cum) return r;
  }
  return 'C';
}

let _anomalySeq = 0;
export function rollAnomaly(): Anomaly {
  const rarity = rollAnomalyRarity();
  const bonusType = ANOMALY_BONUS_TYPES[Math.floor(Math.random() * ANOMALY_BONUS_TYPES.length)];
  const [min, max] = ANOMALY_RARITY_TABLE[rarity].ranges[bonusType];
  const value = min + Math.random() * (max - min);
  const target = bonusType === 'synergyBoost'
    ? SYNERGIES_LIST[Math.floor(Math.random() * SYNERGIES_LIST.length)].universe
    : bonusType === 'typeDamage'
      ? AFFINITY_ORDER[Math.floor(Math.random() * AFFINITY_ORDER.length)]
      : null;
  return { id: `anom_${Date.now()}_${_anomalySeq++}`, rarity, bonusType, value, target, locked: false };
}

// ── Reroll : coût de base × 2 par anomalie verrouillée ─────────────────────
export const ANOMALY_REROLL_BASE_COST = 1;
export function getAnomalyRerollCost(lockedCount: number): number {
  return ANOMALY_REROLL_BASE_COST * Math.pow(2, lockedCount);
}

// ── Emplacements (Boss Crown Upgrade) ───────────────────────────────────────
// Débloqué uniquement après ≥1 Prestige (voir AnomaliePage.tsx). Coûts très
// élevés (end-game) — index 0 = coût du 2e emplacement, etc. Max 5 emplacements.
export const ANOMALY_MAX_SLOTS = 5;
export const ANOMALY_SLOT_COSTS_CROWNS: number[] = [100, 500, 1_000, 2_000];

export function getAnomalySlotCost(currentSlots: number): number | null {
  const idx = currentSlots - 1; // slots=1 -> achète le 2e -> index 0
  return idx >= 0 && idx < ANOMALY_SLOT_COSTS_CROWNS.length ? ANOMALY_SLOT_COSTS_CROWNS[idx] : null;
}

// ── Agrégation des bonus actifs (toutes les anomalies POSSÉDÉES comptent,
// verrouillées ou non — le verrou ne protège que du reroll) ────────────────
export interface AnomalyBonusTotals {
  globalDpsMult: number;
  goldGainMult: number;
  gachaCostReductionPct: number;   // fraction 0..1
  upgradeCostReductionPct: number; // fraction 0..1
  synergyBoostByUniverse: Record<string, number>; // fraction 0..1
  typeDamageByAffinity: Record<Affinity, number>; // fraction 0..1
}

// Plafonds de sécurité sur les réductions de coût — évite un coût négatif/nul
// si un joueur venait à cumuler des dizaines d'anomalies du même type.
const MAX_COST_REDUCTION = 0.9;

export function calcAnomalyBonuses(anomalies: Anomaly[]): AnomalyBonusTotals {
  const totals: AnomalyBonusTotals = {
    globalDpsMult: 1,
    goldGainMult: 1,
    gachaCostReductionPct: 0,
    upgradeCostReductionPct: 0,
    synergyBoostByUniverse: {},
    typeDamageByAffinity: {} as Record<Affinity, number>,
  };
  for (const a of anomalies) {
    const frac = a.value / 100;
    switch (a.bonusType) {
      case 'globalDps': totals.globalDpsMult += frac; break;
      case 'goldGain': totals.goldGainMult += frac; break;
      case 'gachaCostReduction': totals.gachaCostReductionPct = Math.min(MAX_COST_REDUCTION, totals.gachaCostReductionPct + frac); break;
      case 'upgradeCostReduction': totals.upgradeCostReductionPct = Math.min(MAX_COST_REDUCTION, totals.upgradeCostReductionPct + frac); break;
      case 'synergyBoost':
        if (a.target) totals.synergyBoostByUniverse[a.target] = (totals.synergyBoostByUniverse[a.target] ?? 0) + frac;
        break;
      case 'typeDamage':
        if (a.target) {
          const key = a.target as Affinity;
          totals.typeDamageByAffinity[key] = (totals.typeDamageByAffinity[key] ?? 0) + frac;
        }
        break;
    }
  }
  return totals;
}
