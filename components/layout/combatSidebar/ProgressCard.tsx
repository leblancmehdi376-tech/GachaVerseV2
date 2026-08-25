'use client';
import { getPalierPassGems } from '@/store/gameStore';
import { getPalierConfig } from '@/lib/game/paliers';

export function ProgressCard({ palier, wave, progressPct, cfg }: { palier: number; wave: number; progressPct: number; cfg: ReturnType<typeof getPalierConfig> }) {
  return (
    <div className="panel" style={{ padding:'14px', flexShrink:0 }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'10px' }}>PROGRESSION</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
        <div>
          <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', color:'var(--text-dim)', fontWeight:700 }}>PALIER {palier}</div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', color:'var(--text)', fontWeight:700, letterSpacing:'1px', marginTop:'2px', lineHeight:1.2 }}>{cfg.name}</div>
        </div>
        <div style={{ width:40, height:40, background:`${cfg.accentColor}18`, border:`1px solid ${cfg.accentColor}44`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20.6px' }}>📦</div>
      </div>
      <div className="prog-track" style={{ marginBottom:'6px' }}>
        <div className="prog-fill" style={{ width:`${progressPct}%` }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', fontWeight:600 }}>Vague {wave}/10</span>
        <span style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'var(--purple-glow)', fontWeight:700 }}>{progressPct}%</span>
      </div>
      <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 10px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>Récompense :</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'13.4px', color:'var(--cyan-hi)' }}>💎 ×{getPalierPassGems(palier)}</span>
      </div>
    </div>
  );
}
