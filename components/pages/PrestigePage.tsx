'use client';
import { useEffect, useState } from 'react';
import { usePrestigeStore } from '@/store/prestigeStore';
import { useGameStore } from '@/store/gameStore';
import { PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES, PrestigeBonusType, calcTokensAwarded } from '@/lib/game/prestige';

const PRESTIGE_PALIER_REQUIRED = 41;

function ConfirmDialog({ onConfirm, onCancel, prestigeLevel, tokensToGain }: {
  onConfirm: () => void;
  onCancel:  () => void;
  prestigeLevel: number;
  tokensToGain: number;
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
            Ton run va être réinitialisé. Tu gagnes <strong style={{ color:'#fbbf24' }}>+{tokensToGain} jeton{tokensToGain > 1 ? 's' : ''} de Prestige</strong>.
          </div>
        </div>

        {/* Ce qui reset */}
        <div style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#f87171', letterSpacing:2, marginBottom:8 }}>✕ RÉINITIALISÉ</div>
          {[
            'Équipements (fusion + inventaire)', 'Pixel-Coins → 0',
            'Collection : rang, forme et niveau de chaque carte',
            'Pièces perso d\'événement', 'Objets de la Forge', 'Niveau héros → 1', 'Palier → 1',
          ].map(item => (
            <div key={item} style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'rgba(248,113,113,0.8)', marginBottom:3 }}>• {item}</div>
          ))}
        </div>

        {/* Ce qui reste */}
        <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#4ade80', letterSpacing:2, marginBottom:8 }}>✓ CONSERVÉ</div>
          {[
            'Neko-Gemmes', 'Succès & Titres', 'Quêtes', 'BossCrowns & VoidOrbs',
            'Palier max atteint (classement)', 'Bonus de Prestige déjà obtenus',
            'Cartes shiny (Or/Diamant) + persos Forge/Event : rang conservé en banque, à redébloquer en les re-obtenant',
          ].map(item => (
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

function formatBonusValue(type: PrestigeBonusType, level: number): string {
  const def = PRESTIGE_BONUS_DEFS[type];
  const total = def.perLevel * level;
  if (type === 'tokenGain') return `+${total}`;
  if (type === 'shinyGold' || type === 'shinyDiamond') return `+${total.toFixed(2)}%`;
  return `+${(total * 100).toFixed(0)}%`;
}

function RollResultPopup({ type, onClose }: { type: PrestigeBonusType; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  const def = PRESTIGE_BONUS_DEFS[type];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9995, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="panel panel--glow" style={{ padding:'32px 44px', textAlign:'center', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:53.6 }}>{def.icon}</div>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:2 }}>BONUS OBTENU</div>
        <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'#fbbf24' }}>{def.label}</div>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:8 }}>Cliquez pour fermer</div>
      </div>
    </div>
  );
}

export function PrestigePage() {
  const { level, tokens, bonusLevels, canPrestige, spendToken } = usePrestigeStore();
  const { getRunPeakPalier, doPrestige } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [rollResult, setRollResult] = useState<PrestigeBonusType | null>(null);

  // Palier max atteint DEPUIS LE DERNIER PRESTIGE (pas le lifetime) : c'est
  // ce qui gate l'éligibilité, pour éviter de pouvoir represtiger en boucle
  // dès le palier 1 après un premier prestige.
  const runPeakPalier = getRunPeakPalier();
  const eligible = canPrestige(runPeakPalier);
  const tokensToGain = calcTokensAwarded(runPeakPalier, bonusLevels.tokenGain);

  const handlePrestige = () => {
    doPrestige();
    setShowConfirm(false);
  };

  const handleSpendToken = () => {
    const result = spendToken();
    if (result) setRollResult(result);
  };

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      {showConfirm && (
        <ConfirmDialog
          prestigeLevel={level}
          tokensToGain={tokensToGain}
          onConfirm={handlePrestige}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {rollResult && <RollResultPopup type={rollResult} onClose={() => setRollResult(null)} />}

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
              Réinitialise ton run depuis le palier 1 en échange de jetons de Prestige, à dépenser sur des bonus permanents tirés au hasard. Disponible dès le palier {PRESTIGE_PALIER_REQUIRED}, jamais obligatoire.
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
                  🔒 Palier {runPeakPalier} / {PRESTIGE_PALIER_REQUIRED}
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  Atteins le palier {PRESTIGE_PALIER_REQUIRED} pour débloquer
                </div>
                <div className="prog-track" style={{ marginTop:8, width:160 }}>
                  <div className="prog-fill" style={{ width:`${Math.min(100, (runPeakPalier/PRESTIGE_PALIER_REQUIRED)*100)}%` }} />
                </div>
              </div>
            )}
            {eligible && (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>
                Rapporte <strong style={{ color:'#fbbf24' }}>+{tokensToGain} jeton{tokensToGain > 1 ? 's' : ''}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Jetons + tirage */}
        <div className="panel" style={{ padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:4 }}>JETONS DE PRESTIGE</div>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:26.8, color:'#fbbf24' }}>🎫 {tokens}</div>
          </div>
          <button onClick={handleSpendToken} disabled={tokens <= 0} className={tokens > 0 ? 'btn-primary' : 'btn-secondary'}
            style={{ padding:'12px 24px', fontSize:14.4, cursor: tokens > 0 ? 'pointer' : 'not-allowed', opacity: tokens > 0 ? 1 : 0.4 }}>
            🎲 Utiliser un jeton — bonus aléatoire
          </button>
        </div>

        {/* Bonus actifs */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:12 }}>BONUS DE PRESTIGE</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
            {PRESTIGE_BONUS_TYPES.map(type => {
              const def = PRESTIGE_BONUS_DEFS[type];
              const bLevel = bonusLevels[type];
              const maxed = def.maxLevel !== undefined && bLevel >= def.maxLevel;
              return (
                <div key={type} className="panel" style={{ padding:'16px 18px', borderColor: maxed ? 'rgba(74,222,128,0.35)' : undefined }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:18.5 }}>{def.icon}</span>
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:'var(--text)' }}>{def.label}</span>
                  </div>
                  <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:20.6, color: maxed ? '#4ade80' : 'var(--gold-hi)', lineHeight:1.05 }}>
                    {formatBonusValue(type, bLevel)}
                  </div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginTop:4 }}>
                    Niveau {bLevel}{def.maxLevel ? ` / ${def.maxLevel}` : ''}
                  </div>
                  {def.maxLevel && (
                    <div className="prog-track" style={{ marginTop:8, height:4 }}>
                      <div className="prog-fill" style={{
                        width:`${Math.min(100, (bLevel/def.maxLevel)*100)}%`,
                        background: maxed ? 'linear-gradient(90deg,#166534,#4ade80)' : undefined,
                      }} />
                    </div>
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
