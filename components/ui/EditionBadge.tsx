'use client';
// Badge d'édition (pastille "🥉 BRONZE"…) et jauge d'édition d'une carte
// possédée (points accumulés vers le palier suivant, voir lib/game/editions.ts).
import type { CSSProperties } from 'react';
import type { OwnedCharacter } from '@/types/game';
import { EDITION_CONFIG, EDITION_MAX_POINTS, getEditionPoints, nextEdition, type CardEdition } from '@/lib/game/editions';
import { EditionIcon } from '@/components/ui/EditionLogo';

const PRISM_GRADIENT = 'linear-gradient(90deg,#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9)';

export function EditionBadge({ edition, style }: { edition?: CardEdition; style?: CSSProperties }) {
  if (!edition || edition === 'base') return null;
  const ed = EDITION_CONFIG[edition];
  return (
    <span style={{
      fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 12, letterSpacing: 0.5, whiteSpace: 'nowrap',
      color: ed.color, background: `${ed.glow}22`, border: `1px solid ${ed.glow}77`,
      borderRadius: 999, padding: '2px 8px', ...style,
    }}>
      <EditionIcon edition={edition} size={15} /> {ed.label.toUpperCase()}
    </span>
  );
}

function gaugeState(owned: Pick<OwnedCharacter, 'edition' | 'editionPoints'>) {
  const edition = owned.edition ?? 'base';
  const ed = EDITION_CONFIG[edition];
  const points = getEditionPoints(owned);
  const next = nextEdition(edition);
  const from = ed.points;
  const to = next ? EDITION_CONFIG[next].points : EDITION_MAX_POINTS;
  // Remplissage = total accumulé / seuil suivant (cohérent avec le libellé "13 / 16").
  const pct = next ? Math.min(100, (points / to) * 100) : 100;
  const fill = edition === 'prismatic' ? PRISM_GRADIENT : `linear-gradient(90deg, ${ed.glow}, ${next ? EDITION_CONFIG[next].color : ed.color})`;
  return { edition, ed, points, next, from, to, pct, fill };
}

// Version compacte (grilles de cartes) : barre fine + "13/16".
export function EditionGaugeMini({ owned, style }: { owned: Pick<OwnedCharacter, 'edition' | 'editionPoints'>; style?: CSSProperties }) {
  const { ed, points, next, to, pct, fill } = gaugeState(owned);
  return (
    <div title={next ? `${EDITION_CONFIG[next].label} dans ${to - points} pt${to - points > 1 ? 's' : ''}` : 'Édition maximale'}
      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', ...style }}>
      <div role="progressbar" aria-label="Jauge d'édition" aria-valuemin={0} aria-valuemax={to} aria-valuenow={points}
        style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: 'rgba(0,0,0,0.4)', border: `1px solid ${ed.glow}55`, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fill }} />
      </div>
      <span style={{ fontFamily: 'var(--f-num)', fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
        {next ? `${points}/${to}` : 'MAX'}
      </span>
    </div>
  );
}

export function EditionGauge({ owned }: { owned: Pick<OwnedCharacter, 'edition' | 'editionPoints'> }) {
  const { edition, ed, points, next, from, to, pct, fill } = gaugeState(owned);

  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>JAUGE D&apos;ÉDITION</span>
        <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 700, color: 'var(--text-sub)' }}>
          {next ? `${points} / ${to}` : `${points} / ${EDITION_MAX_POINTS} · MAX`}
        </span>
      </div>
      <div
        role="progressbar" aria-valuemin={from} aria-valuemax={to} aria-valuenow={points}
        style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', overflow: 'hidden' }}
      >
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: fill, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700 }}>
        <span style={{ color: ed.color }}><EditionIcon edition={edition} size={14} /> {ed.label}</span>
        {next
          ? <span style={{ color: EDITION_CONFIG[next].color }}><EditionIcon edition={next} size={14} /> {EDITION_CONFIG[next].label} dans {to - points} pt{to - points > 1 ? 's' : ''}</span>
          : <span style={{ color: 'var(--text-muted)' }}>Édition maximale</span>}
      </div>
    </div>
  );
}
