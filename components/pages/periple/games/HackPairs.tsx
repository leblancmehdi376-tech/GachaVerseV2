'use client';
import { memo, useEffect, useRef, useState } from 'react';
import type { Medal } from '@/lib/game/periple';

// Piratage : 6 paires de modules à retrouver en 30 s.
// Or = fini avec au moins 12 s restantes, Argent = fini, Bronze = 3 paires.
// Le chrono s'écrit directement dans le DOM : la grille ne se re-rend
// qu'au retournement d'une carte.
const TIME_MS = 30_000;
const GOLD_LEFT_MS = 12_000;

const GLYPHS: { color: string; path: string }[] = [
  { color: '#22d3ee', path: 'M14 14h20v20H14z M18 8v6 M24 8v6 M30 8v6 M18 34v6 M24 34v6 M30 34v6 M8 18h6 M8 24h6 M8 30h6 M34 18h6 M34 24h6 M34 30h6' }, // puce
  { color: '#4ade80', path: 'M16 10h16v30H16z M21 6h6v4 M20 30h8 M20 24h8 M20 18h8' },                                                         // batterie
  { color: '#f472b6', path: 'M24 24m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M24 24m-16 0a16 6 0 1 0 32 0a16 6 0 1 0-32 0 M24 8c-8 6-8 26 0 32 M24 8c8 6 8 26 0 32' }, // atome
  { color: '#fbbf24', path: 'M27 6L14 26h10l-3 16 14-22H25z' },                                                                                 // éclair
  { color: '#a78bfa', path: 'M12 18h24v18H12z M18 26h2 M28 26h2 M20 31h8 M24 18v-6 M24 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M8 24h4 M36 24h4' }, // robot
  { color: '#fb923c', path: 'M10 34a18 18 0 0 1 28 0 M15 30a12 12 0 0 1 18 0 M20 26a6 6 0 0 1 8 0 M24 34v6' },                                   // antenne
];

interface Card { id: number; glyph: number }

export function medalForHack(found: number, leftMs: number): Medal {
  if (found >= GLYPHS.length) return leftMs >= GOLD_LEFT_MS ? 3 : 2;
  return found >= 3 ? 1 : 0;
}

const HackCard = memo(function HackCard({ card, shown, found, wrong, onFlip }: {
  card: Card; shown: boolean; found: boolean; wrong: boolean; onFlip: (c: Card) => void;
}) {
  const g = GLYPHS[card.glyph];
  return (
    <button className={`pp-hack-card${shown ? ' is-open' : ''}${found ? ' is-found' : ''}${wrong ? ' is-wrong' : ''}`}
      onPointerDown={e => { e.preventDefault(); onFlip(card); }} onClick={e => { if (e.detail === 0) onFlip(card); }}
      aria-label={shown ? 'Module révélé' : 'Module caché'} style={{ ['--c' as string]: g.color }}>
      <span className="pp-hack-card__inner">
        <span className="pp-hack-card__back" aria-hidden>
          <svg viewBox="0 0 48 48" width="56%" height="56%"><path d="M8 24h10l3-8 6 16 3-8h10" fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="pp-hack-card__front" aria-hidden>
          <svg viewBox="0 0 48 48" width="66%" height="66%"><path d={g.path} fill="none" stroke={g.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </span>
    </button>
  );
});

export function HackPairs({ onFinish }: { onFinish: (m: Medal) => void }) {
  const [cards] = useState<Card[]>(() => {
    const list = GLYPHS.flatMap((_, g) => [g, g]);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list.map((glyph, id) => ({ id, glyph }));
  });
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);   // glyphes trouvés
  const [wrong, setWrong] = useState(false);
  const [goldLost, setGoldLost] = useState(false);
  const deadline = useRef(0);
  const ended = useRef(false);
  const foundRef = useRef<number[]>([]);
  const openRef = useRef<number[]>([]);
  const fillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  useEffect(() => {
    const end = (pairs: number, rem: number) => {
      if (ended.current) return;
      ended.current = true;
      setTimeout(() => finishRef.current(medalForHack(pairs, rem)), 700);
    };
    deadline.current = performance.now() + TIME_MS;
    let raf = 0;
    let lastSec = -1;
    let goldShown = true;
    const tick = () => {
      if (ended.current) return;
      const rem = Math.max(0, deadline.current - performance.now());
      if (foundRef.current.length >= GLYPHS.length) { end(GLYPHS.length, rem); return; }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${rem / TIME_MS})`;
      const sec = Math.ceil(rem / 1000);
      if (sec !== lastSec && textRef.current) { lastSec = sec; textRef.current.textContent = `${sec}s`; }
      if (goldShown && rem < GOLD_LEFT_MS) { goldShown = false; setGoldLost(true); }
      if (rem <= 0) { end(foundRef.current.length, 0); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Référence stable (cartes mémorisées) ; tout l'état de jeu passe par des refs.
  const [onFlip] = useState(() => (c: Card) => {
    const cur = openRef.current;
    if (ended.current || cur.length >= 2 || cur.includes(c.id) || foundRef.current.includes(c.glyph)) return;
    const next = [...cur, c.id];
    openRef.current = next;
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map(id => cards[id]);
    if (a.glyph === b.glyph) {
      // La boucle du chrono détecte la dernière paire et termine la partie.
      foundRef.current = [...foundRef.current, a.glyph];
      const f = foundRef.current;
      setTimeout(() => { setFound(f); openRef.current = []; setOpen([]); }, 250);
    } else {
      setWrong(true);
      setTimeout(() => { openRef.current = []; setOpen([]); setWrong(false); }, 650);
    }
  });

  return (
    <div className="pp-game">
      <div className="pp-rush-top">
        <div className={`pp-bar ${goldLost ? 'pp-bar--red' : 'pp-bar--gold'}`} style={{ flex: 1, height: 18 }}><div ref={fillRef} className="pp-bar__fill pp-bar__fill--scale" /></div>
        <span ref={textRef} className="pp-rush-time">{TIME_MS / 1000}s</span>
      </div>
      <div className="pp-hack-info">
        <span>Paires : <b>{found.length}/{GLYPHS.length}</b></span>
        <span style={{ color: goldLost ? 'var(--text-dim)' : '#fde047' }}>{goldLost ? 'Or perdu' : 'Or encore possible'}</span>
      </div>
      <div className="pp-hack-grid">
        {cards.map(c => (
          <HackCard key={c.id} card={c} onFlip={onFlip}
            shown={open.includes(c.id) || found.includes(c.glyph)} found={found.includes(c.glyph)} wrong={wrong && open.includes(c.id)} />
        ))}
      </div>
    </div>
  );
}
