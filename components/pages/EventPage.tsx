'use client';
import { useState, useEffect, useMemo } from 'react';
import { useGameStore, bumpBossQuests } from '@/store/gameStore';
import { useUltimateStore } from '@/store/ultimateStore';
import { useExpeditionStore } from '@/store/expeditionStore';
import { useAchievementStore } from '@/store/achievementStore';
import { TITLE_GOLD_BONUS_PCT } from '@/lib/game/titles';
import { EVENT_BOSSES, rollEventDrop, getEventBossMaxHp, EventBossDef, DropResult } from '@/lib/game/eventBoss';
import { getItemDef } from '@/lib/game/items';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { makeInstanceKey, parseInstanceKey } from '@/lib/game/editions';
import { Affinity, AFFINITY_ORDER, AFFINITY_CONFIG, affinityMatchupKind, getAffinityForId } from '@/lib/game/affinities';
import { calculateEquippedTeamDps } from '@/lib/game/dpsCalculation';
import { formatNumber } from '@/lib/game/format';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';
import { EventMusicPlayer } from '@/components/game/EventMusicPlayer';
import { requestUrgentSave } from '@/hooks/useCloudSave';

// ── Compagnons d'event : jusqu'à 3 alliés hors équipe/expédition qui
// influencent la durée du combat selon leur type vs celui (aléatoire) du boss.
const MAX_EVENT_COMPANIONS = 3;
const COMPANION_DURATION_STEP = 0.10; // ±10% par compagnon fort/faible

function rollBossAffinity(): Affinity {
  return AFFINITY_ORDER[Math.floor(Math.random() * AFFINITY_ORDER.length)];
}

function computeDurationMult(companionIds: string[], bossAffinity: Affinity): number {
  let mult = 1;
  for (const cid of companionIds) {
    const kind = affinityMatchupKind(getAffinityForId(cid), bossAffinity);
    if (kind === 'strong') mult -= COMPANION_DURATION_STEP;
    else if (kind === 'weak') mult += COMPANION_DURATION_STEP;
  }
  return Math.max(0.1, mult);
}

function CompanionSelector({ bossAffinity, selected, onToggle, onClose }: {
  bossAffinity: Affinity;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const { collection, equippedTeam } = useGameStore();
  const { isCharOnExpedition } = useExpeditionStore();

  const equippedPure = equippedTeam.filter((t): t is string => !!t).map(t => parseInstanceKey(t).templateId);
  const owned = CHARACTER_POOL.filter(c => !c.isHero &&
    (['base', 'gold', 'diamond'] as const).some(ed => !!collection[makeInstanceKey(c.id, ed)]));

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ width:'100%', maxWidth:640, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:'var(--purple-glow)', letterSpacing:2 }}>🤝 Compagnons ({selected.length}/{MAX_EVENT_COMPANIONS})</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
              Boss : <span style={{ color:AFFINITY_CONFIG[bossAffinity].color, fontWeight:700 }}>{AFFINITY_CONFIG[bossAffinity].icon} {AFFINITY_CONFIG[bossAffinity].label}</span>
              — un type fort réduit le combat de 10%, un type faible l&apos;allonge de 10%
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:20.6 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {owned.map(tpl => {
            const onExpedition = isCharOnExpedition(tpl.id);
            const inTeam = equippedPure.includes(tpl.id);
            const isSelected = selected.includes(tpl.id);
            const disabled = onExpedition || inTeam || (!isSelected && selected.length >= MAX_EVENT_COMPANIONS);
            const affinity = getAffinityForId(tpl.id);
            const cfg = AFFINITY_CONFIG[affinity];
            const kind = affinityMatchupKind(affinity, bossAffinity);
            const kindLabel = kind === 'strong' ? '▲ -10% durée' : kind === 'weak' ? '▼ +10% durée' : '● neutre';
            const kindColor = kind === 'strong' ? '#4ade80' : kind === 'weak' ? '#f87171' : 'var(--text-dim)';
            return (
              <button key={tpl.id} onClick={() => !disabled && onToggle(tpl.id)}
                style={{ padding:'10px 8px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
                  background: isSelected ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? cfg.color+'66' : 'var(--border)'}`,
                  opacity: disabled ? 0.4 : 1,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  boxShadow: isSelected ? `0 0 14px ${cfg.glow}44` : 'none',
                  transition:'all 0.15s' }}>
                <span style={{ fontSize:20.6 }}>{isSelected ? '✅' : cfg.icon}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color: isSelected ? cfg.color : 'var(--text)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:kindColor, fontWeight:700 }}>{kindLabel}</div>
                {onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#fb923c' }}>EN MISSION</span>}
                {inTeam && !onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#60a5fa' }}>DANS L&apos;ÉQUIPE</span>}
              </button>
            );
          })}
          {owned.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--f-ui)', fontSize:12.4, padding:24 }}>
              Aucun personnage disponible.
            </div>
          )}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding:'10px 24px', fontSize:13.4 }}>VALIDER</button>
        </div>
      </div>
    </div>
  );
}

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
      <span style={{ fontSize:82.4, filter:'drop-shadow(0 0 20px #c084fc)' }}>👤</span>
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={boss.name}
      style={{ width:240, height:320, objectFit:'contain', imageRendering:'pixelated', filter: deadStyle ? 'grayscale(1) brightness(0.3)' : undefined }}
      onError={onError} />
  );
}

function describeDrop(drop: DropResult): { icon: string; title: string; sub: string; color: string } {
  if (drop.type === 'item' && drop.id) {
    const item = getItemDef(drop.id);
    const qty = drop.qty ?? 1;
    return {
      icon: item?.icon ?? '📦',
      title: item?.isCoin ? `+${qty} ${item.name}` : (item?.name ?? drop.id),
      sub: item?.isCoin ? "Monnaie d'événement" : "Objet d'évolution",
      color: item?.color ?? '#c084fc',
    };
  }
  if (drop.type === 'gems') return { icon: '💎', title: `+${drop.qty} Gemmes`, sub: '', color: 'var(--cyan)' };
  if (drop.type === 'bossCrowns') return { icon: '👑', title: `+${drop.qty} BossCrowns`, sub: '', color: '#fbbf24' };
  if (drop.type === 'title' && drop.id) {
    return { icon: '🏆', title: `Titre : ${drop.id}`, sub: `+${TITLE_GOLD_BONUS_PCT[drop.id] ?? 0}% d'or (équipable)`, color: '#fbbf24' };
  }
  return { icon: '💨', title: 'Rien cette fois...', sub: '', color: 'var(--text-dim)' };
}

function DropPopup({ drops, onClose }: { drops: DropResult[]; onClose: () => void }) {
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

interface Dmg { id: number; x: number; y: number; val: number; crit: boolean; }

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

function EventBattle({ bossId, onBack }: { bossId: string; onBack: () => void }) {
  const { addItem, nekoGems, bossCrowns, collection, equippedTeam } = useGameStore();
  const { getActiveEnemyDamageTakenMultiplier } = useUltimateStore();
  const { unlockedTitles } = useAchievementStore();

  const boss = useMemo(() => EVENT_BOSSES.find(b => b.id === bossId) ?? EVENT_BOSSES[0], [bossId]);
  const totalEquippedDps = useMemo(() => calculateEquippedTeamDps(equippedTeam, collection), [equippedTeam, collection]);

  // Type du boss : tiré au hasard à chaque nouveau lancement (entrée + chaque
  // respawn après un kill — voir respawn() plus bas), pas déterministe.
  const [bossAffinity, setBossAffinity] = useState<Affinity>(() => rollBossAffinity());
  const [companionIds, setCompanionIds] = useState<string[]>([]);
  const [showCompanions, setShowCompanions] = useState(false);
  const durationMult = useMemo(() => computeDurationMult(companionIds, bossAffinity), [companionIds, bossAffinity]);
  const toggleCompanion = (id: string) => setCompanionIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < MAX_EVENT_COMPANIONS ? [...prev, id]
      : prev
  );

  const [maxHp, setMaxHp] = useState(() => getEventBossMaxHp(boss, totalEquippedDps, durationMult));
  const [hp, setHp] = useState(maxHp);
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [drops, setDrops] = useState<DropResult[] | null>(null);
  const [dead, setDead] = useState(false);
  const [kills, setKills] = useState(0);
  const now = Date.now();

  useEffect(() => {
    const freshMax = getEventBossMaxHp(boss, totalEquippedDps, durationMult);
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrops(null);
  }, [boss, totalEquippedDps, durationMult]);

  // ── Combat automatique : dégâts du DPS d'équipe chaque seconde, avec
  // un pop-up de dégâts flottant pour le retour visuel (plus de clic).
  useEffect(() => {
    if (dead) return;
    const dps = totalEquippedDps * getActiveEnemyDamageTakenMultiplier();
    if (dps <= 0) return;
    const id = setInterval(() => {
      setHp(h => Math.max(0, h - dps));
      const d: Dmg = {
        id: Date.now() + Math.random(),
        x: 60 + Math.random() * 120,
        y: 40 + Math.random() * 120,
        val: Math.floor(dps),
        crit: false,
      };
      setDmgs(p => [...p, d]);
      setTimeout(() => setDmgs(p => p.filter(x => x.id !== d.id)), 800);
    }, 1000);
    return () => clearInterval(id);
  }, [dead, totalEquippedDps, getActiveEnemyDamageTakenMultiplier]);

  useEffect(() => {
    if (hp <= 0 && !dead) {
      setDead(true);
      const results = rollEventDrop(boss.id, useAchievementStore.getState().unlockedTitles);
      const gemsGained  = results.filter(r => r.type === 'gems').reduce((s, r) => s + (r.qty ?? 0), 0);
      const crownsGained = results.filter(r => r.type === 'bossCrowns').reduce((s, r) => s + (r.qty ?? 0), 0);
      useGameStore.setState(s => {
        const questUpdate = bumpBossQuests(s.quests, s.weeklyQuests, s.eventQuests);
        return {
          quests: questUpdate.quests,
          weeklyQuests: questUpdate.weeklyQuests,
          eventQuests: questUpdate.eventQuests,
          totalBossKills: s.totalBossKills + 1,
          nekoGems: s.nekoGems + gemsGained,
          bossCrowns: s.bossCrowns + crownsGained,
          totalBossCrownsEarned: (s.totalBossCrownsEarned ?? 0) + crownsGained,
        };
      });
      for (const r of results) {
        if (r.type === 'item' && r.id) addItem(r.id, r.qty ?? 1);
        if (r.type === 'title' && r.id) useAchievementStore.getState().unlockTitle(r.id);
      }
      setTimeout(() => setDrops(results), 800);
      // Événement majeur : sauvegarde immédiate pour ne jamais perdre la
      // récompense d'un boss d'event (pas d'attente du prochain cycle périodique).
      requestUrgentSave();
    }
  }, [hp, dead, addItem, boss]);

  const respawn = () => {
    // Nouveau type de boss à chaque nouveau lancement — calculé directement
    // avec la nouvelle valeur (le state bossAffinity ne sera à jour qu'au
    // prochain rendu, donc on ne peut pas relire durationMult ici).
    const nextAffinity = rollBossAffinity();
    setBossAffinity(nextAffinity);
    const freshMax = getEventBossMaxHp(boss, totalEquippedDps, computeDurationMult(companionIds, nextAffinity));
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrops(null); setKills(k => k + 1);
  };

  const hpPct   = Math.max(0, hp / maxHp * 100);
  const hpColor = hpPct > 50 ? '#c084fc' : hpPct > 20 ? '#f87171' : '#ff4040';

  return (
    <div style={{ height:'100%', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
      <EventBg boss={boss} />
      <EventMusicPlayer />
      {drops && <DropPopup drops={drops} onClose={() => { setDrops(null); respawn(); }} />}
      {showCompanions && (
        <CompanionSelector
          bossAffinity={bossAffinity}
          selected={companionIds}
          onToggle={toggleCompanion}
          onClose={() => setShowCompanions(false)}
        />
      )}

      <div style={{ position:'relative', padding:'10px 16px', borderBottom:'1px solid rgba(192,132,252,0.12)', background:'rgba(0,0,0,0.45)', flexShrink:0, display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={onBack}
          style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'7px 14px', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, letterSpacing:1, display:'flex', alignItems:'center', gap:6, flexShrink:0, transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color='white'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.7)'; }}>
          ← ÉVÉNEMENTS
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background: boss.availableUntil > now ? '#4ade80' : '#f87171', animation:'pulse 2s infinite' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:900, color:'white', letterSpacing:2 }}>{boss.name.toUpperCase()}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>{boss.subtitle}</span>
            <span title="Type du boss (aléatoire à chaque combat)" style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${AFFINITY_CONFIG[bossAffinity].color}22`, border:`1px solid ${AFFINITY_CONFIG[bossAffinity].color}55`, borderRadius:999, padding:'2px 9px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:AFFINITY_CONFIG[bossAffinity].color }}>
              {AFFINITY_CONFIG[bossAffinity].icon} {AFFINITY_CONFIG[bossAffinity].label}
            </span>
          </div>
        </div>
        <button onClick={() => setShowCompanions(true)}
          style={{ background: companionIds.length > 0 ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.06)', border:`1px solid ${companionIds.length > 0 ? 'rgba(192,132,252,0.5)' : 'rgba(255,255,255,0.15)'}`, borderRadius:8, padding:'7px 14px', cursor:'pointer', color: companionIds.length > 0 ? '#c084fc' : 'rgba(255,255,255,0.7)', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, letterSpacing:1, display:'flex', alignItems:'center', gap:6, flexShrink:0, transition:'all 0.15s' }}>
          🤝 COMPAGNONS ({companionIds.length}/{MAX_EVENT_COMPANIONS})
        </button>
        <div style={{ display:'flex', gap:16 }}>
          {[
            { icon:'⚔', val:kills, label:'Victoires' },
            { icon:'👑', val:bossCrowns, label:'Crowns' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Gemmes' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:15.5, color:'white' }}>{s.icon} {s.val}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.35)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position:'relative', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 24px', gap:24, overflow:'hidden' }}>
        <div style={{ width:'100%', maxWidth:600 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:'white' }}>{boss.name}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:hpColor }}>{formatNumber(Math.max(0, hp))} / {formatNumber(maxHp)}</span>
          </div>
          <div style={{ height:16, background:'rgba(255,255,255,0.08)', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ height:'100%', width:`${hpPct}%`, background:`linear-gradient(90deg,${hpColor}aa,${hpColor})`, borderRadius:8, transition:'width 0.3s ease', boxShadow:`0 0 12px ${hpColor}66` }} />
          </div>
          {durationMult !== 1 && (
            <div style={{ marginTop:6, textAlign:'center', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color: durationMult < 1 ? '#4ade80' : '#f87171' }}>
              {durationMult < 1 ? '▲' : '▼'} {durationMult < 1 ? '-' : '+'}{Math.round(Math.abs(1 - durationMult) * 100)}% durée grâce aux compagnons
            </div>
          )}
        </div>
        <div style={{ position:'relative', userSelect:'none', filter: dead?'grayscale(1) brightness(0.3)':'none', transition:'filter 0.1s' }}>
          <BossSprite boss={boss} deadStyle={dead} />
          {dmgs.map(d => (
            <div key={d.id} style={{ position:'absolute', left:d.x, top:d.y, pointerEvents:'none', fontFamily:'var(--f-ui)', fontWeight:900, fontSize:d.crit?20:14, color:d.crit?'#fbbf24':'#c084fc', textShadow:d.crit?'0 0 10px #fbbf24':'0 0 6px #c084fc', animation:'floatUp 0.8s ease forwards', whiteSpace:'nowrap', zIndex:10 }}>
              {d.crit ? '⚡ ' : ''}{formatNumber(d.val)}
            </div>
          ))}
          {dead && (
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:22.7, color:'#c084fc', textShadow:'0 0 20px #c084fc', letterSpacing:2 }}>VAINCU</div>
            </div>
          )}
        </div>
        {dead && !drops && <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:'rgba(255,255,255,0.5)', animation:'pulse 1s infinite' }}>Calcul des récompenses...</div>}
        {!dead && <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>Tes alliés attaquent automatiquement</div>}
      </div>

      <div style={{ position:'relative', padding:'10px 24px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.3)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)', marginBottom:8, letterSpacing:1 }}>RÉCOMPENSES POSSIBLES</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {boss.dropTable.filter(e => e.result.type !== 'nothing' &&
            !(e.result.type === 'title' && e.result.id && unlockedTitles.includes(e.result.id))
          ).map((entry, i, pool) => {
            const totalWeight = pool.reduce((s, x) => s + x.weight, 0);
            const rate = `${Math.round(entry.weight / totalWeight * 1000) / 10}%`;
            const r = entry.result;
            const item = r.type==='item'&&r.id ? getItemDef(r.id) : null;
            const icon = r.type==='gems'?'💎':r.type==='bossCrowns'?'👑':r.type==='title'?'🏆':(item?.icon ?? '📦');
            const label = r.type==='title'?`Titre : ${r.id}` : item?.name ?? (r.type==='gems'?`Gemmes ×${r.qty}`:r.type==='bossCrowns'?`Crowns ×${r.qty}`:'Objet');
            const color = r.type==='gems'?'var(--cyan-hi)':r.type==='bossCrowns'||r.type==='title'?'#fbbf24':(item?.color ?? '#c084fc');
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'4px 10px', border:`1px solid ${color}33` }}>
                <span style={{ fontSize:14.4 }}>{icon}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color: color ?? '#c084fc' }}>{label}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)' }}>{rate} · 🪙+{entry.coinQty}</span>
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
