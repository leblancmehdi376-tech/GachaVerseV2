import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { useToastStore } from '@/hooks/useToast';
import { ACHIEVEMENTS } from '@/lib/game/achievements';

function achiev(id: string) {
  return ACHIEVEMENTS.find(a => a.id === id)!;
}

describe('achievementSlice — setProgress', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useToastStore.setState({ toasts: [] });
  });

  it('ne fait jamais régresser la progression (Math.max)', () => {
    useGameStore.getState().setProgress('bosses_5', 3);
    useGameStore.getState().setProgress('bosses_5', 1);

    expect(useGameStore.getState().getProgress('bosses_5')).toBe(3);
  });

  it('débloque le succès une fois la target atteinte, pas avant', () => {
    const target = achiev('bosses_5').target;

    useGameStore.getState().setProgress('bosses_5', target - 1);
    expect(useGameStore.getState().isUnlocked('bosses_5')).toBe(false);

    useGameStore.getState().setProgress('bosses_5', target);
    expect(useGameStore.getState().isUnlocked('bosses_5')).toBe(true);
  });

  it('ignore un id de succès inconnu sans planter', () => {
    expect(() => useGameStore.getState().setProgress('does_not_exist', 999)).not.toThrow();
    expect(useGameStore.getState().getProgress('does_not_exist')).toBe(0);
  });

  it('affiche un toast de déblocage une seule fois, à la première transition vers unlocked', () => {
    useGameStore.getState().setProgress('kills_1', 1); // target=1 → débloqué direct
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].type).toBe('levelup');

    // Rappel après déblocage (ex: re-render du tracker) : pas de doublon.
    useGameStore.getState().setProgress('kills_1', 1);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("n'affiche aucun toast quand suppressToasts est actif (ex: restauration cloud)", () => {
    useGameStore.setState({ suppressToasts: true });

    useGameStore.getState().setProgress('kills_1', 1);

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('achievementSlice — setProgress, rattrapage des claims périmés', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useToastStore.setState({ toasts: [] });
  });

  it("efface le claim d'un succès resetsOnPrestige si la progression recalculée prouve qu'il n'est plus terminé", () => {
    // Simule un compte touché par le bug de fusion cloud (mergeMonotonicState) :
    // kills_500 est marqué claimed alors que sa progression réelle (recalculée
    // depuis les stats, elles bien synchronisées) est repassée sous la target
    // après un Prestige.
    useGameStore.setState({ achievementsClaimed: { kills_500: true } });

    useGameStore.getState().setProgress('kills_500', 10); // très en dessous de target:500

    const s = useGameStore.getState();
    expect(s.isClaimed('kills_500')).toBe(false);
    expect(s.isUnlocked('kills_500')).toBe(false);
  });

  it('ne touche pas au claim d\'un succès permanent (non resetsOnPrestige) même sous sa target', () => {
    useGameStore.setState({ achievementsClaimed: { bosses_100: true } });

    useGameStore.getState().setProgress('bosses_100', 1); // très en dessous de target:100

    expect(useGameStore.getState().isClaimed('bosses_100')).toBe(true);
  });

  it("ne touche pas au claim d'un succès resetsOnPrestige toujours réellement terminé", () => {
    useGameStore.setState({ achievementsClaimed: { kills_500: true } });

    useGameStore.getState().setProgress('kills_500', 500); // target atteinte

    expect(useGameStore.getState().isClaimed('kills_500')).toBe(true);
  });
});

describe('achievementSlice — claimAchievement', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useToastStore.setState({ toasts: [] });
  });

  it('ne fait rien si le succès n\'est pas encore débloqué', () => {
    const gemsBefore = useGameStore.getState().nekoGems;

    useGameStore.getState().claimAchievement('first_boss');

    const s = useGameStore.getState();
    expect(s.isClaimed('first_boss')).toBe(false);
    expect(s.nekoGems).toBe(gemsBefore);
  });

  it('crédite la récompense en gemmes et marque le succès comme réclamé', () => {
    const reward = achiev('first_boss').reward!.value as number; // reward gems
    const gemsBefore = useGameStore.getState().nekoGems;
    useGameStore.getState().setProgress('first_boss', 1);

    useGameStore.getState().claimAchievement('first_boss');

    const s = useGameStore.getState();
    expect(s.isClaimed('first_boss')).toBe(true);
    expect(s.nekoGems).toBe(gemsBefore + reward);
  });

  it('octroie le titre récompense et l\'ajoute à unlockedTitles', () => {
    const titleReward = achiev('kills_1').reward!.value as string;
    useGameStore.getState().setProgress('kills_1', 1);

    useGameStore.getState().claimAchievement('kills_1');

    const s = useGameStore.getState();
    expect(s.isClaimed('kills_1')).toBe(true);
    expect(s.unlockedTitles).toContain(titleReward);
  });

  it('ne crédite la récompense qu\'une seule fois en cas de double réclamation', () => {
    const reward = achiev('first_boss').reward!.value as number;
    const gemsBefore = useGameStore.getState().nekoGems;
    useGameStore.getState().setProgress('first_boss', 1);

    useGameStore.getState().claimAchievement('first_boss');
    useGameStore.getState().claimAchievement('first_boss');

    expect(useGameStore.getState().nekoGems).toBe(gemsBefore + reward);
  });

  it('ignore un id de succès inconnu sans planter', () => {
    expect(() => useGameStore.getState().claimAchievement('does_not_exist')).not.toThrow();
  });
});

describe('achievementSlice — bumpProgress / unlockedCount / getters', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useToastStore.setState({ toasts: [] });
  });

  it('bumpProgress incrémente la progression existante (par défaut de 1)', () => {
    useGameStore.getState().bumpProgress('bosses_5');
    useGameStore.getState().bumpProgress('bosses_5');
    useGameStore.getState().bumpProgress('bosses_5', 3);

    expect(useGameStore.getState().getProgress('bosses_5')).toBe(5);
  });

  it('unlockedCount ne compte que les succès effectivement débloqués', () => {
    expect(useGameStore.getState().unlockedCount()).toBe(0);

    useGameStore.getState().setProgress('kills_1', 1);
    useGameStore.getState().setProgress('first_boss', 1);
    useGameStore.getState().setProgress('bosses_5', 1); // pas encore à la target

    expect(useGameStore.getState().unlockedCount()).toBe(2);
  });

  it('getAchievement retrouve la définition par id', () => {
    expect(useGameStore.getState().getAchievement('kills_1')?.id).toBe('kills_1');
    expect(useGameStore.getState().getAchievement('does_not_exist')).toBeUndefined();
  });

  it('setActiveTitle et unlockTitle (octroi direct hors succès) mettent à jour le store sans doublon', () => {
    useGameStore.getState().unlockTitle('Titre Event');
    useGameStore.getState().unlockTitle('Titre Event'); // ne doit pas dupliquer
    useGameStore.getState().setActiveTitle('Titre Event');

    const s = useGameStore.getState();
    expect(s.unlockedTitles.filter(t => t === 'Titre Event')).toHaveLength(1);
    expect(s.activeTitle).toBe('Titre Event');
  });
});

describe('achievementSlice — resetPrestigeAchievements', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useToastStore.setState({ toasts: [] });
  });

  it("ne remet à zéro que les succès marqués resetsOnPrestige, conserve les permanents", () => {
    useGameStore.setState({
      achievementProgress: { kills_500: 500, first_boss: 1 },
      achievementUnlocked: { kills_500: true, first_boss: true },
      achievementsClaimed: { kills_500: true, first_boss: true },
    });

    useGameStore.getState().resetPrestigeAchievements();

    const s = useGameStore.getState();
    // kills_500 : resetsOnPrestige:true
    expect(s.achievementProgress.kills_500).toBeUndefined();
    expect(s.achievementUnlocked.kills_500).toBeUndefined();
    expect(s.achievementsClaimed.kills_500).toBeUndefined();
    // first_boss : permanent
    expect(s.achievementProgress.first_boss).toBe(1);
    expect(s.achievementUnlocked.first_boss).toBe(true);
    expect(s.achievementsClaimed.first_boss).toBe(true);
  });

  it('capture les 4 cumuls à vie dans prestigeStatBaselines au moment du reset', () => {
    useGameStore.setState({
      totalKills: 700, totalGachaPulls: 80, totalQuestsCompleted: 40, totalUpgradesPerformed: 120,
    });

    useGameStore.getState().resetPrestigeAchievements();

    expect(useGameStore.getState().prestigeStatBaselines).toEqual({
      totalKills: 700, totalGachaPulls: 80, totalQuestsCompleted: 40, totalUpgradesPerformed: 120,
    });
  });

  it("chaque succès 'de run' a un mécanisme de baseline effectif : aucun ne se re-débloque avec les compteurs à vie inchangés juste après reset", async () => {
    // Filet de sécurité de non-régression : si un futur succès resetsOnPrestige
    // est ajouté sans que son tracker retranche prestigeStatBaselines (ou sans
    // que sa source sous-jacente soit elle-même remise à zéro par doPrestige,
    // comme pixelCoins/collection/equippedTeam), il se re-débloquerait
    // instantanément ici — voir le commentaire au-dessus de resetPrestigeAchievements.
    useGameStore.setState({
      totalKills: 10_000_000, totalGachaPulls: 10_000, totalQuestsCompleted: 10_000, totalUpgradesPerformed: 10_000,
    });

    useGameStore.getState().resetPrestigeAchievements();

    const { trackKills, trackGachaPulls, trackQuestsCompleted, trackUpgrades } = await import('@/store/achievementTrackers');
    const s = useGameStore.getState();
    trackKills(s.totalKills);
    trackGachaPulls(s.totalGachaPulls);
    trackQuestsCompleted(s.totalQuestsCompleted);
    trackUpgrades(s.totalUpgradesPerformed);

    for (const a of ACHIEVEMENTS.filter(a => a.resetsOnPrestige && ['kills_', 'pull_', 'quest_', 'upgrade_'].some(p => a.id.startsWith(p)))) {
      expect(useGameStore.getState().achievementUnlocked[a.id]).toBeUndefined();
    }
  });
});
