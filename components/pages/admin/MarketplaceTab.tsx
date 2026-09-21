'use client';
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { auth } from '@/lib/firebase/config';
import { formatNumber } from '@/lib/game/format';
import { bnAdd, bnFromNumber } from '@/lib/game/bignum';
import {
  MarketplaceListing, ListingCurrency, ListingType,
  getAllListingsAdmin, adminCancelListing, buyListing,
} from '@/lib/firebase/marketplace';
import { restoreListingItemToSeller } from '@/lib/firebase/adminTools';
import { getListingLabel, getListingIcon, canAffordListing } from '@/components/pages/MarketplacePage';

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

  // ── Admin achète l'annonce (avec son propre compte/monnaie) ─────────────
  const handleBuy = async (l: MarketplaceListing) => {
    if (!user) return;
    if (!canAffordListing(l.currency, l.price, store)) {
      showMsg(false, `Solde admin insuffisant (${CURRENCY_ICON[l.currency]})`);
      return;
    }
    setBusy(l.id);
    const result = await buyListing(l.id, user.uid, store.username || 'Admin');
    if (!result) { showMsg(false, 'Achat impossible (déjà vendu ?)'); setBusy(null); load(); return; }

    if (l.currency === 'gems')        useGameStore.setState(s => ({ nekoGems: s.nekoGems - l.price }));
    else if (l.currency === 'crowns') useGameStore.setState(s => ({ bossCrowns: s.bossCrowns - l.price }));
    else store.spendPixelCoins(bnFromNumber(l.price));

    if (l.type === 'item')      store.addItem(l.itemId, l.quantity);
    else if (l.type === 'equipment') store.addEquipment(l.itemId, 1);
    else store.addToCollection(l.itemId);

    showMsg(true, `${getListingLabel(l)} acheté avec le compte admin !`);
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
    <>
      <h2 style={{ color: '#f97316', fontSize: 15.5, fontWeight: 800, marginBottom: 4 }}>🏛️ Hôtel de Ville</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.4, marginBottom: 14, lineHeight: 1.5 }}>
        Toutes les annonces du marketplace. « Acheter » utilise le compte admin connecté ; « Retirer » annule l'annonce et restitue l'item au vendeur.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: 'En vente', value: stats.active, color: '#4ade80' },
          { label: 'Vendues', value: stats.sold, color: '#60a5fa' },
          { label: 'Annulées', value: stats.cancelled, color: 'rgba(255,255,255,0.4)' },
          { label: 'Vendeurs actifs', value: stats.sellers, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: s.color, fontWeight: 900, fontSize: 16.5 }}>{s.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
        <button onClick={load} disabled={loading} title="Recharger les annonces depuis Firestore" style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', cursor: loading ? 'default' : 'pointer', fontSize: 12.4, fontWeight: 700, alignSelf: 'flex-start' }}>
          {loading ? 'Actualisation…' : '🔄 Actualiser'}
        </button>
      </div>

      {feedback && (
        <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12.4, fontWeight: 700, marginBottom: 14,
          background: feedback.ok ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.ok ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: feedback.ok ? '#4ade80' : '#f87171' }}>
          {feedback.ok ? '✅' : '❌'} {feedback.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filtrer par vendeur, id ou item…"
          style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }}
        />
        {(['active', 'sold', 'cancelled', 'all'] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
            background: statusFilter === s ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${statusFilter === s ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: statusFilter === s ? '#f97316' : 'rgba(255,255,255,0.5)',
          }}>
            {s === 'all' ? 'Toutes' : STATUS_LABEL[s]}
          </button>
        ))}
        {(['all', 'item', 'equipment', 'character'] as TypeFilter[]).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
            background: typeFilter === t ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${typeFilter === t ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: typeFilter === t ? '#60a5fa' : 'rgba(255,255,255,0.5)',
          }}>
            {t === 'all' ? 'Tous types' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {loading && listings.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.4, padding: '20px 0' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.4, padding: '20px 0' }}>Aucune annonce pour ces filtres.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(l => (
            <div key={l.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto auto auto', gap: 12, alignItems: 'center',
              padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${l.status === 'active' ? 'rgba(249,115,22,0.25)' : l.status === 'sold' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <span style={{ fontSize: 20, textAlign: 'center' }}>{getListingIcon(l)}</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13.4 }}>
                  {getListingLabel(l)}{l.quantity > 1 ? ` ×${l.quantity}` : ''}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11.5, marginTop: 2 }}>
                  {TYPE_LABEL[l.type]} · vendu par <span style={{ color: '#67e8f9' }}>{l.sellerName}</span>
                  {' · '}{new Date(l.createdAt).toLocaleString('fr-FR')}
                </div>
                {l.status === 'sold' && (
                  <div style={{ color: '#4ade80', fontSize: 11.5, marginTop: 2 }}>
                    Acheté par {l.soldToName}{l.claimed ? ' · encaissé' : ' · non encaissé'}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: l.status === 'active' ? '#4ade80' : l.status === 'sold' ? '#60a5fa' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                {STATUS_LABEL[l.status]}
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 14, textAlign: 'right', whiteSpace: 'nowrap',
                color: l.currency === 'gems' ? '#c084fc' : l.currency === 'crowns' ? '#fbbf24' : '#fde68a' }}>
                {CURRENCY_ICON[l.currency]} {formatNumber(l.price)}
              </span>
              {l.status === 'active' ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleBuy(l)} disabled={busy === l.id} title="Acheter avec le compte admin connecté" style={{ padding: '7px 12px', borderRadius: 6, cursor: busy === l.id ? 'default' : 'pointer', fontSize: 11.5, fontWeight: 700, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa', whiteSpace: 'nowrap' }}>
                    🛒 Acheter
                  </button>
                  <button onClick={() => handleRemove(l)} disabled={busy === l.id} title="Annuler l'annonce et restituer l'item au vendeur" style={{ padding: '7px 12px', borderRadius: 6, cursor: busy === l.id ? 'default' : 'pointer', fontSize: 11.5, fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', whiteSpace: 'nowrap' }}>
                    {busy === l.id ? '...' : '🗑️ Retirer'}
                  </button>
                </div>
              ) : <span />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
