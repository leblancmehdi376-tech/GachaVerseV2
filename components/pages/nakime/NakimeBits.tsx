'use client';
// Petits éléments partagés par les écrans du Château de Nakime.
import type { ReactNode } from 'react';
import { PixelSprite } from '@/components/ui/PixelSprite';
import { PalierBg } from '@/components/game/battle-zone/PalierBg';
import { ENEMY_SPRITES_ASSET_VERSION } from '@/lib/game/enemies';
import { AFFINITY_CONFIG, type Affinity } from '@/lib/game/affinities';
import { NAKIME_RELICS, RELIC_TIER_INFO, ROLE_INFO, type NakimeRole } from '@/lib/game/nakime';

// Entrées illimitées en local (voir NAKIME_UNLIMITED_ENTRIES) : affichées « ∞ ».
export const fmtEntries = (n: number) => (Number.isFinite(n) ? String(n) : '∞');

export function EnemySprite({ src, name, size }: { src?: string; name: string; size: number }) {
  if (!src) return <span style={{ fontSize: size * 0.7, lineHeight: 1 }}>👹</span>;
  return <PixelSprite src={src} alt={name} size={size} assetVersion={ENEMY_SPRITES_ASSET_VERSION} />;
}

/** Fond du monde de l'acte (image du palier), assombri pour la lisibilité. */
export function WorldBackdrop({ palier, children, className = '' }: { palier: number; children: ReactNode; className?: string }) {
  return (
    <div className={`nk-backdrop ${className}`}>
      <div className="nk-backdrop__bg" aria-hidden>
        <PalierBg palier={palier} gradient="linear-gradient(180deg,#0a0014,#050009)" />
        <div className="nk-backdrop__shade" />
      </div>
      <div className="nk-backdrop__content">{children}</div>
    </div>
  );
}

export function RoleTag({ role, short = false }: { role: NakimeRole; short?: boolean }) {
  const r = ROLE_INFO[role];
  return <span className="nk-tag" style={{ color: r.color, borderColor: `${r.color}66` }}>{r.icon}{short ? '' : ` ${r.label}`}</span>;
}

export function TypeTag({ affinity, short = false }: { affinity: Affinity; short?: boolean }) {
  const a = AFFINITY_CONFIG[affinity];
  return <span className="nk-tag" style={{ color: a.color, borderColor: `${a.color}66` }}>{a.icon}{short ? '' : ` ${a.label}`}</span>;
}

/** Carte de relique (choix de récompense, boutique, liste des reliques possédées). */
export function RelicCard({ id, children, compact = false }: { id: string; children?: ReactNode; compact?: boolean }) {
  const r = NAKIME_RELICS[id];
  if (!r) return null;
  const tier = RELIC_TIER_INFO[r.tier];
  return (
    <div className={`nk-relic${compact ? ' is-compact' : ''}`} style={{ ['--tier' as string]: tier.color }}>
      <span className="nk-relic__icon">{r.icon}</span>
      <div className="nk-relic__body">
        <b>{r.name}</b>
        {!compact && <span className="nk-relic__tier">Relique {tier.label.toLowerCase()}</span>}
        <span>{r.text}</span>
      </div>
      {children}
    </div>
  );
}
