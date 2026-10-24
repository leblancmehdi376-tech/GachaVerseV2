import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getFeaturedCharacters, getFeaturedUniverse, SPARK_COSTS } from '@/lib/game/featuredBanner';
import { EDITION_MAX_POINTS } from '@/lib/game/editions';
import { STAT } from '@/lib/game/achievements';

describe('gachaSlice — bannière vedette et Étincelles', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ nekoGems: 1_000_000, maxPalierReached: 40, runPeakPalier: 40 });
  });

  it('chaque invocation sur la bannière vedette rapporte 1 Étincelle', () => {
    useGameStore.getState().pullSingle('featured');
    expect(useGameStore.getState().gachaSparks).toBe(1);
    useGameStore.getState().pullMulti('featured');
    expect(useGameStore.getState().gachaSparks).toBe(11);
    useGameStore.getState().pullMulti100('featured');
    const s = useGameStore.getState();
    expect(s.gachaSparks).toBe(111);
    expect(s.totalGachaPulls).toBe(111);
    expect(s.achievementStats[STAT.featuredPulls]).toBe(111);
  });

  it("les autres bannières n'en rapportent pas", () => {
    useGameStore.getState().pullMulti('vol1');
    useGameStore.getState().pullMulti('vol2');
    expect(useGameStore.getState().gachaSparks).toBe(0);
  });

  it('échange les Étincelles contre le perso vedette choisi', () => {
    const tpl = getFeaturedCharacters(getFeaturedUniverse())[0];
    const cost = SPARK_COSTS[tpl.rarity];
    useGameStore.setState({ gachaSparks: cost + 5 });
    const res = useGameStore.getState().exchangeSparks(tpl.id);
    const s = useGameStore.getState();
    expect(res?.templateId).toBe(tpl.id);
    expect(s.collection[tpl.id]).toBeDefined();
    expect(s.gachaSparks).toBe(5);
    expect(s.achievementStats[STAT.sparkExchanges]).toBe(1);
  });

  it("refuse sans assez d'Étincelles, hors univers vedette, rareté verrouillée ou carte déjà Prismatique", () => {
    const tpl = getFeaturedCharacters(getFeaturedUniverse())[0];
    const cost = SPARK_COSTS[tpl.rarity];

    useGameStore.setState({ gachaSparks: cost - 1 });
    expect(useGameStore.getState().exchangeSparks(tpl.id)).toBeNull();

    useGameStore.setState({ gachaSparks: 99_999 });
    const outsider = getFeaturedCharacters('Undertale')[0];
    expect(getFeaturedUniverse()).not.toBe('Undertale');
    expect(useGameStore.getState().exchangeSparks(outsider.id)).toBeNull();

    useGameStore.setState({ maxPalierReached: 1, runPeakPalier: 1 });
    expect(useGameStore.getState().exchangeSparks(tpl.id)).toBeNull();

    useGameStore.setState({ maxPalierReached: 40, runPeakPalier: 40, collection: {
      [tpl.id]: { templateId: tpl.id, copies: 9, level: 1, currentForm: 0, xp: 0, editionPoints: EDITION_MAX_POINTS, edition: 'prismatic' },
    } });
    expect(useGameStore.getState().exchangeSparks(tpl.id)).toBeNull();
    expect(useGameStore.getState().gachaSparks).toBe(99_999);
  });
});
