import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PLINKO_EVENT, PLINKO_SLOTS, PLINKO_SLOT_COUNT, PLINKO_ROWS, PLINKO_DAILY_BALLS, PLINKO_UPGRADES, PLINKO_BOOSTERS,
  plinkoOdds, plinkoPath, rollPlinkoSlot, plinkoSlotReward, plinkoBoosterSize, plinkoBallsLeft, nextPlinkoUpgradeCost,
  plinkoDailyBalls, PLINKO_QUESTS, PLINKO_QUESTS_TOTAL_GEMS, PLINKO_TITLE,
} from './plinko';
import { rollCharacterAtLeast } from './gacha';
import { getCharacterById } from './characters';
import { getTodayDayKey } from './shop';
import { RARITY_ORDER_ASC, type Rarity } from '@/types/game';
import { mergeMonotonicState } from '@/lib/firebase/cloudSaveSync';
import { useGameStore } from '@/store/gameStore';
import { TITLE_GOLD_BONUS_PCT } from './titles';

const rank = (r: Rarity) => RARITY_ORDER_ASC.indexOf(r);
const rarityOf = (id: string) => getCharacterById(id)!.rarity;

describe('plateau Plinko', () => {
  it('a exactement 15 cases, dont un booster classique et un booster doré', () => {
    expect(PLINKO_SLOT_COUNT).toBe(15);
    expect(PLINKO_SLOTS.filter(s => s.reward.kind === 'booster')).toHaveLength(1);
    expect(PLINKO_SLOTS.filter(s => s.reward.kind === 'goldBooster')).toHaveLength(1);
    for (const kind of ['gems', 'crowns', 'tokens', 'chestRare', 'chestEpic'] as const) {
      expect(PLINKO_SLOTS.some(s => s.reward.kind === kind)).toBe(true);
    }
  });

  it('le booster doré est la case la plus rare, et reste rare même au max de Chance', () => {
    const maxLuck = { luck: PLINKO_UPGRADES.find(u => u.id === 'luck')!.costs.length };
    for (const levels of [{}, maxLuck]) {
      const odds = plinkoOdds(levels);
      expect(odds.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      const gold = odds[PLINKO_SLOTS.findIndex(s => s.reward.kind === 'goldBooster')];
      expect(gold).toBe(Math.min(...odds));
      expect(gold).toBeLessThan(0.01);
    }
  });

  it('le trajet arrive toujours dans la case tirée', () => {
    for (let slot = 0; slot < PLINKO_SLOT_COUNT; slot++) {
      const path = plinkoPath(slot);
      expect(path).toHaveLength(PLINKO_ROWS);
      expect(path.filter(Boolean)).toHaveLength(slot);
    }
  });

  it('tire les cases selon leurs poids', () => {
    expect(rollPlinkoSlot({}, () => 0)).toBe(0);
    expect(rollPlinkoSlot({}, () => 0.999999)).toBe(PLINKO_SLOT_COUNT - 1);
  });

  it('applique les améliorations Gains et Gros boosters', () => {
    const gemSlot = PLINKO_SLOTS.findIndex(s => s.reward.kind === 'gems');
    expect(plinkoSlotReward(gemSlot, { gain: 5 }).amount).toBe(Math.round(PLINKO_SLOTS[gemSlot].reward.amount * 1.5));
    expect(plinkoBoosterSize('booster', { booster: 2 })).toBe(PLINKO_BOOSTERS.booster.cards + 2);
    // Un niveau hors limites (sauvegarde trafiquée) est ramené au max.
    expect(plinkoBoosterSize('booster', { booster: 99 })).toBe(PLINKO_BOOSTERS.booster.cards + 3);
    expect(nextPlinkoUpgradeCost({ booster: 3 }, 'booster')).toBeNull();
  });

  it('les billes non jouées ne sont pas reportées', () => {
    expect(plinkoBallsLeft({ day: '2026-11-01', used: 3 }, '2026-11-01')).toBe(PLINKO_DAILY_BALLS - 3);
    expect(plinkoBallsLeft({ day: '2026-11-01', used: 1 }, '2026-11-02')).toBe(PLINKO_DAILY_BALLS);
  });

  it('le Stock de billes monte de 5 à 8 billes par jour', () => {
    expect(plinkoDailyBalls({})).toBe(5);
    expect(plinkoDailyBalls({ balls: 99 })).toBe(8);
    expect(plinkoBallsLeft({ day: '2026-11-01', used: 5 }, '2026-11-01', { balls: 2 })).toBe(2);
  });

  it('quêtes : ids uniques, 15 000 gemmes au total', () => {
    expect(new Set(PLINKO_QUESTS.map(q => q.id)).size).toBe(PLINKO_QUESTS.length);
    expect(PLINKO_QUESTS_TOTAL_GEMS).toBe(15_000);
  });
});

describe('carte garantie des boosters', () => {
  it('donne Stellaire ou mieux quand Stellaire est débloquée', () => {
    for (let i = 0; i < 200; i++) expect(rank(rarityOf(rollCharacterAtLeast(40, 'S')))).toBeGreaterThanOrEqual(rank('S'));
  });

  it('donne Primordiale ou mieux quand elle est débloquée', () => {
    for (let i = 0; i < 200; i++) expect(rank(rarityOf(rollCharacterAtLeast(40, 'P')))).toBeGreaterThanOrEqual(rank('P'));
  });

  it('sinon, donne la meilleure rareté débloquée', () => {
    // Palier 10 : raretés débloquées jusqu'à Légendaire.
    for (let i = 0; i < 50; i++) expect(rarityOf(rollCharacterAtLeast(10, 'P'))).toBe('L');
  });
});

describe('plinkoSlice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(PLINKO_EVENT.startsAt + 12 * 3600_000);
    useGameStore.setState({ plinkoEventId: '', suppressToasts: true });
    useGameStore.getState().ensurePlinko();
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('5 billes par jour, puis plus aucun lancer', () => {
    for (let i = 0; i < PLINKO_DAILY_BALLS; i++) expect(useGameStore.getState().dropPlinko()).not.toBeNull();
    expect(useGameStore.getState().dropPlinko()).toBeNull();
    const s = useGameStore.getState();
    expect(s.plinkoDrops).toBe(PLINKO_DAILY_BALLS);
    expect(s.plinkoHistory).toHaveLength(PLINKO_DAILY_BALLS);
    expect(s.plinkoHistory[0].n).toBe(PLINKO_DAILY_BALLS);
  });

  it('renouvelle les billes le lendemain', () => {
    for (let i = 0; i < PLINKO_DAILY_BALLS; i++) useGameStore.getState().dropPlinko();
    vi.setSystemTime(Date.now() + 24 * 3600_000);
    expect(useGameStore.getState().dropPlinko()?.ballsLeft).toBe(PLINKO_DAILY_BALLS - 1);
  });

  it('crédite la récompense de la case tirée, une seule fois', () => {
    useGameStore.setState({ nekoGems: 0, plinkoTokens: 0 });
    const r = useGameStore.getState().dropPlinko()!;
    const s = useGameStore.getState();
    expect(s.plinkoHistory[0]).toMatchObject({ slot: r.slot, reward: r.reward });
    if (r.reward.kind === 'gems') expect(s.nekoGems).toBe(r.reward.amount);
    if (r.reward.kind === 'tokens') expect(s.plinkoTokens).toBe(r.reward.amount);
  });

  it('ouvre un booster doré avec le bon nombre de cartes', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0); // première case : booster doré
    const r = useGameStore.getState().dropPlinko()!;
    vi.restoreAllMocks();
    expect(r.reward.kind).toBe('goldBooster');
    expect(r.pulls).toHaveLength(PLINKO_BOOSTERS.goldBooster.cards);
  });

  it('achète une amélioration seulement avec assez de jetons', () => {
    const cost = nextPlinkoUpgradeCost({}, 'luck')!;
    useGameStore.setState({ plinkoTokens: cost - 1 });
    expect(useGameStore.getState().buyPlinkoUpgrade('luck')).toBe(false);
    useGameStore.setState({ plinkoTokens: cost });
    expect(useGameStore.getState().buyPlinkoUpgrade('luck')).toBe(true);
    expect(useGameStore.getState().plinkoUpgrades.luck).toBe(1);
    expect(useGameStore.getState().plinkoTokens).toBe(0);
  });

  it("le Stock de billes donne des billes en plus dès le jour de l'achat", () => {
    for (let i = 0; i < PLINKO_DAILY_BALLS; i++) useGameStore.getState().dropPlinko();
    useGameStore.setState({ plinkoTokens: nextPlinkoUpgradeCost({}, 'balls')! });
    expect(useGameStore.getState().buyPlinkoUpgrade('balls')).toBe(true);
    expect(useGameStore.getState().dropPlinko()?.ballsLeft).toBe(0);
    expect(useGameStore.getState().dropPlinko()).toBeNull();
  });

  it("compte les quêtes et ne paie chaque quête qu'une fois", () => {
    useGameStore.setState({ nekoGems: 0 });
    const q = PLINKO_QUESTS.find(x => x.id === 'pq_days_7')!;
    expect(useGameStore.getState().claimPlinkoQuest(q.id)).toBeNull();
    for (let d = 0; d < 7; d++) {
      useGameStore.getState().dropPlinko();
      useGameStore.getState().dropPlinko();       // 2e bille du jour : ne compte pas un jour de plus
      vi.setSystemTime(Date.now() + 24 * 3600_000);
    }
    expect(useGameStore.getState().plinkoStats.days).toBe(7);
    expect(useGameStore.getState().claimPlinkoQuest(q.id)).toBe(q.gems);
    expect(useGameStore.getState().nekoGems).toBeGreaterThanOrEqual(q.gems);
    expect(useGameStore.getState().claimPlinkoQuest(q.id)).toBeNull();
  });

  it('donne le bonus de la quête : Notes de Biwa, Orbes du Néant ou titre', () => {
    useGameStore.setState({ nakimeNotes: 0, voidOrbs: 0, unlockedTitles: [], plinkoStats: { days: 28 }, plinkoDrops: 25 });
    useGameStore.getState().claimPlinkoQuest('pq_days_7');
    useGameStore.getState().claimPlinkoQuest('pq_drops_25');
    useGameStore.getState().claimPlinkoQuest('pq_days_28');
    const s = useGameStore.getState();
    expect(s.nakimeNotes).toBe(PLINKO_QUESTS.find(x => x.id === 'pq_days_7')!.bonus!.amount);
    expect(s.voidOrbs).toBe(PLINKO_QUESTS.find(x => x.id === 'pq_drops_25')!.bonus!.amount);
    expect(s.unlockedTitles).toEqual([PLINKO_TITLE]);
    expect(TITLE_GOLD_BONUS_PCT[PLINKO_TITLE]).toBeGreaterThan(0);
  });

  it('remet tout à zéro à la nouvelle édition', () => {
    useGameStore.setState({ plinkoEventId: 'ancienne', plinkoTokens: 500, plinkoUpgrades: { luck: 3 }, plinkoStats: { days: 4 }, plinkoQuestsClaimed: ['pq_days_7'] });
    useGameStore.getState().ensurePlinko();
    const s = useGameStore.getState();
    expect(s.plinkoTokens).toBe(0);
    expect(s.plinkoUpgrades).toEqual({});
    expect(s.plinkoStats).toEqual({});
    expect(s.plinkoQuestsClaimed).toEqual([]);
  });

  it("refuse de lancer en dehors de l'événement", () => {
    vi.setSystemTime(PLINKO_EVENT.endsAt);
    expect(useGameStore.getState().dropPlinko()).toBeNull();
  });

  it('un appareil en retard ne rend jamais des billes déjà lancées', () => {
    const today = getTodayDayKey();
    useGameStore.setState({ plinkoDaily: { day: today, used: 1 }, plinkoUpgrades: { luck: 1 }, plinkoDrops: 1, plinkoStats: { days: 3 }, plinkoQuestsClaimed: ['pq_drops_25'] });
    const remote = {
      plinkoEventId: PLINKO_EVENT.id, plinkoDaily: { day: today, used: 4 }, plinkoUpgrades: { luck: 0, gain: 2 }, plinkoDrops: 4,
      plinkoStats: { days: 2, rare: 5 }, plinkoQuestsClaimed: ['pq_days_7'],
    };
    const merged = mergeMonotonicState(remote, remote);
    expect(merged.plinkoStats).toEqual({ days: 3, rare: 5 });
    expect(merged.plinkoQuestsClaimed.sort()).toEqual(['pq_days_7', 'pq_drops_25']);
    expect(merged.plinkoDaily).toEqual({ day: today, used: 4 });
    expect(merged.plinkoUpgrades).toEqual({ luck: 1, gain: 2 });
    expect(merged.plinkoDrops).toBe(4);
  });
});
