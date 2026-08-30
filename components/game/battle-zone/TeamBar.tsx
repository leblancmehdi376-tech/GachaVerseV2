'use client';
import { getGoldChestMultiplier } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { computeActiveSynergies } from '@/lib/game/synergies';
import { bnFromNumber, bnGt, bnMul, type BigNum } from '@/lib/game/bignum';
import type { Enemy } from '@/types/game';
import { AllyCard } from './AllyCard';

const ONE = bnFromNumber(1);

// ── Barre basse : compagnons, synergies, butin, DPS d'équipe et actions boss ──
export function TeamBar({
  equippedTeam, currentEnemy, goldUpgradeLevel, dps, dpsUltMult,
  bossActive, bossAvoided, wave, retreatFromBoss, challengeBoss,
}: {
  equippedTeam: (string | null)[]; currentEnemy: Enemy; goldUpgradeLevel: number;
  dps: BigNum; dpsUltMult: number;
  bossActive: boolean; bossAvoided: boolean; wave: number;
  retreatFromBoss: () => void; challengeBoss: () => void;
}) {
  const syns = computeActiveSynergies(equippedTeam);
  const chestMult = getGoldChestMultiplier(goldUpgradeLevel ?? 0);
  const hasChestBonus = bnGt(chestMult, ONE);
  const withChest = hasChestBonus ? bnMul(currentEnemy.pixelCoinsReward, chestMult) : null;

  return (
    <div style={{ position:'relative', zIndex:3, background:'linear-gradient(0deg,rgba(5,4,15,0.97),rgba(5,4,15,0.7))', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>

      {/* Compagnons — barre horizontale */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        padding: '8px 12px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Panel compagnons */}
        <div style={{
          background:'linear-gradient(160deg,rgba(15,10,30,0.92),rgba(8,6,18,0.92))',
          border:'1px solid rgba(255,255,255,0.09)',
          borderRadius:12,
          padding:'10px 12px 8px',
          display:'flex',
          flexDirection:'column',
          alignItems:'flex-start',
          gap:8,
          boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
          //scrollable
          overflowX:'auto',
          overflowY:'hidden',
          scrollbarWidth:'thin',
          msOverflowStyle:'-ms-autohiding-scrollbar',
        }}>
          <span style={{
            fontFamily:'var(--f-ui)',
            fontSize:12,
            fontWeight:700,
            color:'rgba(255,255,255,0.35)',
            letterSpacing:2,
            //center text
            alignSelf:'center',
          }}>COMPAGNONS</span>
          <div style={{
            display:'flex',
            gap:10,
            alignItems:'flex-start',
          }}>
            {equippedTeam.map((tid, i) => (
              <div key={i} style={{ position:'relative', width:88, flexShrink:0 }}>
                <AllyCard templateId={tid ?? ''} onManage={() => {}} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex:1 }} />

        {/* Synergies actives */}
        {syns.length > 0 && (
          <div style={{ display:'flex', gap:4, alignItems:'center', marginRight:8 }}>
            {syns.map(s => (
              <div key={s.def.id} title={`${s.def.label} — ${s.threshold.label}`}
                style={{ display:'flex', alignItems:'center', gap:4, background:`${s.def.color}18`, border:`1px solid ${s.def.color}55`, borderRadius:6, padding:'3px 8px', boxShadow:`0 0 8px ${s.def.glow}33` }}>
                <div style={{ width:16, height:16, flexShrink:0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/sprites/synergies/${s.def.id}.webp`} alt={s.def.label}
                    style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:2 }}
                    onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:12px">${s.def.icon}</span>`; }} />
                </div>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:s.def.color, whiteSpace:'nowrap' }}>
                  {s.threshold.dpsBonus > 0 ? `+${s.threshold.dpsBonus}%` : `+${s.threshold.globalBonus}% glb`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Butin de l'ennemi courant */}
        <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 12px', flexShrink:0, textAlign:'right', marginRight:12 }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.25)', letterSpacing:1, marginBottom:3 }}>BUTIN</div>
          <div style={{ fontFamily:'var(--f-num)', fontSize:13.4, fontWeight:700, color:'var(--gold)' }}>
            +{formatNumber(currentEnemy.pixelCoinsReward)} 🪙
            {withChest && <span style={{ fontSize:12, fontWeight:600, color:'rgba(251,191,36,0.6)' }}> (+{formatNumber(withChest)})</span>}
          </div>
          {currentEnemy.gemsReward > 0 && <div style={{ fontFamily:'var(--f-num)', fontSize:12.4, fontWeight:700, color:'var(--cyan-hi)' }}>+{currentEnemy.gemsReward} 💎</div>}
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:600, color:'rgba(34,211,238,0.45)', marginTop:2 }}>✦ 0.5% 💎 par ennemi</div>
        </div>

        {/* DPS d'équipe */}
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:1.5 }}>🔥 DPS</div>
          <div style={{ fontFamily:'var(--f-num)', fontSize:19.6, fontWeight:900, color: dpsUltMult > 1 ? '#4ade80' : 'var(--green)', lineHeight:1, textShadow:'0 0 10px rgba(74,222,128,0.35)' }}>
            {formatNumber(dps)}{dpsUltMult > 1 && <span style={{ fontSize:12, marginLeft:2 }}>×{dpsUltMult}</span>}
          </div>
        </div>

        {/* Actions boss — dans la barre, seulement pendant/après un boss */}
        {(bossActive || wave === 10) && (
          <button
            onClick={e => { e.stopPropagation(); retreatFromBoss(); }}
            style={{ padding:'10px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0, alignSelf:'center', transition:'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            title="Abandonner le boss et retourner à la vague 1"
          >
            <span style={{ fontSize:16.5 }}>🏳️</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#f87171', letterSpacing:1 }}>RETRAITE</span>
          </button>
        )}
        {bossAvoided && !bossActive && wave !== 10 && (
          <button
            onClick={e => { e.stopPropagation(); challengeBoss(); }}
            style={{ padding:'10px 14px', background:'rgba(234,179,8,0.12)', border:'1px solid rgba(234,179,8,0.5)', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0, alignSelf:'center', transition:'background 0.2s', animation:'pulse 2s infinite' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.12)')}
            title="Retenter le boss"
          >
            <span style={{ fontSize:16.5 }}>⚡</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#fbbf24', letterSpacing:1 }}>BOSS</span>
          </button>
        )}
      </div>
    </div>
  );
}
