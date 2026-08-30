'use client';
import { formatNumber } from '@/lib/game/format';
import type { PalierConfig } from '@/lib/game/paliers';
import type { Affinity } from '@/lib/game/affinities';
import { AffinityBadge } from '@/components/ui/AffinityBadge';
import { AffinityTooltip } from '@/components/ui/AffinityTooltip';
import type { Enemy } from '@/types/game';

// ── HUD ennemi : timer boss, en-tête palier/étage, nom + affinité, barre de vie ──
export function EnemyHud({
  currentEnemy, cfg, wave, isFarming, runPeakPalier, bossActive, bossTimeLeft, bossWarn,
  enemyAffinity, eventDpsMult, hp, onOpenTravel, onReturnToPeak,
}: {
  currentEnemy: Enemy; cfg: PalierConfig; wave: number; isFarming: boolean; runPeakPalier: number;
  bossActive: boolean; bossTimeLeft: number; bossWarn: boolean;
  enemyAffinity: Affinity; eventDpsMult: number; hp: number;
  onOpenTravel: () => void; onReturnToPeak: () => void;
}) {
  return (
    <>
      {/* Timer boss */}
      {bossActive && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, zIndex:5 }}>
          <div style={{ height:'100%', width:`${(bossTimeLeft/cfg.bossTimerSeconds)*100}%`, background:bossWarn?'#ef4444':'#dc2626', transition:'width 1s linear', boxShadow:bossWarn?'0 0 10px #ef4444':undefined }} />
        </div>
      )}

      {/* HUD top */}
      <div style={{ position:'relative', zIndex:3, padding:'12px 18px 10px', background:'linear-gradient(180deg,rgba(0,0,0,0.7) 0%,transparent 100%)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12, color:cfg.accentColor, letterSpacing:2 }}>{cfg.universe.toUpperCase()}</span>
            <span style={{ color:'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)', letterSpacing:1 }}>{cfg.arc}</span>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:currentEnemy.isBoss?'rgba(127,29,29,0.8)':isFarming?'rgba(52,211,153,0.15)':'rgba(0,0,0,0.5)', border:`1px solid ${currentEnemy.isBoss?'rgba(239,68,68,0.5)':isFarming?'rgba(52,211,153,0.5)':cfg.accentColor+'33'}`, borderRadius:6, padding:'2px 10px' }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:currentEnemy.isBoss?'#f87171':isFarming?'#34d399':cfg.accentColor }}>
                {currentEnemy.isBoss ? '★ BOSS' : isFarming ? `🔁 FARM · ÉTAGE ${wave}/9` : `ÉTAGE ${wave} / 10`}
              </span>
            </div>
            {runPeakPalier > 1 && (
              <button
                onClick={e => { e.stopPropagation(); if (!bossActive) onOpenTravel(); }}
                disabled={bossActive}
                title={bossActive ? 'Impossible pendant un boss' : 'Voyager vers un palier déjà atteint'}
                style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background:'rgba(109,63,214,0.22)', border:'1px solid var(--purple-glow)',
                  borderRadius:6, padding:'6px 10px', cursor:bossActive?'not-allowed':'pointer',
                  opacity:bossActive?0.4:1, transition:'opacity 0.15s',
                }}
              >
                <span style={{ fontSize:12 }}>🗺</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12, color:'var(--purple-glow)', letterSpacing:1 }}>VOYAGER</span>
              </button>
            )}
            {isFarming && (
              <button
                onClick={e => { e.stopPropagation(); onReturnToPeak(); }}
                title={`Retourner à ta progression actuelle (palier ${runPeakPalier})`}
                style={{
                  display:'inline-flex', alignItems:'center', gap:5,
                  background:'rgba(52,211,153,0.18)', border:'1px solid #34d399',
                  borderRadius:6, padding:'6px 10px', cursor:'pointer', transition:'filter 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.filter='brightness(1.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter='none'; }}
              >
                <span style={{ fontSize:12 }}>↩</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12, color:'#34d399', letterSpacing:1 }}>RETOUR · P{runPeakPalier}</span>
              </button>
            )}
          </div>
          {bossActive && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(127,29,29,0.85)', border:'1px solid rgba(239,68,68,0.5)', borderRadius:8, padding:'5px 14px' }}>
              <span style={{ fontSize:13.4, animation:'warnFlash 0.5s infinite' }}>⚠</span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:'#f87171' }}>BOSS — {bossTimeLeft}s</span>
            </div>
          )}
          {isFarming && !bossActive && (
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.4)', borderRadius:8, padding:'4px 12px' }}>
              <span style={{ fontSize:12.4 }}>🔁</span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#34d399' }}>Farm en boucle · boss désactivé</span>
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
          <h2 style={{ fontFamily:'var(--f-title)', fontSize:currentEnemy.isBoss?'18px':'15px', fontWeight:700, color:'white', letterSpacing:2, textShadow:currentEnemy.isBoss?'0 0 24px rgba(239,68,68,0.7)':'0 0 16px rgba(255,255,255,0.2)', margin:0 }}>
            {currentEnemy.name}
          </h2>
          <AffinityTooltip affinity={enemyAffinity}>
            <AffinityBadge affinity={enemyAffinity} size="sm" />
          </AffinityTooltip>
          {eventDpsMult !== 1 && (() => {
            const buff = eventDpsMult > 1;
            return (
              <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:12, padding:'2px 8px', borderRadius:999,
                color: buff ? '#4ade80' : '#f87171',
                background: buff ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${buff ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}` }}>
                {buff ? '🔥' : '💀'} ×{eventDpsMult.toFixed(2)} DPS
              </span>
            );
          })()}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.35)', letterSpacing:1 }}>HP</span>
          <span style={{ fontFamily:'var(--f-num)', fontSize:12.4, fontWeight:700, color:'rgba(255,255,255,0.75)' }}>{formatNumber(currentEnemy.currentHp)} / {formatNumber(currentEnemy.maxHp)}</span>
        </div>
        <div style={{ height:8, background:'rgba(0,0,0,0.5)', borderRadius:10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', marginBottom:6 }}>
          <div style={{ height:'100%', width:`${hp}%`, transition:'width 0.15s ease', borderRadius:10,
            background:hp>50?'linear-gradient(90deg,#166534,#4ade80)':hp>25?'linear-gradient(90deg,#78350f,#fbbf24)':'linear-gradient(90deg,#7f1d1d,#f87171)',
            boxShadow:`0 0 12px ${hp>50?'#4ade8077':hp>25?'#fbbf2477':'#f8717177'}` }} />
        </div>
        <div style={{ display:'flex', gap:3 }}>
          {Array.from({length:10},(_,i)=>(
            <div key={i} style={{ flex:1, height:3, borderRadius:2,
              background:i+1<wave?cfg.accentColor:i+1===wave?(currentEnemy.isBoss?'#ef4444':cfg.accentColor):'rgba(255,255,255,0.08)',
              border:i===9?'1px solid rgba(239,68,68,0.4)':undefined, transition:'background 0.3s' }} />
          ))}
        </div>
      </div>
    </>
  );
}
