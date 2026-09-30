'use client';
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { auth } from '@/lib/firebase/config';
import { formatNumber } from '@/lib/game/format';
import {
  MarketplaceListing, ListingCurrency, ListingType,
  getAllListingsAdmin, adminCancelListing, buyListing,
} from '@/lib/firebase/marketplace';
import { restoreListingItemToSeller } from '@/lib/firebase/adminTools';
import { getListingLabel, getListingIcon } from '@/components/pages/MarketplacePage';
import { Button, Card, Empty, Feedback, SectionHeader, Segmented, StatTile, TextInput, cx } from './ui';

const CURRENCY_ICON: Record<ListingCurrency, string> = { gems: '💎', coins: '🪙', crowns: '👑' };
const TYPE_LABEL: Record<ListingType, string> = { item: 'Item', equipment: 'Équipement', character: 'Personnage' };
const STATUS_LABEL: Record<MarketplaceListing['status'], string> = { active: '🟢 En vente', sold: '✅ Vendu', cancelled: '❌ Annulé' };

type StatusFilter = 'all' | MarketplaceListing['status'];
type TypeFilter = 'all' | ListingType;

export function MarketplaceTab() {
  const store = useGameStore();
  const user = auth?.currentUser;

  const [listings, setListings]   = useState<MarketplaceListing[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [busy, setBusy]           = useState<string | null>(null);
  const [feedback, setFeedback]   = useState<{ ok: boolean; msg: string } | null>(null);

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all');

  const showMsg = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    const data = await getAllListingsAdmin();
    setListings(data);
    setLoading(false);
    setLoadedOnce(true);
  };

  useEffect(() => { if (!loadedOnce) load(); }, [loadedOnce]);

  const stats = useMemo(() => {
    const active = listings.filter(l => l.status === 'active');
    const sold = listings.filter(l => l.status === 'sold');
    const bySeller = new Set(active.map(l => l.sellerId));
    return { active: active.length, sold: sold.length, cancelled: listings.length - active.length - sold.length, sellers: bySeller.size };
  }, [listings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (!q) return true;
      return l.sellerName?.toLowerCase().includes(q)
        || l.sellerId?.toLowerCase().includes(q)
        || l.itemId?.toLowerCase().includes(q)
        || getListingLabel(l).toLowerCase().includes(q);
    });
  }, [listings, search, statusFilter, typeFilter]);

  // ── Admin achète l'annonce (gratuit, sans débit du compte admin) ────────
  const handleBuy = async (l: MarketplaceListing) => {
    if (!user) return;
    setBusy(l.id);
    const result = await buyListing(l.id, user.uid, store.username || 'Admin');
    if (!result) { showMsg(false, 'Achat impossible (déjà vendu ?)'); setBusy(null); load(); return; }

    if (l.type === 'item')      store.addItem(l.itemId, l.quantity);
    else if (l.type === 'equipment') store.addEquipment(l.itemId, 1);
    else store.addToCollection(l.itemId);

    showMsg(true, `${getListingLabel(l)} récupéré gratuitement sur le compte admin !`);
    setListings(list => list.map(x => x.id === l.id ? { ...x, status: 'sold', soldTo: user.uid, soldToName: store.username || 'Admin', soldAt: Date.now() } : x));
    setBusy(null);
  };

  // ── Admin retire l'annonce et restitue l'item au vendeur ────────────────
  const handleRemove = async (l: MarketplaceListing) => {
    setBusy(l.id);
    const cancelled = await adminCancelListing(l.id);
    if (!cancelled) { showMsg(false, 'Retrait impossible (déjà clôturée ?)'); setBusy(null); load(); return; }
    const restored = await restoreListingItemToSeller({ sellerId: l.sellerId, type: l.type, itemId: l.itemId, quantity: l.quantity });
    showMsg(restored, restored
      ? `Annonce retirée, ${getListingLabel(l)} restitué à ${l.sellerName}.`
      : `Annonce retirée mais échec de la restitution à ${l.sellerName} — à corriger manuellement.`);
    setListings(list => list.map(x => x.id === l.id ? { ...x, status: 'cancelled' } : x));
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card tone="orange">
        <SectionHeader icon="🏛️" title="Hôtel de Ville"
          subtitle="Toutes les annonces du marketplace. « Acheter » récupère l'item gratuitement (aucune monnaie débitée) ; « Retirer » annule l'annonce et restitue l'item au vendeur."
          right={
            <Button tone="green" onClick={load} disabled={loading} title="Recharger les annonces depuis Firestore">
              {loading ? 'Actualisation…' : '🔄 Actualiser'}
            </Button>
          } />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="En vente" value={stats.active} tone="green" />
          <StatTile label="Vendues" value={stats.sold} tone="blue" />
          <StatTile label="Annulées" value={stats.cancelled} />
          <StatTile label="Vendeurs actifs" value={stats.sellers} tone="amber" />
        </div>
      </Card>

      {feedback && <Feedback msg={`${feedback.ok ? '✅' : '❌'} ${feedback.msg}`} />}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-white/65">🔎</span>
          <TextInput
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par vendeur, id ou item…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented label="Statut" value={statusFilter} tone="orange"
            options={(['active', 'sold', 'cancelled', 'all'] as StatusFilter[]).map(s => ({ id: s, label: s === 'all' ? 'Toutes' : STATUS_LABEL[s] }))}
            onChange={setStatusFilter} />
          <Segmented label="Type" value={typeFilter} tone="blue"
            options={(['all', 'item', 'equipment', 'character'] as TypeFilter[]).map(t => ({ id: t, label: t === 'all' ? 'Tous types' : TYPE_LABEL[t] }))}
            onChange={setTypeFilter} />
        </div>
      </div>

      {loading && listings.length === 0 ? (
        <Empty>Chargement…</Empty>
      ) : filtered.length === 0 ? (
        <Empty>Aucune annonce pour ces filtres.</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-white/70">{filtered.length} annonce(s)</div>
          {filtered.map(l => (
            <div key={l.id} className={cx(
              'flex flex-col gap-3 rounded-2xl border bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4',
              l.status === 'active' ? 'border-orange-400/25' : l.status === 'sold' ? 'border-emerald-400/20' : 'border-white/15 opacity-80',
            )}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-black/30 text-2xl" aria-hidden>{getListingIcon(l)}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">
                    {getListingLabel(l)}{l.quantity > 1 ? ` ×${l.quantity}` : ''}
                  </div>
                  <div className="text-sm text-white/75">
                    {TYPE_LABEL[l.type]} · vendu par <span className="text-cyan-300">{l.sellerName}</span>
                    {' · '}{new Date(l.createdAt).toLocaleString('fr-FR')}
                  </div>
                  {l.status === 'sold' && (
                    <div className="text-sm text-emerald-300">
                      Acheté par {l.soldToName}{l.claimed ? ' · encaissé' : ' · non encaissé'}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap">
                <span className={cx('text-sm font-bold whitespace-nowrap',
                  l.status === 'active' ? 'text-emerald-300' : l.status === 'sold' ? 'text-sky-300' : 'text-white/70')}>
                  {STATUS_LABEL[l.status]}
                </span>
                <span className={cx('ml-auto font-mono text-base font-black whitespace-nowrap sm:ml-0',
                  l.currency === 'gems' ? 'text-violet-300' : l.currency === 'crowns' ? 'text-amber-300' : 'text-amber-200')}>
                  {CURRENCY_ICON[l.currency]} {formatNumber(l.price)}
                </span>
                {l.status === 'active' && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button size="sm" tone="blue" onClick={() => handleBuy(l)} disabled={busy === l.id} className="flex-1 sm:flex-none"
                      title="Récupérer gratuitement sur le compte admin (aucune monnaie débitée)">
                      🛒 Acheter
                    </Button>
                    <Button size="sm" tone="red" onClick={() => handleRemove(l)} disabled={busy === l.id} className="flex-1 sm:flex-none"
                      title="Annuler l'annonce et restituer l'item au vendeur">
                      {busy === l.id ? '…' : '🗑️ Retirer'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
