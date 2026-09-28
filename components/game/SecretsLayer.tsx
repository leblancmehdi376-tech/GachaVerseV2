'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRandomEventStore } from '@/store/randomEventStore';
import { EGG, STAT } from '@/lib/game/achievements';

// Secrets et easter eggs globaux (succès des catégories Exploration,
// Événements et Secrets). Monté une seule fois dans GameLayout.

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
const INTERACTIONS_CAP = 1000; // au-delà, plus aucune écriture (succès déjà validé)

const NEKO_MIN_DELAY_MS = 150_000;
const NEKO_MAX_DELAY_MS = 360_000;
const NEKO_VISIBLE_MS = 7_000;
const GOLD_NEKO_CHANCE = 0.4; // à chaque événement aléatoire
const SPARKLE_MIN_DELAY_MS = 180_000;
const SPARKLE_MAX_DELAY_MS = 420_000;
const SPARKLE_VISIBLE_MS = 6_000;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

type Neko = { id: number; left: number; gold: boolean; caught: boolean };
type Sparkle = { id: number; left: number; top: number };

export function SecretsLayer() {
  const [neko, setNeko] = useState<Neko | null>(null);
  const [sparkle, setSparkle] = useState<Sparkle | null>(null);
  const eventActive = useRandomEventStore(s => s.active);
  const lastEventRef = useRef<string | null>(null);

  // ── Code Konami ─────────────────────────────────────────────────────────
  useEffect(() => {
    let pos = 0;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      pos = k === KONAMI[pos] ? pos + 1 : (k === KONAMI[0] ? 1 : 0);
      if (pos === KONAMI.length) { pos = 0; useGameStore.getState().discover(EGG.konami); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Clics : interactions ────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const g = useGameStore.getState();
      const target = e.target as Element | null;
      if (target?.closest?.('button, a, [role="button"], input, select, label') && (g.achievementStats[STAT.interactions] ?? 0) < INTERACTIONS_CAP) {
        g.addStat(STAT.interactions);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  // ── L'heure des chats (3h33) ────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const d = new Date();
      if (d.getHours() === 3 && d.getMinutes() === 33 && document.visibilityState === 'visible') {
        useGameStore.getState().discover(EGG.night);
      }
    };
    check();
    const iv = setInterval(check, 15_000);
    return () => clearInterval(iv);
  }, []);

  // ── Chat errant (PNJ secret) ────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setNeko(n => n ?? { id: Date.now(), left: rand(8, 86), gold: false, caught: false });
        }
        schedule();
      }, rand(NEKO_MIN_DELAY_MS, NEKO_MAX_DELAY_MS));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Pendant un événement aléatoire, un chat doré peut se montrer.
  useEffect(() => {
    if (!eventActive || lastEventRef.current === eventActive) { lastEventRef.current = eventActive; return; }
    lastEventRef.current = eventActive;
    if (Math.random() >= GOLD_NEKO_CHANCE) return;
    const t = setTimeout(() => setNeko({ id: Date.now(), left: rand(8, 86), gold: true, caught: false }), rand(1200, 3000));
    return () => clearTimeout(t);
  }, [eventActive]);

  useEffect(() => {
    if (!neko || neko.caught) return;
    const t = setTimeout(() => setNeko(n => (n?.id === neko.id ? null : n)), NEKO_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [neko]);

  const catchNeko = () => {
    if (!neko || neko.caught) return;
    useGameStore.getState().discover(neko.gold ? EGG.goldNeko : EGG.npc);
    const id = neko.id;
    setNeko({ ...neko, caught: true });
    setTimeout(() => setNeko(n => (n?.id === id ? null : n)), 900);
  };

  // ── Éclat caché (objet caché) ───────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          const s = { id: Date.now(), left: rand(6, 92), top: rand(14, 86) };
          setSparkle(s);
          setTimeout(() => setSparkle(cur => (cur?.id === s.id ? null : cur)), SPARKLE_VISIBLE_MS);
        }
        schedule();
      }, rand(SPARKLE_MIN_DELAY_MS, SPARKLE_MAX_DELAY_MS));
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {neko && (
        <button key={neko.id} className={`gv-neko${neko.gold ? ' is-gold' : ''}${neko.caught ? ' is-caught' : ''}`}
          style={{ left: `${neko.left}%` }} onClick={catchNeko} aria-label="Chat errant">
          {neko.gold ? '🐈' : '🐈‍⬛'}
        </button>
      )}
      {sparkle && (
        <button key={sparkle.id} className="gv-sparkle" style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%` }}
          onClick={() => { useGameStore.getState().discover(EGG.object); setSparkle(null); }} aria-label="Éclat">
          ✦
        </button>
      )}
    </>
  );
}
