'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/lib/game/format';
import { redeemGiftCode } from '@/lib/firebase/giftCodes';
import { useSpoilerStore } from '@/store/spoilerStore';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { formatSyncStatus, type CloudSyncStatus } from '@/lib/firebase/cloudSaveSync';
import { updatePlayerScore } from '@/lib/firebase/leaderboard';
import { bnAdd, bnFromNumber } from '@/lib/game/bignum';

export function SettingsPage({ onForceSave, syncStatus, lastSyncedAt }: { onForceSave?: () => Promise<boolean>; syncStatus?: CloudSyncStatus; lastSyncedAt?: number | null }) {
  const { resetGame, pixelCoins, nekoGems, totalClicks, wave, palier, maxPalierReached, collection, username, setUsername, getTotalDps } = useGameStore();
  const { user, logout } = useAuth();
  const { protectedUniverses, toggleUniverse } = useSpoilerStore();
  const [spoilerSearch, setSpoilerSearch] = useState('');
  const ALL_UNIVERSES = [...new Set(CHARACTER_POOL.map(c => c.universe).filter((u): u is string => !!u))].sort((a, b) => a.localeCompare(b, 'fr'));
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone]       = useState(false);
  const [saving,    setSaving]          = useState(false);
  const [saveOk,    setSaveOk]          = useState(false);
  const [saveError, setSaveError]       = useState(false);

  // ── Code cadeau ──────────────────────────────────────────────────────
  const [nameInput,   setNameInput]   = useState(username);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const [savingName,  setSavingName]  = useState(false);
  const [giftInput,    setGiftInput]    = useState('');
  const [giftLoading,  setGiftLoading]  = useState(false);
  const [giftFeedback, setGiftFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setNameInput(username);
  }, [username]);

  const handleSaveName = async () => {
    const finalName = nameInput.trim().slice(0, 20);
    if (!finalName) {
      setNameFeedback('Le pseudo ne peut pas être vide.');
      return;
    }
    if (!user) {
      setNameFeedback('Connecte-toi pour changer ton pseudo.');
      return;
    }
    setSavingName(true);
    setUsername(finalName);
    try {
      // Synchronise immédiatement `users/{uid}` (fiche identité, lue par
      // l'admin) ET `saves/{uid}` (classement/marché) via la même fonction
      // que LeaderboardPage — sans cet appel immédiat, seul `saves/{uid}`
      // aurait fini par recevoir le nouveau pseudo (au prochain autosave,
      // jusqu'à 10min plus tard), laissant la fiche admin définitivement
      // périmée puisque rien d'autre ne l'aurait jamais resynchronisée.
      await updatePlayerScore(user.uid, { username: finalName, palier, maxPalierReached, wave, totalClicks, pixelCoins, totalDps: getTotalDps() });
      setNameFeedback('Pseudo enregistré.');
    } catch {
      setNameFeedback('Erreur réseau, réessaie.');
    }
    setSavingName(false);
  };

  const handleRedeemGift = async () => {
    if (!giftInput.trim() || giftLoading) return;
    setGiftLoading(true);
    setGiftFeedback(null);
    const result = await redeemGiftCode(user?.uid ?? null, giftInput);
    setGiftLoading(false);

    if (result.success) {
      // Coins & gems
      useGameStore.setState(s => ({
        nekoGems:   s.nekoGems   + result.gems,
        pixelCoins: bnAdd(s.pixelCoins, bnFromNumber(result.pixelCoins)),
      }));
      // Personnages
      if (result.characters && result.characters.length > 0) {
        const { addToCollection } = useGameStore.getState();
        result.characters.forEach(id => addToCollection(id));
      }
      // Personnages MAX (7★, dernière évo, niveau max, édition Diamant)
      if (result.maxCharacters && result.maxCharacters.length > 0) {
        const { grantMaxedCharacter } = useGameStore.getState();
        result.maxCharacters.forEach(id => grantMaxedCharacter(id, 'diamond'));
      }
      // Items / équipements
      if (result.items && result.items.length > 0) {
        const { addItem } = useGameStore.getState();
        result.items.forEach(id => addItem(id, 1));
      }
      if (result.equipment && result.equipment.length > 0) {
        const { addEquipment } = useGameStore.getState();
        result.equipment.forEach(id => addEquipment(id, 1));
      }
      // Drops spéciaux d'expédition (ex: Pierres d'Évolution) — dropInventory,
      // distinct de l'inventaire d'items classique (voir dropId dans expeditions.ts).
      if (result.drops && Object.keys(result.drops).length > 0) {
        useGameStore.setState(s => {
          const expeditionDropInventory = { ...s.expeditionDropInventory };
          for (const [dropId, qty] of Object.entries(result.drops)) {
            expeditionDropInventory[dropId] = (expeditionDropInventory[dropId] ?? 0) + qty;
          }
          return { expeditionDropInventory };
        });
      }
      const parts: string[] = [];
      if (result.gems              > 0) parts.push(`+${result.gems} 💎`);
      if (result.pixelCoins        > 0) parts.push(`+${formatNumber(result.pixelCoins)} 🪙`);
      if (result.characters?.length > 0) parts.push(`${result.characters.length} personnage(s) 🧬`);
      if (result.maxCharacters?.length > 0) parts.push(`${result.maxCharacters.length} personnage(s) 💎 MAX`);
      if (result.items?.length      > 0) parts.push(`${result.items.length} item(s) 🎁`);
      if (result.equipment?.length  > 0) parts.push(`${result.equipment.length} équipement(s) ⚔️`);
      if (result.drops && Object.keys(result.drops).length > 0) parts.push(`${Object.values(result.drops).reduce((a,b) => a+b, 0)} drop(s) spécial(aux) ✦`);
      setGiftFeedback({ ok: true, msg: `${parts.join('  ')} ajoutés !` });
      setGiftInput('');
    } else {
      const messages: Record<string, string> = {
        invalid:        'Code invalide.',
        already_used:   'Ce code a déjà été utilisé.',
        not_logged_in:  'Connecte-toi d\'abord pour valider un code.',
        error:          'Erreur réseau, réessaie plus tard.',
      };
      setGiftFeedback({ ok: false, msg: messages[result.reason] ?? 'Erreur inconnue.' });
    }
  };

  const isLocal = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.')
  );

  // ── Reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    try { localStorage.clear(); } catch {}
    resetGame();
    setConfirmReset(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  const saveData = {
    'Pixel-Coins':        formatNumber(pixelCoins),
    'Neko-Gemmes':        formatNumber(nekoGems),
    'Clics totaux':       formatNumber(totalClicks),
    'Palier actuel':      String(palier),
    'Vague actuelle':     String(wave),
    'Palier max atteint': String(maxPalierReached),
    'Alliés obtenus':     String(Object.keys(collection).length),
  };

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <div style={{ maxWidth:'600px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* ── COMPTE ── */}
        <div className="panel" style={{ padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,var(--purple-hi),var(--purple-dim))', borderRadius:'2px', boxShadow:'0 0 8px var(--purple-hi)' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'var(--purple-glow)', letterSpacing:'2px' }}>COMPTE</span>
          </div>
          <div style={{ display:'grid', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:44, height:44, background:'linear-gradient(135deg,#3b0764,#6d28d9)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22.7px', border:'1px solid var(--purple-dim)' }}>🐱</div>
              <div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'15.5px', color:'var(--text)' }}>{username || 'NEKOZ'}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', marginTop:'2px' }}>{user ? user.email : 'Sans compte'}</div>
              </div>
            </div>
            {user ? (
              <>
                <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                  <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
                    placeholder="Ton pseudo"
                    style={{ flex:1, minWidth:'180px', padding:'12px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', color:'var(--text)', fontFamily:'var(--f-ui)', fontWeight:700 }} />
                  <button onClick={handleSaveName} disabled={savingName}
                    style={{ padding:'12px 20px', background:'linear-gradient(135deg,#6d28d9,#a855f7)', border:'1px solid #c084fc', borderRadius:'10px', fontFamily:'var(--f-ui)', fontWeight:700, color:'white', cursor: savingName ? 'wait' : 'pointer' }}>
                    {savingName ? '...' : 'ENREGISTRER'}
                  </button>
                </div>
                {nameFeedback && <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>{nameFeedback}</div>}
              </>
            ) : (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>Connecte-toi pour définir un pseudo.</div>
            )}
            {user ? (
              <button onClick={async () => { if (onForceSave) await onForceSave(); await logout(); }}
                style={{ padding:'10px 16px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--red)', cursor:'pointer', width:'fit-content' }}>
                DÉCONNEXION
              </button>
            ) : (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)' }}>○ Non connecté</div>
            )}

            {/* ── Sauvegarde forcée ─────────────────────────────────── */}
            {user && onForceSave && (
              <button
                onClick={async () => {
                  setSaving(true); setSaveOk(false); setSaveError(false);
                  const ok = await onForceSave();
                  setSaving(false);
                  setSaveOk(ok); setSaveError(!ok);
                  setTimeout(() => { setSaveOk(false); setSaveError(false); }, ok ? 3000 : 6000);
                }}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 16px', width: 'fit-content',
                  background: saveError ? 'rgba(248,113,113,0.1)' : saveOk ? 'rgba(74,222,128,0.1)' : 'rgba(99,102,241,0.1)',
                  border: `1px solid ${saveError ? 'rgba(248,113,113,0.4)' : saveOk ? 'rgba(74,222,128,0.4)' : 'rgba(99,102,241,0.4)'}`,
                  borderRadius: '8px', cursor: saving ? 'wait' : 'pointer',
                  fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: '12.4px',
                  color: saveError ? '#f87171' : saveOk ? '#4ade80' : '#a5b4fc',
                  transition: 'all 0.3s',
                }}
              >
                <span>{saving ? '⏳' : saveError ? '⚠️' : saveOk ? '✅' : '☁️'}</span>
                <span>{saving ? 'SAUVEGARDE...' : saveError ? 'ÉCHEC — réessaie ou vérifie ta connexion' : saveOk ? 'SAUVEGARDÉ !' : 'FORCER LA SAUVEGARDE'}</span>
              </button>
            )}

            {/* ── État de synchro cloud — confirme sur QUEL appareil on est à
                jour, sans avoir à ouvrir la console navigateur. */}
            {user && syncStatus && (() => {
              const st = formatSyncStatus(syncStatus, lastSyncedAt ?? null);
              return (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:st.color, flexShrink:0 }} />
                  <span>{st.label}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── CODE CADEAU ── */}
        <div className="panel" style={{ padding:'20px', border:'1px solid rgba(168,85,247,0.3)', boxShadow:'0 0 16px rgba(168,85,247,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#c084fc,#6d28d9)', borderRadius:'2px', boxShadow:'0 0 8px #c084fc' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#c084fc', letterSpacing:'2px' }}>🎁 CODE CADEAU</span>
          </div>

          {!user && !isLocal ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)' }}>
              Connecte-toi d&apos;abord pour pouvoir valider un code cadeau.
            </div>
          ) : (
            <>
              <div style={{ display:'flex', gap:'10px' }}>
                <input
                  type="text" value={giftInput}
                  onChange={e => setGiftInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRedeemGift(); }}
                  placeholder="Entre ton code ici..."
                  disabled={giftLoading}
                  style={{ flex:1, padding:'11px 14px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)', letterSpacing:'1px', textTransform:'uppercase' }}
                />
                <button onClick={handleRedeemGift} disabled={giftLoading || !giftInput.trim()}
                  style={{ padding:'11px 20px', background: giftLoading||!giftInput.trim() ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg,#6d28d9,#a855f7)', border:`1px solid ${giftLoading||!giftInput.trim()?'var(--border)':'#c084fc'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color: giftLoading||!giftInput.trim() ? 'var(--text-muted)' : 'white', cursor: giftLoading||!giftInput.trim() ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                  {giftLoading ? '...' : 'VALIDER'}
                </button>
              </div>
              {giftFeedback && (
                <div style={{ marginTop:'12px', padding:'10px 14px', borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px',
                  background: giftFeedback.ok ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${giftFeedback.ok ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  color: giftFeedback.ok ? 'var(--green)' : 'var(--red)' }}>
                  {giftFeedback.ok ? '✅' : '❌'} {giftFeedback.msg}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── ANTI-SPOIL ── */}
        <div className="panel" style={{ padding:'20px', border:'1px solid rgba(96,165,250,0.3)', boxShadow:'0 0 16px rgba(96,165,250,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#60a5fa,#1d4ed8)', borderRadius:'2px', boxShadow:'0 0 8px #60a5fa' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#60a5fa', letterSpacing:'2px' }}>🙈 ANTI-SPOIL</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)', marginBottom:'14px', lineHeight:1.5 }}>
            Coche les univers que tu n&apos;as pas encore terminés (anime, jeu, série...). Pour ces univers, les personnages qui évoluent garderont l&apos;illustration de leur forme précédente au lieu de révéler la nouvelle — partout dans le jeu.
          </div>

          <input
            type="text" value={spoilerSearch} onChange={e => setSpoilerSearch(e.target.value)}
            placeholder="Rechercher un univers..."
            style={{ width:'100%', padding:'9px 12px', marginBottom:'12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text)' }}
          />

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'8px', maxHeight:'340px', overflowY:'auto', paddingRight:'4px' }}>
            {ALL_UNIVERSES.filter(u => u.toLowerCase().includes(spoilerSearch.toLowerCase())).map(universe => {
              const checked = !!protectedUniverses[universe];
              return (
                <label key={universe} onClick={() => toggleUniverse(universe, !checked)}
                  style={{ display:'flex', alignItems:'center', gap:'9px', padding:'9px 12px', borderRadius:'8px', cursor:'pointer',
                    background: checked ? 'rgba(96,165,250,0.10)' : 'rgba(255,255,255,0.02)',
                    border:`1px solid ${checked ? 'rgba(96,165,250,0.4)' : 'var(--border)'}`, transition:'background 0.15s' }}>
                  <div style={{ width:'16px', height:'16px', borderRadius:'4px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                    background: checked ? '#3b82f6' : 'transparent', border:`1.5px solid ${checked ? '#3b82f6' : 'var(--text-muted)'}` }}>
                    {checked && <span style={{ fontSize:'12px', color:'#fff', fontWeight:900, lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', fontWeight: checked ? 700 : 500, color: checked ? '#93c5fd' : 'var(--text-sub)' }}>{universe}</span>
                </label>
              );
            })}
          </div>

          {Object.values(protectedUniverses).some(Boolean) && (
            <div style={{ marginTop:'12px', fontFamily:'var(--f-ui)', fontSize:'12px', color:'#60a5fa' }}>
              🛡️ {Object.values(protectedUniverses).filter(Boolean).length} univers protégé(s)
            </div>
          )}
        </div>

        {/* ── SAUVEGARDE ── */}
        <div className="panel" style={{ padding:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,var(--cyan),#0e7490)', borderRadius:'2px', boxShadow:'0 0 8px var(--cyan)' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'var(--cyan)', letterSpacing:'2px' }}>SAUVEGARDE</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {Object.entries(saveData).map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px' }}>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>{label}</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:'14.4px', color:'var(--text)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RESET ── */}
        <div className="panel" style={{ padding:'20px', border: confirmReset ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)', boxShadow: confirmReset ? '0 0 20px rgba(239,68,68,0.1)' : 'none', transition:'all 0.2s' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,var(--red),#7f1d1d)', borderRadius:'2px', boxShadow:'0 0 8px var(--red)' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'var(--red)', letterSpacing:'2px' }}>RÉINITIALISATION</span>
          </div>

          {resetDone ? (
            <div style={{ textAlign:'center', padding:'16px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'8px' }}>
              <div style={{ fontSize:'28.8px', marginBottom:'8px' }}>✅</div>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:'var(--green)' }}>Partie réinitialisée !</div>
            </div>
          ) : (
            <>
              <p style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)', lineHeight:1.6, marginBottom:'16px' }}>
                Remet ta partie à zéro — <strong style={{ color:'var(--red)' }}>toute ta progression sera perdue</strong>.
              </p>
              {confirmReset && (
                <div style={{ background:'rgba(127,29,29,0.2)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:'8px', padding:'12px 14px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'20.6px' }}>⚠️</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'#fca5a5' }}>Tu es sûr ? Cette action est irréversible.</span>
                </div>
              )}
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={handleReset}
                  style={{ flex:1, padding:'11px', background:confirmReset?'linear-gradient(135deg,#7f1d1d,#991b1b)':'rgba(239,68,68,0.08)', border:`1px solid ${confirmReset?'#ef4444':'rgba(239,68,68,0.3)'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:confirmReset?'white':'var(--red)', cursor:'pointer', transition:'all 0.15s' }}>
                  {confirmReset ? '🗑 CONFIRMER' : '🔄 RÉINITIALISER LA PARTIE'}
                </button>
                {confirmReset && (
                  <button onClick={() => setConfirmReset(false)}
                    style={{ padding:'11px 18px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text-dim)', cursor:'pointer' }}>
                    Annuler
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign:'center', fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.8 }}>
          <div>GACHA VERSE — Version 1.0</div>
          <div style={{ marginTop:'4px', color:'var(--text-dim)' }}>Clé : <code style={{ background:'rgba(255,255,255,0.05)', padding:'1px 6px', borderRadius:'3px' }}>nekoz-world-v6</code></div>
        </div>

      </div>
    </div>
  );
}
