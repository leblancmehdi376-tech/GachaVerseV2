import { describe, it, expect, beforeEach } from 'vitest';
import {
  PERIPLE_BOARD, BOARD_SIZE, BOARD_GRID, PERIPLE_MAX_DICE, PERIPLE_DICE_REGEN_MS, PERIPLE_TIERS, PERIPLE_EVENT, PERIPLE_SHOP,
  PERIPLE_TITLE, GACHA_WHEEL, CHANCE_CARDS, SKILL_TILES,
  computePeripleDice, msToNextPeripleDie, boardPath, countStartPasses, getPeripleTierProgress, getSkillRewards,
  drawChanceCards, spinGachaWheel, getHuntRewards, huntMedal, HUNT_MEDAL_SCORES,
  PERIPLE_QUESTS, PERIPLE_QUESTS_TOTAL_GEMS, getPeripleQuestProgress,
} from './periple';
import { mergeMonotonicState } from '@/lib/firebase/cloudSaveSync';
import { TITLE_GOLD_BONUS_PCT } from './titles';
import { useGameStore } from '@/store/gameStore';

describe('plateau', () => {
  it('forme une boucle de cases adjacentes sur le pourtour de la grille', () => {
    expect(BOARD_SIZE).toBe(4 * (BOARD_GRID - 1));
    for (let i = 0; i < BOARD_SIZE; i++) {
      const a = PERIPLE_BOARD[i], b = PERIPLE_BOARD[(i + 1) % BOARD_SIZE];
      expect(Math.abs(a.r - b.r) + Math.abs(a.c - b.c)).toBe(1);
    }
    expect(PERIPLE_BOARD[0].kind).toBe('start');
  });

  it('calcule le chemin et les passages par le Départ', () => {
    expect(boardPath(22, 4)).toEqual([23, 0, 1, 2]);
    expect(boardPath(1, -2)).toEqual([0, 23]);
    expect(countStartPasses(22, 4)).toBe(1);
    expect(countStartPasses(22, 1)).toBe(0);
    expect(countStartPasses(1, -2)).toBe(0);
  });
});

describe('dés', () => {
  it('régénère un dé par intervalle sans dépasser la réserve', () => {
    expect(computePeripleDice(2, 0, PERIPLE_DICE_REGEN_MS * 1.5)).toEqual({ dice: 3, at: PERIPLE_DICE_REGEN_MS });
    expect(computePeripleDice(1, 0, PERIPLE_DICE_REGEN_MS * 50).dice).toBe(PERIPLE_MAX_DICE);
    expect(computePeripleDice(12, 0, PERIPLE_DICE_REGEN_MS * 3).dice).toBe(12);
    expect(msToNextPeripleDie(PERIPLE_MAX_DICE, 0, 0)).toBeNull();
    expect(msToNextPeripleDie(1, 0, 1000)).toBe(PERIPLE_DICE_REGEN_MS - 1000);
  });
});

describe('récompenses', () => {
  it('une meilleure médaille rapporte toujours plus', () => {
    for (const kind of SKILL_TILES) {
      for (let m = 1; m <= 3; m++) {
        const prev = getSkillRewards(kind, (m - 1) as 0 | 1 | 2);
        const cur = getSkillRewards(kind, m as 1 | 2 | 3);
        expect(cur[0].amount + cur[1].amount).toBeGreaterThan(prev[0].amount + prev[1].amount);
      }
    }
  });

  it('les quêtes de l\'événement rapportent 20 000 gemmes au total', () => {
    expect(PERIPLE_QUESTS_TOTAL_GEMS).toBe(20_000);
    expect(new Set(PERIPLE_QUESTS.map(q => q.id)).size).toBe(PERIPLE_QUESTS.length);
    const tiersQuest = PERIPLE_QUESTS.find(q => q.stat === 'tiers')!;
    expect(tiersQuest.target).toBe(PERIPLE_TIERS.length);
    expect(getPeripleQuestProgress(tiersQuest, {}, 99)).toBe(tiersQuest.target);
    const allGold = PERIPLE_QUESTS.find(q => q.stat === 'goldAll')!;
    expect(getPeripleQuestProgress(allGold, { gold_combat: 4, gold_hunt: 1, gold: 9 }, 0)).toBe(2);
  });

  it('la case spéciale est pile en face du Départ', () => {
    expect(PERIPLE_BOARD[BOARD_SIZE / 2].kind).toBe('hunt');
    expect(PERIPLE_BOARD.filter(t => t.kind === 'hunt')).toHaveLength(1);
  });

  it('la Chasse aux Raretés récompense mieux chaque point de score', () => {
    const value = (sc: number) => getHuntRewards(sc).reduce((s, r) => s + r.amount, 0);
    for (let sc = 1; sc <= 25; sc++) expect(value(sc)).toBeGreaterThan(value(sc - 1));
    expect(huntMedal(HUNT_MEDAL_SCORES[3])).toBe(3);
    expect(huntMedal(HUNT_MEDAL_SCORES[1] - 1)).toBe(0);
    expect(getHuntRewards(999)).toEqual(getHuntRewards(25));
  });

  it('tire 3 cartes du destin différentes', () => {
    for (const r of [0, 0.5, 0.999]) {
      const cards = drawChanceCards(() => r);
      expect(new Set(cards.map(c => c.id)).size).toBe(3);
    }
    expect(CHANCE_CARDS.every(c => c.rewards.length > 0)).toBe(true);
  });

  it('la roue renvoie un segment valide', () => {
    expect(spinGachaWheel(() => 0)).toBe(0);
    expect(spinGachaWheel(() => 0.9999)).toBe(GACHA_WHEEL.length - 1);
  });

  it('suit la progression vers le prochain palier', () => {
    expect(getPeripleTierProgress(0)).toMatchObject({ next: 0, pct: 0 });
    expect(getPeripleTierProgress(PERIPLE_TIERS[0].points).next).toBe(1);
    expect(getPeripleTierProgress(999_999)).toMatchObject({ next: -1, pct: 100, overallPct: 100 });
  });

  it('le titre exclusif a un bonus d\'or', () => {
    expect(PERIPLE_TIERS.at(-1)!.reward.kind).toBe('title');
    expect(TITLE_GOLD_BONUS_PCT[PERIPLE_TITLE]).toBeGreaterThan(0);
  });
});

describe('peripleSlice', () => {
  beforeEach(() => {
    useGameStore.setState({ peripleEventId: '', suppressToasts: true });
    useGameStore.getState().ensurePeriple();
  });

  it('initialise une nouvelle édition avec une réserve pleine', () => {
    const s = useGameStore.getState();
    expect(s.peripleEventId).toBe(PERIPLE_EVENT.id);
    expect(s.peripleDice).toBe(PERIPLE_MAX_DICE);
    expect(s.periplePos).toBe(0);
    expect(s.periplePending).toBeNull();
  });

  it('un lancer avance le pion et bloque le dé suivant jusqu\'au mini-jeu', () => {
    const r = useGameStore.getState().rollPeriple();
    if (!r) return; // événement terminé : rien à tester
    const s = useGameStore.getState();
    expect(s.peripleDice).toBe(PERIPLE_MAX_DICE - 1 + (r.landed === 'start' ? 1 : 0));
    expect(s.periplePos).toBe(r.path.at(-1));
    expect(s.periplePending).toEqual({ kind: r.landed, tile: r.path.at(-1) });
    expect(useGameStore.getState().rollPeriple()).toBeNull();
  });

  it('crédite la médaille d\'un mini-jeu d\'adresse puis libère le dé', () => {
    useGameStore.setState({ periplePending: { kind: 'combat', tile: 2 }, peripleTokens: 0, periplePoints: 0 });
    const loot = useGameStore.getState().finishPeripleGame(3);
    const s = useGameStore.getState();
    expect(loot?.rewards).toEqual(getSkillRewards('combat', 3));
    expect(s.peripleTokens).toBe(getSkillRewards('combat', 3)[0].amount);
    expect(s.periplePending).toBeNull();
    expect(s.peripleDaily.gold).toBe(1);
    expect(s.peripleDaily.combat).toBe(1);
    expect(s.peripleStats.gold_combat).toBe(1);
    expect(useGameStore.getState().finishPeripleGame(3)).toBeNull();
  });

  it('la chasse crédite selon le score, seulement sur la case spéciale', () => {
    useGameStore.setState({ periplePending: { kind: 'combat', tile: 2 } });
    expect(useGameStore.getState().finishPeripleHunt(12)).toBeNull();
    useGameStore.setState({ periplePending: { kind: 'hunt', tile: 12 }, peripleTokens: 0 });
    const loot = useGameStore.getState().finishPeripleHunt(12);
    expect(loot?.rewards).toEqual(getHuntRewards(12));
    expect(useGameStore.getState().peripleTokens).toBe(getHuntRewards(12)[0].amount);
    expect(useGameStore.getState().periplePending).toBeNull();
  });

  it('les cartes et la roue ne se jouent que sur leur case', () => {
    useGameStore.setState({ periplePending: { kind: 'combat', tile: 2 } });
    expect(useGameStore.getState().playPeripleChance(0)).toBeNull();
    expect(useGameStore.getState().spinPeripleWheel()).toBeNull();
    useGameStore.setState({ periplePending: { kind: 'chance', tile: 3 }, periplePos: 3 });
    const r = useGameStore.getState().playPeripleChance(1);
    expect(r?.cards).toHaveLength(3);
    expect(useGameStore.getState().periplePos).toBe(r?.bonusPath.at(-1) ?? 3);
  });

  it('compte les lancers et ne paie une quête qu\'une fois', () => {
    const before = useGameStore.getState().peripleStats.rolls ?? 0;
    if (useGameStore.getState().rollPeriple()) expect(useGameStore.getState().peripleStats.rolls).toBe(before + 1);
    const q = PERIPLE_QUESTS.find(x => x.id === 'q_rolls_100')!;
    expect(useGameStore.getState().claimPeripleQuest(q.id)).toBeNull();
    useGameStore.setState({ peripleStats: { rolls: 100 }, nekoGems: 0 });
    expect(useGameStore.getState().claimPeripleQuest(q.id)?.rewards).toEqual([{ kind: 'gems', amount: q.gems }]);
    expect(useGameStore.getState().nekoGems).toBe(q.gems);
    expect(useGameStore.getState().claimPeripleQuest(q.id)).toBeNull();
    expect(useGameStore.getState().nekoGems).toBe(q.gems);
  });

  it('un appareil en retard ne rend jamais une quête réclamable à nouveau', () => {
    useGameStore.setState({ peripleQuestsClaimed: ['q_rolls_100'], peripleTiersClaimed: [0], peripleStats: { rolls: 60 } });
    const stale = { peripleEventId: PERIPLE_EVENT.id, peripleQuestsClaimed: ['q_laps_30'], peripleTiersClaimed: [1], peripleStats: { rolls: 10, laps: 12 } };
    const merged = mergeMonotonicState(stale, stale);
    expect(merged.peripleQuestsClaimed.sort()).toEqual(['q_laps_30', 'q_rolls_100']);
    expect(merged.peripleTiersClaimed).toEqual([0, 1]);
    expect(merged.peripleStats).toEqual({ rolls: 60, laps: 12 });
    // Autre édition : ignorée.
    const other = mergeMonotonicState({ ...stale, peripleEventId: 'ancienne' }, null);
    expect(other.peripleQuestsClaimed).toEqual(['q_rolls_100']);
  });

  it('refuse un palier non atteint ou déjà réclamé', () => {
    const st = useGameStore.getState();
    expect(st.claimPeripleTier(0)).toBeNull();
    useGameStore.setState({ periplePoints: PERIPLE_TIERS[0].points });
    st.claimPeripleTier(0);
    expect(st.claimPeripleTier(0)).toBeNull();
    expect(useGameStore.getState().peripleTiersClaimed).toEqual([0]);
    expect(useGameStore.getState().peripleDice).toBe(PERIPLE_MAX_DICE + PERIPLE_TIERS[0].reward.amount);
  });

  it('applique le stock de la boutique, quotidien ou global', () => {
    const die = PERIPLE_SHOP.find(i => i.id === 's_die')!;
    expect(useGameStore.getState().buyPeripleItem('s_die')).toBeNull();
    useGameStore.setState({ peripleTokens: die.cost * (die.stock + 1) });
    for (let i = 0; i < die.stock; i++) expect(useGameStore.getState().buyPeripleItem('s_die')).not.toBeNull();
    expect(useGameStore.getState().buyPeripleItem('s_die')).toBeNull();
    expect(useGameStore.getState().peripleDaily.shop.s_die).toBe(die.stock);
    expect(useGameStore.getState().peripleTokens).toBe(die.cost);
  });
});
