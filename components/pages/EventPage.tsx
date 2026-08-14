'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore, bumpBossQuests } from '@/store/gameStore';
import { useUltimateStore } from '@/store/ultimateStore';
import { EVENT_BOSSES, rollEventDrop, getEventBossMaxHp, EventBossDef, DropResult } from '@/lib/game/eventBoss';
import { getItemDef, getEquipmentDef } from '@/lib/game/items';
import { getCharacterById } from '@/lib/game/characters';
import { RARITY_CONFIG } from '@/types/game';
import { calculateEquippedTeamDps } from '@/lib/game/dpsCalculation';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { formatNumber } from '@/lib/game/format';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';
import { EventMusicPlayer } from '@/components/game/EventMusicPlayer';
import { useAntiAutoclick } from '@/hooks/useAntiAutoclick';

function EventBg({ boss }: { boss: EventBossDef }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(boss.bgImagePath));
  if (failed || !src) return <div style={{ position:'absolute', inset:0, background: boss.bgGradient }} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={onError}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', imageRendering:'pixelated' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.2) 30%,rgba(0,0,0,0.3) 60%,rgba(0,0,0,0.85) 100%)' }} />
    </>
  );
}

function BossSprite({ boss, deadStyle }: { boss: EventBossDef; deadStyle: boolean }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(stripKnownExtension(boss.spritePath)));
  if (failed || !src) return (
    <div style={{ width:240, height:320, background:'radial-gradient(circle,#3b0764,#0d0520)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:80, filter:'drop-shadow(0 0 20px #c084fc)' }}>👤</span>
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={boss.name}
      style={{ width:240, height:320, objectFit:'contain', imageRendering:'pixelated', filter: deadStyle ? 'grayscale(1) brightness(0.3)' : undefined }}
      onError={onError} />
  );
}

function DropPopup({ drop, onClose }: { drop: DropResult; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose]);
  let icon = '💨', title = 'Rien cette fois...', sub = '', color = 'var(--text-dim)';
  if (drop.type === 'character' && drop.id) {
    const tpl = getCharacterById(drop.id); const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : RARITY_CONFIG['C'];
    icon = '🃏'; title = tpl?.name ?? drop.id; sub = cfg.label; color = cfg.color;
  } else if (drop.type === 'item' && drop.id) {
    const item = getItemDef(drop.id); icon = item?.icon ?? '📦'; title = item?.name ?? drop.id; sub = "Objet d'évolution"; color = item?.color ?? '#c084fc';
  } else if (drop.type === 'gems') { icon = '💎'; title = `+${drop.qty} Gemmes`; color = 'var(--cyan)';
  } else if (drop.type === 'bossCrowns') { icon = '👑'; title = `+${drop.qty} BossCrowns`; color = '#fbbf24'; }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.85)', animation:'fadeIn 0.3s ease' }} onClick={onClose}>
      <div style={{ background:`linear-gradient(135deg,#0d0720,${color}22)`, border:`2px solid ${color}`, borderRadius:16, padding:'32px 40px', textAlign:'center', boxShadow:`0 0 50px ${color}66`, animation:'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ fontSize:56, marginBottom:12 }}>{icon}</div>
        {drop.type === 'character' && drop.id && getCharacterById(drop.id) && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
            <CharacterCardThumb templateId={drop.id} name={getCharacterById(drop.id)!.name} rarity={getCharacterById(drop.id)!.rarity} width={100} height={140} />
          </div>
        )}
        <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:22, color, marginBottom:6 }}>{title}</div>
        {sub && <div style={{ fontFamily:'var(--f-ui)', fontSize:13, color:'rgba(255,255,255,0.5)' }}>{sub}</div>}
        <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:16 }}>Cliquez pour fermer</div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

interface Dmg { id: number; x: number; y: number; val: number; crit: boolean; }

function ApologyOverlayEvent({ strikeLevel, onSubmit }: { strikeLevel: number; detectionReason: string; onSubmit: (t: string) => Promise<void> }) {
  const [text, setText] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const MIN = 80; const strikeColor = strikeLevel >= 3 ? '#f87171' : strikeLevel === 2 ? '#fb923c' : '#fbbf24';
  const handleSubmit = async () => {
    if (text.trim().length < MIN) { setError(`Au moins ${MIN} caractères.`); return; }
    setSending(true); await onSubmit(text); setSending(false);
  };
  return (
    <div style={{ position:'absolute', inset:0, zIndex:30, background:'rgba(4,3,16,0.98)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0, padding:'24px 20px', overflowY:'auto' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>🤖</div>
      <div style={{ fontFamily:'var(--f-title)', fontSize:17, fontWeight:800, color:'#f87171', letterSpacing:2, marginBottom:6 }}>AUTOCLICK DÉTECTÉ</div>
      <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginBottom:14, background:`${strikeColor}18`, border:`1px solid ${strikeColor}66`, borderRadius:8, padding:'4px 14px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:11, color:strikeColor, letterSpacing:1 }}>STRIKE {strikeLevel}</span>
      </div>
      <div style={{ width:'100%', maxWidth:420, marginBottom:10 }}>
        <textarea value={text} onChange={e => { setText(e.target.value); setError(''); }} placeholder="Bonjour, je reconnais avoir utilisé un autoclick..." rows={5}
          style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${error?'rgba(239,68,68,0.6)':'rgba(255,255,255,0.12)'}`, borderRadius:8, padding:'10px 12px', resize:'vertical', fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.85)', lineHeight:1.6, outline:'none' }} />
        {error && <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'#f87171', marginTop:6 }}>{error}</div>}
      </div>
      <button onClick={handleSubmit} disabled={sending || text.trim().length < MIN} className="btn-primary"
        style={{ width:'100%', maxWidth:420, padding:'12px 20px', opacity:(sending||text.trim().length<MIN)?0.45:1, cursor:(sending||text.trim().length<MIN)?'not-allowed':'pointer' }}>
        {sending ? '⏳ ENVOI...' : '✉️ ENVOYER MES EXCUSES'}
      </button>
    </div>
  );
}

const COMING_SOON_EVENTS = [
  { id:'coming_3', name:'COMING SOON', subtitle:'Prochain événement à venir...', accentColor:'rgba(255,255,255,0.2)', bgGradient:'linear-gradient(135deg,#0a0a14,#14101e)' },
];

function EventLobby({ onSelect }: { onSelect: (id: string) => void }) {
  const now = Date.now();
  const { bossCrowns, nekoGems } = useGameStore();
  return (
    <div style={{ height:'100%', overflowY:'auto', background:'var(--bg-void)', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 20%,rgba(147,51,234,0.08),transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', maxWidth:1000, margin:'0 auto', padding:'28px 24px', display:'flex', flexDirection:'column', gap:28 }}>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:4, height:20, background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:2, boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:20, fontWeight:700, color:'#fbbf24', letterSpacing:'3px' }}>ÉVÉNEMENTS</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>
            Choisis un événement et affronte les boss pour obtenir des récompenses exclusives
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {[
            { icon:'👑', val:bossCrowns, label:'Boss Crowns', color:'#fbbf24' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Neko-Gemmes', color:'var(--cyan-hi)' },
          ].map((s,i) => (
            <div key={i} className="panel" style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18, color:s.color }}>{s.val}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:10, color:'var(--text-dim)', fontWeight:700 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:11, color:'var(--text-dim)', letterSpacing:2, marginBottom:14 }}>ÉVÉNEMENTS DISPONIBLES</div>
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
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:9, fontWeight:700, color: active?'#4ade80':'#f87171', letterSpacing:1 }}>{active ? 'ACTIF' : 'TERMINÉ'}</span>
                      </div>
                      {active && <span style={{ fontFamily:'var(--f-ui)', fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>⏱ {daysLeft}j restants</span>}
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--f-title)', fontSize:20, fontWeight:900, color:'white', letterSpacing:2, marginBottom:5, textShadow:`0 0 20px ${event.accentColor}88` }}>{event.name}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:700, letterSpacing:1, marginBottom:6 }}>{event.subtitle}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>{event.description}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {event.dropTable.filter(e => e.result.type !== 'nothing').slice(0,4).map((entry, i) => {
                        const r = entry.result;
                        const tpl = r.type==='character'&&r.id ? getCharacterById(r.id) : null;
                        const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : null;
                        const icon = r.type==='gems'?'💎':r.type==='bossCrowns'?'👑':r.type==='character'?'🃏':'📦';
                        const label = tpl?.name ?? (r.type==='gems'?`${r.qty}💎`:r.type==='bossCrowns'?`${r.qty}👑`:'Objet');
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.08)', border:`1px solid ${cfg?cfg.color+'44':'rgba(255,255,255,0.12)'}`, borderRadius:6, padding:'3px 8px' }}>
                            <span style={{ fontSize:11 }}>{icon}</span>
                            <span style={{ fontFamily:'var(--f-ui)', fontSize:10, fontWeight:700, color: cfg?cfg.color:'rgba(255,255,255,0.7)' }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => active && onSelect(event.id)} disabled={!active}
                      className={active ? 'btn-primary' : 'btn-secondary'}
                      style={{ marginTop:'auto', padding:'12px', fontSize:14, letterSpacing:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor: active ? 'pointer' : 'not-allowed', opacity: active ? 1 : 0.4 }}>
                      {active ? <>⚔ ENTRER</> : '✕ TERMINÉ'}
                    </button>
                  </div>
                </div>
              );
            })}

            {COMING_SOON_EVENTS.map(ev => (
              <div key={ev.id} style={{ borderRadius:16, overflow:'hidden', position:'relative', border:'1px solid rgba(255,255,255,0.08)', background:'linear-gradient(135deg,#0a0a14,#14101e)', minHeight:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }} />
                <span style={{ fontSize:40, opacity:0.3 }}>🔒</span>
                <div style={{ textAlign:'center', padding:'0 20px' }}>
                  <div style={{ fontFamily:'var(--f-title)', fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:3, marginBottom:8 }}>COMING SOON</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.2)' }}>Prochain événement bientôt disponible...</div>
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

function EventBattle({ bossId, onBack }: { bossId: string; onBack: () => void }) {
  const { getHeroDpc, addItem, nekoGems, bossCrowns, collection, equippedTeam } = useGameStore();
  const { registerClick, getClickDpcMultiplier, consumeNextClickMultiplier, getActiveEnemyDamageTakenMultiplier } = useUltimateStore();
  const { checkClick, isBlocked, strikeLevel, detectionReason, submitApology } = useAntiAutoclick();

  const boss = useMemo(() => EVENT_BOSSES.find(b => b.id === bossId) ?? EVENT_BOSSES[0], [bossId]);
  const totalEquippedDps = useMemo(() => calculateEquippedTeamDps(equippedTeam, collection), [equippedTeam, collection]);
  
  const [maxHp, setMaxHp] = useState(() => getEventBossMaxHp(boss, getHeroDpc() + totalEquippedDps));
  const [hp, setHp] = useState(maxHp);
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [hit, setHit] = useState(false);
  const [drop, setDrop] = useState<DropResult | null>(null);
  const [dead, setDead] = useState(false);
  const [kills, setKills] = useState(0);
  const now = Date.now();

  useEffect(() => {
    const freshMax = getEventBossMaxHp(boss, getHeroDpc() + totalEquippedDps);
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrop(null);
  }, [boss, getHeroDpc, totalEquippedDps]);

  useEffect(() => {
    if (dead) return;
    const id = setInterval(() => {
      const dps = totalEquippedDps * getActiveEnemyDamageTakenMultiplier();
      if (dps > 0) setHp(h => Math.max(0, h - dps));
    }, 1000);
    return () => clearInterval(id);
  }, [dead, totalEquippedDps, getActiveEnemyDamageTakenMultiplier]);

  useEffect(() => {
    if (hp <= 0 && !dead) {
      setDead(true);
      const result = rollEventDrop(boss.id);
      useGameStore.setState(s => {
        const questUpdate = bumpBossQuests(s.quests, s.weeklyQuests, s.eventQuests);
        return {
          quests: questUpdate.quests,
          weeklyQuests: questUpdate.weeklyQuests,
          eventQuests: questUpdate.eventQuests,
          totalBossKills: s.totalBossKills + 1,
          ...(result.type === 'gems' ? { nekoGems: s.nekoGems + (result.qty ?? 0) } : {}),
          ...(result.type === 'bossCrowns' ? { bossCrowns: s.bossCrowns + (result.qty ?? 0) } : {}),
        };
      });
      if (result.type === 'character' && result.id) useGameStore.getState().addToCollection(result.id);
      else if (result.type === 'item' && result.id) addItem(result.id, result.qty ?? 1);
      setTimeout(() => setDrop(result), 800);
    }
  }, [hp, dead, addItem, boss]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dead) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!checkClick(pos)) return;
    registerClick();
    const finalDmg = Math.max(1, Math.floor(getHeroDpc() * getClickDpcMultiplier() * consumeNextClickMultiplier() * getActiveEnemyDamageTakenMultiplier() * (Math.random() < 0.08 ? 1.5 : 1)));
    const crit = Math.random() < 0.08;
    setHp(h => Math.max(0, h - finalDmg));
    setHit(true); setTimeout(() => setHit(false), 150);
    const d: Dmg = { id: Date.now() + Math.random(), x: pos.x, y: pos.y, val: finalDmg, crit };
    setDmgs(p => [...p, d]);
    setTimeout(() => setDmgs(p => p.filter(x => x.id !== d.id)), 800);
  }, [dead, checkClick, getHeroDpc, getClickDpcMultiplier, consumeNextClickMultiplier, getActiveEnemyDamageTakenMultiplier, registerClick]);

  const respawn = () => {
    const freshMax = getEventBossMaxHp(boss, getHeroDpc() + totalEquippedDps);
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrop(null); setKills(k => k + 1);
  };

  const hpPct   = Math.max(0, hp / maxHp * 100);
  const hpColor = hpPct > 50 ? '#c084fc' : hpPct > 20 ? '#f87171' : '#ff4040';

  return (
    <div style={{ height:'100%', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
      <EventBg boss={boss} />
      <EventMusicPlayer />
      {drop && <DropPopup drop={drop} onClose={() => { setDrop(null); respawn(); }} />}

      <div style={{ position:'relative', padding:'10px 16px', borderBottom:'1px solid rgba(192,132,252,0.12)', background:'rgba(0,0,0,0.45)', flexShrink:0, display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={onBack}
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'7px 14px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, letterSpacing:1, display:'flex', alignItems:'center', gap:6, flexShrink:0, transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color='white'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)'; }}>
          ← ÉVÉNEMENTS
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: boss.availableUntil > now ? '#4ade80' : '#f87171', animation:'pulse 2s infinite' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:16, fontWeight:900, color:'white', letterSpacing:2 }}>{boss.name.toUpperCase()}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>{boss.subtitle}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {[
            { icon:'⚔', val:kills, label:'Victoires' },
            { icon:'👑', val:bossCrowns, label:'Crowns' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Gemmes' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:15, color:'white' }}>{s.icon} {s.val}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:9, color:'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px', gap:24, overflow:'hidden' }}>
        {isBlocked && <ApologyOverlayEvent strikeLevel={strikeLevel} detectionReason={detectionReason} onSubmit={submitApology} />}
        <div style={{ width:'100%', maxWidth:600 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13, color:'white' }}>{boss.name}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13, color:hpColor }}>{formatNumber(Math.max(0, hp))} / {formatNumber(maxHp)}</span>
          </div>
          <div style={{ height:16, background:'rgba(255,255,255,0.08)', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ height:'100%', width:`${hpPct}%`, background:`linear-gradient(90deg,${hpColor}aa,${hpColor})`, borderRadius:8, transition:'width 0.3s ease', boxShadow:`0 0 12px ${hpColor}66` }} />
          </div>
        </div>
        <div onClick={handleClick} style={{ position:'relative', cursor:dead?'default':'crosshair', userSelect:'none', filter: hit?'brightness(2) saturate(0)':dead?'grayscale(1) brightness(0.3)':'none', transition:'filter 0.1s' }}>
          <BossSprite boss={boss} deadStyle={dead} />
          {dmgs.map(d => (
            <div key={d.id} style={{ position:'absolute', left:d.x, top:d.y, pointerEvents:'none', fontFamily:'var(--f-ui)', fontWeight:900, fontSize:d.crit?20:14, color:d.crit?'#fbbf24':'#c084fc', textShadow:d.crit?'0 0 10px #fbbf24':'0 0 6px #c084fc', animation:'floatUp 0.8s ease forwards', whiteSpace:'nowrap', zIndex:10 }}>
              {d.crit ? '⚡ ' : ''}{formatNumber(d.val)}
            </div>
          ))}
          {hit && <div style={{ position:'absolute', inset:0, borderRadius:16, background:'rgba(255,0,0,0.3)', pointerEvents:'none' }} />}
          {dead && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:22, color:'#c084fc', textShadow:'0 0 20px #c084fc', letterSpacing:2 }}>VAINCU</div>
            </div>
          )}
        </div>
        {dead && !drop && <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13, color:'rgba(255,255,255,0.5)', animation:'pulse 1s infinite' }}>Calcul des récompenses...</div>}
        {!dead && <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>Clique sur le boss · Tes alliés attaquent automatiquement</div>}
      </div>

      <div style={{ position:'relative', padding:'10px 24px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.3)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:8, letterSpacing:1 }}>RÉCOMPENSES POSSIBLES</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {boss.dropTable.filter(e => e.result.type !== 'nothing').map((entry, i) => {
            const totalWeight = boss.dropTable.reduce((s, x) => s + x.weight, 0);
            const rate = `${Math.round(entry.weight / totalWeight * 1000) / 10}%`;
            const r = entry.result;
            const tpl = r.type==='character'&&r.id ? getCharacterById(r.id) : null;
            const icon = r.type==='gems'?'💎':r.type==='bossCrowns'?'👑':r.type==='character'?'🃏':'📦';
            const label = tpl?.name ?? (r.type==='gems'?`Gemmes ×${r.qty}`:r.type==='bossCrowns'?`Crowns ×${r.qty}`:'Objet');
            const color = tpl ? RARITY_CONFIG[tpl.rarity]?.color : r.type==='gems'?'var(--cyan-hi)':r.type==='bossCrowns'?'#fbbf24':'#c084fc';
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'4px 10px', border:`1px solid ${color}33` }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:11, color: color ?? '#c084fc' }}>{label}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:10, color:'rgba(255,255,255,0.3)' }}>{rate}</span>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-60px) scale(1.3)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

export function EventPage() {
  const [view, setView]     = useState<'lobby' | 'battle'>('lobby');
  const [bossId, setBossId] = useState<string | null>(null);

  const handleSelect = (id: string) => { setBossId(id); setView('battle'); };
  const handleBack   = ()          => { setView('lobby'); setBossId(null); };

  if (view === 'battle' && bossId) return <EventBattle bossId={bossId} onBack={handleBack} />;
  return <EventLobby onSelect={handleSelect} />;
}
