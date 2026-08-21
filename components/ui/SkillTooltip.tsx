"use client";
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UltimateDef } from '@/lib/game/ultimates';

export function SkillTooltip({ ult, children }: { ult: UltimateDef | undefined; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = anchorRef.current;
    const tip = tooltipRef.current;
    if (!anchor || !tip) return;

    const gap = 10;
    const aRect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const anchorCenter = aRect.left + aRect.width / 2;

    let top = aRect.top - tipRect.height - gap;
    if (top < 8) top = aRect.bottom + gap;

    let left = anchorCenter - tipRect.width / 2;
    const minLeft = 8;
    const maxLeft = window.innerWidth - tipRect.width - 8;
    left = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));

    setPos({ top: Math.round(top), left: Math.round(left) });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = () => { if (tooltipRef.current) setPos(p => ({ ...p })); };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [visible]);

  if (!ult) return <>{children}</>;

  const tooltipContent = (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'linear-gradient(180deg, rgba(24,16,40,0.98), rgba(15,10,24,0.98))',
        border: '1px solid rgba(192,132,252,0.5)',
        boxShadow: '0 0 30px rgba(192,132,252,0.3), 0 12px 40px rgba(0,0,0,0.6)',
        borderRadius: 10,
        padding: '10px 12px',
        zIndex: 9999,
        pointerEvents: 'none',
        maxWidth: 'min(80vw, 260px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ fontSize: 13.4 }}>⚡</span>
        <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 11.3, letterSpacing: 0.5, color: '#c084fc', textShadow: '0 0 10px rgba(192,132,252,0.6)' }}>
          {ult.name}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 10.8, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: 6 }}>
        {ult.description}
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 9.3, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 }}>
        Durée {ult.duration}s · Cooldown {ult.cooldown}s
      </div>
    </div>
  );

  return (
    <div ref={anchorRef} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && createPortal(tooltipContent, document.body)}
    </div>
  );
}

export default SkillTooltip;
