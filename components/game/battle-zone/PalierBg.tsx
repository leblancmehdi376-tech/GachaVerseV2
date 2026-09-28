'use client';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';
import { PALIERS } from '@/lib/game/paliers';

// Les visuels de fond n'existent que pour les paliers définis dans PALIERS — au-delà, on
// réutilise le visuel du palier cyclé (même thème/mobs que getPalierConfig).
// Exporté pour le préchargement pendant le splash (GameLayout).
export function getPalierBgCandidates(palier: number): string[] {
  const cycledPalier = ((palier - 1) % PALIERS.length) + 1;
  return buildImageCandidates(`/backgrounds/bg_palier_${cycledPalier}`);
}

export function PalierBg({ palier, gradient }: { palier: number; gradient: string }) {
  const { src, failed, onError } = useFallbackImage(getPalierBgCandidates(palier));
  if (!failed && src) return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" fetchPriority="high"
        onError={onError}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', imageRendering:'pixelated' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.28) 0%,transparent 30%,transparent 55%,rgba(0,0,0,0.6) 100%)' }} />
    </>
  );
  return <div style={{ position:'absolute', inset:0, background:gradient }} />;
}
