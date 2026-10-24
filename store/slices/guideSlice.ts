// NekoZ-guide : arrivée, répliques déjà dites et chaîne de quêtes. Rien ici
// n'est remis à zéro au Prestige (voir doPrestige, qui ne liste pas ce champ).
// Les données (répliques, quêtes) vivent dans lib/game/nekozGuide.ts.
import type { StateCreator } from 'zustand';
import { currentGuideQuest, initialGuideState, isOneShotLine, questBaselineFor } from '@/lib/game/nekozGuide';
import { requestUrgentSave } from '../gameStoreHelpers';
import type { GameStore, GuideActions } from '../gameStore.types';

export const createGuideSlice: StateCreator<GameStore, [], [], GuideActions> = (set, get) => ({
  guideArrive: () => set(s => {
    if (s.nekozGuide.arrivalPrestige !== null) return s;
    return {
      nekozGuide: {
        ...s.nekozGuide,
        arrivalPrestige: s.prestigeLevel,
        lastPrestige: s.prestigeLevel,
        questBaseline: questBaselineFor(s, s.nekozGuide.questIndex),
      },
    };
  }),

  guideSayLine: (id) => set(s => {
    const g = s.nekozGuide;
    if (id === 'post_prestige') return { nekozGuide: { ...g, lastPrestige: s.prestigeLevel } };
    if (!isOneShotLine(id) || g.seen.includes(id)) return s;
    return { nekozGuide: { ...g, seen: [...g.seen, id] } };
  }),

  claimGuideQuest: () => {
    const s = get();
    const quest = currentGuideQuest(s);
    if (!quest?.claimable) return false;
    const questIndex = s.nekozGuide.questIndex + 1;
    set({
      nekoGems: s.nekoGems + quest.def.reward,
      totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
      nekozGuide: { ...s.nekozGuide, questIndex, questBaseline: questBaselineFor(s, questIndex) },
    });
    // Récompense en gemmes : sauvegarde rapide, comme les autres réclamations importantes.
    requestUrgentSave('guide_quest');
    return true;
  },

  // Pas de gemmes : en local, on peut être connecté à son vrai compte.
  debugCompleteGuideQuest: () => {
    const s = get();
    if (!currentGuideQuest(s)) return;
    const questIndex = s.nekozGuide.questIndex + 1;
    set({ nekozGuide: { ...s.nekozGuide, questIndex, questBaseline: questBaselineFor(s, questIndex) } });
  },

  debugResetGuide: () => set({ nekozGuide: initialGuideState() }),
});
