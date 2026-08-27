// Récompenses de connexion journalière — calendrier 28 jours (voir
// lib/game/dailyRewards.ts pour le contenu). Même principe de reset que les
// quêtes (ensureDailyQuests) : on compare la date du jour (getTodayDayKey) à
// la dernière connue, et on avance le pointeur d'UN jour à chaque nouvelle
// journée détectée — pas de rattrapage si le joueur saute des jours, pas de
// pénalité non plus (on ne fait qu'avancer d'un cran par connexion).
import type { StateCreator } from 'zustand';
import { getTodayDayKey } from '@/lib/game/shop';
import { DAILY_REWARDS, DAILY_REWARD_CYCLE_LENGTH, getDailyRewardDay } from '@/lib/game/dailyRewards';
import { broadcastLocalState } from '../gameStoreHelpers';
import type { GameStore, DailyRewardActions } from '../gameStore.types';
import { bnAdd, bnMulScalar } from '@/lib/game/bignum';

export const createDailyRewardSlice: StateCreator<GameStore, [], [], DailyRewardActions> = (set, get) => ({
  ensureDailyReward: () => {
    const today = getTodayDayKey();
    set(state => {
      if (state.dailyRewardDayKey === today) return {};
      const isFirstEver = !state.dailyRewardDayKey;
      let nextDay = state.dailyRewardCurrentDay || 1;
      let claimedDays = state.dailyRewardClaimedDays ?? [];
      if (!isFirstEver) {
        nextDay += 1;
        if (nextDay > DAILY_REWARD_CYCLE_LENGTH) {
          nextDay = 1;
          claimedDays = [];
        }
      }
      return {
        dailyRewardDayKey: today,
        dailyRewardCurrentDay: nextDay,
        dailyRewardClaimedToday: false,
        dailyRewardClaimedDays: claimedDays,
      };
    });
  },

  claimDailyReward: () => {
    const state = get();
    if (state.dailyRewardClaimedToday) return;
    const def = getDailyRewardDay(state.dailyRewardCurrentDay);
    if (!def) return;

    set(s => {
      let pixelCoins = s.pixelCoins;
      let nekoGems = s.nekoGems;
      let bossCrowns = s.bossCrowns;
      let voidOrbs = s.voidOrbs;
      let totalBossCrownsEarned = s.totalBossCrownsEarned ?? 0;
      let totalVoidOrbsEarned = s.totalVoidOrbsEarned ?? 0;
      let unlockedTitles = s.unlockedTitles;

      for (const item of def.items) {
        switch (item.kind) {
          case 'gems':
            nekoGems += item.amount ?? 0;
            break;
          case 'voidOrbs':
            voidOrbs += item.amount ?? 0;
            totalVoidOrbsEarned += item.amount ?? 0;
            break;
          case 'crowns':
            bossCrowns += item.amount ?? 0;
            totalBossCrownsEarned += item.amount ?? 0;
            break;
          case 'offlineHours':
            pixelCoins = bnAdd(pixelCoins, bnMulScalar(s.getOfflineCoinsPerHour(), item.amount ?? 0));
            break;
          case 'title':
            if (item.title && !unlockedTitles.includes(item.title)) {
              unlockedTitles = [...unlockedTitles, item.title];
            }
            break;
        }
      }

      return {
        pixelCoins, nekoGems, bossCrowns, voidOrbs,
        totalBossCrownsEarned, totalVoidOrbsEarned, unlockedTitles,
        dailyRewardClaimedToday: true,
        dailyRewardClaimedDays: [...(s.dailyRewardClaimedDays ?? []), s.dailyRewardCurrentDay],
      };
    });
    broadcastLocalState();
  },
});

// Ré-export pratique pour l'UI (évite d'importer directement lib/game/dailyRewards
// partout juste pour la longueur du cycle).
export { DAILY_REWARDS, DAILY_REWARD_CYCLE_LENGTH };
