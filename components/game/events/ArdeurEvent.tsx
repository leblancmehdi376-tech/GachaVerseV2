'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  useRandomEventStore, ARDEUR_DURATION_MS, ARDEUR_MAX_MULT, ARDEUR_GAIN_PER_CLICK,
  ARDEUR_DECAY_PER_SEC, ARDEUR_BUFF_MS,
} from '@/store/randomEventStore';

// Ardeur = jauge de "chaleur" (0→1) qui MONTE à chaque clic mais REDESCEND en
// continu. Il faut donc marteler vite ET sans relâcher pour approcher le max.
export function ArdeurEvent() {
  const end             = useRandomEventStore(s => s.end);
  const setEventDpsMult = useGameStore(s => s.setEventDpsMult);
  const [, setHeat] = useState(0);              // force un re-render à chaque tick (valeur lue via heatRef)
  const [timeLeft, setTimeLeft] = useState(ARDEUR_DURATION_MS);
  const heatRef = useRef(0);

  const mult = 1 + (ARDEUR_MAX_MULT - 1) * heatRef.current;

  useEffect(() => {
    const start = Date.now();
    let last = start;
    const iv = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000; last = now;
      // Décroissance continue de la jauge.
      heatRef.current = Math.max(0, heatRef.current - ARDEUR_DECAY_PER_SEC * dt);
      setHeat(heatRef.current);

      const left = ARDEUR_DURATION_MS - (now - start);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        const finalMult = 1 + (ARDEUR_MAX_MULT - 1) * heatRef.current;
        if (heatRef.current > 0.02) setEventDpsMult(finalMult, ARDEUR_BUFF_MS);
        end();
      }
    }, 60);
    return () => clearInterval(iv);
  }, [end, setEventDpsMult]);

  const hit = () => {
    heatRef.current = Math.min(1, heatRef.current + ARDEUR_GAIN_PER_CLICK);
    setHeat(heatRef.current);
  };

  const pct = Math.round(heatRef.current * 100);
  const hot = heatRef.current > 0.75;

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
          boxShadow:`0 0 ${20 + pct*0.4}px rgba(251,146,60,0.7)`, transform:`scale(${1 + heatRef.current*0.08})`, transition:'transform 0.05s' }}>
        FRAPPE !
      </button>

      <div style={{ fontFamily:'var(--f-num)', fontSize:12, color:'var(--text-dim)' }}>{(timeLeft/1000).toFixed(1)}s</div>
    </div>
  );
}
