'use client';
// Badge d'édition (pastille "🥉 BRONZE"…) et jauge d'édition d'une carte
// possédée (points accumulés vers le palier suivant, voir lib/game/editions.ts).
import { useState, type CSSProperties } from 'react';
import type { OwnedCharacter } from '@/types/game';
import { EDITION_CONFIG, EDITION_MAX_POINTS, EDITION_ORDER, getEditionGrowthInRarities, getEditionPoints, nextEdition, type CardEdition } from '@/lib/game/editions';
import { EditionIcon } from '@/components/ui/EditionLogo';

const PRISM_GRADIENT = 'linear-gradient(90deg,#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9)';

export function EditionBadge({ edition, style }: { edition?: CardEdition; style?: CSSProperties }) {
  if (!edition || edition === 'base') return null;
  const ed = EDITION_CONFIG[edition];
  return (
    <span style={{
      fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 14, letterSpacing: 0.5, whiteSpace: 'nowrap',
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
      <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 700, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>
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
        <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>JAUGE D&apos;ÉDITION</span>
        <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 700, color: 'var(--text-sub)' }}>
          {next ? `${points} / ${to}` : `${points} / ${EDITION_MAX_POINTS} · MAX`}
        </span>
      </div>
      <div
        role="progressbar" aria-valuemin={from} aria-valuemax={to} aria-valuenow={points}
        style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', overflow: 'hidden' }}
      >
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: fill, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700 }}>
        <span style={{ color: ed.color }}><EditionIcon edition={edition} size={14} /> {ed.label}</span>
        {next
          ? <span style={{ color: EDITION_CONFIG[next].color }}><EditionIcon edition={next} size={14} /> {EDITION_CONFIG[next].label} dans {to - points} pt{to - points > 1 ? 's' : ''}</span>
          : <span style={{ color: 'var(--text-muted)' }}>Édition maximale</span>}
      </div>
      <EditionOrderInfo current={edition} />
    </div>
  );
}

// Explication dépliable de l'ordre des éditions (de la plus commune à la plus rare).
function EditionOrderInfo({ current }: { current: CardEdition }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{
          width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: 'none', border: 'none', borderTop: '1px solid var(--border)', padding: '6px 0 0', cursor: 'pointer',
          fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'var(--text-dim)', textAlign: 'left',
        }}
      >
        <span>ℹ️ Ordre des éditions</span>
        <span aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)' }}>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            Chaque carte tirée (doublon compris) ajoute sa valeur à la jauge. Chaque édition vaut le <b>double</b> de la précédente :
            2 Normales = 1 Bronze, 2 Bronzes = 1 Or, etc. La jauge ne redescend jamais.
          </p>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {EDITION_ORDER.map((id, i) => {
              const ed = EDITION_CONFIG[id];
              const isCurrent = id === current;
              const growth = getEditionGrowthInRarities(id);
              return (
                <li key={id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 8,
                  background: isCurrent ? `${ed.glow}22` : 'transparent', border: `1px solid ${isCurrent ? `${ed.glow}77` : 'transparent'}`,
                }}>
                  <span style={{ fontFamily: 'var(--f-num)', color: 'var(--text-muted)', minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 700, color: ed.color, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <EditionIcon edition={id} size={14} /> {ed.label}
                      {isCurrent && <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>(actuelle)</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--f-num)', display: 'flex', flexWrap: 'wrap', columnGap: 10, rowGap: 2 }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{ed.points} pt{ed.points > 1 ? 's' : ''}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>DPS ×{ed.statMult.toLocaleString('fr-FR')}</span>
                      {growth > 0 && <span style={{ whiteSpace: 'nowrap' }}>📈 +{growth.toLocaleString('fr-FR')} rareté</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p style={{ margin: 0, lineHeight: 1.4 }}>
            <b>📈 Croissance</b> : ton DPS par niveau grandit comme si la carte était d&apos;une rareté plus haute.
            Ce bonus compte surtout à haut niveau.
          </p>
        </div>
      )}
    </div>
  );
}
