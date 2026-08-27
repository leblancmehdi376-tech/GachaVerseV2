'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getUltimateDef } from '@/lib/game/ultimates';
import { parseInstanceKey } from '@/lib/game/editions';

// ── Overlay global (pour le texte par-dessus tout) ────────────────────────
// Gardé pour rétro-compatibilité mais vide maintenant
export function UltAnimation() {
  return null;
}

// ── Barre effets actifs dans la zone de combat ────────────────────────────
export function ActiveUltsBar() {
  const activeUlts = useGameStore(s => s.ultActiveUlts);
  const [, setTick] = useState(0);

  // Refresh chaque seconde pour le timer
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (activeUlts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, zIndex: 15, pointerEvents: 'none',
    }}>
      {activeUlts.map(a => {
        const adef = getUltimateDef(parseInstanceKey(a.templateId).templateId);
        if (!adef) return null;
        const remaining = Math.max(0, Math.round((a.endsAt - Date.now()) / 1000));
        const pct = (remaining / adef.duration) * 100;
        return (
          <div key={a.templateId} style={{
            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(168,85,247,0.6)',
            borderRadius: 8, padding: '5px 10px', minWidth: 88,
            boxShadow: '0 0 10px rgba(168,85,247,0.3)',
          }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#c084fc', marginBottom:3, whiteSpace:'nowrap' }}>
              ⚡ {adef.name}
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#7c3aed,#c084fc)', borderRadius:2, transition:'width 1s linear' }} />
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2, textAlign:'right' }}>{remaining}s</div>
          </div>
        );
      })}
    </div>
  );
}
