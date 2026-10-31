'use client';
import { memo, useEffect, useRef } from 'react';
import { PLINKO_ROWS, PLINKO_SLOTS, PLINKO_SLOT_COUNT, PLINKO_REWARD_ICON, type PlinkoUpgradeLevels, plinkoSlotReward } from '@/lib/game/plinko';

// Plateau en triangle : la rangée r compte r+1 picots, la bille touche un
// picot par rangée et part à gauche ou à droite. Après les 14 rangées, elle
// tombe dans l'une des 15 cases. Le trajet est fourni par le store (déjà
// tiré et crédité) : ce composant ne fait que l'animer.

const D = 40;                 // écart entre deux picots (et largeur d'une case)
const PAD = 10;
const W = PLINKO_SLOT_COUNT * D + PAD * 2;
const TOP = 40;
const ROW_H = 32;
const H = TOP + PLINKO_ROWS * ROW_H + 14;
const PEG_R = 4.5;
const BALL_R = 9;

const pegX = (row: number, j: number) => W / 2 + (j - row / 2) * D;
const pegY = (row: number) => TOP + row * ROW_H;

const PEGS = Array.from({ length: PLINKO_ROWS }, (_, r) => Array.from({ length: r + 1 }, (_, j) => ({ r, j, x: pegX(r, j), y: pegY(r) }))).flat();

const RARE_KINDS = new Set(['booster', 'goldBooster', 'chestEpic']);

export interface PlinkoDrop { key: number; path: boolean[]; slot: number }

/** Points de contact de la bille, du haut du plateau jusqu'à sa case. */
function dropPoints(path: boolean[]): { x: number; y: number; peg?: string }[] {
  const pts: { x: number; y: number; peg?: string }[] = [{ x: W / 2, y: 0 }];
  let k = 0;
  for (let r = 0; r < PLINKO_ROWS; r++) {
    pts.push({ x: pegX(r, k), y: pegY(r) - PEG_R - BALL_R + 2, peg: `${r}-${k}` });
    if (path[r]) k++;
  }
  pts.push({ x: W / 2 + (k - (PLINKO_SLOT_COUNT - 1) / 2) * D, y: H + BALL_R });
  return pts;
}

export const PlinkoBoard = memo(function PlinkoBoard({ drop, levels, landed, selected, onLanded, onSelect }: {
  drop: PlinkoDrop | null;
  levels: PlinkoUpgradeLevels;
  landed: number | null;               // case mise en avant après la chute
  selected: number | null;             // case touchée pour voir son détail
  onLanded: (key: number) => void;
  onSelect: (slot: number) => void;
}) {
  const ballRef = useRef<SVGCircleElement>(null);
  const pegRefs = useRef(new Map<string, SVGCircleElement>());
  const onLandedRef = useRef(onLanded);
  useEffect(() => { onLandedRef.current = onLanded; });

  useEffect(() => {
    const ball = ballRef.current;
    if (!drop || !ball) return;
    const pts = dropPoints(drop.path);
    const fast = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-lowfx');
    const speed = fast ? 0.45 : 1;
    // Durée de chaque segment : chute initiale plus longue, puis rebonds de
    // plus en plus rapides (la bille prend de la vitesse).
    const durs = pts.slice(1).map((_, i) => (i === 0 ? 520 : i === pts.length - 2 ? 360 : Math.max(160, 220 - i * 5)) * speed);
    let seg = 0, segStart = performance.now(), raf = 0;
    ball.style.opacity = '1';
    const place = (x: number, y: number) => { ball.setAttribute('cx', String(x)); ball.setAttribute('cy', String(y)); };
    place(pts[0].x, pts[0].y);

    const tick = (now: number) => {
      let t = (now - segStart) / durs[seg];
      while (t >= 1 && seg < durs.length) {
        const hit = pts[seg + 1].peg;
        if (hit) {
          const el = pegRefs.current.get(hit);
          if (el) { el.classList.remove('is-hit'); void el.getBoundingClientRect(); el.classList.add('is-hit'); }
        }
        segStart += durs[seg];
        seg++;
        t = seg < durs.length ? (now - segStart) / durs[seg] : 1;
      }
      if (seg >= durs.length) {
        const end = pts[pts.length - 1];
        place(end.x, end.y);
        ball.style.opacity = '0';
        onLandedRef.current(drop.key);
        return;
      }
      const a = pts[seg], b = pts[seg + 1];
      // x : glissement doux ; y : petit rebond après chaque picot (arc de parabole).
      const ease = t * t * (3 - 2 * t);
      const hop = seg === 0 ? 0 : 12 * 4 * t * (1 - t) * (1 - t);
      place(a.x + (b.x - a.x) * ease, a.y + (b.y - a.y) * t * t - hop);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [drop]);

  return (
    <div className="plk-board">
      <svg viewBox={`0 0 ${W} ${H}`} className="plk-board__svg" aria-hidden>
        <defs>
          <radialGradient id="plk-ball" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="45%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <radialGradient id="plk-peg" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </radialGradient>
        </defs>
        {PEGS.map(p => (
          <circle key={`${p.r}-${p.j}`} ref={el => { if (el) pegRefs.current.set(`${p.r}-${p.j}`, el); }}
            className="plk-peg" cx={p.x} cy={p.y} r={PEG_R} fill="url(#plk-peg)" />
        ))}
        <circle ref={ballRef} className="plk-ball" r={BALL_R} cx={W / 2} cy={0} fill="url(#plk-ball)" style={{ opacity: 0 }} />
      </svg>

      <div className="plk-slots" style={{ paddingInline: `${(PAD / W) * 100}%` }}>
        {PLINKO_SLOTS.map((slot, i) => {
          const reward = plinkoSlotReward(i, levels);
          const kind = reward.kind;
          const cls = ['plk-slot', `plk-slot--${kind}`, RARE_KINDS.has(kind) ? 'is-rare' : '', landed === i ? 'is-landed' : '', selected === i ? 'is-selected' : ''].filter(Boolean).join(' ');
          return (
            <button key={i} className={cls} onClick={() => onSelect(i)} aria-label={`Case ${i + 1}`}>
              <span className="plk-slot__icon">{PLINKO_REWARD_ICON[kind]}</span>
              {slot.reward.amount > 1 || ['gems', 'crowns', 'tokens'].includes(kind)
                ? <span className="plk-slot__amount">{reward.amount}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
