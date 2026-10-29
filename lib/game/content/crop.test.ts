import { describe, it, expect } from 'vitest';
import {
  initialCrop, moveCrop, resizeCrop, zoomCrop, cropScale, roundCrop, cropToFractions, cropFromFractions, croppedSize,
} from './crop';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe('recadrage — géométrie', () => {
  it('cadre de départ : le plus grand centré aux bonnes proportions, ou toute l’image', () => {
    expect(initialCrop(1000, 500)).toEqual({ x: 0, y: 0, w: 1000, h: 500 });
    expect(initialCrop(1000, 500, 1)).toEqual({ x: 250, y: 0, w: 500, h: 500 });
    expect(initialCrop(1600, 3000, 16 / 9)).toEqual({ x: 0, y: 1050, w: 1600, h: 900 });
  });

  it('le déplacement reste dans l’image', () => {
    const r = { x: 100, y: 100, w: 200, h: 200 };
    expect(moveCrop(r, 50, -30, 1000, 1000)).toEqual({ x: 150, y: 70, w: 200, h: 200 });
    expect(moveCrop(r, 5000, -5000, 1000, 1000)).toEqual({ x: 800, y: 0, w: 200, h: 200 });
  });

  it('tirer un coin garde le coin opposé fixe et reste dans l’image', () => {
    const r = { x: 100, y: 100, w: 200, h: 200 };
    expect(resizeCrop(r, 'se', 500, 400, 1000, 1000)).toEqual({ x: 100, y: 100, w: 400, h: 300 });
    expect(resizeCrop(r, 'nw', -50, 50, 1000, 1000)).toEqual({ x: 0, y: 50, w: 300, h: 250 });
    // Taille minimale : le coin ne passe pas de l'autre côté.
    expect(resizeCrop(r, 'se', 0, 0, 1000, 1000, undefined, 16)).toEqual({ x: 100, y: 100, w: 16, h: 16 });
  });

  it('avec des proportions imposées, elles sont gardées même contre un bord', () => {
    const r = { x: 100, y: 100, w: 200, h: 100 };
    const a = resizeCrop(r, 'se', 700, 150, 1000, 1000, 2);
    close(a.w / a.h, 2);
    expect(a).toMatchObject({ x: 100, y: 100, w: 600, h: 300 });
    const b = resizeCrop(r, 'se', 5000, 5000, 1000, 400, 2);
    close(b.w / b.h, 2);
    expect(b.y + b.h).toBeLessThanOrEqual(400);
    expect(b.x + b.w).toBeLessThanOrEqual(1000);
  });

  it('le zoom réduit le cadre autour de son centre et revient au maximum', () => {
    const W = 1000, H = 1000;
    const full = initialCrop(W, H, 1);
    const z = zoomCrop(full, 0.5, W, H);
    expect(z).toEqual({ x: 250, y: 250, w: 500, h: 500 });
    close(cropScale(z, W, H), 0.5);
    expect(zoomCrop(z, 1, W, H)).toEqual(full);
    // Près d'un bord, le cadre agrandi est repoussé dans l'image.
    const corner = { x: 0, y: 0, w: 100, h: 100 };
    expect(zoomCrop(corner, 0.5, W, H)).toEqual({ x: 0, y: 0, w: 500, h: 500 });
  });

  it('arrondi, fractions et taille finale', () => {
    expect(roundCrop({ x: 10.4, y: -2, w: 2000, h: 50.6 }, 1000, 500)).toEqual({ x: 10, y: 0, w: 990, h: 51 });
    const f = cropToFractions({ x: 100, y: 50, w: 400, h: 200 }, 1000, 500);
    expect(f).toEqual({ x: 0.1, y: 0.1, w: 0.4, h: 0.4 });
    expect(cropFromFractions(f, 2000, 1000)).toEqual({ x: 200, y: 100, w: 800, h: 400 });
    expect(croppedSize({ x: 0, y: 0, w: 1200, h: 1420 }, 600, 710)).toEqual({ w: 600, h: 710 });
    expect(croppedSize({ x: 0, y: 0, w: 300, h: 100 }, 600, 710)).toEqual({ w: 300, h: 100 });
  });
});
