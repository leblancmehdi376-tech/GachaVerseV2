import { describe, it, expect } from 'vitest';
import { BANNER_POOL, getCharacterById } from './characters';
import { getDynamicRates, getRateUpShare, rollCharacter, FEATURED_RATE_UP, RARITY_GATES } from './gacha';
import {
  FEATURED_UNIVERSES, SPARK_COSTS, canExchangeForCharacter, getFeaturedBanner, getFeaturedCharacters, getFeaturedUniverse,
} from './featuredBanner';
import { RARITY_ORDER_ASC, type Rarity } from '@/types/game';

// Clé de journée 'YYYY-MM-DD' (format de getTodayDayKey) du jour n° `day` depuis 1970.
function dayKeyOf(day: number): string {
  const d = new Date(day * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
const TODAY = Math.floor(Date.UTC(2026, 9, 21) / 86_400_000);

describe('Bannière vedette — rotation quotidienne', () => {
  it('donne le même univers à tous pour une même journée', () => {
    expect(getFeaturedUniverse('2026-10-21')).toBe(getFeaturedUniverse('2026-10-21'));
    expect(FEATURED_UNIVERSES).toContain(getFeaturedUniverse('2026-10-21'));
  });

  it("ne garde jamais le même univers deux jours de suite (jonctions de cycle comprises)", () => {
    for (let day = TODAY - 400; day < TODAY + 400; day++) {
      expect(getFeaturedUniverse(dayKeyOf(day)), dayKeyOf(day)).not.toBe(getFeaturedUniverse(dayKeyOf(day - 1)));
    }
  });

  it('fait passer chaque univers une fois par cycle, dans un ordre qui change', () => {
    const n = FEATURED_UNIVERSES.length;
    const cycleStart = Math.floor(TODAY / n) * n;
    const orders = [0, 1, 2].map(c => Array.from({ length: n }, (_, i) => getFeaturedUniverse(dayKeyOf(cycleStart + c * n + i))));
    for (const order of orders) expect(new Set(order).size).toBe(n);
    expect(new Set(orders.map(o => o.join('|'))).size).toBeGreaterThan(1);
  });

  it('ne met en avant que des univers riches en persos tirables, sans doublon', () => {
    expect(new Set(FEATURED_UNIVERSES).size).toBe(FEATURED_UNIVERSES.length);
    for (const u of FEATURED_UNIVERSES) expect(getFeaturedCharacters(u).length, u).toBeGreaterThanOrEqual(5);
  });

  it('expose en vitrine au plus 6 persos de l\'univers, du plus rare au plus commun', () => {
    const universe = getFeaturedUniverse('2026-10-21');
    const banner = getFeaturedBanner('2026-10-21');
    expect(banner.subtitle).toBe(universe);
    expect(banner.featuredIds.length).toBeGreaterThan(0);
    expect(banner.featuredIds.length).toBeLessThanOrEqual(6);
    const ranks = banner.featuredIds.map(id => RARITY_ORDER_ASC.indexOf(getCharacterById(id)!.rarity));
    for (const id of banner.featuredIds) expect(getCharacterById(id)!.universe).toBe(universe);
    expect([...ranks].sort((a, b) => b - a)).toEqual(ranks);
  });
});

describe('Bannière vedette — tirage', () => {
  it('garde exactement les taux par rareté de la Vol.1', () => {
    expect(getDynamicRates(40, 'featured')).toEqual(getDynamicRates(40, 'vol1'));
  });

  it('getRateUpShare applique le poids ×FEATURED_RATE_UP à rareté égale', () => {
    const universe = 'Dragon Ball Z';
    const pool = BANNER_POOL.filter(c => c.rarity === 'C');
    const featured = pool.filter(c => c.universe === universe).length;
    expect(featured).toBeGreaterThan(0);
    const expected = (featured * FEATURED_RATE_UP) / (pool.length - featured + featured * FEATURED_RATE_UP);
    expect(getRateUpShare('C', universe)).toBeCloseTo(expected);
    expect(getRateUpShare('T', universe)).toBe(0); // aucun Transcendant DBZ au gacha
  });

  it("tire nettement plus souvent l'univers vedette, dans la proportion annoncée", () => {
    const universe = 'Dragon Ball Z';
    const rates = getDynamicRates(40, 'featured');
    const expected = (Object.entries(rates) as [Rarity, number][])
      .reduce((sum, [r, rate]) => sum + (rate / 100) * getRateUpShare(r, universe), 0);
    const N = 6000;
    let hits = 0;
    for (let i = 0; i < N; i++) if (getCharacterById(rollCharacter(40, 'featured', universe))?.universe === universe) hits++;
    expect(hits / N).toBeGreaterThan(expected - 0.03);
    expect(hits / N).toBeLessThan(expected + 0.03);
  });
});

describe('Étincelles', () => {
  it('coûtent plus cher à chaque rareté', () => {
    for (let i = 1; i < RARITY_ORDER_ASC.length; i++) {
      expect(SPARK_COSTS[RARITY_ORDER_ASC[i]]).toBeGreaterThan(SPARK_COSTS[RARITY_ORDER_ASC[i - 1]]);
    }
  });

  it("n'échangent que des persos de l'univers vedette dont la rareté est débloquée", () => {
    const goku = getCharacterById('goku')!;      // Primordial, Dragon Ball Z
    const naruto = getCharacterById('naruto')!;  // Naruto
    expect(canExchangeForCharacter(goku, 'Dragon Ball Z', 40)).toBe(true);
    expect(canExchangeForCharacter(goku, 'Dragon Ball Z', RARITY_GATES.P.unlockPalier - 1)).toBe(false);
    expect(canExchangeForCharacter(naruto, 'Dragon Ball Z', 40)).toBe(false);
    // Perso de Forge, jamais au gacha : pas échangeable non plus.
    expect(canExchangeForCharacter(getCharacterById('gogeta')!, 'Dragon Ball Z', 40)).toBe(false);
  });
});
