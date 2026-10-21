'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { EditionBadge } from '@/components/ui/EditionBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getCharacterById } from '@/lib/game/characters';
import { getDynamicRates, getRateUpShare, RARITY_GATES, GACHA_BANNERS, DEFAULT_BANNER_ID, FEATURED_RATE_UP, getBanner, type BannerId, type BannerTheme } from '@/lib/game/gacha';
import { getFeaturedBanner, SPARK_COSTS } from '@/lib/game/featuredBanner';
import { msUntilNextDailyReset } from '@/lib/game/shop';
import { getCardBaseName, NEW_CARDS_ASSET_VERSION } from '@/lib/game/cardAssets';
import { useSpoilerStore, getSafeFormIndex } from '@/store/spoilerStore';
import { useNow } from '@/hooks/useNow';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { formatNumber, formatTimeLeft } from '@/lib/game/format';
import { PageScroll } from '@/components/ui/Page';
import { GachaRevealOverlay } from './gacha/GachaRevealOverlay';
import { SparkExchangeModal } from './gacha/SparkExchangeModal';
import type { Res } from './gacha/gachaTypes';

// Dernier volume de gacha sélectionné, mémorisé en local uniquement (pas
// dans la sauvegarde cloud) pour réatterrir dessus en revenant sur la page.
const BANNER_STORAGE_KEY = 'gv_gacha_banner';
const BANNER_IDS: BannerId[] = [...GACHA_BANNERS.map(b => b.id), 'featured'];
function loadBannerId(): BannerId {
  try {
    const saved = localStorage.getItem(BANNER_STORAGE_KEY);
    if (saved && BANNER_IDS.includes(saved as BannerId)) return saved as BannerId;
  } catch {}
  return DEFAULT_BANNER_ID;
}

// 1 Jeton d'Anomalie tous les 100 tirages gacha cumulés (voir gachaSlice.ts).
export function getPullsToNextToken(totalGachaPulls: number): { pullsInCycle: number; pullsToNextToken: number } {
  const pullsInCycle = (totalGachaPulls ?? 0) % 100;
  return { pullsInCycle, pullsToNextToken: 100 - pullsInCycle };
}

// Affichage adapté aux très petits taux (< 0.01% → plus de décimales).
export function formatDropRate(rate: number): string {
  return rate >= 0.01 ? `${rate.toFixed(3)}%` : rate > 0 ? `${rate.toFixed(5)}%` : '0%';
}

// Bouton de tirage : même style pour ×1/×10/×100, aux couleurs de la bannière.
// `highlight` met en avant l'offre la plus avantageuse. Sans assez de gemmes,
// le bouton reste cliquable (aria-disabled) pour déclencher `onInsufficient`.
function PullButton({ theme, count, cost, enabled, pulling, onClick, onInsufficient, discount, highlight }: {
  theme: BannerTheme; count: number; cost: number; enabled: boolean; pulling: boolean;
  onClick: () => void; onInsufficient: () => void; discount?: string; highlight?: boolean;
}) {
  return (
    <button className="gacha-pull-btn" onClick={enabled ? onClick : onInsufficient} disabled={pulling} aria-disabled={!enabled}
      style={{
        position:'relative', overflow:'hidden', borderRadius:12, padding:'16px 14px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        cursor:enabled&&!pulling?'pointer':'not-allowed', opacity:enabled?1:0.4, transition:'all 0.2s',
        background:enabled?`linear-gradient(160deg, ${theme.dark}, ${theme.deep}${highlight?'':'aa'})`:'var(--bg-card)',
        border:`1px solid ${enabled?(highlight?theme.accent:`${theme.accent}66`):'var(--border)'}`,
        boxShadow:enabled?`0 4px ${highlight?28:16}px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.07)`:'none',
      }}>
      {discount && (
        <div style={{ position:'absolute', top:0, right:0, background:theme.accent, color:'white', fontFamily:'var(--f-num)', fontWeight:900, fontSize:14, lineHeight:1.2, padding:'3px 7px', borderRadius:'0 11px 0 8px' }}>{discount}</div>
      )}
      <span style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, letterSpacing:2, color:enabled?theme.hi:'var(--text-muted)' }}>TIRAGE</span>
      <span style={{ fontFamily:'var(--f-num)', fontSize:28, fontWeight:900, lineHeight:1, color:enabled?'white':'var(--text-muted)', textShadow:enabled?`0 0 14px ${theme.accent}`:'none' }}>×{count}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.35)', border:`1px solid ${theme.accent}55`, borderRadius:8, padding:'5px 14px' }}>
        <span style={{ fontSize:16 }}>💎</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:20, color:enabled?theme.hi:'var(--text-muted)' }}>{cost}</span>
      </div>
    </button>
  );
}

export function GachaPage() {
  const { nekoGems, pullSingle, pullMulti, pullMulti100, collection, totalGachaPulls, anomalyTokens } = useGameStore(useShallow(s => ({ nekoGems: s.nekoGems, pullSingle: s.pullSingle, pullMulti: s.pullMulti, pullMulti100: s.pullMulti100, collection: s.collection, totalGachaPulls: s.totalGachaPulls, anomalyTokens: s.anomalyTokens })));
  const [results,     setResults]     = useState<Res[]>([]);
  const [pulling,     setPulling]     = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPool,    setShowPool]    = useState(false);
  const [bannerId,    setBannerIdState] = useState<BannerId>(loadBannerId);
  // Abonnement au store anti-spoil : la bannière se met à jour quand on coche un univers.
  useSpoilerStore(s => s.protectedUniverses);
  const setBannerId = (id: BannerId) => {
    setBannerIdState(id);
    try { localStorage.setItem(BANNER_STORAGE_KEY, id); } catch {}
  };
  // Incrémenté à chaque clic sans assez de gemmes : relance l'animation du compteur.
  const [gemShake,    setGemShake]    = useState(0);
  const onInsufficient = () => setGemShake(n => n + 1);
  // Bannière vedette : nouvel univers tiré chaque jour à 2h. Horloge à la
  // minute pour le compte à rebours et pour basculer si la page reste ouverte.
  const now = useNow(60_000);
  const featuredBanner = getFeaturedBanner();
  const featuredUniverse = featuredBanner.subtitle;
  const banners = [...GACHA_BANNERS, featuredBanner];
  const isFeatured = bannerId === 'featured';
  const banner = isFeatured ? featuredBanner : getBanner(bannerId);
  const theme  = banner.theme;
  const { gachaSparks, exchangeSparks } = useGameStore(useShallow(s => ({ gachaSparks: s.gachaSparks ?? 0, exchangeSparks: s.exchangeSparks })));
  const [showExchange, setShowExchange] = useState(false);
  // Repère de la jauge d'Étincelles : le prix d'un perso Stellaire.
  const sparkTarget = SPARK_COSTS.S;
  // Taux dynamiques calculés pour le palier max atteint DEPUIS LE DERNIER
  // PRESTIGE (pas le lifetime maxPalierReached, qui ne redescend jamais).
  const maxPalierReached = useGameStore(s => s.getRunPeakPalier());
  const currentRates = getDynamicRates(maxPalierReached, bannerId);
  // Coûts après réduction éventuelle des anomalies "Réduc. Coût Gacha".
  const costs = useGameStore(useShallow(s => s.getGachaCosts()));
  // Progression vers le prochain Jeton d'Anomalie (1 tous les 100 tirages cumulés).
  const { pullsInCycle, pullsToNextToken } = getPullsToNextToken(totalGachaPulls ?? 0);

  const canS    = nekoGems >= costs.single;
  const canM    = nekoGems >= costs.multi10;
  const canM100 = nekoGems >= costs.multi100;

  const doSingle = () => {
    if (!canS || pulling) return;
    setPulling(true);
    const res = pullSingle(bannerId);
    if (res) {
      const wasNew = !collection[res.templateId];
      setResults([{ templateId: res.templateId, isNew: wasNew, edition: res.edition }]);
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const doMulti = () => {
    if (!canM || pulling) return;
    setPulling(true);
    const results = pullMulti(bannerId);
    if (results) {
      setResults(results.map(r => ({ templateId: r.templateId, isNew: !collection[r.templateId], edition: r.edition })));
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const doMulti100 = () => {
    if (!canM100 || pulling) return;
    setPulling(true);
    const results = pullMulti100(bannerId);
    if (results) {
      setResults(results.map(r => ({ templateId: r.templateId, isNew: !collection[r.templateId], edition: r.edition })));
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const handleClose = () => { setShowOverlay(false); setResults([]); };

  const doExchange = (templateId: string) => {
    const wasNew = !collection[templateId];
    const res = exchangeSparks(templateId);
    if (!res) return;
    setShowExchange(false);
    setResults([{ templateId: res.templateId, isNew: wasNew, edition: res.edition }]);
    setShowOverlay(true);
  };

  return (
    <PageScroll>
      {showOverlay && <GachaRevealOverlay results={results} onClose={handleClose} />}
      {showExchange && (
        <SparkExchangeModal universe={featuredUniverse} sparks={gachaSparks} runPeakPalier={maxPalierReached}
          collection={collection} onExchange={doExchange} onClose={() => setShowExchange(false)} />
      )}

        {/* Choix de la bannière — 3 onglets : sur téléphone, 2 par ligne et la vedette en dessous */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {banners.map(b => {
            const active = b.id === bannerId;
            const t = b.theme;
            return (
              <button key={b.id} onClick={() => setBannerId(b.id)}
                style={{ flex:'1 1 150px', minWidth:0, padding:'10px 14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s', background:active?`linear-gradient(135deg,${t.dark},${t.deep})`:'var(--bg-card)', border:`1px solid ${active?t.accent:'var(--border)'}`, boxShadow:active?`0 0 18px ${t.glow}`:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:2, position:'relative', overflow:'hidden', textAlign:'center' }}>
                {b.isNew && (
                  // Ruban en diagonale sur le coin haut-gauche, façon paquet cadeau.
                  <span className="gacha-new-ribbon" style={{ position:'absolute', top:9, left:-26, width:88, background:'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)', color:'#3b1d00', fontFamily:'var(--f-num)', fontWeight:900, fontSize:14, letterSpacing:2, textAlign:'center', padding:'2px 0', boxShadow:'0 2px 6px rgba(0,0,0,0.5)', borderTop:'1px solid rgba(255,255,255,0.6)', borderBottom:'1px solid rgba(120,53,15,0.6)', pointerEvents:'none' }}>NEW</span>
                )}
                <span style={{ fontFamily:'var(--f-title)', fontSize:16, fontWeight:900, letterSpacing:2, lineHeight:1.2, color:active?'white':'var(--text-sub)' }}>{b.title}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:active?t.hi:'var(--text-muted)' }}>
                  {b.id === 'featured' ? `✦ ${b.subtitle}` : `${b.subtitle} · ${b.pool.length}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bannière : cartes vedettes en éventail + bandeau de titre */}
        <div style={{
          borderRadius:14, overflow:'hidden',
          border:`1px solid ${theme.accent}99`,
          boxShadow:`0 0 32px ${theme.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
        }}>
          <div style={{ position:'relative', aspectRatio:'1000 / 300', minHeight:150, background:`radial-gradient(ellipse at 50% 35%, ${theme.deep} 0%, ${theme.dark} 70%)`, overflow:'hidden' }}>
            {banner.featuredIds.map((id, i, all) => {
              const tpl = getCharacterById(id);
              if (!tpl) return null;
              const k = i - (all.length - 1) / 2; // -2.5 … 2.5 : position dans l'éventail
              const form = getSafeFormIndex(tpl.universe ?? '', banner.featuredForms?.[id] ?? 0);
              return (
                // Inclinaison et flottement gérés en CSS (.gacha-fan-card, globals.css).
                <div key={id} className="gacha-fan-card"
                  style={{
                    position:'absolute', left:`${50 + k * 14.5}%`, top:`${8 + k * k * 1.6}%`, width:'19%',
                    zIndex: 10 - Math.round(Math.abs(k) * 2),
                    '--rot': `${k * 5}deg`, '--delay': `${-i * 0.55}s`,
                  } as React.CSSProperties}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/sprites/new_cards_processed/${getCardBaseName(tpl, form)}.webp?v=${NEW_CARDS_ASSET_VERSION}`} alt={tpl.name}
                    style={{
                      display:'block', width:'100%', aspectRatio:'300 / 355', objectFit:'cover', objectPosition:'center top',
                      borderRadius:8, border:'2px solid rgba(255,255,255,0.22)',
                      boxShadow:`0 6px 18px rgba(0,0,0,0.6), 0 0 12px ${theme.glow}`,
                    }} />
                </div>
              );
            })}
            {/* Fondu court vers le bandeau, teinté à la couleur de la bannière */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'35%', background:`linear-gradient(0deg, ${theme.dark}, transparent)`, pointerEvents:'none', zIndex:20 }} />
          </div>
          <div style={{ background:`linear-gradient(90deg, ${theme.dark}, ${theme.deep}66 50%, ${theme.dark})`, borderTop:`1px solid ${theme.accent}88`, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:'var(--f-title)', fontSize:22, fontWeight:900, color:'white', letterSpacing:2, textShadow:`0 0 18px ${theme.accent}, 0 2px 4px rgba(0,0,0,0.8)` }}>{banner.title}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:`${theme.hi}bb` }}>
                {isFeatured
                  ? <>{featuredUniverse} à l&apos;honneur · chances ×{FEATURED_RATE_UP} · change dans {formatTimeLeft(msUntilNextDailyReset(now))}</>
                  : `${banner.pool.length} personnages · 10 raretés · cartes shiny`}
              </div>
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:theme.hi, letterSpacing:2, border:`1px solid ${theme.accent}77`, borderRadius:20, padding:'4px 12px', background:'rgba(0,0,0,0.3)' }}>
              {isFeatured ? '✦ UNIVERS DU JOUR' : '✦ BANNIÈRE EXCLUSIVE'}
            </div>
          </div>
        </div>

        {/* Bannière vedette : Étincelles (1 par invocation) à échanger contre un perso au choix */}
        {isFeatured && (
          <div className="panel" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', borderColor:`${theme.accent}55` }}>
            <span style={{ fontSize:24, flexShrink:0 }} aria-hidden>✨</span>
            <div style={{ flex:'1 1 200px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:theme.hi, letterSpacing:2 }}>ÉTINCELLES</span>
                <span style={{ fontFamily:'var(--f-num)', fontSize:14, color:'var(--text-dim)' }}>{formatNumber(gachaSparks)} ✨ · Stellaire à {sparkTarget}</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill" style={{ width:`${Math.min(100, (gachaSparks / sparkTarget) * 100)}%`, background:`linear-gradient(90deg,${theme.deep},${theme.accent})`, boxShadow:`0 0 6px ${theme.accent}` }} />
              </div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)', marginTop:6, lineHeight:1.4 }}>
                +1 par invocation ici, conservées d&apos;un jour à l&apos;autre. Échange-les contre le perso {featuredUniverse} de ton choix.
              </div>
            </div>
            <button onClick={() => setShowExchange(true)}
              style={{ flexShrink:0, minHeight:44, padding:'0 18px', borderRadius:10, cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14, letterSpacing:1.5, color:'#1a1003', background:`linear-gradient(135deg, ${theme.hi}, ${theme.accent})`, border:'none', boxShadow:`0 0 14px ${theme.glow}` }}>
              ÉCHANGER
            </button>
          </div>
        )}

        {/* Gems + Boutons */}
        <div className="gacha-pull-grid" style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:12, alignItems:'stretch' }}>
          {/* Gemmes */}
          <div key={gemShake} className={`panel${gemShake > 0 ? ' gacha-gems--short' : ''}`} style={{ borderColor:'rgba(34,211,238,0.3)', padding:'16px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, boxShadow:'0 0 24px rgba(34,211,238,0.1)' }}>
            <span style={{ fontSize:32 }}>💎</span>
            <span className="gacha-gems__count" style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:28, color:'var(--cyan-hi)' }}>{formatNumber(nekoGems)}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', fontWeight:700, letterSpacing:2 }}>NEKO-GEMMES</span>
          </div>

          <PullButton theme={theme} count={1}   cost={costs.single}   enabled={canS}    pulling={pulling} onInsufficient={onInsufficient} onClick={doSingle} />
          <PullButton theme={theme} count={10}  cost={costs.multi10}  enabled={canM}    pulling={pulling} onInsufficient={onInsufficient} onClick={doMulti}    discount="-5%" />
          <PullButton theme={theme} count={100} cost={costs.multi100} enabled={canM100} pulling={pulling} onInsufficient={onInsufficient} onClick={doMulti100} discount="-10%" highlight />
        </div>

        {/* Progression vers le prochain Jeton d'Anomalie */}
        <div className="panel" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:24, flexShrink:0 }}>🌀</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'#e879f9', letterSpacing:2 }}>PROCHAIN JETON D&apos;ANOMALIE</span>
              <span style={{ fontFamily:'var(--f-num)', fontSize:14, color:'var(--text-dim)' }}>{pullsInCycle}/100 tirages</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width:`${pullsInCycle}%`, background:'linear-gradient(90deg,#9333ea,#e879f9)', boxShadow:'0 0 6px #c084fc' }} />
            </div>
          </div>
          <div style={{ flexShrink:0, textAlign:'right' }}>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18, color:'#e879f9' }}>🌀 {formatNumber(anomalyTokens ?? 0)}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)' }}>encore {pullsToNextToken}</div>
          </div>
        </div>

        {/* Taux de drop dynamiques */}
        <div className="panel" style={{ overflow:'hidden' }}>
          <button onClick={() => setShowPool(!showPool)}
            style={{ width:'100%', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16, color:'var(--text-sub)', letterSpacing:1, transition:'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='none'}>
            <span>{showPool ? '▲' : '▼'} TAUX DE DROP & POOL</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--purple-glow)', fontWeight:700 }}>Palier max : {maxPalierReached}</span>
          </button>
          {showPool && (
            <div style={{ padding:'0 18px 18px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Info */}
              <div style={{ background:'rgba(124,58,237,0.08)', border:'1px solid var(--border-glow)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(192,132,252,0.8)', lineHeight:1.6 }}>
                💡 Chaque rareté se débloque à partir d'un certain palier (voir 🔒 ci-dessous). Une fois débloquée, plus tu montes en palier, plus ses chances augmentent et se normalisent !
              </div>
              {isFeatured && (
                <div style={{ background:`${theme.accent}14`, border:`1px solid ${theme.accent}55`, borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-ui)', fontSize:14, color:theme.hi, lineHeight:1.6 }}>
                  ✦ Mêmes taux par rareté que la Vol.1 mais, à rareté égale, les persos {featuredUniverse} ont {FEATURED_RATE_UP} fois plus de chances de tomber. Leur part est indiquée sous chaque rareté.
                </div>
              )}

              {/* Taux par rareté */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(['T','P','CO','S','M','L','E','R','U','C'] as Rarity[]).map((r, _, all) => {
                  const cfg2       = RARITY_CONFIG[r];
                  const rate       = currentRates[r] ?? 0;
                  // Barre relative : la rareté la plus probable remplit la barre, les autres au prorata.
                  const maxRate    = Math.max(...all.map(x => currentRates[x] ?? 0));
                  const fillPct    = maxRate > 0 ? Math.min(100, (rate / maxRate) * 100) : 0;
                  const rateTxt    = formatDropRate(rate);
                  // Bannière vedette : part de l'univers vedette dans cette rareté.
                  const featuredRate = isFeatured && rate > 0 ? rate * getRateUpShare(r, featuredUniverse) : 0;
                  return (
                    <div key={r} style={{ padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:132, flexShrink:0 }}><RarityBadge rarity={r} /></div>
                        <div className="prog-track" style={{ flex:1 }}>
                          <div className="prog-fill" style={{ width:`${fillPct}%`, background:`linear-gradient(90deg,${cfg2.color}88,${cfg2.color})`, boxShadow:`0 0 6px ${cfg2.glow}` }} />
                        </div>
                        <div style={{ display:'flex', gap:10, flexShrink:0, alignItems:'center' }}>
                          <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:16, color:cfg2.color, minWidth:64, textAlign:'right' }}>{rateTxt}</span>
                        </div>
                      </div>
                      {featuredRate > 0 && (
                        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:theme.hi, textAlign:'right', marginTop:4 }}>
                          ✦ dont {formatDropRate(featuredRate)} pour un perso {featuredUniverse}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pool */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-dim)', letterSpacing:2, marginBottom:10 }}>TOUS LES PERSONNAGES</div>
                <div className="gacha-pool-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                  {/* Bannière vedette : persos de l'univers vedette en tête, liseré doré. */}
                  {(isFeatured ? [...banner.pool].sort((a, b) => Number(b.universe === featuredUniverse) - Number(a.universe === featuredUniverse)) : banner.pool).map(tpl => {
                    const cfg       = RARITY_CONFIG[tpl.rarity];
                    const owned     = collection[tpl.id];
                    const rarLocked = maxPalierReached < RARITY_GATES[tpl.rarity].unlockPalier;
                    const spotlight = isFeatured && tpl.universe === featuredUniverse;
                    return (
                      <div key={tpl.id} style={{ background:owned?`${cfg.color}0d`:'rgba(255,255,255,0.02)', border:`1px solid ${spotlight ? theme.accent : owned?cfg.color+'55':'var(--border)'}`, borderRadius:8, padding:'10px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity: rarLocked ? 0.3 : owned || spotlight ? 1 : 0.55 }}>
                        {spotlight && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:theme.hi }}>✦ VEDETTE</span>}
                        <CharacterCardThumb templateId={tpl.id} formIndex={owned?.currentForm??0} name={tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={48} height={66} frameOverlay />
                        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-sub)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                        <RarityBadge rarity={tpl.rarity} size="xs" />
                        {owned && <EditionBadge edition={owned.edition} style={{ fontSize:14, padding:'1px 6px' }} />}
                        {rarLocked && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'#f87171', fontWeight:700 }}>🔒 P{RARITY_GATES[tpl.rarity].unlockPalier}</span>}
                        {!owned && !rarLocked && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)' }}>Non obtenu</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

    </PageScroll>
  );
}
