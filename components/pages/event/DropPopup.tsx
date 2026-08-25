'use client';
import { useEffect } from 'react';
import { DropResult } from '@/lib/game/eventBoss';
import { describeDrop } from './eventBattleHelpers';

export function DropPopup({ drops, onClose }: { drops: DropResult[]; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  const rewards = drops.map(describeDrop);
  const mainColor = rewards[0]?.color ?? '#c084fc';
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.85)', animation:'fadeIn 0.3s ease' }} onClick={onClose}>
      <div style={{ background:`linear-gradient(135deg,#0d0720,${mainColor}22)`, border:`2px solid ${mainColor}`, borderRadius:16, padding:'32px 40px', textAlign:'center', boxShadow:`0 0 50px ${mainColor}66`, animation:'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)', display:'flex', flexDirection:'column', gap:18 }}>
        {rewards.map((r, i) => (
          <div key={i}>
            <div style={{ fontSize:i===0?56:36, marginBottom:8 }}>{r.icon}</div>
            <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:i===0?22:16, color:r.color, marginBottom:4 }}>{r.title}</div>
            {r.sub && <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'rgba(255,255,255,0.5)' }}>{r.sub}</div>}
          </div>
        ))}
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)' }}>Cliquez pour fermer</div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
