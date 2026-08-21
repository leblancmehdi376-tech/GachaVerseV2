'use client';
import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { getCharacterById } from '@/lib/game/characters';
import { GACHA_COSTS, getDynamicRates } from '@/lib/game/gacha';
import { RARITY_CONFIG, Rarity } from '@/types/game';

type Phase = 'idle' | 'video' | 'cards';
interface PullResult { templateId: string; isNew: boolean; flipped: boolean; }

// ── Carte retournable ─────────────────────────────────────────────────────
function FlipCard({ res, index, total }: { res: PullResult; index: number; total: number; onFlip: () => void; }) {
  const [hovered,  setHovered]  = useState(false);
  const [flipped,  setFlipped]  = useState(false);
  const [revealed, setRevealed] = useState(false);
  const tpl = getCharacterById(res.templateId);
  const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : RARITY_CONFIG['C'];

  // légère entrée en cascade
  const delay = index * 0.08;

  const handleFlip = () => {
    if (flipped) return;
    setFlipped(true);
    setTimeout(() => setRevealed(true), 320);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleFlip}
      style={{
        position: 'relative',
        width: total === 1 ? 200 : 130,
        height: total === 1 ? 290 : 190,
        cursor: flipped ? 'default' : 'pointer',
        perspective: '1000px',
        animation: `cardSlideIn 0.5s ease ${delay}s both`,
        flexShrink: 0,
      }}
    >
      {/* Aura sous la carte (hover) */}
      <div style={{
        position: 'absolute',
        bottom: -14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        height: 28,
        borderRadius: '50%',
        background: cfg.color,
        filter: 'blur(14px)',
        opacity: hovered && !flipped ? 0.85 : flipped ? 0.4 : 0,
        transition: 'opacity 0.3s ease',
        boxShadow: `0 0 30px 8px ${cfg.glow}`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Carte 3D */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        zIndex: 1,
      }}>
        {/* DOS de la carte */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: hovered && !flipped
            ? `0 0 0 2px ${cfg.color}, 0 8px 32px ${cfg.glow}88`
            : '0 6px 24px rgba(0,0,0,0.7)',
          transition: 'box-shadow 0.3s ease',
          transform: 'rotateY(0deg)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/cards/card_back.png" alt="Carte"
               loading="lazy" decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', imageRendering: 'auto' }} />
          {/* Hint "cliquer" si hover */}
          {hovered && !flipped && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at center, ${cfg.color}22 0%, transparent 70%)`,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 12,
            }}>
              <span style={{
                fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 11.3,
                color: cfg.color, letterSpacing: 1,
                background: 'rgba(0,0,0,0.6)', borderRadius: 6,
                padding: '3px 10px', border: `1px solid ${cfg.color}66`,
              }}>RÉVÉLER</span>
            </div>
          )}
        </div>

        {/* FACE de la carte (personnage) */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: `0 0 0 2px ${cfg.color}, 0 8px 40px ${cfg.glow}99`,
        }}>
          {tpl ? (<>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/sprites/cards/${res.templateId}.png`} alt={tpl.name}
                 loading="lazy" decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => {
                const t = e.target as HTMLImageElement;
                t.style.display = 'none';
                const p = t.parentElement!;
                p.style.background = `linear-gradient(160deg,#0d0720,${cfg.color}33)`;
                p.innerHTML += `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
                  <span style="font-family:var(--f-ui);font-weight:900;font-size:40px;color:${cfg.color}">${tpl.name.charAt(0)}</span>
                  <span style="font-family:var(--f-ui);font-size:12px;color:rgba(255,255,255,0.7)">${tpl.name}</span>
                </div>`;
              }} />
            {/* Badge rareté en bas */}
            {revealed && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '18px 10px 10px',
                background: 'linear-gradient(0deg,rgba(0,0,0,0.9) 0%,transparent 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                animation: 'fadeIn 0.4s ease',
              }}>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:'white' }}>{tpl.name}</span>
                <RarityBadge rarity={tpl.rarity} size="xs" />
                {res.isNew && <span style={{ fontFamily:'var(--f-ui)', fontSize:9.3, color:'#4ade80', fontWeight:700, letterSpacing:1 }}>✦ NOUVEAU !</span>}
              </div>
            )}
          </>) : (
            <div style={{ background:'#1a0040', width:'100%', height:'100%' }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overlay révélation ───────────────────────────────────────────────────
function GachaRevealOverlay({ results, onClose }: { results: PullResult[]; onClose: () => void }) {
  const [phase, setPhase] = useState<'video' | 'cards'>('video');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flippedAll, setFlippedAll] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => setPhase('cards')); // fallback si autoplay bloqué
    v.onended = () => setPhase('cards');
    // Fallback timeout (si la vidéo est longue)
    const t = setTimeout(() => setPhase('cards'), 6000);
    return () => clearTimeout(t);
  }, []);

  const allFlipped = results.every(r => r.flipped);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.96)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* ── Phase vidéo ── */}
      <video
        ref={videoRef}
        src="/videos/gacha_intro.mp4"
        muted playsInline preload="auto"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: phase === 'video' ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Skip vidéo */}
      {phase === 'video' && (
        <button
          onClick={() => setPhase('cards')}
          style={{
            position: 'absolute', bottom: 32, right: 32,
            fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12.4,
            color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
            padding: '8px 18px', cursor: 'pointer', letterSpacing: 1,
            zIndex: 2,
          }}>
          PASSER ▶
        </button>
      )}

      {/* ── Phase cartes ── */}
      {phase === 'cards' && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 32,
          padding: '0 24px',
          animation: 'fadeIn 0.5s ease',
          width: '100%',
          maxWidth: results.length === 1 ? 320 : 1100,
        }}>
          {/* Cartes */}
          <div style={{
            display: 'flex',
            flexWrap: results.length > 5 ? 'wrap' : 'nowrap',
            gap: results.length === 1 ? 0 : 14,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}>
            {results.map((res, i) => (
              <FlipCard key={i} res={res} index={i} total={results.length} onFlip={() => {}} />
            ))}
          </div>

          {/* Boutons bas */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => {
                // Simuler le flip de toutes les cartes non retournées
                setFlippedAll(true);
              }}
              style={{
                fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4,
                color: '#c084fc', background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.35)', borderRadius: 8,
                padding: '10px 24px', cursor: 'pointer', letterSpacing: 1,
              }}>
              ✦ TOUT RÉVÉLER
            </button>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4,
                color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                padding: '10px 24px', cursor: 'pointer', letterSpacing: 1,
              }}>
              FERMER ✕
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cardSlideIn {
          from { opacity:0; transform: translateY(40px) scale(0.9); }
          to   { opacity:1; transform: translateY(0)    scale(1);   }
        }
        @keyframes fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
      `}</style>
    </div>
  );
}

// ── Panel principal ──────────────────────────────────────────────────────
export function GachaMiniPanel() {
  const { nekoGems, pullSingle, pullMulti, collection, maxPalierReached } = useGameStore();
  const [results,  setResults]  = useState<PullResult[]>([]);
  const [pulling,  setPulling]  = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showRate, setShowRate] = useState(false);
  const rates = getDynamicRates(maxPalierReached);
  const canS = nekoGems >= GACHA_COSTS.single;
  const canM = nekoGems >= GACHA_COSTS.multi10;

  const doSingle = async () => {
    if (!canS || pulling) return;
    setPulling(true);
    const res = pullSingle();
    if (res) {
      setResults([{ templateId: res.templateId, isNew: !collection[res.templateId], flipped: false }]);
      setShowOverlay(true);
    }
    setPulling(false);
  };

  const doMulti = async () => {
    if (!canM || pulling) return;
    setPulling(true);
    const results = pullMulti();
    if (results) {
      setResults(results.map(r => ({ templateId: r.templateId, isNew: !collection[r.templateId], flipped: false })));
      setShowOverlay(true);
    }
    setPulling(false);
  };

  return (
    <>
      {/* Overlay animation gacha */}
      {showOverlay && (
        <GachaRevealOverlay
          results={results}
          onClose={() => { setShowOverlay(false); setResults([]); }}
        />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'8px', height:'100%' }}>

        {/* Crystal gem + boutons */}
        <div style={{ display:'flex', gap:'10px', alignItems:'stretch' }}>
          <div style={{ width:56, flexShrink:0, background:'linear-gradient(135deg,#1a0d2e,#0e0520)', border:'1px solid var(--purple-dim)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'33px', boxShadow:'0 0 20px rgba(168,85,247,0.2)' }}>
            💎
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'6px' }}>
            <button onClick={doSingle} disabled={!canS || pulling}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:canS?'linear-gradient(135deg,#2d0f5e,#4c1d95)':'rgba(255,255,255,0.03)', border:`1px solid ${canS?'rgba(139,92,246,0.5)':'var(--border)'}`, borderRadius:'7px', cursor:canS&&!pulling?'pointer':'not-allowed', opacity:canS?1:0.4, transition:'all 0.15s', boxShadow:canS?'0 2px 16px rgba(109,40,217,0.25)':'none' }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:canS?'var(--purple-glow)':'var(--text-muted)' }}>
                {pulling ? '✦ Invocation...' : 'Tirage ×1'}
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(34,211,238,0.3)', borderRadius:'5px', padding:'3px 10px' }}>
                <span style={{ fontSize:'12.4px' }}>💎</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--cyan)' }}>{GACHA_COSTS.single}</span>
              </div>
            </button>

            <button onClick={doMulti} disabled={!canM || pulling}
              style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:canM?'linear-gradient(135deg,#3d1500,#7c2d12)':'rgba(255,255,255,0.03)', border:`1px solid ${canM?'rgba(217,119,6,0.5)':'var(--border)'}`, borderRadius:'7px', cursor:canM&&!pulling?'pointer':'not-allowed', opacity:canM?1:0.4, transition:'all 0.15s', boxShadow:canM?'0 2px 16px rgba(180,83,9,0.25)':'none', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:'-2px', right:'-2px', background:'#d97706', padding:'1px 8px', fontSize:'9.3px', fontFamily:'var(--f-ui)', fontWeight:700, color:'#000', borderBottomLeftRadius:'4px' }}>-10%</div>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:canM?'#fbbf24':'var(--text-muted)' }}>Tirage ×10</span>
              <div style={{ display:'flex', alignItems:'center', gap:'5px', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(34,211,238,0.3)', borderRadius:'5px', padding:'3px 10px' }}>
                <span style={{ fontSize:'12.4px' }}>💎</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--cyan)' }}>{GACHA_COSTS.multi10}</span>
              </div>
            </button>
          </div>
        </div>

        <div style={{ fontFamily:'var(--f-ui)', fontSize:'10.3px', color:'var(--text-dim)', textAlign:'center', fontWeight:500 }}>
          ★ 4+ GARANTI DANS 32 TIRAGES
        </div>

        {/* Taux */}
        <button onClick={() => setShowRate(!showRate)}
          style={{ background:'none', border:'1px solid var(--border)', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', fontFamily:'var(--f-ui)', fontSize:'11.3px', color:'var(--text-dim)', fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all 0.15s' }}>
          {showRate ? '▲' : '▼'} Taux de drop
        </button>

        {showRate && (
          <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid var(--border)', borderRadius:'8px', padding:'10px', display:'flex', flexDirection:'column', gap:'6px' }}>
            {(Object.entries(rates) as [Rarity, number][]).sort((a,b) => b[1] - a[1]).map(([r, rate]) => {
              const cfg = RARITY_CONFIG[r];
              return (
              <div key={r} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'76px', flexShrink:0 }}><RarityBadge rarity={r} size="xs" /></div>
                <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(rate,65)/65*100}%`, background:cfg.color, boxShadow:`0 0 5px ${cfg.glow}`, borderRadius:'3px' }} />
                </div>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:cfg.color, minWidth:'38px', textAlign:'right' }}>{rate}%</span>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
