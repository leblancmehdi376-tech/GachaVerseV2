'use client';
import { useState, useEffect, useRef } from 'react';
import { useLowFx } from '@/hooks/useLowFx';
import { BASE_FRAME_MS, drawGlow, makeGlowSprite } from './glowSprite';

// Cadence plafonnée : sans plafond, un écran 144 Hz dessinait 2,4× plus de
// frames (et faisait tourner l'orbe 2,4× plus vite, l'animation avançant
// d'un pas fixe par frame).
const FRAME_MS = 1000 / 60;
const DOT_R = 4; // rayon max des particules orbitales (taille 1.5 à 4)

// Invocation portal — animation d'appel avant les cartes
export function InvocationPortal({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'build' | 'burst' | 'fade'>('build');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const lowFx     = useLowFx();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('burst'), 800);
    const t2 = setTimeout(() => setPhase('fade'),  1400);
    const t3 = setTimeout(() => onDone(),           1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Canvas orbe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;
    let t = 0;

    const pts = Array.from({ length: 120 }, (_, i) => ({
      angle: (i / 120) * Math.PI * 2,
      r: 90 + Math.random() * 30,
      speed: 0.008 + Math.random() * 0.012,
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.4 + Math.random() * 0.6,
    }));
    const dot = makeGlowSprite('#c084fc', '#9333ea', DOT_R, 8);

    const render = (step: number) => {
      ctx.clearRect(0, 0, W, H);
      t += 0.03 * step;
      const scale = phase === 'burst' ? 1 + (t * 0.8) : 1;

      // Glow central
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * scale);
      grad.addColorStop(0,   'rgba(192,132,252,0.55)');
      grad.addColorStop(0.4, 'rgba(109,40,217,0.3)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 150 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Particules orbitales (halo pré-rendu, voir glowSprite)
      const fade = phase === 'burst' ? Math.max(0, 1 - t * 0.5) : 0.85;
      for (const p of pts) {
        p.angle += p.speed * step;
        const x = cx + Math.cos(p.angle) * p.r * scale;
        const y = cy + Math.sin(p.angle) * p.r * scale * 0.55;
        ctx.globalAlpha = p.alpha * fade;
        drawGlow(ctx, dot, x, y, p.size);
      }

      // Rayons : un seul tracé pour les 12, en deux passes (halo large et
      // translucide, puis trait fin) au lieu de 12 traits avec shadowBlur.
      ctx.globalAlpha = phase === 'burst' ? Math.max(0, 0.35 - t * 0.15) : 0.15;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.5;
        const len = (80 + Math.sin(t * 3 + i) * 30) * scale;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.55);
      }
      ctx.strokeStyle = 'rgba(168,85,247,0.35)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.globalAlpha = 1;
    };

    // Effets réduits : une image fixe, pas de boucle.
    if (lowFx) { render(1); return; }

    let last = 0;
    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      if (last && now - last < FRAME_MS - 1) return;
      const step = last ? Math.min((now - last) / BASE_FRAME_MS, 4) : 1;
      last = now;
      render(step);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, lowFx]);

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      opacity: phase === 'fade' ? 0 : 1,
      transition: phase === 'fade' ? 'opacity 0.5s ease' : 'opacity 0.3s ease',
    }}>
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      <div style={{
        position:'relative', zIndex:1, textAlign:'center',
        transform: phase === 'burst' ? 'scale(1.15)' : 'scale(1)',
        transition:'transform 0.3s ease',
      }}>
        <div style={{
          fontFamily:'var(--f-title)', fontSize:32, fontWeight:900,
          color:'#e9d5ff', letterSpacing:4,
          textShadow:'0 0 30px rgba(192,132,252,0.8), 0 0 60px rgba(109,40,217,0.5)',
          marginBottom:8,
        }}>
          INVOCATION
        </div>
        <div style={{
          fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(192,132,252,0.5)',
          letterSpacing:2, fontWeight:700,
        }}>
          EN COURS...
        </div>
      </div>
    </div>
  );
}
