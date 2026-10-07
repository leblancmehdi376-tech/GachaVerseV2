import { describe, expect, it } from 'vitest';
import { compareCards, COMPARE_POOL, type CompareCard } from '@/lib/game/cardCompare';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';

const card = (templateId: string, edition: CompareCard['edition'] = 'base', form = 0): CompareCard => ({ templateId, edition, form });

describe('compareCards', () => {
  it('pool sans le héros, du plus rare au plus commun', () => {
    expect(COMPARE_POOL.some(c => c.isHero)).toBe(false);
    expect(COMPARE_POOL[0].rarity).toBe('T');
    expect(COMPARE_POOL[COMPARE_POOL.length - 1].rarity).toBe('C');
  });

  it('deux Légendaires ne sont pas égaux : Mario (53) bat Lily Lovebraids (47) à tous les niveaux', () => {
    const r = compareCards(card('mario'), card('lily_lovebraids'), 500);
    expect(r.winner).toBe('a');
    expect(bnToNumber(r.ratio)).toBeCloseTo(53 / 47, 2);
    expect(r.overtakeLevel).toBeNull();
  });

  it("la forme d'évolution multiplie le DPS (Sanji évo 1 = ×2)", () => {
    const r = compareCards(card('sanji', 'base', 1), card('sanji'), 300);
    expect(r.winner).toBe('a');
    expect(bnToNumber(r.ratio)).toBeCloseTo(2, 2);
  });

  it('une forme inexistante est ramenée à la dernière forme', () => {
    const r = compareCards(card('sanji', 'base', 9), card('sanji', 'base', 1), 300);
    expect(r.winner).toBe('tie');
  });

  it("Cosmique Or bat Primordial Normale au niveau 500, puis se fait rattraper", () => {
    const r = compareCards(card('leon_kennedy', 'gold'), card('frieren'), 500);
    expect(r.winner).toBe('a');
    expect(r.overtakeLevel).toBeGreaterThan(1000);
    expect(r.overtakeLevel).toBeLessThan(1700);
  });

  it('même carte des deux côtés : égalité', () => {
    const r = compareCards(card('mario', 'ruby'), card('mario', 'ruby'), 300);
    expect(r).toEqual({ winner: 'tie', ratio: bnFromNumber(1), overtakeLevel: null });
  });

  it('ne déborde pas à très haut niveau', () => {
    const weakest = COMPARE_POOL[COMPARE_POOL.length - 1].id;
    const r = compareCards(card(weakest), card(COMPARE_POOL[0].id, 'prismatic'), 100_000);
    expect(r.winner).toBe('b');
    expect(r.ratio.exponent).toBeGreaterThan(300);
    expect(Number.isFinite(r.ratio.mantissa)).toBe(true);
    expect(r.overtakeLevel).toBeNull();
  });
});
