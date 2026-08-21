'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { getCharacterById, BANNER_POOL } from '@/lib/game/characters';
import { GACHA_COSTS, getDynamicRates, RARITY_GATES } from '@/lib/game/gacha';
import { RARITY_CONFIG, Rarity, CardEdition } from '@/types/game';
import { makeInstanceKey } from '@/lib/game/editions';
import { formatNumber } from '@/lib/game/format';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';

/* ─────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────── */
const HIGH_RARITY: Rarity[] = ['L','M','S','CO','P','T'];
const ULTRA_RARITY: Rarity[] = ['S','CO','P','T'];

type Res = { templateId: string; isNew: boolean; edition: CardEdition };

/* ─────────────────────────────────────────────────────────────────
   CARD BACK IMAGE
───────────────────────────────────────────────────────────────── */
function CardBackImg({ rarity }: { rarity?: Rarity }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates('/sprites/cards/card_back'));
  const cfg = rarity ? RARITY_CONFIG[rarity] : null;
  if (failed || !src) return (
    <div style={{
      width:'100%', height:'100%',
      background: cfg
        ? `linear-gradient(160deg,${cfg.color}22,#1a0d2e,${cfg.color}11)`
        : 'linear-gradient(160deg,#1a0d2e,#3b0764)',
    }} />
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Carte" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={onError} />
  );
}

/* ─────────────────────────────────────────────────────────────────
   PARTICLES — spawned on high-rarity flip
───────────────────────────────────────────────────────────────── */
function RarityBurst({ color, active }: { color: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;

    const pts = Array.from({ length: 55 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        size: 2 + Math.random() * 4,
        decay: 0.018 + Math.random() * 0.016,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of pts) {
        p.life -= p.decay;
        if (p.life <= 0) continue;
        alive = true;
        p.x += p.vx; p.y += p.vy; p.vy += 0.12;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur  = 0;
      if (alive) rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, color]);

  if (!active) return null;
  return (
    <canvas ref={canvasRef}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:10 }} />
  );
}

/* ─────────────────────────────────────────────────────────────────
   SINGLE FLIP CARD
───────────────────────────────────────────────────────────────── */
function FlipCard({ res, index, total, autoFlip, delay }: {
  res: Res; index: number; total: number; autoFlip: boolean; delay: number;
}) {
  const [flipped,  setFlipped]  = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [burst,    setBurst]    = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const tpl = getCharacterById(res.templateId);
  const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : RARITY_CONFIG['C'];
  const isHigh  = tpl ? HIGH_RARITY.includes(tpl.rarity)  : false;
  const isUltra = tpl ? ULTRA_RARITY.includes(tpl.rarity) : false;

  const doFlip = useCallback(() => {
    if (flipped) return;
    setFlipped(true);
    setTimeout(() => {
      setRevealed(true);
      if (isHigh) setBurst(true);
    }, 340);
  }, [flipped, isHigh]);

  useEffect(() => {
    if (!autoFlip) return;
    const t = setTimeout(doFlip, delay);
    return () => clearTimeout(t);
  }, [autoFlip, delay, doFlip]);

  // Ratio réel des cartes (306:517, très allongé) — évite le rognage/décentrage
  // qu'on aurait avec une boîte aux proportions différentes.
  const CARD_RATIO = 306 / 517;
  const h = total === 1 ? 310 : total <= 5 ? 220 : 155;
  const w = Math.round(h * CARD_RATIO);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={doFlip}
      style={{
        position: 'relative',
        width: w, height: h,
        cursor: flipped ? 'default' : 'pointer',
        perspective: '900px',
        flexShrink: 0,
        animation: `gvCardIn 0.45s cubic-bezier(0.175,0.885,0.32,1.275) ${index * 0.06}s both`,
      }}
    >
      {/* Aura sol */}
      <div style={{
        position:'absolute', bottom:-14, left:'50%', transform:'translateX(-50%)',
        width:'80%', height:20, borderRadius:'50%',
        background: cfg.color, filter:'blur(12px)',
        opacity: flipped ? (isHigh ? 0.8 : 0.3) : hovered ? 0.7 : 0,
        transition:'opacity 0.3s',
        pointerEvents:'none',
      }} />

      {/* Particules burst */}
      <RarityBurst color={cfg.color} active={burst} />

      {/* Carte 3D */}
      <div style={{
        position:'relative', width:'100%', height:'100%',
        transformStyle:'preserve-3d',
        transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* DOS */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          borderRadius:12, overflow:'hidden',
          boxShadow: hovered && !flipped
            ? `0 0 0 2px ${cfg.color}, 0 12px 40px ${cfg.glow}88`
            : '0 6px 24px rgba(0,0,0,0.7)',
          transition:'box-shadow 0.25s',
        }}>
          <CardBackImg rarity={flipped ? tpl?.rarity : undefined} />
          {hovered && !flipped && (
            <div style={{
              position:'absolute', inset:0,
              background:`radial-gradient(ellipse at 50% 50%,${cfg.color}22,transparent 70%)`,
              display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:12,
            }}>
              <span style={{
                fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12,
                color:cfg.color, letterSpacing:1, background:'rgba(0,0,0,0.7)',
                borderRadius:5, padding:'3px 10px', border:`1px solid ${cfg.color}55`,
              }}>RÉVÉLER</span>
            </div>
          )}
        </div>

        {/* FACE */}
        <div style={{
          position:'absolute', inset:0,
          backfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          borderRadius:12, overflow:'hidden',
          boxShadow: isUltra
            ? `0 0 0 2px ${cfg.color}, 0 0 50px ${cfg.glow}, 0 0 100px ${cfg.glow}44, 0 10px 40px rgba(0,0,0,0.8)`
            : isHigh
              ? `0 0 0 2px ${cfg.color}, 0 0 30px ${cfg.glow}88, 0 10px 30px rgba(0,0,0,0.7)`
              : `0 0 0 1px ${cfg.color}44, 0 8px 24px rgba(0,0,0,0.7)`,
          animation: isUltra && revealed ? 'gvUltraPulse 2s ease-in-out infinite' : undefined,
        }}>
          {tpl && (
            <>
              <CharacterCardThumb
                templateId={res.templateId}
                name={tpl.name}
                rarity={tpl.rarity}
                edition={res.edition}
                width={w} height={h}
                style={{ border:'none', boxShadow:'none', borderRadius:0, objectFit:'contain' }}
              />
              {/* Overlay lumière haute rareté */}
              {isHigh && revealed && (
                <div style={{
                  position:'absolute', inset:0,
                  background:`radial-gradient(ellipse at 50% 30%, ${cfg.color}33, transparent 60%)`,
                  animation:'gvGlowPulse 2s ease-in-out infinite',
                  pointerEvents:'none',
                }} />
              )}
              {/* Info bas de carte */}
              {revealed && (
                <div style={{
                  position:'absolute', bottom:0, left:0, right:0,
                  padding:'18px 8px 10px',
                  background:'linear-gradient(0deg,rgba(0,0,0,0.94) 0%,transparent 100%)',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                  animation:'gvFadeUp 0.35s ease',
                }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:Math.max(10, 14 - total * 0.3), color:'white', textAlign:'center', lineHeight:1.2 }}>
                    {tpl.name}
                  </span>
                  <RarityBadge rarity={tpl.rarity} size="xs" />
                  {res.isNew && (
                    <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#4ade80', fontWeight:800, letterSpacing:1, marginTop:1 }}>
                      ✦ NOUVEAU
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INVOCATION PORTAL — animation d'appel avant les cartes
───────────────────────────────────────────────────────────────── */
function InvocationPortal({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'build' | 'burst' | 'fade'>('build');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('burst'), 800);
    const t2 = setTimeout(() => setPhase('fade'),  1400);
    const t3 = setTimeout(() => onDone(),           1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Canvas orbe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const cx = W / 2, cy = H / 2;
    let t = 0;

    const pts = Array.from({ length: 120 }, (_, i) => ({
      angle: (i / 120) * Math.PI * 2,
      r: 90 + Math.random() * 30,
      speed: 0.008 + Math.random() * 0.012,
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.4 + Math.random() * 0.6,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.03;
      const scale = phase === 'burst' ? 1 + (t * 0.8) : 1;

      // Glow central
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 * scale);
      grad.addColorStop(0,   'rgba(192,132,252,0.55)');
      grad.addColorStop(0.4, 'rgba(109,40,217,0.3)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 150 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Particules orbitales
      for (const p of pts) {
        p.angle += p.speed;
        const x = cx + Math.cos(p.angle) * p.r * scale;
        const y = cy + Math.sin(p.angle) * p.r * scale * 0.55;
        ctx.globalAlpha = p.alpha * (phase === 'burst' ? Math.max(0, 1 - t * 0.5) : 0.85);
        ctx.fillStyle = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#9333ea';
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rayons
      ctx.globalAlpha = phase === 'burst' ? Math.max(0, 0.35 - t * 0.15) : 0.15;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.5;
        const len = (80 + Math.sin(t * 3 + i) * 30) * scale;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.55);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  return (
    <div style={{
      position:'absolute', inset:0,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      opacity: phase === 'fade' ? 0 : 1,
      transition: phase === 'fade' ? 'opacity 0.5s ease' : 'opacity 0.3s ease',
    }}>
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      <div style={{
        position:'relative', zIndex:1, textAlign:'center',
        transform: phase === 'burst' ? 'scale(1.15)' : 'scale(1)',
        transition:'transform 0.3s ease',
      }}>
        <div style={{
          fontFamily:'var(--f-title)', fontSize:28.8, fontWeight:900,
          color:'#e9d5ff', letterSpacing:4,
          textShadow:'0 0 30px rgba(192,132,252,0.8), 0 0 60px rgba(109,40,217,0.5)',
          marginBottom:8,
        }}>
          INVOCATION
        </div>
        <div style={{
          fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(192,132,252,0.5)',
          letterSpacing:3, fontWeight:700,
        }}>
          EN COURS...
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RÉSUMÉ — affiché après que toutes les cartes sont révélées
───────────────────────────────────────────────────────────────── */
function PullSummary({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const newChars = results.filter(r => r.isNew);
  const highChars = results.filter(r => {
    const tpl = getCharacterById(r.templateId);
    return tpl && HIGH_RARITY.includes(tpl.rarity);
  });

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:20,
      animation:'gvFadeUp 0.4s ease',
    }}>
      {/* Stats rapides */}
      <div style={{ display:'flex', gap:12 }}>
        {[
          { label:'TIRAGE', val:`×${results.length}`,         color:'var(--purple-glow)' },
          { label:'NOUVEAUX', val:String(newChars.length),    color:'#4ade80'            },
          { label:'RARES+', val:String(highChars.length),     color:'#fbbf24'            },
        ].map((s,i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)',
            borderRadius:10, padding:'10px 18px', textAlign:'center', minWidth:80,
          }}>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:22.7, color:s.color }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)', letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mise en avant des raretés élevées */}
      {highChars.length > 0 && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:10, fontWeight:700 }}>
            ✦ RARETÉS ÉLEVÉES
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {highChars.map((r, i) => {
              const tpl = getCharacterById(r.templateId);
              if (!tpl) return null;
              const cfg = RARITY_CONFIG[tpl.rarity];
              return (
                <div key={i} style={{
                  background:`${cfg.color}12`, border:`1px solid ${cfg.color}44`,
                  borderRadius:10, padding:'8px 14px',
                  display:'flex', alignItems:'center', gap:8,
                  boxShadow:`0 0 16px ${cfg.glow}44`,
                  animation:'gvCardIn 0.4s ease both',
                }}>
                  <span style={{ fontSize:16.5 }}>{cfg.color ? '✦' : '★'}</span>
                  <div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12.4, color:cfg.color }}>{tpl.name}</div>
                    <RarityBadge rarity={tpl.rarity} size="xs" />
                  </div>
                  {r.isNew && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#4ade80', fontWeight:800 }}>NEW</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton fermer */}
      <button onClick={onClose} className="btn-primary"
        style={{ padding:'12px 40px', fontSize:14.4, letterSpacing:2 }}>
        CONTINUER
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   GACHA REVEAL OVERLAY — main orchestrator
───────────────────────────────────────────────────────────────── */
function GachaRevealOverlay({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const [phase, setPhase]         = useState<'portal' | 'cards' | 'summary'>('portal');
  const [autoFlip, setAutoFlip]   = useState(false);
  const [allFlipped, setAllFlipped] = useState(false);
  const flippedCount = useRef(0);

  const handlePortalDone = useCallback(() => {
    setPhase('cards');
    // Début du flip auto séquentiel après 300ms
    setTimeout(() => setAutoFlip(true), 300);
  }, []);

  // Quand toutes les cartes sont retournées → montrer résumé
  const totalCards = results.length;
  useEffect(() => {
    if (!autoFlip) return;
    // Délai total = dernière carte + animation flip
    const lastDelay = (totalCards - 1) * 120 + 900;
    const t = setTimeout(() => setAllFlipped(true), lastDelay);
    return () => clearTimeout(t);
  }, [autoFlip, totalCards]);

  return (
    <div
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(2,1,10,0.96)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:32,
      }}
    >
      {/* Fond animé */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.08) 0%, transparent 65%)',
      }} />

      {/* ── PHASE : PORTAIL ── */}
      {phase === 'portal' && (
        <InvocationPortal onDone={handlePortalDone} />
      )}

      {/* ── PHASE : CARTES ── */}
      {phase === 'cards' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28, padding:'0 24px', width:'100%', maxWidth:1100 }}>

          {/* Titre */}
          <div style={{
            fontFamily:'var(--f-title)', fontSize:13.4, color:'var(--purple-glow)',
            letterSpacing:4, fontWeight:700, opacity:0.7,
            animation:'gvFadeUp 0.4s ease',
          }}>
            {results.length === 1 ? '✦ TIRAGE UNIQUE' : `✦ INVOCATION ×${results.length}`}
          </div>

          {/* Cartes (scrollable for large pulls) */}
          <div style={{ width:'100%', maxWidth:1100 }}>
            <div style={{
              maxHeight: results.length > 30 ? '62vh' : '48vh',
              overflowY: results.length > 5 ? 'auto' : 'visible',
              padding: results.length > 5 ? '12px' : 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                display:'flex', flexWrap:'wrap', gap:results.length > 5 ? 10 : 14,
                justifyContent:'center', alignItems:'flex-start',
              }}>
                {results.map((res, i) => (
                  <FlipCard
                    key={i}
                    res={res}
                    index={i}
                    total={results.length}
                    autoFlip={autoFlip}
                    delay={i * 120}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display:'flex', gap:12, animation:'gvFadeUp 0.4s ease 0.3s both' }}>
            {!autoFlip && (
              <button onClick={() => setAutoFlip(true)}
                style={{
                  fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, letterSpacing:1,
                  color:'#c084fc', background:'rgba(168,85,247,0.12)',
                  border:'1px solid rgba(168,85,247,0.4)', borderRadius:8,
                  padding:'11px 28px', cursor:'pointer',
                }}>✦ RÉVÉLER TOUT</button>
            )}
            {allFlipped && (
              <button onClick={() => setPhase('summary')}
                className="btn-primary"
                style={{ padding:'11px 28px', fontSize:13.4, letterSpacing:1 }}>
                VOIR LE RÉSUMÉ →
              </button>
            )}
            <button onClick={onClose}
              style={{
                fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4,
                color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                padding:'11px 24px', cursor:'pointer',
              }}>FERMER ✕</button>
          </div>
        </div>
      )}

      {/* ── PHASE : RÉSUMÉ ── */}
      {phase === 'summary' && (
        <PullSummary results={results} onClose={onClose} />
      )}

      <style>{`
        @keyframes gvCardIn {
          from { opacity:0; transform:translateY(60px) scale(0.85) rotate(-3deg); }
          to   { opacity:1; transform:translateY(0)    scale(1)    rotate(0deg);  }
        }
        @keyframes gvFadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gvGlowPulse {
          0%,100% { opacity:0.6; }
          50%     { opacity:1; }
        }
        @keyframes gvUltraPulse {
          0%,100% { box-shadow: 0 0 0 2px var(--c), 0 0 50px var(--g), 0 0 100px var(--g44); }
          50%     { box-shadow: 0 0 0 3px var(--c), 0 0 80px var(--g), 0 0 160px var(--g44); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
export function GachaPage() {
  const { nekoGems, pullSingle, pullMulti, pullMulti100, collection, maxPalierReached } = useGameStore();
  const [results,     setResults]     = useState<Res[]>([]);
  const [pulling,     setPulling]     = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPool,    setShowPool]    = useState(false);
  // Taux dynamiques calculés pour le palier max du joueur
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
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      {showOverlay && <GachaRevealOverlay results={results} onClose={handleClose} />}

      <div style={{ maxWidth:'820px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'24px' }}>

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
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr 1fr', gap:12, alignItems:'stretch' }}>
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
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', minWidth:50 }}>→ {gate.rateAtMax}% max</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pool */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:1.5, marginBottom:10 }}>TOUS LES PERSONNAGES</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
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

      </div>
    </div>
  );
}
