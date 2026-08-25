'use client';
import { EventBossDef } from '@/lib/game/eventBoss';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';

export function EventBg({ boss }: { boss: EventBossDef }) {
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

export function BossSprite({ boss, deadStyle }: { boss: EventBossDef; deadStyle: boolean }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(stripKnownExtension(boss.spritePath)));
  if (failed || !src) return (
    <div style={{ width:240, height:320, background:'radial-gradient(circle,#3b0764,#0d0520)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:82.4, filter:'drop-shadow(0 0 20px #c084fc)' }}>👤</span>
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={boss.name}
      style={{ width:240, height:320, objectFit:'contain', imageRendering:'pixelated', filter: deadStyle ? 'grayscale(1) brightness(0.3)' : undefined }}
      onError={onError} />
  );
}
