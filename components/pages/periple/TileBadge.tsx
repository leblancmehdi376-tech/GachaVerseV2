'use client';
import { useId } from 'react';
import { TILE_INFO, type TileKind } from '@/lib/game/periple';
import { PropDefs, TileProp } from './TileProps';

// Vignette d'une case : petite dalle isométrique et son objet, pour la
// légende, l'en-tête des mini-jeux et l'info de case sélectionnée.
export function TileBadge({ kind, size = 56 }: { kind: TileKind; size?: number }) {
  const id = `ptb${useId().replace(/:/g, '')}`;
  const info = TILE_INFO[kind];
  return (
    <svg width={size} height={size} viewBox="-34 -52 68 68" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <PropDefs />
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset=".3" stopColor={info.top} /><stop offset="1" stopColor={info.side} />
        </linearGradient>
      </defs>
      <path d="M-30 0 L0 15 L0 23 L-30 8 Z" fill={info.side} stroke="#1b1037" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M30 0 L0 15 L0 23 L30 8 Z" fill={info.side} style={{ filter: 'brightness(0.7)' }} stroke="#1b1037" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M0 -15 L30 0 L0 15 L-30 0 Z" fill={`url(#${id})`} stroke="#1b1037" strokeWidth="1.4" strokeLinejoin="round" />
      <g transform="translate(0 4) scale(0.9)"><TileProp kind={kind} /></g>
    </svg>
  );
}
