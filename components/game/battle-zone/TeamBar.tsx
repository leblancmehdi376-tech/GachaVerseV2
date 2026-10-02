'use client';
import { formatNumber } from '@/lib/game/format';
import { computeActiveSynergies, computeSynergyProgress } from '@/lib/game/synergies';
import { bnFromNumber, bnGt, bnMul, type BigNum } from '@/lib/game/bignum';
import { AllyCard } from './AllyCard';
import { CohesionBadge } from '@/components/ui/CohesionBadge';
import { DpsBreakdownTooltip } from './DpsBreakdownTooltip';
import { GoldBreakdownTooltip } from './GoldBreakdownTooltip';
import { SynergyBreakdownTooltip } from './SynergyBreakdownTooltip';

const ONE = bnFromNumber(1);
const noop = () => {};

// ── Barre basse : compagnons, synergies, butin, DPS d'équipe et actions boss ──
export function TeamBar({
  equippedTeam, pixelCoinsReward, gemsReward, goldMult, dps, dpsUltMult,
  bossActive, bossAvoided, wave, retreatFromBoss, challengeBoss,
}: {
  equippedTeam: (string | null)[]; pixelCoinsReward: BigNum; gemsReward: number; goldMult: BigNum;
  dps: BigNum; dpsUltMult: number;
  bossActive: boolean; bossAvoided: boolean; wave: number;
  retreatFromBoss: () => void; challengeBoss: () => void;
}) {
  const syns = computeActiveSynergies(equippedTeam);
  // Section visible dès qu'une synergie est entamée (1 membre suffit), pour
  // pouvoir consulter les paliers atteignables même sans synergie active.
  const hasSynergyProgress = syns.length > 0 || computeSynergyProgress(equippedTeam).length > 0;
  // `goldMult` regroupe TOUS les boosts d'or (coffre, titre, ult, boost
  // boutique, prestige, anomalies — voir getGoldGainMultiplier), pour que ce
  // "vrai" montant entre parenthèses corresponde à ce qui sera réellement
  // crédité au kill (voir resolveEnemyDeath), pas seulement le bonus du coffre.
  const hasGoldBonus = bnGt(goldMult, ONE);
  const realGold = hasGoldBonus ? bnMul(pixelCoinsReward, goldMult) : null;

  return (
    <div style={{ position:'relative', zIndex:3, background:'linear-gradient(0deg,rgba(165, 165, 165, 0),rgba(5,4,15,0.3))', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>

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
        <div className="team-companion-panel" style={{
          background:'linear-gradient(160deg,rgba(15,10,30,0.92),rgba(8,6,18,0.92))',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:10,
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
            fontSize:14,
            fontWeight:700,
            color:'rgba(255,255,255,0.55)',
            letterSpacing:2,
            //center text
            alignSelf:'center',
          }}>COMPAGNONS</span>
          <style>{`
            @media (min-width: 1800px) {
              .team-companion-slot { width: 200px !important; }
            }
            /* Téléphone : 4 slots de 88px ne tiennent pas (le 4e était coupé
               dans le scroll) — le panneau prend toute la largeur et les
               slots se partagent l'espace (88px max chacun). */
            @media (max-width: 820px) {
              .team-companion-panel { flex: 1 1 100%; min-width: 0; }
              .team-companion-row { display: grid !important; grid-template-columns: repeat(4, minmax(0, 88px)); justify-content: center; width: 100%; }
              .team-companion-slot { width: auto !important; }
            }
          `}</style>
          <div className="team-companion-row" style={{
            display:'flex',
            gap:10,
            alignItems:'flex-start',
          }}>
            {equippedTeam.map((tid, i) => (
              <div key={i} className="team-companion-slot" style={{ position:'relative', width:88, flexShrink:0 }}>
                <AllyCard templateId={tid ?? ''} onManage={noop} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex:1 }} />

        {/* Barre d'infos de combat unifiée : synergies / butin / DPS partagent
            un seul cadre avec séparateurs internes, plutôt que des boîtes
            bordées séparées (moins de cadres empilés, hauteur cohérente).
            Si elle ne tient plus en largeur, ses cases passent à la ligne
            dans le même cadre au lieu de sortir de l'écran (voir
            .combat-info dans globals.css). */}
        <div className="combat-info">
          {/* Synergies — détail des paliers (actifs / atteignables) au survol (voir SynergyBreakdownTooltip) */}
          {hasSynergyProgress && (
            <div className="combat-info__cell" style={{ padding:'7px 12px' }}>
            <SynergyBreakdownTooltip>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.55)', letterSpacing:1, marginBottom:3 }}>SYNERGIES <span style={{ fontSize:14, opacity:0.8 }}>ⓘ</span></div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', minHeight:16 }}>
              {syns.length === 0 && (
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:14, color:'rgba(255,255,255,0.55)', whiteSpace:'nowrap' }}>Aucune active</span>
              )}
              {syns.map(s => (
                <div key={s.def.id}
                  style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:16, height:16, flexShrink:0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/sprites/synergies/${s.def.id}.webp`} alt={s.def.label}
                      style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:2 }}
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:14px">${s.def.icon}</span>`; }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:s.def.color, whiteSpace:'nowrap' }}>
                    {s.threshold.dpsBonus > 0 ? `+${s.threshold.dpsBonus}%` : `+${s.threshold.globalBonus}% glb`}
                  </span>
                </div>
              ))}
            </div>
            </SynergyBreakdownTooltip>
            </div>
          )}

          {/* Butin de l'ennemi courant — détail de l'or au survol (voir GoldBreakdownTooltip) */}
          <div className="combat-info__cell" style={{ padding:'7px 14px', textAlign:'right' }}>
            <GoldBreakdownTooltip>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.55)', letterSpacing:1, marginBottom:3 }}>BUTIN <span style={{ fontSize:14, opacity:0.8 }}>ⓘ</span></div>
              <div style={{ fontFamily:'var(--f-num)', fontSize:16, fontWeight:700, color:'var(--gold)' }}>
                +{formatNumber(pixelCoinsReward)} 🪙
                {realGold && <span style={{ fontSize:14, fontWeight:600, color:'rgba(251,191,36,0.6)' }}> (+{formatNumber(realGold)})</span>}
              </div>
            </GoldBreakdownTooltip>
            {gemsReward > 0 && <div style={{ fontFamily:'var(--f-num)', fontSize:14, fontWeight:700, color:'var(--cyan-hi)' }}>+{gemsReward} 💎</div>}
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:600, color:'rgba(34,211,238,0.45)', marginTop:2 }}>✦ 0.5% 💎 par ennemi</div>
          </div>

          {/* DPS d'équipe — détail au survol (voir DpsBreakdownTooltip) */}
          <div className="combat-info__cell" style={{ padding:'7px 14px', textAlign:'right' }}>
            <DpsBreakdownTooltip>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.55)', letterSpacing:2 }}>🔥 DPS <span style={{ fontSize:14, opacity:0.8 }}>ⓘ</span></div>
              <div style={{ fontFamily:'var(--f-num)', fontSize:22, fontWeight:900, color: dpsUltMult > 1 ? '#4ade80' : 'var(--green)', lineHeight:1, textShadow:'0 0 10px rgba(74,222,128,0.35)' }}>
                {formatNumber(dps)}{dpsUltMult > 1 && <span style={{ fontSize:14, marginLeft:2 }}>×{dpsUltMult}</span>}
              </div>
            </DpsBreakdownTooltip>
            <div style={{ marginTop:3 }}><CohesionBadge /></div>
          </div>
        </div>

        {/* Actions boss — dans la barre, seulement pendant/après un boss */}
        {(bossActive || wave === 10) && (
          <button
            onClick={e => { e.stopPropagation(); retreatFromBoss(); }}
            style={{ padding:'10px 14px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0, alignSelf:'flex-end', transition:'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            title="Abandonner le boss et retourner à la vague 1"
          >
            <span style={{ fontSize:18 }}>🏳️</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'#f87171', letterSpacing:1 }}>RETRAITE</span>
          </button>
        )}
        {bossAvoided && !bossActive && wave !== 10 && (
          <button
            onClick={e => { e.stopPropagation(); challengeBoss(); }}
            style={{ padding:'10px 14px', background:'rgba(234,179,8,0.08)', border:'1px solid rgba(234,179,8,0.35)', borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0, alignSelf:'flex-end', transition:'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.08)')}
            title="Retenter le boss"
          >
            <span style={{ fontSize:18 }}>⚡</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'#fbbf24', letterSpacing:1 }}>BOSS</span>
          </button>
        )}
      </div>
    </div>
  );
}
