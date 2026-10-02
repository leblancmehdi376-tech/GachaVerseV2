'use client';
import { useState, type CSSProperties } from 'react';
import type { EquipmentDef } from '@/lib/game/items';

// Icône SVG d'un équipement, générée par scripts/generate-equipment-icons.mjs
// dans public/sprites/equipment/ :
//  - objets génériques : une icône par emplacement × rareté ;
//  - objets personnalisés (bonusFor) : une icône dessinée par objet.
// Si le fichier manque (nouvel objet pas encore dessiné), repli sur l'emoji.
// Là où seul du texte est possible (<option>, toasts), continuer d'utiliser item.icon.

/** Chemin du SVG de l'objet. */
export function getEquipmentIconSrc(item: Pick<EquipmentDef, 'id' | 'slot' | 'rarity' | 'bonusFor'>): string {
  return item.bonusFor ? `/sprites/equipment/${item.id}.svg` : `/sprites/equipment/${item.slot}_${item.rarity}.svg`;
}

export function EquipmentIcon({ item, size, className, style }: {
  item: EquipmentDef;
  /** Côté de l'icône en px (l'emoji de repli est un peu plus petit pour un encombrement visuel équivalent). */
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const src = getEquipmentIconSrc(item);
  // Mémorise l'échec par source : un changement d'objet retente le chargement.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return <span className={className} aria-hidden style={{ fontSize: Math.round(size * 0.75), lineHeight: 1, ...style }}>{item.icon}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden width={size} height={size} draggable={false} decoding="async" loading="lazy"
      onError={() => setFailedSrc(src)}
      className={className} style={{ display: 'block', flexShrink: 0, ...style }} />
  );
}
