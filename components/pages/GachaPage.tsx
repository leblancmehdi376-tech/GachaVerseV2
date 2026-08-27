'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { BANNER_POOL } from '@/lib/game/characters';
import { GACHA_COSTS, getDynamicRates, RARITY_GATES } from '@/lib/game/gacha';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { makeInstanceKey } from '@/lib/game/editions';
import { formatNumber } from '@/lib/game/format';
import { PageScroll } from '@/components/ui/Page';
import { GachaRevealOverlay } from './gacha/GachaRevealOverlay';
import type { Res } from './gacha/gachaTypes';

export function GachaPage() {
  const { nekoGems, pullSingle, pullMulti, pullMulti100, collection, getRunPeakPalier } = useGameStore();
  const [results,     setResults]     = useState<Res[]>([]);
  const [pulling,     setPulling]     = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPool,    setShowPool]    = useState(false);
  // Taux dynamiques calculés pour le palier max atteint DEPUIS LE DERNIER
  // PRESTIGE (pas le lifetime maxPalierReached, qui ne redescend jamais).
  const maxPalierReached = getRunPeakPalier();
  const currentRates = getDynamicRates(maxPalierReached);

  const canS    = nekoGems >= GACHA_COSTS.single;
  const canM    = nekoGems >= GACHA_COSTS.multi10;
  const canM100 = nekoGems >= GACHA_COSTS.multi100;

  const doSingle = () => {
    if (!canS || pulling) return;
    setPulling(true);
    const res = pullSingle();
    if (res) {
      const wasNew = !collection[makeInstanceKey(res.templateId, res.edition)];
      setResults([{ templateId: res.templateId, isNew: wasNew, edition: res.edition }]);
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const doMulti = () => {
    if (!canM || pulling) return;
    setPulling(true);
    const results = pullMulti();
    if (results) {
      setResults(results.map(r => ({ templateId: r.templateId, isNew: !collection[makeInstanceKey(r.templateId, r.edition)], edition: r.edition })));
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const doMulti100 = () => {
    if (!canM100 || pulling) return;
    setPulling(true);
    const results = pullMulti100();
    if (results) {
      setResults(results.map(r => ({ templateId: r.templateId, isNew: !collection[makeInstanceKey(r.templateId, r.edition)], edition: r.edition })));
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const handleClose = () => { setShowOverlay(false); setResults([]); };

  return (
    <PageScroll>
      {showOverlay && <GachaRevealOverlay results={results} onClose={handleClose} />}

        {/* Bannière */}
        <div style={{
          position:'relative', borderRadius:14, overflow:'hidden',
          border:'1px solid var(--border-glow)',
          boxShadow:'0 0 32px rgba(168,85,247,0.2), 0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gacha_banner.png" alt="Bannière"
            style={{ width:'100%', display:'block', imageRendering:'pixelated', maxHeight:220, objectFit:'cover', objectPosition:'center top' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'70%', background:'linear-gradient(0deg,rgba(6,4,15,0.96),transparent)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 24px', zIndex:2 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--purple-hi)', letterSpacing:3, marginBottom:4 }}>✦ BANNIÈRE EXCLUSIVE</div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'white', letterSpacing:2, marginBottom:4, textShadow:'0 0 20px rgba(168,85,247,0.6)' }}>GACHA VERSE VOL.1</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'rgba(255,255,255,0.45)' }}>
              {BANNER_POOL.length} personnages · 10 raretés · cartes shiny
            </div>
          </div>
        </div>

        {/* Gems + Boutons */}
        <div className="gacha-pull-grid" style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:12, alignItems:'stretch' }}>
          {/* Gemmes */}
          <div className="panel" style={{ borderColor:'rgba(34,211,238,0.3)', padding:'16px 20px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, boxShadow:'0 0 24px rgba(34,211,238,0.1)' }}>
            <span style={{ fontSize:28.8 }}>💎</span>
            <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24.7, color:'var(--cyan-hi)' }}>{formatNumber(nekoGems)}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', fontWeight:700, letterSpacing:1.5 }}>NEKO-GEMMES</span>
          </div>

          {/* ×1 */}
          <button onClick={doSingle} disabled={!canS || pulling}
            style={{ background:canS?'linear-gradient(135deg,#2d0f5e,#4c1d95)':'var(--bg-card)', border:`1px solid ${canS?'rgba(139,92,246,0.6)':'var(--border)'}`, borderRadius:12, padding:20, cursor:canS&&!pulling?'pointer':'not-allowed', opacity:canS?1:0.4, transition:'all 0.2s', boxShadow:canS?'0 4px 28px rgba(109,40,217,0.35),inset 0 1px 0 rgba(255,255,255,0.07)':'none', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:28.8 }}>✦</span>
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:canS?'var(--purple-glow)':'var(--text-muted)', fontWeight:700, letterSpacing:1 }}>TIRAGE ×1</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(34,211,238,0.25)', borderRadius:8, padding:'6px 16px' }}>
              <span style={{ fontSize:14.4 }}>💎</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18.5, color:'var(--cyan-hi)' }}>{GACHA_COSTS.single}</span>
            </div>
          </button>

          {/* ×10 */}
          <button onClick={doMulti} disabled={!canM || pulling}
            style={{ background:canM?'linear-gradient(135deg,#451a03,#7c2d12)':'var(--bg-card)', border:`1px solid ${canM?'rgba(217,119,6,0.6)':'var(--border)'}`, borderRadius:12, padding:20, cursor:canM&&!pulling?'pointer':'not-allowed', opacity:canM?1:0.4, transition:'all 0.2s', boxShadow:canM?'0 4px 28px rgba(180,83,9,0.35),inset 0 1px 0 rgba(255,255,255,0.07)':'none', display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:8, right:8, background:'#d97706', color:'#000', fontFamily:'var(--f-num)', fontWeight:900, fontSize:12, padding:'2px 8px', borderRadius:6 }}>-5%</div>
            <span style={{ fontSize:28.8 }}>✦✦</span>
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:canM?'#fbbf24':'var(--text-muted)', fontWeight:700, letterSpacing:1 }}>TIRAGE ×10</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:8, padding:'6px 16px' }}>
              <span style={{ fontSize:14.4 }}>💎</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18.5, color:'#fbbf24' }}>{GACHA_COSTS.multi10}</span>
            </div>
          </button>

          {/* ×100 */}
          <button onClick={doMulti100} disabled={!canM100 || pulling}
            style={{ background:canM100?'linear-gradient(135deg,#1a0536,#3b0764)':'var(--bg-card)', border:`1px solid ${canM100?'rgba(168,85,247,0.7)':'var(--border)'}`, borderRadius:12, padding:20, cursor:canM100&&!pulling?'pointer':'not-allowed', opacity:canM100?1:0.4, transition:'all 0.2s', boxShadow:canM100?'0 4px 28px rgba(147,51,234,0.4),inset 0 1px 0 rgba(255,255,255,0.07)':'none', display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:8, right:8, background:'#7c3aed', color:'#fff', fontFamily:'var(--f-num)', fontWeight:900, fontSize:12, padding:'2px 8px', borderRadius:6 }}>-10%</div>
            <span style={{ fontSize:28.8 }}>✦✦✦</span>
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:canM100?'#c084fc':'var(--text-muted)', fontWeight:700, letterSpacing:1 }}>TIRAGE ×100</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.35)', border:'1px solid rgba(192,132,252,0.35)', borderRadius:8, padding:'6px 16px' }}>
              <span style={{ fontSize:14.4 }}>💎</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18.5, color:'#c084fc' }}>{GACHA_COSTS.multi100}</span>
            </div>
          </button>
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
                {(['T','P','CO','S','M','L','E','R','U','C'] as Rarity[]).map(r => {
                  const cfg2       = RARITY_CONFIG[r];
                  const gate       = RARITY_GATES[r];
                  const rate       = currentRates[r] ?? 0;
                  const fillPct    = gate.rateAtMax > 0 ? Math.min(100, (rate / gate.rateAtMax) * 100) : 0;
                  // Affichage adapté aux très petits taux (< 0.01% → plus de décimales)
                  const rateTxt    = rate >= 0.01 ? `${rate.toFixed(2)}%` : rate > 0 ? `${rate.toFixed(4)}%` : '0%';
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
                  {BANNER_POOL.map(tpl => {
                    const cfg       = RARITY_CONFIG[tpl.rarity];
                    // Possédé si N'IMPORTE QUELLE édition l'est ; on affiche la meilleure (diamant > or > base).
                    const owned     = collection[makeInstanceKey(tpl.id, 'diamond')]
                                    ?? collection[makeInstanceKey(tpl.id, 'gold')]
                                    ?? collection[tpl.id];
                    const rarLocked = maxPalierReached < RARITY_GATES[tpl.rarity].unlockPalier;
                    return (
                      <div key={tpl.id} style={{ background:owned?`${cfg.color}0d`:'rgba(255,255,255,0.02)', border:`1px solid ${owned?cfg.color+'55':'var(--border)'}`, borderRadius:8, padding:'10px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity: rarLocked ? 0.3 : owned ? 1 : 0.55 }}>
                        <CharacterCardThumb templateId={tpl.id} formIndex={owned?.currentForm??0} name={tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={48} height={66} />
                        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-sub)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                        <RarityBadge rarity={tpl.rarity} size="xs" />
                        {owned && <RankStars rank={owned.rank} />}
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
