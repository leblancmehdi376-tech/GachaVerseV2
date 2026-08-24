'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { getTopLeaderboard, updatePlayerScore, LeaderboardEntry } from '@/lib/firebase/leaderboard';

// Chaque appel à getTopLeaderboard coûte ~100 lectures Firestore — sans
// cooldown, spammer le bouton "Actualiser" spammerait autant d'appels à
// 100 lectures chacun.
const REFRESH_COOLDOWN_MS = 15_000;
// handleSaveName écrit sur Firestore (updatePlayerScore) puis refait un
// getTopLeaderboard (~100 lectures) — même logique de cooldown pour éviter
// qu'un spam du bouton SAUVEGARDER multiplie écritures + lectures.
const SAVE_NAME_COOLDOWN_MS = 15_000;

const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309', '#a855f7', '#6366f1'];
const RANK_ICONS  = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

function getRankColor(idx: number): string {
  return RANK_COLORS[idx] ?? 'var(--text-dim)';
}
function getRankDisplay(idx: number): string {
  return idx < 5 ? (RANK_ICONS[idx] ?? `#${idx+1}`) : `#${idx+1}`;
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const { username, palier, maxPalierReached, wave, totalClicks, pixelCoins, setUsername, getTotalDps } = useGameStore();

  const [loading,   setLoading]   = useState(true);
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([]);
  const [nameInput, setNameInput] = useState(username || '');
  const [feedback,  setFeedback]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);
  const lastLoadAtRef = useRef(0);
  const lastSaveNameAtRef = useRef(0);

  const loadEntries = async () => {
    setLoading(true);
    setEntries(await getTopLeaderboard(50));
    lastLoadAtRef.current = Date.now();
    setLoading(false);
  };

  // Bouton "Actualiser" — ignore silencieusement les clics rapprochés
  // (voir REFRESH_COOLDOWN_MS) pour ne pas laisser un spam de clics
  // multiplier les lectures Firestore.
  const handleManualRefresh = () => {
    if (loading) return;
    const elapsed = Date.now() - lastLoadAtRef.current;
    if (elapsed < REFRESH_COOLDOWN_MS) {
      const secs = Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000);
      setRefreshFeedback(`Attends encore ${secs}s avant de réessayer.`);
      return;
    }
    setRefreshFeedback(null);
    loadEntries();
  };

  // Chargement initial uniquement — pas d'auto-refresh : un onglet Classement
  // laissé ouvert ne doit pas facturer des lectures Firestore indéfiniment
  // (chaque appel à getTopLeaderboard coûte ~100 lectures). Le joueur peut
  // rafraîchir manuellement via le bouton.
  useEffect(() => { loadEntries(); }, []);

  // Sync input si le username change dans le store (ex: chargé depuis Firestore)
  useEffect(() => { setNameInput(username || ''); }, [username]);

  const handleSaveName = async () => {
    const final = nameInput.trim().slice(0, 20);
    if (!final) { setFeedback({ ok:false, msg:'Le pseudo ne peut pas être vide.' }); return; }
    if (!user)  { setFeedback({ ok:false, msg:'Tu dois être connecté pour changer ton pseudo.' }); return; }

    const elapsed = Date.now() - lastSaveNameAtRef.current;
    if (elapsed < SAVE_NAME_COOLDOWN_MS) {
      const secs = Math.ceil((SAVE_NAME_COOLDOWN_MS - elapsed) / 1000);
      setFeedback({ ok:false, msg:`Attends encore ${secs}s avant de réessayer.` });
      return;
    }

    setSaving(true);
    setUsername(final);
    try {
      await updatePlayerScore(user.uid, { username: final, palier, maxPalierReached, wave, totalClicks, pixelCoins, totalDps: getTotalDps() });
      lastSaveNameAtRef.current = Date.now();
      setFeedback({ ok:true, msg:'Pseudo enregistré !' });
      await loadEntries(); // refresh immédiat pour voir le nouveau pseudo
    } catch {
      setFeedback({ ok:false, msg:'Erreur réseau, réessaie.' });
    }
    setSaving(false);
  };

  const myEntry = entries.find(e => e.uid === user?.uid);
  const myRank  = myEntry ? entries.indexOf(myEntry) + 1 : null;

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <div style={{ maxWidth:'900px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:'2px', boxShadow:'0 0 8px #fbbf24' }} />
          <span style={{ fontFamily:'var(--f-title)', fontSize:'16.5px', fontWeight:700, color:'#fbbf24', letterSpacing:'2px' }}>🏆 CLASSEMENT</span>
          <button onClick={handleManualRefresh} disabled={loading}
            style={{ marginLeft:4, padding:'4px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'6px', fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:700, color:'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳' : '🔄'} Actualiser
          </button>
          {refreshFeedback && (
            <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:700, color:'var(--red)' }}>❌ {refreshFeedback}</span>
          )}
        </div>

        {/* Pseudo + Ma progression */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {/* Pseudo */}
          <div className="panel" style={{ padding:'18px 20px' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'1px', marginBottom:'10px' }}>TON PSEUDO PUBLIC</div>
            {!user ? (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>Connecte-toi pour définir ton pseudo et apparaître dans le classement.</div>
            ) : (
              <>
                <div style={{ display:'flex', gap:'8px' }}>
                  <input value={nameInput} onChange={e => { setNameInput(e.target.value); setFeedback(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    maxLength={20} placeholder="Ton pseudo..."
                    style={{ flex:1, padding:'10px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px' }} />
                  <button onClick={handleSaveName} disabled={saving || !nameInput.trim()}
                    style={{ padding:'10px 16px', background: saving||!nameInput.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6d28d9,#a855f7)', border:`1px solid ${saving||!nameInput.trim() ? 'var(--border)' : '#c084fc'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color: saving||!nameInput.trim() ? 'var(--text-muted)' : 'white', cursor: saving||!nameInput.trim() ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                    {saving ? '...' : 'SAUVEGARDER'}
                  </button>
                </div>
                {feedback && (
                  <div style={{ marginTop:'10px', fontFamily:'var(--f-ui)', fontSize:'12.4px', fontWeight:700,
                    color: feedback.ok ? 'var(--green)' : 'var(--red)' }}>
                    {feedback.ok ? '✅' : '❌'} {feedback.msg}
                  </div>
                )}
                {myRank && (
                  <div style={{ marginTop:'10px', fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
                    Tu es classé <span style={{ color:'#fbbf24', fontWeight:700 }}>#{myRank}</span> sur {entries.length} joueurs
                  </div>
                )}
              </>
            )}
          </div>

          {/* Ma progression */}
          <div className="panel" style={{ padding:'18px 20px' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'1px', marginBottom:'10px' }}>TA PROGRESSION</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[
                { label:'Palier Max',   value: String(maxPalierReached) },
                { label:'Pixel-Coins',  value: formatNumber(pixelCoins) },
              ].map(item => (
                <div key={item.label} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'8px' }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'1px' }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'15.5px', color:'var(--text)', marginTop:2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="panel" style={{ padding:'20px' }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'var(--text)', letterSpacing:'1px', marginBottom:'16px' }}>
            TOP {entries.length} JOUEURS
          </div>
          {loading && entries.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)', padding:'20px 0' }}>Chargement…</div>
          ) : entries.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)', padding:'20px 0' }}>Aucun joueur enregistré pour l&apos;instant.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {entries.map((entry, idx) => {
                const isMe = entry.uid === user?.uid;
                return (
                  <div key={entry.uid} style={{
                    display:'grid', gridTemplateColumns:'48px 1fr 100px 120px',
                    alignItems:'center', gap:'8px',
                    padding:'12px 16px', borderRadius:'10px',
                    background: isMe ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                    border: isMe ? '1px solid rgba(168,85,247,0.4)' : '1px solid var(--border)',
                    boxShadow: isMe ? '0 0 12px rgba(168,85,247,0.15)' : 'none',
                  }}>
                    {/* Rang */}
                    <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize: idx < 3 ? '20px' : '14px', color:getRankColor(idx), textAlign:'center' }}>
                      {getRankDisplay(idx)}
                    </div>
                    {/* Pseudo */}
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color: isMe ? '#c084fc' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {entry.username}{isMe && ' (toi)'}
                    </div>
                    {/* Palier max atteint (ne redescend jamais après un prestige) */}
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>PALIER MAX</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:'var(--text)' }}>{entry.maxPalierReached}</div>
                    </div>
                    {/* Pixel-Coins */}
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>PIXEL-COINS</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'#fbbf24' }}>{formatNumber(entry.pixelCoins)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
