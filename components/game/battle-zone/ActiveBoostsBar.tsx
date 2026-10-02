'use client';
import { useGameStore } from '@/store/gameStore';
import { useNow } from '@/hooks/useNow';

// ── Barre des boosts BossCrown actifs (+20% DPS / +20% Or) ───────────────
export function ActiveBoostsBar() {
  const { dpsBoostEndsAt, goldBoostEndsAt, isDpsBoostActive, isGoldBoostActive } = useGameStore();
  const now = useNow();

  const dpsActive  = isDpsBoostActive();
  const goldActive = isGoldBoostActive();
  if (!dpsActive && !goldActive) return null;

  const fmt = (endsAt: number) => {
    const s = Math.max(0, Math.ceil((endsAt - now) / 1000));
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  };

  return (
    <div style={{ position:'relative', zIndex:3, display:'flex', gap:8, padding:'0 18px 8px', flexShrink:0 }}>
      {dpsActive && (
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.4)', borderRadius:8, padding:'4px 10px' }}>
          <span style={{ fontSize:14.4 }}>⚡</span>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'#f87171' }}>+20% DPS — {fmt(dpsBoostEndsAt)}</span>
        </div>
      )}
      {goldActive && (
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:8, padding:'4px 10px' }}>
          <span style={{ fontSize:14.4 }}>💰</span>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'#4ade80' }}>+20% Or — {fmt(goldBoostEndsAt)}</span>
        </div>
      )}
    </div>
  );
}
