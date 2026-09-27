import { describe, it, expect } from 'vitest';
import { computeCohesion } from './cohesion';

const pct = (levels: number[]) => Math.round((computeCohesion(levels).mult - 1) * 1000) / 10;

describe('computeCohesion', () => {
  it('donne le bonus maximal (+20 %) pour une équipe aux niveaux identiques', () => {
    expect(computeCohesion([100, 100, 100, 100]).mult).toBeCloseTo(1.2);
    expect(computeCohesion([1000, 1000, 1000, 1000]).mult).toBeCloseTo(1.2);
  });

  it('reste neutre sans compagnon équipé', () => {
    expect(computeCohesion([0, 0, 0, 0]).mult).toBe(1);
    expect(computeCohesion([]).mult).toBe(1);
  });

  it('compte un slot vide comme un niveau 0', () => {
    expect(computeCohesion([300, 300, 300]).mult).toBe(computeCohesion([300, 300, 300, 0]).mult);
    expect(pct([1000, 1000, 1000, 0])).toBe(-20);
  });

  it("donne le bonus plein tant que l'écart moyen reste ≤ 10 niveaux", () => {
    expect(pct([20, 10, 10, 10])).toBe(20);
    expect(pct([100, 90, 90, 90])).toBe(20);
    expect(pct([1000, 995, 990, 985])).toBe(20);
    expect(pct([1000, 990, 990, 989])).toBeLessThan(20);
  });

  it('reproduit le tableau de calibrage', () => {
    expect(pct([50, 1, 1, 1])).toBe(-1.2);
    expect(pct([100, 100, 100, 1])).toBe(5.5);
    expect(pct([300, 250, 250, 250])).toBe(-1.8);
    expect(pct([1000, 990, 980, 970])).toBe(16.3);
    expect(pct([1000, 950, 950, 950])).toBe(6.7);
    expect(pct([1000, 900, 900, 900])).toBe(-5.4);
    expect(pct([1000, 500, 500, 500])).toBe(-20);
  });

  it('reste borné entre ×0.8 et ×1.2', () => {
    for (const t of [[1, 0, 0, 0], [5000, 1, 1, 1], [2, 2, 2, 2]]) {
      const { mult } = computeCohesion(t);
      expect(mult).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(mult).toBeLessThanOrEqual(1.2 + 1e-9);
    }
  });
});
