'use client';

import { Rarity, RARITY_CONFIG, RARITY_FRAME_SRC, RARITY_FRAME_RATIO, CardEdition } from '@/types/game';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';
import { getCharacterById } from '@/lib/game/characters';
import { getCardBaseName } from '@/lib/game/cardAssets';
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
  frameOverlay?: boolean;
}

// Carte de personnage avec repli en cascade.
// Le cadre superposé est toujours affiché à ses dimensions exactes,
// sans object-fit:cover afin qu'aucune partie de la bordure ne soit rognée.
export function CharacterCardThumb({
  templateId,
  formIndex = 0,
  name,
  rarity,
  edition = 'base',
  width = 64,
  height = 88,
  style,
  frameOverlay = false,
}: Props) {
  const cfg = RARITY_CONFIG[rarity];
  const ed = EDITION_CONFIG[edition];
  const isShiny = edition !== 'base';
  const frameSrc = frameOverlay ? RARITY_FRAME_SRC[rarity] : null;

  // Abonnement au store anti-spoil pour re-render si nécessaire.
  useSpoilerStore(s => s.protectedUniverses);

  const tpl = getCharacterById(templateId);
  const universe = tpl?.universe ?? '';
  const safeFormIndex = getSafeFormIndex(universe, formIndex);

  // Convention "NomDuPerso_Synergie_EvoN".
  const cardBaseName = tpl ? getCardBaseName(tpl, safeFormIndex) : null;
  const legacyBase =
    safeFormIndex > 0
      ? `${templateId}_evo${safeFormIndex}`
      : templateId;

  const candidates = [
    ...(cardBaseName
      ? buildImageCandidates(
          `/sprites/new_cards_processed/${cardBaseName}`
        )
      : []),
    ...(cardBaseName
      ? buildImageCandidates(`/sprites/cards/${cardBaseName}`)
      : []),
    ...buildImageCandidates(`/sprites/cards/${legacyBase}`),
  ];

  const { src, failed, onError } = useFallbackImage(candidates);

  const shinyBorder = isShiny
    ? `2px solid ${ed.color}`
    : undefined;

  // Le contenu remplit exactement la boîte définie par le cadre.
  const frameFillStyle: React.CSSProperties | null = frameSrc
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
      }
    : null;

  const content = failed || !src ? (
    <div
      style={{
        ...(frameFillStyle ?? { width, height }),
        borderRadius: 8,
        flexShrink: frameSrc ? undefined : 0,
        background: `radial-gradient(circle at 35% 35%, ${cfg.color}33, ${cfg.color}0a)`,
        border: shinyBorder ?? `2px solid ${cfg.color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-ui)',
          fontWeight: 900,
          fontSize: Math.round(width * 0.32),
          color: cfg.color,
          lineHeight: 1,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      {...(frameSrc ? {} : { width, height })}
      style={{
        ...(frameFillStyle ?? {}),
        // Tailwind Preflight force `img { height: auto }`, qui ignore les
        // attributs HTML width/height ci-dessus — sans le height:'100%' de
        // frameFillStyle, le portrait reprend sa hauteur naturelle et peut
        // finir plus court que la boîte du cadre (aspectRatio du fichier de
        // cadre), laissant une bande transparente en bas de la carte.
        borderRadius: 8,
        objectFit: 'cover',
        display: 'block',
        flexShrink: frameSrc ? undefined : 0,
        border: shinyBorder ?? `2px solid ${cfg.color}66`,
      }}
      onError={onError}
    />
  );

  // IMPORTANT :
  // Le framework utilise "fill" et non "cover".
  // "cover" pouvait rogner les coins / le bandeau inférieur.
  const frameImg = frameSrc && (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={frameSrc}
      alt=""
      aria-hidden
      draggable={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        objectPosition: 'center',
        margin: 0,
        padding: 0,
        border: 'none',
        borderRadius: 8,
        pointerEvents: 'none',
        display: 'block',
        zIndex: 10,
      }}
    />
  );

  // Nom placé dans le bandeau du cadre.
  const NAME_IDEAL_CHARS = 10;
  const NAME_MIN_SCALE = 0.62;

  const nameScale = Math.min(
    1,
    Math.max(NAME_MIN_SCALE, NAME_IDEAL_CHARS / name.length)
  );

  const nameOverlay = frameSrc && (
    <div
      style={{
        position: 'absolute',
        left: '15%',
        right: '15%',
        bottom: '7.5%',
        height: '11%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 11,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--f-avallon)',
          color: '#fff',
          fontSize: Math.max(
            9,
            Math.round(width * 0.17 * nameScale)
          ),
          lineHeight: 1,
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          maxWidth: '100%',
          textShadow: `0 0 6px ${cfg.color}, 0 1px 3px rgba(0,0,0,0.9)`,
        }}
      >
        {name}
      </span>
    </div>
  );

  // Quand un cadre est présent, la largeur reste celle demandée
  // et la hauteur est automatiquement calculée à partir du ratio
  // EXACT du fichier de cadre.
  const boxWidth = style?.width ?? width;

  const boxStyle: React.CSSProperties = frameSrc
    ? {
        width: boxWidth,
        aspectRatio: `${RARITY_FRAME_RATIO[rarity]}`,
      }
    : {
        width: boxWidth,
        height: style?.height ?? height,
      };

  if (!isShiny) {
    if (!frameSrc) return content;

    return (
      <div
        style={{
          position: 'relative',
          ...boxStyle,
          flexShrink: 0,
        }}
      >
        {content}
        {frameImg}
        {nameOverlay}
      </div>
    );
  }

  // Version shiny :
  // l'extérieur reste visible pour le badge,
  // l'intérieur contient les effets dans les dimensions exactes du cadre.
  return (
    <div
      style={{
        position: 'relative',
        ...boxStyle,
        flexShrink: 0,
        overflow: 'visible',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {content}
        {frameImg}
        {nameOverlay}

        {/* Reflet animé qui balaie la carte */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '40%',
            background: `linear-gradient(90deg, transparent, ${ed.color}66, transparent)`,
            animation: 'shimmerSlide 2.4s ease-in-out infinite',
            zIndex: 12,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Halo pulsé */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          // cut les corners pour s'aligner parfaitement au cadre, pour correspondre au border-radius du cadre et ne pas déborder sur le badge d'édition.
          borderRadius: 8,
          boxShadow: `0 0 12px ${ed.glow}aa, 0 0 28px ${ed.glow}55`,
          zIndex: 13,
          animation: 'editionPulse 1.8s ease-in-out infinite',
        }}
      />

      {/* Bordure shiny : rendue au-dessus du cadre illustré (celui-ci a
          zIndex:10 et masquerait sinon la bordure posée sur `content`, plus bas
          dans la pile). Pas de boxShadow ici — le glow est déjà porté par le
          "Halo pulsé" juste au-dessus ; en dupliquer un ici (statique, zIndex
          plus haut) l'écrasait visuellement et rendait le pulse invisible. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          border: shinyBorder,
          pointerEvents: 'none',
          zIndex: 15,
        }}
      />

      {/* Badge d'édition — zIndex au-dessus du cadre (10/11) ET des overlays
          externes posés par les pages appelantes (LV/rang, badge "NEW", etc.),
          qui utilisent le même palier (30) pour rester visibles par-dessus. */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          right: -6,
          zIndex: 30,
          width: Math.max(
            16,
            Math.round(width * 0.22)
          ),
          height: Math.max(
            16,
            Math.round(width * 0.22)
          ),
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 35% 30%, #fff, ${ed.color})`,
          border: `1.5px solid ${ed.color}`,
          boxShadow: `0 0 10px ${ed.glow}`,
          fontSize: Math.max(
            9,
            Math.round(width * 0.13)
          ),
        }}
      >
        {edition === 'diamond' ? '💎' : '✨'}
      </div>
    </div>
  );
}