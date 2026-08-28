// Quêtes journalières / hebdomadaires / événement.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { getTodayDayKey, getThisWeekKey } from '@/lib/game/shop';
import { DAILY_QUEST_DEFS, WEEKLY_QUEST_DEFS, rollQuestDefs, rollCoinHoursQuest } from '../gameStoreHelpers';
import type { GameStore, QuestActions } from '../gameStore.types';
import { bnAdd, bnFromNumber, bnToNumber } from '@/lib/game/bignum';

export const createQuestSlice: StateCreator<GameStore, [], [], QuestActions> = (set, get) => ({
  // Helper générique et réutilisable pour toute future quête : cherche l'id
  // dans les 3 tableaux (jour/semaine/événement) et incrémente celle trouvée.
  // Appelable depuis n'importe où dans le store, ou depuis un autre store
  // (ex: useGameStore.getState().bumpQuestProgress('w_expedition')).
  bumpQuestProgress: (id, by = 1) => set(state => {
    const bump = (arr: typeof state.quests) => arr.map(q => q.id === id && !q.done ? { ...q, current: Math.min(q.current + by, q.target) } : q);
    return {
      quests: bump(state.quests),
      weeklyQuests: bump(state.weeklyQuests ?? []),
      eventQuests: bump(state.eventQuests ?? []),
    };
  }),
  // Fixe directement la progression (pour les quêtes "atteindre X", pas "cumuler +1").
  setQuestProgress: (id, value) => set(state => {
    const setVal = (arr: typeof state.quests) => arr.map(q => q.id === id && !q.done ? { ...q, current: Math.min(Math.max(q.current, value), q.target) } : q);
    return {
      quests: setVal(state.quests),
      weeklyQuests: setVal(state.weeklyQuests ?? []),
      eventQuests: setVal(state.eventQuests ?? []),
    };
  }),
  claimQuest: (id) => set(s => {
    const q = s.quests.find(q => q.id === id);
    if (!q || q.current < q.target || q.done) return {};
    return {
      quests: s.quests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
      nekoGems:   q.rewardType==='gems'  ? s.nekoGems  + q.reward : s.nekoGems,
      pixelCoins: q.rewardType==='coins' ? bnAdd(s.pixelCoins, bnFromNumber(q.reward)) : s.pixelCoins,
      totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
    };
  }),

  // Réinitialise les quêtes à un jour nouveau : chaque catégorie retire une
  // NOUVELLE variante aléatoire (target+reward, voir rollQuestDefs) — cette
  // variante reste figée jusqu'au prochain reset, même si le taux de gain du
  // joueur évolue en cours de journée (cas de la quête "heures de coins").
  ensureDailyQuests: () => {
    const today = getTodayDayKey();
    set(state => {
      const dayChanged = state.questsDayKey !== today;
      if (!dayChanged) return {};
      const coinsPerHour = bnToNumber(get().getOfflineCoinsPerHour());
      const quests = [...rollQuestDefs(DAILY_QUEST_DEFS), rollCoinHoursQuest(coinsPerHour)]
        .map(def => ({ ...def, current: 0, done: false }));
      return { questsDayKey: today, quests };
    });
  },

  ensureWeeklyQuests: () => {
    const thisWeek = getThisWeekKey();
    set(state => {
      const weekChanged = state.weeklyQuestsDayKey !== thisWeek;
      if (!weekChanged) return {};
      const weeklyQuests = rollQuestDefs(WEEKLY_QUEST_DEFS).map(def => ({ ...def, current: 0, done: false }));
      return { weeklyQuestsDayKey: thisWeek, weeklyQuests };
    });
  },

  claimWeeklyQuest: (id) => set(s => {
    const q = s.weeklyQuests?.find(q => q.id === id);
    if (!q || q.current < q.target || q.done) return {};
    return {
      weeklyQuests: s.weeklyQuests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
      nekoGems:   q.rewardType==='gems'  ? s.nekoGems   + q.reward : s.nekoGems,
      pixelCoins: q.rewardType==='coins' ? bnAdd(s.pixelCoins, bnFromNumber(q.reward)) : s.pixelCoins,
      totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
    };
  }),

  claimEventQuest: (id) => set(s => {
    const q = s.eventQuests?.find(q => q.id === id);
    if (!q || q.current < q.target || q.done) return {};
    return {
      eventQuests: s.eventQuests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
      nekoGems:   q.rewardType==='gems'  ? s.nekoGems   + q.reward : s.nekoGems,
      pixelCoins: q.rewardType==='coins' ? bnAdd(s.pixelCoins, bnFromNumber(q.reward)) : s.pixelCoins,
      totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
    };
  }),

  bumpEventQuest: (id, by = 1) => set(s => {
    const q = s.eventQuests?.find(q => q.id === id);
    if (!q || q.done) return {};
    return {
      eventQuests: s.eventQuests.map(q2 =>
        q2.id === id ? { ...q2, current: Math.min(q2.current + by, q2.target) } : q2
      ),
    };
  }),
});
