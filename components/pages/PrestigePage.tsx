'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES, PrestigeBonusType, calcTokensAwarded, formatBonusValue, STONE_MEMORY_MAX_LEVEL, getStoneMemoryCost, stoneMemoryCapEdition } from '@/lib/game/prestige';
import { formatNumber } from '@/lib/game/format';
import { EDITION_CONFIG } from '@/lib/game/editions';
import { EditionIcon } from '@/components/ui/EditionLogo';
import { STAT } from '@/lib/game/achievements';
import { LootReelPopup, LootReelItem, buildReel } from '@/components/ui/LootReelPopup';

const PRESTIGE_PALIER_REQUIRED = 41;

function ConfirmDialog({ onConfirm, onCancel, prestigeLevel, tokensToGain, saving, syncPending }: {
  onConfirm: () => void;
  onCancel:  () => void;
  prestigeLevel: number;
  tokensToGain: number;
  saving: boolean;
  syncPending: boolean;
}) {
  const [typed, setTyped] = useState('');
  const CONFIRM_WORD = 'PRESTIGE';
  const ready = typed === CONFIRM_WORD && !saving && !syncPending;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(4,3,14,0.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, overflowY:'auto' }}>
      <div className="panel panel--glow" style={{ width:'100%', maxWidth:480, maxHeight:'calc(100vh - 48px)', overflowY:'auto', padding:'32px 28px', display:'flex', flexDirection:'column', gap:20, textAlign:'center' }}>

        <div style={{ fontSize:56 }}>⭐</div>

        <div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:24, fontWeight:900, color:'var(--purple-glow)', letterSpacing:2, marginBottom:8 }}>
            PRESTIGE {prestigeLevel + 1}
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:16, color:'var(--text-dim)', lineHeight:1.7 }}>
            Ton run va être réinitialisé. Tu gagnes <strong style={{ color:'#fbbf24' }}>+{tokensToGain} jeton{tokensToGain > 1 ? 's' : ''} de Prestige</strong>.
          </div>
        </div>

        {/* Ce qui reset */}
        <div style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'#f87171', letterSpacing:2, marginBottom:8 }}>✕ RÉINITIALISÉ</div>
          {[
            'Équipements (fusion + inventaire)', 'Pixel-Coins → 0',
            'Collection : rang, forme et niveau de chaque carte',
            'Pièces perso de raid', 'Objets de la Forge', 'Niveau héros → 1', 'Palier → 1',
          ].map(item => (
            <div key={item} style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(248,113,113,0.8)', marginBottom:3 }}>• {item}</div>
          ))}
        </div>

        {/* Ce qui reste */}
        <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:10, padding:'14px 18px', textAlign:'left' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'#4ade80', letterSpacing:2, marginBottom:8 }}>✓ CONSERVÉ</div>
          {[
            'Neko-Gemmes', 'Succès & Titres', 'Quêtes', 'BossCrowns & VoidOrbs',
            'Palier max atteint (classement)', 'Bonus de Prestige déjà obtenus',
            'Jauge d\'édition max déjà atteinte par chaque carte : récupérable à la re-obtention selon le niveau de "Mémoire des Pierres"',
          ].map(item => (
            <div key={item} style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(74,222,128,0.8)', marginBottom:3 }}>• {item}</div>
          ))}
        </div>

        {/* Confirmation saisie */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', marginBottom:8 }}>
            Tape <strong style={{ color:'var(--purple-glow)' }}>{CONFIRM_WORD}</strong> pour confirmer
          </div>
          <input
            value={typed}
            onChange={e => setTyped(e.target.value.toUpperCase())}
            placeholder="PRESTIGE"
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:`1px solid ${ready ? 'rgba(147,51,234,0.6)' : 'var(--border)'}`, borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-num)', fontSize:18, color:'var(--purple-glow)', textAlign:'center', letterSpacing:4, outline:'none', transition:'border-color 0.2s' }}
          />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} disabled={saving} className="btn-secondary"
            style={{ flex:1, padding:'12px', fontSize:16, opacity: saving ? 0.35 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {syncPending ? 'FERMER' : 'ANNULER'}
          </button>
          <button onClick={onConfirm} disabled={!ready} className="btn-primary"
            style={{ flex:1, padding:'12px', fontSize:16, opacity: ready ? 1 : 0.35, cursor: ready ? 'pointer' : 'not-allowed' }}>
            {saving ? '⏳ SAUVEGARDE…' : '⭐ CONFIRMER'}
          </button>
        </div>
        {saving && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>
            Ne ferme pas le jeu ni ne change d'appareil pendant la sauvegarde…
          </div>
        )}
        {syncPending && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'#f87171' }}>
            Sauvegarde cloud pas encore confirmée — un nouvel essai est en cours en arrière-plan. Évite de changer d'appareil pour l'instant.
          </div>
        )}
      </div>
    </div>
  );
}

export { formatBonusValue };

// ─── Roue de tirage (façon lootbox) ─────────────────────────────────────────
const BONUS_COLORS: Record<PrestigeBonusType, string> = {
  dps: '#f97316',
  gold: '#eab308',
  editionRate: '#38bdf8',
  equipDrop: '#4ade80',
  tokenGain: '#fbbf24',
};

function bonusReelItem(type: PrestigeBonusType): LootReelItem {
  const def = PRESTIGE_BONUS_DEFS[type];
  return { icon: def.icon, label: def.label, color: BONUS_COLORS[type] };
}

const MULTI_SPIN_COUNT = 5;

function PrestigeReelPopup({ results, onClose }: { results: PrestigeBonusType[]; onClose: () => void }) {
  const [reels] = useState(() => results.map(r =>
    buildReel(r, () => PRESTIGE_BONUS_TYPES[Math.floor(Math.random() * PRESTIGE_BONUS_TYPES.length)]).map(bonusReelItem)));
  // Regroupe les résultats identiques (ex. "💥 DPS ×2").
  const counts = results.reduce<Partial<Record<PrestigeBonusType, number>>>((acc, r) => ({ ...acc, [r]: (acc[r] ?? 0) + 1 }), {});
  return (
    <LootReelPopup
      reels={reels}
      revealedTitle={results.length > 1 ? 'BONUS OBTENUS' : 'BONUS OBTENU'}
      onClose={onClose}
      revealed={(
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'6px 16px' }}>
          {(Object.entries(counts) as [PrestigeBonusType, number][]).map(([type, n]) => {
            const def = PRESTIGE_BONUS_DEFS[type];
            return (
              <div key={type} style={{ fontFamily:'var(--f-title)', fontSize: results.length > 1 ? 18 : 22, fontWeight:900, color:'#fbbf24', display:'flex', alignItems:'center', gap:8 }}>
                <span>{def.icon}</span>{def.label}{n > 1 ? ` ×${n}` : ''}
              </div>
            );
          })}
        </div>
      )}
    />
  );
}

// Explosion de "Tout utiliser" : flash, onde de choc et jetons projetés,
// puis le récap qui "pop" avec ses lignes en cascade.
const BURST_CSS = `
  @keyframes pbFlash   { 0% { opacity:0 } 12% { opacity:1 } 100% { opacity:0 } }
  @keyframes pbRing    { 0% { transform:translate(-50%,-50%) scale(0); opacity:1 } 100% { transform:translate(-50%,-50%) scale(1); opacity:0 } }
  @keyframes pbShard   { 0% { transform:translate(-50%,-50%) translate(0,0) rotate(0) scale(0.4); opacity:1 }
                         80% { opacity:1 }
                         100% { transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(1); opacity:0 } }
  @keyframes pbPop     { 0% { transform:scale(0.3); opacity:0 } 60% { transform:scale(1.08); opacity:1 } 100% { transform:scale(1) } }
  @keyframes pbRow     { 0% { transform:translateY(12px); opacity:0 } 100% { transform:none; opacity:1 } }
  @keyframes pbShake   { 0%,100% { transform:none } 20% { transform:translate(-6px,3px) } 40% { transform:translate(5px,-4px) } 60% { transform:translate(-4px,-2px) } 80% { transform:translate(3px,4px) } }
  .pb-overlay { animation: pbShake 0.4s ease-out; }
  .pb-flash   { position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at center, rgba(255,236,170,0.95), rgba(251,191,36,0.45) 35%, transparent 70%); animation:pbFlash 0.7s ease-out forwards; }
  .pb-ring    { position:absolute; left:50%; top:50%; width:min(140vw,1100px); aspect-ratio:1; border-radius:50%; pointer-events:none; border:6px solid #fbbf24; box-shadow:0 0 40px #fbbf24, inset 0 0 40px #fbbf24; animation:pbRing 0.8s cubic-bezier(0.2,0.7,0.3,1) forwards; }
  .pb-ring.pb-ring2 { border-color:#c084fc; box-shadow:0 0 40px #c084fc, inset 0 0 40px #c084fc; animation-delay:0.12s; transform:translate(-50%,-50%) scale(0); }
  .pb-shard   { position:absolute; left:50%; top:50%; pointer-events:none; line-height:1; animation:pbShard 1s cubic-bezier(0.15,0.8,0.3,1) forwards; }
  .pb-panel   { animation:pbPop 0.5s cubic-bezier(0.2,0.9,0.3,1.2) 0.25s both; }
  .pb-row     { animation:pbRow 0.35s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .pb-overlay, .pb-panel, .pb-row { animation:none; }
    .pb-flash, .pb-ring, .pb-shard { display:none; }
  }
`;

const BURST_SHARDS = ['🎫', '🎫', '🎫', '✨', '⭐', '💥'];

// "Tout utiliser" : pas de roue, juste le récap regroupé des bonus obtenus.
function PrestigeBulkSummaryPopup({ gained, onClose }: { gained: Partial<Record<PrestigeBonusType, number>>; onClose: () => void }) {
  const total = Object.values(gained).reduce((a, n) => a + (n ?? 0), 0);
  const [shards] = useState(() => Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 160 + Math.random() * 260;
    return {
      icon: BURST_SHARDS[i % BURST_SHARDS.length],
      dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist,
      rot: (Math.random() - 0.5) * 720,
      size: 20 + Math.random() * 18,
      delay: Math.random() * 0.12,
    };
  }));
  return (
    <div className="pb-overlay" style={{ position:'fixed', inset:0, zIndex:9995, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.82)', padding:16, overflow:'hidden' }}>
      <style>{BURST_CSS}</style>
      <div className="pb-flash" />
      <div className="pb-ring" />
      <div className="pb-ring pb-ring2" />
      {shards.map((s, i) => (
        <span key={i} className="pb-shard" style={{
          fontSize:s.size, animationDelay:`${s.delay}s`,
          ['--dx' as string]:`${s.dx}px`, ['--dy' as string]:`${s.dy}px`, ['--rot' as string]:`${s.rot}deg`,
        } as React.CSSProperties}>{s.icon}</span>
      ))}
      <div className="panel panel--glow pb-panel" style={{ position:'relative', width:'100%', maxWidth:420, maxHeight:'calc(100vh - 32px)', overflowY:'auto', padding:'26px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', letterSpacing:2 }}>
          {total} JETON{total > 1 ? 'S' : ''} UTILISÉ{total > 1 ? 'S' : ''}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
          {PRESTIGE_BONUS_TYPES.filter(t => gained[t]).map((type, i) => {
            const def = PRESTIGE_BONUS_DEFS[type];
            return (
              <div key={type} className="pb-row" style={{ animationDelay:`${0.55 + i * 0.12}s`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 14px', borderRadius:10, border:`1px solid ${BONUS_COLORS[type]}55`, background:`linear-gradient(90deg, ${BONUS_COLORS[type]}22, transparent)` }}>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16, color:'var(--text)', display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                  <span style={{ fontSize:20 }}>{def.icon}</span>{def.label}
                </span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18, color:BONUS_COLORS[type], whiteSpace:'nowrap' }}>+{gained[type]}</span>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="btn-primary" style={{ padding:'10px 30px', fontSize:16, marginTop:4 }}>FERMER</button>
      </div>
    </div>
  );
}

// Nombre de jetons à avoir tirés (toutes vies confondues) pour débloquer "Tout utiliser".
const SPEND_ALL_UNLOCK = 250;

export function PrestigePage() {
  const {
    prestigeLevel: level, prestigeTokens: tokens, prestigeBonusLevels: bonusLevels, canPrestige, spendToken, spendAllTokens,
    prestigeRankRecoveryLevel: stoneMemoryLevel, buyStoneMemory, doPrestige,
  } = useGameStore(useShallow(s => ({ prestigeLevel: s.prestigeLevel, prestigeTokens: s.prestigeTokens, prestigeBonusLevels: s.prestigeBonusLevels, canPrestige: s.canPrestige, spendToken: s.spendToken, spendAllTokens: s.spendAllTokens,prestigeRankRecoveryLevel: s.prestigeRankRecoveryLevel, buyStoneMemory: s.buyStoneMemory, doPrestige: s.doPrestige })));
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPrestige, setSavingPrestige] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const [rollResults, setRollResults] = useState<PrestigeBonusType[] | null>(null);
  const [bulkResults, setBulkResults] = useState<Partial<Record<PrestigeBonusType, number>> | null>(null);

  // Palier max atteint DEPUIS LE DERNIER PRESTIGE (pas le lifetime) : c'est
  // ce qui gate l'éligibilité, pour éviter de pouvoir represtiger en boucle
  // dès le palier 1 après un premier prestige.
  const runPeakPalier = useGameStore(s => s.getRunPeakPalier());
  const eligible = canPrestige(runPeakPalier);
  const tokensToGain = calcTokensAwarded(runPeakPalier, bonusLevels.tokenGain);

  // On garde le dialogue ouvert (bouton de confirmation désactivé, message
  // "sync en attente") tant que doPrestige() n'a pas confirmé que le reset a
  // bien atteint Firestore — sinon rien n'empêche le joueur de changer
  // d'appareil dans la seconde qui suit, avant que la sauvegarde urgente
  // n'ait eu le temps de partir (voir metaProgressionSlice). Le reset local
  // a déjà eu lieu à ce stade dans les deux cas ; en cas d'échec, un
  // rattrapage tourne déjà en arrière-plan (voir doPrestige).
  const handlePrestige = async () => {
    setSavingPrestige(true);
    const confirmed = await doPrestige();
    setSavingPrestige(false);
    if (confirmed) {
      setShowConfirm(false);
      setSyncPending(false);
    } else {
      setSyncPending(true);
    }
  };

  const handleSpendTokens = (count: number) => {
    const results: PrestigeBonusType[] = [];
    for (let i = 0; i < count; i++) {
      const result = spendToken();
      if (!result) break;
      results.push(result);
    }
    if (results.length > 0) setRollResults(results);
    // Succès "Quinte du Destin" : tirage x5 tombé 5 fois sur le même bonus.
    if (count === MULTI_SPIN_COUNT && results.length === MULTI_SPIN_COUNT && results.every(r => r === results[0])) {
      useGameStore.getState().discover(STAT.prestigeQuint);
    }
  };

  // Chaque jeton tiré donne exactement +1 niveau de bonus : la somme des
  // niveaux est donc le nombre de jetons tirés depuis toujours (rétroactif).
  const tokensRolled = PRESTIGE_BONUS_TYPES.reduce((a, t) => a + bonusLevels[t], 0);
  const spendAllUnlocked = tokensRolled >= SPEND_ALL_UNLOCK;

  const handleSpendAll = () => {
    const gained = spendAllTokens();
    if (Object.keys(gained).length > 0) setBulkResults(gained);
  };

  return (
    <div className="prestige-page" style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <style>{`
        @media (max-width: 640px) {
          .prestige-page { padding: 14px 12px !important; }
          .prestige-header { flex-direction: column; align-items: stretch !important; }
          .prestige-header-text { max-width: none !important; }
          .prestige-header-right { align-items: stretch !important; width: 100%; }
          .prestige-header-right button, .prestige-header-right > div { width: 100%; box-sizing: border-box; justify-content: center; }
          .prestige-header-right .prog-track { width: 100% !important; }
          .prestige-row { flex-direction: column; align-items: stretch !important; }
          .prestige-row button { width: 100%; box-sizing: border-box; }
          .prestige-bonus-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; }
        }
      `}</style>
      {showConfirm && (
        <ConfirmDialog
          prestigeLevel={level}
          tokensToGain={tokensToGain}
          onConfirm={handlePrestige}
          onCancel={() => { setShowConfirm(false); setSyncPending(false); }}
          saving={savingPrestige}
          syncPending={syncPending}
        />
      )}
      {rollResults && <PrestigeReelPopup results={rollResults} onClose={() => setRollResults(null)} />}
      {bulkResults && <PrestigeBulkSummaryPopup gained={bulkResults} onClose={() => setBulkResults(null)} />}

      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>

        {/* Header */}
        <div className="panel panel--glow prestige-header" style={{ padding:'22px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:'-30px', right:'-30px', width:150, height:150, background:'radial-gradient(circle,rgba(147,51,234,0.12),transparent)', borderRadius:'50%', pointerEvents:'none' }} />
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
              <div style={{ width:4, height:20, background:'linear-gradient(180deg,#c084fc,#7c3aed)', borderRadius:2, boxShadow:'0 0 8px #c084fc' }} />
              <span className="page-title" style={{ color:'var(--purple-glow)' }}>NEW GAME+</span>
              {level > 0 && (
                <div style={{ background:'rgba(147,51,234,0.2)', border:'1px solid rgba(147,51,234,0.5)', borderRadius:6, padding:'2px 10px', fontFamily:'var(--f-num)', fontWeight:900, fontSize:16, color:'#c084fc' }}>
                  {'⭐'.repeat(Math.min(level, 5))} {level > 5 ? `×${level}` : ''}
                </div>
              )}
            </div>
            <div className="prestige-header-text" style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', maxWidth:420, lineHeight:1.6 }}>
              Réinitialise ton run depuis le palier 1 en échange de jetons de Prestige, à dépenser sur des bonus permanents tirés au hasard. Disponible dès le palier {PRESTIGE_PALIER_REQUIRED}, jamais obligatoire.
            </div>
          </div>

          <div className="prestige-header-right" style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
            {eligible ? (
              <button onClick={() => { setSyncPending(false); setShowConfirm(true); }} className="btn-primary"
                style={{ padding:'14px 28px', fontSize:18, letterSpacing:2, display:'flex', alignItems:'center', gap:10 }}>
                ⭐ PRESTIGE {level + 1}
              </button>
            ) : (
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:16, color:'var(--text-dim)' }}>
                  🔒 Palier {runPeakPalier} / {PRESTIGE_PALIER_REQUIRED}
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)', marginTop:3 }}>
                  Atteins le palier {PRESTIGE_PALIER_REQUIRED} pour débloquer
                </div>
                <div className="prog-track" style={{ marginTop:8, width:160 }}>
                  <div className="prog-fill" style={{ width:`${Math.min(100, (runPeakPalier/PRESTIGE_PALIER_REQUIRED)*100)}%` }} />
                </div>
              </div>
            )}
            {eligible && (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>
                Rapporte <strong style={{ color:'#fbbf24' }}>+{tokensToGain} jeton{tokensToGain > 1 ? 's' : ''}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Jetons + tirage */}
        <div className="panel prestige-row" style={{ padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-dim)', letterSpacing:2, marginBottom:4 }}>JETONS DE PRESTIGE</div>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:28, color:'#fbbf24' }}>🎫 {tokens}</div>
            {spendAllUnlocked && (() => {
              const can = tokens > 0 && rollResults === null && bulkResults === null;
              return (
                <button onClick={handleSpendAll} disabled={!can}
                  style={{
                    marginTop:8, minHeight:44, padding:'8px 18px', fontSize:16, fontFamily:'var(--f-ui)', fontWeight:700, letterSpacing:1,
                    color: can ? '#1a1205' : 'var(--text-dim)', borderRadius:8,
                    border:`1px solid ${can ? '#fde68a' : 'var(--border)'}`,
                    background: can ? 'linear-gradient(135deg,#fde68a,#fbbf24 45%,#f59e0b)' : 'rgba(255,255,255,0.04)',
                    boxShadow: can ? '0 0 14px rgba(251,191,36,0.45)' : 'none',
                    cursor: can ? 'pointer' : 'not-allowed', opacity: can ? 1 : 0.5,
                  }}>
                  ⚡ Tout utiliser
                </button>
              );
            })()}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, minWidth:0 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {[1, MULTI_SPIN_COUNT].map(count => {
                const can = tokens >= count && rollResults === null;
                return (
                  <button key={count} onClick={() => handleSpendTokens(count)} disabled={!can} className={can ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding:'12px 24px', fontSize:16, cursor: can ? 'pointer' : 'not-allowed', opacity: can ? 1 : 0.4 }}>
                    {count === 1 ? '🎲 Utiliser un jeton — bonus aléatoire' : `🎲 Utiliser ${count} jetons`}
                  </button>
                );
              })}
            </div>
            {!spendAllUnlocked && (
              <div title="Débloque le bouton « Tout utiliser »">
                <div style={{ display:'flex', justifyContent:'space-between', gap:8, fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', flexWrap:'wrap' }}>
                  <span>🔒 « Tout utiliser » : jetons tirés</span>
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:700, color:'#fbbf24' }}>🎫 {tokensRolled} / {SPEND_ALL_UNLOCK}</span>
                </div>
                <div className="prog-track" style={{ marginTop:6, height:4 }}>
                  <div className="prog-fill" style={{ width:`${Math.min(100, (tokensRolled / SPEND_ALL_UNLOCK) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mémoire des Pierres — achat direct, pas de tirage */}
        <div className="panel prestige-row" style={{ padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:220 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:20 }}>💎</span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text)' }}>Mémoire des Pierres</span>
              <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>Niveau {stoneMemoryLevel} / {STONE_MEMORY_MAX_LEVEL}</span>
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', lineHeight:1.6, maxWidth:460 }}>
              {(() => {
                const cap = stoneMemoryCapEdition(stoneMemoryLevel);
                return cap
                  ? <>Une carte déjà obtenue dans une vie précédente retrouve la jauge d’édition qu’elle avait, plafonnée à l’édition <strong style={{ color: EDITION_CONFIG[cap].color }}><EditionIcon edition={cap} size={14} /> {EDITION_CONFIG[cap].label}</strong>, au lieu de repartir de zéro.</>
                  : <>Débloque la récupération de la jauge d’édition d’une carte déjà obtenue dans une vie précédente, au lieu de repartir de zéro. Chaque niveau relève le plafond d’une édition (niv. 7 : Prismatique).</>;
              })()}
            </div>
          </div>
          {(() => {
            const cost = getStoneMemoryCost(stoneMemoryLevel);
            const maxed = cost === null;
            const canBuy = !maxed && tokens >= cost!;
            return (
              <button onClick={buyStoneMemory} disabled={!canBuy} className={canBuy ? 'btn-primary' : 'btn-secondary'}
                style={{ padding:'12px 24px', fontSize:16, cursor: canBuy ? 'pointer' : 'not-allowed', opacity: maxed ? 0.6 : canBuy ? 1 : 0.4, whiteSpace:'nowrap' }}>
                {maxed ? '✓ NIVEAU MAX' : `💎 Améliorer — 🎫 ${formatNumber(cost!)}`}
              </button>
            );
          })()}
        </div>

        {/* Bonus actifs */}
        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-dim)', letterSpacing:2, marginBottom:12 }}>BONUS DE PRESTIGE</div>
          <div className="prestige-bonus-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
            {PRESTIGE_BONUS_TYPES.map(type => {
              const def = PRESTIGE_BONUS_DEFS[type];
              const bLevel = bonusLevels[type];
              const maxed = def.maxLevel !== undefined && bLevel >= def.maxLevel;
              return (
                <div key={type} className="panel" style={{ padding:'16px 18px', borderColor: maxed ? 'rgba(74,222,128,0.35)' : undefined }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:20 }}>{def.icon}</span>
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text)' }}>{def.label}</span>
                  </div>
                  <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:22, color: maxed ? '#4ade80' : 'var(--gold-hi)', lineHeight:1.05 }}>
                    {formatBonusValue(type, bLevel)}
                  </div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', marginTop:4 }}>
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
