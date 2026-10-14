import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { EVOLUTION_STONE_ITEM_ID } from '@/types/game';
import { TITLE_GOLD_BONUS_PCT } from './titles';
import {
  GACHA_TIERS, NAKIME_GACHA_PITY, NAKIME_GACHA_PRIZES, NAKIME_GACHA_TITLE, NAKIME_GACHA_TITLE_DUPLICATE_GEMS,
  gachaTierChance, isHighTier, rollGachaPrize,
} from './nakimeGacha';

describe("Gachapon de l'Infini — tirage", () => {
  it('les probabilités font 100 %, Légendaire et Mythique sont rares', () => {
    expect(GACHA_TIERS.reduce((s, t) => s + gachaTierChance(t), 0)).toBeCloseTo(100);
    for (const t of GACHA_TIERS) expect(NAKIME_GACHA_PRIZES.some(p => p.tier === t)).toBe(true);
    expect(gachaTierChance('legendaire')).toBeLessThanOrEqual(2);
    expect(gachaTierChance('mythique')).toBeLessThanOrEqual(0.25);
  });

  it('garantie : le 20e tirage sans Légendaire est forcément Légendaire ou Mythique', () => {
    expect(NAKIME_GACHA_PITY).toBe(20);
    for (let i = 0; i < 50; i++) expect(isHighTier(rollGachaPrize(NAKIME_GACHA_PITY - 1).tier)).toBe(true);
    expect(rollGachaPrize(0, () => 0).tier).toBe('commun');
  });

  it('le titre exclusif rapporte un bonus d\'or', () => {
    expect(TITLE_GOLD_BONUS_PCT[NAKIME_GACHA_TITLE]).toBeGreaterThan(0);
  });
});

describe("Gachapon de l'Infini — boutique", () => {
  beforeEach(() => useGameStore.setState({
    nakimeTickets: 0, nakimeGachaPity: 0, nakimeGachaPulls: 0, nekoGems: 0, nakimeNotes: 0, anomalyTokens: 0,
    expeditionDropInventory: {}, equipmentInventory: {}, unlockedTitles: [], totalGachaPulls: 0,
  }));

  it('refuse sans ticket', () => {
    expect(typeof useGameStore.getState().pullNakimeGacha(1)).toBe('string');
    useGameStore.setState({ nakimeTickets: 4 });
    expect(typeof useGameStore.getState().pullNakimeGacha(5)).toBe('string');
    expect(useGameStore.getState().nakimeTickets).toBe(4);
  });

  it('consomme les tickets, crédite les lots et applique la garantie', () => {
    useGameStore.setState({ nakimeTickets: 22 });
    const res = useGameStore.getState().pullNakimeGacha(20);
    expect(Array.isArray(res)).toBe(true);
    if (typeof res === 'string') return;
    expect(res).toHaveLength(20);
    expect(res.some(r => isHighTier(r.prize.tier))).toBe(true);
    const s = useGameStore.getState();
    expect(s.nakimeTickets).toBe(2);
    expect(s.nakimeGachaPulls).toBe(20);
    const sum = (kind: string) => res.reduce((t, r) => t + r.prize.rewards.filter(x => x.kind === kind).reduce((a, x) => a + x.amount, 0), 0);
    const duplicates = res.filter(r => r.titleDuplicate).length;
    expect(s.nekoGems).toBe(sum('gems') + duplicates * NAKIME_GACHA_TITLE_DUPLICATE_GEMS);
    expect(s.nakimeNotes).toBe(sum('notes'));
    expect(s.expeditionDropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0).toBe(sum('stones'));
    expect(res.reduce((t, r) => t + r.pulls.length, 0)).toBe(sum('pulls'));
    expect(res.reduce((t, r) => t + r.equipment.length, 0)).toBe(sum('chestRare') + sum('chestEpic'));
    expect(s.anomalyTokens).toBeGreaterThanOrEqual(sum('anomaly'));
    if (sum('title') > 0) expect(s.unlockedTitles).toContain(NAKIME_GACHA_TITLE);
  });

  it('le titre déjà obtenu est remplacé par des gemmes', () => {
    useGameStore.setState({ nakimeTickets: 400, unlockedTitles: [NAKIME_GACHA_TITLE] });
    const res = useGameStore.getState().pullNakimeGacha(400);
    if (typeof res === 'string') throw new Error(res);
    for (const r of res) expect(!!r.titleDuplicate).toBe(r.prize.rewards.some(x => x.kind === 'title'));
  });
});
