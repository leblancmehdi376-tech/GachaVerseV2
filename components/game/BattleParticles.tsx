'use client';
import { useEffect, useRef, useMemo } from 'react';

interface Props {
  accentColor: string; // hex or css color from palier config
  isBoss?: boolean;
  still?: boolean; // effets réduits (mode économie) : une seule image figée, aucune boucle
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  life: number;     // 0→1
  speed: number;
  r: number; g: number; b: number;
  type: 'dust' | 'ember' | 'mote';
  sprite: HTMLCanvasElement; // forme pré-dessinée (opacité pleine), voir makeSprite
  half: number;              // demi-côté du sprite, pour le centrer
}

// Cadence du dessin : les particules dérivent lentement, 30 i/s suffisent
// visuellement. La frame suivante est planifiée par un minuteur PUIS un
// requestAnimationFrame : un rAF en attente force le navigateur à refaire
// style/layout/paint à CHAQUE rafraîchissement d'écran (60 à 144 fois par
// seconde selon l'écran), même si on ne dessine rien à cette frame-là.
const FRAME_MS = 1000 / 30;
const BASE_FRAME_MS = 1000 / 60; // vitesses/durées de vie exprimées par frame à 60 i/s

// Dessine une fois la particule (à opacité pleine) dans un petit canvas : à
// chaque frame on n'a plus qu'un drawImage avec globalAlpha, au lieu de
// recréer un dégradé radial et des chaînes rgba() par particule et par frame.
function makeSprite(type: Particle['type'], size: number, r: number, g: number, b: number): { sprite: HTMLCanvasElement; half: number } {
  const radius = type === 'ember' ? size * 2.5 : size;
  const half = Math.ceil(radius) + 1;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = half * 2;
  const c = sprite.getContext('2d');
  if (!c) return { sprite, half };
  const alpha = type === 'mote' ? 0.08 : type === 'ember' ? 0.55 : 0.35;
  if (type === 'mote') {
    // Soft glowing orb
    const grad = c.createRadialGradient(half, half, 0, half, half, size);
    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 2.5})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.beginPath();
    c.arc(half, half, size, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();
  } else {
    // Crisp dot
    c.beginPath();
    c.arc(half, half, size, 0, Math.PI * 2);
    c.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    c.fill();
    if (type === 'ember') {
      // Small trailing glow — halo semi-transparent plutôt que shadowBlur
      // (flou recalculé à chaque dessin, très coûteux).
      c.beginPath();
      c.arc(half, half, size * 2.5, 0, Math.PI * 2);
      c.fillStyle = `rgba(${r},${g},${b},${alpha * 0.25})`;
      c.fill();
    }
  }
  return { sprite, half };
}

// Parse hex/rgb color to r,g,b (best-effort)
function parseColor(color: string): [number, number, number] {
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  }
  // Named/var fallback → default purple
  return [109, 40, 217];
}

function spawnParticle(w: number, h: number, rgb: [number, number, number], boss: boolean): Particle {
  const type: Particle['type'] = Math.random() < 0.6 ? 'dust' : Math.random() < 0.7 ? 'ember' : 'mote';
  const [r, g, b] = rgb;
  // Slightly vary the color per particle
  const dr = Math.round((Math.random() - 0.5) * 40);
  const size = type === 'ember' ? 1.5 + Math.random() * 2 : type === 'mote' ? 3 + Math.random() * 4 : 1 + Math.random() * 1.5;
  const pr = Math.min(255, Math.max(0, r + dr));
  const pg = Math.min(255, Math.max(0, g + dr * 0.5));
  const pb = Math.min(255, Math.max(0, b - dr * 0.2));
  return {
    x: Math.random() * w,
    y: h + Math.random() * 40,              // start below viewport
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.3 + Math.random() * (boss ? 0.9 : 0.6)),
    size,
    opacity: 0,
    life: 0,
    speed: 0.003 + Math.random() * 0.004,
    r: pr, g: pg, b: pb,
    type,
    ...makeSprite(type, size, pr, pg, pb),
  };
}

export function BattleParticles({ accentColor, isBoss = false, still = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const rgb = useMemo(() => parseColor(accentColor), [accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const COUNT = isBoss ? 55 : 35;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Seed initial particles at random y positions
    for (let i = 0; i < COUNT; i++) {
      const p = spawnParticle(canvas.width, canvas.height, rgb, isBoss);
      p.y = Math.random() * canvas.height; // spread across full height initially
      p.life = Math.random();
      particlesRef.current.push(p);
    }

    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      timer = setTimeout(() => { timer = null; rafRef.current = requestAnimationFrame(draw); }, FRAME_MS);
    };
    const draw = (t: number) => {
      rafRef.current = 0;
      if (!still) schedule();
      // Pas de simulation proportionnel au temps écoulé (exprimé en frames à
      // 60 i/s), pour garder la même vitesse qu'avant malgré la cadence réduite.
      const step = last ? Math.min((t - last) / BASE_FRAME_MS, 4) : 1;
      last = t;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.life = Math.min(1, p.life + p.speed * step);
        // Fade in first 20% of life, fade out last 30%
        if (p.life < 0.2) {
          p.opacity = p.life / 0.2;
        } else if (p.life > 0.7) {
          p.opacity = 1 - (p.life - 0.7) / 0.3;
        } else {
          p.opacity = 1;
        }

        p.x += p.vx * step;
        p.y += p.vy * step;
        // Slight wobble
        p.vx += (Math.random() - 0.5) * 0.02 * step;
        p.vx *= 1 - 0.01 * step; // dampen drift

        ctx.globalAlpha = p.opacity;
        ctx.drawImage(p.sprite, p.x - p.half, p.y - p.half);

        // Respawn when off-screen or life complete
        if (p.life >= 1 || p.y < -20) {
          const fresh = spawnParticle(w, h, rgb, isBoss);
          Object.assign(p, fresh);
        }
      }
      ctx.globalAlpha = 1;
    };

    // Boucle suspendue tant que la zone de combat est hors écran (ex : défilée
    // sur téléphone) — rien à dessiner, inutile de consommer du CPU.
    const start = () => { if (!rafRef.current && !timer) { last = 0; rafRef.current = requestAnimationFrame(draw); } };
    const stop = () => {
      cancelAnimationFrame(rafRef.current); rafRef.current = 0;
      if (timer) { clearTimeout(timer); timer = null; }
    };
    // Redimensionner vide le canvas : en mode figé, on redessine l'image.
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (still) start();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(canvas);
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      particlesRef.current = [];
    };
  }, [rgb, isBoss, still]);

  return (
    <>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Cinematic vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.3) 68%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* Bottom fog — blends into the bottom panel */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        pointerEvents: 'none',
        zIndex: 2,
        background: 'linear-gradient(0deg, rgba(5,4,15,0.7) 0%, rgba(5,4,15,0.28) 50%, transparent 100%)',
      }} />

      {/* Corner darkening */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        background: `
          radial-gradient(ellipse at 0% 0%, rgba(0,0,0,0.38) 0%, transparent 50%),
          radial-gradient(ellipse at 100% 0%, rgba(0,0,0,0.38) 0%, transparent 50%)
        `,
      }} />
    </>
  );
}
