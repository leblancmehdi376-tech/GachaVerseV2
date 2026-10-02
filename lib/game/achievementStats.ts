// Calculs purs des statistiques de succès (achievementStats / charMastery) —
// appelés depuis les actions du store (mort d'ennemi, défaite de boss,
// tirages gacha...) sous forme de patchs à fusionner dans le set() existant,
// pour ne jamais ajouter de mise à jour du store supplémentaire.
import { CHAL, STAT, WORLD_TOTAL, type CharMastery } from './achievements';
import { getCharacterById } from './characters';
import { parseInstanceKey } from './editions';
import { getPalierConfig } from './paliers';
import { getDynamicRates } from './gacha';
import type { Rarity } from '@/types/game';

type Stats = Record<string, number>;
type Mastery = Record<string, CharMastery>;

// Plafond des compteurs cumulés en `number` (les Pixel-Coins dépensés
// suivent des coûts BigNum qui peuvent dépasser 1e308) — bien au-delà de
// toute target de succès.
const STAT_CAP = 1e300;

export function addStats(stats: Stats | undefined, patch: Stats): Stats {
  const next = { ...(stats ?? {}) };
  for (const [k, v] of Object.entries(patch)) {
    next[k] = Math.min(STAT_CAP, (next[k] ?? 0) + (Number.isFinite(v) ? v : STAT_CAP));
  }
  return next;
}

export function maxStats(stats: Stats | undefined, patch: Stats): Stats | null {
  let next: Stats | null = null;
  for (const [k, v] of Object.entries(patch)) {
    if ((stats?.[k] ?? 0) >= v) continue;
    next ??= { ...(stats ?? {}) };
    next[k] = Math.min(STAT_CAP, v);
  }
  return next;
}

// Rareté "SSR" : Légendaire (5★) ou mieux.
export const SSR_RARITIES: Rarity[] = ['L', 'M', 'S', 'CO', 'P', 'T'];

interface KillState {
  equippedTeam?: (string | null)[];
  palier: number;
  bossTimeLeft: number;
  ultUsedThisFight?: string[];
  achievementStats?: Stats;
  charMastery?: Mastery;
}

function teamTemplateIds(team: (string | null)[] | undefined): string[] {
  return (team ?? []).filter((k): k is string => !!k).map(k => parseInstanceKey(k).templateId);
}

/**
 * Patch de succès à fusionner dans le résultat de resolveEnemyDeath : +1
 * combat pour chaque personnage équipé et, sur un boss de palier, +1
 * victoire, série de victoires et défis réussis (voir CHAL).
 */
export function killAchievementPatch(state: KillState, isBoss: boolean): { charMastery: Mastery; achievementStats?: Stats } {
  const ids = teamTemplateIds(state.equippedTeam);
  const charMastery = { ...(state.charMastery ?? {}) };
  for (const id of ids) {
    const m = charMastery[id] ?? { k: 0, w: 0, lv: 0 };
    charMastery[id] = { ...m, k: m.k + 1, w: m.w + (isBoss ? 1 : 0) };
  }
  if (!isBoss) return { charMastery };

  const stats = { ...(state.achievementStats ?? {}) };
  const timer   = getPalierConfig(state.palier).bossTimerSeconds;
  const elapsed = timer - state.bossTimeLeft;
  const flag = (key: string, ok: boolean) => { if (ok) stats[key] = 1; };

  const streak = (stats[STAT.bossStreakCur] ?? 0) + 1;
  stats[STAT.bossStreakCur] = streak;
  stats[STAT.bossStreakMax] = Math.max(stats[STAT.bossStreakMax] ?? 0, streak);

  const rarities = ids.map(id => getCharacterById(id)?.rarity);
  flag(CHAL.flawless, elapsed <= 10);
  flag(CHAL.clutch,   state.bossTimeLeft <= 1);
  flag(CHAL.fast60,   state.palier >= 20 && elapsed < 60);
  flag(CHAL.noUlt,    state.palier >= 15 && (state.ultUsedThisFight ?? []).length === 0);
  flag(CHAL.commons,  state.palier >= 5 && ids.length === 4 && rarities.every(r => r === 'C'));
  flag(CHAL.solo,     state.palier >= 10 && ids.length === 1);
  flag(CHAL.maxDiff,  state.palier >= WORLD_TOTAL);
  flag(CHAL.clean,    state.palier >= 20 && elapsed <= 30 && (stats[STAT.lastFailPalier] ?? 0) !== state.palier);

  return { charMastery, achievementStats: stats };
}

/** Défaite (chrono écoulé) ou retraite pendant un boss : casse la série. */
export function bossFailPatch(state: { palier: number; achievementStats?: Stats }): { achievementStats: Stats } {
  return {
    achievementStats: {
      ...(state.achievementStats ?? {}),
      [STAT.bossStreakCur]: 0,
      [STAT.lastFailPalier]: state.palier,
    },
  };
}

/**
 * Statistiques d'un tirage (single ou multiple) : personnages à moins de 1 %
 * (au taux réel du palier du joueur), série de SSR d'affilée, miracle (2+
 * personnages < 1 % dans le même tirage multiple), tirages sur la bannière
 * événementielle.
 */
export function gachaStatsPatch(stats: Stats | undefined, templateIds: string[], runPeakPalier: number, isEventBanner: boolean): Stats {
  const rates = getDynamicRates(runPeakPalier);
  const next = { ...(stats ?? {}) };
  let lowRate = 0;
  let cur = next[STAT.gachaSsrCur] ?? 0;
  let best = next[STAT.gachaSsrMax] ?? 0;
  for (const id of templateIds) {
    const rarity = getCharacterById(id)?.rarity;
    if (!rarity) continue;
    if ((rates[rarity] ?? 100) < 1) lowRate++;
    cur = SSR_RARITIES.includes(rarity) ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  next[STAT.gachaLowRate] = (next[STAT.gachaLowRate] ?? 0) + lowRate;
  next[STAT.gachaSsrCur] = cur;
  next[STAT.gachaSsrMax] = best;
  if (templateIds.length > 1 && lowRate >= 2) next[STAT.gachaMiracle] = 1;
  if (isEventBanner) next[STAT.pullsVol2] = (next[STAT.pullsVol2] ?? 0) + templateIds.length;
  return next;
}
