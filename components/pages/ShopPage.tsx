'use client';
import { useEffect, useState } from 'react';
import { useGameStore, getGoldChestMultiplier } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { getCharacterById } from '@/lib/game/characters';
import { RARITY_CONFIG, CardEdition } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import {
  CROWN_GEM_PACKS, ORB_GEM_PACKS, GEM_GOLD_PACKS, getGoldPackCoins, BOOST_COST_CROWNS, BOOST_DURATION_MS, BOOST_MULTIPLIER,
  SHOP_CHAR_PRICE_ORBS, LAUNCH_TIMESTAMP, STARTER_PACK_WINDOW_MS, STARTER_PACK_REWARDS,
  EQUIPMENT_CHESTS, getRerollShopCost,
} from '@/lib/game/shop';
import { getEquipmentDef, getItemDef } from '@/lib/game/items';
import { EVENT_BOSSES, getEventCharacterCost } from '@/lib/game/eventBoss';
import { makeInstanceKey } from '@/lib/game/editions';

export function isCharacterOwned(collection: Record<string, unknown>, templateId: string): boolean {
  return (['base', 'gold', 'diamond'] as const).some(ed => !!collection[makeInstanceKey(templateId, ed)]);
}

function NewBadge() {
  return (
    <span style={{ position:'absolute', top:-6, right:-6, background:'#4ade80', color:'#052e12', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'10px', letterSpacing:'0.3px', padding:'2px 6px', borderRadius:'999px', boxShadow:'0 0 8px rgba(74,222,128,0.6)', zIndex:1 }}>
      NEW
    </span>
  );
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function ShopPage() {
  const {
    nekoGems, bossCrowns, voidOrbs, palier, inventory, goldUpgradeLevel, collection,
    dpsBoostEndsAt, goldBoostEndsAt, isDpsBoostActive, isGoldBoostActive,
    buyDpsBoost, buyGoldBoost, buyGemsWithCrowns, buyGoldWithGems,
    dailyShop, ensureDailyShop, buyShopCharacter, rerollDailyShop, buyGemsWithOrbs, buyEquipmentChest,
    starterPackClaimed, isStarterPackAvailable, claimStarterPack, buyEventCharacter,
    eventCharacterPurchases,
  } = useGameStore();
  const { getMaxActiveExpeditions, getExpeditionSlotCost, upgradeExpeditionSlot } = useGameStore();

  const [, setTick] = useState(0);
  const [chestResult, setChestResult] = useState<{ itemId: string; tier: string } | null>(null);
  const [starterResult, setStarterResult] = useState<{ templateId: string; edition: CardEdition } | null>(null);
  useEffect(() => {
    ensureDailyShop();
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [ensureDailyShop]);

  const dpsActive  = isDpsBoostActive();
  const goldActive = isGoldBoostActive();
  const starterAvailable = isStarterPackAvailable();
  const starterTimeLeft  = (LAUNCH_TIMESTAMP + STARTER_PACK_WINDOW_MS) - Date.now();

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <div style={{ maxWidth:'820px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'28px' }}>

        {/* ── Pack de démarrage Early Access ── */}
        {starterAvailable && (
          <div style={{ background:'linear-gradient(135deg,#1a0d2e,#3b0764)', border:'2px solid #c084fc', borderRadius:'14px', padding:'20px 24px', position:'relative', overflow:'hidden', boxShadow:'0 0 30px rgba(168,85,247,0.35)' }}>
            <div style={{ position:'absolute', top:'12px', right:'16px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'#e9d5ff', background:'rgba(88,28,135,0.7)', border:'1px solid #c084fc66', borderRadius:'6px', padding:'3px 10px', letterSpacing:'0.5px' }}>
              ⏳ Expire dans {formatDuration(starterTimeLeft)}
            </div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:'18.5px', fontWeight:700, color:'#e9d5ff', marginBottom:'6px', letterSpacing:'1px' }}>✦ PACK DE BIENVENUE ✦</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'rgba(255,255,255,0.7)', marginBottom:'16px' }}>
              Offre limitée aux 24 premières heures du jeu. Gratuit, juste pour toi !
            </div>
            <div style={{ display:'flex', gap:'14px', marginBottom:'16px' }}>
              {[
                { icon:'💎', val:STARTER_PACK_REWARDS.gems,       label:'Gemmes' },
                { icon:'✦',  val:STARTER_PACK_REWARDS.stellaire,  label:'Perso. Stellaire aléatoire' },
              ].map(r => (
                <div key={r.label} style={{ flex:1, background:'rgba(0,0,0,0.25)', borderRadius:'10px', padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:'22.7px' }}>{r.icon}</div>
                  <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'18.5px', color:'white' }}>{r.val}</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'rgba(255,255,255,0.5)' }}>{r.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => {
                const result = claimStarterPack();
                if (result) setStarterResult(result);
              }}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#a855f7,#7c3aed)', border:'none', borderRadius:'9px', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'15.5px', color:'white', cursor:'pointer', letterSpacing:'0.5px', boxShadow:'0 4px 16px rgba(168,85,247,0.4)' }}>
              RÉCLAMER GRATUITEMENT
            </button>
          </div>
        )}
        {starterResult && (() => {
          const tpl = getCharacterById(starterResult.templateId);
          if (!tpl) return null;
          return (
            <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:'10px', padding:'14px 16px', display:'flex', alignItems:'center', gap:'14px' }}>
              <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} edition={starterResult.edition} width={56} height={78} />
              <div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'#4ade80', marginBottom:'4px' }}>Personnage obtenu !</div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'15.5px', color:'white', marginBottom:'4px' }}>{tpl.name}</div>
                <RarityBadge rarity={tpl.rarity} size="xs" />
              </div>
              <button onClick={() => setStarterResult(null)} style={{ marginLeft:'auto', alignSelf:'flex-start', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'16.5px' }}>✕</button>
            </div>
          );
        })()}
        {starterPackClaimed && !starterResult && (
          <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'10px', padding:'10px 16px', fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'#4ade80', textAlign:'center' }}>
            ✓ Pack de bienvenue déjà réclamé
          </div>
        )}

        {/* ══ BOSSCROWN ══════════════════════════════════════════════════ */}
        <div>
          <div style={{ background:'linear-gradient(135deg,#2a1500,#3d1f00)', border:'1px solid rgba(217,158,34,0.35)', borderRadius:'14px', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', fontWeight:600, letterSpacing:'1px', marginBottom:'4px' }}>TON SOLDE</div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'26.8px' }}>👑</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'28.8px', color:'#fbbf24' }}>{formatNumber(bossCrowns)}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)' }}>BossCrowns</span>
              </div>
            </div>
            <div style={{ textAlign:'right', fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.6 }}>
              +1 👑 à chaque boss vaincu
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#fbbf24,#b45309)', borderRadius:'2px', boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#fbbf24', letterSpacing:'2px' }}>BOOSTS TEMPORAIRES</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'20px' }}>
            {[
              { key:'dps' as const, icon:'⚡', label:'Boost DPS', active:dpsActive, endsAt:dpsBoostEndsAt, buy:buyDpsBoost, color:'#f87171' },
              { key:'gold' as const, icon:'💰', label:'Boost Or', active:goldActive, endsAt:goldBoostEndsAt, buy:buyGoldBoost, color:'#4ade80' },
            ].map(b => (
              <div key={b.key} style={{ background:b.active?`${b.color}14`:'var(--bg-card)', border:`1px solid ${b.active?b.color+'66':'var(--border)'}`, borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'20.6px' }}>{b.icon}</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:'var(--text)' }}>{b.label}</span>
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
                  +{Math.round((BOOST_MULTIPLIER-1)*100)}% pendant {BOOST_DURATION_MS/60000} min
                </div>
                {b.active && (
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:b.color }}>
                    ✓ ACTIF — {formatDuration(b.endsAt - Date.now())} restant
                  </div>
                )}
                <button onClick={b.buy} disabled={bossCrowns < BOOST_COST_CROWNS}
                  style={{ marginTop:'4px', padding:'9px', background:bossCrowns>=BOOST_COST_CROWNS?`${b.color}22`:'rgba(255,255,255,0.03)', border:`1px solid ${bossCrowns>=BOOST_COST_CROWNS?b.color+'66':'var(--border)'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:bossCrowns>=BOOST_COST_CROWNS?b.color:'var(--text-muted)', cursor:bossCrowns>=BOOST_COST_CROWNS?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  {b.active ? 'PROLONGER' : 'ACTIVER'} · 👑{BOOST_COST_CROWNS}
                </button>
              </div>
            ))}
          </div>

          {(() => {
            const maxActive = getMaxActiveExpeditions();
            const slotCost  = getExpeditionSlotCost();
            const maxed     = slotCost === null;
            const canAfford = !maxed && bossCrowns >= slotCost;
            return (
              <div style={{ background:'var(--bg-card)', border:`1px solid ${maxed?'rgba(74,222,128,0.4)':'var(--border)'}`, borderRadius:'12px', padding:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'14px', marginBottom:'20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'20.6px' }}>🧭</span>
                  <div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:'var(--text)' }}>Emplacements d&apos;Expédition</div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
                      Lance {maxActive} expédition{maxActive>1?'s':''} en simultané{maxed ? ' — MAXIMUM ATTEINT' : ''}
                    </div>
                  </div>
                </div>
                {maxed
                  ? <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'#4ade80', flexShrink:0 }}>✓ MAX</div>
                  : <button onClick={upgradeExpeditionSlot} disabled={!canAfford}
                      style={{ padding:'9px 16px', background:canAfford?'rgba(251,191,36,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${canAfford?'#fbbf2466':'var(--border)'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:canAfford?'#fbbf24':'var(--text-muted)', cursor:canAfford?'pointer':'not-allowed', flexShrink:0, display:'flex', alignItems:'center', gap:'6px' }}>
                      +1 EMPLACEMENT · 👑{slotCost}
                    </button>
                }
              </div>
            );
          })()}

          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
            {CROWN_GEM_PACKS.map(p => (
              <div key={p.id} style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:'10px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'22.7px' }}>💎</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'18.5px', color:'var(--cyan)' }}>{p.gems}</span>
                {p.bonusLabel && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'#4ade80' }}>{p.bonusLabel}</span>}
                <button onClick={() => buyGemsWithCrowns(p.id)} disabled={bossCrowns < p.crowns}
                  style={{ width:'100%', marginTop:'4px', padding:'8px', background:bossCrowns>=p.crowns?'rgba(251,191,36,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${bossCrowns>=p.crowns?'#fbbf2466':'var(--border)'}`, borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:bossCrowns>=p.crowns?'#fbbf24':'var(--text-muted)', cursor:bossCrowns>=p.crowns?'pointer':'not-allowed' }}>
                  👑 {p.crowns}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ══ ACHATS EN GEMMES (OR) ═════════════════════════════════════════════ */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#38bdf8,#0ea5e9)', borderRadius:'2px', boxShadow:'0 0 8px #38bdf8' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#38bdf8', letterSpacing:'2px' }}>ACHATS EN GEMMES</span>
          </div>
          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {GEM_GOLD_PACKS.map(p => {
              // Valeur alignée sur la courbe organique (voir getGoldPackCoins) :
              // le pack vaut toujours l'équivalent de killsEquivalent kills au
              // palier courant (Coffre d'Or inclus), jamais un multiplicateur
              // déconnecté de l'économie.
              const scaledCoins = getGoldPackCoins(p, palier, getGoldChestMultiplier(goldUpgradeLevel ?? 0));
              const canBuy = nekoGems >= p.gems;
              return (
                <div key={p.id} style={{ background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:'10px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'22.7px' }}>💰</span>
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'18.5px', color:'var(--cyan)' }}>{formatNumber(scaledCoins)} or</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)' }}>≈ {p.killsEquivalent} kills</span>
                  {p.bonusLabel && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'#4ade80' }}>{p.bonusLabel}</span>}
                  <button onClick={() => buyGoldWithGems(p.id)} disabled={!canBuy}
                    style={{ width:'100%', marginTop:'4px', padding:'8px', background:canBuy?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${canBuy?'#38bdf866':'var(--border)'}`, borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:canBuy?'#38bdf8':'var(--text-muted)', cursor:canBuy?'pointer':'not-allowed' }}>
                    💎 {p.gems}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ ORBE DU NÉANT ══════════════════════════════════════════════ */}
        <div>
          <div style={{ background:'linear-gradient(135deg,#1a0d2e,#0d0520)', border:'1px solid rgba(168,85,247,0.35)', borderRadius:'14px', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
            <div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', fontWeight:600, letterSpacing:'1px', marginBottom:'4px' }}>TON SOLDE</div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'26.8px' }}>🔮</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'28.8px', color:'#c084fc' }}>{formatNumber(voidOrbs)}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)' }}>Orbes du Néant</span>
              </div>
            </div>
            <div style={{ textAlign:'right', fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.6 }}>
              Obtenues en recyclant<br/>les doublons d&apos;un perso 7★
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#c084fc,#6d28d9)', borderRadius:'2px', boxShadow:'0 0 8px #c084fc' }} />
              <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#c084fc', letterSpacing:'2px' }}>BOUTIQUE DU JOUR</span>
            </div>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>
              ⏳ Renouvellement dans {formatDuration(msUntilNextMidnight())}
            </span>
          </div>

          {(() => {
            const rerollCost = getRerollShopCost();
            const canReroll = voidOrbs >= rerollCost;
            return (
              <button onClick={rerollDailyShop} disabled={!canReroll}
                style={{ width:'100%', marginBottom:'14px', padding:'10px', background:canReroll?'rgba(192,132,252,0.14)':'rgba(255,255,255,0.03)', border:`1px solid ${canReroll?'#c084fc66':'var(--border)'}`, borderRadius:'8px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:canReroll?'#c084fc':'var(--text-muted)', cursor:canReroll?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                🎲 REROLL LA BOUTIQUE · 🔮 {rerollCost}
              </button>
            );
          })()}

          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
            {dailyShop.characterIds.map(id => {
              const tpl = getCharacterById(id);
              if (!tpl) return null;
              const cfg     = RARITY_CONFIG[tpl.rarity];
              const price   = SHOP_CHAR_PRICE_ORBS[tpl.rarity];
              const bought  = dailyShop.purchased.includes(id);
              const canBuy  = !bought && voidOrbs >= price;
              const isNew   = !isCharacterOwned(collection, tpl.id);
              return (
                <div key={id} style={{ background:bought?'rgba(74,222,128,0.05)':`${cfg.color}0c`, border:`1px solid ${bought?'rgba(74,222,128,0.3)':cfg.color+'55'}`, borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
                  <div style={{ position:'relative' }}>
                    <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={64} height={88} />
                    {isNew && <NewBadge />}
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)', textAlign:'center' }}>{tpl.name}</span>
                  <RarityBadge rarity={tpl.rarity} />
                  <button onClick={() => buyShopCharacter(dailyShop.characterIds.indexOf(id))} disabled={!canBuy}
                    style={{ width:'100%', padding:'8px', background:bought?'rgba(74,222,128,0.12)':canBuy?`${cfg.color}22`:'rgba(255,255,255,0.03)', border:`1px solid ${bought?'rgba(74,222,128,0.4)':canBuy?cfg.color+'66':'var(--border)'}`, borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:bought?'#4ade80':canBuy?cfg.color:'var(--text-muted)', cursor:canBuy?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                    {bought ? '✓ ACHETÉ' : <>🔮 {price}</>}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
            {ORB_GEM_PACKS.map(p => (
              <div key={p.id} style={{ background:'rgba(168,85,247,0.05)', border:'1px solid rgba(168,85,247,0.25)', borderRadius:'10px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'22.7px' }}>💎</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'18.5px', color:'var(--cyan)' }}>{p.gems}</span>
                {p.bonusLabel && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'#4ade80' }}>{p.bonusLabel}</span>}
                <button onClick={() => buyGemsWithOrbs(p.id)} disabled={voidOrbs < p.orbs}
                  style={{ width:'100%', marginTop:'4px', padding:'8px', background:voidOrbs>=p.orbs?'rgba(168,85,247,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${voidOrbs>=p.orbs?'#c084fc66':'var(--border)'}`, borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:voidOrbs>=p.orbs?'#c084fc':'var(--text-muted)', cursor:voidOrbs>=p.orbs?'pointer':'not-allowed' }}>
                  🔮 {p.orbs}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ══ PERSONNAGES D'ÉVÉNEMENT ═════════════════════════════════════ */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:'2px', boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#fbbf24', letterSpacing:'2px' }}>PERSONNAGES D&apos;ÉVÉNEMENT</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', marginBottom:'14px' }}>
            Échange les pièces gagnées en combattant les boss d&apos;événement contre leur personnage exclusif.
          </div>
          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
            {EVENT_BOSSES.map(boss => {
              const tpl = getCharacterById(boss.characterId);
              if (!tpl) return null;
              const cfg   = RARITY_CONFIG[tpl.rarity];
              const coin  = getItemDef(boss.coinItemId);
              const owned = inventory[boss.coinItemId] ?? 0;
              const cost  = getEventCharacterCost(boss, eventCharacterPurchases[boss.id] ?? 0);
              const canBuy = owned >= cost;
              const isNew = !isCharacterOwned(collection, tpl.id);
              return (
                <div key={boss.id} style={{ background:`${cfg.color}0c`, border:`1px solid ${cfg.color}55`, borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
                  <div style={{ position:'relative' }}>
                    <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={64} height={88} />
                    {isNew && <NewBadge />}
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)', textAlign:'center' }}>{tpl.name}</span>
                  <RarityBadge rarity={tpl.rarity} />
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'12.4px', color: canBuy?'#fbbf24':'var(--text-muted)' }}>
                    {coin?.icon ?? '🪙'} {formatNumber(owned)} / {formatNumber(cost)}
                  </span>
                  <button onClick={() => buyEventCharacter(boss.id)} disabled={!canBuy}
                    style={{ width:'100%', padding:'8px', background:canBuy?'rgba(251,191,36,0.18)':'rgba(255,255,255,0.03)', border:`1px solid ${canBuy?'#fbbf2466':'var(--border)'}`, borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:canBuy?'#fbbf24':'var(--text-muted)', cursor:canBuy?'pointer':'not-allowed' }}>
                    ACHETER
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COFFRES D'ÉQUIPEMENT ─────────────────────────────────────── */}
        <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'4px', height:'18px', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:'2px', boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', fontWeight:700, color:'#fbbf24', letterSpacing:'2px' }}>COFFRES D&apos;ÉQUIPEMENT</span>
          </div>

          {chestResult && (() => {
            const item = getEquipmentDef(chestResult.itemId);
            if (!item) return null;
            return (
              <div style={{ marginBottom:'14px', padding:'12px 16px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'24.7px' }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'#4ade80' }}>Équipement obtenu !</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:item.color, fontWeight:700 }}>{item.name}</div>
                </div>
                <button onClick={() => setChestResult(null)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'16.5px' }}>✕</button>
              </div>
            );
          })()}

          <div className="shop-pack-grid-3" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
            {EQUIPMENT_CHESTS.map(chest => {
              const canBuy = nekoGems >= chest.gems;
              return (
                <div key={chest.id} style={{ background:`${chest.color}0a`, border:`1px solid ${chest.color}33`, borderRadius:'12px', padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'33px', filter:`drop-shadow(0 0 8px ${chest.glow})` }}>{chest.emoji}</span>
                  <span style={{ fontFamily:'var(--f-title)', fontSize:'12.4px', fontWeight:700, color:chest.color, letterSpacing:'1px', textAlign:'center' }}>{chest.label.toUpperCase()}</span>
                  <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:'2px', margin:'4px 0' }}>
                    {chest.dropRates.map(r => (
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:r.color, fontWeight:600 }}>{r.label}</span>
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)' }}>{r.pct}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const tier = chest.id.replace('chest_', '') as 'common' | 'rare' | 'epic';
                      const result = buyEquipmentChest(tier);
                      if (result) setChestResult({ itemId: result, tier: chest.id });
                    }}
                    disabled={!canBuy}
                    style={{
                      width:'100%', padding:'9px', borderRadius:'8px', cursor:canBuy?'pointer':'not-allowed',
                      background:canBuy?`${chest.color}22`:'rgba(255,255,255,0.03)',
                      border:`1px solid ${canBuy?chest.color+'66':'var(--border)'}`,
                      fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px',
                      color:canBuy?chest.color:'var(--text-muted)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                    }}>
                    💎 {chest.gems.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Solde gemmes (rappel) */}
        <div style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:'10px', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
          <span style={{ fontSize:'18.5px' }}>💎</span>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'15.5px', color:'var(--cyan)' }}>{formatNumber(nekoGems)}</span>
          <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>Neko-Gemmes — utilisables dans l&apos;onglet GACHA</span>
        </div>

      </div>
    </div>
  );
}
