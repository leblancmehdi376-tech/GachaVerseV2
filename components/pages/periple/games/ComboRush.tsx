'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Medal } from '@/lib/game/periple';

// Combo Rush : enchaîner 12 directions avant la fin du chrono (11 s).
// Une erreur coûte 0,8 s. Croix directionnelle tactile + flèches du clavier.
// Le chrono s'écrit directement dans le DOM (barre en scaleX, texte) : React
// ne re-rend qu'à chaque flèche, jamais à chaque image.
const COUNT = 12;
const TIME_MS = 11_000;
const PENALTY_MS = 800;

type Dir = 'up' | 'right' | 'down' | 'left';
const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const ROT: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
const DIR_COLOR: Record<Dir, string> = { up: '#f97316', right: '#3b82f6', down: '#22c55e', left: '#a855f7' };
const DIR_LABEL: Record<Dir, string> = { up: 'Haut', right: 'Droite', down: 'Bas', left: 'Gauche' };

export function medalForCombo(done: number): Medal {
  return done >= COUNT ? 3 : done >= 8 ? 2 : done >= 4 ? 1 : 0;
}

function Arrow({ dir, size }: { dir: Dir; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ transform: `rotate(${ROT[dir]}deg)` }} aria-hidden>
      <path d="M24 4 L44 26 H32 V44 H16 V26 H4 Z" fill={DIR_COLOR[dir]} stroke="#1b1037" strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 10 L36 23 H28" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ComboRush({ onFinish }: { onFinish: (m: Medal) => void }) {
  const [seq] = useState<Dir[]>(() => Array.from({ length: COUNT }, () => DIRS[Math.floor(Math.random() * 4)]));
  const [idx, setIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [shake, setShake] = useState(0);
  const idxRef = useRef(0);
  const deadline = useRef(0);
  const ended = useRef(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // 3, 2, 1… puis chrono.
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => {
      if (countdown === 1) deadline.current = performance.now() + TIME_MS;
      setCountdown(c => c - 1);
    }, 600);
    return () => clearTimeout(t);
  }, [countdown]);

  const end = useCallback((done: number) => {
    if (ended.current) return;
    ended.current = true;
    setTimeout(() => onFinish(medalForCombo(done)), 600);
  }, [onFinish]);

  useEffect(() => {
    if (countdown > 0) return;
    let raf = 0;
    let lastText = '';
    const tick = () => {
      if (ended.current) return;
      const rem = Math.max(0, deadline.current - performance.now());
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${rem / TIME_MS})`;
      // Texte réécrit seulement quand il change (sinon relayout à chaque image).
      const text = `${(rem / 1000).toFixed(1)}s`;
      if (text !== lastText && textRef.current) { lastText = text; textRef.current.textContent = text; }
      if (rem <= 0) { end(idxRef.current); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [countdown, end]);

  const press = useCallback((d: Dir) => {
    if (countdown > 0 || ended.current || idxRef.current >= COUNT) return;
    if (d === seq[idxRef.current]) {
      const next = idxRef.current + 1;
      idxRef.current = next;
      setIdx(next);
      if (next >= COUNT) end(next);
    } else {
      deadline.current -= PENALTY_MS;
      setShake(s => s + 1);
    }
  }, [countdown, seq, end]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const d = KEYS[e.key]; if (d) { e.preventDefault(); press(d); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const done = idx >= COUNT;
  return (
    <div className="pp-game">
      <div className="pp-rush-top">
        <div className="pp-bar pp-bar--orange" style={{ flex: 1, height: 18 }}><div ref={fillRef} className="pp-bar__fill pp-bar__fill--scale" /></div>
        <span ref={textRef} className="pp-rush-time">{(TIME_MS / 1000).toFixed(1)}s</span>
      </div>
      <div className="pp-rush-track">
        {seq.map((d, i) => (
          <span key={i} className={`pp-rush-dot${i < idx ? ' is-done' : i === idx ? ' is-now' : ''}`} style={{ ['--c' as string]: DIR_COLOR[d] }} />
        ))}
      </div>
      <div key={shake} className={`pp-rush-stage${shake ? ' is-wrong' : ''}`}>
        {countdown > 0 ? <div key={countdown} className="pp-rush-count">{countdown}</div>
          : done ? <div className="pp-rush-count" style={{ color: '#fde047' }}>COMBO !</div>
          : (
            <div className="pp-rush-cards">
              <div key={idx} className="pp-rush-card is-main"><Arrow dir={seq[idx]} size={96} /></div>
              {seq[idx + 1] && <div className="pp-rush-card is-next"><Arrow dir={seq[idx + 1]} size={48} /></div>}
            </div>
          )}
      </div>
      <div className="pp-dpad">
        {DIRS.map(d => (
          <button key={d} className={`pp-dpad__btn is-${d}`} onPointerDown={e => { e.preventDefault(); press(d); }}
            onClick={e => { if (e.detail === 0) press(d); }} aria-label={DIR_LABEL[d]}>
            <Arrow dir={d} size={34} />
          </button>
        ))}
      </div>
    </div>
  );
}
