'use client';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';
import { PALIERS } from '@/lib/game/paliers';

export function PalierBg({ palier, gradient }: { palier: number; gradient: string }) {
  // Les visuels de fond n'existent que pour les paliers 1..40 — au-delà, on
  // réutilise le visuel du palier cyclé (même thème/mobs que getPalierConfig).
  const cycledPalier = ((palier - 1) % PALIERS.length) + 1;
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(`/backgrounds/bg_palier_${cycledPalier}`));
  if (!failed && src) return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt=""
        onError={onError}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', imageRendering:'pixelated' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.4) 0%,transparent 25%,transparent 60%,rgba(0,0,0,0.85) 100%)' }} />
    </>
  );
  return <div style={{ position:'absolute', inset:0, background:gradient }} />;
}
