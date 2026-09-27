// Filtres & tri partagés par les listes de personnages (Compadex, Compagnons,
// Améliorations). Une seule sélection pour les trois pages, gardée dans le
// store (en mémoire) : elle survit aux changements de page, pas au reload.

import type { CharacterTemplate, OwnedCharacter, Rarity } from '@/types/game';
import { getAffinityForId, type Affinity } from './affinities';
import { calcCharDps } from './formulas';
import { BN_ZERO, bnCompare } from './bignum';

/** Ordre croissant C → T (affichage des boutons de rareté). */
export const COLLECTION_RARITY_ORDER: Rarity[] = ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P', 'T'];

export type CollectionStatus = 'all' | 'owned' | 'missing';
export type CollectionSortKey = 'rarity' | 'dps' | 'name';

export interface CollectionFilterState {
  /** Compadex uniquement (les autres pages ne listent que des persos possédés). */
  status: CollectionStatus;
  rarity: Rarity | 'all';
  universe: string | 'all';
  affinity: Affinity | 'all';
  sortKey: CollectionSortKey;
  /** false = ordre naturel (plus rare / plus fort d'abord, noms A→Z). */
  sortReversed: boolean;
  search: string;
}

export const DEFAULT_COLLECTION_FILTERS: CollectionFilterState = {
  status: 'all',
  rarity: 'all',
  universe: 'all',
  affinity: 'all',
  sortKey: 'rarity',
  sortReversed: false,
  search: '',
};

/** Minuscules sans accents, pour une recherche tolérante (« eclair » trouve « Éclair »). */
export function normalizeSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Rareté, univers, type et recherche (nom ou univers). Le statut est géré par le Compadex. */
export function matchesCharacterFilters(tpl: CharacterTemplate, f: CollectionFilterState): boolean {
  if (f.rarity !== 'all' && tpl.rarity !== f.rarity) return false;
  if (f.universe !== 'all' && tpl.universe !== f.universe) return false;
  if (f.affinity !== 'all' && getAffinityForId(tpl.id) !== f.affinity) return false;
  const q = normalizeSearch(f.search);
  if (q && !normalizeSearch(tpl.name).includes(q) && !normalizeSearch(tpl.universe ?? '').includes(q)) return false;
  return true;
}

const RARITY_RANK = Object.fromEntries(COLLECTION_RARITY_ORDER.map((r, i) => [r, i])) as Record<Rarity, number>;

export interface SortableCharacter {
  tpl: CharacterTemplate;
  owned: OwnedCharacter | null;
}

/**
 * Critère principal selon `sortKey` (inversé si `reversed`), puis nom A→Z en
 * départage — sauf en tri par nom, où l'inversion porte sur le nom lui-même.
 */
export function compareCharacters(a: SortableCharacter, b: SortableCharacter, sortKey: CollectionSortKey, reversed: boolean): number {
  let primary = 0;
  if (sortKey === 'rarity') {
    primary = (RARITY_RANK[b.tpl.rarity] ?? 0) - (RARITY_RANK[a.tpl.rarity] ?? 0);
  } else if (sortKey === 'dps') {
    primary = bnCompare(
      b.owned ? calcCharDps(b.tpl, b.owned) : BN_ZERO,
      a.owned ? calcCharDps(a.tpl, a.owned) : BN_ZERO,
    );
  }
  if (primary !== 0) return reversed ? -primary : primary;
  const byName = a.tpl.name.localeCompare(b.tpl.name);
  return sortKey === 'name' && reversed ? -byName : byName;
}

/** Nombre de filtres actifs (hors recherche et tri). */
export function countActiveFilters(f: CollectionFilterState, withStatus: boolean): number {
  return (withStatus && f.status !== 'all' ? 1 : 0)
    + (f.rarity !== 'all' ? 1 : 0)
    + (f.universe !== 'all' ? 1 : 0)
    + (f.affinity !== 'all' ? 1 : 0);
}
