'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/layout/AuthModal';
import { getPendingRequests, getApprovedUsers, getAllUsers, approveUser, AccessRequest } from '@/lib/firebase/accessRequests';
import { findPlayer, getPlayerSave, correctPlayerBalance, correctPlayerProgress, getPlayerCollection, removePlayerCharacter, addPlayerCharacter, setPlayerCharacterLevel, PlayerLookup, PlayerSaveSummary, OwnedCharacterSummary } from '@/lib/firebase/adminTools';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { isAdminEmail } from '@/lib/admin';

type Audit = { userId: string | null; type: string; payload: Record<string, any>; createdAt: number };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth]   = useState(false);
  const [pending, setPending]     = useState<AccessRequest[]>([]);
  const [approvedList, setApprovedList] = useState<AccessRequest[]>([]);
  const [allUsers, setAllUsers]   = useState<AccessRequest[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [logs, setLogs] = useState<Audit[]>([]);
  const [busy, setBusy]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTab, setShowTab] = useState<'requests'|'accounts'|'logs'|'balance'>('requests');

  // ── Correction de solde (onglet "Rééquilibrer un compte") ─────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [foundPlayer, setFoundPlayer] = useState<PlayerLookup | null>(null);
  const [playerSave, setPlayerSave]   = useState<PlayerSaveSummary | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle'|'searching'|'notfound'>('idle');
  const [editCoins, setEditCoins] = useState('');
  const [editGems, setEditGems]   = useState('');
  const [editCrowns, setEditCrowns] = useState('');
  const [editPalier, setEditPalier] = useState('');
  const [editWave, setEditWave]     = useState('');
  const [capMaxPalier, setCapMaxPalier] = useState(true);
  const [progressBusy, setProgressBusy] = useState(false);
  const [progressMsg, setProgressMsg]   = useState<string | null>(null);
  const [correctBusy, setCorrectBusy] = useState(false);
  const [correctMsg, setCorrectMsg]   = useState<string | null>(null);

  // ── Gestion de la collection de personnages ────────────────────────────
  const [playerChars, setPlayerChars] = useState<OwnedCharacterSummary[]>([]);
  const [charBusy, setCharBusy]       = useState<string | null>(null); // instanceKey en cours d'action
  const [levelEdits, setLevelEdits]   = useState<Record<string, string>>({});
  const [newCharId, setNewCharId]     = useState('');
  const [newCharEdition, setNewCharEdition] = useState<'base'|'gold'|'diamond'>('base');
  const [newCharLevel, setNewCharLevel]     = useState('1');
  const [newCharRank, setNewCharRank]       = useState('1');
  const [addCharMsg, setAddCharMsg]   = useState<string | null>(null);
  const [addCharBusy, setAddCharBusy] = useState(false);

  const loadPlayerChars = async (uid: string) => setPlayerChars(await getPlayerCollection(uid));

  const handleRemoveChar = async (instanceKey: string) => {
    if (!foundPlayer) return;
    setCharBusy(instanceKey);
    const ok = await removePlayerCharacter(foundPlayer.uid, instanceKey);
    if (ok) await loadPlayerChars(foundPlayer.uid);
    setCharBusy(null);
  };

  const handleSetLevel = async (instanceKey: string) => {
    if (!foundPlayer) return;
    const val = Number(levelEdits[instanceKey]);
    if (!val || val < 1) return;
    setCharBusy(instanceKey);
    const ok = await setPlayerCharacterLevel(foundPlayer.uid, instanceKey, val);
    if (ok) await loadPlayerChars(foundPlayer.uid);
    setCharBusy(null);
  };

  const handleAddChar = async () => {
    if (!foundPlayer || !newCharId.trim()) return;
    setAddCharBusy(true); setAddCharMsg(null);
    const res = await addPlayerCharacter(foundPlayer.uid, newCharId.trim(), newCharEdition, Number(newCharLevel) || 1, Number(newCharRank) || 1);
    setAddCharMsg(res.ok ? '✅ Personnage ajouté.' : `❌ ${res.error}`);
    if (res.ok) { await loadPlayerChars(foundPlayer.uid); setNewCharId(''); }
    setAddCharBusy(false);
  };

  const handleSearchPlayer = async () => {
    setSearchStatus('searching');
    setFoundPlayer(null); setPlayerSave(null); setCorrectMsg(null); setProgressMsg(null); setPlayerChars([]); setAddCharMsg(null);
    const p = await findPlayer(searchQuery);
    if (!p) { setSearchStatus('notfound'); return; }
    setFoundPlayer(p);
    const save = await getPlayerSave(p.uid);
    setPlayerSave(save);
    setEditCoins(save ? String(save.pixelCoins) : '');
    setEditGems(save ? String(save.nekoGems) : '');
    setEditCrowns(save ? String(save.bossCrowns) : '');
    setEditPalier(save ? String(save.palier) : '');
    setEditWave(save ? String(save.wave) : '');
    await loadPlayerChars(p.uid);
    setSearchStatus('idle');
  };

  const handleCorrect = async () => {
    if (!foundPlayer) return;
    setCorrectBusy(true); setCorrectMsg(null);
    const ok = await correctPlayerBalance(foundPlayer.uid, {
      pixelCoins: Math.max(0, Number(editCoins) || 0),
      nekoGems:   Math.max(0, Number(editGems) || 0),
      bossCrowns: Math.max(0, Number(editCrowns) || 0),
    });
    setCorrectMsg(ok ? '✅ Corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) { const save = await getPlayerSave(foundPlayer.uid); setPlayerSave(save); }
    setCorrectBusy(false);
  };

  // Remet un joueur à un palier précis (ex: après un bug/exploit qui lui a
  // fait sauter des paliers). Si "capMaxPalier" est coché, le palier max
  // atteint est aussi ramené au même niveau — utile pour annuler les
  // récompenses/titres débloqués à tort via le bug.
  const handleCorrectProgress = async () => {
    if (!foundPlayer || !playerSave) return;
    setProgressBusy(true); setProgressMsg(null);
    const newPalier = Math.max(1, Number(editPalier) || 1);
    const newWave   = Math.max(1, Math.min(10, Number(editWave) || 1));
    const ok = await correctPlayerProgress(foundPlayer.uid, {
      palier: newPalier,
      wave: newWave,
      maxPalierReached: capMaxPalier
        ? Math.min(playerSave.maxPalierReached, newPalier)
        : Math.max(playerSave.maxPalierReached, newPalier),
    });
    setProgressMsg(ok ? '✅ Palier corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) { const save = await getPlayerSave(foundPlayer.uid); setPlayerSave(save); }
    setProgressBusy(false);
  };

  const isAdmin = isAdminEmail(user?.email);

  const load = async () => {
    setRefreshing(true);
    const [p, a, all] = await Promise.all([getPendingRequests(), getApprovedUsers(), getAllUsers()]);
    setPending(p);
    setApprovedList(a);
    setAllUsers(all);
    setRefreshing(false);
  };

  const loadLogs = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200));
      const snap = await getDocs(q);
      const out: Audit[] = snap.docs.map(d => d.data() as Audit);
      setLogs(out);
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const handleApprove = async (uid: string) => {
    setBusy(uid);
    const ok = await approveUser(uid);
    if (ok) await load();
    setBusy(null);
  };

  if (loading) return null;

  if (!user || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050410', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif', fontSize: 14 }}>
          {user ? 'Ce compte n\'est pas administrateur.' : 'Connexion administrateur requise.'}
        </div>
        {!user && (
          <button onClick={() => setShowAuth(true)} style={{ padding: '10px 20px', borderRadius: 8, background: '#8b5cf6', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 700 }}>
            Se connecter
          </button>
        )}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: '#050410', padding: '32px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ color: '#a78bfa', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>🛡️ Validation des comptes</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 28 }}>
          {pending.length} demande(s) en attente · {approvedList.length} compte(s) déjà validé(s)
        </p>

        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <button onClick={() => { setShowTab('requests'); load(); }} disabled={refreshing} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='requests' ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.14)', color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {refreshing ? 'Actualisation…' : '🔄 Requests'}
          </button>
          <button onClick={() => setShowTab('accounts')} disabled={refreshing} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='accounts' ? 'rgba(96,165,250,0.14)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(96,165,250,0.14)', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            👥 Comptes ({allUsers.length})
          </button>
          <button onClick={() => { setShowTab('logs'); loadLogs(); }} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='logs' ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', color: '#a78bfa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Logs
          </button>
          <button onClick={() => setShowTab('balance')} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='balance' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.14)', color: '#fbbf24', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            ⚖️ Rééquilibrer un compte
          </button>
        </div>

        {showTab === 'requests' && (
          <>
            <h2 style={{ color: '#fbbf24', fontSize: 15, fontWeight: 800, marginBottom: 12 }}>En attente</h2>
        {pending.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 24 }}>Aucune demande en attente.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {pending.map(r => (
            <div key={r.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{r.username}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{r.email}</div>
                <div style={{ color: '#7289da', fontSize: 12, marginTop: 2 }}>Discord : {r.discordUsername}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4 }}>
                  Demandé le {new Date(r.createdAt).toLocaleString('fr-FR')}
                </div>
              </div>
              <button onClick={() => handleApprove(r.uid)} disabled={busy === r.uid} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)', color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                {busy === r.uid ? '...' : '✓ Valider'}
              </button>
            </div>
          ))}
        </div>

          </>
        )}

        {showTab === 'accounts' && (
          <>
            <h2 style={{ color: '#60a5fa', fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Tous les comptes ({allUsers.length})</h2>
            <input
              value={accountSearch}
              onChange={e => setAccountSearch(e.target.value)}
              placeholder="Filtrer par pseudo, email ou id de save…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, marginBottom: 16, boxSizing: 'border-box' }}
            />
            {refreshing && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 16 }}>Chargement…</div>}
            {!refreshing && allUsers.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Aucun compte trouvé.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allUsers
                .filter(u => {
                  const q = accountSearch.trim().toLowerCase();
                  if (!q) return true;
                  return u.username?.toLowerCase().includes(q)
                    || u.email?.toLowerCase().includes(q)
                    || u.uid?.toLowerCase().includes(q);
                })
                .map(u => (
                  <div key={u.uid} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,165,250,0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{u.username || '(sans pseudo)'}</span>
                      <span style={{ color: u.approved ? '#4ade80' : '#fbbf24', fontSize: 11, fontWeight: 700 }}>
                        {u.approved ? '✓ Validé' : '⏳ En attente'}
                      </span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{u.email}</div>
                    <div style={{ color: '#7289da', fontSize: 12 }}>Discord : {u.discordUsername || '—'}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>
                      ID de save : {u.uid}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                      Créé le {u.createdAt ? new Date(u.createdAt).toLocaleString('fr-FR') : '—'}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {showTab === 'logs' && (
          <>
            <h2 style={{ color: '#60a5fa', fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Événements récents</h2>
            <div style={{ maxHeight: 600, overflow: 'auto', marginBottom: 20 }}>
              {logs.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Aucun log.</div>}
              {logs.map((l, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', marginBottom:6, fontSize:12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight:700 }}>{l.type}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', marginTop:4 }}>{l.userId ?? 'anon'} · {new Date(l.createdAt).toLocaleString()}</div>
                  <pre style={{ color: 'rgba(255,255,255,0.35)', marginTop:6, whiteSpace:'pre-wrap' }}>{JSON.stringify(l.payload)}</pre>
                </div>
              ))}
            </div>
          </>
        )}

        {showTab === 'requests' && (
          <>
            <h2 style={{ color: '#4ade80', fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Déjà validés ({approvedList.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {approvedList.map(r => (
                <div key={r.uid} style={{ display: 'flex', gap: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', fontSize: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 700, minWidth: 140 }}>{r.username}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.email}</span>
                  <span style={{ color: '#7289da' }}>{r.discordUsername}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {showTab === 'balance' && (
          <>
            <h2 style={{ color: '#fbbf24', fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Rééquilibrer un compte</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              Cherche un joueur par pseudo ou email exact, puis corrige son solde. Le changement s&apos;applique automatiquement à sa prochaine connexion (rien à faire de son côté).
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchPlayer()}
                placeholder="Pseudo ou email exact"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }}
              />
              <button onClick={handleSearchPlayer} disabled={searchStatus === 'searching'} style={{ padding: '10px 18px', borderRadius: 8, background: 'rgba(139,92,246,0.18)', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                {searchStatus === 'searching' ? '...' : '🔍 Chercher'}
              </button>
            </div>

            {searchStatus === 'notfound' && (
              <div style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>Aucun joueur trouvé avec ce pseudo/email exact.</div>
            )}

            {foundPlayer && playerSave && (
              <div style={{ padding: '18px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.25)' }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{foundPlayer.username}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 4 }}>{foundPlayer.email}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 4 }}>
                  Dernière sauvegarde : {playerSave.lastSaved ? new Date(playerSave.lastSaved).toLocaleString('fr-FR') : 'jamais'}
                </div>
                <div style={{ color: '#c084fc', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  💎 Total de gemmes dépensées : {playerSave.totalGemsSpent.toLocaleString('fr-FR')}
                </div>
                <div style={{ color: '#22d3ee', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                  ✦ Total d&apos;invocations (gacha) : {playerSave.totalGachaPulls.toLocaleString('fr-FR')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5 }}>🪙 Pixel-Coins</label>
                    <input value={editCoins} onChange={e => setEditCoins(e.target.value)} type="number"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5 }}>💎 Neko-Gemmes</label>
                    <input value={editGems} onChange={e => setEditGems(e.target.value)} type="number"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5 }}>👑 Couronnes</label>
                    <input value={editCrowns} onChange={e => setEditCrowns(e.target.value)} type="number"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }} />
                  </div>
                </div>

                <button onClick={handleCorrect} disabled={correctBusy} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)', color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {correctBusy ? 'Correction en cours…' : '✅ Appliquer la correction'}
                </button>
                {correctMsg && <div style={{ marginTop: 10, fontSize: 12, color: correctMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{correctMsg}</div>}

                {/* ── Palier / progression (ex: annuler une avance obtenue via un bug) ── */}
                <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Palier / progression</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 14 }}>
                    Palier actuel : {playerSave.palier} · Vague : {playerSave.wave}/10 · Palier max atteint : {playerSave.maxPalierReached}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5 }}>⛰️ Palier</label>
                      <input value={editPalier} onChange={e => setEditPalier(e.target.value)} type="number" min={1}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 5 }}>🌊 Vague (1-10)</label>
                      <input value={editWave} onChange={e => setEditWave(e.target.value)} type="number" min={1} max={10}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={capMaxPalier} onChange={e => setCapMaxPalier(e.target.checked)} />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                      Limiter aussi le &quot;palier max atteint&quot; à cette valeur (à cocher pour annuler une avance obtenue via un bug)
                    </span>
                  </label>

                  <button onClick={handleCorrectProgress} disabled={progressBusy} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.5)', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    {progressBusy ? 'Correction en cours…' : '✅ Appliquer le palier'}
                  </button>
                  {progressMsg && <div style={{ marginTop: 10, fontSize: 12, color: progressMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{progressMsg}</div>}
                </div>

                {/* ── Gestion de la collection de personnages ────────────── */}
                <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
                    Personnages possédés ({playerChars.length})
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                    {playerChars.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Aucun personnage.</div>}
                    {playerChars.map(c => (
                      <div key={c.instanceKey} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', fontSize: 12 }}>
                        <span style={{ color: '#fff', fontWeight: 700, minWidth: 130 }}>{c.name}</span>
                        <span style={{ color: c.edition === 'diamond' ? '#67e8f9' : c.edition === 'gold' ? '#fbbf24' : 'rgba(255,255,255,0.4)', minWidth: 60 }}>
                          {c.edition === 'base' ? '' : c.edition === 'gold' ? '✨ Or' : '💎 Diamant'}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', minWidth: 40 }}>{c.rank}★</span>
                        <input
                          type="number"
                          defaultValue={c.level}
                          onChange={e => setLevelEdits(s => ({ ...s, [c.instanceKey]: e.target.value }))}
                          style={{ width: 70, padding: '5px 8px', borderRadius: 6, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }}
                        />
                        <button onClick={() => handleSetLevel(c.instanceKey)} disabled={charBusy === c.instanceKey}
                          style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          Niveau
                        </button>
                        <button onClick={() => handleRemoveChar(c.instanceKey)} disabled={charBusy === c.instanceKey}
                          style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 'auto' }}>
                          {charBusy === c.instanceKey ? '...' : 'Retirer'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Ajouter un personnage</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input value={newCharId} onChange={e => setNewCharId(e.target.value)} placeholder="id exact (ex: goku)"
                      style={{ flex: '1 1 140px', padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }} />
                    <select value={newCharEdition} onChange={e => setNewCharEdition(e.target.value as 'base'|'gold'|'diamond')}
                      style={{ padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }}>
                      <option value="base">Base</option>
                      <option value="gold">✨ Or</option>
                      <option value="diamond">💎 Diamant</option>
                    </select>
                    <input value={newCharLevel} onChange={e => setNewCharLevel(e.target.value)} type="number" placeholder="Niveau"
                      style={{ width: 80, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }} />
                    <input value={newCharRank} onChange={e => setNewCharRank(e.target.value)} type="number" min={1} max={7} placeholder="Rang"
                      style={{ width: 70, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12 }} />
                    <button onClick={handleAddChar} disabled={addCharBusy || !newCharId.trim()}
                      style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.18)', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      {addCharBusy ? '...' : '+ Ajouter'}
                    </button>
                  </div>
                  {addCharMsg && <div style={{ marginTop: 8, fontSize: 12, color: addCharMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{addCharMsg}</div>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
