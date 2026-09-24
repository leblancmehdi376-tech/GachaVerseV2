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
// Barème fourni tel quel par le design (rework "buff anomalies", valeurs
// maximales en rareté Transcendant : synergyBoost 600%, typeDamage 300%,
// goldGain 400%, globalDps 100%, gachaCostReduction/upgradeCostReduction
// 15%). synergyBoost/typeDamage visent plus haut que goldGain/globalDps car
// ce sont des bonus CIBLÉS : synergyBoost ne profite qu'aux persos équipés de
// l'univers tiré (1 chance sur ~37), typeDamage qu'à ceux de l'affinité
// tirée (1 chance sur 8) — contrairement à goldGain/globalDps qui s'appliquent
// toujours à 100% des golds/DPS de l'équipe. gachaCostReduction et
// upgradeCostReduction sont deux VRAIES plages par rareté (elles étaient
// modélisées en [v, v], une valeur fixe, historiquement) et partagent
// EXACTEMENT la même plage à chaque rareté — pas de raison de faire sens
// différemment pour deux réductions de coût équivalentes ; leur total cumulé
// reste plafonné à 90% (MAX_COST_REDUCTION) même si ce plafond n'est en
// pratique jamais atteignable avec les 5 emplacements max actuels (5×15%=75%).
// Pour TOUS les types de bonus, les paliers ne se touchent ni ne se
// chevauchent JAMAIS (le min d'une rareté est toujours strictement supérieur
// au max de la précédente) — invariant vérifié par un test dédié dans
// anomalies.test.ts (ex-bug corrigé : le max de Stellaire et le min de
// Cosmique pouvaient être identiques sur gachaCostReduction/upgradeCostReduction).
export const ANOMALY_RARITY_TABLE: Record<Rarity, {
  dropRate: number; // % (somme = 100 sur les 10 raretés)
  ranges: Record<AnomalyBonusType, [number, number]>;
}> = {
  C:  { dropRate: 50,   ranges: { synergyBoost:[1,6],     typeDamage:[1,3],     goldGain:[1,4],     globalDps:[0.20,1.00], gachaCostReduction:[0.05,0.15], upgradeCostReduction:[0.05,0.15] } },
  U:  { dropRate: 25,   ranges: { synergyBoost:[8,18],    typeDamage:[4,9],     goldGain:[5,11],    globalDps:[1.20,3.00], gachaCostReduction:[0.2,0.4],   upgradeCostReduction:[0.2,0.4]   } },
  R:  { dropRate: 12.15,ranges: { synergyBoost:[20,38],   typeDamage:[10,19],   goldGain:[12,24],   globalDps:[3.20,6.40], gachaCostReduction:[0.5,0.9],   upgradeCostReduction:[0.5,0.9]   } },
  E:  { dropRate: 6,    ranges: { synergyBoost:[42,74],   typeDamage:[21,37],   goldGain:[26,46],   globalDps:[6.80,12.00],gachaCostReduction:[1.0,1.8],   upgradeCostReduction:[1.0,1.8]   } },
  L:  { dropRate: 3,    ranges: { synergyBoost:[78,120],  typeDamage:[39,60],   goldGain:[48,75],   globalDps:[12.50,19.00],gachaCostReduction:[1.9,2.8],  upgradeCostReduction:[1.9,2.8]   } },
  M:  { dropRate: 2,    ranges: { synergyBoost:[125,180], typeDamage:[62,90],   goldGain:[78,110],  globalDps:[20.00,29.00],gachaCostReduction:[3.0,4.2],  upgradeCostReduction:[3.0,4.2]   } },
  S:  { dropRate: 1,    ranges: { synergyBoost:[185,255], typeDamage:[92,127],  goldGain:[115,155], globalDps:[30.00,41.00],gachaCostReduction:[4.4,6.0],  upgradeCostReduction:[4.4,6.0]   } },
  CO: { dropRate: 0.5,  ranges: { synergyBoost:[260,345], typeDamage:[130,172], goldGain:[160,215], globalDps:[42.00,55.50],gachaCostReduction:[6.2,8.2],  upgradeCostReduction:[6.2,8.2]   } },
  P:  { dropRate: 0.25, ranges: { synergyBoost:[350,450], typeDamage:[175,225], goldGain:[220,295], globalDps:[57.00,74.00],gachaCostReduction:[8.5,11.0], upgradeCostReduction:[8.5,11.0]  } },
  T:  { dropRate: 0.1,  ranges: { synergyBoost:[460,600], typeDamage:[230,300], goldGain:[300,400], globalDps:[76.00,100.00],gachaCostReduction:[11.5,15.0],upgradeCostReduction:[11.5,15.0] } },
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

// Migration : remet dans la plage ACTUELLE du barème (potentiellement retouché
// depuis le tirage — ex: rework qui a ramené l'échelle de upgradeCostReduction
// de 1-200% à 0.2-15%, voir le commentaire sur ANOMALY_RARITY_TABLE) toute
// anomalie possédée dont la `value` persistée n'y correspond plus. Générique
// sur les 6 types de bonus (pas seulement les 2 plafonnés) pour rester
// correcte si un futur rework retouche une autre plage. Retire une nouvelle
// valeur aléatoire DANS la plage courante (même logique que rollAnomaly) au
// lieu d'un simple clamp — évite d'empiler tous les joueurs migrés pile sur le
// max. Doit tourner à CHAQUE réhydratation (gameStore.ts::merge ET
// cloudSaveSync.ts::applyRemoteState — les deux chemins de chargement, local et
// cloud, ne partagent pas la même logique) ; idempotente : une anomalie déjà
// dans la bonne plage n'est jamais retirée une seconde fois.
export function migrateAnomalyValue(a: Anomaly): Anomaly {
  const [min, max] = ANOMALY_RARITY_TABLE[a.rarity].ranges[a.bonusType];
  if (a.value >= min && a.value <= max) return a;
  return { ...a, value: min + Math.random() * (max - min) };
}

export function migrateAnomalies(anomalies: Anomaly[]): Anomaly[] {
  return anomalies.map(migrateAnomalyValue);
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
