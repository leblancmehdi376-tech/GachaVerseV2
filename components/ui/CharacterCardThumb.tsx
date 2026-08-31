'use client';
import { Rarity, RARITY_CONFIG, CardEdition } from '@/types/game';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';
import { getCharacterById } from '@/lib/game/characters';
import { useSpoilerStore, getSafeFormIndex } from '@/store/spoilerStore';
import { EDITION_CONFIG } from '@/lib/game/editions';

interface Props {
  templateId: string;
  formIndex?: number;
  name: string;
  rarity: Rarity;
  edition?: CardEdition;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

// Carte de personnage (/sprites/cards/[id].*) avec repli en cascade :
// carte de la forme évoluée -> carte de base -> pastille de couleur avec initiales.
// À chaque étape, plusieurs extensions sont essayées (.png/.webp/.jpg/.jpeg) au cas
// où un fichier aurait été renommé sans être réellement converti.
//
// Anti-spoil : si l'univers du personnage est marqué "non vu" dans les
// Paramètres, on n'affiche jamais l'art de sa forme la plus récente — on reste
// bloqué sur la forme précédente, même après évolution (le nom, lui, reste réel).
//
// Éditions "shiny" (Or/Diamant) : halo + reflet animé + badge dans le coin.
export function CharacterCardThumb({ templateId, formIndex = 0, name, rarity, edition = 'base', width = 64, height = 88, style }: Props) {
  const cfg = RARITY_CONFIG[rarity];
  const ed  = EDITION_CONFIG[edition];
  const isShiny = edition !== 'base';

  // Abonnement au store anti-spoil pour re-render si la case est cochée/décochée en direct.
  useSpoilerStore(s => s.protectedUniverses);
  const universe = getCharacterById(templateId)?.universe ?? '';
  const safeFormIndex = getSafeFormIndex(universe, formIndex);

  const formCandidates = safeFormIndex > 0 ? buildImageCandidates(`/sprites/cards/${templateId}_evo${safeFormIndex}`) : [];
  const baseCandidates  = buildImageCandidates(`/sprites/cards/${templateId}`);
  const candidates = [...formCandidates, ...baseCandidates];

  const { src, failed, onError } = useFallbackImage(candidates);

  const shinyBorder = isShiny ? `2px solid ${ed.color}` : undefined;
  const shinyShadow = isShiny ? `0 0 18px ${ed.glow}aa, 0 0 34px ${ed.glow}55` : undefined;

  const content = (failed || !src) ? (
    <div style={{
      width, height, borderRadius:8, flexShrink:0,
      background:`radial-gradient(circle at 35% 35%, ${cfg.color}33, ${cfg.color}0a)`,
      border: shinyBorder ?? `2px solid ${cfg.color}55`,
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow: shinyShadow ?? `0 0 16px ${cfg.glow}33, inset 0 0 12px ${cfg.color}11`,
      ...style,
    }}>
      <span style={{ fontFamily:'var(--f-ui)', fontWeight:900, fontSize:Math.round(width*0.32), color:cfg.color, lineHeight:1 }}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src} alt={name} width={width} height={height}
      style={{
        borderRadius:8, objectFit:'cover', display:'block', flexShrink:0,
        border: shinyBorder ?? `2px solid ${cfg.color}66`,
        boxShadow: shinyShadow ?? `0 0 12px ${cfg.glow}33`,
        ...style,
      }}
      onError={onError}
    />
  );

  if (!isShiny) return content;

  // Emballage avec halo pulsé + reflet balayant + badge d'édition.
  // Reprend la largeur/hauteur du style passé par l'appelant (ex: 100%) si présentes,
  // sinon les props numériques par défaut — sinon le badge en coin peut se retrouver
  // hors des dimensions réellement affichées et être rogné par un ancêtre overflow:hidden.
  return (
    <div style={{ position:'relative', width: style?.width ?? width, height: style?.height ?? height, flexShrink:0, borderRadius:8, overflow:'visible' }}>
      {content}
      {/* Reflet animé qui balaie la carte */}
      <div style={{
        position:'absolute', inset:0, borderRadius:8, overflow:'hidden', pointerEvents:'none',
      }}>
        <div style={{
          position:'absolute', top:0, bottom:0, width:'40%',
          background:`linear-gradient(90deg, transparent, ${ed.color}66, transparent)`,
          animation:'shimmerSlide 2.4s ease-in-out infinite',
        }} />
      </div>
      {/* Halo pulsé */}
      <div style={{
        animation:'editionPulse 1.8s ease-in-out infinite',
      }} />
      {/* Badge d'édition */}
      <div style={{
        position:'absolute', top:-6, right:-6, zIndex:2,
        width:Math.max(16, Math.round(width*0.22)), height:Math.max(16, Math.round(width*0.22)),
        borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
        background:`radial-gradient(circle at 35% 30%, #fff, ${ed.color})`,
        border:`1.5px solid ${ed.color}`, boxShadow:`0 0 10px ${ed.glow}`,
        fontSize:Math.max(9, Math.round(width*0.13)),
      }}>
        {edition === 'diamond' ? '💎' : '✨'}
      </div>
    </div>
  );
}
