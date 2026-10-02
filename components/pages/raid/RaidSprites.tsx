'use client';
import { RaidBossDef } from '@/lib/game/raidBoss';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';

export function RaidBg({ boss }: { boss: RaidBossDef }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(boss.bgImagePath));
  if (failed || !src) return <div style={{ position:'absolute', inset:0, background: boss.bgGradient }} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onError={onError}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', imageRendering:'pixelated' }} />
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.2) 30%,rgba(0,0,0,0.3) 60%,rgba(0,0,0,0.85) 100%)' }} />
    </>
  );
}

// Initiales affichées tant que le visuel du boss n'existe pas (ex: "Rokoul & Ayro" -> "RA").
function bossInitials(name: string): string {
  return name.split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function BossSprite({ boss, deadStyle }: { boss: RaidBossDef; deadStyle: boolean }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(stripKnownExtension(boss.spritePath)));
  if (failed || !src) return (
    <div style={{ width:336, height:448, background:'radial-gradient(circle,#3b0764,#0d0520)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontFamily:'var(--f-ui)', fontWeight:900, fontSize:120, color:boss.accentColor, filter:`drop-shadow(0 0 20px ${boss.accentColor})` }}>{bossInitials(boss.name)}</span>
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={boss.name}
      style={{ width:336, height:448, objectFit:'contain', imageRendering:'pixelated', filter: deadStyle ? 'grayscale(1) brightness(0.3)' : undefined }}
      onError={onError} />
  );
}
