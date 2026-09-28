// GachaDle — défi du jour (essais, série, gemmes quotidiennes) et quêtes
// permanentes. Les essais du défi du jour vivent dans le store (et donc dans
// la sauvegarde cloud) : c'est ce qui empêche de rejouer le défi sur un autre
// appareil pour toucher ses gemmes une deuxième fois. Rien ici n'est remis à
// zéro au Prestige (voir doPrestige, qui ne liste pas ces champs).
import type { StateCreator } from 'zustand';
import type { Rarity } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import {
  DLE_QUESTS, getDailyTarget, getDleCurrentStreak, getDleDailyReward, getDleQuestProgress,
  getPreviousDleDateKey, type DleStats,
} from '@/lib/game/gachadle';
import { toast } from '@/hooks/useToast';
import type { GameStore, GachaDleActions } from '../gameStore.types';

export function getDleStats(s: Pick<GameStore, 'dleBestStreak' | 'dleGamesWon' | 'dleBestGuesses' | 'dleRaritiesFound'>): DleStats {
  return {
    bestStreak: s.dleBestStreak ?? 0,
    gamesWon: s.dleGamesWon ?? 0,
    bestGuesses: s.dleBestGuesses ?? 0,
    raritiesFound: s.dleRaritiesFound ?? [],
  };
}

// Stats communes à toute victoire (défi du jour ou partie libre).
function winPatch(s: GameStore, guessCount: number, rarity: Rarity): Partial<GameStore> {
  const found = s.dleRaritiesFound ?? [];
  return {
    dleGamesWon: (s.dleGamesWon ?? 0) + 1,
    dleBestGuesses: s.dleBestGuesses > 0 ? Math.min(s.dleBestGuesses, guessCount) : guessCount,
    dleRaritiesFound: found.includes(rarity) ? found : [...found, rarity],
  };
}

export const createGachaDleSlice: StateCreator<GameStore, [], [], GachaDleActions> = (set, get) => ({
  submitDleDailyGuess: (dateKey, characterId) => {
    const s = get();
    const target = getDailyTarget(dateKey);
    const guesses = s.dleDailyDate === dateKey ? s.dleDailyGuesses : [];
    if (guesses.includes(target.id) || guesses.includes(characterId) || !getCharacterById(characterId)) return;
    const next = [...guesses, characterId];

    if (characterId !== target.id) {
      set({ dleDailyDate: dateKey, dleDailyGuesses: next });
      return;
    }

    // Garde-fou : un seul crédit par jour, même si les essais ont été perdus
    // (sauvegarde cloud plus ancienne, autre appareil...).
    if (s.dleLastWinDate === dateKey) {
      set({ dleDailyDate: dateKey, dleDailyGuesses: next });
      return;
    }
    const streak = s.dleLastWinDate === getPreviousDleDateKey(dateKey) ? (s.dleStreak ?? 0) + 1 : 1;
    const gems = getDleDailyReward(streak);
    set({
      ...winPatch(s, next.length, target.rarity),
      dleDailyDate: dateKey,
      dleDailyGuesses: next,
      dleStreak: streak,
      dleBestStreak: Math.max(s.dleBestStreak ?? 0, streak),
      dleLastWinDate: dateKey,
      nekoGems: s.nekoGems + gems,
    });
    if (!get().suppressToasts) {
      toast.quest('📅 Défi du jour réussi !', `+${gems} 💎 — série de ${streak} jour${streak > 1 ? 's' : ''}`);
    }
  },

  recordDleFreeWin: (guessCount, rarity) => set(s => winPatch(s, guessCount, rarity)),

  claimDleQuest: (id) => {
    const s = get();
    const q = DLE_QUESTS.find(d => d.id === id);
    const claimed = s.dleQuestsClaimed ?? [];
    if (!q || claimed.includes(id) || !getDleQuestProgress(q, getDleStats(s)).done) return;
    set({ dleQuestsClaimed: [...claimed, id], nekoGems: s.nekoGems + q.gems });
    if (!get().suppressToasts) toast.levelup('✅ Quête GachaDle', `+${q.gems} 💎`);
  },
});

/** Série affichée aujourd'hui (0 si le dernier défi réussi date d'avant-hier ou plus). */
export function selectDleCurrentStreak(s: GameStore, today: string): number {
  return getDleCurrentStreak(s.dleStreak ?? 0, s.dleLastWinDate ?? '', today);
}
