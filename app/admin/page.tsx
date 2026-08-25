'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/layout/AuthModal';
import { getAllUsers, approveUser, PlayerRow } from '@/lib/firebase/accessRequests';
import { PlayerSaveSummary } from '@/lib/firebase/adminTools';
import { checkIsAdmin } from '@/lib/admin';
import { RequestsTab } from '@/components/pages/admin/RequestsTab';
import { PlayersTab } from '@/components/pages/admin/PlayersTab';

// Cache module-level (hors composant) : survit à un démontage/remontage de
// la page dans la même session (ex: navigation vers un autre onglet puis
// retour) sans jamais relire Firestore — seul le bouton "Actualiser" force
// une vraie relecture. `accountsCacheAt` sert à afficher "chargé il y a Xmin".
let accountsCache: PlayerRow[] | null = null;
let accountsCacheAt: number | null = null;

function formatRelative(ms: number): string {
  const secs = Math.max(0, Math.floor(ms / 1000));
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}min`;
  return `${Math.floor(secs / 3600)}h`;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth]   = useState(false);
  const [allUsers, setAllUsers]   = useState<PlayerRow[]>(accountsCache ?? []);
  const [loadedAt, setLoadedAt]   = useState<number | null>(accountsCacheAt);
  // `now` vit en state (rafraîchi périodiquement) plutôt que d'appeler
  // Date.now() directement dans le JSX au rendu — un rendu doit rester pur.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const [busy, setBusy]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTab, setShowTab] = useState<'requests'|'players'>('players');

  // Dérivés localement depuis `allUsers` (déjà chargé en un seul aller-retour
  // par getAllUsers) au lieu de deux requêtes Firestore séparées.
  const pending = allUsers.filter(u => !u.approved).sort((a, b) => a.createdAt - b.createdAt);
  const approvedList = allUsers.filter(u => u.approved); // déjà triés par getAllUsers (plus récent d'abord)

  const [isAdmin, setIsAdmin]         = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); setAdminChecked(true); return; }
    setAdminChecked(false);
    checkIsAdmin(user.uid).then((ok) => { setIsAdmin(ok); setAdminChecked(true); });
  }, [user]);

  const load = async () => {
    setRefreshing(true);
    const all = await getAllUsers();
    accountsCache = all;
    accountsCacheAt = Date.now();
    setAllUsers(all);
    setLoadedAt(accountsCacheAt);
    setRefreshing(false);
  };

  // Ne charge qu'une fois par session (cache module-level) — un aller-retour
  // sur cette page (changement d'onglet du site, etc.) ne redéclenche plus
  // les lectures Firestore à chaque fois. Le bouton "Actualiser" force une
  // vraie relecture quand besoin.
  useEffect(() => { if (isAdmin && accountsCache === null) load(); }, [isAdmin]);

  const handleApprove = async (uid: string) => {
    setBusy(uid);
    const ok = await approveUser(uid);
    // Le statut "approved" est déjà connu localement (c'est ce qu'on vient
    // d'écrire) — pas besoin de tout recharger pour un seul champ.
    if (ok) {
      setAllUsers(list => {
        const updated = list.map(u => u.uid === uid ? { ...u, approved: true } : u);
        accountsCache = updated;
        return updated;
      });
    }
    setBusy(null);
  };

  // Répercute une correction de solde/progression faite dans PlayerEditor sur
  // la ligne correspondante de la liste (et le cache), pour que le tableau
  // affiche la nouvelle valeur sans "Actualiser" — la valeur est déjà connue
  // localement (c'est ce qu'on vient d'écrire), pas besoin de relire Firestore.
  const handleSaveUpdate = (uid: string, patch: Partial<PlayerSaveSummary>) => {
    setAllUsers(list => {
      const updated = list.map(u => u.uid === uid && u.save ? { ...u, save: { ...u.save, ...patch } } : u);
      accountsCache = updated;
      return updated;
    });
  };

  if (loading || !adminChecked) return null;

  if (!user || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050410', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif', fontSize: 14.4 }}>
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
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)', fontSize: 12.4, textDecoration: 'none', marginBottom: 16 }}>
          ← Retour
        </a>
        <h1 style={{ color: '#a78bfa', fontSize: 22.7, fontWeight: 900, marginBottom: 6 }}>🛡️ Panel admin</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13.4, marginBottom: 8 }}>
          {pending.length} demande(s) en attente · {approvedList.length} compte(s) déjà validé(s)
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 20 }}>
          {loadedAt ? `Liste chargée il y a ${formatRelative(now - loadedAt)}` : 'Liste jamais chargée'}
        </p>

        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          <button onClick={() => setShowTab('players')} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='players' ? 'rgba(96,165,250,0.14)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(96,165,250,0.14)', color: '#60a5fa', cursor: 'pointer', fontSize: 12.4, fontWeight: 700 }}>
            👥 Joueurs ({allUsers.length})
          </button>
          <button onClick={() => setShowTab('requests')} style={{ padding: '8px 16px', borderRadius: 8, background: showTab==='requests' ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.14)', color: '#a78bfa', cursor: 'pointer', fontSize: 12.4, fontWeight: 700 }}>
            Demandes {pending.length > 0 ? `(${pending.length})` : ''}
          </button>

          {/* Seul déclencheur d'une vraie relecture Firestore de la liste des
              comptes — sinon la liste en cache (module-level) est réutilisée
              telle quelle, même en changeant d'onglet ou en revenant sur la page. */}
          <button onClick={load} disabled={refreshing} title="Recharger la liste des comptes depuis Firestore" style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', cursor: refreshing ? 'default' : 'pointer', fontSize: 12.4, fontWeight: 700 }}>
            {refreshing ? 'Actualisation…' : '🔄 Actualiser'}
          </button>
        </div>

        {showTab === 'players' && (
          <PlayersTab players={allUsers} onSaveUpdate={handleSaveUpdate} />
        )}

        {showTab === 'requests' && (
          <RequestsTab pending={pending} approvedList={approvedList} busy={busy} onApprove={handleApprove} />
        )}
      </div>
    </div>
  );
}
