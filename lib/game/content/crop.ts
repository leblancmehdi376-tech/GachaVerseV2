// Géométrie du recadrage des images du configurateur (voir ImageCropper).
// Toutes les coordonnées sont en pixels de l'image d'origine (W × H) ; le
// cadre reste toujours entièrement dans l'image.

export interface CropRect { x: number; y: number; w: number; h: number }
export type CropCorner = 'nw' | 'ne' | 'sw' | 'se';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Plus grand cadre centré aux proportions `aspect` (largeur / hauteur), ou toute l'image si libre. */
export function initialCrop(W: number, H: number, aspect?: number): CropRect {
  if (!aspect) return { x: 0, y: 0, w: W, h: H };
  let w = W;
  let h = W / aspect;
  if (h > H) { h = H; w = H * aspect; }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

/** Déplace le cadre, sans le faire sortir de l'image. */
export function moveCrop(r: CropRect, dx: number, dy: number, W: number, H: number): CropRect {
  return { ...r, x: clamp(r.x + dx, 0, W - r.w), y: clamp(r.y + dy, 0, H - r.h) };
}

/**
 * Agrandit / réduit le cadre en tirant le coin `corner` jusqu'au point (px, py),
 * le coin opposé restant fixe. Avec `aspect`, les proportions sont gardées.
 */
export function resizeCrop(r: CropRect, corner: CropCorner, px: number, py: number, W: number, H: number, aspect?: number, min = 16): CropRect {
  const right = corner === 'ne' || corner === 'se';
  const bottom = corner === 'sw' || corner === 'se';
  const ax = right ? r.x : r.x + r.w;
  const ay = bottom ? r.y : r.y + r.h;
  const roomW = right ? W - ax : ax;
  const roomH = bottom ? H - ay : ay;
  let w = clamp(right ? px - ax : ax - px, min, roomW);
  let h = clamp(bottom ? py - ay : ay - py, min, roomH);
  if (aspect) {
    w = Math.min(Math.max(w, h * aspect), roomW, roomH * aspect);
    h = w / aspect;
  }
  return { x: right ? ax : ax - w, y: bottom ? ay : ay - h, w, h };
}

/** Part (0–1] qu'occupe le cadre par rapport au plus grand cadre de mêmes proportions. */
export function cropScale(r: CropRect, W: number, H: number): number {
  return r.w / initialCrop(W, H, r.w / r.h).w;
}

/** Redimensionne le cadre autour de son centre à la part `scale` du plus grand possible (zoom). */
export function zoomCrop(r: CropRect, scale: number, W: number, H: number): CropRect {
  const ratio = r.w / r.h;
  const max = initialCrop(W, H, ratio);
  const w = max.w * clamp(scale, 0.01, 1);
  const h = w / ratio;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return { x: clamp(cx - w / 2, 0, W - w), y: clamp(cy - h / 2, 0, H - h), w, h };
}

/** Cadre en pixels entiers, dans l'image (au moins 1 × 1). */
export function roundCrop(r: CropRect, W: number, H: number): CropRect {
  const x = clamp(Math.round(r.x), 0, W - 1);
  const y = clamp(Math.round(r.y), 0, H - 1);
  return { x, y, w: clamp(Math.round(r.w), 1, W - x), h: clamp(Math.round(r.h), 1, H - y) };
}

/** Cadre exprimé en fractions de l'image (0–1), indépendant de sa résolution. */
export function cropToFractions(r: CropRect, W: number, H: number): CropRect {
  return { x: r.x / W, y: r.y / H, w: r.w / W, h: r.h / H };
}

export function cropFromFractions(f: CropRect, W: number, H: number): CropRect {
  return { x: f.x * W, y: f.y * H, w: f.w * W, h: f.h * H };
}

/** Taille finale de l'image recadrée, réduite pour tenir dans maxW × maxH. */
export function croppedSize(r: CropRect, maxW: number, maxH: number): { w: number; h: number } {
  const scale = Math.min(1, maxW / r.w, maxH / r.h);
  return { w: Math.max(1, Math.round(r.w * scale)), h: Math.max(1, Math.round(r.h * scale)) };
}
