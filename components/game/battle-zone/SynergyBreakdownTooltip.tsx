'use client';
import type { ReactNode } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { computeSynergyProgress, type SynergyProgress, type SynergyThreshold } from '@/lib/game/synergies';
import { BreakdownPopup } from './DpsBreakdownTooltip';

const bonusText = (t: SynergyThreshold) =>
  [t.dpsBonus > 0 && `+${t.dpsBonus}% DPS`, t.globalBonus > 0 && `+${t.globalBonus}% global`]
    .filter(Boolean).join(' · ');

function SynergyBlock({ p }: { p: SynergyProgress }) {
  const names = p.members
    .map(id => getCharacterById(parseInstanceKey(id).templateId)?.name)
    .filter(Boolean).join(', ');
  const max = p.thresholds[p.thresholds.length - 1].count;

  return (
    <div className="dps-tip__char">
      <div className="dps-tip__row">
        <span className="dps-tip__label" style={{ color: p.active ? p.def.color : 'var(--text-dim)' }}>
          <span>{p.def.icon}</span>{p.def.label}
        </span>
        <span className="dps-tip__value" style={{ color: p.active ? p.def.color : 'var(--text-dim)' }}>{p.count}/{max}</span>
      </div>
      <div className="syn-tip__members">{names}</div>
      {p.thresholds.map(t => {
        // Palier appliqué en clair ; palier dépassé ou encore à débloquer en gris.
        const isActive = t === p.active;
        const locked = p.count < t.count;
        return (
          <div key={t.count} className={`dps-tip__row is-sub syn-tip__tier${isActive ? ' is-active' : ''}`}
            style={isActive ? { color: p.def.color } : undefined}>
            <span className="dps-tip__label">×{t.count} — {bonusText(t)}</span>
            <span className="dps-tip__value">
              {isActive ? '✓ ACTIF' : locked ? `encore ${t.count - p.count}` : 'dépassé'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SynergyContent({ list }: { list: SynergyProgress[] }) {
  return (
    <div className="dps-tip dps-tip--syn">
      <div className="dps-tip__title">🔗 SYNERGIES DE L&apos;ÉQUIPE</div>
      {list.length === 0 ? (
        <div className="dps-tip__empty">Équipe plusieurs compagnons d&apos;un même univers pour activer une synergie.</div>
      ) : (
        <div className="dps-tip__section">
          {list.map(p => <SynergyBlock key={p.def.id} p={p} />)}
        </div>
      )}
      <div className="dps-tip__note syn-tip__note">
        Seul le palier le plus haut s&apos;applique. Le bonus <b>DPS</b> touche les persos de l&apos;univers, le bonus <b>global</b> toute l&apos;équipe.
      </div>
    </div>
  );
}

const readSyn = () => computeSynergyProgress(useGameStore.getState().equippedTeam);
const renderSyn = (list: SynergyProgress[]) => <SynergyContent list={list} />;

/**
 * Enveloppe les badges de synergie : au survol, liste les synergies entamées
 * par l'équipe avec leur palier actif (en clair) et les paliers encore
 * atteignables (en gris). Voir computeSynergyProgress.
 */
export function SynergyBreakdownTooltip({ children }: { children: ReactNode }) {
  return <BreakdownPopup read={readSyn} render={renderSyn}>{children}</BreakdownPopup>;
}
