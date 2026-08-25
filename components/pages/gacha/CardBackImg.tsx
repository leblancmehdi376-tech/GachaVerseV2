'use client';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';

export function CardBackImg({ rarity }: { rarity?: Rarity }) {
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
