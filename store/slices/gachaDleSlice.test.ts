import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getDailyTarget, getDleCurrentStreak, getDleDailyReward, getDleQuestProgress, DLE_POOL, DLE_QUESTS } from '@/lib/game/gachadle';

const win = (dateKey: string) => useGameStore.getState().submitDleDailyGuess(dateKey, getDailyTarget(dateKey).id);

describe('GachaDle — défi du jour', () => {
  beforeEach(() => useGameStore.getState().resetGame());

  it('crédite 100 gemmes une seule fois par jour', () => {
    const gems = useGameStore.getState().nekoGems;
    win('2026-09-28');
    win('2026-09-28');
    expect(useGameStore.getState().nekoGems).toBe(gems + 100);
    expect(useGameStore.getState().dleStreak).toBe(1);
  });

  it('ne crédite rien sur une mauvaise proposition', () => {
    const gems = useGameStore.getState().nekoGems;
    const wrong = DLE_POOL.find(c => c.id !== getDailyTarget('2026-09-28').id)!;
    useGameStore.getState().submitDleDailyGuess('2026-09-28', wrong.id);
    expect(useGameStore.getState().nekoGems).toBe(gems);
    expect(useGameStore.getState().dleDailyGuesses).toEqual([wrong.id]);
  });

  it('fait monter la série les jours consécutifs (150 dès 5 jours) et la casse sur un trou', () => {
    const gems = useGameStore.getState().nekoGems;
    for (const d of ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']) win(d);
    expect(useGameStore.getState().dleStreak).toBe(6);
    expect(useGameStore.getState().nekoGems).toBe(gems + 100 + 110 + 120 + 135 + 150 + 150);
    win('2026-10-03');
    expect(useGameStore.getState().dleStreak).toBe(1);
    expect(useGameStore.getState().dleBestStreak).toBe(6);
  });

  it('la série affichée tombe à 0 après un jour manqué', () => {
    expect(getDleCurrentStreak(4, '2026-09-27', '2026-09-28')).toBe(4);
    expect(getDleCurrentStreak(4, '2026-09-26', '2026-09-28')).toBe(0);
    expect(getDleDailyReward(1)).toBe(100);
    expect(getDleDailyReward(12)).toBe(150);
  });
});

describe('GachaDle — quêtes', () => {
  beforeEach(() => useGameStore.getState().resetGame());

  it('réclame une quête accomplie une seule fois', () => {
    useGameStore.getState().recordDleFreeWin(4, 'R');
    const gems = useGameStore.getState().nekoGems;
    const s = useGameStore.getState();
    s.claimDleQuest('dle_guesses_6');
    s.claimDleQuest('dle_guesses_6');
    s.claimDleQuest('dle_guesses_3'); // pas accomplie (4 essais)
    expect(useGameStore.getState().nekoGems).toBe(gems + 100);
    expect(useGameStore.getState().dleQuestsClaimed).toEqual(['dle_guesses_6']);
  });

  it('« moins de N essais » est strict', () => {
    const q = DLE_QUESTS.find(d => d.id === 'dle_guesses_2')!;
    const base = { bestStreak: 0, gamesWon: 1, raritiesFound: [] };
    expect(getDleQuestProgress(q, { ...base, bestGuesses: 2 }).done).toBe(false);
    expect(getDleQuestProgress(q, { ...base, bestGuesses: 1 }).done).toBe(true);
  });

  it('la quête finale demande toutes les autres', () => {
    const all = DLE_QUESTS.find(d => d.kind === 'all')!;
    const full = { bestStreak: 30, gamesWon: 30, bestGuesses: 1, raritiesFound: ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P', 'T'] as const };
    expect(DLE_QUESTS).toHaveLength(26);
    expect(getDleQuestProgress(all, full).done).toBe(true);
    expect(getDleQuestProgress(all, { ...full, raritiesFound: ['C'] }).done).toBe(false);
  });
});
