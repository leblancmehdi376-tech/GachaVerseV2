'use client';
import { useState, useEffect } from 'react';
import { useGameStore, getGoldChestCost, getGoldChestMultiplier } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { levelUpCost, evoCost, canEvolve, calcCharDps, evoStoneCost } from '@/lib/game/formulas';
import { RARITY_CONFIG, EVOLUTION_STONE_ITEM_ID } from '@/types/game';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { getItemDef, ITEM_DEFS } from '@/lib/game/items';
import { getPalierDrop, EXPEDITION_DEFS } from '@/lib/game/expeditions';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { parseInstanceKey } from '@/lib/game/editions';
import { getAffinityForId } from '@/lib/game/affinities';
import { CollectionFilters, type CollectionAffinityMode, type CollectionFilterMode, type CollectionSortMode } from '@/components/ui/CollectionFilters';
import { BN_ZERO, bnCompare, bnGte, bnLt, bnToNumber } from '@/lib/game/bignum';

const RARITY_PRIORITY: Record<string, number> = {
  T: 0, P: 1, CO: 2, S: 3, M: 4, L: 5, E: 6, R: 7, U: 8, C: 9,
};

// ── Helpers ───────────────────────────────────────────────────────────────
function SectionHead({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
      <div style={{ width:4, height:18, background:`linear-gradient(180deg,${color},${color}66)`, borderRadius:2, boxShadow:`0 0 8px ${color}` }} />
      <span style={{ fontFamily:'var(--f-title)', fontSize:13.4, fontWeight:700, color, letterSpacing:2 }}>{children}</span>
    </div>
  );
}

// Le niveau n'est plus plafonné : la barre montre juste la progression vers
// le prochain palier de multiplicateur (tous les 100 niveaux).
export function levelBarProgress(level: number): { pct: number; nextTier: number } {
  const nextTier = (Math.floor(level / 100) + 1) * 100;
  const pct = ((level % 100) / 100) * 100;
  return { pct, nextTier };
}

function LevelBar({ level, color }: { level: number; color: string }) {
  const { pct, nextTier } = levelBarProgress(level);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:3, boxShadow:`0 0 5px ${color}66`, transition:'width 0.3s' }} />
      </div>
      <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color, whiteSpace:'nowrap' }}>Niv.{level}<span style={{ color:'rgba(255,255,255,0.25)', fontWeight:400 }}>/{nextTier}</span></span>
    </div>
  );
}

// ── Carte : Coffre d'Or (un niveau débloqué par palier atteint) ──────────
// Bonus = ×1.2^niveau (formule fixe), coût = 6000 × 1.13^niveau (même taux
// que la progression naturelle des golds par palier). Le niveau achetable
// max suit le palier max atteint DEPUIS LE DERNIER PRESTIGE (pas le lifetime
// maxPalierReached, qui ne redescend jamais) — pas de plafond fixe, il
// grandit avec la progression du joueur dans le run en cours.
function GoldUpgradeCard() {
  const { goldUpgradeLevel, upgradeGold, pixelCoins, getGoldMultiplier, getRunPeakPalier } = useGameStore();
  const level      = goldUpgradeLevel ?? 0;
  const maxLevel   = getRunPeakPalier();
  const mult       = getGoldMultiplier();
  const locked     = level >= maxLevel;
  const nextCost   = getGoldChestCost(level);
  const nextPct    = Math.round((bnToNumber(getGoldChestMultiplier(level + 1)) - 1) * 100);
  const canAfford  = !locked && bnGte(pixelCoins, nextCost);

  return (
    <div className="panel" style={{ borderColor:canAfford?'#4ade80':'var(--border)', padding:16, transition:'all 0.2s', boxShadow:canAfford?'0 0 24px rgba(74,222,128,0.14)':'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:13.4, color:'#4ade80', marginBottom:8 }}>🪙 COFFRE D&apos;OR</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginBottom:8, lineHeight:1.6 }}>Augmente les coins obtenus par ennemi vaincu. Chaque palier atteint débloque un niveau supplémentaire.</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>Bonus actuel :</span>
            <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:16.5, color:'#4ade80' }}>×{formatNumber(mult)}</span>
          </div>
        </div>
        <div style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:8, padding:'8px 14px', textAlign:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(74,222,128,0.6)', display:'block', letterSpacing:1 }}>NIV.</span>
          <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:26.8, color:'#4ade80', lineHeight:1 }}>{level}/{maxLevel}</span>
        </div>
      </div>

      {locked ? (
        <div style={{ padding:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:8, textAlign:'center', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:'var(--text-dim)' }}>
          🔒 Prochain niveau débloqué au palier {level + 1}
        </div>
      ) : (
        <button onClick={() => upgradeGold()} disabled={!canAfford} className={canAfford?'btn-primary':'btn-secondary'}
          style={{ width:'100%', padding:'10px', fontSize:13.4, display:'flex', alignItems:'center', justifyContent:'center', gap:10, background:canAfford?undefined:'rgba(255,255,255,0.03)' }}>
          <span>AMÉLIORER → +{nextPct}%</span>
          <span style={{ fontFamily:'var(--f-num)', color:'#4ade80' }}>{formatNumber(nextCost)} 🪙</span>
        </button>
      )}
    </div>
  );
}

// ── Carte personnage avec PP ──────────────────────────────────────────────
function CharCard({ templateId }: { templateId: string }) {
  const { collection, pixelCoins, levelUpCharacter, evolveCharacter, inventory, focusExpedition, expeditionDropInventory: dropInventory } = useGameStore();
  const owned = collection[templateId];
  const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/nom partagés entre éditions)
  const tpl   = getCharacterById(pureId);
  if (!owned || !tpl) return null;
  const canEvo_  = canEvolve(tpl, owned, inventory, dropInventory);
  const lvCost   = levelUpCost(owned.level);
  const evoCostV = evoCost(tpl.rarity, owned.currentForm);
  const canAffordLv  = bnGte(pixelCoins, lvCost);
  const canAffordEvo = bnGte(pixelCoins, evoCostV);
  const dps      = calcCharDps(tpl, owned);
  const cfg      = RARITY_CONFIG[tpl.rarity];
  const nextForm = tpl.forms?.[owned.currentForm + 1];
  const reqItems   = (nextForm?.requiredItemIds ?? []).map(id => getItemDef(id)).filter((d): d is NonNullable<typeof d> => !!d);
  const canEvolveAtAll = !!tpl.forms && owned.currentForm < tpl.forms.length - 1;
  const stonesNeeded = canEvolveAtAll && !tpl.noEvoStones ? evoStoneCost(tpl.rarity, owned.currentForm) : 0;
  const stonesHave   = dropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0;
  const hasStones    = stonesHave >= stonesNeeded;
  const evoStoneDrop = getPalierDrop(EVOLUTION_STONE_ITEM_ID);
  const evoStoneExpedition = EXPEDITION_DEFS.find(x => x.rewards.dropId === EVOLUTION_STONE_ITEM_ID);
  const name     = getCharFormName(tpl, owned.currentForm);
  const handleLevelUpX10 = () => { for (let i = 0; i < 10; i++) levelUpCharacter(templateId); };

  return (
    <div style={{ background:'linear-gradient(135deg,#0e0c1a,#130f22)', border:`1px solid ${cfg.color}33`, borderRadius:12, padding:14, position:'relative', overflow:'hidden', boxShadow:`0 0 14px ${cfg.glow}0d` }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:`linear-gradient(180deg,${cfg.color},${cfg.glow})`, boxShadow:`0 0 8px ${cfg.glow}` }} />
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', paddingLeft:8 }}>
        {/* Carte perso */}
        <div style={{ position:'relative', flexShrink:0 }}>
          <CharacterCardThumb templateId={pureId} formIndex={owned.currentForm} name={name} rarity={tpl.rarity} edition={owned.edition} width={64} height={88} />
          {tpl.forms && tpl.forms.length > 1 && (
            <div style={{ position:'absolute', bottom:-5, right:-5, background:cfg.color, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, border:'2px solid var(--bg-deep)', fontWeight:700, color:'#000' }}>{owned.currentForm+1}</div>
          )}
        </div>
        {/* Infos */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</span>
            <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:14.4, color:'var(--green)', flexShrink:0, marginLeft:8 }}>{formatNumber(dps)}/s</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <RarityBadge rarity={tpl.rarity} size="xs" />
            {tpl.universe && (
              <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', padding:'1px 6px', borderRadius:4 }}>{tpl.universe}</span>
            )}
          </div>
          <LevelBar level={owned.level} color={cfg.color} />
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            {tpl.forms && tpl.forms.length > 1 && (
              <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>
                Forme {owned.currentForm+1}/{tpl.forms.length}
              </span>
            )}
            <RankStars rank={owned.rank} />
          </div>
        </div>
      </div>
      {/* Boutons */}
      <div style={{ display:'flex', gap:8, marginTop:12, paddingLeft:8 }}>
        <button onClick={() => levelUpCharacter(templateId)} disabled={!canAffordLv}
          style={{ flex:1, padding:'8px 10px', background:canAffordLv?`${cfg.color}18`:'rgba(255,255,255,0.03)', border:`1px solid ${canAffordLv?cfg.color+'55':'var(--border)'}`, borderRadius:8, cursor:canAffordLv?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s' }}>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:canAffordLv?cfg.color:'var(--text-muted)' }}>⬆ LVL UP</span>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--gold)' }}>{formatNumber(lvCost)} 🪙</span>
        </button>
        <button onClick={handleLevelUpX10} disabled={!canAffordLv} title="Améliore jusqu'à 10 niveaux d'affilée"
          style={{ flexShrink:0, padding:'8px 10px', background:canAffordLv?`${cfg.color}18`:'rgba(255,255,255,0.03)', border:`1px solid ${canAffordLv?cfg.color+'55':'var(--border)'}`, borderRadius:8, cursor:canAffordLv?'pointer':'not-allowed', transition:'all 0.15s' }}>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:canAffordLv?cfg.color:'var(--text-muted)' }}> × 10 </span>
        </button>
      </div>
      {canEvolveAtAll && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8, paddingLeft:8 }}>
          {!canEvo_ && reqItems.length > 0 && (
            <div style={{ padding:'7px 10px', background:'rgba(168,85,247,0.08)', border:'1px solid rgba(168,85,247,0.25)', borderRadius:8, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#c084fc' }}>Requiert :</span>
              {reqItems.map(d => {
                const have = (inventory[d.id] ?? 0) >= 1;
                return (
                  <span key={d.id} style={{ fontFamily:'var(--f-ui)', fontSize:12, color: have ? '#4ade80' : '#c084fc', display:'flex', alignItems:'center', gap:4, opacity: have ? 0.7 : 1 }}>
                    <span style={{ fontSize:14.4 }}>{d.icon}</span><b>{d.name}</b>{have && <span>✓</span>}
                  </span>
                );
              })}
            </div>
          )}
          {!canEvo_ && !hasStones && (
            <div
              onClick={evoStoneExpedition ? () => focusExpedition(evoStoneExpedition.id) : undefined}
              style={{ padding:'7px 10px', background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.25)', borderRadius:8, display:'flex', alignItems:'center', gap:8, cursor:evoStoneExpedition?'pointer':'default', transition:'background 0.15s, border-color 0.15s' }}
              onMouseEnter={evoStoneExpedition ? e => { (e.currentTarget as HTMLElement).style.borderColor='var(--purple-glow)'; (e.currentTarget as HTMLElement).style.background='rgba(192,132,252,0.1)'; } : undefined}
              onMouseLeave={evoStoneExpedition ? e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(96,165,250,0.25)'; (e.currentTarget as HTMLElement).style.background='rgba(96,165,250,0.08)'; } : undefined}
            >
              <span style={{ fontSize:14.4 }}>{evoStoneDrop?.icon ?? '🔷'}</span>
              <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#60a5fa' }}>Pierres d&apos;Évolution : <b>{stonesHave}/{stonesNeeded}</b></span>
            </div>
          )}
          {canEvo_ && (
            <button onClick={() => evolveCharacter(templateId)} disabled={!canAffordEvo}
              style={{ padding:'8px 10px', background:canAffordEvo?'linear-gradient(135deg,#451a03,#78350f)':'rgba(255,255,255,0.03)', border:`1px solid ${canAffordEvo?'#d97706':'var(--border)'}`, borderRadius:8, cursor:canAffordEvo?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.15s', boxShadow:canAffordEvo?'0 0 12px rgba(217,119,6,0.3)':'none' }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12, color:canAffordEvo?'#fbbf24':'var(--text-muted)' }}>
                {reqItems.length > 0 ? `${reqItems.map(d => d.icon).join('')} ÉVOLUER` : '✦ ÉVOLUER'}
              </span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--gold)' }}>{formatNumber(evoCostV)} 🪙</span>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#60a5fa' }}>{stonesNeeded} {evoStoneDrop?.icon ?? '🔷'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────
export function UpgradesPage() {
  const { pixelCoins, nekoGems, getTotalDps, collection, equippedTeam, collectionFilter, collectionUniverse, collectionAffinity, collectionSort, setCollectionFilters, inventory, sellItem } = useGameStore();
  const equippedSet = new Set(equippedTeam.filter((id): id is string => !!id));
  const ownedItems = Object.entries(inventory).filter(([id, qty]) => qty > 0 && !ITEM_DEFS[id]?.isCoin);
  const ownedIds = Object.keys(collection).sort((a, b) => {
    const aRarity = getCharacterById(parseInstanceKey(a).templateId)?.rarity ?? 'C';
    const bRarity = getCharacterById(parseInstanceKey(b).templateId)?.rarity ?? 'C';
    return RARITY_PRIORITY[aRarity] - RARITY_PRIORITY[bRarity];
  });
  const [mounted, setMounted] = useState(false);
  const filter = collectionFilter as CollectionFilterMode;
  const universe = collectionUniverse as string | 'all';
  const affinity = collectionAffinity as CollectionAffinityMode;
  const sort = collectionSort as CollectionSortMode;
  const setFilter = (next: CollectionFilterMode) => setCollectionFilters({ filter: next });
  const setUniverse = (next: string | 'all') => setCollectionFilters({ universe: next });
  const setAffinity = (next: CollectionAffinityMode) => setCollectionFilters({ affinity: next });
  const setSort = (next: CollectionSortMode) => setCollectionFilters({ sort: next });
  const universeOptions = (Array.from(new Set(ownedIds.map(id => getCharacterById(parseInstanceKey(id).templateId)?.universe).filter(Boolean))) as string[]).sort();
  const filteredIds = ownedIds.filter(id => {
    const tpl = getCharacterById(parseInstanceKey(id).templateId);
    if (!tpl) return false;
    const matchesAffinity = affinity === 'all' ? true : getAffinityForId(tpl.id) === affinity;
    if (filter === 'all') return (universe === 'all' ? true : tpl.universe === universe) && matchesAffinity;
    if (filter === 'owned') return matchesAffinity;
    if (filter === 'missing') return false;
    if (universe !== 'all' && tpl.universe !== universe) return false;
    return tpl.rarity === filter && matchesAffinity;
  }).sort((a, b) => {
    // Personnages déjà équipés en priorité, avant tout autre critère de tri.
    const aEquipped = equippedSet.has(a);
    const bEquipped = equippedSet.has(b);
    if (aEquipped !== bEquipped) return aEquipped ? -1 : 1;

    const aTpl = getCharacterById(parseInstanceKey(a).templateId)!;
    const bTpl = getCharacterById(parseInstanceKey(b).templateId)!;
    const aOwned = collection[a];
    const bOwned = collection[b];
    if (sort === 'rarity') {
      return (RARITY_PRIORITY[aTpl.rarity] ?? 9) - (RARITY_PRIORITY[bTpl.rarity] ?? 9);
    }
    if (sort === 'dps_desc') return bnCompare(bOwned ? calcCharDps(bTpl, bOwned) : BN_ZERO, aOwned ? calcCharDps(aTpl, aOwned) : BN_ZERO);
    if (sort === 'dps_asc') return bnCompare(aOwned ? calcCharDps(aTpl, aOwned) : BN_ZERO, bOwned ? calcCharDps(bTpl, bOwned) : BN_ZERO);
    return aTpl.name.localeCompare(bTpl.name);
  });
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'20px 24px' }}>
      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:24 }}>

        {/* Stats */}
        <div className="upgrades-stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { label:'PIXEL-COINS', val:formatNumber(pixelCoins),    color:'var(--gold)',    icon:'🪙' },
            { label:'NEKO-GEMMES', val:formatNumber(nekoGems),      color:'var(--cyan-hi)', icon:'💎' },
            { label:'DPS',         val:formatNumber(getTotalDps()), color:'var(--green)',   icon:'🔥' },
          ].map(s=>(
            <div key={s.label} className="panel" style={{ padding:'16px 18px' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)', letterSpacing:1.5, marginBottom:8, display:'flex', gap:4 }}><span>{s.icon}</span><span>{s.label}</span></div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:22.7, color:s.color, lineHeight:1.05 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Améliorations générales */}
        <div>
          <SectionHead color="var(--gold)">AMÉLIORATIONS GÉNÉRALES</SectionHead>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12 }}>
            <GoldUpgradeCard />
          </div>
        </div>

        {/* Inventaire — objets d'évolution (consommés par le bouton ÉVOLUER
            des cartes alliés ci-dessous, voir requiredItemIds). */}
        {ownedItems.length > 0 && (
          <section className="companion-section">
            <div className="companion-section__header">
              <div className="companion-section__title">
                <span className="companion-section__decor" />
                Inventaire
              </div>
              <div className="companion-toast">{ownedItems.length} objets stockés</div>
            </div>

            <div className="companion-item-grid">
              {ownedItems.map(([itemId, qty]) => {
                const item = ITEM_DEFS[itemId];
                if (!item) return null;
                return (
                  <div
                    key={itemId}
                    className="companion-item-card"
                    style={{ borderColor: `${item.color}40`, background: `${item.color}11` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 26.8 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4, color: item.color }}>{item.name}</div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 900, fontSize: 15.5, color: 'var(--text)' }}>×{qty}</div>
                      </div>
                    </div>
                    {/* Boutons de vente */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => sellItem(itemId, 1)}
                        style={{
                          flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.35)',
                          background: 'rgba(251,191,36,0.08)', cursor: 'pointer',
                          fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: '#fbbf24',
                          lineHeight: 1.3, textAlign: 'center',
                        }}
                      >
                        VENDRE ×1<br />
                        <span style={{ fontWeight: 400, opacity: 0.8 }}>{formatNumber(item.sellGems)} 💎</span>
                      </button>
                      {qty > 1 && (
                        <button
                          onClick={() => sellItem(itemId, qty)}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.35)',
                            background: 'rgba(248,113,113,0.08)', cursor: 'pointer',
                            fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: '#f87171',
                            lineHeight: 1.3, textAlign: 'center',
                          }}
                        >
                          TOUT VENDRE<br />
                          <span style={{ fontWeight: 400, opacity: 0.8 }}>{formatNumber(item.sellGems * qty)} 💎</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Alliés */}
        {ownedIds.length > 0 && (
          <div>
            <SectionHead color="var(--cyan)">ALLIÉS ({ownedIds.length})</SectionHead>
            <CollectionFilters
              filter={filter}
              onFilterChange={setFilter}
              universe={universe}
              onUniverseChange={setUniverse}
              affinity={affinity}
              onAffinityChange={setAffinity}
              sort={sort}
              onSortChange={setSort}
              universes={universeOptions}
            />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {filteredIds.map(id => <CharCard key={id} templateId={id} />)}
            </div>
          </div>
        )}

        {ownedIds.length === 0 && (
          <div style={{ textAlign:'center', padding:48, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, opacity:0.6 }}>
            <div style={{ fontSize:41.2, marginBottom:12 }}>📭</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:13.4, color:'var(--text-dim)', lineHeight:1.7 }}>Aucun allié à améliorer<br/>Invoque des personnages dans GACHA !</div>
          </div>
        )}
      </div>
    </div>
  );
}
