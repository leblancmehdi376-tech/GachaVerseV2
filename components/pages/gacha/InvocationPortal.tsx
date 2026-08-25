'use client';
import { useState, useEffect, useRef } from 'react';

// Invocation portal — animation d'appel avant les cartes
export function InvocationPortal({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'build' | 'burst' | 'fade'>('build');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

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

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.03;
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

      // Particules orbitales
      for (const p of pts) {
        p.angle += p.speed;
        const x = cx + Math.cos(p.angle) * p.r * scale;
        const y = cy + Math.sin(p.angle) * p.r * scale * 0.55;
        ctx.globalAlpha = p.alpha * (phase === 'burst' ? Math.max(0, 1 - t * 0.5) : 0.85);
        ctx.fillStyle = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#9333ea';
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rayons
      ctx.globalAlpha = phase === 'burst' ? Math.max(0, 0.35 - t * 0.15) : 0.15;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.5;
        const len = (80 + Math.sin(t * 3 + i) * 30) * scale;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.55);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

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
          fontFamily:'var(--f-title)', fontSize:28.8, fontWeight:900,
          color:'#e9d5ff', letterSpacing:4,
          textShadow:'0 0 30px rgba(192,132,252,0.8), 0 0 60px rgba(109,40,217,0.5)',
          marginBottom:8,
        }}>
          INVOCATION
        </div>
        <div style={{
          fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(192,132,252,0.5)',
          letterSpacing:3, fontWeight:700,
        }}>
          EN COURS...
        </div>
      </div>
    </div>
  );
}
