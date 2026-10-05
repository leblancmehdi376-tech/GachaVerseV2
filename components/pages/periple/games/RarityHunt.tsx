'use client';
import { memo, useEffect, useRef, useState } from 'react';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { BANNER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG, RARITY_ORDER_ASC, type CharacterTemplate, type Rarity } from '@/types/game';
import { HUNT_TIME_MS, HUNT_RARITIES, HUNT_MEDAL_SCORES, MEDAL_INFO, huntMedal } from '@/lib/game/periple';

// Chasse aux Raretés : une rareté cible est tirée ; des cartes de
// personnages défilent sur une grille 3×3 et le joueur touche toutes celles
// de la bonne rareté en 20 s. Bonne carte = +1, erreur = -1.
// Performances : le chrono s'écrit dans le DOM, un seul minuteur (10 Hz)
// remplace les cartes expirées, et chaque carte est mémorisée (seule celle
// qui change se re-rend). Les images du lot sont préchargées pendant le 3-2-1.
const SLOTS = 9;
const TARGET_CHANCE = 0.4;
const LIFE_MIN = 1300, LIFE_MAX = 2100;   // durée d'affichage d'une carte (ms), raccourcie au fil de la partie

interface Slot { key: number; tpl: CharacterTemplate; target: boolean; until: number; fx: '' | 'hit' | 'miss' }

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// Rareté cible + lot de personnages (cibles + leurres de raretés voisines,
// pour que la lecture du cadre compte vraiment).
function buildRound() {
  const target: Rarity = HUNT_RARITIES[Math.floor(Math.random() * HUNT_RARITIES.length)];
  const ti = RARITY_ORDER_ASC.indexOf(target);
  const near = new Set(RARITY_ORDER_ASC.filter((r, i) => r !== target && Math.abs(i - ti) <= 2));
  const targets = shuffle(BANNER_POOL.filter(c => c.rarity === target)).slice(0, 10);
  const decoys = shuffle(BANNER_POOL.filter(c => near.has(c.rarity))).slice(0, 14);
  return { target, targets, decoys };
}

// Nouvelle carte : cible avec une probabilité TARGET_CHANCE (ou forcée).
// Les cartes restent moins longtemps à mesure que la partie avance.
function makeSlot(round: ReturnType<typeof buildRound>, key: number, now: number, start: number, forceTarget = false, visible?: Set<string>): Slot {
  const target = forceTarget || Math.random() < TARGET_CHANCE;
  const all = target ? round.targets : round.decoys;
  // Évite d'afficher deux fois le même personnage en même temps.
  const fresh = visible ? all.filter(c => !visible.has(c.id)) : all;
  const list = fresh.length > 0 ? fresh : all;
  const progress = start ? Math.min(1, (now - start) / HUNT_TIME_MS) : 0;
  const life = (LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN)) * (1 - 0.3 * progress);
  return { key, tpl: list[Math.floor(Math.random() * list.length)], target, until: now + life, fx: '' };
}

const HuntCard = memo(function HuntCard({ slot, index, width, onTap }: { slot: Slot; index: number; width: number; onTap: (i: number) => void }) {
  return (
    <button className={`pp-hunt-card${slot.fx ? ` is-${slot.fx}` : ''}`} style={{ ['--rc' as string]: RARITY_CONFIG[slot.tpl.rarity].color }}
      onPointerDown={e => { e.preventDefault(); onTap(index); }} onClick={e => { if (e.detail === 0) onTap(index); }}
      aria-label={`${slot.tpl.name} (${RARITY_CONFIG[slot.tpl.rarity].label})`}>
      <CharacterCardThumb templateId={slot.tpl.id} name={slot.tpl.name} rarity={slot.tpl.rarity} width={width} height={width * 1.4} frameOverlay />
      {slot.fx === 'hit' && <span className="pp-hunt-pop is-plus">+1</span>}
      {slot.fx === 'miss' && <span className="pp-hunt-pop is-minus">-1</span>}
    </button>
  );
});

export function RarityHunt({ onFinish }: { onFinish: (score: number) => void }) {
  const [round] = useState(buildRound);
  const keyRef = useRef(SLOTS);
  const startRef = useRef(0);
  // Appelée uniquement depuis les minuteurs et les gestes (jamais au rendu).
  const spawn = (now: number, forceTarget = false): Slot =>
    makeSlot(round, ++keyRef.current, now, startRef.current, forceTarget, new Set(slotsRef.current.map(s => s.tpl.id)));
  const [slots, setSlots] = useState<Slot[]>(() => {
    const visible = new Set<string>();
    return shuffle(Array.from({ length: SLOTS }, (_, i) => {
      const slot = makeSlot(round, i + 1, 0, 0, i < 3, visible);
      visible.add(slot.tpl.id);
      return slot;
    }));
  });
  // Cartes un peu plus petites sur téléphone pour que la grille tienne à l'écran.
  const [cardW] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 420 ? 82 : 94));
  const [phase, setPhase] = useState<'count' | 'play' | 'done'>('count');
  const [count, setCount] = useState(3);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const slotsRef = useRef(slots);
  const fillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  const commit = (next: Slot[]) => { slotsRef.current = next; setSlots(next); };

  // 3, 2, 1… (les images se chargent pendant ce temps)
  useEffect(() => {
    if (phase !== 'count') return;
    const t = setTimeout(() => {
      if (count > 1) { setCount(count - 1); return; }
      const now = performance.now();
      startRef.current = now;
      commit(slotsRef.current.map(s => ({ ...s, until: now + LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN) })));
      setPhase('play');
    }, 650);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Partie : chrono (DOM direct) + remplacement des cartes expirées (10 Hz).
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0;
    let lastText = '';
    const tick = () => {
      const rem = Math.max(0, startRef.current + HUNT_TIME_MS - performance.now());
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${rem / HUNT_TIME_MS})`;
      const text = `${Math.ceil(rem / 1000)}s`;
      if (text !== lastText && textRef.current) { lastText = text; textRef.current.textContent = text; }
      if (rem <= 0) {
        setPhase('done');
        setTimeout(() => finishRef.current(scoreRef.current), 900);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = setInterval(() => {
      const now = performance.now();
      const cur = slotsRef.current;
      if (!cur.some(s => !s.fx && s.until <= now)) return;
      let next = cur.map(s => (!s.fx && s.until <= now ? spawn(now) : s));
      // Toujours au moins une cible visible.
      if (!next.some(s => s.target && !s.fx)) {
        const i = next.findIndex(s => !s.fx);
        if (i >= 0) next = next.map((s, j) => (j === i ? spawn(now, true) : s));
      }
      commit(next);
    }, 100);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spawn ne lit que des refs et le tirage initial
  }, [phase]);

  // Référence stable pour les cartes mémorisées.
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [onTap] = useState(() => (i: number) => {
    const cur = slotsRef.current;
    const slot = cur[i];
    if (phaseRef.current !== 'play' || !slot || slot.fx) return;
    const hit = slot.target;
    scoreRef.current = Math.max(0, scoreRef.current + (hit ? 1 : -1));
    setScore(scoreRef.current);
    commit(cur.map((s, j) => (j === i ? { ...s, fx: hit ? 'hit' : 'miss' } : s)));
    setTimeout(() => {
      const now = performance.now();
      commit(slotsRef.current.map((s, j) => (j === i && s.key === slot.key ? spawn(now) : s)));
    }, hit ? 200 : 320);
  });

  const cfg = RARITY_CONFIG[round.target];
  const medal = huntMedal(score);
  const nextGoal = HUNT_MEDAL_SCORES.find(t => t > score);
  return (
    <div className="pp-game">
      <div className="pp-hunt-target" style={{ ['--rc' as string]: cfg.color }}>
        <span>Touche les</span>
        <span className="pp-hunt-target__rarity">{cfg.label}s</span>
      </div>
      <div className="pp-rush-top">
        <div className="pp-bar pp-bar--orange" style={{ flex: 1, height: 18 }}><div ref={fillRef} className="pp-bar__fill pp-bar__fill--scale" /></div>
        <span ref={textRef} className="pp-rush-time">{HUNT_TIME_MS / 1000}s</span>
      </div>
      <div className="pp-hunt-score">
        <span className="pp-hunt-score__n" key={score}>{score}</span>
        <span style={{ color: MEDAL_INFO[medal].color }}>
          {medal > 0 ? MEDAL_INFO[medal].label : '—'}{nextGoal !== undefined ? ` · ${MEDAL_INFO[huntMedal(nextGoal)].label} à ${nextGoal}` : ' · max !'}
        </span>
      </div>
      <div className="pp-hunt-stage">
        <div className="pp-hunt-grid" style={{ gridTemplateColumns: `repeat(3, ${cardW}px)` }}>
          {slots.map((s, i) => <HuntCard key={s.key} slot={s} index={i} width={cardW} onTap={onTap} />)}
        </div>
        {phase !== 'play' && (
          <div className="pp-hunt-cover">
            <span key={phase === 'count' ? count : 'end'} className="pp-rush-count">{phase === 'count' ? count : 'TERMINÉ !'}</span>
          </div>
        )}
      </div>
      {/* Préchargement des illustrations du lot (invisible) */}
      {phase === 'count' && (
        <div className="pp-hunt-preload" aria-hidden>
          {[...round.targets, ...round.decoys].map(t => (
            <CharacterCardThumb key={t.id} templateId={t.id} name={t.name} rarity={t.rarity} width={cardW} height={cardW * 1.4} frameOverlay />
          ))}
        </div>
      )}
    </div>
  );
}
