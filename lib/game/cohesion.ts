// ── Cohésion d'équipe ─────────────────────────────────────────────────────
// Multiplicateur de DPS appliqué UNIQUEMENT au combat de l'accueil
// (getTotalDps / getCharDpsBreakdown) — ni aux raids, ni aux expéditions.
//
// Récompense une équipe aux niveaux resserrés, pénalise une équipe déséquilibrée :
//   écart moyen = moyenne des écarts de niveau des 3 autres slots avec le plus haut
//   écart eff.  = max(0, écart moyen − COHESION_FREE_GAP) (≤ 10 niv. d'écart = bonus plein)
//   tolérance G = COHESION_TOLERANCE_K × √(niveau max)   (32 niv. au 10, 100 au 100, 316 au 1000)
//   C           = max(0, 1 − écart eff. / G)              ∈ [0, 1]
//   w           = min(1, niveau max / COHESION_MALUS_FULL_LEVEL)
//   mult        = 1 + B·C³ − B·w·(1 − C³)                 ∈ [1 − B, 1 + B]
// La tolérance croît moins vite que le niveau et le malus n'est pleinement
// actif qu'à partir de COHESION_MALUS_FULL_LEVEL : le début de partie est
// quasi toujours en bonus, la fin de partie exige une équipe serrée.
// Un slot vide compte comme un compagnon de niveau 0.
export const COHESION_TEAM_SIZE = 4;
export const COHESION_AMPLITUDE = 0.2;          // B : ±20 % max
export const COHESION_TOLERANCE_K = 10;         // G = K·√(niveau max)
export const COHESION_MALUS_FULL_LEVEL = 300;   // niveau max à partir duquel le malus est plein
export const COHESION_FREE_GAP = 10;            // écart moyen (en niveaux) sans aucune pénalité

export interface CohesionResult {
  cohesion: number;     // C ∈ [0, 1]
  mult: number;         // multiplicateur de DPS ∈ [1 − B, 1 + B]
  maxLevel: number;
  avgGap: number;       // écart moyen des 3 autres slots avec le plus haut
  tolerance: number;    // G
  malusWeight: number;  // w ∈ [0, 1]
  emptySlots: number;
}

export function computeCohesion(levels: number[]): CohesionResult {
  const slots = Array.from({ length: COHESION_TEAM_SIZE }, (_, i) => Math.max(0, levels[i] ?? 0));
  const emptySlots = slots.filter(l => l === 0).length;
  const maxLevel = Math.max(...slots);
  if (maxLevel <= 0) return { cohesion: 0, mult: 1, maxLevel: 0, avgGap: 0, tolerance: 0, malusWeight: 0, emptySlots };

  const totalGap = slots.reduce((sum, l) => sum + (maxLevel - l), 0);
  const avgGap = totalGap / (COHESION_TEAM_SIZE - 1);
  const tolerance = COHESION_TOLERANCE_K * Math.sqrt(maxLevel);
  const cohesion = Math.max(0, 1 - Math.max(0, avgGap - COHESION_FREE_GAP) / tolerance);
  const c3 = cohesion ** 3;
  const malusWeight = Math.min(1, maxLevel / COHESION_MALUS_FULL_LEVEL);
  const mult = 1 + COHESION_AMPLITUDE * c3 - COHESION_AMPLITUDE * malusWeight * (1 - c3);
  return { cohesion, mult, maxLevel, avgGap, tolerance, malusWeight, emptySlots };
}
