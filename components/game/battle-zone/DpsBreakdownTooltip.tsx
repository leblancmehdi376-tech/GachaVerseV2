'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { BN_ZERO, bnAdd, bnDivRatio, bnIsZero } from '@/lib/game/bignum';
import { getCharacterById } from '@/lib/game/characters';
import { RARITY_CONFIG } from '@/types/game';
import type { DpsBreakdown } from '@/store/gameStore.types';

const REFRESH_MS = 1000;

// Bonus/malus en pourcentage lisible : 1.189 → "+18.9 %", 0.9 → "−10 %".
function pct(mult: number): string {
  const v = Math.round((mult - 1) * 1000) / 10;
  return `${v >= 0 ? '+' : '−'}${Math.abs(v)} %`;
}

// Multiplicateur lisible : 1.25 → "×1.25", 3 → "×3".
function mul(mult: number): string {
  return `×${Math.round(mult * 100) / 100}`;
}

function Row({ label, value, color, sub = false }: { label: ReactNode; value: ReactNode; color?: string; sub?: boolean }) {
  return (
    <div className={`dps-tip__row${sub ? ' is-sub' : ''}`}>
      <span className="dps-tip__label">{label}</span>
      <span className="dps-tip__value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

function BreakdownContent({ b }: { b: DpsBreakdown }) {
  const bonus = (mult: number) => (mult >= 1 ? '#4ade80' : '#f87171');
  const charsDps = b.chars.reduce((s, c) => bnAdd(s, c.dps), BN_ZERO);
  const team: { key: string; label: string; mult: number }[] = [
    { key: 'coh', label: "Cohésion d'équipe", mult: b.cohesionMult },
    { key: 'pre', label: 'DPS Prestige', mult: b.prestigeMult },
    { key: 'ano', label: 'Anomalies (DPS global)', mult: b.anomalyMult },
    { key: 'ult', label: "Ultimes (toute l'équipe)", mult: b.teamUltMult },
    { key: 'bst', label: 'Boost DPS (boutique)', mult: b.boostMult },
  ].filter(x => x.mult !== 1);

  return (
    <div className="dps-tip">
      <div className="dps-tip__title">🔥 D&apos;OÙ VIENNENT TES DPS</div>

      {b.chars.length === 0 ? (
        <div className="dps-tip__empty">Aucun compagnon équipé.</div>
      ) : (
        <div className="dps-tip__section">
          {b.chars.map(c => {
            const tpl = getCharacterById(c.templateId);
            const share = bnIsZero(charsDps) ? 0 : Math.round(bnDivRatio(c.dps, charsDps) * 1000) / 10;
            return (
              <div key={c.key} className="dps-tip__char">
                <Row
                  label={<><span className="dps-tip__dot" style={{ background: tpl ? RARITY_CONFIG[tpl.rarity].color : '#fff' }} />{c.name}</>}
                  value={`${share} %`} color="var(--text)" />
                {c.masteryMult !== 1 && <Row sub label="Maîtrise" value={pct(c.masteryMult)} color={bonus(c.masteryMult)} />}
                {c.equipMult !== 1 && <Row sub label="Équipement" value={mul(c.equipMult)} color={bonus(c.equipMult)} />}
                {c.selfUltMult !== 1 && <Row sub label="Ultime" value={pct(c.selfUltMult)} color={bonus(c.selfUltMult)} />}
                {c.typeMult !== 1 && <Row sub label={`${c.typeMult > 1 ? 'Avantage' : 'Désavantage'} de type`} value={pct(c.typeMult)} color={bonus(c.typeMult)} />}
              </div>
            );
          })}
        </div>
      )}

      {b.chars.length > 0 && (
        <div className="dps-tip__subtotal">
          <span>Sous-total compagnons</span>
          <span>{formatNumber(b.chars.reduce((s, c) => bnAdd(s, c.ownDps), BN_ZERO))} DPS</span>
        </div>
      )}

      {(b.synergies.length > 0 || team.length > 0) && (
        <div className="dps-tip__section">
          {b.synergies.map(s => (
            <Row key={`${s.label}-${s.global}`} sub
              label={<>Synergie <span style={{ color: s.color }}>{s.label}</span>{s.global ? ' (toute l\'équipe)' : ''}</>}
              value={`+${s.bonusPct} %`} color="#4ade80" />
          ))}
          {team.map(x => <Row key={x.key} sub label={x.label} value={pct(x.mult)} color={bonus(x.mult)} />)}
        </div>
      )}

      <div className="dps-tip__total">
        <span>TOTAL</span>
        <span>{formatNumber(b.total)} DPS</span>
      </div>
      {b.eventMult !== 1 && (
        <div className="dps-tip__note">Événement en cours : {pct(b.eventMult)} sur les dégâts infligés</div>
      )}
    </div>
  );
}

/**
 * Enveloppe le DPS d'équipe : au survol, affiche une fenêtre qui détaille la
 * contribution de chaque compagnon et tous les bonus appliqués (voir
 * getDpsBreakdown). Recalculé chaque seconde tant qu'elle est ouverte.
 */
export function DpsBreakdownTooltip({ children }: { children: ReactNode }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [breakdown, setBreakdown] = useState<DpsBreakdown | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const iv = setInterval(() => setBreakdown(useGameStore.getState().getDpsBreakdown()), REFRESH_MS);
    return () => clearInterval(iv);
  }, [anchor]);

  const open = (el: HTMLElement) => {
    setBreakdown(useGameStore.getState().getDpsBreakdown());
    setAnchor(el.getBoundingClientRect());
  };

  return (
    // Survol sur ordinateur ; appui sur mobile (pas de survol au doigt).
    <div onMouseEnter={e => open(e.currentTarget)} onMouseLeave={() => setAnchor(null)}
      onClick={e => (anchor ? setAnchor(null) : open(e.currentTarget))} style={{ cursor: 'help' }}>
      {children}
      {anchor && breakdown && createPortal(
        <div className="dps-tip__pop" style={{ right: Math.max(8, window.innerWidth - anchor.right), bottom: window.innerHeight - anchor.top + 8 }}>
          <BreakdownContent b={breakdown} />
        </div>,
        document.body,
      )}
    </div>
  );
}
