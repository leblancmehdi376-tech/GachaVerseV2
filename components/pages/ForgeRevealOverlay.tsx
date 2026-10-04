'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_CONFIG, RARITY_FRAME_RATIO } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';

// Animation de forge d'un personnage : cercle runique qui se charge autour de
// l'icône de la recette, flash, puis révélation de la carte du perso forgé.
// Clic n'importe où pour fermer (ou passer directement à la révélation).
const CHARGE_MS = 1600;
const SPARKS = 14;

export function ForgeRevealOverlay({ characterId, recipeIcon, onClose }: { characterId: string; recipeIcon: string; onClose: () => void }) {
  const [phase, setPhase] = useState<'charge' | 'reveal'>('charge');
  const tpl = getCharacterById(characterId);

  useEffect(() => {
    const t = setTimeout(() => setPhase('reveal'), CHARGE_MS);
    return () => clearTimeout(t);
  }, []);

  if (!tpl) return null;
  const cfg = RARITY_CONFIG[tpl.rarity];
  const h = 320;
  const w = Math.round(h * RARITY_FRAME_RATIO[tpl.rarity]);

  const handleClick = () => (phase === 'charge' ? setPhase('reveal') : onClose());

  return createPortal(
    <div onClick={handleClick} style={{
      position:'fixed', inset:0, zIndex:9000, cursor:'pointer',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:22,
      background:'radial-gradient(ellipse at center, rgba(40,14,70,0.92), rgba(4,2,10,0.97))',
      animation:'forgeFadeIn 0.25s ease-out',
    }}>
      {phase === 'charge' ? (
        <div style={{ position:'relative', width:220, height:220, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {/* Cercles runiques */}
          <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px dashed rgba(192,132,252,0.55)', animation:'forgeSpin 3s linear infinite' }} />
          <div style={{ position:'absolute', inset:22, borderRadius:'50%', border:'1px solid rgba(232,121,249,0.45)', boxShadow:'0 0 30px rgba(147,51,234,0.35), inset 0 0 30px rgba(147,51,234,0.25)', animation:'forgeSpin 2s linear infinite reverse' }} />
          {/* Étincelles aspirées vers le centre */}
          {Array.from({ length: SPARKS }, (_, i) => (
            <div key={i} style={{
              position:'absolute', left:'50%', top:'50%', width:4, height:4, borderRadius:'50%',
              background: i % 2 ? '#e879f9' : '#c084fc', boxShadow:'0 0 6px #e879f9',
              transform:`rotate(${(360 / SPARKS) * i}deg)`,
              animation:`forgeSpark 0.9s ease-in ${(i % 5) * 0.14}s infinite`,
            }} />
          ))}
          {/* Icône de la recette qui se charge */}
          <div style={{ fontSize:64, animation:`forgeCharge ${CHARGE_MS}ms ease-in forwards` }}>{recipeIcon}</div>
        </div>
      ) : (
        <>
          <div style={{ position:'fixed', inset:0, background:'#fff', pointerEvents:'none', animation:'forgeFlash 0.6s ease-out forwards' }} />
          <div style={{ fontFamily:'var(--f-title)', fontSize:22, letterSpacing:4, color:'#e879f9', textShadow:'0 0 12px rgba(232,121,249,0.6)', animation:'forgeRise 0.5s ease-out both' }}>
            ⚗ RITUEL ACCOMPLI
          </div>
          <div style={{
            position:'relative', width:w, height:h, borderRadius:12, overflow:'hidden',
            boxShadow:`0 0 0 2px ${cfg.color}, 0 0 50px ${cfg.glow}, 0 0 110px ${cfg.glow}55`,
            animation:'forgeCardIn 0.7s cubic-bezier(.2,1.4,.4,1) both',
          }}>
            <CharacterCardThumb
              templateId={tpl.id} name={tpl.name} rarity={tpl.rarity}
              width={w} height={h} frameOverlay
              style={{ border:'none', boxShadow:'none', borderRadius:0, objectFit:'contain' }}
            />
          </div>
          <div style={{ textAlign:'center', animation:'forgeRise 0.5s ease-out 0.3s both' }}>
            <div style={{ fontFamily:'var(--f-title)', fontSize:24, color:cfg.color, letterSpacing:1 }}>{tpl.name}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', marginTop:6 }}>Clique pour continuer</div>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
