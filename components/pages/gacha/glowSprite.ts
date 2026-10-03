// Point lumineux pré-dessiné une seule fois dans un petit canvas (le flou
// shadowBlur, très coûteux, n'est calculé qu'ici). Les animations n'ont plus
// qu'un drawImage par particule et par frame, mis à l'échelle si besoin.
export interface GlowSprite { canvas: HTMLCanvasElement; radius: number; half: number; }

export function makeGlowSprite(fill: string, glow: string, radius: number, blur: number): GlowSprite {
  const half = Math.ceil(radius + blur * 1.5);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = half * 2;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = fill;
    c.shadowBlur = blur;
    c.shadowColor = glow;
    c.beginPath();
    c.arc(half, half, radius, 0, Math.PI * 2);
    c.fill();
  }
  return { canvas, radius, half };
}

// Dessine le sprite centré en (x, y) avec un rayon de cercle `r`.
export function drawGlow(ctx: CanvasRenderingContext2D, g: GlowSprite, x: number, y: number, r: number) {
  const h = g.half * (r / g.radius);
  ctx.drawImage(g.canvas, x - h, y - h, h * 2, h * 2);
}

// Durée d'une frame de référence : les vitesses des animations sont
// exprimées "par frame à 60 i/s", converties ici en pas proportionnel au
// temps écoulé (même vitesse sur un écran 60, 120 ou 144 Hz).
export const BASE_FRAME_MS = 1000 / 60;
