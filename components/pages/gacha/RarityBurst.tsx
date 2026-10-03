'use client';
import { useEffect, useRef } from 'react';
import { useLowFx } from '@/hooks/useLowFx';
import { BASE_FRAME_MS, drawGlow, makeGlowSprite } from './glowSprite';

const DOT_R = 6; // rayon max des particules (taille 2 à 6, réduite avec la vie)

// Particules — spawned on high-rarity flip
export function RarityBurst({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  // Effets réduits (mode économie / mouvement réduit) : pas de gerbe.
  const lowFx = useLowFx();
  const show = active && !lowFx;

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;

    const pts = Array.from({ length: 55 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        size: 2 + Math.random() * 4,
        decay: 0.018 + Math.random() * 0.016,
      };
    });

    // Halo pré-rendu (voir glowSprite) au lieu d'un shadowBlur par particule
    // et par frame ; pas proportionnel au temps écoulé (même vitesse à 144 Hz).
    const dot = makeGlowSprite(color, color, DOT_R, 8);
    let last = 0;
    const draw = (now: number) => {
      const step = last ? Math.min((now - last) / BASE_FRAME_MS, 4) : 1;
      last = now;
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of pts) {
        p.life -= p.decay * step;
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx * step; p.y += p.vy * step; p.vy += 0.12 * step;
        ctx.globalAlpha = p.life;
        drawGlow(ctx, dot, p.x, p.y, p.size * p.life);
      }
      ctx.globalAlpha = 1;
      if (alive) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [show, color]);

  if (!show) return null;
  return (
    <canvas ref={canvasRef}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:10 }} />
  );
}
