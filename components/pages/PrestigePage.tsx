'use client';
import { useState } from 'react';
import { usePrestigeStore } from '@/store/prestigeStore';
import { useGameStore } from '@/store/gameStore';
import { PRESTIGE_UPGRADES, PRESTIGE_PASSIVE_DPS_PER_LEVEL, PRESTIGE_PASSIVE_COIN_PER_LEVEL } from '@/lib/game/prestige';
import { formatNumber } from '@/lib/game/format';

function ConfirmDialog({ onConfirm, onCancel, prestigeLevel }: {
  onConfirm: () => void;
  onCancel:  () => void;
  prestigeLevel: number;
}) {
  const [typed, setTyped] = useState('');
  const CONFIRM_WORD = 'PRESTIGE';
  const ready = typed === CONFIRM_WORD;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(4,3,14,0.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="panel panel--glow" style={{ width:'100%', maxWidth:480, padding:'32px 28px', display:'flex', flexDirection:'column', gap:20, textAlign:'center' }}>

        <div style={{ fontSize:53.6 }}>⭐</div>

        <div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:22.7, fontWeight:900, color:'var(--purple-glow)', letterSpacing:3, marginBottom:8 }}>
            PRESTIGE {prestigeLevel + 1}
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:13.4, color:'var(--text-dim)', lineHeight:1.7 }}>
            Ton run va être réinitialisé. Tu gardes ta collection, tes gemmes et tes succès.
          </div>
        </div>

        {/* Ce qui reset */}
        <div style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#f87171', letterSpacing:2, marginBottom:8 }}>✕ RÉINITIALISÉ</div>
          {['Palier → 1', 'Pixel-Coins → 0', 'Upgrades attaque & or → 0', 'Niveau héros → 1'].map(item => (
            <div key={item} style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'rgba(248,113,113,0.8)', marginBottom:3 }}>• {item}</div>
          ))}
        </div>

        {/* Ce qui reste */}
        <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#4ade80', letterSpacing:2, marginBottom:8 }}>✓ CONSERVÉ</div>
          {['Collection gacha complète', 'Neko-Gemmes', 'BossCrowns & VoidOrbs', 'Succès & expéditions', '+3 Points de Prestige', `+${(PRESTIGE_PASSIVE_DPS_PER_LEVEL*100).toFixed(0)}% DPS & +${(PRESTIGE_PASSIVE_COIN_PER_LEVEL*100).toFixed(0)}% coins passifs`].map(item => (
            <div key={item} style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'rgba(74,222,128,0.8)', marginBottom:3 }}>• {item}</div>
          ))}
        </div>

        {/* Confirmation saisie */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)', marginBottom:8 }}>
            Tape <strong style={{ color:'var(--purple-glow)' }}>{CONFIRM_WORD}</strong> pour confirmer
          </div>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value.toUpperCase())}
            placeholder="PRESTIGE"
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${ready ? 'rgba(147,51,234,0.6)' : 'var(--border)'}`, borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-num)', fontSize:16.5, color:'var(--purple-glow)', textAlign:'center', letterSpacing:4, outline:'none', transition:'border-color 0.2s' }}
          />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex:1, padding:'12px', fontSize:13.4, cursor:'pointer' }}>
            ANNULER
          </button>
          <button onClick={onConfirm} disabled={!ready} className="btn-primary"
            style={{ flex:1, padding:'12px', fontSize:13.4, opacity: ready ? 1 : 0.35, cursor: ready ? 'pointer' : 'not-allowed' }}>
            ⭐ CONFIRMER
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrestigePage() {
  const { level, points, purchased, buyUpgrade, canPrestige, getTotalDpsMult, getTotalCoinsMult, getUpgradeDiscount, getStartGems, getStartPalier } = usePrestigeStore();
  const { maxPalierReached, doPrestige } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const eligible = canPrestige(maxPalierReached);

  const handlePrestige = () => {
    doPrestige();
    setShowConfirm(false);
  };

  const STAT_ROWS = [
    { label:'Niveau de Prestige',    val:`⭐ ${level}`,                              color:'var(--purple-glow)' },
    { label:'Points disponibles',    val:`${points} pts`,                            color:'#fbbf24'            },
    { label:'Bonus DPS total',       val:`×${getTotalDpsMult().toFixed(2)}`,         color:'var(--green)'       },
    { label:'Bonus coins total',     val:`×${getTotalCoinsMult().toFixed(2)}`,       color:'var(--gold)'        },
    { label:'Gemmes de départ',      val:`+${getStartGems()} 💎`,                    color:'var(--cyan-hi)'     },
    { label:'Palier de départ',      val:`Palier ${getStartPalier()}`,               color:'#c084fc'            },
    { label:'Réduction upgrades',    val:`-${Math.round((1-getUpgradeDiscount())*100)}%`, color:'#34d399'       },
  ];

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      {showConfirm && (
        <ConfirmDialog
          prestigeLevel={level}
          onConfirm={handlePrestige}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>

        {/* Header */}
        <div className="panel panel--glow" style={{ padding:'22px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:150, height:150, background:'radial-gradient(circle,rgba(147,51,234,0.12),transparent)', borderRadius:'50%', pointerEvents:'none' }} />
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:4, height:20, background:'linear-gradient(180deg,#c084fc,#7c3aed)', borderRadius:2, boxShadow:'0 0 8px #c084fc' }} />
              <span style={{ fontFamily:'var(--f-title)', fontSize:18.5, fontWeight:700, color:'var(--purple-glow)', letterSpacing:'3px' }}>NEW GAME+</span>
              {level > 0 && (
                <div style={{ background:'rgba(147,51,234,0.2)', border:'1px solid rgba(147,51,234,0.5)', borderRadius:6, padding:'2px 10px', fontFamily:'var(--f-num)', fontWeight:900, fontSize:14.4, color:'#c084fc' }}>
                  {'⭐'.repeat(Math.min(level, 5))} {level > 5 ? `×${level}` : ''}
                </div>
              )}
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)', maxWidth:420, lineHeight:1.6 }}>
              Réinitialise ton run depuis le palier 1 en échange de bonus permanents qui s&apos;accumulent à chaque prestige. Disponible après le palier 40.
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
            {eligible ? (
              <button onClick={() => setShowConfirm(true)} className="btn-primary"
                style={{ padding:'14px 28px', fontSize:15.5, letterSpacing:2, display:'flex', alignItems:'center', gap:10 }}>
                ⭐ PRESTIGE {level + 1}
              </button>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:14.4, color:'var(--text-dim)' }}>
                  🔒 Palier {maxPalierReached} / 40
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  Atteins le palier 40 pour débloquer
                </div>
                <div className="prog-track" style={{ marginTop:8, width:160 }}>
                  <div className="prog-fill" style={{ width:`${(maxPalierReached/40)*100}%` }} />
                </div>
              </div>
            )}
            <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:13.4, color:'#fbbf24' }}>
              {points} point{points > 1 ? 's' : ''} disponible{points > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Stats actives */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:12 }}>BONUS ACTIFS</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
            {STAT_ROWS.map((s, i) => (
              <div key={i} className="panel" style={{ padding:'16px 18px' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)', letterSpacing:1.5, marginBottom:8 }}>{s.label}</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:20.6, color:s.color, lineHeight:1.05 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus passifs par niveau */}
        {level > 0 && (
          <div className="panel" style={{ padding:'16px 20px', borderColor:'rgba(147,51,234,0.3)' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--purple-glow)', letterSpacing:2, marginBottom:10 }}>✦ BONUS PASSIFS PAR NIVEAU (×{level})</div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:13.4, color:'var(--green)' }}>
                🔥 +{(level * PRESTIGE_PASSIVE_DPS_PER_LEVEL * 100).toFixed(0)}% DPS total
              </div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:13.4, color:'var(--gold)' }}>
                🪙 +{(level * PRESTIGE_PASSIVE_COIN_PER_LEVEL * 100).toFixed(0)}% coins
              </div>
            </div>
          </div>
        )}

        {/* Shop prestige */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:12 }}>
            SHOP PRESTIGE — {points} point{points !== 1 ? 's' : ''} disponible{points !== 1 ? 's' : ''}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:12 }}>
            {PRESTIGE_UPGRADES.map(upg => {
              const currentLevel = purchased[upg.id] ?? 0;
              const maxed        = currentLevel >= upg.maxLevel;
              const canBuy       = !maxed && points >= upg.cost;

              return (
                <div key={upg.id} className="panel" style={{
                  padding:'16px',
                  borderColor: canBuy ? 'rgba(251,191,36,0.35)' : maxed ? 'rgba(74,222,128,0.35)' : 'var(--border)',
                  boxShadow: canBuy ? '0 0 20px rgba(251,191,36,0.12)' : maxed ? '0 0 12px rgba(74,222,128,0.08)' : 'none',
                  transition:'all 0.2s',
                  position:'relative', overflow:'hidden',
                }}>
                  {maxed && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,#4ade80,transparent)' }} />}
                  {canBuy && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,#fbbf24,transparent)' }} />}

                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                    <div style={{
                      width:44, height:44, flexShrink:0,
                      background: maxed ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${maxed ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`,
                      borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22.7,
                    }}>
                      {upg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:13.4, color: maxed ? '#4ade80' : 'var(--text)' }}>
                          {upg.name}
                        </span>
                        {upg.maxLevel > 1 && (
                          <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:12, color: maxed ? '#4ade80' : '#fbbf24', background: maxed ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)', border:`1px solid ${maxed ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`, borderRadius:4, padding:'2px 7px' }}>
                            {currentLevel}/{upg.maxLevel}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>{upg.description}</div>
                    </div>
                  </div>

                  {/* Barre de progression niveaux */}
                  {upg.maxLevel > 1 && (
                    <div className="prog-track" style={{ marginBottom:10, height:4 }}>
                      <div className="prog-fill" style={{
                        width:`${(currentLevel/upg.maxLevel)*100}%`,
                        background: maxed ? 'linear-gradient(90deg,#166534,#4ade80)' : 'linear-gradient(90deg,#78350f,#fbbf24)',
                        boxShadow: maxed ? '0 0 6px #4ade8066' : '0 0 6px #fbbf2466',
                      }} />
                    </div>
                  )}

                  {maxed ? (
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, fontWeight:700, color:'#4ade80', textAlign:'center', padding:'8px', background:'rgba(74,222,128,0.06)', borderRadius:6, border:'1px solid rgba(74,222,128,0.2)' }}>
                      ✅ NIVEAU MAXIMUM
                    </div>
                  ) : (
                    <button onClick={() => buyUpgrade(upg.id)} disabled={!canBuy}
                      className={canBuy ? 'btn-primary' : 'btn-secondary'}
                      style={{ width:'100%', padding:'9px', fontSize:13.4, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor: canBuy ? 'pointer' : 'not-allowed', opacity: canBuy ? 1 : 0.45 }}>
                      <span>ACHETER</span>
                      <span style={{ fontFamily:'var(--f-num)', color:'#fbbf24', fontWeight:900 }}>{upg.cost} pt{upg.cost > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
