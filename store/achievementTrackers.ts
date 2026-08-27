'use client';
// Traqueurs de succès : synchronisent les compteurs de jeu vers les champs
// d'achievement du store (voir hooks/useAchievementTrackers.ts, seul
// consommateur). Fichier séparé de store/slices/achievementSlice.ts et de
// gameStore.ts (que ce fichier importe statiquement) : gameStore.ts n'importe
// PAS ce fichier en retour, donc aucun cycle — contrairement à
// achievementSlice.ts, qui lui EST importé par gameStore.ts et ne peut donc
// pas importer useGameStore statiquement.
import { useGameStore } from '@/store/gameStore';

// "Vaincre X boss" (first_boss, bosses_5/20/100) : compte TOUS les boss vaincus,
// re-farm inclus. Ne pas confondre avec les couronnes (crowns_50), qui elles
// ne sont accordées que sur une VRAIE progression de palier.
export function trackBossKills(totalBossKills: number) {
  const s = useGameStore.getState();
  s.setProgress('first_boss', Math.min(totalBossKills, 1));
  s.setProgress('bosses_5',   Math.min(totalBossKills, 5));
  s.setProgress('bosses_20',  Math.min(totalBossKills, 20));
  s.setProgress('bosses_67',  Math.min(totalBossKills, 67));
  s.setProgress('bosses_100', Math.min(totalBossKills, 100));
}

export function trackBossCrowns(totalBossCrownsEarned: number) {
  useGameStore.getState().setProgress('crowns_50', Math.min(totalBossCrownsEarned, 50));
}

export function trackPalier(palier: number) {
  const s = useGameStore.getState();
  s.setProgress('palier_5',  Math.min(palier, 5));
  s.setProgress('palier_10', Math.min(palier, 10));
  s.setProgress('palier_15', Math.min(palier, 15));
  s.setProgress('palier_20', Math.min(palier, 20));
  s.setProgress('palier_40', Math.min(palier, 40));
}

export function trackCoins(coins: number) {
  const s = useGameStore.getState();
  s.setProgress('coins_100k', Math.min(coins, 100000));
  s.setProgress('coins_10m',  Math.min(coins, 10000000));
  s.setProgress('coins_1b',   Math.min(coins, 1000000000));
  s.setProgress('coins_10b',  Math.min(coins, 10000000000));
  s.setProgress('coins_100b', Math.min(coins, 100000000000));
}

export function trackDps(dps: number) {
  const s = useGameStore.getState();
  s.setProgress('dps_1000', Math.min(dps, 1000));
  s.setProgress('dps_1m',   Math.min(dps, 1000000));
  s.setProgress('dps_100m', Math.min(dps, 100000000));
  s.setProgress('dps_1b',   Math.min(dps, 1000000000));
}

export function trackCollection(ownedCount: number, hasLegendary: boolean, hasTranscendant: boolean, totalPool: number, transcendantCount: number = hasTranscendant ? 1 : 0) {
  const s = useGameStore.getState();
  s.setProgress('collect_1',  Math.min(ownedCount, 1));
  s.setProgress('collect_5',  Math.min(ownedCount, 50));
  s.setProgress('collect_15', Math.min(ownedCount, 100));
  s.setProgress('collect_30', Math.min(ownedCount, 150));
  s.setProgress('collect_all', ownedCount >= totalPool ? 999 : ownedCount);
  if (hasLegendary)     s.setProgress('legendary_1',     1);
  if (hasTranscendant)  s.setProgress('transcendant_1',  1);
  s.setProgress('transcendant_3', Math.min(transcendantCount, 3));
}

export function trackEquippedTeam(filledSlots: number) {
  const s = useGameStore.getState();
  s.setProgress('equip_team', Math.min(filledSlots, 4));
}

export function trackGachaPulls(total: number) {
  const s = useGameStore.getState();
  s.setProgress('pull_1',    Math.min(total, 1));
  s.setProgress('pull_10',   Math.min(total, 10));
  s.setProgress('pull_100',  Math.min(total, 100));
  s.setProgress('pull_500',  Math.min(total, 500));
  s.setProgress('pull_1000', Math.min(total, 1000));
  s.setProgress('pull_5000', Math.min(total, 5000));
}

export function trackQuestsCompleted(count: number) {
  const s = useGameStore.getState();
  s.setProgress('quest_10',  Math.min(count, 10));
  s.setProgress('quest_20',  Math.min(count, 20));
  s.setProgress('quest_50',  Math.min(count, 50));
  s.setProgress('quest_100', Math.min(count, 100));
  s.setProgress('quest_500', Math.min(count, 500));
}

export function trackKills(totalKills: number) {
  const s = useGameStore.getState();
  s.setProgress('kills_1',       Math.min(totalKills, 1));
  s.setProgress('kills_500',     Math.min(totalKills, 500));
  s.setProgress('kills_5000',    Math.min(totalKills, 5000));
  s.setProgress('kills_50000',   Math.min(totalKills, 50000));
  s.setProgress('kills_500000',  Math.min(totalKills, 500000));
  s.setProgress('kills_1000000', Math.min(totalKills, 1000000));
}

export function trackUpgrades(totalUpgrades: number) {
  const s = useGameStore.getState();
  s.setProgress('upgrade_10',  Math.min(totalUpgrades, 50));
  s.setProgress('upgrade_50',  Math.min(totalUpgrades, 500));
  s.setProgress('upgrade_200', Math.min(totalUpgrades, 200));
}

// ── Nouveaux traqueurs (20 succès difficiles) ─────────────────────────────

/** Gemmes en stock (plus haut jamais atteint — Math.max interne à setProgress). */
export function trackGems(gems: number) {
  useGameStore.getState().setProgress('gems_1000', Math.min(gems, 1000));
}

export function trackPrestige(level: number) {
  const s = useGameStore.getState();
  s.setProgress('prestige_1',  Math.min(level, 1));
  s.setProgress('prestige_10', Math.min(level, 5));
  s.setProgress('prestige_25', Math.min(level, 20));
}

export function trackVoidOrbs(totalVoidOrbsEarned: number) {
  useGameStore.getState().setProgress('orbs_30', Math.min(totalVoidOrbsEarned, 30));
}

export function trackUnlockedTitles(count: number) {
  useGameStore.getState().setProgress('titles_25', Math.min(count, 25));
}

/** Éditions shiny (Or/Diamant) : détectées en scannant la collection. */
export function trackShinyEditions(goldOrDiamondCount: number, hasGold: boolean, hasDiamond: boolean, diamondUniqueCount: number, hasTrio: boolean, pantheonCount: number) {
  const s = useGameStore.getState();
  if (hasGold)    s.setProgress('gold_1', 1);
  if (hasDiamond) s.setProgress('diamond_1', 1);
  if (hasTrio)    s.setProgress('trio_perfect', 1);
  s.setProgress('shiny_10', Math.min(goldOrDiamondCount, 10));
  s.setProgress('diamond_3', Math.min(diamondUniqueCount, 3));
  s.setProgress('diamond_10', Math.min(diamondUniqueCount, 10));
  s.setProgress('pantheon_5', Math.min(pantheonCount, 5));
}

/** Rangs 7★ : détectés en scannant la collection + l'équipe active. */
export function trackRank7(count7Star: number, fullTeamRank7: boolean) {
  const s = useGameStore.getState();
  s.setProgress('rank7_1', Math.min(count7Star, 1));
  s.setProgress('rank7_5', Math.min(count7Star, 5));
  if (fullTeamRank7) s.setProgress('rank7_team', 1);
}

export function trackSynergyMax(hasMaxSynergy: boolean) {
  if (hasMaxSynergy) useGameStore.getState().setProgress('synergy_max', 1);
}
