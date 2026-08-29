import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import type { OwnedCharacter } from '@/types/game';
import type { ActiveExpedition } from '@/store/gameStore.types';

// Construit un état de run "avancée", au-delà du palier de déblocage du
// Prestige (41), avec des données dans TOUS les champs que doPrestige() doit
// remettre à zéro (voir le commentaire au-dessus de doPrestige dans
// metaProgressionSlice.ts pour la liste attendue) — pour vérifier le reset de
// bout en bout plutôt qu'en isolation.
function setPrestigeableRunState() {
  const dummyCharacter: OwnedCharacter = {
    templateId: 'jinwoo', rank: 3, copies: 2, level: 10, currentForm: 0, xp: 100,
  };
  const dummyExpedition: ActiveExpedition = {
    id: 'exp1', defId: 'def1', characterIds: ['jinwoo'], startTime: 0, endTime: 1000, claimed: false,
  };
  useGameStore.setState({
    maxPalierReached: 45,
    runPeakPalier: 45,
    palier: 45,
    wave: 7,
    hero: { level: 20, currentForm: 2, xp: 500 },
    pixelCoins: bnFromNumber(1_000_000),
    collection: { jinwoo: dummyCharacter },
    championInventory: { jinwoo: 3 },
    historicalMaxRank: {},
    equipmentInventory: { epee_ether: 2 },
    unlockedEquipRarities: ['C', 'R', 'E'],
    unlockedEquipDropRarities: ['C', 'R'],
    equippedTeam: ['jinwoo', null, null, null],
    inventory: { coin_jinwoo: 250, coin_arthur_leywin: 10 },
    // Pièces d'événement déjà achetées plusieurs fois cette run — leur coût
    // ×1.1^achats doit retomber au prix de base après le prestige, sinon le
    // joueur se retrouve avec un coût gonflé alors que ses pièces (inventory
    // ci-dessus) sont retombées à 0.
    eventCharacterPurchases: { shadow_monarch: 4, arthur_leywin: 1 },
    goldUpgradeLevel: 6,
    bossActive: true,
    bossTimeLeft: 12,
    bossAvoided: true,
    ultUsedThisFight: ['jinwoo'],
    expeditionActive: [dummyExpedition],
    expeditionDropInventory: { forge_item: 5 },
    nekoGems: 999,
    bossCrowns: 50,
    voidOrbs: 20,
    achievementProgress: { kills_500: 500, first_boss: 1 },
    achievementUnlocked: { kills_500: true, first_boss: true },
    achievementsClaimed: { kills_500: true, first_boss: true },
  });
}

describe('doPrestige — resets', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("ne fait rien si le palier requis (41) n'est pas atteint cette run", async () => {
    setPrestigeableRunState();
    useGameStore.setState({ maxPalierReached: 10, runPeakPalier: 10 });

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    expect(state.prestigeLevel).toBe(0);
    expect(state.eventCharacterPurchases).toEqual({ shadow_monarch: 4, arthur_leywin: 1 });
    expect(state.collection).toEqual({ jinwoo: expect.any(Object) });
  });

  it("réinitialise le coût des personnages d'événement en même temps que les pièces", async () => {
    setPrestigeableRunState();

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    expect(state.eventCharacterPurchases).toEqual({});
    expect(state.inventory).toEqual({});
  });

  it('réinitialise équipement, collection, héros et progression de la run', async () => {
    setPrestigeableRunState();

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    expect(state.equipmentInventory).toEqual({});
    expect(state.unlockedEquipRarities).toEqual(['C']);
    expect(state.unlockedEquipDropRarities).toEqual(['C']);
    expect(bnToNumber(state.pixelCoins)).toBe(0);
    expect(state.collection).toEqual({});
    expect(state.championInventory).toEqual({});
    expect(state.equippedTeam).toEqual([null, null, null, null]);
    expect(state.goldUpgradeLevel).toBe(0);
    expect(state.hero).toEqual({ level: 1, currentForm: 0, xp: 0 });
    expect(state.wave).toBe(1);
    expect(state.palier).toBe(1);
    expect(state.runPeakPalier).toBe(1);
    expect(state.currentEnemy?.id).toBe('p1_w1');
    expect(state.bossActive).toBe(false);
    expect(state.bossTimeLeft).toBe(0);
    expect(state.bossAvoided).toBe(false);
    expect(state.ultUsedThisFight).toEqual([]);
    expect(state.expeditionActive).toEqual([]);
    expect(state.expeditionDropInventory).toEqual({});
  });

  it('conserve maxPalierReached et les monnaies premium (gemmes, couronnes, orbes)', async () => {
    setPrestigeableRunState();

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    expect(state.maxPalierReached).toBe(45);
    expect(state.nekoGems).toBe(999);
    expect(state.bossCrowns).toBe(50);
    expect(state.voidOrbs).toBe(20);
  });

  it('banque le rang max de chaque carte possédée avant de vider la collection', async () => {
    setPrestigeableRunState();

    await useGameStore.getState().doPrestige();

    expect(useGameStore.getState().historicalMaxRank.jinwoo).toBe(3);
  });

  it('incrémente prestigeLevel et crédite des jetons de Prestige', async () => {
    setPrestigeableRunState();
    const before = useGameStore.getState().prestigeLevel;

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    expect(state.prestigeLevel).toBe(before + 1);
    expect(state.prestigeTokens).toBeGreaterThan(0);
  });

  it('ne remet à zéro que les succès marqués resetsOnPrestige, conserve les permanents', async () => {
    setPrestigeableRunState();

    await useGameStore.getState().doPrestige();

    const state = useGameStore.getState();
    // kills_500 : resetsOnPrestige:true (lib/game/achievements.ts)
    expect(state.achievementProgress.kills_500).toBeUndefined();
    expect(state.achievementUnlocked.kills_500).toBeUndefined();
    expect(state.achievementsClaimed.kills_500).toBeUndefined();
    // first_boss : pas de resetsOnPrestige, doit survivre au reset
    expect(state.achievementProgress.first_boss).toBe(1);
    expect(state.achievementUnlocked.first_boss).toBe(true);
    expect(state.achievementsClaimed.first_boss).toBe(true);
  });

  it("ne re-débloque pas un succès 'de run' basé sur un cumul à vie (kills, pulls, quêtes, améliorations) après reset", async () => {
    setPrestigeableRunState();
    // totalKills etc. sont des cumuls à vie, jamais remis à zéro par
    // doPrestige (utilisés par l'admin/le classement) — sans référence de
    // prestige, retracker ces compteurs juste après le reset (ex: le joueur
    // rouvre la page Succès) redéclencherait instantanément kills_500, alors
    // que son unlocked/claimed viennent d'être remis à zéro.
    useGameStore.setState({ totalKills: 600, totalGachaPulls: 50, totalQuestsCompleted: 30, totalUpgradesPerformed: 100 });

    await useGameStore.getState().doPrestige();

    const { trackKills, trackGachaPulls, trackQuestsCompleted, trackUpgrades } = await import('@/store/achievementTrackers');
    const s = useGameStore.getState();
    trackKills(s.totalKills);
    trackGachaPulls(s.totalGachaPulls);
    trackQuestsCompleted(s.totalQuestsCompleted);
    trackUpgrades(s.totalUpgradesPerformed);

    const after = useGameStore.getState();
    expect(after.achievementUnlocked.kills_500).toBeUndefined();
    expect(after.achievementUnlocked.pull_10).toBeUndefined();
    expect(after.achievementUnlocked.quest_10).toBeUndefined();
    expect(after.achievementUnlocked.upgrade_10).toBeUndefined();
  });
});

describe('claimOfflineEarnings — progression des quêtes "Vaincre X monstres"', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  function offlineGain(kills: number) {
    return {
      coins: bnFromNumber(1000), gems: 0, kills,
      seconds: 3600, rawSeconds: 3600, capped: false, at: Date.now(),
    };
  }

  it('incrémente les quêtes journalière et hebdomadaire de kills du nombre de monstres vaincus hors-ligne', () => {
    const before = useGameStore.getState();
    const dBefore = before.quests.find(q => q.id === 'd_kills')!.current;
    const wBefore = before.weeklyQuests.find(q => q.id === 'w_kills')!.current;

    useGameStore.getState().claimOfflineEarnings(offlineGain(42));

    const after = useGameStore.getState();
    expect(after.quests.find(q => q.id === 'd_kills')!.current).toBe(dBefore + 42);
    expect(after.weeklyQuests.find(q => q.id === 'w_kills')!.current).toBe(wBefore + 42);
  });

  it('incrémente le cumul à vie totalKills (utilisé par le suivi de succès trackKills)', () => {
    const before = useGameStore.getState().totalKills ?? 0;

    useGameStore.getState().claimOfflineEarnings(offlineGain(17));

    expect(useGameStore.getState().totalKills).toBe(before + 17);
  });

  it('ne dépasse jamais la cible de la quête (plafonnement comme un kill normal)', () => {
    const target = useGameStore.getState().quests.find(q => q.id === 'd_kills')!.target;

    useGameStore.getState().claimOfflineEarnings(offlineGain(target + 1000));

    expect(useGameStore.getState().quests.find(q => q.id === 'd_kills')!.current).toBe(target);
  });

  it("ne touche pas aux quêtes de kills si aucun monstre n'a été vaincu hors-ligne", () => {
    const before = useGameStore.getState();
    const dBefore = before.quests.find(q => q.id === 'd_kills')!.current;

    useGameStore.getState().claimOfflineEarnings(offlineGain(0));

    expect(useGameStore.getState().quests.find(q => q.id === 'd_kills')!.current).toBe(dBefore);
  });
});
