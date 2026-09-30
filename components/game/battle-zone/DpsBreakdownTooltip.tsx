'use client';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useHoverTap } from '@/hooks/useHoverTap';
import { placePopup } from '@/lib/ui/placePopup';
import { createPortal } from 'react-dom';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { BN_ZERO, bnAdd, bnDivRatio, bnIsZero } from '@/lib/game/bignum';
import { getCharacterById } from '@/lib/game/characters';
import { RARITY_CONFIG } from '@/types/game';
import type { DpsBreakdown } from '@/store/gameStore.types';

const REFRESH_MS = 1000;

// Bonus/malus en pourcentage lisible : 1.189 → "+18.9 %", 0.9 → "−10 %".
export function pct(mult: number): string {
  const v = Math.round((mult - 1) * 1000) / 10;
  return `${v >= 0 ? '+' : '−'}${Math.abs(v)} %`;
}

// Multiplicateur lisible : 1.25 → "×1.25", 3 → "×3".
export function mul(mult: number): string {
  return `×${Math.round(mult * 100) / 100}`;
}

export function Row({ label, value, color, sub = false }: { label: ReactNode; value: ReactNode; color?: string; sub?: boolean }) {
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
  const ownDps = b.chars.reduce((s, c) => bnAdd(s, c.ownDps), BN_ZERO);
  // Produit des bonus d'équipe : passe du sous-total compagnons au total.
  const teamMult = bnIsZero(ownDps) ? 1 : bnDivRatio(b.total, ownDps);
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
                {c.synergyMult !== 1 && (
                  <Row sub value={pct(c.synergyMult)} color={bonus(c.synergyMult)}
                    label={<>Synergie{c.synergies.length > 1 ? 's' : ''}{' '}
                      {c.synergies.map((s, i) => (
                        <span key={`${s.label}-${s.global}`} style={{ color: s.color }}>{i > 0 ? ', ' : ''}{s.label}{s.global ? ' (globale)' : ''}</span>
                      ))}</>} />
                )}
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
          <span>{formatNumber(ownDps)} DPS</span>
        </div>
      )}

      {team.length > 0 && (
        <div className="dps-tip__section">
          {team.map(x => <Row key={x.key} sub label={x.label} value={pct(x.mult)} color={bonus(x.mult)} />)}
        </div>
      )}

      {b.chars.length > 0 && (
        <div className="dps-tip__subtotal">
          <span>Multiplicateur total</span>
          <span>{mul(teamMult)}</span>
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
 * Fenêtre de détail au survol (ordinateur) ou à l'appui (mobile), recalculée
 * chaque seconde tant qu'elle est ouverte. Partagée par le détail du DPS, de
 * l'or (GoldBreakdownTooltip) et des synergies (SynergyBreakdownTooltip).
 * Mesurée puis placée par placePopup : elle reste toujours entièrement dans
 * l'écran (au-dessus de la case, sinon en dessous, sinon contre le bord).
 */
export function BreakdownPopup<T>({ read, render, children }: { read: () => T; render: (data: T) => ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  // Survol sur ordinateur ; appui sur mobile (pas de survol au doigt).
  const { visible, hide, triggerProps, popupProps } = useHoverTap(ref, () => { setData(read()); setPos(null); }, popRef);

  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => setData(read()), REFRESH_MS);
    return () => clearInterval(iv);
  }, [visible, read]);

  // Replacement à chaque rafraîchissement : la hauteur change avec le contenu.
  useLayoutEffect(() => {
    if (!visible || !ref.current || !popRef.current) return;
    const next = placePopup(ref.current.getBoundingClientRect(), popRef.current.getBoundingClientRect(), { align: 'end' });
    setPos(p => (p && p.left === next.left && p.top === next.top ? p : next));
  }, [visible, data]);

  // La position est figée à l'ouverture : on referme si la page défile ou
  // change de taille (sauf défilement DANS la popup, possible au doigt).
  useEffect(() => {
    if (!visible) return;
    const onScroll = (e: Event) => { if (!popRef.current?.contains(e.target as Node)) hide(); };
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', hide);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [visible, hide]);

  return (
    <div ref={ref} {...triggerProps} style={{ cursor: 'help' }}>
      {children}
      {visible && data !== null && createPortal(
        // Invisible au premier rendu, le temps d'être mesurée et placée.
        <div ref={popRef} {...popupProps} className="dps-tip__pop" style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}>
          {render(data)}
        </div>,
        document.body,
      )}
    </div>
  );
}

const readDps = () => useGameStore.getState().getDpsBreakdown();
const renderDps = (b: DpsBreakdown) => <BreakdownContent b={b} />;

/**
 * Enveloppe le DPS d'équipe : au survol, affiche une fenêtre qui détaille la
 * contribution de chaque compagnon et tous les bonus appliqués (voir
 * getDpsBreakdown).
 */
export function DpsBreakdownTooltip({ children }: { children: ReactNode }) {
  return <BreakdownPopup read={readDps} render={renderDps}>{children}</BreakdownPopup>;
}
