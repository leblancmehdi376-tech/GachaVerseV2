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
import { getTodayDayKey } from '@/lib/game/shop';
import { DLE_QUESTS, type DleQuestDef } from './gachadleQuests';

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

/**
 * Clé du jour du défi, ex. '2026-09-28'. Sans argument : même jour que les
 * quêtes journalières (reset à 2h du matin, heure de Paris — getTodayDayKey),
 * pour que le personnage mystère change en même temps qu'elles. Avec une
 * date : simple formatage de ce jour-là (heure locale).
 */
export function getDleDateKey(d?: Date): string {
  if (!d) return getTodayDayKey();
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

// ─── Défi du jour : série et récompense ──────────────────────────────────

/** Clé de la veille d'une clé de jour ('2026-09-28' → '2026-09-27'). */
export function getPreviousDleDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return getDleDateKey(new Date(y, m - 1, d - 1));
}

/**
 * Série affichable aujourd'hui : la série enregistrée tient tant que le
 * dernier défi réussi date d'aujourd'hui ou d'hier, sinon elle est cassée.
 */
export function getDleCurrentStreak(streak: number, lastWinDate: string, today: string): number {
  if (!lastWinDate || streak <= 0) return 0;
  return lastWinDate === today || lastWinDate === getPreviousDleDateKey(today) ? streak : 0;
}

/** Gemmes du défi du jour selon la série (jour de la victoire inclus) : 100 → 150 à partir de 5. */
const DLE_DAILY_REWARDS = [100, 110, 120, 135, 150];
export function getDleDailyReward(streak: number): number {
  return DLE_DAILY_REWARDS[Math.min(Math.max(streak, 1), DLE_DAILY_REWARDS.length) - 1];
}

// ─── Quêtes GachaDle (permanentes, récompense unique) ────────────────────

export interface DleStats {
  bestStreak: number;
  gamesWon: number;
  bestGuesses: number;          // 0 = aucune partie gagnée
  raritiesFound: readonly Rarity[];
}

export { DLE_QUESTS, type DleQuestDef } from './gachadleQuests';

export interface DleQuestProgress { current: number; target: number; done: boolean }

export function getDleQuestProgress(q: DleQuestDef, stats: DleStats): DleQuestProgress {
  switch (q.kind) {
    case 'streak': return clampProgress(stats.bestStreak, q.value);
    case 'played': return clampProgress(stats.gamesWon, q.value);
    case 'guesses': {
      const done = stats.bestGuesses > 0 && stats.bestGuesses < q.value;
      return { current: done ? 1 : 0, target: 1, done };
    }
    case 'rarity': {
      const done = stats.raritiesFound.includes(q.value);
      return { current: done ? 1 : 0, target: 1, done };
    }
    case 'all': {
      const others = DLE_QUESTS.filter(o => o.kind !== 'all');
      return clampProgress(others.filter(o => getDleQuestProgress(o, stats).done).length, others.length);
    }
  }
}

function clampProgress(current: number, target: number): DleQuestProgress {
  return { current: Math.min(current, target), target, done: current >= target };
}

/** Nombre de quêtes GachaDle accomplies (réclamées ou non) — suivi du succès « Pro du GachaverseDLE ». */
export function countDleQuestsDone(stats: DleStats): number {
  return DLE_QUESTS.filter(q => getDleQuestProgress(q, stats).done).length;
}
