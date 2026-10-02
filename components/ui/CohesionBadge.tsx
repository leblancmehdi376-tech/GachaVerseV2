"use client";
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHoverTap } from '@/hooks/useHoverTap';
import { placePopup } from '@/lib/ui/placePopup';
import { useGameStore } from '@/store/gameStore';
import { computeCohesion, COHESION_AMPLITUDE, COHESION_MALUS_FULL_LEVEL, COHESION_FREE_GAP } from '@/lib/game/cohesion';

const GOOD = '#4ade80';
const BAD = '#ef4444';

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, color: color ?? 'rgba(255,255,255,0.85)' }}>{value}</span>
    </div>
  );
}

// Badge "Cohésion d'équipe" (smiley + % de DPS) avec infobulle détaillée.
// Même calcul que getTeamCohesion (slot vide = niveau 0) — voir lib/game/cohesion.ts.
export function CohesionBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const equippedTeam = useGameStore(s => s.equippedTeam);
  const collection = useGameStore(s => s.collection);
  const r = computeCohesion(equippedTeam.map(id => (id ? collection[id]?.level ?? 0 : 0)));

  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const { visible, hide, triggerProps, popupProps } = useHoverTap(anchorRef, undefined, tooltipRef);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!visible) return;
    const anchor = anchorRef.current;
    const tip = tooltipRef.current;
    if (!anchor || !tip) return;
    setPos(placePopup(anchor.getBoundingClientRect(), tip.getBoundingClientRect(), { gap: 10 }));
  }, [visible, r.mult]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', hide);
      window.removeEventListener('scroll', hide, { capture: true });
    };
  }, [visible, hide]);

  const pct = (r.mult - 1) * 100;
  const bad = r.mult < 1;
  const color = bad ? BAD : GOOD;
  const emoji = bad ? '😡' : '😄';
  const cohesionPct = Math.round(r.cohesion * 100);
  const amp = Math.round(COHESION_AMPLITUDE * 100);

  let tip: string;
  if (r.maxLevel === 0) tip = 'Équipe des compagnons pour profiter de la cohésion.';
  else if (r.emptySlots > 0) tip = 'Remplis tes slots vides : chacun compte comme un compagnon de niveau 0.';
  else if (bad) tip = 'Monte tes compagnons les plus bas pour réduire l\'écart de niveau.';
  else if (r.cohesion < 0.999) tip = `Ramène l'écart moyen à ${COHESION_FREE_GAP} niveaux ou moins pour atteindre +${amp} %.`;
  else tip = 'Équipe parfaitement soudée !';

  const fs = size === 'md' ? 15 : 14;

  const tooltip = (
    <div
      ref={tooltipRef}
      {...popupProps}
      // Touchable au doigt (pour être refermée d'un tap), transparente à la souris.
      className="tap-popup"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
        width: 250, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100dvh - 16px)', overflow: 'hidden',
        padding: '12px 14px', borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(24,24,30,0.98), rgba(15,15,20,0.98))',
        border: `1px solid ${color}55`,
        boxShadow: `0 0 30px ${color}33, 0 12px 40px rgba(0,0,0,0.6)`,
        fontFamily: 'var(--f-ui)', fontSize: 14, textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 800, letterSpacing: 1, color, textShadow: `0 0 10px ${color}88` }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          COHÉSION D&apos;ÉQUIPE
        </div>
        <span style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 17, color }}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>

      {/* Jauge de cohésion */}
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${cohesionPct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${BAD}, #facc15, ${GOOD})`, backgroundSize: '222px 100%', boxShadow: `0 0 8px ${color}88`, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
        <span>−{amp} %</span>
        <span style={{ color, fontWeight: 700 }}>{cohesionPct}%</span>
        <span>+{amp} %</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
        <Row label="Niveau le plus haut" value={`${r.maxLevel}`} />
        <Row label="Écart moyen" value={`${r.avgGap.toFixed(1)} niv.`} color={bad ? BAD : undefined} />
        <Row label="Écart sans pénalité" value={`≤ ${COHESION_FREE_GAP} niv.`} />
        <Row label="Écart toléré" value={`${COHESION_FREE_GAP} + ${Math.round(r.tolerance)} niv.`} />
        {r.emptySlots > 0 && <Row label="Slots vides" value={`${r.emptySlots}`} color={BAD} />}
        {r.maxLevel > 0 && r.malusWeight < 1 && (
          <Row label="Malus atténué" value={`${Math.round(r.malusWeight * 100)}% (niv. < ${COHESION_MALUS_FULL_LEVEL})`} />
        )}
      </div>

      <div style={{ padding: '7px 9px', borderRadius: 8, background: `${color}14`, border: `1px solid ${color}33`, color: 'rgba(255,255,255,0.8)', lineHeight: 1.35, whiteSpace: 'normal' }}>
        💡 {tip}
      </div>
      <div style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.35)', whiteSpace: 'normal' }}>
        S&apos;applique au combat de l&apos;accueil uniquement (pas aux raids ni aux expéditions).
      </div>
    </div>
  );

  return (
    <span
      ref={anchorRef}
      {...triggerProps}
      className={bad ? 'cohesion-badge cohesion-badge--bad' : 'cohesion-badge'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help', whiteSpace: 'nowrap',
        fontFamily: 'var(--f-ui)', fontSize: fs, fontWeight: 700,
        color: bad ? BAD : 'rgba(74,222,128,0.8)',
        textShadow: bad ? `0 0 8px ${BAD}aa` : 'none',
      }}
    >
      <span className="cohesion-badge__emoji" style={{ fontSize: fs + 2, lineHeight: 1 }}>{emoji}</span>
      Cohésion {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      {visible && createPortal(tooltip, document.body)}
    </span>
  );
}

export default CohesionBadge;
