'use client';
import { formatNumber } from '@/lib/game/format';

export function QuestsCard({ quests, claimQuest }: { quests: { id:string; icon:string; label:string; current:number; target:number; reward:number; rewardType:string; done:boolean }[]; claimQuest: (id: string) => void }) {
  return (
    <div className="panel" style={{ padding:'14px', flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'10px', flexShrink:0 }}>QUÊTES QUOTIDIENNES</div>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
        {(quests ?? []).map(q => {
          const pct = Math.min((q.current/q.target)*100, 100);
          const canClaim = q.current >= q.target && !q.done;
          return (
            <div key={q.id} style={{ background:'var(--bg-card)', border:`1px solid ${canClaim?'rgba(168,85,247,0.4)':q.done?'rgba(74,222,128,0.2)':'var(--border)'}`, borderRadius:'8px', padding:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'7px', gap:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                  <span style={{ fontSize:'14.4px', flexShrink:0 }}>{q.icon}</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'12.4px', color:'var(--text-sub)', lineHeight:1.3 }}>{q.label}</span>
                </div>
                {q.done ? <span style={{ fontSize:'16.5px', flexShrink:0 }}>✅</span>
                  : canClaim ? (
                    <button onClick={() => claimQuest(q.id)}
                      style={{ background:'linear-gradient(135deg,#3b0764,#5b21b6)', border:'1px solid var(--purple)', borderRadius:'6px', padding:'8px 10px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'white', flexShrink:0, boxShadow:'0 0 8px rgba(124,58,237,0.35)', whiteSpace:'nowrap' }}>
                      RÉCUP
                    </button>
                  ) : (
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--gold)', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', padding:'2px 7px', borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                      {q.rewardType==='gems'?'💎':'🪙'} {q.reward}
                    </span>
                  )
                }
              </div>
              <div style={{ height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden', marginBottom:'4px' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:q.done?'linear-gradient(90deg,#166534,#4ade80)':'linear-gradient(90deg,#4c1d95,#a855f7)', borderRadius:'3px', transition:'width 0.3s', boxShadow:canClaim?'0 0 6px #a855f766':undefined }} />
              </div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', textAlign:'right', fontWeight:600 }}>{formatNumber(q.current)}/{formatNumber(q.target)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
