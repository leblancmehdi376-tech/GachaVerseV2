'use client';
import { memo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PeripleWheelResult } from '@/store/slices/peripleSlice';
import { GACHA_WHEEL, shortPeripleReward } from '@/lib/game/periple';
import { RewardIcon } from '../PeripleIcons';
import { LootView } from '../PeripleModals';
import type { GameOutcome } from './MinigameModal';

// Roue des Invocations : la taille de chaque part est proportionnelle à ses
// chances réelles. Le résultat est tiré par le store au lancer, la roue
// s'arrête ensuite dessus.
// Performances : le disque est un calque HTML à part, tourné par `transform`
// (composité, aucun repaint pendant les 4,6 s de rotation) ; le cadre, le
// moyeu et le pointeur sont des SVG fixes ; les ampoules clignotent par
// opacité sur deux calques (pairs / impairs).
const VB = 160;              // demi-côté de la viewBox du cadre
const R = 140;               // rayon du disque
const TOTAL = GACHA_WHEEL.reduce((s, w) => s + w.weight, 0);
const SEGMENTS = (() => {
  let a = 0;
  return GACHA_WHEEL.map(w => {
    const span = (w.weight / TOTAL) * 360;
    const seg = { ...w, start: a, span, mid: a + span / 2 };
    a += span;
    return seg;
  });
})();

function polar(deg: number, r: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
}
function arc(start: number, span: number) {
  const a = polar(start, R), b = polar(start + span, R);
  return `M0 0 L${a.x} ${a.y} A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
}

const Disk = memo(function Disk({ win }: { win: number | null }) {
  return (
    <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} width="100%" height="100%" aria-hidden>
      <defs>
        <radialGradient id="pp-wheel-shine" cx="50%" cy="35%" r="65%"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {SEGMENTS.map((s, i) => {
        const p = polar(s.mid, R * 0.64);
        return (
          <g key={i}>
            <path d={arc(s.start, s.span)} fill={s.color} stroke="#1b1037" strokeWidth="2.5" />
            {win === i && <path d={arc(s.start, s.span)} fill="#fff" opacity=".3" />}
            <g transform={`translate(${p.x} ${p.y}) rotate(${s.mid})`}>
              <g transform="translate(-17 -26)"><RewardIcon kind={s.reward.kind} size={34} /></g>
              <text y="24" textAnchor="middle" fontSize="17" fill="#fff" stroke="#1b1037" strokeWidth="3" paintOrder="stroke" style={{ fontFamily: 'var(--f-game)' }}>{shortPeripleReward(s.reward)}</text>
            </g>
          </g>
        );
      })}
      <circle r={R} fill="url(#pp-wheel-shine)" />
    </svg>
  );
});

function Bulbs({ odd, on }: { odd: boolean; on: boolean }) {
  return (
    <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`} className={`pp-wheel__layer${on ? ` pp-wheel-bulbs${odd ? ' is-odd' : ''} pp-loop` : ''}`} aria-hidden>
      {Array.from({ length: 12 }, (_, i) => {
        const p = polar((i * 2 + (odd ? 1 : 0)) * 15, R + 7);
        return <circle key={i} cx={p.x} cy={p.y} r="3.2" fill={odd ? '#fff7ed' : '#fde047'} />;
      })}
    </svg>
  );
}

export function GachaWheel({ onLock, onDone }: { onLock: () => void; onDone: (o: GameOutcome | null) => void }) {
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<PeripleWheelResult | null>(null);
  const [stopped, setStopped] = useState(false);

  const spin = () => {
    if (result) return;
    onLock();
    const r = useGameStore.getState().spinPeripleWheel();
    if (!r) { onDone(null); return; }
    const seg = SEGMENTS[r.segment];
    const jitter = (Math.random() - 0.5) * Math.max(0, seg.span - 8);
    setResult(r);
    setAngle(360 * 6 - seg.mid + jitter);
  };

  const inset = `${((VB - R) / (VB * 2)) * 100}%`;
  return (
    <div className="pp-game" style={{ alignItems: 'center' }}>
      <div className="pp-wheel">
        {/* Cadre doré */}
        <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`} className="pp-wheel__layer" aria-hidden>
          <defs>
            <linearGradient id="pp-wheel-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef08a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
          </defs>
          <circle r={R + 14} fill="url(#pp-wheel-rim)" stroke="#1b1037" strokeWidth="3" />
        </svg>
        <Bulbs odd={false} on={!stopped} />
        <Bulbs odd on={!stopped} />
        {/* Disque tournant */}
        <div className="pp-wheel__disk" style={{ inset, transform: `rotate(${angle}deg)`, transition: result ? 'transform 4.6s cubic-bezier(.15,.85,.2,1)' : 'none' }}
          onTransitionEnd={() => setStopped(true)}>
          <Disk win={stopped && result ? result.segment : null} />
        </div>
        {/* Moyeu + pointeur */}
        <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`} className="pp-wheel__layer" style={{ overflow: 'visible' }} aria-hidden>
          <circle r="26" fill="#f59e0b" stroke="#1b1037" strokeWidth="3" />
          <circle r="15" fill="#7c3aed" stroke="#1b1037" strokeWidth="2" />
          <path d="M-16 -166 L16 -166 L0 -136 Z" fill="#ef4444" stroke="#1b1037" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </div>

      {!result && <button className="pp-btn pp-btn--big" style={{ width: '100%', maxWidth: 360 }} onClick={spin}>LANCER LA ROUE</button>}
      {stopped && result && (
        <div style={{ textAlign: 'center', width: '100%', animation: 'ppPop .35s both' }}>
          <LootView loot={result.loot} />
          <button className="pp-btn pp-btn--green" style={{ marginTop: 14, minWidth: 180 }} onClick={() => onDone({ loot: result.loot })}>CONTINUER</button>
        </div>
      )}
    </div>
  );
}
