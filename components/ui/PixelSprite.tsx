'use client';
import { Rarity, RARITY_CONFIG } from '@/types/game';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';

interface Props {
  src: string; alt: string; size?: number;
  rarity?: Rarity; className?: string; style?: React.CSSProperties;
  assetVersion?: number;   // ajouté en ?v= pour contourner le cache après remplacement du fichier
  priority?: boolean;      // image principale visible d'emblée (ex: ennemi) : chargement immédiat et prioritaire
}

function Placeholder({ size, rarity, alt }: { size: number; rarity?: Rarity; alt: string }) {
  const cfg   = rarity ? RARITY_CONFIG[rarity] : null;
  const color = cfg?.color ?? '#6e6090';
  const glow  = cfg?.glow  ?? '#6e6090';
  const label = alt.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size,
      background: `radial-gradient(circle at 35% 35%, ${color}33, ${color}0a)`,
      border: `2px solid ${color}55`, borderRadius: '6px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '4px',
      boxShadow: `0 0 16px ${glow}33, inset 0 0 12px ${color}11`,
    }}>
      <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:Math.max(14, size*0.28), color, lineHeight:1, opacity:0.9 }}>{label}</span>
      {size >= 56 && rarity && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:Math.max(14, size*0.14), color, opacity:0.6, letterSpacing:1 }}>{rarity}</span>}
    </div>
  );
}

// Liste d'URL candidates (cascade d'extensions + ?v=) — partagée avec le
// préchargement du sprite ennemi pendant le splash (GameLayout).
export function getSpriteCandidates(src: string, assetVersion?: number): string[] {
  const lower = src.toLowerCase();
  const skipCascade = lower.endsWith('.gif') || lower.endsWith('.svg');
  const base = skipCascade ? [src] : buildImageCandidates(stripKnownExtension(src));
  return assetVersion ? base.map(c => `${c}?v=${assetVersion}`) : base;
}

export function PixelSprite({ src, alt, size = 64, rarity, className = '', style, assetVersion, priority }: Props) {
  // GIF/SVG : pas de cascade d'extension (formats déjà explicites et non interchangeables)
  const isGif = src.toLowerCase().endsWith('.gif');
  const candidates = getSpriteCandidates(src, assetVersion);
  const { src: resolvedSrc, failed, onError } = useFallbackImage(candidates);

  if (failed || !resolvedSrc) return <Placeholder size={size} rarity={rarity} alt={alt} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc} alt={alt} width={size} height={size}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={className}
      style={{
        imageRendering: isGif ? 'auto' : 'pixelated',
        objectFit: 'contain',
        display: 'block',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...style,
      }}
      onError={onError}
    />
  );
}
