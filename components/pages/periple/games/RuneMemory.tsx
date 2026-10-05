'use client';
import { useEffect, useRef, useState } from 'react';
import type { Medal } from '@/lib/game/periple';

// Portail des Runes : mémoriser puis reproduire une séquence de runes.
// 3 portails de 3, 5 puis 7 runes ; une erreur ferme le portail.
// Médaille = nombre de portails franchis.
const ROUNDS = [3, 5, 7];
const SHOW_MS = 520;
const GAP_MS = 170;

const RUNES = [
  { color: '#34d399', dark: '#065f46', path: 'M24 8 L24 40 M14 16 L34 32 M34 16 L14 32' },
  { color: '#60a5fa', dark: '#1e3a8a', path: 'M12 36 L24 10 L36 36 M17 26 H31' },
  { color: '#c084fc', dark: '#581c87', path: 'M24 8 A16 16 0 1 0 40 24 M24 16 L24 32 M16 24 H32' },
  { color: '#fbbf24', dark: '#78350f', path: 'M10 24 L24 10 L38 24 L24 38 Z M24 18 L30 24 L24 30 L18 24 Z' },
];

export function RuneMemory({ onFinish }: { onFinish: (m: Medal) => void }) {
  const [round, setRound] = useState(0);
  const [seq, setSeq] = useState<number[]>([]);
  const [phase, setPhase] = useState<'ready' | 'show' | 'input' | 'ok' | 'fail'>('ready');
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Nouveau portail : nouvelle séquence, puis démonstration.
  useEffect(() => {
    if (phase !== 'ready') return;
    const s = Array.from({ length: ROUNDS[round] }, () => Math.floor(Math.random() * RUNES.length));
    later(0, () => setSeq(s));
    let t = 700;
    later(t, () => setPhase('show'));
    for (const r of s) {
      later(t, () => setLit(r));
      later(t + SHOW_MS, () => setLit(null));
      t += SHOW_MS + GAP_MS;
    }
    later(t, () => { setStep(0); setPhase('input'); });
  }, [phase, round]);

  const press = (r: number) => {
    if (phase !== 'input') return;
    setLit(r);
    later(220, () => setLit(cur => (cur === r ? null : cur)));
    if (r !== seq[step]) {
      setPhase('fail');
      later(900, () => onFinish(round as Medal));
      return;
    }
    const next = step + 1;
    setStep(next);
    if (next >= seq.length) {
      setPhase('ok');
      if (round + 1 >= ROUNDS.length) later(900, () => onFinish(3));
      else later(900, () => { setRound(round + 1); setPhase('ready'); });
    }
  };

  const msg = phase === 'show' ? 'Mémorise…' : phase === 'input' ? 'À toi !' : phase === 'ok' ? 'Portail franchi !' : phase === 'fail' ? 'Le portail se referme…' : `Portail ${round + 1}`;
  return (
    <div className="pp-game">
      <div className="pp-rune-rounds">
        {ROUNDS.map((n, i) => (
          <span key={i} className={`pp-rune-round${i < round || (i === round && phase === 'ok') ? ' is-done' : i === round ? ' is-now' : ''}`}>{n} runes</span>
        ))}
      </div>
      <div className={`pp-rune-msg${phase === 'fail' ? ' is-fail' : phase === 'ok' ? ' is-ok' : ''}`}>{msg}</div>
      <div className="pp-rune-progress">
        {seq.map((_, i) => <span key={i} className={i < step && (phase === 'input' || phase === 'ok') ? 'is-done' : ''} />)}
      </div>
      <div className={`pp-rune-grid${phase === 'fail' ? ' is-fail' : ''}`}>
        {RUNES.map((r, i) => (
          <button key={i} className={`pp-rune${lit === i ? ' is-lit' : ''}`} style={{ ['--c' as string]: r.color, ['--d' as string]: r.dark }}
            onPointerDown={e => { e.preventDefault(); press(i); }} disabled={phase !== 'input'} aria-label={`Rune ${i + 1}`}>
            <svg viewBox="0 0 48 48" width="62%" height="62%" aria-hidden>
              <path d={r.path} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
