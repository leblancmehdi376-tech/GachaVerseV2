'use client';
import { useState, useEffect, useCallback } from 'react';
import { RARITY_CONFIG } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { CardBackImg } from './CardBackImg';
import { RarityBurst } from './RarityBurst';
import { HIGH_RARITY, ULTRA_RARITY, type Res } from './gachaTypes';

// Single flip card
export function FlipCard({ res, index, total, autoFlip, delay, preReveal }: {
  res: Res; index: number; total: number; autoFlip: boolean; delay: number;
  preReveal?: () => Promise<void>;
}) {
  const [flipped,  setFlipped]  = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [burst,    setBurst]    = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const tpl = getCharacterById(res.templateId);
  const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : RARITY_CONFIG['C'];
  const isHigh  = tpl ? HIGH_RARITY.includes(tpl.rarity)  : false;
  const isUltra = tpl ? ULTRA_RARITY.includes(tpl.rarity) : false;

  const doFlip = useCallback(async () => {
    if (flipped || flipping) return;
    setFlipping(true);
    if (preReveal) {
      // Le flip a déjà été joué dans l'écran de brouillard : on affiche
      // directement le résultat au lieu de rejouer l'animation par-dessus.
      await preReveal();
      setFlipped(true);
      setRevealed(true);
      if (isHigh) setBurst(true);
      return;
    }
    setFlipped(true);
    setTimeout(() => {
      setRevealed(true);
      if (isHigh) setBurst(true);
    }, 340);
  }, [flipped, flipping, isHigh, preReveal]);

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
