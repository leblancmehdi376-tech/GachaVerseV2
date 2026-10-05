'use client';
import { memo, useId } from 'react';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RARITY_CONFIG, type Rarity } from '@/types/game';

export interface PawnChar {
  templateId: string;
  formIndex: number;
  name: string;
  rarity: Rarity;
}

// Figurine chibi : grosse tête ronde (portrait de la carte) à petites
// oreilles de chat, corps en haricot avec écharpe, posée sur un socle
// lumineux aux couleurs de la rareté. Formes douces, sans contour noir.
// `size` = largeur en px ; hauteur = 1,25 × size. Le bas du composant est
// le dessous du socle : le parent le pose sur le centre de la case.
const VB_W = 80, VB_H = 100;
const FACE = { cx: 40, cy: 37, r: 17.5 };
export const PAWN_RATIO = VB_H / VB_W;

export const ChibiPawn = memo(function ChibiPawn({ char, size }: { char: PawnChar | null; size: number }) {
  const id = `pc${useId().replace(/:/g, '')}`;
  const color = char ? RARITY_CONFIG[char.rarity].color : '#a78bfa';
  const glow = char ? RARITY_CONFIG[char.rarity].glow : '#7c3aed';
  const h = size * PAWN_RATIO;
  const u = size / VB_W;
  const face = FACE.r * 2 * u;
  const line = 'rgba(27,16,55,0.45)';

  return (
    <div style={{ position: 'relative', width: size, height: h }}>
      <svg width={size} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden>
        <defs>
          <radialGradient id={`${id}b`} cx=".32" cy=".25" r=".9">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".3" stopColor={color} />
            <stop offset="1" stopColor={glow} />
          </radialGradient>
          <radialGradient id={`${id}g`} cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor={glow} stopOpacity=".75" />
            <stop offset="1" stopColor={glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}p`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5b47b8" />
            <stop offset="1" stopColor="#2a1d5c" />
          </linearGradient>
        </defs>
        {/* Halo au sol + socle */}
        <ellipse cx="40" cy="91" rx="34" ry="9" fill={`url(#${id}g)`} />
        <path d="M17 86 v4 a23 6.5 0 0 0 46 0 v-4" fill="#221650" />
        <ellipse cx="40" cy="86" rx="23" ry="6.5" fill={`url(#${id}p)`} stroke={color} strokeWidth="1.6" />
        <ellipse cx="40" cy="85.2" rx="17" ry="4" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1" />
        {/* Pieds */}
        <ellipse cx="33.5" cy="84" rx="5.5" ry="3.2" fill="#2b2160" />
        <ellipse cx="46.5" cy="84" rx="5.5" ry="3.2" fill="#2b2160" />
        {/* Bras */}
        <ellipse cx="25.5" cy="71" rx="4" ry="6.5" transform="rotate(22 25.5 71)" fill={`url(#${id}b)`} stroke={line} strokeWidth="1" />
        <ellipse cx="54.5" cy="71" rx="4" ry="6.5" transform="rotate(-22 54.5 71)" fill={`url(#${id}b)`} stroke={line} strokeWidth="1" />
        {/* Corps en haricot */}
        <path d="M27.5 68 C27.5 58.5 52.5 58.5 52.5 68 L53.5 78.5 C53.5 85.5 26.5 85.5 26.5 78.5 Z" fill={`url(#${id}b)`} stroke={line} strokeWidth="1.1" />
        <ellipse cx="35" cy="70" rx="3.2" ry="5.5" fill="#fff" opacity=".3" />
        {/* Écharpe */}
        <path d="M29 60.5 Q40 65.5 51 60.5 L51.5 64.5 Q40 69.5 28.5 64.5 Z" fill="#fff" />
        <path d="M46 65 l5 8.5 l-4.5 -0.8 l-2.5 -6.5 z" fill="#fff" />
        <path d="M29 62.5 Q40 67.5 51 62.5" fill="none" stroke={color} strokeWidth="1.2" />
        {/* Oreilles */}
        <path d="M23.5 27 L26 10.5 L36 19 Z" fill={`url(#${id}b)`} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        <path d="M56.5 27 L54 10.5 L44 19 Z" fill={`url(#${id}b)`} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        <path d="M27 23 L28 15.5 L33 19.5 Z" fill="#fbcfe8" />
        <path d="M53 23 L52 15.5 L47 19.5 Z" fill="#fbcfe8" />
        {/* Tête */}
        <circle cx={FACE.cx} cy={FACE.cy} r="21.5" fill={`url(#${id}b)`} stroke={line} strokeWidth="1.1" />
        <circle cx={FACE.cx} cy={FACE.cy} r={FACE.r + 1.2} fill="#fff" />
      </svg>
      {/* Visage : portrait de la carte (ou petit chat par défaut) */}
      <div style={{
        position: 'absolute', left: (FACE.cx - FACE.r) * u, top: (FACE.cy - FACE.r) * u, width: face, height: face,
        borderRadius: '50%', overflow: 'hidden', background: '#ffe4d1',
      }}>
        {char ? (
          // Cadrage centré vers le tiers haut de la carte, là où se trouve le
          // visage sur la plupart des illustrations.
          <div style={{ position: 'absolute', left: -face * 0.25, top: -face * 0.16 }}>
            <CharacterCardThumb templateId={char.templateId} formIndex={char.formIndex} name={char.name} rarity={char.rarity}
              width={face * 1.5} height={face * 1.78} style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }} />
          </div>
        ) : <NekoFace />}
        <div style={{ position: 'absolute', left: '14%', top: '7%', width: '44%', height: '24%', borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0))', transform: 'rotate(-20deg)' }} />
      </div>
    </div>
  );
});

function NekoFace() {
  return (
    <svg viewBox="0 0 50 50" width="100%" height="100%" aria-hidden>
      <rect width="50" height="50" fill="#ffe4d1" />
      <ellipse cx="17" cy="25" rx="3.6" ry="4.8" fill="#1b1037" /><ellipse cx="33" cy="25" rx="3.6" ry="4.8" fill="#1b1037" />
      <circle cx="18.2" cy="23.2" r="1.3" fill="#fff" /><circle cx="34.2" cy="23.2" r="1.3" fill="#fff" />
      <path d="M22 32 q3 3 3 0 q0 3 3 0" fill="none" stroke="#1b1037" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="11" cy="32" rx="4" ry="2.4" fill="#f9a8d4" opacity=".8" /><ellipse cx="39" cy="32" rx="4" ry="2.4" fill="#f9a8d4" opacity=".8" />
    </svg>
  );
}
