// ═══════════════════════════════════════════════════════════════════════════
// ÉDITIONS DE CARTE — UNE seule carte par personnage, dont l'édition monte
// via une JAUGE de points. Chaque carte tirée (doublon compris) ajoute la
// valeur de son édition à la jauge du perso ; l'édition affichée est le plus
// haut palier atteint (jamais consommé, la jauge ne fait que monter).
// Chaque palier vaut le double du précédent : 2 Normales = 1 Bronze,
// 2 Bronzes = 1 Or, 2 Bronzes + 4 Normales = 1 Émeraude, etc.
// ═══════════════════════════════════════════════════════════════════════════

import type { EquippedItems } from '@/types/game';

// 'base'/'gold'/'diamond' gardent leurs ids historiques (sauvegardes existantes).
export type CardEdition =
  | 'base' | 'bronze' | 'gold' | 'emerald' | 'diamond' | 'ruby' | 'obsidian' | 'prismatic';

// Ordre croissant de rareté.
export const EDITION_ORDER: CardEdition[] =
  ['base', 'bronze', 'gold', 'emerald', 'diamond', 'ruby', 'obsidian', 'prismatic'];

export interface EditionInfo {
  label: string;      // nom court ("Or")
  icon: string;       // badge de carte
  color: string;      // texte / badge
  glow: string;       // halo
  border: string;     // bordure de carte (Obsidienne : sombre, le halo porte la couleur)
  points: number;     // valeur d'une carte de cette édition = seuil de jauge pour l'atteindre
  statMult: number;   // multiplicateur fixe du DPS du perso
  powBonus: number;   // ajouté au dpsMultiplier de rareté (croissance par niveau)
  dropChancePct: number;
}

// Bonus de puissance par palier : +0.0002 (Prismatique +0.0014, soit plus
// qu'un palier de rareté à +0.001) — une carte d'édition haute ne se fait
// pas détrôner tout de suite par une rareté supérieure à haut niveau.
const POW_BONUS_PER_TIER = 0.0002;

export const EDITION_CONFIG: Record<CardEdition, EditionInfo> = {
  base:      { label: 'Normale',     icon: '',   color: '#9ca3af', glow: '#6b7280', border: '#9ca3af', points: 1,   statMult: 1,   powBonus: 0,                      dropChancePct: 91.995 },
  bronze:    { label: 'Bronze',      icon: '🪙', color: '#e9a066', glow: '#b8672e', border: '#cd7f32', points: 2,   statMult: 1.5, powBonus: POW_BONUS_PER_TIER * 1, dropChancePct: 5 },
  gold:      { label: 'Or',          icon: '✨', color: '#fbbf24', glow: '#f59e0b', border: '#fbbf24', points: 4,   statMult: 2.5, powBonus: POW_BONUS_PER_TIER * 2, dropChancePct: 2 },
  emerald:   { label: 'Émeraude',    icon: '❇️', color: '#34d399', glow: '#059669', border: '#059669', points: 8,   statMult: 3,   powBonus: POW_BONUS_PER_TIER * 3, dropChancePct: 0.7 },
  diamond:   { label: 'Diamant',     icon: '💎', color: '#67e8f9', glow: '#22d3ee', border: '#67e8f9', points: 16,  statMult: 3.7, powBonus: POW_BONUS_PER_TIER * 4, dropChancePct: 0.2 },
  ruby:      { label: 'Rubis',       icon: '♦️', color: '#fb7185', glow: '#e11d48', border: '#e11d48', points: 32,  statMult: 4.5, powBonus: POW_BONUS_PER_TIER * 5, dropChancePct: 0.08 },
  obsidian:  { label: 'Obsidienne',  icon: '🌑', color: '#a78bfa', glow: '#6d28d9', border: '#2e1065', points: 64,  statMult: 6,   powBonus: POW_BONUS_PER_TIER * 6, dropChancePct: 0.02 },
  prismatic: { label: 'Prismatique', icon: '🌈', color: '#f0abfc', glow: '#e879f9', border: '#f87171', points: 128, statMult: 8,   powBonus: POW_BONUS_PER_TIER * 7, dropChancePct: 0.005 },
};

// Jauge pleine : au-delà, les doublons sont recyclés en
// Orbes du Néant (voir addToCollection).
export const EDITION_MAX_POINTS = EDITION_CONFIG.prismatic.points;

/**
 * Tire une édition au hasard, pondérée par les chances ci-dessus.
 * rateBonusPct : bonus de Prestige "Taux d'édition" (+X% RELATIFS sur toutes
 * les éditions au-dessus de Normale, voir ActivePrestigeBonuses.editionRateBonusPct).
 */
export function rollCardEdition(rateBonusPct = 0): CardEdition {
  const mult = 1 + rateBonusPct / 100;
  let r = Math.random() * 100;
  for (let i = EDITION_ORDER.length - 1; i > 0; i--) {
    const pct = EDITION_CONFIG[EDITION_ORDER[i]].dropChancePct * mult;
    if (r < pct) return EDITION_ORDER[i];
    r -= pct;
  }
  return 'base';
}

export function editionTier(edition: CardEdition | undefined): number {
  return Math.max(0, EDITION_ORDER.indexOf(edition ?? 'base'));
}

export function isEditionAtLeast(edition: CardEdition | undefined, min: CardEdition): boolean {
  return editionTier(edition) >= editionTier(min);
}

// Plus haut palier atteint par la jauge.
export function editionFromPoints(points: number): CardEdition {
  let best: CardEdition = 'base';
  for (const ed of EDITION_ORDER) if (points >= EDITION_CONFIG[ed].points) best = ed;
  return best;
}

// Palier suivant (null = Prismatique, jauge pleine).
export function nextEdition(edition: CardEdition): CardEdition | null {
  const i = editionTier(edition);
  return i < EDITION_ORDER.length - 1 ? EDITION_ORDER[i + 1] : null;
}

// Points de jauge d'un perso possédé — une entrée sans `editionPoints`
// (sauvegarde antérieure au rework) retombe sur le seuil de son édition.
export function getEditionPoints(owned: { edition?: CardEdition; editionPoints?: number }): number {
  return owned.editionPoints ?? EDITION_CONFIG[owned.edition ?? 'base'].points;
}

export function getEditionStatMult(edition: CardEdition | undefined): number {
  return (EDITION_CONFIG[edition ?? 'base'] ?? EDITION_CONFIG.base).statMult;
}

export function getEditionPowBonus(edition: CardEdition | undefined): number {
  return (EDITION_CONFIG[edition ?? 'base'] ?? EDITION_CONFIG.base).powBonus;
}

// Écart de croissance entre deux raretés consécutives (RARITY_CONFIG.dpsMultiplier).
const RARITY_POW_STEP = 0.001;

// Bonus de croissance d'une édition exprimé en raretés (Bronze 0,2 → Prismatique 1,4),
// pour l'afficher aux joueurs sans passer par la base de croissance brute.
export function getEditionGrowthInRarities(edition: CardEdition | undefined): number {
  return Math.round((getEditionPowBonus(edition) / RARITY_POW_STEP) * 10) / 10;
}

// ── Anciennes clés d'instance ───────────────────────────────────────────
// Avant le rework, chaque édition était une entrée SÉPARÉE de la collection
// ("id" pour Base, "id::gold"/"id::diamond" pour les shiny). Les clés sont
// désormais le templateId pur ; parseInstanceKey reste tolérant pour les
// données encore au vieux format (annonces d'HdV, saves pas encore migrées).
export function parseInstanceKey(key: string): { templateId: string; edition: CardEdition } {
  const i = key.indexOf('::');
  if (i === -1) return { templateId: key, edition: 'base' };
  const editionPart = key.slice(i + 2) as CardEdition;
  const edition: CardEdition = EDITION_ORDER.includes(editionPart) ? editionPart : 'base';
  return { templateId: key.slice(0, i), edition };
}

// ── Migration des sauvegardes ───────────────────────────────────────────
interface LegacyOwned {
  templateId: string;
  copies: number;
  level: number;
  currentForm: number;
  xp: number;
  equippedItems?: EquippedItems;
  edition?: CardEdition;
  editionPoints?: number;
  rank?: number; // ancien rang ★, supprimé par le rework
}

export interface EditionMigrationInput<T extends LegacyOwned> {
  collection: Record<string, T>;
  equippedTeam: (string | null)[];
  equipmentInventory: Record<string, number>;
}

/**
 * Fusionne les anciennes entrées par édition d'un même perso en UNE carte :
 * - points de jauge = somme (copies × valeur de l'édition) de chaque entrée,
 * - copies/niveau/forme = le max des entrées (xp de l'entrée au niveau max),
 * - équipements des entrées fusionnées remis dans l'inventaire (rien de perdu),
 * - équipe ramenée au templateId pur, ancien rang ★ retiré.
 * Idempotente : renvoie `null` si rien n'est à migrer.
 */
export function migrateEditionSave<T extends LegacyOwned>(input: EditionMigrationInput<T>): EditionMigrationInput<T> | null {
  const needsMerge = Object.keys(input.collection).some(k => k.includes('::'))
    || input.equippedTeam.some(k => typeof k === 'string' && k.includes('::'));
  const needsBackfill = Object.values(input.collection).some(c => c.editionPoints === undefined || c.rank !== undefined);
  if (!needsMerge && !needsBackfill) return null;

  const groups: Record<string, T[]> = {};
  for (const [key, owned] of Object.entries(input.collection)) {
    const { templateId, edition } = parseInstanceKey(key);
    (groups[templateId] ??= []).push({ ...owned, templateId, edition: owned.edition ?? edition });
  }

  const equipmentInventory = { ...input.equipmentInventory };
  const collection: Record<string, T> = {};
  for (const [templateId, entries] of Object.entries(groups)) {
    const points = Math.min(EDITION_MAX_POINTS, entries.reduce((sum, e) =>
      sum + (e.editionPoints ?? Math.max(1, e.copies ?? 1) * EDITION_CONFIG[e.edition ?? 'base'].points), 0));
    let merged: T;
    if (entries.length === 1) {
      merged = { ...entries[0] };
    } else {
      const best = entries.reduce((a, b) => (b.level > a.level ? b : a));
      for (const e of entries) {
        for (const itemId of Object.values(e.equippedItems ?? {})) {
          if (itemId) equipmentInventory[itemId] = (equipmentInventory[itemId] ?? 0) + 1;
        }
      }
      merged = {
        ...best,
        templateId,
        copies: Math.max(...entries.map(e => e.copies ?? 1)),
        currentForm: Math.max(...entries.map(e => e.currentForm ?? 0)),
        equippedItems: { helmet: null, chest: null, pants: null, boots: null, weapon: null },
      };
    }
    delete merged.rank;
    collection[templateId] = { ...merged, editionPoints: points, edition: editionFromPoints(points) };
  }

  const equippedTeam = input.equippedTeam.map(k => (typeof k === 'string' ? parseInstanceKey(k).templateId : k));
  // Un même perso présent deux fois (deux anciennes éditions) : on garde le premier slot.
  equippedTeam.forEach((k, i) => { if (k && equippedTeam.indexOf(k) !== i) equippedTeam[i] = null; });

  return { collection, equippedTeam, equipmentInventory };
}

/**
 * Mémoire des Pierres : convertit l'ancien historique "Mémoire des Rangs"
 * (historicalMaxRank + l'encore plus ancien bankedRanks, rang ★ 1-7 par clé
 * "id::édition") en jauge d'édition (historicalEditionPoints), sinon les
 * cartes possédées avant le rework des éditions perdent leur mémoire. Même
 * conversion que migrateEditionSave (1 rang = 1 copie de cette édition),
 * Math.max pour ne jamais écraser un pic plus récent. Idempotente : les
 * champs legacy restent dans le doc Firestore (setDoc en mergeFields).
 */
export function migrateLegacyEditionHistory(data: Record<string, unknown>): void {
  const legacyMaps = [data.historicalMaxRank, data.bankedRanks]
    .filter((m): m is Record<string, number> => !!m && typeof m === 'object');
  delete data.historicalMaxRank;
  delete data.bankedRanks;
  if (legacyMaps.length === 0) return;

  // Pic par clé d'instance (les deux anciennes banques peuvent se recouper).
  const peakByKey: Record<string, number> = {};
  for (const map of legacyMaps) {
    for (const [key, rank] of Object.entries(map)) {
      if (typeof rank === 'number' && Number.isFinite(rank) && rank > 0) peakByKey[key] = Math.max(peakByKey[key] ?? 0, rank);
    }
  }
  const pointsById: Record<string, number> = {};
  for (const [key, rank] of Object.entries(peakByKey)) {
    const { templateId, edition } = parseInstanceKey(key);
    pointsById[templateId] = (pointsById[templateId] ?? 0) + Math.floor(rank) * EDITION_CONFIG[edition].points;
  }

  const current = (data.historicalEditionPoints && typeof data.historicalEditionPoints === 'object')
    ? data.historicalEditionPoints as Record<string, number> : {};
  const merged = { ...current };
  for (const [templateId, points] of Object.entries(pointsById)) {
    merged[templateId] = Math.max(merged[templateId] ?? 0, Math.min(EDITION_MAX_POINTS, points));
  }
  data.historicalEditionPoints = merged;
}

/**
 * Applique migrateEditionSave sur un état brut de sauvegarde (réhydratation
 * localStorage dans gameStore.ts::merge, chargement cloud dans
 * cloudSaveSync.ts::applyRemoteState). Ne touche à rien sans `collection`.
 */
export function migrateEditionFields(data: Record<string, unknown>): void {
  migrateLegacyEditionHistory(data);
  if (!data.collection || typeof data.collection !== 'object') return;
  const migrated = migrateEditionSave({
    collection: data.collection as Record<string, LegacyOwned>,
    equippedTeam: Array.isArray(data.equippedTeam) ? data.equippedTeam as (string | null)[] : [],
    equipmentInventory: (data.equipmentInventory && typeof data.equipmentInventory === 'object')
      ? data.equipmentInventory as Record<string, number> : {},
  });
  if (!migrated) return;
  data.collection = migrated.collection;
  data.equipmentInventory = migrated.equipmentInventory;
  if (Array.isArray(data.equippedTeam)) data.equippedTeam = migrated.equippedTeam;
}
