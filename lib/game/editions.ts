// ═══════════════════════════════════════════════════════════════════════════
// ÉDITIONS DE CARTE (« shiny ») — tirées une seule fois, à la PREMIÈRE
// obtention d'un personnage (jamais rerollées sur les doublons ensuite).
// ═══════════════════════════════════════════════════════════════════════════

export type CardEdition = 'base' | 'gold' | 'diamond';

export interface EditionInfo {
  label: string;
  color: string;
  glow: string;
  statMult: number; // multiplicateur appliqué au DPS de base du perso
  dropChancePct: number;
}

export const EDITION_CONFIG: Record<CardEdition, EditionInfo> = {
  base:    { label: 'Édition Standard', color: '#9ca3af', glow: '#6b7280', statMult: 1,   dropChancePct: 94.92 },
  gold:    { label: 'Édition Or',       color: '#fbbf24', glow: '#f59e0b', statMult: 2.5, dropChancePct: 4.07 },
  diamond: { label: 'Édition Diamant',  color: '#67e8f9', glow: '#22d3ee', statMult: 4.5, dropChancePct: 1.01 },
};

/** Tire une édition au hasard, pondérée par les chances ci-dessus. */
export function rollCardEdition(): CardEdition {
  const r = Math.random() * 100;
  if (r < EDITION_CONFIG.diamond.dropChancePct) return 'diamond';
  if (r < EDITION_CONFIG.diamond.dropChancePct + EDITION_CONFIG.gold.dropChancePct) return 'gold';
  return 'base';
}

export function getEditionStatMult(edition: CardEdition | undefined): number {
  return EDITION_CONFIG[edition ?? 'base'].statMult;
}

// ── Clé d'instance de collection ────────────────────────────────────────
// Chaque édition (Base/Or/Diamant) d'un personnage est une entrée SÉPARÉE
// de la collection (rang/niveau/copies indépendants), tout en partageant le
// même art/nom/ultime (le "templateId" pur, via characters.ts).
// Base = pas de suffixe (rétro-compatible avec les sauvegardes existantes).
export function makeInstanceKey(templateId: string, edition: CardEdition): string {
  return edition === 'base' ? templateId : `${templateId}::${edition}`;
}

export function parseInstanceKey(key: string): { templateId: string; edition: CardEdition } {
  const i = key.indexOf('::');
  if (i === -1) return { templateId: key, edition: 'base' };
  const editionPart = key.slice(i + 2);
  const edition: CardEdition = (editionPart === 'gold' || editionPart === 'diamond') ? editionPart : 'base';
  return { templateId: key.slice(0, i), edition };
}
