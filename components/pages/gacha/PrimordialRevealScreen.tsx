'use client';
import { useState, useEffect } from 'react';
import { RARITY_CONFIG } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { REVEAL_TEASER_MS, FLIP_DELAY_MS, getCharacterQuote, getCharacterSoundPath } from '@/lib/game/gachaReveal';
import { CardBackImg } from './CardBackImg';
import type { Res } from './gachaTypes';

// Écran de brouillard — teaser affiché juste avant qu'une carte
// Primordiale/Transcendante ne se retourne
export function PrimordialRevealScreen({ res, onDone }: { res: Res; onDone: () => void }) {
  const tpl = getCharacterById(res.templateId);
  const rarity: 'P' | 'T' = tpl?.rarity === 'T' ? 'T' : 'P';
  const cfg = RARITY_CONFIG[rarity];
  const quote = getCharacterQuote(res.templateId, rarity);
  const [visible,  setVisible]  = useState(false);
  const [flipped,  setFlipped]  = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const tIn      = setTimeout(() => setVisible(true),  20);
    // Carte de dos + phrase d'abord, on laisse le temps de lire avant de retourner.
    const tFlip    = setTimeout(() => setFlipped(true),   FLIP_DELAY_MS);
    const tReveal  = setTimeout(() => setRevealed(true),  FLIP_DELAY_MS + 700);
    const tOut     = setTimeout(onDone, REVEAL_TEASER_MS);

    let audio: HTMLAudioElement | null = null;
    try {
      audio = new Audio(getCharacterSoundPath(res.templateId));
      audio.volume = 0.8;
      audio.play().catch(() => {});
    } catch { /* pas de son disponible pour ce personnage */ }

    return () => {
      clearTimeout(tIn); clearTimeout(tFlip); clearTimeout(tReveal); clearTimeout(tOut);
      audio?.pause();
    };
  }, [res.templateId, onDone]);

  // Même ratio que les cartes du tirage (306:517).
  const CARD_RATIO = 306 / 517;
  const h = 300;
  const w = Math.round(h * CARD_RATIO);

  return (
    <div
      onClick={onDone}
      style={{
        position:'absolute', inset:0, zIndex:50, overflow:'hidden', cursor:'pointer',
        background:'#050208',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        opacity: visible ? 1 : 0, transition:'opacity 0.6s ease',
      }}
    >
      {/* Brouillard */}
      <div style={{ position:'absolute', inset:'-15%', filter:'blur(60px)', pointerEvents:'none' }}>
        <div style={{
          position:'absolute', width:'60%', height:'60%', left:'10%', top:'15%', borderRadius:'50%',
          background:`radial-gradient(circle, ${cfg.color}55, transparent 70%)`,
          animation:'gvFogDrift1 9s ease-in-out infinite',
        }} />
        <div style={{
          position:'absolute', width:'55%', height:'55%', right:'8%', bottom:'12%', borderRadius:'50%',
          background:`radial-gradient(circle, ${cfg.glow}44, transparent 70%)`,
          animation:'gvFogDrift2 11s ease-in-out infinite',
        }} />
        <div style={{
          position:'absolute', width:'40%', height:'40%', left:'32%', top:'32%', borderRadius:'50%',
          background:`radial-gradient(circle, ${cfg.color}33, transparent 70%)`,
          animation:'gvFogDrift1 7s ease-in-out infinite reverse',
        }} />
      </div>

      <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', alignItems:'center', padding:'0 40px' }}>
        <div style={{
          fontFamily:'var(--f-ui)', fontSize:13, letterSpacing:4, fontWeight:700,
          color:cfg.color, opacity:0.85, marginBottom:20, textAlign:'center',
          animation:'gvGlowPulse 2s ease-in-out infinite',
        }}>
          {rarity === 'T' ? '✦ UNE PRÉSENCE TRANSCENDANTE ÉMERGE ✦' : '✦ UNE FORCE PRIMORDIALE ÉMERGE ✦'}
        </div>

        {/* Carte 3D : dos → face, comme les cartes du tirage */}
        <div style={{ position:'relative', width:w, height:h, perspective:'1000px' }}>
          <div style={{
            position:'relative', width:'100%', height:'100%',
            transformStyle:'preserve-3d',
            transition:'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>
            {/* DOS */}
            <div style={{
              position:'absolute', inset:0, backfaceVisibility:'hidden',
              borderRadius:14, overflow:'hidden',
              boxShadow:`0 0 0 2px ${cfg.color}, 0 0 40px ${cfg.glow}aa, 0 10px 40px rgba(0,0,0,0.8)`,
            }}>
              <CardBackImg rarity={rarity} />
            </div>

            {/* FACE */}
            <div style={{
              position:'absolute', inset:0, backfaceVisibility:'hidden',
              transform:'rotateY(180deg)', borderRadius:14, overflow:'hidden',
              boxShadow:`0 0 0 2px ${cfg.color}, 0 0 50px ${cfg.glow}, 0 0 100px ${cfg.glow}44, 0 10px 40px rgba(0,0,0,0.8)`,
              animation: revealed ? 'gvUltraPulse 2s ease-in-out infinite' : undefined,
            }}>
              {tpl && (
                <>
                  <CharacterCardThumb
                    templateId={res.templateId} name={tpl.name} rarity={tpl.rarity} edition={res.edition}
                    width={w} height={h}
                    style={{ border:'none', boxShadow:'none', borderRadius:0, objectFit:'contain' }}
                  />
                  {revealed && (
                    <div style={{
                      position:'absolute', bottom:0, left:0, right:0,
                      padding:'18px 10px 12px',
                      background:'linear-gradient(0deg,rgba(0,0,0,0.94) 0%,transparent 100%)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      animation:'gvFadeUp 0.35s ease',
                    }}>
                      <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:15, color:'white', textAlign:'center' }}>{tpl.name}</span>
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

        <div style={{
          marginTop:22, textAlign:'center', maxWidth:640,
          fontFamily:'var(--f-title)', fontSize:22, fontWeight:900, color:'white', lineHeight:1.5,
          textShadow:`0 0 30px ${cfg.glow}, 0 0 60px ${cfg.glow}88`,
        }}>
          « {quote} »
        </div>

        <div style={{ marginTop:24, fontFamily:'var(--f-ui)', fontSize:11, letterSpacing:1, color:'rgba(255,255,255,0.3)' }}>
          cliquer pour passer
        </div>
      </div>

      <style>{`
        @keyframes gvFogDrift1 {
          0%,100% { transform:translate(-6%,-4%) scale(1); }
          50%     { transform:translate(6%,4%) scale(1.18); }
        }
        @keyframes gvFogDrift2 {
          0%,100% { transform:translate(5%,3%) scale(1.1); }
          50%     { transform:translate(-5%,-5%) scale(1); }
        }
      `}</style>
    </div>
  );
}
