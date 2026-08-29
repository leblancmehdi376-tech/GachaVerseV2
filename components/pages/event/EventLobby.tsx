'use client';
import { useGameStore } from '@/store/gameStore';
import { EVENT_BOSSES } from '@/lib/game/eventBoss';
import { getItemDef } from '@/lib/game/items';
import { formatNumber } from '@/lib/game/format';

const COMING_SOON_EVENTS = [
  { id:'coming_3', name:'COMING SOON', subtitle:'Prochain événement à venir...', accentColor:'rgba(255,255,255,0.2)', bgGradient:'linear-gradient(135deg,#0a0a14,#14101e)' },
];

export function EventLobby({ onSelect }: { onSelect: (id: string) => void }) {
  const now = Date.now();
  const { bossCrowns, nekoGems } = useGameStore();
  return (
    <div style={{ height:'100%', overflowY:'auto', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 20%,rgba(147,51,234,0.08),transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', maxWidth:1000, margin:'0 auto', padding:'28px 24px', display:'flex', flexDirection:'column', gap:28 }}>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:4, height:20, background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:2, boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:700, color:'#fbbf24', letterSpacing:'3px' }}>ÉVÉNEMENTS</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)' }}>
            Choisis un événement et affronte les boss pour obtenir des récompenses exclusives
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {[
            { icon:'👑', val:bossCrowns, label:'Boss Crowns', color:'#fbbf24' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Neko-Gemmes', color:'var(--cyan-hi)' },
          ].map((s,i) => (
            <div key={i} className="panel" style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22.7 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18.5, color:s.color }}>{s.val}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', fontWeight:700 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:14 }}>ÉVÉNEMENTS DISPONIBLES</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
            {EVENT_BOSSES.map(event => {
              const active   = event.availableUntil > now;
              const daysLeft = Math.max(0, Math.floor((event.availableUntil - now) / 86400000));
              return (
                <div key={event.id}
                  style={{ borderRadius:16, overflow:'hidden', position:'relative', cursor:active?'pointer':'default',
                    border:`1px solid ${active ? event.accentColor+'55' : 'var(--border)'}`,
                    boxShadow: active ? `0 0 24px ${event.accentColor}22, 0 8px 32px rgba(0,0,0,0.4)` : '0 4px 16px rgba(0,0,0,0.3)',
                    transition:'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { if(active){(e.currentTarget as HTMLElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 0 40px ${event.accentColor}44, 0 16px 40px rgba(0,0,0,0.5)`;}}}
                  onMouseLeave={e => {(e.currentTarget as HTMLElement).style.transform='translateY(0)';(e.currentTarget as HTMLElement).style.boxShadow=active?`0 0 24px ${event.accentColor}22, 0 8px 32px rgba(0,0,0,0.4)`:'0 4px 16px rgba(0,0,0,0.3)';}}>
                  <div style={{ position:'absolute', inset:0, background: event.bgGradient, opacity: active ? 1 : 0.5 }} />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.7) 100%)' }} />
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${event.accentColor},transparent)` }} />
                  <div style={{ position:'relative', padding:'22px 20px 20px', display:'flex', flexDirection:'column', gap:12, minHeight:220 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background: active?'rgba(74,222,128,0.15)':'rgba(248,113,113,0.15)', border:`1px solid ${active?'rgba(74,222,128,0.4)':'rgba(248,113,113,0.4)'}`, borderRadius:6, padding:'3px 10px' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background: active?'#4ade80':'#f87171', animation: active?'pulse 2s infinite':'none' }} />
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color: active?'#4ade80':'#f87171', letterSpacing:1 }}>{active ? 'ACTIF' : 'TERMINÉ'}</span>
                      </div>
                      {active && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>⏱ {daysLeft}j restants</span>}
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'white', letterSpacing:2, marginBottom:5, textShadow:`0 0 20px ${event.accentColor}88` }}>{event.name}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:700, letterSpacing:1, marginBottom:6 }}>{event.subtitle}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>{event.description}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {event.dropTable.filter(e => e.result.type !== 'nothing').slice(0,4).map((entry, i) => {
                        const r = entry.result;
                        const item = r.type==='item'&&r.id ? getItemDef(r.id) : null;
                        const icon = r.type==='gems'?'💎':r.type==='bossCrowns'?'👑':(item?.icon ?? '📦');
                        const label = item?.name ?? (r.type==='gems'?`${r.qty}💎`:r.type==='bossCrowns'?`${r.qty}👑`:'Objet');
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.08)', border:`1px solid ${item?item.color+'44':'rgba(255,255,255,0.12)'}`, borderRadius:6, padding:'3px 8px' }}>
                            <span style={{ fontSize:12 }}>{icon}</span>
                            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color: item?item.color:'rgba(255,255,255,0.7)' }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => active && onSelect(event.id)} disabled={!active}
                      className={active ? 'btn-primary' : 'btn-secondary'}
                      style={{ marginTop:'auto', padding:'12px', fontSize:14.4, letterSpacing:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor: active ? 'pointer' : 'not-allowed', opacity: active ? 1 : 0.4 }}>
                      {active ? <>⚔ ENTRER</> : '✕ TERMINÉ'}
                    </button>
                  </div>
                </div>
              );
            })}

            {COMING_SOON_EVENTS.map(ev => (
              <div key={ev.id} style={{ borderRadius:16, overflow:'hidden', position:'relative', border:'1px solid rgba(255,255,255,0.08)', background:'linear-gradient(135deg,#0a0a14,#14101e)', minHeight:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }} />
                <span style={{ fontSize:41.2, opacity:0.3 }}>🔒</span>
                <div style={{ textAlign:'center', padding:'0 20px' }}>
                  <div style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:3, marginBottom:8 }}>COMING SOON</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.2)' }}>Prochain événement bientôt disponible...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
