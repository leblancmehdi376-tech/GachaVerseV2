'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { STAT, EV_PERFECT } from '@/lib/game/achievements';
import {
  useRandomEventStore, ARDEUR_DURATION_MS, ARDEUR_MAX_MULT, ARDEUR_GAIN_PER_CLICK,
  ARDEUR_DECAY_PER_SEC, ARDEUR_BUFF_MS, ARDEUR_MAX_GRACE_MS,
} from '@/store/randomEventStore';

// Ardeur = jauge de "chaleur" (0→1) qui MONTE à chaque clic mais REDESCEND en
// continu. Il faut donc marteler vite ET sans relâcher pour approcher le max.
export function ArdeurEvent() {
  const end             = useRandomEventStore(s => s.end);
  const setEventDpsMult = useGameStore(s => s.setEventDpsMult);
  const [heat, setHeat] = useState(0);           // copie de heatRef pour le rendu (mise à jour à chaque tick)
  const [timeLeft, setTimeLeft] = useState(ARDEUR_DURATION_MS);
  const heatRef = useRef(0);
  const peakRef = useRef(0);
  const joinedRef = useRef(false);
  const lastRef = useRef(0);       // instant jusqu'où la décroissance a été appliquée
  const fullUntilRef = useRef(0);  // jauge pleine : pas de décroissance avant cet instant

  const mult = 1 + (ARDEUR_MAX_MULT - 1) * heat;

  // Applique la décroissance écoulée jusqu'à `now` (en temps réel, pas par tick,
  // sinon la jauge ne peut jamais valoir 1 au moment où on la lit).
  const settle = (now: number) => {
    const from = heatRef.current >= 1 ? Math.max(lastRef.current, fullUntilRef.current) : lastRef.current;
    if (now > from) heatRef.current = Math.max(0, heatRef.current - ARDEUR_DECAY_PER_SEC * (now - from) / 1000);
    lastRef.current = Math.max(lastRef.current, now);
  };

  useEffect(() => {
    const start = Date.now();
    lastRef.current = start;
    const iv = setInterval(() => {
      const now = Date.now();
      const left = ARDEUR_DURATION_MS - (now - start);
      settle(left <= 0 ? start + ARDEUR_DURATION_MS : now);
      setHeat(heatRef.current);

      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        const finalMult = 1 + (ARDEUR_MAX_MULT - 1) * heatRef.current;
        if (heatRef.current > 0.02) setEventDpsMult(finalMult, ARDEUR_BUFF_MS);
        // Événement réussi parfaitement : jauge poussée au maximum.
        if (peakRef.current >= 0.99) useGameStore.getState().discover(EV_PERFECT.ardeur);
        end();
      }
    }, 60);
    return () => clearInterval(iv);
  }, [end, setEventDpsMult]);

  const hit = () => {
    const now = Date.now();
    settle(now);
    heatRef.current = Math.min(1, heatRef.current + ARDEUR_GAIN_PER_CLICK);
    if (heatRef.current >= 1) fullUntilRef.current = now + ARDEUR_MAX_GRACE_MS;
    peakRef.current = Math.max(peakRef.current, heatRef.current);
    setHeat(heatRef.current);
    if (!joinedRef.current) { joinedRef.current = true; useGameStore.getState().addStat(STAT.eventsJoined); }
  };

  const pct = Math.round(heat * 100);
  const hot = heat > 0.75;

  return (
    <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, background:'rgba(3,2,10,0.4)' }}>
      <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'#fb923c', letterSpacing:2, textShadow:'0 0 18px rgba(251,146,60,0.6)' }}>🔥 ARDEUR</div>
      <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-sub)' }}>
        Maintiens le rythme ! Boost actuel <strong style={{ color: hot ? '#fbbf24' : '#fb923c' }}>×{mult.toFixed(2)} DPS</strong>
      </div>

      {/* Jauge de chaleur */}
      <div style={{ width:260, height:14, borderRadius:7, background:'rgba(255,255,255,0.08)', overflow:'hidden', border:`1px solid ${hot ? '#fbbf24' : 'rgba(251,146,60,0.3)'}`, position:'relative' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#b45309,#fb923c,#fbbf24)', transition:'width 0.06s linear', boxShadow: hot ? '0 0 12px #fbbf24' : 'none' }} />
      </div>

      <button onClick={hit}
        style={{ width:150, height:150, borderRadius:'50%', border:`3px solid ${hot ? '#fbbf24' : '#fb923c'}`, cursor:'pointer',
          background:`radial-gradient(circle at 50% 35%, ${hot ? '#fbbf24' : '#fb923c'}, #b45309)`, color:'#fff',
          fontFamily:'var(--f-title)', fontWeight:900, fontSize:22.7, letterSpacing:1,
          boxShadow:`0 0 ${20 + pct*0.4}px rgba(251,146,60,0.7)`, transform:`scale(${1 + heat*0.08})`, transition:'transform 0.05s' }}>
        FRAPPE !
      </button>

      <div style={{ fontFamily:'var(--f-num)', fontSize:12, color:'var(--text-dim)' }}>{(timeLeft/1000).toFixed(1)}s</div>
    </div>
  );
}
