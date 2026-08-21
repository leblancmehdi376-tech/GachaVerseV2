"use client";
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Affinity,
  AFFINITY_CONFIG,
  AFFINITY_ORDER,
  affinityBeats,
  affinityBeatenBy,
} from '@/lib/game/affinities';

function getAffinityConfig(affinity: Affinity) {
  return AFFINITY_CONFIG[affinity];
}

function CycleNode({ affinity, active }: { affinity: Affinity; active: boolean }) {
  const { color, icon } = getAffinityConfig(affinity);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: active ? 22 : 18,
        height: active ? 22 : 18,
        borderRadius: '50%',
        fontSize: active ? 12.4 : 12,
        background: active ? `${color}33` : 'rgba(255,255,255,0.04)',
        border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
        boxShadow: active ? `0 0 10px ${color}88` : 'none',
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
}

function MatchupLine({ label, emoji, target, tint }: { label: string; emoji: string; target: Affinity; tint: string }) {
  const { color, icon, label: name } = getAffinityConfig(target);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: tint }}>
      <span>{emoji}</span>
      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{icon} {name}</span>
    </div>
  );
}

export function AffinityTooltip({ affinity, children }: { affinity: Affinity; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'top' });

  const config = getAffinityConfig(affinity);
  const strongAgainst = affinityBeats(affinity);
  const weakAgainst = affinityBeatenBy(affinity);

  // Recalculate position when tooltip becomes visible or on resize/scroll
  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = anchorRef.current;
    const tip = tooltipRef.current;
    if (!anchor || !tip) return;

    const gap = 10;
    const aRect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const anchorCenter = aRect.left + aRect.width / 2;

    // Try place on top
    let top = aRect.top - tipRect.height - gap;
    let placement: 'top' | 'bottom' = 'top';
    if (top < 8) {
      // Not enough space above → place below
      top = aRect.bottom + gap;
      placement = 'bottom';
    }

    // Compute left so the tooltip stays within viewport
    let left = anchorCenter - tipRect.width / 2;
    const minLeft = 8;
    const maxLeft = window.innerWidth - tipRect.width - 8;
    left = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));

    setPos({ top: Math.round(top), left: Math.round(left), placement });
  }, [visible, affinity]);

  useEffect(() => {
    if (!visible) return;
    const handler = () => {
      // trigger layout effect recalculation
      if (tooltipRef.current) setPos(p => ({ ...p }));
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, { passive: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler);
    };
  }, [visible]);

  const tooltipContent = (
    <span
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'linear-gradient(180deg, rgba(24,24,30,0.98), rgba(15,15,20,0.98))',
        border: `1px solid ${config.color}55`,
        boxShadow: `0 0 30px ${config.color}44, 0 12px 40px rgba(0,0,0,0.6)`,
        borderRadius: 10,
        padding: '10px 12px',
        zIndex: 9999,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        maxWidth: 'min(80vw, 360px)',
      }}
    >
      <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 12, letterSpacing: 1, color: config.color, textShadow: `0 0 10px ${config.color}88`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13.4 }}>{config.icon}</span>
        {config.label.toUpperCase()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        {AFFINITY_ORDER.map((a) => (
          <span key={a} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CycleNode affinity={a} active={a === affinity} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>→</span>
          </span>
        ))}
        <CycleNode affinity={AFFINITY_ORDER[0]} active={AFFINITY_ORDER[0] === affinity} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--f-ui)', fontSize: 12 }}>
        <MatchupLine label="Fort contre" emoji="⚔️" target={strongAgainst} tint="#4ade80" />
        <MatchupLine label="Faible contre" emoji="🛡️" target={weakAgainst} tint="#f87171" />
      </div>
    </span>
  );

  return (
    <span ref={anchorRef} style={{ display: 'inline-flex' }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && createPortal(tooltipContent, document.body)}
    </span>
  );
}

export default AffinityTooltip;
