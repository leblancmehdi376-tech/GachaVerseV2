'use client';
import { useId, useMemo, useRef, useState } from 'react';
import { BN_ZERO, bnAdd, bnCompare, bnLog10, bnSub, bnToNumber } from '@/lib/game/bignum';
import { formatNumber } from '@/lib/game/format';
import type { CurrencySnapshot } from '@/store/gameStore.types';

// Graphes d'historique d'un joueur pour le panel admin — voir CurrencySnapshot
// (store/gameStore.types.ts) : un point par sauvegarde Firestore réelle
// (~10min), sans lecture/écriture Firestore supplémentaire (le champ voyage
// dans le doc déjà lu/écrit par ailleurs).
//
// Tous les graphes sont des "montagnes" (aires remplies en dégradé) de la
// valeur brute à chaque point : solde coins/gemmes, palier, prestiges. La
// variation depuis le point précédent est affichée à la lecture d'un point,
// et les totaux gagné/dépensé sur la période en en-tête — ce sont des
// variations NETTES entre deux sauvegardes (un gain et une dépense survenus
// entre deux mêmes sauvegardes se compensent), pas un journal exact.
// Les points enregistrés avant l'ajout de palier/prestige sont ignorés.
//
// Les SVG s'étirent sur toute la largeur (viewBox en unités "index de point",
// preserveAspectRatio="none") : pas de scroll horizontal sur mobile, et la
// sélection d'un point se fait par position du pointeur (souris ET tactile).
// Le point sélectionné est un <div> superposé (un cercle SVG serait déformé
// par l'étirement).

type Range = '24h' | '3j' | 'all';
const RANGES: { id: Range; label: string; ms: number }[] = [
  { id: '24h', label: '24 h', ms: 24 * 3600_000 },
  { id: '3j', label: '3 j', ms: 3 * 24 * 3600_000 },
  { id: 'all', label: 'Tout', ms: Infinity },
];

const GAIN_COLOR = '#4ade80';
const LOSS_COLOR = '#f87171';
const COIN_COLOR = '#fbbf24';
const GEM_COLOR = '#22d3ee';
const PALIER_COLOR = '#60a5fa';
const MAX_PALIER_COLOR = '#f472b6';
const PRESTIGE_COLOR = '#c084fc';
const MUTED = 'rgba(255,255,255,0.55)';
const FAINT = 'rgba(255,255,255,0.3)';
const CHART_HEIGHT = 120;
const PAD_TOP = 8;

function formatDate(t: number): string {
  return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function DeltaText({ delta, format }: { delta: number | null; format: (n: number) => string }) {
  if (delta === null) return null;
  const color = delta > 0 ? GAIN_COLOR : delta < 0 ? LOSS_COLOR : MUTED;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '±';
  return <span style={{ color, fontWeight: 700 }}>{sign}{format(Math.abs(delta))}</span>;
}

// ─── Sélection d'un point à la position du pointeur ────────────────────────
function usePointerIndex(count: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const update = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || count === 0) return;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    setIndex(Math.round(ratio * (count - 1)));
  };
  const handlers = {
    ref,
    onPointerMove: (e: React.PointerEvent) => update(e.clientX),
    onPointerDown: (e: React.PointerEvent) => update(e.clientX),
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setIndex(null); },
    // Navigation clavier : flèches pour parcourir les points.
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      setIndex(i => {
        const cur = i ?? count - 1;
        return Math.min(Math.max(cur + (e.key === 'ArrowRight' ? 1 : -1), 0), count - 1);
      });
    },
    onBlur: () => setIndex(null),
  };
  return { index, handlers };
}

// ─── Montagne : une ou plusieurs séries en aires dégradées ─────────────────
interface Series {
  label: string;
  color: string;
  values: number[];   // valeurs tracées (éventuellement en log10)
  fill?: boolean;     // false = simple crête en pointillés (ex : record)
}

function MountainChart({ icon, label, times, series, summary, readout, formatAxis }: {
  icon: string; label: string; times: number[]; series: Series[];
  summary: React.ReactNode;
  readout: (index: number, selected: boolean) => React.ReactNode;
  formatAxis: (v: number) => string;
}) {
  const gradientId = useId();
  const { index, handlers } = usePointerIndex(times.length);
  const n = times.length;
  const w = Math.max(n - 1, 1);
  const all = series.flatMap(s => s.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  // Pied de la montagne : 0 pour les petites valeurs (prestige, palier bas),
  // sinon un peu sous le minimum pour que les reliefs restent lisibles.
  const lo = min <= 5 ? 0 : min - (max - min) * 0.15;
  const hi = max === lo ? lo + 1 : max;
  const toY = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * (CHART_HEIGHT - PAD_TOP);
  const shown = index ?? n - 1;

  return (
    <div style={{ padding: '12px 12px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{icon} {label}</span>
        <span style={{ color: MUTED, fontSize: 11.5 }}>{summary}</span>
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 6, minHeight: 16 }}>
        {index !== null ? formatDate(times[shown]) : 'Dernier point'} · {readout(shown, index !== null)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', height: CHART_HEIGHT, color: FAINT, fontSize: 10.5, flexShrink: 0, minWidth: 28 }}>
          <span>{formatAxis(hi)}</span>
          <span>{formatAxis(lo)}</span>
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0, borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <svg
            {...handlers}
            role="img"
            aria-label={`${label} au fil du temps. Flèches gauche/droite pour parcourir les points.`}
            width="100%" height={CHART_HEIGHT}
            viewBox={`0 0 ${w} ${CHART_HEIGHT}`} preserveAspectRatio="none"
            style={{ display: 'block', touchAction: 'pan-y', cursor: 'crosshair', outline: 'none' }}
          >
            <defs>
              {series.map((s, si) => (
                <linearGradient key={si} id={`${gradientId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            {[0.25, 0.5, 0.75].map(f => (
              <line key={f} x1={0} y1={CHART_HEIGHT * f} x2={w} y2={CHART_HEIGHT * f}
                stroke="rgba(255,255,255,0.05)" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s, si) => {
              const pts = s.values.map((v, i) => `${i} ${toY(v)}`);
              const ridge = `M${pts.join(' L')}`;
              return (
                <g key={s.label}>
                  {s.fill !== false && (
                    <path d={`${ridge} L${w} ${CHART_HEIGHT} L0 ${CHART_HEIGHT} Z`} fill={`url(#${gradientId}-${si})`} />
                  )}
                  <path d={ridge} fill="none" stroke={s.color} strokeWidth={s.fill === false ? 1.5 : 2}
                    strokeDasharray={s.fill === false ? '4 3' : undefined}
                    vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </g>
              );
            })}
            {index !== null && (
              <line x1={index} y1={0} x2={index} y2={CHART_HEIGHT}
                stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {index !== null && series.map(s => (
            <span key={s.label} aria-hidden style={{
              position: 'absolute', pointerEvents: 'none',
              left: `${(index / w) * 100}%`, top: toY(s.values[index]),
              width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%',
              background: s.color, border: '2px solid #0a0818', boxSizing: 'content-box',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingLeft: 34, color: FAINT, fontSize: 10.5 }}>
        <span>{formatDate(times[0])}</span>
        <span>{formatDate(times[n - 1])}</span>
      </div>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5, color: MUTED }}>
      {items.map(it => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 12, height: it.dashed ? 0 : 9, borderRadius: 2, display: 'inline-block',
            background: it.dashed ? 'none' : `linear-gradient(${it.color}, ${it.color}22)`,
            borderTop: it.dashed ? `2px dashed ${it.color}` : `2px solid ${it.color}`,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

const GRID_STYLE: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12,
};

// ─── Composant principal ───────────────────────────────────────────────────
export function PlayerHistoryCharts({ history }: { history: CurrencySnapshot[] }) {
  const [range, setRange] = useState<Range>('all');

  const filtered = useMemo(() => {
    const ms = RANGES.find(r => r.id === range)!.ms;
    if (!Number.isFinite(ms) || history.length === 0) return history;
    const cutoff = history[history.length - 1].t - ms;
    // Garde le point juste avant la fenêtre : il sert de référence au premier delta.
    const first = history.findIndex(h => h.t >= cutoff);
    return first <= 0 ? history : history.slice(first - 1);
  }, [history, range]);

  const coins = useMemo(() => {
    const raw = filtered.map(h => bnToNumber(h.coins));
    // Soldes au-delà de Number.MAX_VALUE : bascule en échelle log10.
    const log = raw.some(v => !Number.isFinite(v));
    const values = log ? filtered.map(h => Math.max(bnLog10(h.coins), 0)) : raw;
    let gained = BN_ZERO, spent = BN_ZERO;
    for (let i = 1; i < filtered.length; i++) {
      const prev = filtered[i - 1].coins, cur = filtered[i].coins;
      const cmp = bnCompare(cur, prev);
      if (cmp > 0) gained = bnAdd(gained, bnSub(cur, prev));
      else if (cmp < 0) spent = bnAdd(spent, bnSub(prev, cur));
    }
    return { values, log, gained: formatNumber(gained), spent: formatNumber(spent) };
  }, [filtered]);

  const gems = useMemo(() => {
    const values = filtered.map(h => h.gems);
    let gained = 0, spent = 0;
    for (let i = 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      if (d > 0) gained += d; else spent -= d;
    }
    return { values, gained, spent };
  }, [filtered]);

  const progression = useMemo(() => {
    const pts = filtered.filter(
      (h): h is CurrencySnapshot & { palier: number; maxPalier: number; prestige: number } =>
        typeof h.palier === 'number' && typeof h.maxPalier === 'number' && typeof h.prestige === 'number',
    );
    // Un seul point : dupliqué pour afficher une montagne plate plutôt que rien.
    return pts.length === 1 ? [pts[0], pts[0]] : pts;
  }, [filtered]);

  if (history.length < 2) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>
        Historique en cours de constitution (un point par sauvegarde, environ toutes les 10 minutes de jeu) — revenir plus tard pour voir les courbes.
      </div>
    );
  }

  const times = filtered.map(h => h.t);
  const fmtInt = (v: number) => Math.round(v).toLocaleString('fr-FR');
  const coinAxis = (v: number) => coins.log ? `1e${Math.round(v)}` : formatNumber(v);

  const progTimes = progression.map(h => h.t);
  const paliers = progression.map(h => h.palier);
  const maxPaliers = progression.map(h => h.maxPalier);
  const prestiges = progression.map(h => h.prestige);
  const prestigeGain = prestiges.length > 0 ? prestiges[prestiges.length - 1] - prestiges[0] : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13.4 }}>⛰️ Historique du joueur</span>
        <div role="group" aria-label="Période affichée" style={{ display: 'inline-flex', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          {RANGES.map(r => (
            <button key={r.id} type="button" onClick={() => setRange(r.id)} aria-pressed={range === r.id}
              style={{
                minWidth: 52, minHeight: 36, padding: '0 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: range === r.id ? 'rgba(251,191,36,0.2)' : 'transparent',
                color: range === r.id ? '#fbbf24' : MUTED,
              }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ color: FAINT, fontSize: 11.5 }}>
        {filtered.length} points · un par sauvegarde (~10 min de jeu). Touchez ou survolez un graphe pour lire un point.
      </div>

      {filtered.length < 2 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Pas de données sur cette période.</div>
      ) : (
        <div style={GRID_STYLE}>
          <MountainChart icon="🪙" label={coins.log ? 'Pixel-Coins (échelle log)' : 'Pixel-Coins'} times={times}
            series={[{ label: 'coins', color: COIN_COLOR, values: coins.values }]}
            summary={<>
              <span style={{ color: GAIN_COLOR, fontWeight: 700 }}>+{coins.gained}</span>
              {' / '}
              <span style={{ color: LOSS_COLOR, fontWeight: 700 }}>-{coins.spent}</span>
            </>}
            readout={i => {
              const prev = i > 0 ? filtered[i - 1].coins : null;
              const cur = filtered[i].coins;
              const cmp = prev ? bnCompare(cur, prev) : 0;
              return <>
                solde <span style={{ color: '#fff' }}>{formatNumber(cur)}</span>
                {prev && <> · <span style={{ color: cmp > 0 ? GAIN_COLOR : cmp < 0 ? LOSS_COLOR : MUTED, fontWeight: 700 }}>
                  {cmp > 0 ? '+' : cmp < 0 ? '-' : '±'}{formatNumber(cmp >= 0 ? bnSub(cur, prev) : bnSub(prev, cur))}
                </span></>}
              </>;
            }}
            formatAxis={coinAxis} />
          <MountainChart icon="💎" label="Neko-Gemmes" times={times}
            series={[{ label: 'gemmes', color: GEM_COLOR, values: gems.values }]}
            summary={<>
              <span style={{ color: GAIN_COLOR, fontWeight: 700 }}>+{fmtInt(gems.gained)}</span>
              {' / '}
              <span style={{ color: LOSS_COLOR, fontWeight: 700 }}>-{fmtInt(gems.spent)}</span>
            </>}
            readout={i => <>
              solde <span style={{ color: '#fff' }}>{fmtInt(gems.values[i])}</span>
              {i > 0 && <> · <DeltaText delta={gems.values[i] - gems.values[i - 1]} format={fmtInt} /></>}
            </>}
            formatAxis={fmtInt} />
        </div>
      )}

      {progression.length < 2 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>
          Paliers / prestiges : aucun point enregistré sur cette période. Un point est ajouté à la prochaine sauvegarde cloud du joueur (à chaque nouveau palier record, ou ~10 min de jeu), puis « Actualiser ».
        </div>
      ) : (
        <div style={GRID_STYLE}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Legend items={[{ color: PALIER_COLOR, label: 'Palier actuel' }, { color: MAX_PALIER_COLOR, label: 'Record', dashed: true }]} />
            <MountainChart icon="🗺️" label="Paliers" times={progTimes}
              series={[
                { label: 'palier', color: PALIER_COLOR, values: paliers },
                { label: 'record', color: MAX_PALIER_COLOR, values: maxPaliers, fill: false },
              ]}
              summary={<>record <span style={{ color: MAX_PALIER_COLOR, fontWeight: 700 }}>{fmtInt(Math.max(...maxPaliers))}</span></>}
              readout={i => <>
                palier <span style={{ color: PALIER_COLOR, fontWeight: 700 }}>{fmtInt(paliers[i])}</span>
                {' '}· record <span style={{ color: MAX_PALIER_COLOR, fontWeight: 700 }}>{fmtInt(maxPaliers[i])}</span>
              </>}
              formatAxis={fmtInt} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <Legend items={[{ color: PRESTIGE_COLOR, label: 'Prestiges effectués' }]} />
            <MountainChart icon="✨" label="Prestiges" times={progTimes}
              series={[{ label: 'prestiges', color: PRESTIGE_COLOR, values: prestiges }]}
              summary={<><span style={{ color: PRESTIGE_COLOR, fontWeight: 700 }}>+{fmtInt(prestigeGain)}</span> sur la période</>}
              readout={i => <>
                prestiges <span style={{ color: PRESTIGE_COLOR, fontWeight: 700 }}>{fmtInt(prestiges[i])}</span>
                {i > 0 && prestiges[i] !== prestiges[i - 1] && <> · <DeltaText delta={prestiges[i] - prestiges[i - 1]} format={fmtInt} /></>}
              </>}
              formatAxis={fmtInt} />
          </div>
        </div>
      )}
    </div>
  );
}
