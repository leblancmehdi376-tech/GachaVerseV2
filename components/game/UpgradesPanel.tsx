'use client';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';

export function UpgradesPanel() {
  const { getTotalDps, pixelCoins } = useGameStore();
  const dps = getTotalDps();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'6px', height:'100%' }}>
      {[
        { icon:'🔥', label:'DPS Passif',     sub:'Alliés équipés',             val: formatNumber(dps) },
      ].map(r => (
        <div key={r.label} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 10px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'6px' }}>
          <div style={{ width:32, height:32, background:'rgba(255,255,255,0.04)', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16.5px', flexShrink:0 }}>{r.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)' }}>{r.label}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'11.3px', color:'var(--text-dim)' }}>{r.sub}</div>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:900, fontSize:'22.7px', color:'var(--text)' }}>{r.val}</div>
        </div>
      ))}
    </div>
  );
}
