'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BN_ZERO, bnAdd, bnCompare, bnLog10, bnPow, bnSub, bnToNumber } from '@/lib/game/bignum';
import { formatNumber } from '@/lib/game/format';
import type { CurrencySnapshot } from '@/store/gameStore.types';
import { Segmented, cx } from './ui';

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
// Les SVG s'étirent sur toute la largeur ET la hauteur de leur zone (viewBox
// en unités "index de point" × VIEW_H, preserveAspectRatio="none") : pas de
// scroll horizontal sur mobile, et la même courbe sert en vignette comme en
// plein écran. La sélection d'un point se fait par position du pointeur
// (souris ET tactile). Le point sélectionné est un <div> superposé, placé en
// pourcentages (un cercle SVG serait déformé par l'étirement).
//
// Un clic (ou Entrée) sur une vignette l'ouvre en grand dans une modale, où
// l'on peut parcourir les points plus finement et passer d'un graphe à l'autre.

type Range = '24h' | '3j' | 'all';
const RANGES: { id: Range; label: string; ms: number }[] = [
  { id: '24h', label: '24 h', ms: 24 * 3600_000 },
  { id: '3j', label: '3 j', ms: 3 * 24 * 3600_000 },
  { id: 'all', label: 'Tout', ms: Infinity },
];

type Scale = 'log' | 'linear';
const SCALES: { id: Scale; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'linear', label: 'Linéaire' },
];

const GAIN_COLOR = '#4ade80';
const LOSS_COLOR = '#f87171';
const COIN_COLOR = '#fbbf24';
const GEM_COLOR = '#22d3ee';
const PALIER_COLOR = '#60a5fa';
const MAX_PALIER_COLOR = '#f472b6';
const PRESTIGE_COLOR = '#c084fc';
const MUTED = 'rgba(255,255,255,0.8)';
const VIEW_H = 100;   // hauteur du viewBox (unités arbitraires, étirées)
const PAD_TOP = 6;
// Au-delà de ce déplacement (px) entre appui et relâché, un clic sur la
// vignette est un glissé de lecture, pas une demande d'agrandissement.
const CLICK_SLOP = 6;

function formatDate(t: number): string {
  return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// `count` index répartis régulièrement de 0 à n-1 (sans doublon).
function spreadIndices(n: number, count: number): number[] {
  if (n <= 1) return [0];
  const out = new Set<number>();
  for (let k = 0; k < count; k++) out.add(Math.round((k / (count - 1)) * (n - 1)));
  return [...out];
}

function DeltaText({ delta, format }: { delta: number | null; format: (n: number) => string }) {
  if (delta === null) return null;
  const color = delta > 0 ? GAIN_COLOR : delta < 0 ? LOSS_COLOR : MUTED;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '±';
  return <span style={{ color, fontWeight: 700 }}>{sign}{format(Math.abs(delta))}</span>;
}

// ─── Sélection d'un point à la position du pointeur ────────────────────────
function usePointerIndex(count: number, onActivate?: () => void) {
  const ref = useRef<SVGSVGElement>(null);
  const downX = useRef<number | null>(null);
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
    onPointerDown: (e: React.PointerEvent) => { downX.current = e.clientX; update(e.clientX); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setIndex(null); },
    onClick: (e: React.MouseEvent) => {
      if (!onActivate) return;
      const moved = downX.current === null ? 0 : Math.abs(e.clientX - downX.current);
      downX.current = null;
      if (moved <= CLICK_SLOP) onActivate();
    },
    // Navigation clavier : flèches pour parcourir les points, Entrée pour agrandir.
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (onActivate && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onActivate(); return; }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      setIndex(i => {
        const cur = i ?? count - 1;
        return Math.min(Math.max(cur + (e.key === 'ArrowRight' ? 1 : -1), 0), count - 1);
      });
    },
    onBlur: () => setIndex(null),
  };
  return { ref, index, handlers };
}

// ─── Montagne : une ou plusieurs séries en aires dégradées ─────────────────
interface Series {
  label: string;
  color: string;
  values: number[];   // valeurs tracées (éventuellement en log10)
  fill?: boolean;     // false = simple crête en pointillés (ex : record)
}

interface LegendItem { color: string; label: string; dashed?: boolean }

interface ChartDef {
  id: string;
  icon: string;
  label: string;
  legend?: LegendItem[];
  times: number[];
  series: Series[];
  summary: React.ReactNode;
  readout: (index: number) => React.ReactNode;
  formatAxis: (v: number) => string;
  alreadyLog?: boolean;   // valeurs déjà en log10 : pas de seconde transformation
}

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm text-white/80">
      {items.map(it => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
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

// Graduations de l'axe vertical, dans l'espace tracé (log10 en échelle log).
// En log, sur au moins deux ordres de grandeur, on gradue sur les puissances
// de 10 (1, 10, 100, 1K…) — bien plus lisible que des valeurs intermédiaires
// comme 3 162. Sinon, graduations régulières de hi à lo.
function axisTicksFor(lo: number, hi: number, count: number, log: boolean): number[] {
  if (log && hi - lo >= 2) {
    const exps: number[] = [];
    for (let e = Math.ceil(lo); e <= Math.floor(hi); e++) exps.push(e);
    const step = Math.ceil(exps.length / count);
    const picked = exps.filter((_, i) => (exps.length - 1 - i) % step === 0).reverse();
    if (picked.length >= 2) return picked;
  }
  return Array.from({ length: count }, (_, k) => hi - (k / (count - 1)) * (hi - lo));
}

function MountainChart({ chart, log, expanded = false, onExpand }: {
  chart: ChartDef;
  log: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const { icon, label, legend, times, series, summary, readout, formatAxis } = chart;
  const gradientId = useId();
  const { ref, index, handlers } = usePointerIndex(times.length, expanded ? undefined : onExpand);
  const n = times.length;
  const w = Math.max(n - 1, 1);
  // Échelle log : on trace log10(valeur), 0 étant ramené à 1 (pied de l'axe).
  // Les séries déjà en log10 (coins au-delà de Number.MAX_VALUE) restent telles quelles.
  const useLog = log && !chart.alreadyLog;
  const plot = (v: number) => useLog ? Math.log10(Math.max(v, 1)) : v;
  const unplot = (p: number) => useLog ? 10 ** p : p;
  const all = series.flatMap(s => s.values.map(plot));
  const min = Math.min(...all);
  const max = Math.max(...all);
  // Pied de la montagne : 0 pour les petites valeurs (prestige, palier bas),
  // sinon un peu sous le minimum pour que les reliefs restent lisibles.
  const lo = min <= 5 ? 0 : min - (max - min) * 0.15;
  const hi = max === lo ? lo + 1 : max;
  const yOf = (p: number) => PAD_TOP + (1 - (p - lo) / (hi - lo)) * (VIEW_H - PAD_TOP);
  const toY = (v: number) => yOf(plot(v));
  const shown = index ?? n - 1;

  // En grand : dès l'ouverture, le focus va sur le graphe pour que les
  // flèches parcourent directement les points.
  useEffect(() => { if (expanded) ref.current?.focus(); }, [expanded, ref]);

  const axisValues = axisTicksFor(lo, hi, expanded ? 6 : 3, useLog);
  const dateTicks = spreadIndices(n, expanded ? 5 : 2);
  const plotHeight = expanded ? 'clamp(220px, 58vh, 620px)' : 130;

  return (
    <div className={cx(
      'group min-w-0 rounded-xl border bg-black/25 transition-colors',
      expanded ? 'border-transparent p-0' : 'border-white/15 p-3 hover:border-white/20',
    )}>
      {!expanded && (
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-white">{icon} {label}</div>
            <div className="text-sm text-white/80">{summary}</div>
          </div>
          <button type="button" onClick={onExpand} aria-label={`Agrandir le graphe ${label}`} title="Agrandir"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white group-hover:text-white/85">
            ⤢
          </button>
        </div>
      )}
      {legend && <div className={expanded ? 'mb-2' : 'mb-1.5'}><Legend items={legend} /></div>}
      <div className={cx('mb-2 min-h-4 text-white/80', expanded ? 'text-base' : 'text-sm')}>
        <span className="text-white/70">{index !== null ? formatDate(times[shown]) : 'Dernier point'}</span> · {readout(shown)}
      </div>
      <div className="flex gap-1.5">
        {/* Libellés placés à la hauteur exacte de leur graduation (en log,
            les puissances de 10 ne sont pas régulièrement espacées). */}
        <div className="relative shrink-0 text-sm tabular-nums text-white/65" style={{ height: plotHeight, minWidth: 56 }}>
          {axisValues.map(p => {
            const pct = (yOf(p) / VIEW_H) * 100;
            const shift = pct < 8 ? 'translate-y-0' : pct > 92 ? '-translate-y-full' : '-translate-y-1/2';
            return (
              <span key={p} className={cx('absolute right-0 whitespace-nowrap leading-none', shift)} style={{ top: `${pct}%` }}>
                {formatAxis(unplot(p))}
              </span>
            );
          })}
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-white/15 bg-[#0a0818]" style={{ height: plotHeight }}>
          <svg
            {...handlers}
            role="img"
            aria-label={expanded
              ? `${label} au fil du temps. Flèches gauche/droite pour parcourir les points.`
              : `${label} au fil du temps. Entrée pour agrandir, flèches gauche/droite pour parcourir les points.`}
            width="100%" height="100%"
            viewBox={`0 0 ${w} ${VIEW_H}`} preserveAspectRatio="none"
            className={cx('block outline-none', expanded ? 'cursor-crosshair' : 'cursor-zoom-in')}
            style={{ touchAction: 'pan-y' }}
          >
            <defs>
              {series.map((s, si) => (
                <linearGradient key={si} id={`${gradientId}-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            {axisValues.map(p => (
              <line key={p} x1={0} y1={yOf(p)} x2={w} y2={yOf(p)}
                stroke="rgba(255,255,255,0.12)" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s, si) => {
              const pts = s.values.map((v, i) => `${i} ${toY(v)}`);
              const ridge = `M${pts.join(' L')}`;
              return (
                <g key={s.label}>
                  {s.fill !== false && (
                    <path d={`${ridge} L${w} ${VIEW_H} L0 ${VIEW_H} Z`} fill={`url(#${gradientId}-${si})`} />
                  )}
                  <path d={ridge} fill="none" stroke={s.color} strokeWidth={(s.fill === false ? 1.5 : 2) + (expanded ? 0.5 : 0)}
                    strokeDasharray={s.fill === false ? '4 3' : undefined}
                    vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </g>
              );
            })}
            {index !== null && (
              <line x1={index} y1={0} x2={index} y2={VIEW_H}
                stroke="rgba(255,255,255,0.6)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {index !== null && series.map(s => (
            <span key={s.label} aria-hidden style={{
              position: 'absolute', pointerEvents: 'none',
              left: `${(index / w) * 100}%`, top: `${(toY(s.values[index]) / VIEW_H) * 100}%`,
              width: 9, height: 9, marginLeft: -4.5, marginTop: -4.5, borderRadius: '50%',
              background: s.color, border: '2px solid #0a0818', boxSizing: 'content-box',
            }} />
          ))}
        </div>
      </div>
      <div className="relative mt-1 h-5 text-sm tabular-nums text-white/65" style={{ marginLeft: 62 }}>
        {dateTicks.map((i, k) => {
          const pct = (i / w) * 100;
          const align = k === 0 ? 'translate-x-0' : k === dateTicks.length - 1 ? '-translate-x-full' : '-translate-x-1/2';
          return (
            <span key={i} className={cx('absolute top-0 whitespace-nowrap', align, k !== 0 && k !== dateTicks.length - 1 && 'hidden md:inline')} style={{ left: `${pct}%` }}>
              {formatDate(times[i])}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modale plein écran ────────────────────────────────────────────────────
function ChartModal({ charts, activeId, onSelect, onClose, range, onRange, scale, onScale, pointCount }: {
  charts: ChartDef[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  range: Range;
  onRange: (r: Range) => void;
  scale: Scale;
  onScale: (s: Scale) => void;
  pointCount: number;
}) {
  const chart = charts.find(c => c.id === activeId) ?? charts[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!chart) return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-[#030208]/85 p-2 font-(family-name:--f-ui) backdrop-blur-sm sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Graphe ${chart.label}`}
        onClick={e => e.stopPropagation()}
        className="flex max-h-[96vh] w-full max-w-6xl flex-col gap-3 overflow-y-auto rounded-2xl border border-white/20 bg-[#0f0c20] p-3 shadow-2xl sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-white sm:text-xl">{chart.icon} {chart.label}</div>
            <div className="text-sm text-white/80">{chart.summary}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-2xl text-white/75 hover:bg-white/10 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented label="Graphe affiché" value={chart.id} tone="cyan"
            options={charts.map(c => ({ id: c.id, label: `${c.icon} ${c.label}` }))}
            onChange={onSelect} />
          <div className="flex flex-wrap gap-2">
            <Segmented label="Période affichée" value={range} tone="amber"
              options={RANGES.map(r => ({ id: r.id, label: r.label }))} onChange={onRange} />
            <Segmented label="Échelle verticale" value={scale} tone="purple" options={SCALES} onChange={onScale} />
          </div>
        </div>

        <MountainChart key={chart.id} chart={chart} log={scale === 'log'} expanded />

        <div className="text-sm text-white/65">
          {pointCount} points · survolez, touchez ou utilisez ← → pour lire un point · Échap pour fermer.
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Composant principal ───────────────────────────────────────────────────
export function PlayerHistoryCharts({ history }: { history: CurrencySnapshot[] }) {
  const [range, setRange] = useState<Range>('all');
  // Log par défaut : les soldes grimpent de plusieurs ordres de grandeur, en
  // linéaire tout le début de partie serait écrasé au pied du graphe.
  const [scale, setScale] = useState<Scale>('log');
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      <div className="text-sm text-white/70">
        Historique en cours de constitution (un point par sauvegarde, environ toutes les 10 minutes de jeu) — revenir plus tard pour voir les courbes.
      </div>
    );
  }

  const times = filtered.map(h => h.t);
  const fmtInt = (v: number) => Math.round(v).toLocaleString('fr-FR');
  // Gemmes et coins suivent la notation choisie dans les Paramètres (formatNumber).
  const fmtNum = (v: number) => formatNumber(Math.round(v));
  const coinAxis = (v: number) => coins.log ? formatNumber(bnPow(10, Math.round(v))) : formatNumber(v);

  const progTimes = progression.map(h => h.t);
  const paliers = progression.map(h => h.palier);
  const maxPaliers = progression.map(h => h.maxPalier);
  const prestiges = progression.map(h => h.prestige);
  const prestigeGain = prestiges.length > 0 ? prestiges[prestiges.length - 1] - prestiges[0] : 0;

  const currencyCharts: ChartDef[] = filtered.length < 2 ? [] : [
    {
      id: 'coins', icon: '🪙', label: coins.log ? 'Pixel-Coins (échelle log)' : 'Pixel-Coins', times,
      series: [{ label: 'coins', color: COIN_COLOR, values: coins.values }],
      summary: <>
        <span style={{ color: GAIN_COLOR, fontWeight: 700 }}>+{coins.gained}</span>
        {' / '}
        <span style={{ color: LOSS_COLOR, fontWeight: 700 }}>-{coins.spent}</span>
      </>,
      readout: i => {
        const prev = i > 0 ? filtered[i - 1].coins : null;
        const cur = filtered[i].coins;
        const cmp = prev ? bnCompare(cur, prev) : 0;
        return <>
          solde <span style={{ color: '#fff' }}>{formatNumber(cur)}</span>
          {prev && <> · <span style={{ color: cmp > 0 ? GAIN_COLOR : cmp < 0 ? LOSS_COLOR : MUTED, fontWeight: 700 }}>
            {cmp > 0 ? '+' : cmp < 0 ? '-' : '±'}{formatNumber(cmp >= 0 ? bnSub(cur, prev) : bnSub(prev, cur))}
          </span></>}
        </>;
      },
      formatAxis: coinAxis,
      alreadyLog: coins.log,
    },
    {
      id: 'gems', icon: '💎', label: 'Neko-Gemmes', times,
      series: [{ label: 'gemmes', color: GEM_COLOR, values: gems.values }],
      summary: <>
        <span style={{ color: GAIN_COLOR, fontWeight: 700 }}>+{fmtNum(gems.gained)}</span>
        {' / '}
        <span style={{ color: LOSS_COLOR, fontWeight: 700 }}>-{fmtNum(gems.spent)}</span>
      </>,
      readout: i => <>
        solde <span style={{ color: '#fff' }}>{fmtNum(gems.values[i])}</span>
        {i > 0 && <> · <DeltaText delta={gems.values[i] - gems.values[i - 1]} format={fmtNum} /></>}
      </>,
      formatAxis: fmtNum,
    },
  ];

  const progressionCharts: ChartDef[] = progression.length < 2 ? [] : [
    {
      id: 'paliers', icon: '🗺️', label: 'Paliers', times: progTimes,
      legend: [{ color: PALIER_COLOR, label: 'Palier actuel' }, { color: MAX_PALIER_COLOR, label: 'Record', dashed: true }],
      series: [
        { label: 'palier', color: PALIER_COLOR, values: paliers },
        { label: 'record', color: MAX_PALIER_COLOR, values: maxPaliers, fill: false },
      ],
      summary: <>record <span style={{ color: MAX_PALIER_COLOR, fontWeight: 700 }}>{fmtInt(Math.max(...maxPaliers))}</span></>,
      readout: i => <>
        palier <span style={{ color: PALIER_COLOR, fontWeight: 700 }}>{fmtInt(paliers[i])}</span>
        {' '}· record <span style={{ color: MAX_PALIER_COLOR, fontWeight: 700 }}>{fmtInt(maxPaliers[i])}</span>
      </>,
      formatAxis: fmtInt,
    },
    {
      id: 'prestiges', icon: '✨', label: 'Prestiges', times: progTimes,
      legend: [{ color: PRESTIGE_COLOR, label: 'Prestiges effectués' }],
      series: [{ label: 'prestiges', color: PRESTIGE_COLOR, values: prestiges }],
      summary: <><span style={{ color: PRESTIGE_COLOR, fontWeight: 700 }}>+{fmtInt(prestigeGain)}</span> sur la période</>,
      readout: i => <>
        prestiges <span style={{ color: PRESTIGE_COLOR, fontWeight: 700 }}>{fmtInt(prestiges[i])}</span>
        {i > 0 && prestiges[i] !== prestiges[i - 1] && <> · <DeltaText delta={prestiges[i] - prestiges[i - 1]} format={fmtInt} /></>}
      </>,
      formatAxis: fmtInt,
    },
  ];

  const allCharts = [...currencyCharts, ...progressionCharts];
  const grid = 'grid grid-cols-1 gap-3 md:grid-cols-2';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-bold text-white">⛰️ Historique du joueur</div>
          <div className="text-sm text-white/70">
            {filtered.length} points · un par sauvegarde (~10 min de jeu). Survolez ou glissez pour lire un point, cliquez pour agrandir.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented label="Période affichée" value={range} tone="amber"
            options={RANGES.map(r => ({ id: r.id, label: r.label }))} onChange={setRange} />
          <Segmented label="Échelle verticale" value={scale} tone="purple" options={SCALES} onChange={setScale} />
        </div>
      </div>

      {currencyCharts.length === 0 ? (
        <div className="text-sm text-white/70">Pas de données sur cette période.</div>
      ) : (
        <div className={grid}>
          {currencyCharts.map(c => <MountainChart key={c.id} chart={c} log={scale === 'log'} onExpand={() => setExpandedId(c.id)} />)}
        </div>
      )}

      {progressionCharts.length === 0 ? (
        <div className="text-sm text-white/70">
          Paliers / prestiges : aucun point enregistré sur cette période. Un point est ajouté à la prochaine sauvegarde cloud du joueur (à chaque nouveau palier record, ou ~10 min de jeu), puis « Actualiser ».
        </div>
      ) : (
        <div className={grid}>
          {progressionCharts.map(c => <MountainChart key={c.id} chart={c} log={scale === 'log'} onExpand={() => setExpandedId(c.id)} />)}
        </div>
      )}

      {expandedId !== null && allCharts.length > 0 && (
        <ChartModal
          charts={allCharts}
          activeId={expandedId}
          onSelect={setExpandedId}
          onClose={() => setExpandedId(null)}
          range={range}
          onRange={setRange}
          scale={scale}
          onScale={setScale}
          pointCount={filtered.length}
        />
      )}
    </div>
  );
}
