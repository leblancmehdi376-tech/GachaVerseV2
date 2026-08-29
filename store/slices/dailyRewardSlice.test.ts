import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';

describe('dailyRewardSlice — avance d\'un seul jour par connexion, jamais de saut', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("se connecter jour 1 puis jour 3 (jour 2 sauté) ne fait avancer que jusqu'au jour 2", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));
    useGameStore.getState().ensureDailyReward();
    expect(useGameStore.getState().dailyRewardCurrentDay).toBe(1);
    useGameStore.getState().claimDailyReward();
    expect(useGameStore.getState().dailyRewardClaimedDays).toEqual([1]);

    // Le joueur ne se reconnecte pas le jour 2 : on saute directement à J+2 (jour "3")
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'));
    useGameStore.getState().ensureDailyReward();
    expect(useGameStore.getState().dailyRewardCurrentDay).toBe(2);
    useGameStore.getState().claimDailyReward();
    expect(useGameStore.getState().dailyRewardClaimedDays).toEqual([1, 2]);
  });

  it("se connecter jour 2 SANS réclamer, puis revenir jour 3, reste bloqué sur le jour 2", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));
    useGameStore.getState().ensureDailyReward();
    useGameStore.getState().claimDailyReward();
    expect(useGameStore.getState().dailyRewardClaimedDays).toEqual([1]);

    // Jour 2 : on ouvre l'app mais on ne clique pas sur "Réclamer"
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'));
    useGameStore.getState().ensureDailyReward();
    expect(useGameStore.getState().dailyRewardCurrentDay).toBe(2);
    expect(useGameStore.getState().dailyRewardClaimedToday).toBe(false);

    // Jour 3 : toujours pas réclamé le jour 2 -> le calendrier doit rester sur le jour 2
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'));
    useGameStore.getState().ensureDailyReward();
    expect(useGameStore.getState().dailyRewardCurrentDay).toBe(2);
    useGameStore.getState().claimDailyReward();
    expect(useGameStore.getState().dailyRewardClaimedDays).toEqual([1, 2]);
  });
});
