'use client';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useGameStore, getGoldChestMultiplier } from '@/store/gameStore';
import { PageScroll } from '@/components/ui/Page';
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
import { getEquipmentDef, getItemDef, rollEquipmentChest, ChestTier } from '@/lib/game/items';
import { LootReelPopup, LootReelItem, buildReel } from '@/components/ui/LootReelPopup';
import { RAID_BOSSES, getRaidCharacterCost } from '@/lib/game/raidBoss';
import { useNow } from '@/hooks/useNow';

export function isCharacterOwned(collection: Record<string, unknown>, templateId: string): boolean {
  return !!collection[templateId];
}

// Couleurs de la boutique : violet (identité), cyan (gemmes), doré (or /
// BossCrowns), vert (actions positives), violet clair (Orbes du Néant).
const C = {
  violet: '#a78bfa',
  cyan:   '#22d3ee',
  gold:   '#fbbf24',
  green:  '#4ade80',
  orb:    '#c084fc',
};

function NewBadge() {
  return (
    <span style={{ position:'absolute', top:-7, right:-7, background:C.green, color:'#052e12', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14, letterSpacing:0.3, padding:'2px 7px', borderRadius:999, boxShadow:'0 0 8px rgba(74,222,128,0.5)', zIndex:30 }}>
      NEW
    </span>
  );
}

// Roue façon lootbox à l'ouverture d'un coffre : les éléments de remplissage
// sont tirés avec les mêmes taux que le coffre, pour que la bande reflète ses
// vraies chances (l'objet gagnant est déjà tiré et crédité par le store).
function equipReelItem(itemId: string): LootReelItem {
  const def = getEquipmentDef(itemId);
  return { icon: def?.icon ?? '❔', label: def?.name ?? itemId, color: def?.color ?? '#9ca3af' };
}

function ChestReelPopup({ itemId, tier, onClose }: { itemId: string; tier: ChestTier; onClose: () => void }) {
  const [reel] = useState(() => buildReel(itemId, () => rollEquipmentChest(tier)).map(equipReelItem));
  const item = getEquipmentDef(itemId);
  return (
    <LootReelPopup
      reel={reel}
      revealedTitle="ÉQUIPEMENT OBTENU"
      onClose={onClose}
      revealed={(
        <div style={{ fontFamily:'var(--f-title)', fontSize:22.6, fontWeight:900, color:item?.color ?? '#fbbf24', display:'flex', alignItems:'center', gap:8 }}>
          <span>{item?.icon}</span>{item?.name ?? itemId}
        </div>
      )}
    />
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

// Préférence locale (par appareil) : afficher ou non la confirmation avant de
// reroll une boutique contenant un personnage pas encore possédé.
const REROLL_CONFIRM_PREF_KEY = 'gachaverse_shop_reroll_confirm';

function readRerollConfirmPref(): boolean {
  try { return localStorage.getItem(REROLL_CONFIRM_PREF_KEY) !== '0'; } catch { return true; }
}

function writeRerollConfirmPref(enabled: boolean) {
  try { localStorage.setItem(REROLL_CONFIRM_PREF_KEY, enabled ? '1' : '0'); } catch {}
}

/** Interrupteur on/off compact (zone tactile ≥ 44px de haut). */
function ToggleSwitch({ checked, onChange, label, color }: { checked: boolean; onChange: (v: boolean) => void; label: string; color: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{ display:'inline-flex', alignItems:'center', gap:8, minHeight:44, padding:'0 4px', background:'none', border:'none', cursor:'pointer', color:'var(--text-sub)', fontFamily:'var(--f-ui)', fontSize:14.4, fontWeight:600, textAlign:'left' }}>
      <span style={{ position:'relative', flexShrink:0, width:38, height:22, borderRadius:999, background: checked ? color : 'rgba(255,255,255,0.12)', border:`1px solid ${checked ? color : 'rgba(255,255,255,0.2)'}`, transition:'background 0.15s' }}>
        <span style={{ position:'absolute', top:2, left: checked ? 18 : 2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s' }} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

// ─── Briques visuelles ─────────────────────────────────────────────────────

/** Bloc de section : bordure fine teintée par la couleur de la section, titre + slot droit. */
function ShopSection({ icon, title, accent, subtitle, right, children, style }: {
  icon: string; title: string; accent: string; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties;
}) {
  return (
    <section className="shop-section" style={{ ['--acc' as string]: accent, ...style }}>
      <div className="shop-section__head">
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth: 0 }}>
          <span className="shop-section__icon">{icon}</span>
          <div style={{ minWidth: 0 }}>
            <div className="shop-section__title">{title}</div>
            {subtitle && <div className="shop-section__sub">{subtitle}</div>}
          </div>
        </div>
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      </div>
      {children}
    </section>
  );
}

/** Bouton d'achat : couleur de la monnaie quand il est utilisable, grisé sinon. */
function BuyButton({ color, enabled, onClick, children, style }: {
  color: string; enabled: boolean; onClick: () => void; children: ReactNode; style?: CSSProperties;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!enabled} className="shop-buy"
      style={{ ['--acc' as string]: color, ...style }}>
      {children}
    </button>
  );
}

/** Encart de solde compact (en-tête de page). */
function Balance({ icon, value, label, hint, color }: { icon: string; value: string; label: string; hint: string; color: string }) {
  return (
    <div className="shop-balance" style={{ ['--acc' as string]: color }}>
      <span className="shop-balance__icon">{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className="shop-balance__label">TON SOLDE · {label}</div>
        <div style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:24, lineHeight:1.15, color }}>{value}</div>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', lineHeight:1.3 }}>{hint}</div>
      </div>
    </div>
  );
}

/** Carte de pack (gemmes, or) : icône, valeur, lignes d'info, bouton. */
function PackCard({ icon, value, valueColor, lines, bonus, featured, accent, button }: {
  icon: string; value: string; valueColor: string; lines?: ReactNode; bonus?: string; featured?: boolean; accent: string; button: ReactNode;
}) {
  return (
    <div className={`shop-pack${featured ? ' shop-pack--featured' : ''}`} style={{ ['--acc' as string]: accent }}>
      {bonus && <span className="shop-pack__bonus">{bonus}</span>}
      <span className="shop-pack__icon">{icon}</span>
      <span className="shop-pack__value" style={{ color:valueColor }}>{value}</span>
      {/* Ligne d'info toujours réservée (même vide) : cartes et boutons alignés d'une section à l'autre. */}
      <div className="shop-pack__lines">{lines}</div>
      <div className="shop-pack__buy">{button}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function ShopPage() {
  const {
    nekoGems, bossCrowns, voidOrbs, palier, inventory, goldUpgradeLevel, collection,
    dpsBoostEndsAt, goldBoostEndsAt, isDpsBoostActive, isGoldBoostActive,
    buyDpsBoost, buyGoldBoost, buyGemsWithCrowns, buyGoldWithGems,
    dailyShop, ensureDailyShop, buyShopCharacter, rerollDailyShop, buyGemsWithOrbs, buyEquipmentChest,
    starterPackClaimed, isStarterPackAvailable, claimStarterPack, buyRaidCharacter,
    raidCharacterPurchases,
  } = useGameStore();
  const { getMaxActiveExpeditions, getExpeditionSlotCost, upgradeExpeditionSlot } = useGameStore();

  const now = useNow();
  const [chestResult, setChestResult] = useState<{ itemId: string; tier: ChestTier } | null>(null);
  const [starterResult, setStarterResult] = useState<{ templateId: string; edition: CardEdition } | null>(null);
  const [showRerollConfirm, setShowRerollConfirm] = useState(false);
  const [rerollConfirmEnabled, setRerollConfirmEnabled] = useState(true);
  useEffect(() => {
    ensureDailyShop();
  }, [ensureDailyShop]);
  // Lu après le montage pour éviter un écart d'hydratation serveur/client.
  useEffect(() => {
    setRerollConfirmEnabled(readRerollConfirmPref());
  }, []);
  const toggleRerollConfirm = (enabled: boolean) => {
    setRerollConfirmEnabled(enabled);
    writeRerollConfirmPref(enabled);
  };

  const dpsActive  = isDpsBoostActive();
  const goldActive = isGoldBoostActive();
  const starterAvailable = isStarterPackAvailable();
  const starterTimeLeft  = (LAUNCH_TIMESTAMP + STARTER_PACK_WINDOW_MS) - now;

  const maxActive = getMaxActiveExpeditions();
  const slotCost  = getExpeditionSlotCost();
  const slotMaxed = slotCost === null;
  const canAffordSlot = !slotMaxed && bossCrowns >= slotCost;

  const rerollCost = getRerollShopCost();
  const canReroll = voidOrbs >= rerollCost;
  const hasUnclaimedNewCard = dailyShop.characterIds.some(
    id => !dailyShop.purchased.includes(id) && !isCharacterOwned(collection, id)
  );
  const handleRerollClick = () => {
    if (hasUnclaimedNewCard && rerollConfirmEnabled) setShowRerollConfirm(true);
    else rerollDailyShop();
  };

  // Pack mis en avant visuellement : celui qui a le plus gros bonus (dernier de la liste).
  const featuredCrownPack = CROWN_GEM_PACKS[CROWN_GEM_PACKS.length - 1]?.id;
  const featuredOrbPack   = ORB_GEM_PACKS[ORB_GEM_PACKS.length - 1]?.id;

  return (
    <PageScroll>
      <div className="shop-page">

        {/* ══ TITRE + SOLDES ══════════════════════════════════════════════ */}
        <header className="shop-hero">
          <div style={{ minWidth: 0 }}>
            <div className="shop-hero__title">BOUTIQUE</div>
            <div className="shop-hero__sub">Boosts, gemmes, or, personnages et coffres d&apos;équipement.</div>
          </div>
          <div className="shop-hero__balances">
            <Balance icon="👑" value={formatNumber(bossCrowns)} label="BossCrowns" hint="+1 👑 à chaque boss vaincu" color={C.gold} />
            <Balance icon="🔮" value={formatNumber(voidOrbs)} label="Orbes du Néant" hint="Obtenues en recyclant les doublons d'un perso Prismatique" color={C.orb} />
          </div>
        </header>

        {/* ── Pack de démarrage Early Access ── */}
        {starterAvailable && (
          <div className="shop-starter">
            <div style={{ flex:'1 1 280px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
                <span style={{ fontFamily:'var(--f-title)', fontSize:20, fontWeight:700, color:'#e9d5ff', letterSpacing:1 }}>✦ PACK DE BIENVENUE ✦</span>
                <span className="shop-chip" style={{ ['--acc' as string]: C.orb }}>⏳ Expire dans {formatDuration(starterTimeLeft)}</span>
              </div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:15.4, color:'var(--text-sub)' }}>
                Offre limitée aux 24 premières heures du jeu. Gratuit, juste pour toi !
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {[
                { icon:'💎', val:STARTER_PACK_REWARDS.gems,       label:'Gemmes' },
                { icon:'✦',  val:STARTER_PACK_REWARDS.stellaire,  label:'Perso. Stellaire aléatoire' },
              ].map(r => (
                <div key={r.label} className="shop-starter__reward">
                  <span style={{ fontSize:22 }}>{r.icon}</span>
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:19, color:'#fff' }}>{r.val}</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textAlign:'center' }}>{r.label}</span>
                </div>
              ))}
            </div>
            <BuyButton color={C.green} enabled onClick={() => {
                const result = claimStarterPack();
                if (result) setStarterResult(result);
              }}
              style={{ flex:'0 0 auto', padding:'12px 22px', fontSize:16.5 }}>
              RÉCLAMER GRATUITEMENT
            </BuyButton>
          </div>
        )}
        {starterResult && (() => {
          const tpl = getCharacterById(starterResult.templateId);
          if (!tpl) return null;
          return (
            <div className="shop-notice" style={{ ['--acc' as string]: C.green, justifyContent:'flex-start', gap:14 }}>
              <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} edition={starterResult.edition} width={56} height={78} frameOverlay />
              <div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:15.4, color:C.green, marginBottom:4 }}>Personnage obtenu !</div>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:17.5, color:'#fff', marginBottom:4 }}>{tpl.name}</div>
                <RarityBadge rarity={tpl.rarity} size="xs" />
              </div>
              <button type="button" onClick={() => setStarterResult(null)} style={{ marginLeft:'auto', alignSelf:'flex-start', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18.5 }}>✕</button>
            </div>
          );
        })()}
        {starterPackClaimed && !starterResult && (
          <div className="shop-notice" style={{ ['--acc' as string]: C.green, padding:'8px 16px' }}>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:14.4, color:C.green }}>✓ Pack de bienvenue déjà réclamé</span>
          </div>
        )}

        {/* ══ EMPLACEMENTS D'EXPÉDITION (barre pleine largeur) ═════════════ */}
        <div className={`shop-bar shop-bar--standalone${slotMaxed ? ' shop-bar--maxed' : ''}`}>
          <span className="shop-section__icon" style={{ ['--acc' as string]: C.gold }}>🧭</span>
          <div style={{ flex:'1 1 200px', minWidth:0 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16.4, color:'var(--text)' }}>Emplacements d&apos;Expédition</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14.4, color:'var(--text-dim)' }}>
              Lance {maxActive} expédition{maxActive>1?'s':''} en simultané{slotMaxed ? ' — MAXIMUM ATTEINT' : ''}
            </div>
          </div>
          {slotMaxed
            ? <span className="shop-chip" style={{ ['--acc' as string]: C.green }}>✓ MAX</span>
            : <BuyButton color={C.gold} enabled={canAffordSlot} onClick={upgradeExpeditionSlot} style={{ width:'auto', marginLeft:'auto', padding:'9px 16px' }}>
                +1 EMPLACEMENT · 👑{slotCost}
              </BuyButton>
          }
        </div>

        {/* ══ BOSSCROWNS : BOOSTS | GEMMES ════════════════════════════════ */}
        <div className="shop-row">
          <ShopSection icon="⚡" title="BOOSTS TEMPORAIRES" accent={C.gold} subtitle="Payés en BossCrowns 👑">
            <div className="shop-grid-2 shop-fill">
              {[
                { key:'dps' as const, icon:'⚡', label:'Boost DPS', active:dpsActive, endsAt:dpsBoostEndsAt, buy:buyDpsBoost },
                { key:'gold' as const, icon:'💰', label:'Boost Or', active:goldActive, endsAt:goldBoostEndsAt, buy:buyGoldBoost },
              ].map(b => (
                <div key={b.key} className={`shop-boost${b.active ? ' shop-boost--active' : ''}`}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span className="shop-boost__icon">{b.icon}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{b.label}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:14.4, color:'var(--text-dim)' }}>
                        +{Math.round((BOOST_MULTIPLIER-1)*100)}% pendant {BOOST_DURATION_MS/60000} min
                      </div>
                    </div>
                  </div>
                  <div style={{ minHeight:18, fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14.4, color:C.green }}>
                    {b.active && <>✓ ACTIF — {formatDuration(b.endsAt - now)} restant</>}
                  </div>
                  <BuyButton color={C.green} enabled={bossCrowns >= BOOST_COST_CROWNS} onClick={b.buy}>
                    {b.active ? 'PROLONGER' : 'ACTIVER'} · 👑{BOOST_COST_CROWNS}
                  </BuyButton>
                </div>
              ))}
            </div>
          </ShopSection>

          <ShopSection icon="👑" title="GEMMES CONTRE BOSSCROWNS" accent={C.cyan} subtitle="Échange tes BossCrowns 👑 contre des gemmes 💎">
            <div className="shop-grid-3 shop-fill">
              {CROWN_GEM_PACKS.map(p => (
                <PackCard key={p.id} icon="💎" value={String(p.gems)} valueColor={C.cyan} accent={C.cyan}
                  bonus={p.bonusLabel} featured={p.id === featuredCrownPack}
                  button={
                    <BuyButton color={C.gold} enabled={bossCrowns >= p.crowns} onClick={() => buyGemsWithCrowns(p.id)}>
                      👑 {p.crowns}
                    </BuyButton>
                  } />
              ))}
            </div>
          </ShopSection>
        </div>

        {/* ══ OR (GEMMES) | GEMMES (ORBES) ═════════════════════════════════ */}
        <div className="shop-row">
          <ShopSection icon="💰" title="ACHATS EN GEMMES" accent={C.gold} subtitle="De l'or 💰 contre tes gemmes 💎">
            <div className="shop-grid-3 shop-fill">
              {GEM_GOLD_PACKS.map(p => {
                // Valeur alignée sur la courbe organique (voir getGoldPackCoins) :
                // le pack vaut toujours l'équivalent de killsEquivalent kills au
                // palier courant (Coffre d'Or inclus), jamais un multiplicateur
                // déconnecté de l'économie.
                const scaledCoins = getGoldPackCoins(p, palier, getGoldChestMultiplier(goldUpgradeLevel ?? 0));
                return (
                  <PackCard key={p.id} icon="💰" value={`${formatNumber(scaledCoins)} or`} valueColor={C.gold} accent={C.gold}
                    bonus={p.bonusLabel}
                    lines={<span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-dim)' }}>≈ {p.killsEquivalent} kills</span>}
                    button={
                      <BuyButton color={C.cyan} enabled={nekoGems >= p.gems} onClick={() => buyGoldWithGems(p.id)}>
                        💎 {p.gems}
                      </BuyButton>
                    } />
                );
              })}
            </div>
          </ShopSection>

          <ShopSection icon="🔮" title="GEMMES CONTRE ORBES" accent={C.orb} subtitle="Échange tes Orbes du Néant 🔮 contre des gemmes 💎">
            <div className="shop-grid-3 shop-fill">
              {ORB_GEM_PACKS.map(p => (
                <PackCard key={p.id} icon="💎" value={String(p.gems)} valueColor={C.cyan} accent={C.orb}
                  bonus={p.bonusLabel} featured={p.id === featuredOrbPack}
                  button={
                    <BuyButton color={C.orb} enabled={voidOrbs >= p.orbs} onClick={() => buyGemsWithOrbs(p.id)}>
                      🔮 {p.orbs}
                    </BuyButton>
                  } />
              ))}
            </div>
          </ShopSection>
        </div>

        {/* ══ BOUTIQUE DU JOUR ════════════════════════════════════════════ */}
        <ShopSection icon="🛒" title="BOUTIQUE DU JOUR" accent={C.orb}
          subtitle={<>⏳ Renouvellement dans <b style={{ color:'var(--text-sub)', fontFamily:'var(--f-num)', fontSize:14 }}>{formatDuration(msUntilNextMidnight())}</b></>}
          right={
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'flex-end', gap:'4px 12px' }}>
              <ToggleSwitch checked={rerollConfirmEnabled} onChange={toggleRerollConfirm} color={C.orb}
                label="Alerte perso inédit" />
              <BuyButton color={C.orb} enabled={canReroll} onClick={handleRerollClick} style={{ width:'auto', padding:'9px 16px' }}>
                🎲 REROLL LA BOUTIQUE · 🔮 {rerollCost}
              </BuyButton>
            </div>
          }>
          <div className="shop-grid-3">
            {dailyShop.characterIds.map(id => {
              const tpl = getCharacterById(id);
              if (!tpl) return null;
              const cfg     = RARITY_CONFIG[tpl.rarity];
              const price   = SHOP_CHAR_PRICE_ORBS[tpl.rarity];
              const bought  = dailyShop.purchased.includes(id);
              const canBuy  = !bought && voidOrbs >= price;
              const isNew   = !isCharacterOwned(collection, tpl.id);
              return (
                <div key={id} className={`shop-char${bought ? ' shop-char--bought' : ''}`} style={{ ['--rar' as string]: cfg.color }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={112} height={154} frameOverlay />
                    {isNew && <NewBadge />}
                  </div>
                  <div className="shop-char__info">
                    <RarityBadge rarity={tpl.rarity} />
                    <span className="shop-char__name">{tpl.name}</span>
                    <div style={{ flex:1 }} />
                    <div className="shop-char__price">
                      <span className="shop-balance__label">PRIX</span>
                      <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:20, color:bought ? C.green : C.orb }}>🔮 {price}</span>
                    </div>
                    <BuyButton color={bought ? C.green : C.orb} enabled={canBuy} onClick={() => buyShopCharacter(dailyShop.characterIds.indexOf(id))}
                      style={bought ? { opacity:1, color:C.green, borderColor:'rgba(74,222,128,0.4)', background:'rgba(74,222,128,0.1)' } : undefined}>
                      {bought ? '✓ ACHETÉ' : 'ACHETER'}
                    </BuyButton>
                  </div>
                </div>
              );
            })}
          </div>
        </ShopSection>

        {showRerollConfirm && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setShowRerollConfirm(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-panel)', border:'1px solid rgba(192,132,252,0.4)', borderRadius:14, padding:'22px 24px', maxWidth:360, width:'90%', boxShadow:'0 12px 40px rgba(0,0,0,0.6)' }}>
              <div style={{ fontFamily:'var(--f-title)', fontSize:17.5, fontWeight:700, color:'#e9d5ff', marginBottom:10 }}>⚠️ Personnage inédit en boutique</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:15.4, color:'var(--text-sub)', marginBottom:18, lineHeight:1.5 }}>
                La boutique du jour contient un personnage que tu ne possèdes pas encore. Reroll la boutique risque de le faire disparaître. Confirmer ?
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={() => setShowRerollConfirm(false)} className="shop-buy" style={{ ['--acc' as string]: '#9384bc' }}>
                  Annuler
                </button>
                <button type="button" onClick={() => { rerollDailyShop(); setShowRerollConfirm(false); }} className="shop-buy" style={{ ['--acc' as string]: C.orb }}>
                  Reroll quand même
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ PERSONNAGES DE RAID ════════════════════════════════════════ */}
        <ShopSection icon="⚔️" title="PERSONNAGES DE RAID" accent={C.gold}
          subtitle="Échange les pièces gagnées en combattant les boss de raid contre leur personnage exclusif.">
          <div className="shop-grid-raid">
            {RAID_BOSSES.map(boss => {
              const tpl = getCharacterById(boss.characterId);
              if (!tpl) return null;
              const cfg   = RARITY_CONFIG[tpl.rarity];
              const coin  = getItemDef(boss.coinItemId);
              const owned = inventory[boss.coinItemId] ?? 0;
              const cost  = getRaidCharacterCost(boss, raidCharacterPurchases[boss.id] ?? 0);
              const canBuy = owned >= cost;
              const isNew = !isCharacterOwned(collection, tpl.id);
              return (
                <div key={boss.id} className="shop-char" style={{ ['--rar' as string]: cfg.color }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={96} height={132} frameOverlay />
                    {isNew && <NewBadge />}
                  </div>
                  <div className="shop-char__info">
                    <RarityBadge rarity={tpl.rarity} />
                    <span className="shop-char__name">{tpl.name}</span>
                    <div style={{ flex:1 }} />
                    <div className="shop-char__price">
                      <span className="shop-balance__label">PIÈCES</span>
                      <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:15, color: canBuy ? C.gold : 'var(--text-dim)' }}>
                        {coin?.icon ?? '🪙'} {formatNumber(owned)} / {formatNumber(cost)}
                      </span>
                    </div>
                    <BuyButton color={C.gold} enabled={canBuy} onClick={() => buyRaidCharacter(boss.id)}>
                      ACHETER
                    </BuyButton>
                  </div>
                </div>
              );
            })}
          </div>
        </ShopSection>

        {/* ══ COFFRES D'ÉQUIPEMENT : coffres | comparaison des chances ═══ */}
        <ShopSection icon="📦" title="COFFRES D'ÉQUIPEMENT" accent={C.gold} subtitle="Un équipement aléatoire par coffre, selon les chances du tableau.">
          {chestResult && <ChestReelPopup itemId={chestResult.itemId} tier={chestResult.tier} onClose={() => setChestResult(null)} />}
          <div className="shop-chests">
            <div className="shop-chest-list">
              {EQUIPMENT_CHESTS.map(chest => {
                const canBuy = nekoGems >= chest.gems && !chestResult;
                return (
                  <div key={chest.id} className="shop-chest" style={{ ['--acc' as string]: chest.color }}>
                    <span className="shop-chest__icon" style={{ filter:`drop-shadow(0 0 8px ${chest.glow})` }}>{chest.emoji}</span>
                    <span style={{ flex:1, minWidth:0, fontFamily:'var(--f-title)', fontSize:16, fontWeight:700, color:chest.color, letterSpacing:1 }}>{chest.label.toUpperCase()}</span>
                    <BuyButton color={C.cyan} enabled={canBuy} style={{ width:'auto', minWidth:110 }} onClick={() => {
                        const tier = chest.id.replace('chest_', '') as ChestTier;
                        const result = buyEquipmentChest(tier);
                        if (result) setChestResult({ itemId: result, tier });
                      }}>
                      💎 {chest.gems.toLocaleString()}
                    </BuyButton>
                  </div>
                );
              })}
            </div>

            {/* Comparaison des chances : une ligne par rareté, une colonne par coffre. */}
            <div className="shop-rates">
              <div className="shop-rates__row shop-rates__row--head" style={{ gridTemplateColumns:`1.2fr repeat(${EQUIPMENT_CHESTS.length}, 1fr)` }}>
                <span>RARETÉ</span>
                {EQUIPMENT_CHESTS.map(chest => <span key={chest.id} style={{ color:chest.color, textAlign:'right' }}>{chest.label.toUpperCase()}</span>)}
              </div>
              {EQUIPMENT_CHESTS[0]?.dropRates.map((r, i) => (
                <div key={r.label} className="shop-rates__row" style={{ gridTemplateColumns:`1.2fr repeat(${EQUIPMENT_CHESTS.length}, 1fr)` }}>
                  <span style={{ color:r.color, fontWeight:700 }}>{r.label}</span>
                  {EQUIPMENT_CHESTS.map(chest => {
                    const pct = chest.dropRates[i]?.pct ?? '';
                    return (
                      <span key={chest.id} style={{ textAlign:'right', fontFamily:'var(--f-num)', fontSize:14, color: parseFloat(pct) > 0 ? 'var(--text-sub)' : 'var(--text-muted)' }}>
                        {pct}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ShopSection>

        {/* Solde gemmes (rappel) */}
        <div className="shop-notice" style={{ ['--acc' as string]: C.cyan }}>
          <span style={{ fontSize:19 }}>💎</span>
          <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:16.5, color:C.cyan }}>{formatNumber(nekoGems)}</span>
          <span style={{ fontFamily:'var(--f-ui)', fontSize:14.4, color:'var(--text-dim)' }}>Neko-Gemmes — utilisables dans l&apos;onglet GACHA</span>
        </div>

      </div>
    </PageScroll>
  );
}
