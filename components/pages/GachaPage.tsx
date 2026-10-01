'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { EditionBadge } from '@/components/ui/EditionBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getCharacterById } from '@/lib/game/characters';
import { getDynamicRates, RARITY_GATES, GACHA_BANNERS, DEFAULT_BANNER_ID, getBanner, type BannerId, type BannerTheme } from '@/lib/game/gacha';
import { getCardBaseName, NEW_CARDS_ASSET_VERSION } from '@/lib/game/cardAssets';
import { useSpoilerStore, getSafeFormIndex } from '@/store/spoilerStore';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { PageScroll } from '@/components/ui/Page';
import { GachaRevealOverlay } from './gacha/GachaRevealOverlay';
import type { Res } from './gacha/gachaTypes';

// Dernier volume de gacha sélectionné, mémorisé en local uniquement (pas
// dans la sauvegarde cloud) pour réatterrir dessus en revenant sur la page.
const BANNER_STORAGE_KEY = 'gv_gacha_banner';
function loadBannerId(): BannerId {
  try {
    const saved = localStorage.getItem(BANNER_STORAGE_KEY);
    if (saved && GACHA_BANNERS.some(b => b.id === saved)) return saved as BannerId;
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
  return rate >= 0.01 ? `${rate.toFixed(2)}%` : rate > 0 ? `${rate.toFixed(4)}%` : '0%';
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
        <div style={{ position:'absolute', top:8, right:8, background:theme.accent, color:'white', fontFamily:'var(--f-num)', fontWeight:900, fontSize:11, padding:'2px 7px', borderRadius:6 }}>{discount}</div>
      )}
      <span style={{ fontFamily:'var(--f-ui)', fontSize:11, fontWeight:700, letterSpacing:2, color:enabled?theme.hi:'var(--text-muted)' }}>TIRAGE</span>
      <span style={{ fontFamily:'var(--f-num)', fontSize:28, fontWeight:900, lineHeight:1, color:enabled?'white':'var(--text-muted)', textShadow:enabled?`0 0 14px ${theme.accent}`:'none' }}>×{count}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.35)', border:`1px solid ${theme.accent}55`, borderRadius:8, padding:'5px 14px' }}>
        <span style={{ fontSize:13 }}>💎</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:17, color:enabled?theme.hi:'var(--text-muted)' }}>{cost}</span>
      </div>
    </button>
  );
}

export function GachaPage() {
  const { nekoGems, pullSingle, pullMulti, pullMulti100, collection, getRunPeakPalier, getGachaCosts, totalGachaPulls, anomalyTokens } = useGameStore();
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
  const banner = getBanner(bannerId);
  const theme  = banner.theme;
  // Taux dynamiques calculés pour le palier max atteint DEPUIS LE DERNIER
  // PRESTIGE (pas le lifetime maxPalierReached, qui ne redescend jamais).
  const maxPalierReached = getRunPeakPalier();
  const currentRates = getDynamicRates(maxPalierReached);
  // Coûts après réduction éventuelle des anomalies "Réduc. Coût Gacha".
  const costs = getGachaCosts();
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

  return (
    <PageScroll>
      {showOverlay && <GachaRevealOverlay results={results} onClose={handleClose} />}

        {/* Choix de la bannière */}
        <div style={{ display:'flex', gap:8 }}>
          {GACHA_BANNERS.map(b => {
            const active = b.id === bannerId;
            const t = b.theme;
            return (
              <button key={b.id} onClick={() => setBannerId(b.id)}
                style={{ flex:1, padding:'10px 14px', borderRadius:10, cursor:'pointer', transition:'all 0.15s', background:active?`linear-gradient(135deg,${t.dark},${t.deep})`:'var(--bg-card)', border:`1px solid ${active?t.accent:'var(--border)'}`, boxShadow:active?`0 0 18px ${t.glow}`:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:2, position:'relative', overflow:'hidden' }}>
                {b.isNew && (
                  // Ruban en diagonale sur le coin haut-gauche, façon paquet cadeau.
                  <span className="gacha-new-ribbon" style={{ position:'absolute', top:9, left:-26, width:88, background:'linear-gradient(90deg,#f59e0b,#fde047,#f59e0b)', color:'#3b1d00', fontFamily:'var(--f-num)', fontWeight:900, fontSize:10, letterSpacing:1.5, textAlign:'center', padding:'2px 0', boxShadow:'0 2px 6px rgba(0,0,0,0.5)', borderTop:'1px solid rgba(255,255,255,0.6)', borderBottom:'1px solid rgba(120,53,15,0.6)', pointerEvents:'none' }}>NEW</span>
                )}
                <span style={{ fontFamily:'var(--f-title)', fontSize:13.4, fontWeight:900, letterSpacing:1.5, color:active?'white':'var(--text-sub)' }}>{b.title}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:11.4, color:active?t.hi:'var(--text-muted)' }}>{b.subtitle} · {b.pool.length}</span>
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
              <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'white', letterSpacing:2, textShadow:`0 0 18px ${theme.accent}, 0 2px 4px rgba(0,0,0,0.8)` }}>{banner.title}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:`${theme.hi}bb` }}>
                {banner.pool.length} personnages · 10 raretés · cartes shiny
              </div>
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:theme.hi, letterSpacing:3, border:`1px solid ${theme.accent}77`, borderRadius:20, padding:'4px 12px', background:'rgba(0,0,0,0.3)' }}>✦ BANNIÈRE EXCLUSIVE</div>
          </div>
        </div>

        {/* Gems + Boutons */}
        <div className="gacha-pull-grid" style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:12, alignItems:'stretch' }}>
          {/* Gemmes */}
          <div key={gemShake} className={`panel${gemShake > 0 ? ' gacha-gems--short' : ''}`} style={{ borderColor:'rgba(34,211,238,0.3)', padding:'16px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, boxShadow:'0 0 24px rgba(34,211,238,0.1)' }}>
            <span style={{ fontSize:28.8 }}>💎</span>
            <span className="gacha-gems__count" style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24.7, color:'var(--cyan-hi)' }}>{formatNumber(nekoGems)}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:1.5 }}>NEKO-GEMMES</span>
          </div>

          <PullButton theme={theme} count={1}   cost={costs.single}   enabled={canS}    pulling={pulling} onInsufficient={onInsufficient} onClick={doSingle} />
          <PullButton theme={theme} count={10}  cost={costs.multi10}  enabled={canM}    pulling={pulling} onInsufficient={onInsufficient} onClick={doMulti}    discount="-5%" />
          <PullButton theme={theme} count={100} cost={costs.multi100} enabled={canM100} pulling={pulling} onInsufficient={onInsufficient} onClick={doMulti100} discount="-10%" highlight />
        </div>

        {/* Progression vers le prochain Jeton d'Anomalie */}
        <div className="panel" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:22.7, flexShrink:0 }}>🌀</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#e879f9', letterSpacing:1.5 }}>PROCHAIN JETON D&apos;ANOMALIE</span>
              <span style={{ fontFamily:'var(--f-num)', fontSize:12.4, color:'var(--text-dim)' }}>{pullsInCycle}/100 tirages</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width:`${pullsInCycle}%`, background:'linear-gradient(90deg,#9333ea,#e879f9)', boxShadow:'0 0 6px #c084fc' }} />
            </div>
          </div>
          <div style={{ flexShrink:0, textAlign:'right' }}>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:16.5, color:'#e879f9' }}>🌀 {formatNumber(anomalyTokens ?? 0)}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'var(--text-muted)' }}>encore {pullsToNextToken}</div>
          </div>
        </div>

        {/* Taux de drop dynamiques */}
        <div className="panel" style={{ overflow:'hidden' }}>
          <button onClick={() => setShowPool(!showPool)}
            style={{ width:'100%', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, color:'var(--text-sub)', letterSpacing:1, transition:'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='none'}>
            <span>{showPool ? '▲' : '▼'} TAUX DE DROP & POOL</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--purple-glow)', fontWeight:700 }}>Palier max : {maxPalierReached}</span>
          </button>
          {showPool && (
            <div style={{ padding:'0 18px 18px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Info */}
              <div style={{ background:'rgba(124,58,237,0.08)', border:'1px solid var(--border-glow)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(192,132,252,0.8)', lineHeight:1.6 }}>
                💡 Chaque rareté se débloque à partir d'un certain palier (voir 🔒 ci-dessous). Une fois débloquée, plus tu montes en palier, plus ses chances augmentent et se normalisent !
              </div>

              {/* Taux par rareté */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(['T','P','CO','S','M','L','E','R','U','C'] as Rarity[]).map((r, _, all) => {
                  const cfg2       = RARITY_CONFIG[r];
                  const rate       = currentRates[r] ?? 0;
                  // Barre relative : la rareté la plus probable remplit la barre, les autres au prorata.
                  const maxRate    = Math.max(...all.map(x => currentRates[x] ?? 0));
                  const fillPct    = maxRate > 0 ? Math.min(100, (rate / maxRate) * 100) : 0;
                  const rateTxt    = formatDropRate(rate);
                  return (
                    <div key={r} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8 }}>
                      <div style={{ width:80, flexShrink:0 }}><RarityBadge rarity={r} /></div>
                      <div className="prog-track" style={{ flex:1 }}>
                        <div className="prog-fill" style={{ width:`${fillPct}%`, background:`linear-gradient(90deg,${cfg2.color}88,${cfg2.color})`, boxShadow:`0 0 6px ${cfg2.glow}` }} />
                      </div>
                      <div style={{ display:'flex', gap:10, flexShrink:0, alignItems:'center' }}>
                        <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:14.4, color:cfg2.color, minWidth:64, textAlign:'right' }}>{rateTxt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pool */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:1.5, marginBottom:10 }}>TOUS LES PERSONNAGES</div>
                <div className="gacha-pool-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                  {banner.pool.map(tpl => {
                    const cfg       = RARITY_CONFIG[tpl.rarity];
                    const owned     = collection[tpl.id];
                    const rarLocked = maxPalierReached < RARITY_GATES[tpl.rarity].unlockPalier;
                    return (
                      <div key={tpl.id} style={{ background:owned?`${cfg.color}0d`:'rgba(255,255,255,0.02)', border:`1px solid ${owned?cfg.color+'55':'var(--border)'}`, borderRadius:8, padding:'10px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity: rarLocked ? 0.3 : owned ? 1 : 0.55 }}>
                        <CharacterCardThumb templateId={tpl.id} formIndex={owned?.currentForm??0} name={tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={48} height={66} frameOverlay />
                        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-sub)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                        <RarityBadge rarity={tpl.rarity} size="xs" />
                        {owned && <EditionBadge edition={owned.edition} style={{ fontSize:11, padding:'1px 6px' }} />}
                        {rarLocked && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#f87171', fontWeight:700 }}>🔒 P{RARITY_GATES[tpl.rarity].unlockPalier}</span>}
                        {!owned && !rarLocked && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)' }}>Non obtenu</span>}
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
