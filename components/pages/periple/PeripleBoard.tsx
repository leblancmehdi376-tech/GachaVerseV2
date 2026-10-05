'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { PERIPLE_BOARD, TILE_INFO, BOARD_GRID, type TileKind } from '@/lib/game/periple';
import { ChibiPawn, PAWN_RATIO, type PawnChar } from './ChibiPawn';
import { PropDefs, TileProp } from './TileProps';

// Plateau en île flottante. Projection isométrique : la case (r, c) de la
// grille 7×7 a le centre de sa face supérieure en ((c - r)·TW/2, (c + r)·TH/2).
//
// Performances : tout le décor (île, cases, objets) est un SVG statique,
// mémorisé et sans aucune animation interne — le navigateur le rastérise une
// fois pour toutes. Ce qui bouge (pions, dé, portail, surbrillances) vit dans
// des calques HTML séparés, déplacés uniquement par `transform`/`opacity`
// (composités par le GPU, sans relayout ni repaint du plateau).
const TW = 110;          // largeur d'une case (losange)
const TH = 56;           // hauteur d'une case
const DEPTH = 14;        // épaisseur des dalles
const VB = { x: -430, y: -120, w: 860, h: 620 };

function iso(r: number, c: number) {
  return { x: (c - r) * TW / 2, y: (c + r) * TH / 2 };
}

// Losange (face supérieure) centré en (cx, cy), à l'échelle s d'une case.
function diamond(cx: number, cy: number, s: number) {
  const hw = (TW / 2) * s, hh = (TH / 2) * s;
  return { hw, hh, points: `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}` };
}
function slab(cx: number, cy: number, s: number, depth: number) {
  const { hw, hh, points } = diamond(cx, cy, s);
  return {
    top: points,
    left: `${cx - hw},${cy} ${cx},${cy + hh} ${cx},${cy + hh + depth} ${cx - hw},${cy + depth}`,
    right: `${cx},${cy + hh} ${cx + hw},${cy} ${cx + hw},${cy + depth} ${cx},${cy + hh + depth}`,
    rim: `${cx - hw},${cy} ${cx},${cy - hh} ${cx + hw},${cy}`,
  };
}

const TILE_POS = PERIPLE_BOARD.map(t => iso(t.r, t.c));
const DRAW_ORDER = [...PERIPLE_BOARD].sort((a, b) => (a.r + a.c) - (b.r + b.c));
const MID = (BOARD_GRID - 1) / 2;
const CENTER = iso(MID, MID);
const ISLAND = slab(CENTER.x, CENTER.y, BOARD_GRID + 0.4, 28);
const ISLAND_D = diamond(CENTER.x, CENTER.y, BOARD_GRID + 0.4);
const TRACK_OUT = diamond(CENTER.x, CENTER.y, BOARD_GRID + 0.1);
const TRACK_IN = diamond(CENTER.x, CENTER.y, BOARD_GRID - 2.1);
const PORTAL_R = 1.7 * TW / 2;

// Dessous rocheux de l'île : contour déchiqueté sous le flanc avant.
const ROCK = (() => {
  const { hw, hh } = ISLAND_D;
  const cx = CENTER.x, cy = CENTER.y + 28;
  const pts: [number, number][] = [[cx - hw, cy], [cx, cy + hh], [cx + hw, cy]];
  const jag = [[0.98, 30], [0.86, 70], [0.78, 82], [0.64, 112], [0.55, 118], [0.42, 150], [0.3, 158], [0.18, 190], [0.06, 214], [-0.04, 226],
    [-0.14, 200], [-0.26, 180], [-0.38, 168], [-0.5, 138], [-0.62, 124], [-0.74, 92], [-0.84, 80], [-0.97, 34]];
  for (const [f, d] of jag) pts.push([cx + f * hw, cy + hh * (1 - Math.abs(f)) + d * 0.55]);
  return pts.map(p => p.join(',')).join(' ');
})();

// Obélisques aux coins de la cour intérieure, un cristal par couleur de genre.
const OBELISKS = [
  { r: 1.2, c: 1.2, color: '#c084fc' }, { r: 1.2, c: 4.8, color: '#60a5fa' },
  { r: 4.8, c: 1.2, color: '#34d399' }, { r: 4.8, c: 4.8, color: '#fb923c' },
].map(o => ({ ...iso(o.r, o.c), color: o.color })).sort((a, b) => a.y - b.y);

const STARS = Array.from({ length: 46 }, (_, i) => ({
  x: VB.x + ((i * 197) % VB.w), y: VB.y + ((i * 113) % VB.h), r: i % 5 === 0 ? 2 : 1.1, o: 0.2 + (i % 4) * 0.12,
}));

// ─── Décor statique (rendu une seule fois) ───────────────────────────────────
const StaticBoard = memo(function StaticBoard({ onSelect }: { onSelect: (i: number) => void }) {
  const kinds = Object.keys(TILE_INFO) as TileKind[];
  return (
    <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} aria-label="Plateau du Grand Périple"
      onClick={e => {
        const el = (e.target as Element).closest('[data-tile]');
        if (el) onSelect(Number(el.getAttribute('data-tile')));
      }}>
      <defs>
        <PropDefs />
        {kinds.map(k => (
          <linearGradient key={k} id={`pp-top-${k}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="30%" stopColor={TILE_INFO[k].top} />
            <stop offset="100%" stopColor={TILE_INFO[k].side} />
          </linearGradient>
        ))}
        <radialGradient id="pp-inset" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </radialGradient>
        <radialGradient id="pp-portal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fdf4ff" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#e879f9" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pp-crystal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pp-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b3fb0" />
          <stop offset=".55" stopColor="#3a2585" />
          <stop offset="1" stopColor="#24175c" />
        </linearGradient>
        <linearGradient id="pp-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#47237f" />
          <stop offset=".6" stopColor="#24124b" />
          <stop offset="1" stopColor="#0f0828" />
        </linearGradient>
      </defs>

      {/* Étoiles et îlots lointains */}
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}
      {[{ x: -370, y: 400, s: 0.8 }, { x: 360, y: 20, s: 0.6 }, { x: 330, y: 430, s: 0.5 }].map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
          <path d="M-40 0 L0 -18 L40 0 L0 18 Z" fill="#4c34a0" />
          <path d="M-40 0 L0 18 L40 0 L22 26 L6 50 L-10 34 L-28 18 Z" fill="url(#pp-rock)" />
          <path d="M-6 -6 l4 -12 l4 12 z" fill="#67e8f9" opacity=".9" />
        </g>
      ))}

      {/* ── Île ── */}
      <polygon points={ROCK} fill="url(#pp-rock)" />
      {/* Veines de cristal (halo = trait large translucide, sans filtre de flou) */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M-250 250 L-210 300 L-170 315 L-120 360" stroke="#22d3ee" strokeOpacity=".25" strokeWidth="9" />
        <path d="M-250 250 L-210 300 L-170 315 L-120 360" stroke="#a5f3fc" strokeWidth="1.6" />
        <path d="M260 250 L220 290 L190 320 L140 352" stroke="#e879f9" strokeOpacity=".25" strokeWidth="9" />
        <path d="M260 250 L220 290 L190 320 L140 352" stroke="#f5d0fe" strokeWidth="1.6" />
      </g>
      {[[-10, 430, '#67e8f9'], [30, 410, '#e879f9'], [-60, 400, '#c4b5fd'], [80, 382, '#67e8f9']].map(([x, y, c], i) => (
        <path key={i} d={`M${x} ${y} l7 0 l-3.5 ${22 - i * 3} z`} fill={c as string} opacity=".9" />
      ))}
      <polygon points={ISLAND.left} fill="#4c2a96" />
      <polygon points={ISLAND.right} fill="#341a72" />
      <polyline points={`${CENTER.x - ISLAND_D.hw},${CENTER.y + 3} ${CENTER.x},${CENTER.y + ISLAND_D.hh + 3} ${CENTER.x + ISLAND_D.hw},${CENTER.y + 3}`} fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinejoin="round" />
      <polygon points={ISLAND.top} fill="url(#pp-ground)" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="2" />
      {/* Lit de la piste */}
      <path d={`M${TRACK_OUT.points.split(' ').join(' L')} Z M${TRACK_IN.points.split(' ').join(' L')} Z`} fillRule="evenodd" fill="#1a0f45" stroke="#7c3aed" strokeOpacity="0.5" strokeWidth="2" transform="translate(0 6)" />

      {/* Cour intérieure : socle du portail (l'anneau tournant est un calque à part) */}
      <ellipse cx={CENTER.x} cy={CENTER.y} rx={PORTAL_R} ry={PORTAL_R * TH / TW} fill="url(#pp-portal)" />
      <ellipse cx={CENTER.x} cy={CENTER.y} rx={PORTAL_R * 1.08} ry={PORTAL_R * 1.08 * TH / TW} fill="none" stroke="#c4b5fd" strokeWidth="5" strokeOpacity="0.7" />
      {OBELISKS.map((o, i) => (
        <g key={i} transform={`translate(${o.x} ${o.y})`}>
          <ellipse rx="16" ry="6" fill="#000" opacity=".3" />
          <path d="M-9 0 L-6 -34 L0 -40 L6 -34 L9 0 Z" fill="#4c3a8f" stroke="#1b1037" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M0 -40 L6 -34 L9 0 L0 3 Z" fill="#2e2266" />
          <circle cx="0" cy="-55" r="15" fill={o.color} opacity=".3" />
          <circle cx="0" cy="-55" r="10" fill="url(#pp-crystal-glow)" />
          <path d="M0 -66 L7 -55 L0 -44 L-7 -55 Z" fill={o.color} stroke="#1b1037" strokeWidth="1.4" />
          <path d="M0 -66 L7 -55 L0 -55 Z" fill="#fff" opacity=".55" />
        </g>
      ))}

      {/* Cases */}
      {DRAW_ORDER.map(t => {
        const p = TILE_POS[t.index];
        const info = TILE_INFO[t.kind];
        const s = slab(p.x, p.y, 0.92, DEPTH);
        return (
          <g key={t.index} className="pp-tile" data-tile={t.index} role="button" aria-label={info.label}>
            <polygon points={s.left} fill={info.side} stroke="#1b1037" strokeWidth="1.2" strokeLinejoin="round" />
            <polygon points={s.right} fill={info.side} fillOpacity="0.72" stroke="#1b1037" strokeWidth="1.2" strokeLinejoin="round" />
            <polygon points={s.right} fill="#000" fillOpacity="0.28" />
            <polygon points={s.top} fill={`url(#pp-top-${t.kind})`} stroke="#1b1037" strokeWidth="1.4" strokeLinejoin="round" />
            <polygon points={diamond(p.x, p.y, 0.62).points} fill="url(#pp-inset)" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.4" />
            <polyline points={slab(p.x, p.y, 0.84, 0).rim} fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
            <g transform={`translate(${p.x} ${p.y + 6})`}>
              <TileProp kind={t.kind} />
            </g>
          </g>
        );
      })}
    </svg>
  );
});

// ─── Dé ─────────────────────────────────────────────────────────────────────
// Faces d'un dé : positions (0–8) des points dans la grille 3×3.
const DIE_PIPS: Record<number, number[]> = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

export type DieState = 'hidden' | 'rolling' | 'landed';

// Le défilement des faces pendant le lancer ne re-rend que ce composant.
const BoardDie = memo(function BoardDie({ state, face, size, x, y }: { state: DieState; face: number; size: number; x: number; y: number }) {
  const [spin, setSpin] = useState(1);
  useEffect(() => {
    if (state !== 'rolling') return;
    const id = setInterval(() => setSpin(1 + Math.floor(Math.random() * 6)), 90);
    return () => clearInterval(id);
  }, [state]);
  if (state === 'hidden') return null;
  const shown = state === 'rolling' ? spin : face;
  return (
    <div className="pp-die-pos" style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}>
      <div key={state === 'landed' ? `l${face}` : 'r'} className={`pp-die ${state === 'rolling' ? 'is-rolling' : 'is-landed'}`}
        style={{ width: size, height: size, padding: size * 0.14 }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="pp-die__pip" style={{ visibility: DIE_PIPS[shown]?.includes(i) ? 'visible' : 'hidden' }} />
        ))}
      </div>
    </div>
  );
});

// ─── Pion ───────────────────────────────────────────────────────────────────
// Position par transform (transition composité) ; le saut est rejoué à
// chaque case via l'API Web Animations, sans remonter le pion ni son image.
const Pawn = memo(function Pawn({ char, size, x, y, z, hopKey, delay, leader }: {
  char: PawnChar | null; size: number; x: number; y: number; z: number; hopKey: number; delay: number; leader: boolean;
}) {
  const hopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hopKey === 0 || !hopRef.current?.animate) return;
    hopRef.current.animate([
      { transform: 'translateY(0) scale(1, 1)' },
      { transform: 'translateY(-30%) scale(0.95, 1.06)', offset: 0.45 },
      { transform: 'translateY(0) scale(1.06, 0.94)' },
    ], { duration: 240, delay, easing: 'ease-out' });
  }, [hopKey, delay]);
  return (
    <div className="pp-pawn" style={{ transform: `translate3d(${x}px, ${y}px, 0)`, zIndex: z }}>
      <div className="pp-pawn__anchor">
        <div ref={hopRef}>
          <div className="pp-pawn__bob pp-loop" style={{ animationDelay: `${delay * 6}ms` }}>
            {leader && <div className="pp-marker pp-loop" aria-hidden />}
            <ChibiPawn char={char} size={size} />
          </div>
        </div>
      </div>
    </div>
  );
});

// Losange de surbrillance (case du pion / case sélectionnée).
function TileRing({ x, y, w, h, color, pulse }: { x: number; y: number; w: number; h: number; color: string; pulse?: boolean }) {
  return (
    <div className="pp-ring-pos" style={{ transform: `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)` }}>
      <svg width={w} height={h} viewBox="-55 -28 110 56" className={pulse ? 'pp-ring pp-loop' : 'pp-ring'} aria-hidden>
        <polygon points="0,-26 53,0 0,26 -53,0" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="3.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

interface Props {
  pos: number;
  hopKey: number;
  team: PawnChar[];
  dieFace: number;
  dieState: DieState;
  selected: number | null;
  onSelect: (index: number) => void;
}

export const PeripleBoard = memo(function PeripleBoard({ pos, hopKey, team, dieFace, dieState, selected, onSelect }: Props) {
  // Largeur rendue du plateau → positions et tailles des calques en px.
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const k = width / VB.w;
  const px = (p: { x: number; y: number }) => ({ x: (p.x - VB.x) * k, y: (p.y - VB.y) * k });

  const anchor = TILE_POS[pos];
  const pawnW = Math.max(30, 46 * k);
  const offsets = [{ dx: 0, dy: 7, s: 1 }, { dx: -21, dy: -3, s: 0.82 }, { dx: 21, dy: -3, s: 0.82 }];
  const members: (PawnChar | null)[] = team.length > 0 ? team.slice(0, 3) : [null];
  const center = px(CENTER);
  const portalW = PORTAL_R * 2 * k * 0.86;
  const ringW = TW * 1.08 * k, ringH = TH * 1.08 * k;

  return (
    <div ref={ref} className="pp-board" style={{ aspectRatio: `${VB.w} / ${VB.h}` }}>
      <StaticBoard onSelect={onSelect} />
      {width > 0 && (
        <div className="pp-board-layers">
          {/* Anneau du portail : cercle tournant aplati en ellipse (composité) */}
          <div className="pp-portal-pos" style={{ transform: `translate3d(${center.x - portalW / 2}px, ${center.y - portalW * TH / TW / 2}px, 0)`, width: portalW, height: portalW * TH / TW }}>
            <div className="pp-portal-flat">
              <svg viewBox="-50 -50 100 100" width={portalW} height={portalW} className="pp-portal-spin pp-loop" aria-hidden>
                <circle r="46" fill="none" stroke="#f0abfc" strokeOpacity=".6" strokeWidth="2" strokeDasharray="12 9" />
                <circle r="30" fill="none" stroke="#f5d0fe" strokeOpacity=".5" strokeWidth="2" strokeDasharray="8 8" />
              </svg>
            </div>
          </div>

          {selected !== null && selected !== pos && (() => { const p = px(TILE_POS[selected]); return <TileRing x={p.x} y={p.y} w={ringW} h={ringH} color="#ffffff" />; })()}
          {(() => { const p = px(anchor); return <TileRing x={p.x} y={p.y} w={ringW} h={ringH} color="#fde68a" pulse />; })()}

          <BoardDie state={dieState} face={dieFace} size={Math.max(36, 58 * k)} x={center.x} y={center.y - 18 * k} />

          {/* Pions de l'équipe (les plus en arrière d'abord) */}
          {members.map((char, i) => ({ char, i })).reverse().map(({ char, i }) => {
            const o = offsets[i];
            const p = px({ x: anchor.x + o.dx, y: anchor.y + o.dy });
            const w = pawnW * o.s;
            return (
              <Pawn key={i} char={char} size={w} x={p.x} y={p.y + w * PAWN_RATIO * 0.06} z={i === 0 ? 3 : 2}
                hopKey={hopKey} delay={i * 40} leader={i === 0} />
            );
          })}
        </div>
      )}
    </div>
  );
});
