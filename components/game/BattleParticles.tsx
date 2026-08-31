'use client';
import { useEffect, useRef, useMemo } from 'react';

interface Props {
  accentColor: string; // hex or css color from palier config
  isBoss?: boolean;
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
  return {
    x: Math.random() * w,
    y: h + Math.random() * 40,              // start below viewport
    vx: (Math.random() - 0.5) * 0.4,
    vy: -(0.3 + Math.random() * (boss ? 0.9 : 0.6)),
    size: type === 'ember' ? 1.5 + Math.random() * 2 : type === 'mote' ? 3 + Math.random() * 4 : 1 + Math.random() * 1.5,
    opacity: 0,
    life: 0,
    speed: 0.003 + Math.random() * 0.004,
    r: Math.min(255, Math.max(0, r + dr)),
    g: Math.min(255, Math.max(0, g + dr * 0.5)),
    b: Math.min(255, Math.max(0, b - dr * 0.2)),
    type,
  };
}

export function BattleParticles({ accentColor, isBoss = false }: Props) {
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

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Seed initial particles at random y positions
    for (let i = 0; i < COUNT; i++) {
      const p = spawnParticle(canvas.width, canvas.height, rgb, isBoss);
      p.y = Math.random() * canvas.height; // spread across full height initially
      p.life = Math.random();
      particlesRef.current.push(p);
    }

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.life = Math.min(1, p.life + p.speed);
        // Fade in first 20% of life, fade out last 30%
        if (p.life < 0.2) {
          p.opacity = p.life / 0.2;
        } else if (p.life > 0.7) {
          p.opacity = 1 - (p.life - 0.7) / 0.3;
        } else {
          p.opacity = 1;
        }

        p.x += p.vx;
        p.y += p.vy;
        // Slight wobble
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vx *= 0.99; // dampen drift

        const alpha = p.opacity * (p.type === 'mote' ? 0.08 : p.type === 'ember' ? 0.55 : 0.35);

        if (p.type === 'mote') {
          // Soft glowing orb
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha * 2.5})`);
          grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        } else {
          // Crisp dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
          ctx.fill();

          if (p.type === 'ember') {
            // Small trailing glow
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${p.r},${p.g},${p.b},0.6)`;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Respawn when off-screen or life complete
        if (p.life >= 1 || p.y < -20) {
          const fresh = spawnParticle(w, h, rgb, isBoss);
          Object.assign(p, fresh);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      particlesRef.current = [];
    };
  }, [rgb, isBoss]);

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
