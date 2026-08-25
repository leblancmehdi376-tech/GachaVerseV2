'use client';

export function StatsCard({ maxPalierReached }: { maxPalierReached: number }) {
  return (
    <div className="panel" style={{ padding:'12px', flexShrink:0 }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'8px' }}>STATISTIQUES</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderTop:'1px solid var(--border)' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>Palier max atteint</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'16.5px', color:'var(--purple-glow)' }}>{maxPalierReached}</span>
      </div>
    </div>
  );
}
