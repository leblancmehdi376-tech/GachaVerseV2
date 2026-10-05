'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PixelSprite } from '@/components/ui/PixelSprite';
import { generateEnemy, ENEMY_SPRITES_ASSET_VERSION } from '@/lib/game/enemies';
import { useGameStore } from '@/store/gameStore';
import type { Medal } from '@/lib/game/periple';

// Duel Éclair : 3 frappes. Un curseur fait l'aller-retour sur une jauge ;
// arrêté dans la zone = touché (1 dégât), au centre = critique (2 dégâts).
// La jauge accélère à chaque frappe. 6 dégâts possibles.
const STRIKES = 3;
const PERIODS = [1150, 950, 780];   // durée d'un aller simple (ms)
const ZONE_W = 24;                   // largeur de la zone, en % de la jauge
const CRIT_W = 7;
const MAX_DMG = STRIKES * 2;

type Hit = 'crit' | 'hit' | 'miss';
const HIT_LABEL: Record<Hit, string> = { crit: 'CRITIQUE !', hit: 'TOUCHÉ', miss: 'RATÉ' };
const HIT_COLOR: Record<Hit, string> = { crit: '#fde047', hit: '#fff', miss: '#94a3b8' };

export function medalForDamage(dmg: number): Medal {
  return dmg >= 5 ? 3 : dmg >= 3 ? 2 : dmg >= 1 ? 1 : 0;
}

export function CombatDuel({ onFinish }: { onFinish: (m: Medal) => void }) {
  const [enemy] = useState(() => {
    const palier = useGameStore.getState().palier;
    return generateEnemy(1 + Math.floor(Math.random() * 9), palier);
  });
  const [strike, setStrike] = useState(0);
  const [hits, setHits] = useState<Hit[]>([]);
  const [zone, setZone] = useState(() => 10 + Math.random() * (80 - ZONE_W));
  const [flash, setFlash] = useState<{ hit: Hit; key: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const lockRef = useRef(false);   // garde synchrone contre une double frappe (pointeur + clavier)
  const startRef = useRef(0);

  // Curseur animé hors du rendu React : une écriture de transform par image
  // sur une piste pleine largeur (translateX en % = % de la jauge), composité.
  useEffect(() => {
    if (busy || strike >= STRIKES) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const phase = ((t - startRef.current) / PERIODS[strike]) % 2;
      const pos = (phase < 1 ? phase : 2 - phase) * 100;
      posRef.current = pos;
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${pos}%, 0, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [strike, busy]);

  const dmg = hits.reduce((s, h) => s + (h === 'crit' ? 2 : h === 'hit' ? 1 : 0), 0);

  const strikeNow = useCallback(() => {
    if (lockRef.current || busy || strike >= STRIKES) return;
    lockRef.current = true;
    const p = posRef.current;
    const center = zone + ZONE_W / 2;
    const hit: Hit = Math.abs(p - center) <= CRIT_W / 2 ? 'crit' : p >= zone && p <= zone + ZONE_W ? 'hit' : 'miss';
    const next = [...hits, hit];
    setHits(next);
    setFlash({ hit, key: Date.now() });
    setBusy(true);
    setTimeout(() => {
      if (next.length >= STRIKES) {
        const total = next.reduce((s, h) => s + (h === 'crit' ? 2 : h === 'hit' ? 1 : 0), 0);
        setTimeout(() => onFinish(medalForDamage(total)), 500);
        return;
      }
      setStrike(next.length);
      setZone(10 + Math.random() * (80 - ZONE_W));
      setBusy(false);
      lockRef.current = false;
    }, 750);
  }, [busy, strike, zone, hits, onFinish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); strikeNow(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [strikeNow]);

  const hpPct = Math.max(0, 100 - (dmg / MAX_DMG) * 100);
  return (
    <div className="pp-game">
      <div className="pp-duel-arena">
        <div className="pp-duel-hp">
          <span>{enemy.name}</span>
          <div className="pp-bar pp-bar--red" style={{ flex: 1 }}><div className="pp-bar__fill" style={{ width: `${hpPct}%` }} /></div>
        </div>
        <div key={flash?.key} className={`pp-duel-enemy${flash && flash.hit !== 'miss' ? ' is-hit' : ''}${dmg >= MAX_DMG ? ' is-ko' : ''}`}>
          <PixelSprite src={enemy.spritePath} alt={enemy.name} size={150} assetVersion={ENEMY_SPRITES_ASSET_VERSION} />
          {flash && <div className="pp-duel-pop" style={{ color: HIT_COLOR[flash.hit] }}>{HIT_LABEL[flash.hit]}</div>}
          {flash && flash.hit !== 'miss' && <div className="pp-duel-slash" />}
        </div>
      </div>

      <div className="pp-duel-strikes">
        {Array.from({ length: STRIKES }, (_, i) => (
          <span key={i} className={`pp-duel-pip${hits[i] ? ` is-${hits[i]}` : i === strike ? ' is-now' : ''}`}>{hits[i] === 'crit' ? '★' : hits[i] === 'hit' ? '✓' : hits[i] === 'miss' ? '✕' : i + 1}</span>
        ))}
      </div>

      <div className="pp-gauge" onPointerDown={strikeNow} role="presentation">
        <div className="pp-gauge__zone" style={{ left: `${zone}%`, width: `${ZONE_W}%` }}>
          <div className="pp-gauge__crit" style={{ left: `${((ZONE_W - CRIT_W) / 2 / ZONE_W) * 100}%`, width: `${(CRIT_W / ZONE_W) * 100}%` }} />
        </div>
        <div ref={cursorRef} className="pp-gauge__track"><div className="pp-gauge__cursor" /></div>
      </div>

      <button className="pp-btn pp-btn--big" style={{ width: '100%' }} disabled={busy || strike >= STRIKES}
        onPointerDown={e => { e.preventDefault(); strikeNow(); }} onClick={e => { if (e.detail === 0) strikeNow(); }}>
        ⚔ FRAPPER
      </button>
    </div>
  );
}
