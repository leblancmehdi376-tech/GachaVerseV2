'use client';
import { useMemo, useState } from 'react';
import { BigNum, BN_ZERO, bnCompare, bnSub, bnToNumber } from '@/lib/game/bignum';
import { formatNumber } from '@/lib/game/format';
import type { CurrencySnapshot } from '@/store/gameStore.types';

// Graphe de solde coins/gemmes pour le panel admin — voir CurrencySnapshot
// (store/gameStore.types.ts) : un point par sauvegarde Firestore réelle
// (~10min), sans lecture/écriture Firestore supplémentaire (le champ voyage
// dans le doc déjà lu/écrit par ailleurs). Affiche la VARIATION NETTE entre
// deux points consécutifs (gagné en vert, dépensé en rouge) — pas le gain et
// la dépense bruts séparément : un gain et une dépense survenus entre deux
// mêmes sauvegardes se compensent dans le delta affiché. C'est suffisant pour
// repérer une tendance ou un pic suspect, mais ce n'est pas un journal exact
// de chaque transaction (qui n'existe pas ailleurs dans le jeu non plus).

interface DeltaPoint {
  t: number;
  sign: -1 | 0 | 1;
  magnitude: number;   // valeur absolue du delta, pour la hauteur de barre
  deltaLabel: string;  // ex "+1.2K" / "-450"
  balanceLabel: string;
}

function signedLabel(sign: -1 | 0 | 1, formatted: string): string {
  return sign > 0 ? `+${formatted}` : sign < 0 ? `-${formatted}` : formatted;
}

function buildCoinDeltas(history: CurrencySnapshot[]): DeltaPoint[] {
  const points: DeltaPoint[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].coins;
    const cur: BigNum = history[i].coins;
    const cmp = bnCompare(cur, prev);
    const sign: -1 | 0 | 1 = cmp === 0 ? 0 : cmp > 0 ? 1 : -1;
    const abs = sign === 0 ? BN_ZERO : sign > 0 ? bnSub(cur, prev) : bnSub(prev, cur);
    const rawMagnitude = bnToNumber(abs);
    points.push({
      t: history[i].t,
      sign,
      magnitude: Number.isFinite(rawMagnitude) ? rawMagnitude : Number.MAX_VALUE,
      deltaLabel: signedLabel(sign, formatNumber(abs)),
      balanceLabel: formatNumber(cur),
    });
  }
  return points;
}

function buildGemDeltas(history: CurrencySnapshot[]): DeltaPoint[] {
  const points: DeltaPoint[] = [];
  for (let i = 1; i < history.length; i++) {
    const delta = history[i].gems - history[i - 1].gems;
    const sign: -1 | 0 | 1 = delta === 0 ? 0 : delta > 0 ? 1 : -1;
    points.push({
      t: history[i].t,
      sign,
      magnitude: Math.abs(delta),
      deltaLabel: signedLabel(sign, Math.abs(delta).toLocaleString('fr-FR')),
      balanceLabel: history[i].gems.toLocaleString('fr-FR'),
    });
  }
  return points;
}

function formatDate(t: number): string {
  return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const GAIN_COLOR = '#4ade80';
const LOSS_COLOR = '#f87171';
const CHART_HEIGHT = 90;
const BASELINE = CHART_HEIGHT / 2;
const MAX_HALF = CHART_HEIGHT / 2 - 6;
const BAR_WIDTH = 6;
const BAR_GAP = 2;

function MiniDeltaChart({ icon, label, points, currentBalanceLabel }: {
  icon: string; label: string; points: DeltaPoint[]; currentBalanceLabel: string;
}) {
  const [hovered, setHovered] = useState<DeltaPoint | null>(null);
  const maxMagnitude = useMemo(() => points.reduce((m, p) => Math.max(m, p.magnitude), 0), [points]);
  const readout = hovered ?? points[points.length - 1];
  const width = Math.max(points.length * (BAR_WIDTH + BAR_GAP), 1);

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 12.4 }}>{icon} {label}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5 }}>solde actuel : {currentBalanceLabel}</span>
      </div>

      {/* Lecture au survol/focus d'une barre — évite une infobulle flottante à
          repositionner (fragile), affiche par défaut le dernier point connu. */}
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginBottom: 4, minHeight: 15 }}>
        {readout ? (
          <>
            {formatDate(readout.t)} ·{' '}
            <span style={{ color: readout.sign > 0 ? GAIN_COLOR : readout.sign < 0 ? LOSS_COLOR : 'rgba(255,255,255,0.55)', fontWeight: 700 }}>
              {readout.deltaLabel}
            </span>
            {' '}· solde {readout.balanceLabel}
          </>
        ) : 'Pas encore assez de points.'}
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.08)' }}>
        <svg width={width} height={CHART_HEIGHT} onMouseLeave={() => setHovered(null)}>
          <line x1={0} y1={BASELINE} x2={width} y2={BASELINE} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          {points.map((p, i) => {
            const half = maxMagnitude > 0 ? Math.max(p.magnitude > 0 ? 2 : 0, (p.magnitude / maxMagnitude) * MAX_HALF) : 0;
            const x = i * (BAR_WIDTH + BAR_GAP);
            const y = p.sign >= 0 ? BASELINE - half : BASELINE;
            const color = p.sign > 0 ? GAIN_COLOR : p.sign < 0 ? LOSS_COLOR : 'rgba(255,255,255,0.2)';
            return (
              <rect
                key={i}
                x={x} y={y} width={BAR_WIDTH} height={Math.max(half, 1)} rx={1.5}
                fill={color}
                tabIndex={0}
                role="img"
                aria-label={`${formatDate(p.t)} : ${p.deltaLabel}, solde ${p.balanceLabel}`}
                onMouseEnter={() => setHovered(p)}
                onFocus={() => setHovered(p)}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </svg>
      </div>

      {points.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.7 }}>{formatDate(points[0].t)}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.7 }}>{formatDate(points[points.length - 1].t)}</span>
        </div>
      )}
    </div>
  );
}

export function CurrencyHistoryChart({ history }: { history: CurrencySnapshot[] }) {
  const coinPoints = useMemo(() => buildCoinDeltas(history), [history]);
  const gemPoints = useMemo(() => buildGemDeltas(history), [history]);

  if (history.length < 2) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>
        Historique en cours de constitution (un point par sauvegarde, environ toutes les 10 minutes de jeu) — revenir plus tard pour voir la courbe.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10, fontSize: 11.5 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: GAIN_COLOR, display: 'inline-block' }} /> Gagné (net)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.55)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: LOSS_COLOR, display: 'inline-block' }} /> Dépensé (net)
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>— variation entre deux sauvegardes consécutives</span>
      </div>

      <MiniDeltaChart icon="🪙" label="Pixel-Coins" points={coinPoints} currentBalanceLabel={formatNumber(history[history.length - 1].coins)} />
      <MiniDeltaChart icon="💎" label="Neko-Gemmes" points={gemPoints} currentBalanceLabel={history[history.length - 1].gems.toLocaleString('fr-FR')} />
    </div>
  );
}
