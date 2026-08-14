// ═══════════════════════════════════════════════════════════════════════════
// Système de TYPES (affinités) — chaîne cyclique de 8 types.
// Chaos > Ordre > Stase > Volonté > Vitalité > Éther > Néant > Harmonie > (Chaos)
// Chaque type est FORT contre le suivant et FAIBLE contre le précédent.
// ═══════════════════════════════════════════════════════════════════════════

export type Affinity =
  | 'chaos' | 'ordre' | 'stase' | 'volonte'
  | 'vitalite' | 'ether' | 'neant' | 'harmonie';

// Ordre du cycle : chaque type bat le suivant.
export const AFFINITY_ORDER: Affinity[] = [
  'chaos', 'ordre', 'stase', 'volonte', 'vitalite', 'ether', 'neant', 'harmonie',
];

export interface AffinityInfo { label: string; color: string; glow: string; icon: string; }

export const AFFINITY_CONFIG: Record<Affinity, AffinityInfo> = {
  chaos:    { label: 'Chaos',    color: '#ef4444', glow: '#b91c1c', icon: '🌀' },
  ordre:    { label: 'Ordre',    color: '#3b82f6', glow: '#1d4ed8', icon: '⚖️' },
  stase:    { label: 'Stase',    color: '#22d3ee', glow: '#0891b2', icon: '🧊' },
  volonte:  { label: 'Volonté',  color: '#f59e0b', glow: '#b45309', icon: '🔥' },
  vitalite: { label: 'Vitalité', color: '#4ade80', glow: '#16a34a', icon: '🌿' },
  ether:    { label: 'Éther',    color: '#c084fc', glow: '#9333ea', icon: '✨' },
  neant:    { label: 'Néant',    color: '#94a3b8', glow: '#475569', icon: '🌑' },
  harmonie: { label: 'Harmonie', color: '#f9a8d4', glow: '#db2777', icon: '🎶' },
};

// Multiplicateurs de matchup (ajustables ici).
export const AFFINITY_STRONG = 1.5; // avantage : +50% de dégâts
export const AFFINITY_WEAK   = 0.6; // désavantage : -40% de dégâts

const _idx = (a: Affinity) => AFFINITY_ORDER.indexOf(a);
const N = AFFINITY_ORDER.length;

/** Le type que `a` bat (le suivant dans le cycle). */
export function affinityBeats(a: Affinity): Affinity {
  return AFFINITY_ORDER[(_idx(a) + 1) % N];
}
/** Le type qui bat `a` (le précédent dans le cycle). */
export function affinityBeatenBy(a: Affinity): Affinity {
  return AFFINITY_ORDER[(_idx(a) + N - 1) % N];
}

/** Multiplicateur de dégâts de l'attaquant contre le défenseur. */
export function getAffinityMultiplier(atk: Affinity, def: Affinity): number {
  if (atk === def) return 1;
  if (affinityBeats(atk) === def) return AFFINITY_STRONG; // atk bat def
  if (affinityBeatenBy(atk) === def) return AFFINITY_WEAK; // def bat atk
  return 1; // neutre
}

// Hash stable d'une chaîne → entier positif.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}

// Types forcés pour certains persos (prioritaires sur le hash automatique) —
// utile quand le lore/design veut un type précis plutôt que le tirage déterministe.
const AFFINITY_OVERRIDES: Partial<Record<string, Affinity>> = {
  vegeta: 'ordre',
};

/** Type déterministe à partir d'un identifiant (perso ou nom d'ennemi). */
export function getAffinityForId(id: string): Affinity {
  return AFFINITY_OVERRIDES[id] ?? AFFINITY_ORDER[hashStr(id || '') % N];
}

/** Libellé court de l'avantage : 'strong' | 'weak' | 'neutral'. */
export function affinityMatchupKind(atk: Affinity, def: Affinity): 'strong' | 'weak' | 'neutral' {
  const m = getAffinityMultiplier(atk, def);
  return m > 1 ? 'strong' : m < 1 ? 'weak' : 'neutral';
}
