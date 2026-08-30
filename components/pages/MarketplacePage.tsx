'use client';
import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { auth } from '@/lib/firebase/config';
import { formatNumber } from '@/lib/game/format';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { getEquipmentDef, ITEM_DEFS } from '@/lib/game/items';
import {
  MarketplaceListing, ListingCurrency, ListingType,
  getActiveListings, getMyListings,
  createListing, buyListing, cancelListing, claimSaleReward,
} from '@/lib/firebase/marketplace';
import { bnAdd, bnFromNumber, bnGte, type BigNum } from '@/lib/game/bignum';

const CURRENCY_ICON: Record<ListingCurrency, string> = {
  gems:   '💎',
  coins:  '🪙',
  crowns: '👑',
};

const TYPE_LABEL: Record<ListingType, string> = {
  item:      'Item',
  equipment: 'Équipement',
  character: 'Personnage',
};

export function canAffordListing(
  currency: ListingCurrency,
  price: number,
  balances: { nekoGems: number; bossCrowns: number; pixelCoins: BigNum },
): boolean {
  if (currency === 'gems') return balances.nekoGems >= price;
  if (currency === 'crowns') return balances.bossCrowns >= price;
  return bnGte(balances.pixelCoins, bnFromNumber(price));
}

export function getListingLabel(l: MarketplaceListing): string {
  if (l.type === 'character') {
    const tpl = getCharacterById(parseInstanceKey(l.itemId).templateId);
    return tpl?.name ?? l.itemId;
  }
  if (l.type === 'equipment') {
    return getEquipmentDef(l.itemId)?.name ?? l.itemId;
  }
  return ITEM_DEFS[l.itemId]?.name ?? l.itemId;
}

export function getListingIcon(l: MarketplaceListing): string {
  if (l.type === 'character') return '🧬';
  if (l.type === 'equipment') return getEquipmentDef(l.itemId)?.icon ?? '🔧';
  return ITEM_DEFS[l.itemId]?.icon ?? '📦';
}

export function MarketplacePage() {
  const store = useGameStore();
  const user  = auth?.currentUser;

  const [tab,        setTab]        = useState<'market' | 'mine'>('market');
  const [listings,   setListings]   = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [feedback,   setFeedback]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [filterType, setFilterType] = useState<ListingType | 'all'>('all');

  // ── Formulaire de mise en vente ────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [formType,    setFormType]    = useState<ListingType>('item');
  const [formItemId,  setFormItemId]  = useState('');
  const [formQty,     setFormQty]     = useState(1);
  const [formPrice,   setFormPrice]   = useState('');
  const [formCurrency,setFormCurrency]= useState<ListingCurrency>('coins');
  const [formLoading, setFormLoading] = useState(false);

  const showMsg = (ok: boolean, msg: string) => {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadMarket = useCallback(async () => {
    setLoading(true);
    const data = await getActiveListings();
    setListings(data);
    setLoading(false);
  }, []);

  const loadMine = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getMyListings(user.uid);
    setMyListings(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadMarket(); }, [loadMarket]);
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine]);

  // ── Listes d'items disponibles à vendre ───────────────────────────────
  const availableItems = Object.entries(store.inventory ?? {})
    .filter(([, qty]) => (qty as number) > 0)
    .map(([id]) => ({ id, label: ITEM_DEFS[id]?.name ?? id, icon: ITEM_DEFS[id]?.icon ?? '📦' }));

  const availableEquip = Object.entries(store.equipmentInventory ?? {})
    .filter(([, qty]) => (qty as number) > 0)
    .map(([id]) => ({ id, label: getEquipmentDef(id)?.name ?? id, icon: getEquipmentDef(id)?.icon ?? '🔧' }));

  const availableChars = Object.entries(store.collection ?? {})
    .filter(([id]) => {
      const tpl = getCharacterById(parseInstanceKey(id).templateId);
      return tpl && tpl.rarity !== 'T'; // ne pas vendre NekoZ
    })
    .map(([id]) => ({ id, label: getCharacterById(parseInstanceKey(id).templateId)?.name ?? id, icon: '🧬' }));

  // ── Mettre en vente ────────────────────────────────────────────────────
  const handleCreateListing = async () => {
    if (!user || !formItemId || !formPrice || Number(formPrice) <= 0) return;
    setFormLoading(true);

    // Retire l'item du store localement
    if (formType === 'item') {
      const qty = (store.inventory?.[formItemId] ?? 0);
      if (qty < formQty) { showMsg(false, 'Pas assez en inventaire'); setFormLoading(false); return; }
      store.addItem(formItemId, -formQty);
    } else if (formType === 'equipment') {
      const qty = store.equipmentInventory?.[formItemId] ?? 0;
      if (qty < 1) { showMsg(false, 'Item non disponible'); setFormLoading(false); return; }
      store.addEquipment(formItemId, -1);
    } else {
      showMsg(false, 'Type non supporté'); setFormLoading(false); return;
    }

    const id = await createListing({
      sellerId:   user.uid,
      sellerName: store.username || 'Joueur',
      type:       formType,
      itemId:     formItemId,
      quantity:   formType === 'item' ? formQty : 1,
      price:      Number(formPrice),
      currency:   formCurrency,
    });

    if (id) {
      showMsg(true, 'Annonce publiée !');
      setShowForm(false);
      setFormItemId('');
      setFormPrice('');
      setFormQty(1);
      loadMarket();
    } else {
      showMsg(false, 'Erreur lors de la publication');
      // Remet l'item en cas d'échec
      if (formType === 'item')      store.addItem(formItemId, formQty);
      if (formType === 'equipment') store.addEquipment(formItemId, 1);
    }
    setFormLoading(false);
  };

  // ── Acheter ────────────────────────────────────────────────────────────
  const handleBuy = async (listing: MarketplaceListing) => {
    if (!user) return;
    // Vérifie la balance
    const canAfford = canAffordListing(listing.currency, listing.price, store);
    if (!canAfford) { showMsg(false, `Pas assez de ${CURRENCY_ICON[listing.currency]}`); return; }

    const result = await buyListing(listing.id, user.uid, store.username || 'Joueur');
    if (!result) { showMsg(false, 'Achat impossible (déjà vendu ?)'); loadMarket(); return; }

    // Déduit la monnaie
    if (listing.currency === 'gems')        useGameStore.setState(s => ({ nekoGems:   s.nekoGems   - listing.price }));
    else if (listing.currency === 'crowns') useGameStore.setState(s => ({ bossCrowns: s.bossCrowns - listing.price }));
    else store.spendPixelCoins(bnFromNumber(listing.price));

    // Donne l'item
    if (listing.type === 'item')      store.addItem(listing.itemId, listing.quantity);
    else if (listing.type === 'equipment') store.addEquipment(listing.itemId, 1);
    else store.addToCollection(listing.itemId);

    showMsg(true, `${getListingLabel(listing)} acheté !`);
    loadMarket();
  };

  // ── Annuler ────────────────────────────────────────────────────────────
  const handleCancel = async (listing: MarketplaceListing) => {
    if (!user) return;
    const ok = await cancelListing(listing.id, user.uid);
    if (!ok) { showMsg(false, 'Annulation impossible'); return; }
    // Remet l'item
    if (listing.type === 'item')      store.addItem(listing.itemId, listing.quantity);
    else if (listing.type === 'equipment') store.addEquipment(listing.itemId, 1);
    else store.addToCollection(listing.itemId);
    showMsg(true, 'Annonce annulée, item récupéré');
    loadMine();
  };

  // ── Encaisser ─────────────────────────────────────────────────────────
  const handleClaim = async (listing: MarketplaceListing) => {
    if (!user) return;
    const ok = await claimSaleReward(listing.id, user.uid);
    if (!ok) { showMsg(false, 'Erreur encaissement'); return; }
    // Donne la monnaie au vendeur
    if (listing.currency === 'gems')        useGameStore.setState(s => ({ nekoGems:   s.nekoGems   + listing.price }));
    else if (listing.currency === 'crowns') useGameStore.setState(s => ({ bossCrowns: s.bossCrowns + listing.price, totalBossCrownsEarned: (s.totalBossCrownsEarned ?? 0) + listing.price }));
    else useGameStore.setState(s => ({ pixelCoins: bnAdd(s.pixelCoins, bnFromNumber(listing.price)) }));
    showMsg(true, `+${formatNumber(listing.price)} ${CURRENCY_ICON[listing.currency]} encaissés !`);
    loadMine();
  };

  const filtered = filterType === 'all' ? listings : listings.filter(l => l.type === filterType);

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px', maxWidth:'900px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'4px', height:'22px', background:'linear-gradient(180deg,#f97316,#ea580c)', borderRadius:'2px', boxShadow:'0 0 10px #f97316' }} />
        <span style={{ fontFamily:'var(--f-title)', fontSize:'16.5px', fontWeight:700, color:'#f97316', letterSpacing:'3px' }}>HÔTEL DE VILLE</span>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ padding:'10px 16px', borderRadius:'8px', fontFamily:'var(--f-ui)', fontSize:'13.4px', fontWeight:700,
          background: feedback.ok ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border:`1px solid ${feedback.ok ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: feedback.ok ? '#4ade80' : '#f87171',
        }}>
          {feedback.ok ? '✅' : '❌'} {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'8px' }}>
        {(['market','mine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'9px 18px', borderRadius:'8px', cursor:'pointer',
            fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', letterSpacing:'1px',
            background: tab===t ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
            border:`1px solid ${tab===t ? '#f9731666' : 'var(--border)'}`,
            color: tab===t ? '#f97316' : 'var(--text-muted)',
          }}>
            {t === 'market' ? '🏪 MARCHÉ' : '📋 MES ANNONCES'}
          </button>
        ))}
        <button onClick={loadMarket} style={{ marginLeft:'auto', padding:'9px 14px', borderRadius:'8px', cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:'14.4px' }}>🔄</button>
      </div>

      {/* ── MARCHÉ ─────────────────────────────────────────────────────── */}
      {tab === 'market' && (
        <>
          {/* Filtres */}
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {(['all','item','equipment','character'] as const).map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                padding:'5px 12px', borderRadius:'6px', cursor:'pointer',
                fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px',
                background: filterType===f ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                border:`1px solid ${filterType===f ? '#f9731644' : 'var(--border)'}`,
                color: filterType===f ? '#f97316' : 'var(--text-muted)',
              }}>
                {f === 'all' ? 'Tout' : TYPE_LABEL[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontFamily:'var(--f-ui)' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }}>Aucune annonce pour le moment</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {filtered.map(l => {
                const isOwn   = l.sellerId === user?.uid;
                const canAfford = canAffordListing(l.currency, l.price, store);
                const canBuy  = !isOwn && canAfford;
                return (
                  <div key={l.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'12px 16px', display:'grid', gridTemplateColumns:'36px 1fr auto auto', gap:'12px', alignItems:'center' }}>
                    <span style={{ fontSize:'22.7px', textAlign:'center' }}>{getListingIcon(l)}</span>
                    <div>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text-hi)' }}>
                        {getListingLabel(l)}{l.quantity > 1 ? ` ×${l.quantity}` : ''}
                      </div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>
                        {TYPE_LABEL[l.type]} · par <span style={{ color:'var(--cyan)' }}>{l.sellerName}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'15.5px', color: l.currency === 'gems' ? '#c084fc' : l.currency === 'crowns' ? '#fbbf24' : '#fde68a', textAlign:'right', whiteSpace:'nowrap' }}>
                      {CURRENCY_ICON[l.currency]} {formatNumber(l.price)}
                    </div>
                    {isOwn ? (
                      <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', padding:'4px 8px', border:'1px solid var(--border)', borderRadius:'5px' }}>Ma vente</span>
                    ) : (
                      <button onClick={() => handleBuy(l)} disabled={!canBuy} style={{
                        padding:'7px 14px', borderRadius:'7px', cursor:canBuy?'pointer':'not-allowed',
                        fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px',
                        background:canBuy?'rgba(249,115,22,0.18)':'rgba(255,255,255,0.03)',
                        border:`1px solid ${canBuy?'#f9731666':'var(--border)'}`,
                        color:canBuy?'#f97316':'var(--text-muted)',
                      }}>
                        Acheter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── MES ANNONCES ───────────────────────────────────────────────── */}
      {tab === 'mine' && (
        <>
          <button onClick={() => setShowForm(v => !v)} style={{
            padding:'10px 20px', borderRadius:'9px', cursor:'pointer', width:'fit-content',
            fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', letterSpacing:'1px',
            background:'rgba(249,115,22,0.18)', border:'1px solid #f9731666', color:'#f97316',
          }}>
            {showForm ? '✕ Annuler' : '+ Mettre en vente'}
          </button>

          {/* Formulaire */}
          {showForm && (
            <div style={{ background:'rgba(249,115,22,0.05)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:'12px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px' }}>
              <span style={{ fontFamily:'var(--f-title)', fontSize:'13.4px', color:'#f97316', letterSpacing:'2px' }}>NOUVELLE ANNONCE</span>

              {/* Type — personnages exclus (via Inventaire des Champions uniquement) */}
              <div style={{ display:'flex', gap:'8px' }}>
                {(['item','equipment'] as const).map(t => (
                  <button key={t} onClick={() => { setFormType(t); setFormItemId(''); }} style={{
                    padding:'6px 14px', borderRadius:'6px', cursor:'pointer',
                    fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px',
                    background: formType===t ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.04)',
                    border:`1px solid ${formType===t ? '#f9731666' : 'var(--border)'}`,
                    color: formType===t ? '#f97316' : 'var(--text-muted)',
                  }}>{TYPE_LABEL[t]}</button>
                ))}
              </div>

              {/* Sélection item */}
              <select value={formItemId} onChange={e => setFormItemId(e.target.value)} style={{
                padding:'9px 12px', borderRadius:'7px', background:'var(--bg-card)', border:'1px solid var(--border)',
                color:'var(--text-hi)', fontFamily:'var(--f-ui)', fontSize:'13.4px', cursor:'pointer',
              }}>
                <option value=''>-- Choisir --</option>
                {(formType === 'item' ? availableItems : formType === 'equipment' ? availableEquip : availableChars)
                  .map(i => <option key={i.id} value={i.id}>{i.icon} {i.label}</option>)}
              </select>

              {/* Quantité (items seulement) */}
              {formType === 'item' && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-muted)' }}>Quantité</span>
                  <input type='number' min={1} value={formQty} onChange={e => setFormQty(Math.max(1, Number(e.target.value)))} style={{ width:'70px', padding:'7px 10px', borderRadius:'6px', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-hi)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }} />
                </div>
              )}

              {/* Prix + monnaie */}
              <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                <input type='number' min={1} placeholder='Prix' value={formPrice} onChange={e => setFormPrice(e.target.value)} style={{ flex:1, minWidth:'120px', padding:'9px 12px', borderRadius:'7px', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-hi)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }} />
                {(['coins','gems','crowns'] as const).map(c => (
                  <button key={c} onClick={() => setFormCurrency(c)} style={{
                    padding:'8px 14px', borderRadius:'7px', cursor:'pointer',
                    fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px',
                    background: formCurrency===c ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border:`1px solid ${formCurrency===c ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`,
                    color: formCurrency===c ? 'var(--text-hi)' : 'var(--text-muted)',
                  }}>{CURRENCY_ICON[c]}</button>
                ))}
              </div>

              <button onClick={handleCreateListing} disabled={formLoading || !formItemId || !formPrice} style={{
                padding:'11px', borderRadius:'9px', cursor:'pointer',
                fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px',
                background:'rgba(249,115,22,0.25)', border:'1px solid #f9731688', color:'#f97316',
              }}>
                {formLoading ? '...' : '📢 Publier l\'annonce'}
              </button>
            </div>
          )}

          {/* Mes annonces */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontFamily:'var(--f-ui)' }}>Chargement...</div>
          ) : myListings.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }}>Aucune annonce</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {myListings.map(l => (
                <div key={l.id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${l.status==='active'?'rgba(255,255,255,0.08)':l.status==='sold'?'rgba(74,222,128,0.2)':'rgba(255,255,255,0.04)'}`, borderRadius:'10px', padding:'12px 16px', display:'grid', gridTemplateColumns:'36px 1fr auto auto', gap:'12px', alignItems:'center' }}>
                  <span style={{ fontSize:'22.7px', textAlign:'center' }}>{getListingIcon(l)}</span>
                  <div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text-hi)' }}>
                      {getListingLabel(l)}{l.quantity > 1 ? ` ×${l.quantity}` : ''}
                    </div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color: l.status==='active'?'var(--text-muted)':l.status==='sold'?'#4ade80':'#6b7280' }}>
                      {l.status === 'active' ? '🟢 En vente' : l.status === 'sold' && !(l as any).claimed ? `✅ Vendu à ${l.soldToName}` : l.status === 'sold' ? '💰 Encaissé' : '❌ Annulé'}
                    </div>
                  </div>
                  <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'15.5px', color:'var(--text-sub)', textAlign:'right', whiteSpace:'nowrap' }}>
                    {CURRENCY_ICON[l.currency]} {formatNumber(l.price)}
                  </div>
                  <div>
                    {l.status === 'active' && (
                      <button onClick={() => handleCancel(l)} style={{ padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
                        Annuler
                      </button>
                    )}
                    {l.status === 'sold' && !(l as any).claimed && (
                      <button onClick={() => handleClaim(l)} style={{ padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', color:'#4ade80' }}>
                        Encaisser
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
