import { describe, it, expect } from 'vitest';
import { DAILY_REWARDS, DAILY_REWARD_TITLES, getDailyRewardDay } from './dailyRewards';
import { TITLE_GOLD_BONUS_PCT } from './titles';

describe('DAILY_REWARD_TITLES — titres du calendrier de connexion (jours 7 et 28)', () => {
  it("recense le titre du jour 7 et celui du dernier jour du cycle (28)", () => {
    expect(DAILY_REWARD_TITLES).toEqual([
      { day: 7, title: '⚡ Le Protagoniste Prometteur' },
      { day: 28, title: '🌌 Briseur de Limites' },
    ]);
  });

  it('les jours 7 et 28 contiennent bien un item de type "title" dans le calendrier', () => {
    for (const { day, title } of DAILY_REWARD_TITLES) {
      const def = getDailyRewardDay(day);
      expect(def?.items.some(i => i.kind === 'title' && i.title === title)).toBe(true);
    }
  });

  it('chaque titre du calendrier a un bonus d\'or défini (sinon il affiche +0% dans l\'UI)', () => {
    for (const { title } of DAILY_REWARD_TITLES) {
      expect(TITLE_GOLD_BONUS_PCT[title]).toBeGreaterThan(0);
    }
  });
});
