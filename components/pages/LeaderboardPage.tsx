'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import {
  getLeaderboardEntries, rankByDleGuesses, rankByPalier, updatePlayerScore, extractDleWins,
  type DleRankingRow, type LeaderboardEntry,
} from '@/lib/firebase/leaderboard';
import { getDleDateKey, getPreviousDleDateKey } from '@/lib/game/gachadle';
import { PageScroll } from '@/components/ui/Page';
import { AvatarVisual } from '@/components/layout/AvatarVisual';
import { getCharacterById } from '@/lib/game/characters';
import { PlayerProfileModal } from '@/components/pages/leaderboard/PlayerProfileModal';
import { Countdown } from '@/components/pages/QuestsPage';

// Chaque appel à getLeaderboardEntries coûte ~100 lectures Firestore (hors
// cache) — sans cooldown, spammer le bouton "Actualiser" spammerait autant
// d'appels à 100 lectures chacun.
const REFRESH_COOLDOWN_MS = 15_000;
// handleSaveName écrit sur Firestore (updatePlayerScore) puis refait un
// getLeaderboardEntries (~100 lectures) — même logique de cooldown pour éviter
// qu'un spam du bouton SAUVEGARDER multiplie écritures + lectures.
const SAVE_NAME_COOLDOWN_MS = 15_000;

const RANK_COLORS = ['#fbbf24', '#94a3b8', '#b45309', '#a855f7', '#6366f1'];
const RANK_ICONS  = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export function getRankColor(idx: number): string {
  return RANK_COLORS[idx] ?? 'var(--text-dim)';
}
export function getRankDisplay(idx: number): string {
  return idx < 5 ? (RANK_ICONS[idx] ?? `#${idx+1}`) : `#${idx+1}`;
}

export type DleDay = 'today' | 'yesterday';

/** Jour affiché par l'onglet GachaDle : aujourd'hui ou la veille. */
export function getDleDayKey(day: DleDay, todayKey: string): string {
  return day === 'today' ? todayKey : getPreviousDleDateKey(todayKey);
}

/**
 * Lignes du classement GachaDle pour le jour choisi. Mes propres victoires
 * viennent du store local (toujours à jour) plutôt que de la copie Firestore,
 * qui peut dater de la dernière sauvegarde.
 */
export function getDleRanking(
  entries: LeaderboardEntry[], day: DleDay, todayKey: string,
  me?: { uid: string; data: Record<string, unknown> },
): DleRankingRow[] {
  const myWins = me ? extractDleWins(me.data) : null;
  const merged = me && myWins ? entries.map(e => e.uid === me.uid ? { ...e, ...myWins } : e) : entries;
  return rankByDleGuesses(merged, getDleDayKey(day, todayKey));
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const { username, palier, maxPalierReached, wave, pixelCoins, setUsername, getTotalDps } = useGameStore();

  const [loading,   setLoading]   = useState(true);
  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const [tab,       setTab]       = useState<'palier' | 'dle'>('palier');
  const [dleDay,    setDleDay]    = useState<DleDay>('today');
  const [nameInput, setNameInput] = useState(username || '');
  const [feedback,  setFeedback]  = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null);
  // Popup profil — rendue à partir de l'entrée déjà chargée, aucune lecture Firestore.
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const lastLoadAtRef = useRef(0);
  const lastSaveNameAtRef = useRef(0);

  // Les deux onglets (palier, GachaDle) sont calculés à partir de la MÊME
  // lecture — changer d'onglet ne coûte rien.
  const loadEntries = async (force: boolean) => {
    setLoading(true);
    setAllEntries(await getLeaderboardEntries(force));
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
    loadEntries(true);
  };

  // Chargement initial uniquement — pas d'auto-refresh : un onglet Classement
  // laissé ouvert ne doit pas facturer des lectures Firestore indéfiniment
  // (chaque appel coûte ~100 lectures). Revenir sur la page dans les 2 min
  // réutilise le cache de getLeaderboardEntries. Le joueur peut rafraîchir
  // manuellement via le bouton.
  useEffect(() => { loadEntries(false); }, []);

  // Sync input si le username change dans le store (ex: chargé depuis Firestore),
  // fait pendant le rendu plutôt que dans un effet (pas de rendu intermédiaire).
  const [prevUsername, setPrevUsername] = useState(username);
  if (username !== prevUsername) {
    setPrevUsername(username);
    setNameInput(username || '');
  }

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
      await updatePlayerScore(user.uid, { username: final, palier, maxPalierReached, wave, pixelCoins, totalDps: getTotalDps() });
      lastSaveNameAtRef.current = Date.now();
      setFeedback({ ok:true, msg:'Pseudo enregistré !' });
      await loadEntries(true); // refresh immédiat pour voir le nouveau pseudo
    } catch {
      setFeedback({ ok:false, msg:'Erreur réseau, réessaie.' });
    }
    setSaving(false);
  };

  // Ma propre victoire GachaDle vient du store local (toujours à jour), pas
  // de la copie Firestore qui peut dater de la dernière sauvegarde.
  const dleDailyDate    = useGameStore(s => s.dleDailyDate);
  const dleDailyGuesses = useGameStore(s => s.dleDailyGuesses);
  const dleLastWinDate  = useGameStore(s => s.dleLastWinDate);
  const dleRecentWins   = useGameStore(s => s.dleRecentWins);
  const todayKey = getDleDateKey();

  // Rang palier sur TOUS les joueurs lus (pour la popup profil ouverte depuis
  // l'onglet GachaDle), affichage limité au top 50.
  const byPalier = useMemo(() => rankByPalier(allEntries, Infinity), [allEntries]);
  const entries  = byPalier.slice(0, 50);
  // Les deux jours viennent de la même lecture : basculer ne coûte rien.
  const dleRows = useMemo(() => getDleRanking(allEntries, dleDay, todayKey, user
    ? { uid: user.uid, data: { dleDailyDate, dleDailyGuesses, dleLastWinDate, dleRecentWins } }
    : undefined,
  ), [allEntries, dleDay, todayKey, user, dleDailyDate, dleDailyGuesses, dleLastWinDate, dleRecentWins]);
  const myDleRow = dleRows.find(r => r.entry.uid === user?.uid);

  const myEntry = entries.find(e => e.uid === user?.uid);
  const myRank  = myEntry ? entries.indexOf(myEntry) + 1 : null;
  const profileIdx = profileUid ? byPalier.findIndex(e => e.uid === profileUid) : -1;

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .leaderboard-top { grid-template-columns: 1fr !important; }
          .leaderboard-row {
            grid-template-columns: 40px 1fr !important;
            grid-template-areas: "rank name" "stats stats";
            row-gap: 10px !important;
          }
          .leaderboard-rank { grid-area: rank; }
          .leaderboard-name { grid-area: name; }
          .leaderboard-stats {
            grid-area: stats;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
        }
        @media (max-width: 420px) {
          .leaderboard-stats > div > div:first-child {
            font-size: 14px !important;
          }
        }
      `}</style>
    <PageScroll>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:'2px', boxShadow:'0 0 8px #fbbf24' }} />
          <span className="page-title" style={{ color:'#fbbf24' }}>🏆 CLASSEMENT</span>
          <button onClick={handleManualRefresh} disabled={loading}
            style={{ marginLeft:4, padding:'4px 10px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'6px', fontFamily:'var(--f-ui)', fontSize:'14px', fontWeight:700, color:'var(--text-muted)', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '⏳' : '🔄'} Actualiser
          </button>
          {refreshFeedback && (
            <span style={{ fontFamily:'var(--f-ui)', fontSize:'14px', fontWeight:700, color:'var(--red)' }}>❌ {refreshFeedback}</span>
          )}
        </div>

        {/* Pseudo + Ma progression */}
        <div className="leaderboard-top" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {/* Pseudo */}
          <div className="panel" style={{ padding:'18px 20px' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)', letterSpacing:'1px', marginBottom:'10px' }}>TON PSEUDO PUBLIC</div>
            {!user ? (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)' }}>Connecte-toi pour définir ton pseudo et apparaître dans le classement.</div>
            ) : (
              <>
                <div style={{ display:'flex', gap:'8px' }}>
                  <input value={nameInput} onChange={e => { setNameInput(e.target.value); setFeedback(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    maxLength={20} placeholder="Ton pseudo..."
                    style={{ flex:1, padding:'10px 12px', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px', color:'var(--text)', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px' }} />
                  <button onClick={handleSaveName} disabled={saving || !nameInput.trim()}
                    style={{ padding:'10px 16px', background: saving||!nameInput.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#6d28d9,#a855f7)', border:`1px solid ${saving||!nameInput.trim() ? 'var(--border)' : '#c084fc'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color: saving||!nameInput.trim() ? 'var(--text-muted)' : 'white', cursor: saving||!nameInput.trim() ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                    {saving ? '...' : 'SAUVEGARDER'}
                  </button>
                </div>
                {feedback && (
                  <div style={{ marginTop:'10px', fontFamily:'var(--f-ui)', fontSize:'14px', fontWeight:700,
                    color: feedback.ok ? 'var(--green)' : 'var(--red)' }}>
                    {feedback.ok ? '✅' : '❌'} {feedback.msg}
                  </div>
                )}
                {myRank && (
                  <div style={{ marginTop:'10px', fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)' }}>
                    Tu es classé <span style={{ color:'#fbbf24', fontWeight:700 }}>#{myRank}</span> sur {entries.length} joueurs
                  </div>
                )}
              </>
            )}
          </div>

          {/* Ma progression */}
          <div className="panel" style={{ padding:'18px 20px' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)', letterSpacing:'1px', marginBottom:'10px' }}>TA PROGRESSION</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {[
                { label:'Palier Max',   value: String(maxPalierReached) },
                { label:'Pixel-Coins',  value: formatNumber(pixelCoins) },
              ].map(item => (
                <div key={item.label} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'8px' }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)', letterSpacing:'1px' }}>{item.label.toUpperCase()}</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'18px', color:'var(--text)', marginTop:2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Onglets — même lecture Firestore pour les deux */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {([['palier', '🏆 Palier max'], ['dle', '📅 GachaDle du jour']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:'8px 14px', borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', cursor:'pointer',
                background: tab === id ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${tab === id ? '#fbbf24' : 'var(--border)'}`,
                color: tab === id ? '#fbbf24' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'dle' && (
          <DleDailyTable rows={dleRows} loading={loading} myUid={user?.uid} day={dleDay} onDayChange={setDleDay}
            myRow={myDleRow} iWonDay={(dleRecentWins ?? []).some(w => w.date === getDleDayKey(dleDay, todayKey))}
            onOpenProfile={setProfileUid} />
        )}

        {/* Tableau */}
        {tab === 'palier' && (
        <div className="panel" style={{ padding:'20px' }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'16px', fontWeight:700, color:'var(--text)', letterSpacing:'1px', marginBottom:'16px' }}>
            TOP {entries.length} JOUEURS
          </div>
          {loading && entries.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'16px', color:'var(--text-dim)', padding:'20px 0' }}>Chargement…</div>
          ) : entries.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'16px', color:'var(--text-dim)', padding:'20px 0' }}>Aucun joueur enregistré pour l&apos;instant.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {entries.map((entry, idx) => {
                const isMe = entry.uid === user?.uid;
                return (
                  <div key={entry.uid} className="leaderboard-row"
                    role="button" tabIndex={0} title={`Voir le profil de ${entry.username}`}
                    onClick={() => setProfileUid(entry.uid)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileUid(entry.uid); } }}
                    style={{
                    display:'grid', gridTemplateColumns:'48px 1fr auto',
                    alignItems:'center', gap:'8px', cursor:'pointer',
                    padding:'12px 16px', borderRadius:'10px',
                    background: isMe ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                    border: isMe ? '1px solid rgba(168,85,247,0.4)' : '1px solid var(--border)',
                    boxShadow: isMe ? '0 0 12px rgba(168,85,247,0.15)' : 'none',
                  }}>
                    {/* Rang */}
                    <div className="leaderboard-rank" style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize: idx < 3 ? '22px' : '16px', color:getRankColor(idx), textAlign:'center' }}>
                      {getRankDisplay(idx)}
                    </div>
                    {/* Avatar + pseudo + titre équipé — pas d'overflow:hidden ici : ça
                        rognerait le glow de l'avatar à ras de sa boîte (effet "carré"),
                        l'ellipsis du pseudo/titre est déjà géré par les divs internes. */}
                    <div className="leaderboard-name" style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                      <PlayerAvatar entry={entry} />
                      <div style={{ display:'flex', flexDirection:'column', gap:'2px', minWidth:0, overflow:'hidden' }}>
                        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color: isMe ? '#c084fc' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {entry.username}{isMe && ' (toi)'}
                        </div>
                        {entry.activeTitle && (
                          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'#fbbf24', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            👑 « {entry.activeTitle} »
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Stats — regroupées dans un wrapper pour pouvoir passer en
                        ligne complète sous le pseudo sur mobile (voir <style>
                        plus bas) sans dupliquer 3 colonnes fixes dans la grille
                        principale de la ligne. */}
                    <div className="leaderboard-stats" style={{ display:'grid', gridTemplateColumns:'90px 100px 120px', gap:'8px' }}>
                      {/* Palier max atteint (ne redescend jamais après un prestige) */}
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)' }}>PALIER MAX</div>
                        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'var(--text)' }}>{entry.maxPalierReached}</div>
                      </div>
                      {/* Nombre de prestiges — affichage uniquement, n'influence pas le tri */}
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)' }}>PRESTIGE</div>
                        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'#a855f7' }}>{entry.prestigeLevel}</div>
                      </div>
                      {/* Pixel-Coins */}
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)' }}>PIXEL-COINS</div>
                        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'#fbbf24' }}>{formatNumber(entry.pixelCoins)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

    </PageScroll>
    {profileIdx >= 0 && (
      <PlayerProfileModal
        entry={byPalier[profileIdx]}
        rank={profileIdx + 1}
        rankColor={getRankColor(profileIdx)}
        isMe={byPalier[profileIdx].uid === user?.uid}
        onClose={() => setProfileUid(null)}
      />
    )}
    </>
  );
}

function PlayerAvatar({ entry }: { entry: LeaderboardEntry }) {
  const tpl = entry.selectedAvatarChampionId ? getCharacterById(entry.selectedAvatarChampionId) : null;
  return (
    <AvatarVisual
      size={32}
      champion={tpl ? { templateId: tpl.id, formIndex: entry.avatarFormIndex, name: tpl.name, rarity: tpl.rarity } : null}
      fallbackLetter={entry.username.charAt(0).toUpperCase()}
      maxPalierReached={entry.maxPalierReached}
      tooltip={tpl?.name ?? entry.username}
    />
  );
}

// Classement du défi du jour (ou de la veille) : moins d'essais = mieux, ex æquo au même rang.
// N'affiche que le nombre d'essais, jamais les personnages proposés (pas de
// spoiler du personnage mystère).
function DleDailyTable({ rows, loading, myUid, day, onDayChange, myRow, iWonDay, onOpenProfile }: {
  rows: DleRankingRow[];
  loading: boolean;
  myUid: string | undefined;
  day: DleDay;
  onDayChange: (day: DleDay) => void;
  myRow: DleRankingRow | undefined;
  iWonDay: boolean;
  onOpenProfile: (uid: string) => void;
}) {
  const today = day === 'today';
  const emptyStyle = { fontFamily:'var(--f-ui)', fontSize:'16px', color:'var(--text-dim)', padding:'20px 0' } as const;
  return (
    <div className="panel" style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'6px' }}>
        <div style={{ fontFamily:'var(--f-title)', fontSize:'16px', fontWeight:700, color:'var(--text)', letterSpacing:'1px' }}>
          {today ? 'DÉFI GACHADLE DU JOUR' : "DÉFI GACHADLE D'HIER"}
        </div>
        <div style={{ display:'flex', gap:'4px', marginLeft:'auto' }}>
          {([['today', "Aujourd'hui"], ['yesterday', 'Hier']] as const).map(([id, label]) => (
            <button key={id} onClick={() => onDayChange(id)}
              style={{ padding:'4px 10px', borderRadius:'6px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', cursor:'pointer',
                background: day === id ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${day === id ? '#c084fc' : 'var(--border)'}`,
                color: day === id ? '#c084fc' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)', marginBottom:'16px' }}>
        {myRow
          ? <>{today ? 'Tu es classé' : 'Tu as fini'} <span style={{ color:'#fbbf24', fontWeight:700 }}>#{myRow.rank}</span> sur {rows.length} avec <b>{myRow.guesses}</b> essai{myRow.guesses > 1 ? 's' : ''}.</>
          : iWonDay ? 'Ta victoire apparaîtra ici à la prochaine actualisation.'
          : today ? 'Trouve le personnage du jour dans le GachaDle pour entrer dans le classement !'
          : "Tu n'as pas trouvé le personnage d'hier."}
        {' '}Nouveau classement dans <Countdown type="daily" />, en même temps que les quêtes journalières.
      </div>
      {loading && rows.length === 0 ? (
        <div style={emptyStyle}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={emptyStyle}>{today ? "Personne n'a encore trouvé le personnage du jour." : "Personne n'a trouvé le personnage d'hier."}</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {rows.map(({ entry, guesses, rank }) => {
            const isMe = entry.uid === myUid;
            return (
              <div key={entry.uid} role="button" tabIndex={0} title={`Voir le profil de ${entry.username}`}
                onClick={() => onOpenProfile(entry.uid)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenProfile(entry.uid); } }}
                style={{
                  display:'grid', gridTemplateColumns:'48px 1fr auto', alignItems:'center', gap:'8px', cursor:'pointer',
                  padding:'10px 16px', borderRadius:'10px',
                  background: isMe ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                  border: isMe ? '1px solid rgba(168,85,247,0.4)' : '1px solid var(--border)',
                }}>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize: rank <= 3 ? '22px' : '16px', color:getRankColor(rank - 1), textAlign:'center' }}>
                  {getRankDisplay(rank - 1)}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                  <PlayerAvatar entry={entry} />
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color: isMe ? '#c084fc' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {entry.username}{isMe && ' (toi)'}
                  </div>
                </div>
                <div style={{ textAlign:'center', minWidth:70 }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)' }}>ESSAIS</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'18px', color:'#fbbf24' }}>{guesses}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
