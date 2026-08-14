'use client';
import { useMemo } from 'react';
import { useGameStore, OFFLINE_MULT_TIERS, OFFLINE_CAP_TIERS_H } from '@/store/gameStore';
import { useAchievementStore } from '@/store/achievementStore';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG, calcCharDps, getPalierConfig, Rarity } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { TITLE_GOLD_BONUS_PCT } from '@/lib/game/titles';
import { ACHIEVEMENTS } from '@/lib/game/achievements';

const RARITY_ORDER: Rarity[] = ['C','U','R','E','L','M','S','CO','P','T'];

export function ProfilePage() {
  const store = useGameStore();
  const { activeTitle, unlockedCount, unlockedTitles } = useAchievementStore();
  const {
    username, pixelCoins, nekoGems, totalClicks, palier, maxPalierReached,
    bossCrowns, voidOrbs, collection, equippedTeam, getTotalDps, getHeroDpc,
  } = store;

  const cfg = getPalierConfig(palier);

  // Stats calculées
  const ownedChars = useMemo(() =>
    CHARACTER_POOL.filter(c => !!collection[c.id]), [collection]);

  const totalDps = getTotalDps();
  const heroDpc  = getHeroDpc();

  const rarityBreakdown = useMemo(() => {
    const counts: Partial<Record<Rarity, number>> = {};
    for (const tpl of ownedChars) {
      counts[tpl.rarity] = (counts[tpl.rarity] ?? 0) + 1;
    }
    return counts;
  }, [ownedChars]);

  const highestDpsChar = useMemo(() => {
    let best: { name: string; dps: number } | null = null;
    for (const tpl of ownedChars) {
      const owned = collection[tpl.id];
      if (!owned) continue;
      const dps = calcCharDps(tpl, owned);
      if (!best || dps > best.dps) best = { name: tpl.name, dps };
    }
    return best;
  }, [ownedChars, collection]);

  const equippedCount = equippedTeam.filter(Boolean).length;

  const STAT_ROWS = [
    { label:'PALIER ACTUEL',      val: `${palier} — ${cfg.name}`,      color:'var(--purple-glow)', num:false },
    { label:'PALIER MAX ATTEINT', val: String(maxPalierReached),        color:'#c084fc',            num:true  },
    { label:'TOTAL CLICS',        val: formatNumber(totalClicks),       color:'#fb923c',            num:true  },
    { label:'BOSS VAINCUS',       val: String(bossCrowns),              color:'#fbbf24',            num:true  },
    { label:'DPS TOTAL',          val: formatNumber(totalDps) + '/s',   color:'var(--green)',       num:true  },
    { label:'DPC HÉROS',          val: formatNumber(heroDpc),           color:'#fb923c',            num:true  },
    { label:'PIXEL-COINS',        val: formatNumber(pixelCoins),        color:'var(--gold)',        num:true  },
    { label:'NEKO-GEMMES',        val: formatNumber(nekoGems),          color:'var(--cyan-hi)',     num:true  },
    { label:'BOSS CROWNS',        val: String(bossCrowns),              color:'#fbbf24',            num:true  },
    { label:'VOID ORBS',          val: String(voidOrbs),                color:'#a78bfa',            num:true  },
    { label:'PERSONNAGES',        val: `${ownedChars.length} / ${CHARACTER_POOL.length}`, color:'#60a5fa', num:true },
    { label:'ÉQUIPE ACTIVE',      val: `${equippedCount} / 4`,          color:'#34d399',            num:true  },
    { label:'SUCCÈS',             val: `${unlockedCount()} / ${ACHIEVEMENTS.length}`,       color:'#fbbf24',            num:true  },
  ];

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* Hero card */}
        <div className="panel panel--glow" style={{ padding:'24px', display:'flex', alignItems:'center', gap:'24px', position:'relative', overflow:'hidden' }}>
          {/* BG décoration */}
          <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'200px', height:'200px', background:'radial-gradient(circle,rgba(147,51,234,0.1),transparent)', borderRadius:'50%', pointerEvents:'none' }} />

          {/* Avatar */}
          <div style={{
            width:80, height:80, flexShrink:0,
            background:'linear-gradient(135deg,#3b0f91,#6d28d9)',
            borderRadius:'16px',
            border:'2px solid var(--border-glow)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--f-title)', fontSize:'28px', fontWeight:900, color:'#e2d9ff',
            boxShadow:'0 0 28px rgba(109,40,217,0.35)',
          }}>
            {username.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--f-title)', fontSize:'24px', fontWeight:900, color:'var(--text)', letterSpacing:'2px', marginBottom:'4px' }}>
              {username}
            </div>
            {/* Titre actif */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:'6px', padding:'4px 12px', marginBottom:'12px' }}>
              <span style={{ fontSize:'12px' }}>👑</span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'#fbbf24', letterSpacing:'1px' }}>
                « {activeTitle} »
              </span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:'11px', color:'var(--gold-hi)', background:'rgba(0,0,0,0.25)', borderRadius:'4px', padding:'1px 6px' }}>
                🪙 +{TITLE_GOLD_BONUS_PCT[activeTitle] ?? 0}%
              </span>
            </div>

            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { icon:'🌍', label:`Palier ${palier}`, color:'var(--purple-glow)' },
                { icon:'⚔',  label:`${formatNumber(totalClicks)} clics`, color:'#fb923c' },
                { icon:'🏆', label:`${unlockedCount()} succès`, color:'#fbbf24' },
                { icon:'👑', label:`${unlockedTitles.length} titre${unlockedTitles.length > 1 ? 's' : ''}`, color:'#c084fc' },
              ].map((b, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'8px', padding:'5px 12px' }}>
                  <span style={{ fontSize:'13px' }}>{b.icon}</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'11px', color:b.color }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de stats */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'11px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'12px' }}>STATISTIQUES COMPLÈTES</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'10px' }}>
            {STAT_ROWS.map((s, i) => (
              <div key={i} className="panel" style={{ padding:'16px 18px' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:'9px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'1.5px', marginBottom:'8px' }}>{s.label}</div>
                <div style={{ fontFamily: s.num ? 'var(--f-num)' : 'var(--f-ui)', fontWeight:900, fontSize:'20px', color:s.color, lineHeight:1.05 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition par rareté */}
        <div className="panel" style={{ padding:'18px 20px' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'11px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'14px' }}>COLLECTION PAR RARETÉ</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {RARITY_ORDER.slice().reverse().map(r => {
              const count = rarityBreakdown[r] ?? 0;
              const cfg2  = RARITY_CONFIG[r];
              const poolCount = CHARACTER_POOL.filter(c => c.rarity === r).length;
              if (poolCount === 0) return null;
              const pct2 = poolCount > 0 ? Math.round((count / poolCount) * 100) : 0;
              return (
                <div key={r} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:80, flexShrink:0, fontFamily:'var(--f-ui)', fontSize:'11px', fontWeight:700, color:cfg2.color }}>{cfg2.label}</div>
                  <div className="prog-track" style={{ flex:1 }}>
                    <div className="prog-fill" style={{ width:`${pct2}%`, background:`linear-gradient(90deg,${cfg2.color}88,${cfg2.color})`, boxShadow:`0 0 6px ${cfg2.glow}` }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-num)', fontSize:'12px', fontWeight:700, color:cfg2.color, minWidth:'55px', textAlign:'right' }}>{count}/{poolCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Meilleur perso + équipe */}
        {(highestDpsChar || equippedCount > 0) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
            {highestDpsChar && (
              <div className="panel" style={{ padding:'16px', borderColor:'rgba(74,222,128,0.25)' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:'9px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'8px' }}>⚡ MEILLEUR DPS</div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'15px', color:'var(--text)', marginBottom:'4px' }}>{highestDpsChar.name}</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'22px', color:'var(--green)' }}>{formatNumber(highestDpsChar.dps)}/s</div>
              </div>
            )}
            <div className="panel" style={{ padding:'16px', borderColor:'rgba(192,132,252,0.25)' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'9px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'8px' }}>👥 ÉQUIPE</div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {equippedTeam.map((id, i) => {
                  const tpl = id ? CHARACTER_POOL.find(c => c.id === id) : null;
                  return (
                    <div key={i} style={{ background: tpl ? 'rgba(147,51,234,0.12)' : 'rgba(255,255,255,0.03)', border:`1px solid ${tpl ? 'rgba(147,51,234,0.3)' : 'var(--border)'}`, borderRadius:'8px', padding:'6px 10px', fontFamily:'var(--f-ui)', fontSize:'11px', fontWeight:700, color: tpl ? 'var(--purple-glow)' : 'var(--text-muted)' }}>
                      {tpl ? tpl.name : `Slot ${i+1}`}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:'10px', fontFamily:'var(--f-num)', fontWeight:900, fontSize:'18px', color:'var(--purple-glow)' }}>{formatNumber(totalDps)}/s total</div>
            </div>
          </div>
        )}

        {/* ── Gains hors-ligne ─────────────────────────────────────────── */}
        {(() => {
          const offMult   = store.getOfflineMult();
          const offCapH   = store.getOfflineCapHours();
          const perHour   = store.getOfflineCoinsPerHour();
          const multCost  = store.getOfflineMultCost();
          const capCost   = store.getOfflineCapCost();
          const multLvl   = store.offlineMultLevel ?? 0;
          const capLvl    = store.offlineCapLevel ?? 0;
          const nextMult  = OFFLINE_MULT_TIERS[multLvl + 1];
          const nextCapH  = OFFLINE_CAP_TIERS_H[capLvl + 1];
          const last      = store.lastOfflineGain;
          const fmtDur = (s: number) => { const h=Math.floor(s/3600), m=Math.floor((s%3600)/60); return h>0?(m>0?`${h}h ${m}min`:`${h}h`):(m>0?`${m}min`:`${s}s`); };

          const UpgradeRow = ({ icon, label, current, next, cost, onBuy }: { icon:string; label:string; current:string; next:string|null; cost:number|null; onBuy:()=>void }) => {
            const affordable = cost !== null && bossCrowns >= cost;
            const maxed = cost === null;
            return (
              <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:'10px' }}>
                <span style={{ fontSize:'20px' }}>{icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text)' }}>{label}</div>
                  <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', color:'var(--text-sub)', marginTop:'2px' }}>
                    <span style={{ color:'var(--green)' }}>{current}</span>{next && !maxed && <span style={{ color:'var(--text-dim)' }}> → {next}</span>}
                  </div>
                </div>
                <button onClick={onBuy} disabled={maxed || !affordable}
                  className={affordable ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding:'8px 14px', fontSize:'12px', opacity: maxed ? 0.5 : 1, cursor: maxed||!affordable ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                  {maxed ? 'MAX' : <>👑 {cost}</>}
                </button>
              </div>
            );
          };

          return (
            <div className="panel panel--gold" style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'11px', color:'var(--gold-hi)', letterSpacing:'2px' }}>🌙 GAINS HORS-LIGNE</div>
                <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', fontWeight:700, color:'var(--cyan-hi)' }}>👑 {bossCrowns}</div>
              </div>

              {/* Taux courant + dernier récap */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
                <div style={{ padding:'12px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:'10px' }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'9px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'1.5px', marginBottom:'6px' }}>REVENU PASSIF</div>
                  <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'17px', color:'var(--gold-hi)' }}>{formatNumber(Math.floor(perHour))}<span style={{ fontSize:'11px', color:'var(--text-sub)' }}> /h</span></div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>×{offMult.toFixed(2)} · plafond {offCapH}h</div>
                </div>
                <div style={{ padding:'12px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:'10px' }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'9px', fontWeight:700, color:'var(--text-dim)', letterSpacing:'1.5px', marginBottom:'6px' }}>DERNIER RETOUR</div>
                  {last ? (<>
                    <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'17px', color:'var(--green)' }}>+{formatNumber(last.coins)}</div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'10px', color:'var(--text-dim)', marginTop:'2px' }}>pour {fmtDur(last.seconds)}{last.capped ? ' (plafonné)' : ''}</div>
                  </>) : (
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'11px', color:'var(--text-dim)' }}>Aucun pour l&apos;instant</div>
                  )}
                </div>
              </div>

              {/* Améliorations */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <UpgradeRow icon="📈" label="Multiplicateur hors-ligne" current={`×${offMult.toFixed(2)}`} next={nextMult ? `×${nextMult.toFixed(2)}` : null} cost={multCost} onBuy={store.upgradeOfflineMult} />
                <UpgradeRow icon="⏳" label="Durée max hors-ligne"     current={`${offCapH}h`}          next={nextCapH ? `${nextCapH}h` : null}       cost={capCost}  onBuy={store.upgradeOfflineCap} />
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
