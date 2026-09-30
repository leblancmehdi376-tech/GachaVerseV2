'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/layout/AuthModal';
import { getAllUsers, approveUser, findUsernameMismatches, applyUsernameSync, PlayerRow, UsernameMismatch } from '@/lib/firebase/accessRequests';
import { PlayerSaveSummary } from '@/lib/firebase/adminTools';
import { checkIsAdmin } from '@/lib/admin';
import { RequestsTab } from '@/components/pages/admin/RequestsTab';
import { PlayersTab } from '@/components/pages/admin/PlayersTab';
import { MarketplaceTab } from '@/components/pages/admin/MarketplaceTab';
import { Button, Card, Feedback, Segmented, StatTile } from '@/components/pages/admin/ui';

type AdminTab = 'requests' | 'players' | 'marketplace';

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
  const [showTab, setShowTab] = useState<AdminTab>('players');

  // ── Rattrapage des pseudos désynchronisés (voir scripts/sync_usernames.js,
  // dont ceci est l'équivalent utilisable directement depuis le panel) ──────
  // null = jamais vérifié ; [] = vérifié, rien à corriger ; non-vide = liste
  // en attente de confirmation avant écriture.
  const [usernameMismatches, setUsernameMismatches] = useState<UsernameMismatch[] | null>(null);
  const [checkingUsernames, setCheckingUsernames]   = useState(false);
  const [applyingUsernames, setApplyingUsernames]   = useState(false);
  const [usernameSyncMsg, setUsernameSyncMsg]       = useState<string | null>(null);

  const handleCheckUsernames = async () => {
    setCheckingUsernames(true);
    setUsernameSyncMsg(null);
    const result = await findUsernameMismatches();
    setUsernameMismatches(result);
    setCheckingUsernames(false);
  };

  const handleApplyUsernameSync = async () => {
    if (!usernameMismatches || usernameMismatches.length === 0) return;
    setApplyingUsernames(true);
    const fixed = await applyUsernameSync(usernameMismatches);
    // Répercute les pseudos corrigés sur la liste déjà chargée (et son cache)
    // sans tout relire — mêmes valeurs que celles qu'on vient d'écrire.
    setAllUsers(list => {
      const updated = list.map(u => {
        const m = usernameMismatches.find(mm => mm.uid === u.uid);
        return m ? { ...u, username: m.to } : u;
      });
      accountsCache = updated;
      return updated;
    });
    setUsernameSyncMsg(fixed === usernameMismatches.length
      ? `✅ ${fixed} pseudo(s) corrigé(s).`
      : `⚠️ ${fixed}/${usernameMismatches.length} pseudo(s) corrigé(s) — voir la console pour le détail des échecs.`);
    setUsernameMismatches(null);
    setApplyingUsernames(false);
  };

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#050410] px-4 font-sans">
        <div className="text-center text-base text-white/80">
          {user ? 'Ce compte n\'est pas administrateur.' : 'Connexion administrateur requise.'}
        </div>
        {!user && <Button tone="purple" onClick={() => setShowAuth(true)}>Se connecter</Button>}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </div>
    );
  }

  const playedCount = allUsers.filter(u => u.save).length;
  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'players', label: `👥 Joueurs · ${allUsers.length}` },
    { id: 'requests', label: `📨 Demandes${pending.length > 0 ? ` · ${pending.length}` : ''}` },
    { id: 'marketplace', label: '🏛️ Hôtel de Ville' },
  ];

  return (
    <div className="h-screen overflow-y-auto bg-[#050410] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_60%)] font-sans text-white">
      {/* ── Barre du haut (reste visible au défilement) ─────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/15 bg-[#050410]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center rounded-lg px-2 text-base text-white/75 no-underline hover:bg-white/5 hover:text-white/90">
            ← Retour
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-violet-300 sm:text-2xl">🛡️ Panel admin</h1>
            <p className="text-sm text-white/70">
              {loadedAt ? `Liste chargée il y a ${formatRelative(now - loadedAt)}` : 'Liste jamais chargée'}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button tone="amber" onClick={handleCheckUsernames} disabled={checkingUsernames} className="flex-1 sm:flex-none"
              title="Détecte les comptes renommés en jeu dont la fiche admin (users/{uid}) n'a jamais été resynchronisée — voir scripts/sync_usernames.js">
              {checkingUsernames ? 'Vérification…' : '🔍 Vérifier les pseudos'}
            </Button>
            {/* Seul déclencheur d'une vraie relecture Firestore de la liste des
                comptes — sinon la liste en cache (module-level) est réutilisée
                telle quelle, même en changeant d'onglet ou en revenant sur la page. */}
            <Button tone="green" onClick={load} disabled={refreshing} className="flex-1 sm:flex-none" title="Recharger la liste des comptes depuis Firestore">
              {refreshing ? 'Actualisation…' : '🔄 Actualiser'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile label="Comptes" value={allUsers.length} tone="blue" />
          <StatTile label="En attente" value={pending.length} tone={pending.length > 0 ? 'amber' : 'neutral'} />
          <StatTile label="Validés" value={approvedList.length} tone="green" />
          <StatTile label="Ont déjà joué" value={playedCount} tone="purple" hint="Comptes ayant une sauvegarde cloud" />
        </div>

        {/* ── Résultat de la vérification des pseudos ─────────────────────
            usernameMismatches === null : jamais vérifié depuis le chargement
            de la page, rien à afficher. */}
        {usernameMismatches !== null && (
          <Card tone="amber">
            {usernameMismatches.length === 0 ? (
              <div className="text-sm font-bold text-emerald-300">✅ Tous les pseudos sont déjà synchronisés.</div>
            ) : (
              <>
                <div className="mb-3 text-sm font-bold text-amber-300">
                  {usernameMismatches.length} compte(s) désynchronisé(s) — la fiche admin affiche un ancien pseudo :
                </div>
                <ul className="mb-4 flex max-h-52 flex-col gap-1 overflow-y-auto text-sm text-white/85">
                  {usernameMismatches.map(m => (
                    <li key={m.uid} className="break-all">
                      <span className="text-red-300">{m.from}</span> → <span className="text-emerald-300">{m.to}</span>
                      <span className="text-white/65"> ({m.uid})</span>
                    </li>
                  ))}
                </ul>
                <Button tone="green" onClick={handleApplyUsernameSync} disabled={applyingUsernames}>
                  {applyingUsernames ? 'Correction…' : `✅ Corriger ${usernameMismatches.length > 1 ? 'ces ' + usernameMismatches.length + ' pseudos' : 'ce pseudo'}`}
                </Button>
              </>
            )}
          </Card>
        )}
        <Feedback msg={usernameSyncMsg} />

        <Segmented label="Sections du panel" value={showTab} options={tabs} onChange={setShowTab} className="self-start" />

        {showTab === 'players' && (
          <PlayersTab players={allUsers} onSaveUpdate={handleSaveUpdate} />
        )}

        {showTab === 'requests' && (
          <RequestsTab pending={pending} approvedList={approvedList} busy={busy} onApprove={handleApprove} />
        )}

        {showTab === 'marketplace' && <MarketplaceTab />}
      </main>
    </div>
  );
}
