'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  useRandomEventStore, TEMPETE_ORBES, TEMPETE_INTERVAL_MS, TEMPETE_ORB_LIFE_MS,
  TEMPETE_MULT_MIN, TEMPETE_MULT_MAX,
} from '@/store/randomEventStore';
import { bnMulScalar } from '@/lib/game/bignum';

interface Orb { id: number; x: number; y: number; mult: number; born: number; }

function randMult() {
  // pas de 0.1 entre min et max (ex: 1.1 → 2.5)
  const steps = Math.round((TEMPETE_MULT_MAX - TEMPETE_MULT_MIN) * 10);
  const m = TEMPETE_MULT_MIN + (Math.floor(Math.random() * (steps + 1)) / 10);
  return Math.round(m * 10) / 10;
}

export function TempeteEvent() {
  const end         = useRandomEventStore(s => s.end);
  const dealInstant = useGameStore(s => s.dealInstantDamage);
  const getTotalDps = useGameStore(s => s.getTotalDps);
  const [orb, setOrb] = useState<Orb | null>(null);   // UNE seule orbe à la fois
  const spawnedRef = useRef(0);
  const nextId = useRef(1);

  useEffect(() => {
    const spawn = () => {
      if (spawnedRef.current >= TEMPETE_ORBES) return;
      spawnedRef.current += 1;
      const o: Orb = { id: nextId.current++, x: 20 + Math.random()*58, y: 20 + Math.random()*48, mult: randMult(), born: Date.now() };
      setOrb(o);
      setTimeout(() => setOrb(cur => (cur && cur.id === o.id ? null : cur)), TEMPETE_ORB_LIFE_MS);
    };
    spawn();
    const iv = setInterval(spawn, TEMPETE_INTERVAL_MS);
    const endTimer = setTimeout(end, (TEMPETE_ORBES - 1) * TEMPETE_INTERVAL_MS + TEMPETE_ORB_LIFE_MS + 300);
    return () => { clearInterval(iv); clearTimeout(endTimer); };
  }, [end]);

  const pop = (o: Orb) => {
    setOrb(cur => (cur && cur.id === o.id ? null : cur));
    dealInstant(bnMulScalar(getTotalDps(), o.mult));
  };

  return (
    <div style={{ position:'absolute', inset:0, zIndex:20, pointerEvents:'none' }}>
      {/* Voile de neige léger */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(120% 80% at 50% 0%, rgba(103,232,249,0.10), transparent 60%)' }} />
      <div style={{ position:'absolute', top:12, left:0, right:0, textAlign:'center', fontFamily:'var(--f-title)', fontSize:15.5, fontWeight:800, color:'#a5f3fc', letterSpacing:2, textShadow:'0 0 16px rgba(165,243,252,0.7)' }}>
        ❄️ TEMPÊTE DE NEIGE
      </div>

      {orb && (
        <button key={orb.id} onClick={() => pop(orb)}
          style={{ position:'absolute', left:`${orb.x}%`, top:`${orb.y}%`, transform:'translate(-50%,-50%)',
            width:76, height:76, borderRadius:'50%', cursor:'pointer', pointerEvents:'auto', border:'2px solid #e0fbff',
            background:'radial-gradient(circle at 34% 28%, #ffffff, #bae6fd 55%, #38bdf8)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0,
            boxShadow:'0 0 26px rgba(165,243,252,0.9), inset 0 0 14px rgba(255,255,255,0.7)',
            animation:'tempeteFloat 2.2s ease-in-out infinite, tempetePop 0.25s ease-out' }}>
          <span style={{ fontSize:16.5, lineHeight:1, filter:'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}>❄️</span>
          <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:15.5, color:'#0e3a4a', lineHeight:1.1 }}>×{orb.mult.toFixed(1)}</span>
        </button>
      )}

      <style>{`
        @keyframes tempeteFloat { 0%,100%{ transform:translate(-50%,-50%) translateY(0) } 50%{ transform:translate(-50%,-50%) translateY(-7px) } }
        @keyframes tempetePop { from{ opacity:0; } to{ opacity:1; } }
      `}</style>
    </div>
  );
}
