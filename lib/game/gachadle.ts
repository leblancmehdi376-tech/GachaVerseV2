// GachaDle — mini-jeu de devinette façon "onepiecedle" : le joueur propose des
// personnages du jeu et, à chaque essai, voit pour chaque caractéristique
// (genre, rareté, type, univers, nombre de formes) s'il est correct, et pour la
// rareté et les formes si la cible en a plus ou moins.
import { CharacterTemplate, Rarity } from '@/types/game';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { affinityBeatenBy, affinityBeats, getAffinityForId, type Affinity } from '@/lib/game/affinities';
import { getCardFormCount } from '@/lib/game/cardAssets';
import { getCharacterGender } from '@/lib/game/characterGenders';
import { COLLECTION_RARITY_ORDER, normalizeSearch } from '@/lib/game/collectionFilters';

/** Personnages devinables : tout le roster sauf le stub héros. */
export const DLE_POOL: CharacterTemplate[] = CHARACTER_POOL.filter(c => !c.isHero);

const RARITY_RANK = Object.fromEntries(COLLECTION_RARITY_ORDER.map((r, i) => [r, i])) as Record<Rarity, number>;

export type DleMatch = 'correct' | 'wrong';
/** 'close' = type voisin dans le cycle des affinités (il bat le type mystère ou se fait battre par lui). */
export type DleAffinityMatch = 'correct' | 'close' | 'wrong';
/** 'higher' = la cible a une valeur PLUS haute que la proposition (plus rare, plus de formes), 'lower' = plus basse. */
export type DleOrderMatch = 'correct' | 'higher' | 'lower';

function compareOrder(guess: number, target: number): DleOrderMatch {
  return guess === target ? 'correct' : target > guess ? 'higher' : 'lower';
}

function compareAffinity(guess: Affinity, target: Affinity): DleAffinityMatch {
  if (guess === target) return 'correct';
  return affinityBeats(guess) === target || affinityBeatenBy(guess) === target ? 'close' : 'wrong';
}

export interface DleComparison {
  name: DleMatch;
  gender: DleMatch;
  rarity: DleOrderMatch;
  affinity: DleAffinityMatch;
  universe: DleMatch;
  forms: DleOrderMatch;
}

export function compareGuess(guess: CharacterTemplate, target: CharacterTemplate): DleComparison {
  return {
    name:     guess.id === target.id ? 'correct' : 'wrong',
    gender:   getCharacterGender(guess.id) === getCharacterGender(target.id) ? 'correct' : 'wrong',
    rarity:   compareOrder(RARITY_RANK[guess.rarity], RARITY_RANK[target.rarity]),
    affinity: compareAffinity(getAffinityForId(guess.id), getAffinityForId(target.id)),
    universe: (guess.universe ?? '') === (target.universe ?? '') ? 'correct' : 'wrong',
    forms:    compareOrder(getCardFormCount(guess), getCardFormCount(target)),
  };
}

// Hash FNV-1a — même tirage pour tous les joueurs un jour donné.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}

/** Clé du jour (heure locale), ex. '2026-09-28'. */
export function getDleDateKey(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Personnage mystère du jour, déterministe à partir de la clé de date. */
export function getDailyTarget(dateKey: string, pool: CharacterTemplate[] = DLE_POOL): CharacterTemplate {
  return pool[hashStr(`gachadle:${dateKey}`) % pool.length];
}

export function getRandomTarget(excludeId?: string, pool: CharacterTemplate[] = DLE_POOL): CharacterTemplate {
  const candidates = excludeId && pool.length > 1 ? pool.filter(c => c.id !== excludeId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Propositions d'autocomplétion : noms qui commencent par la saisie d'abord,
 * puis ceux qui la contiennent (accents/majuscules ignorés). Les persos déjà
 * proposés sont exclus.
 */
export function suggestCharacters(
  query: string,
  excludeIds: ReadonlySet<string>,
  limit = 8,
  pool: CharacterTemplate[] = DLE_POOL,
): CharacterTemplate[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const starts: CharacterTemplate[] = [];
  const contains: CharacterTemplate[] = [];
  for (const c of pool) {
    if (excludeIds.has(c.id)) continue;
    const n = normalizeSearch(c.name);
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  const byName = (a: CharacterTemplate, b: CharacterTemplate) => a.name.localeCompare(b.name, 'fr');
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
}
