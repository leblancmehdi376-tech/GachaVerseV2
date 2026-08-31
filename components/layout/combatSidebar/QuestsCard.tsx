'use client';
import { useState } from 'react';
import { formatNumber } from '@/lib/game/format';

export function QuestsCard({ quests, claimQuest }: { quests: { id:string; icon:string; label:string; current:number; target:number; reward:number; rewardType:string; done:boolean }[]; claimQuest: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const claimableCount = (quests ?? []).filter(q => q.current >= q.target && !q.done).length;

  return (
    <div className="panel panel--flat" style={{ padding:'12px 14px', flex: collapsed ? '0 0 auto' : 1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <button onClick={() => setCollapsed(v => !v)}
        style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, marginBottom: collapsed ? 0 : '10px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--text-dim)', letterSpacing:'2px' }}>QUÊTES QUOTIDIENNES</span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          {claimableCount > 0 && (
            <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'12px', color:'#e9d5ff', background:'rgba(168,85,247,0.18)', borderRadius:'999px', padding:'1px 7px' }}>{claimableCount}</span>
          )}
          <span style={{ color:'var(--text-muted)', fontSize:'11px', transform: collapsed ? 'rotate(-90deg)' : 'none', transition:'transform 0.15s' }}>▾</span>
        </span>
      </button>
      {!collapsed && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
          {(quests ?? []).map(q => {
            const pct = Math.min((q.current/q.target)*100, 100);
            const canClaim = q.current >= q.target && !q.done;
            return (
              <div key={q.id} style={{ background:'var(--bg-card)', border:`1px solid ${canClaim?'rgba(168,85,247,0.4)':q.done?'rgba(74,222,128,0.2)':'transparent'}`, borderRadius:'8px', padding:'7px 10px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px', gap:'8px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                    <span style={{ fontSize:'13.4px', flexShrink:0 }}>{q.icon}</span>
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'12.4px', color:'var(--text-sub)', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.label}</span>
                  </div>
                  {q.done ? <span style={{ fontSize:'15.5px', flexShrink:0 }}>✅</span>
                    : canClaim ? (
                      <button onClick={() => claimQuest(q.id)}
                        style={{ background:'linear-gradient(135deg,#3b0764,#5b21b6)', border:'1px solid var(--purple)', borderRadius:'6px', padding:'6px 9px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'white', flexShrink:0, boxShadow:'0 0 8px rgba(124,58,237,0.35)', whiteSpace:'nowrap' }}>
                        RÉCUP
                      </button>
                    ) : (
                      <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--gold)', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', padding:'2px 7px', borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                        {q.rewardType==='gems'?'💎':'🪙'} {q.reward}
                      </span>
                    )
                  }
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:q.done?'linear-gradient(90deg,#166534,#4ade80)':'linear-gradient(90deg,#4c1d95,#a855f7)', borderRadius:'3px', transition:'width 0.3s', boxShadow:canClaim?'0 0 6px #a855f766':undefined }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-num)', fontSize:'11px', color:'var(--text-muted)', flexShrink:0 }}>{formatNumber(q.current)}/{formatNumber(q.target)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
