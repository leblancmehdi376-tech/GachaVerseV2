'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById } from '@/lib/game/characters';
import { auth } from '@/lib/firebase/config';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { getVoidOrbsForRarity } from '@/lib/game/shop';
import { createListing, ListingCurrency } from '@/lib/firebase/marketplace';

const CURRENCY_ICON: Record<ListingCurrency, string> = { gems:'💎', coins:'🪙', crowns:'👑' };

// Groupes par rareté (pour le recyclage en masse).
export function groupChampionsByRarity(
  champions: { qty: number; tpl: { rarity: Rarity } | null | undefined }[],
): { rarity: Rarity; count: number; orbs: number }[] {
  const byRarity = champions.reduce((acc, c) => {
    if (!c.tpl) return acc;
    const rarity = c.tpl.rarity;
    if (!acc[rarity]) acc[rarity] = { rarity, count: 0, orbs: 0 };
    acc[rarity].count += c.qty;
    acc[rarity].orbs  += c.qty * getVoidOrbsForRarity(rarity);
    return acc;
  }, {} as Record<Rarity, { rarity: Rarity; count: number; orbs: number }>);
  return Object.values(byRarity);
}

export function ChampionInventoryPage() {
  const store = useGameStore();
  const user  = auth?.currentUser;

  const [feedback,   setFeedback]   = useState<{ ok:boolean; msg:string } | null>(null);
  // Formulaire de vente HdV
  const [selling,    setSelling]    = useState<string | null>(null); // templateId en cours
  const [sellPrice,  setSellPrice]  = useState('');
  const [sellCurr,   setSellCurr]   = useState<ListingCurrency>('coins');
  const [sellLoading,setSellLoading]= useState(false);
  // Recyclage groupé par rareté (double-clic pour confirmer)
  const [confirmRarity, setConfirmRarity] = useState<Rarity | null>(null);

  const showMsg = (ok:boolean, msg:string) => {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const champions = Object.entries(store.championInventory ?? {})
    .filter(([, qty]) => (qty as number) > 0)
    .map(([id, qty]) => ({ id, qty: qty as number, tpl: getCharacterById(id) }))
    .filter(c => c.tpl);

  const handleRecycle = (id: string) => {
    const tpl  = getCharacterById(id);
    const orbs = tpl ? getVoidOrbsForRarity(tpl.rarity) : 1;
    store.recycleChampion(id);
    showMsg(true, `+${orbs} Orbe(s) du Néant 🔮`);
  };

  const rarityGroups = groupChampionsByRarity(champions);

  const handleRecycleRarity = (rarity: Rarity) => {
    if (confirmRarity !== rarity) {
      setConfirmRarity(rarity);
      setTimeout(() => setConfirmRarity(r => (r === rarity ? null : r)), 4000);
      return;
    }
    setConfirmRarity(null);
    const { count, orbs } = store.recycleChampionsByRarity(rarity);
    if (count > 0) showMsg(true, `${count} doublon(s) ${RARITY_CONFIG[rarity].label} recyclé(s) — +${orbs} Orbe(s) du Néant 🔮`);
  };

  const handleSell = async (id: string) => {
    if (!user || !sellPrice || Number(sellPrice) <= 0) return;
    setSellLoading(true);
    const tpl = getCharacterById(id);
    // Retire le champion de l'inventaire
    store.removeChampion(id);
    const listingId = await createListing({
      sellerId:   user.uid,
      sellerName: store.username || 'Joueur',
      type:       'character',
      itemId:     id,
      quantity:   1,
      price:      Number(sellPrice),
      currency:   sellCurr,
    });
    if (listingId) {
      showMsg(true, `${tpl?.name} mis en vente sur l'HdV !`);
      setSelling(null);
      setSellPrice('');
    } else {
      // Rembourse en cas d'erreur
      store.addToCollection(id);
      showMsg(false, 'Erreur de publication');
    }
    setSellLoading(false);
  };

  return (
    <div style={{ padding:'20px', maxWidth:'900px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px', position: 'relative' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'4px', height:'22px', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:'2px', boxShadow:'0 0 10px #fbbf24' }} />
        <span style={{ fontFamily:'var(--f-title)', fontSize:'16.5px', fontWeight:700, color:'#fbbf24', letterSpacing:'3px' }}>INVENTAIRE DES CHAMPIONS</span>
      </div>

      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-muted)', lineHeight:1.6 }}>
        Doublons obtenus lorsque tes personnages atteignent les <strong style={{ color:'#fbbf24' }}>7★</strong>. Recycle-les contre des Orbes du Néant ou mets-les en vente à l&apos;Hôtel de Ville.
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top: '72px', zIndex:30, padding:'10px 16px', borderRadius:'8px', fontFamily:'var(--f-ui)', fontSize:'13.4px', fontWeight:700,
          background: feedback.ok?'rgba(74,222,128,0.1)':'rgba(239,68,68,0.1)',
          border:`1px solid ${feedback.ok?'rgba(74,222,128,0.4)':'rgba(239,68,68,0.4)'}`,
          color: feedback.ok?'#4ade80':'#f87171',
        }}>
          {feedback.ok?'✅':'❌'} {feedback.msg}
        </div>
      )}

      {/* Recyclage groupé par rareté */}
      {rarityGroups.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
          {rarityGroups.map(({ rarity, count, orbs }) => {
            const cfg = RARITY_CONFIG[rarity];
            const armed = confirmRarity === rarity;
            return (
              <button key={rarity} onClick={() => handleRecycleRarity(rarity)}
                style={{
                  padding:'8px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px',
                  background: armed ? 'rgba(239,68,68,0.15)' : `${cfg.color}18`,
                  border:`1px solid ${armed ? 'rgba(239,68,68,0.5)' : `${cfg.color}44`}`,
                  color: armed ? '#f87171' : cfg.color,
                }}>
                {armed ? `⚠ Confirmer : recycler ${count} ${cfg.label} (+${orbs} 🔮) ?` : `🔮 Recycler tout ${cfg.label} (×${count} → +${orbs})`}
              </button>
            );
          })}
        </div>
      )}

      {champions.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }}>
          <div style={{ fontSize:'41.2px', marginBottom:'12px' }}>🏆</div>
          Aucun doublon 7★ pour le moment.<br/>Continue à pull pour remplir cet inventaire !
        </div>
      ) : (
        <div style={{ maxHeight: '62vh', overflowY: 'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'12px' }}>
            {champions.map(({ id, qty, tpl }) => {
            if (!tpl) return null;
            const cfg     = RARITY_CONFIG[tpl.rarity];
            const orbs    = getVoidOrbsForRarity(tpl.rarity);
            const isSell  = selling === id;
            return (
              <div key={id} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${cfg.color}33`, borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', gap:'10px' }}>

                {/* Infos perso */}
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'8px', background:`${cfg.color}22`, border:`1px solid ${cfg.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20.6px' }}>
                    🧬
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:cfg.color }}>{tpl.name}</div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>{cfg.label} · {qty > 1 ? `×${qty} exemplaires` : '1 exemplaire'}</div>
                  </div>
                </div>

                {/* Formulaire de vente */}
                {isSell ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', padding:'10px', background:'rgba(249,115,22,0.05)', borderRadius:'8px', border:'1px solid rgba(249,115,22,0.2)' }}>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <input
                        type='number' min={1} placeholder='Prix'
                        value={sellPrice} onChange={e => setSellPrice(e.target.value)}
                        style={{ flex:1, padding:'7px 10px', borderRadius:'6px', background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-hi)', fontFamily:'var(--f-ui)', fontSize:'12.4px' }}
                      />
                      {(['coins','gems','crowns'] as const).map(c => (
                        <button key={c} onClick={() => setSellCurr(c)} style={{
                          padding:'6px 10px', borderRadius:'6px', cursor:'pointer',
                          background: sellCurr===c?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.03)',
                          border:`1px solid ${sellCurr===c?'rgba(255,255,255,0.3)':'var(--border)'}`,
                          fontSize:'14.4px',
                        }}>{CURRENCY_ICON[c]}</button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => handleSell(id)} disabled={sellLoading || !sellPrice}
                        style={{ flex:1, padding:'8px', borderRadius:'7px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', background:'rgba(249,115,22,0.2)', border:'1px solid #f9731666', color:'#f97316' }}>
                        {sellLoading ? '...' : '📢 Publier'}
                      </button>
                      <button onClick={() => { setSelling(null); setSellPrice(''); }}
                        style={{ padding:'8px 12px', borderRadius:'7px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', color:'var(--text-muted)' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button onClick={() => handleRecycle(id)}
                      style={{ flex:1, padding:'8px', borderRadius:'7px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', background:'rgba(139,92,246,0.12)', border:'1px solid rgba(139,92,246,0.3)', color:'#a78bfa' }}>
                      🔮 Recycler (+{orbs} orbe{orbs > 1 ? 's' : ''})
                    </button>
                    <button onClick={() => { setSelling(id); setSellPrice(''); }}
                      style={{ flex:1, padding:'8px', borderRadius:'7px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.3)', color:'#f97316' }}>
                      🏛 Vendre HdV
                    </button>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
