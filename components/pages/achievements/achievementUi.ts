// Utilitaires d'affichage partagés par la page Succès, la vitrine de
// trophées et la bannière de déblocage.
import type { CSSProperties } from 'react';
import {
  type Achievement, type AchievementEntry, STAT, CATEGORY_META, TIER_META, getAchievementTier, isHiddenAchievement,
} from '@/lib/game/achievements';
import { formatNumber } from '@/lib/game/format';

export type AchStatus = 'claimable' | 'done' | 'progress' | 'todo';

/** Variables CSS d'accent (--acc/--glow) d'un succès, selon son rang. */
export function tierVars(a: Achievement): CSSProperties {
  const t = TIER_META[getAchievementTier(a)];
  return { ['--acc' as string]: t.color, ['--glow' as string]: t.glow };
}

export function categoryVars(accent: string): CSSProperties {
  return { ['--acc' as string]: accent };
}

export function rewardLabel(a: Achievement): string {
  if (!a.reward) return '—';
  if (a.reward.type === 'title') return `Titre « ${a.reward.value} »`;
  if (a.reward.type === 'gems') return `+${a.reward.value} 💎`;
  return `+${formatNumber(a.reward.value as number)} 🪙`;
}

/** Valeur de progression lisible (heures pour le temps de jeu). */
export function formatAchValue(a: Achievement, v: number): string {
  if (a.stat === STAT.playtimeSec) return `${formatNumber(Math.floor(v / 3600))}h`;
  return formatNumber(v);
}

export function getStatus(done: boolean, claimed: boolean, progress: number): AchStatus {
  if (done) return claimed ? 'done' : 'claimable';
  return progress > 0 ? 'progress' : 'todo';
}

export interface EntryState {
  status:     AchStatus;
  current:    Achievement;    // niveau en cours (le dernier si tout est terminé)
  currentIdx: number;
  doneCount:  number;
  allDone:    boolean;
  claimable:  Achievement[];  // niveaux débloqués mais pas encore réclamés
  ratio:      number;         // avancement global de la carte (0-1)
}

/** État d'une carte (série à niveaux ou succès seul). */
export function getEntryState(
  entry: AchievementEntry,
  progress: Record<string, number>,
  unlocked: Record<string, boolean>,
  claimed: Record<string, boolean>,
): EntryState {
  const { levels } = entry;
  const doneCount = levels.filter(a => unlocked[a.id]).length;
  const allDone = doneCount === levels.length;
  const firstOpen = levels.findIndex(a => !unlocked[a.id]);
  const currentIdx = firstOpen === -1 ? levels.length - 1 : firstOpen;
  const current = levels[currentIdx];
  const claimable = levels.filter(a => unlocked[a.id] && !claimed[a.id]);
  const curRatio = allDone ? 0 : Math.min(1, (progress[current.id] ?? 0) / current.target);
  const status: AchStatus = claimable.length > 0 ? 'claimable'
    : allDone ? 'done'
    : doneCount > 0 || curRatio > 0 ? 'progress' : 'todo';
  return { status, current, currentIdx, doneCount, allDone, claimable, ratio: (doneCount + curRatio) / levels.length };
}

export function isConcealed(a: Achievement, done: boolean): boolean {
  return isHiddenAchievement(a) && !done;
}

export function categoryAccent(a: Achievement): string {
  return CATEGORY_META[a.category].accent;
}

// Succès secrets déjà "découverts" à l'écran — l'animation de découverte ne
// se joue qu'une fois par appareil. Préférence purement locale.
const REVEALED_KEY = 'gv_ach_revealed_v1';

export function readRevealed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(REVEALED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function writeRevealed(ids: Set<string>) {
  try { window.localStorage.setItem(REVEALED_KEY, JSON.stringify([...ids])); } catch { /* stockage indisponible */ }
}
