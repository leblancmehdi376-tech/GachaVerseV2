'use client';
import { getPalierConfig } from '@/lib/game/paliers';
import { PALIER_DROPS } from '@/lib/game/expeditions';

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur de palier : voyager vers un palier déjà atteint pour re-farmer.
// Marque les paliers qui possèdent un drop exclusif (source d'expédition).
const DROPS_BY_PALIER: Record<number, { icon: string; name: string }[]> = (() => {
  const m: Record<number, { icon: string; name: string }[]> = {};
  for (const d of PALIER_DROPS) {
    (m[d.palier] ??= []).push({ icon: d.icon, name: d.name });
  }
  return m;
})();

export function PalierTravelModal({
  current, maxReached, onTravel, onClose,
}: {
  current: number; maxReached: number;
  onTravel: (p: number) => void; onClose: () => void;
}) {
  const paliers = Array.from({ length: maxReached }, (_, i) => i + 1);
  return (
    <div
      onClick={onClose}
      style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(3,2,8,0.82)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="panel panel--glow"
        style={{ width:'min(720px,100%)', maxHeight:'86%', display:'flex', flexDirection:'column', padding:0, overflow:'hidden' }}
      >
        {/* En-tête */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:700, color:'var(--purple-glow)', letterSpacing:2 }}>🗺 CARTE DES MONDES</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-sub)', letterSpacing:0.5 }}>
              Voyage vers un palier déjà atteint pour re-farmer coins &amp; ressources
            </span>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding:'6px 12px', fontSize:12.4 }}>✕</button>
        </div>

        {/* Grille des paliers */}
        <div style={{ overflowY:'auto', padding:16, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
          {paliers.map(p => {
            const cfg     = getPalierConfig(p);
            const drops   = DROPS_BY_PALIER[p] ?? [];
            const isHere  = p === current;
            return (
              <button
                key={p}
                onClick={() => { onTravel(p); onClose(); }}
                disabled={isHere}
                style={{
                  position:'relative', textAlign:'left', cursor:isHere?'default':'pointer',
                  background:isHere ? 'rgba(109,63,214,0.18)' : 'rgba(0,0,0,0.35)',
                  border:`1px solid ${isHere ? 'var(--purple-glow)' : cfg.accentColor + '44'}`,
                  borderRadius:10, padding:'10px 12px',
                  boxShadow:isHere ? '0 0 18px rgba(192,132,252,0.28)' : 'none',
                  transition:'transform 0.12s, box-shadow 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => { if (!isHere) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=cfg.accentColor; } }}
                onMouseLeave={e => { if (!isHere) { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor=cfg.accentColor+'44'; } }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:13.4, color:cfg.accentColor }}>P{p}</span>
                  {isHere && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:800, color:'var(--purple-glow)', letterSpacing:1, border:'1px solid var(--purple-glow)', borderRadius:4, padding:'1px 5px' }}>ICI</span>}
                  {drops.length > 0 && (
                    <span title={drops.map(d => d.name).join(', ')} style={{ marginLeft:'auto', fontSize:12.4, filter:'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }}>
                      {drops.map(d => d.icon).join('')}
                    </span>
                  )}
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'white', lineHeight:1.15, marginBottom:1 }}>{cfg.name}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-sub)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{cfg.universe}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
