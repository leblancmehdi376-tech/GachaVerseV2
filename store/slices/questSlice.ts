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
  // Renvoie le même tableau (référence inchangée) quand la quête ciblée n'est
  // trouvée dans aucun des 3 tableaux — sinon set() réalloue quests/
  // weeklyQuests/eventQuests à CHAQUE appel, ce qui force tout composant
  // souscrit au store entier (ex: GameLayout) à re-render même quand rien ne
  // change. Sous spam d'une action qui bump une quête à chaque clic (ex:
  // amélioration de perso), ça peut cascader jusqu'au "Maximum update depth
  // exceeded" de React.
  bumpQuestProgress: (id, by = 1) => set(state => {
    const bump = (arr: typeof state.quests) => {
      let changed = false;
      const next = arr.map(q => {
        if (q.id !== id || q.done) return q;
        const current = Math.min(q.current + by, q.target);
        if (current === q.current) return q;
        changed = true;
        return { ...q, current };
      });
      return changed ? next : arr;
    };
    const quests       = bump(state.quests);
    const weeklyQuests = bump(state.weeklyQuests ?? []);
    const eventQuests  = bump(state.eventQuests ?? []);
    if (quests === state.quests && weeklyQuests === (state.weeklyQuests ?? []) && eventQuests === (state.eventQuests ?? [])) return {};
    return { quests, weeklyQuests, eventQuests };
  }),
  // Fixe directement la progression (pour les quêtes "atteindre X", pas "cumuler +1").
  setQuestProgress: (id, value) => set(state => {
    const setVal = (arr: typeof state.quests) => {
      let changed = false;
      const next = arr.map(q => {
        if (q.id !== id || q.done) return q;
        const current = Math.min(Math.max(q.current, value), q.target);
        if (current === q.current) return q;
        changed = true;
        return { ...q, current };
      });
      return changed ? next : arr;
    };
    const quests       = setVal(state.quests);
    const weeklyQuests = setVal(state.weeklyQuests ?? []);
    const eventQuests  = setVal(state.eventQuests ?? []);
    if (quests === state.quests && weeklyQuests === (state.weeklyQuests ?? []) && eventQuests === (state.eventQuests ?? [])) return {};
    return { quests, weeklyQuests, eventQuests };
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
