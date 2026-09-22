'use client';
import type { ReactNode } from 'react';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getPalierAuraTier, getAvatarGlowPx } from '@/lib/game/avatarAura';
import type { Rarity } from '@/types/game';

export interface AvatarChampion {
  templateId: string;
  formIndex: number;
  name: string;
  rarity: Rarity;
}

interface AvatarVisualProps {
  size?: number;
  champion: AvatarChampion | null;
  /** Lettre affichée quand aucun champion n'est sélectionné/possédé. */
  fallbackLetter: string;
  maxPalierReached: number;
  /** Pulsation "joueur accompli" — nécessite le nombre de succès débloqués,
      indisponible pour les AUTRES joueurs (jamais synchronisé sur Firestore,
      voir INTENTIONALLY_TRANSIENT_FIELDS), donc false par défaut. */
  pulse?: boolean;
  tooltip?: string;
  /** Overlay positionné en absolute par-dessus l'avatar (ex: badge de synchro). */
  children?: ReactNode;
}

// Rendu pur de l'avatar joueur (image de carte + aura de palier) — sans
// dépendance au store, pour pouvoir afficher aussi bien LE joueur courant
// (voir PlayerAvatar, qui lit gameStore et délègue ici) que les AUTRES
// joueurs du classement (LeaderboardPage, à partir des données Firestore
// déjà synchronisées).
export function AvatarVisual({ size = 36, champion, fallbackLetter, maxPalierReached, pulse = false, tooltip, children }: AvatarVisualProps) {
  const aura = getPalierAuraTier(maxPalierReached);
  const glowPx = getAvatarGlowPx(aura, size);
  const radius = size >= 60 ? 16 : 8;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        title={tooltip}
        style={{
          width: size, height: size, borderRadius: radius, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: champion ? undefined : 'linear-gradient(135deg,#3b0764,#6d28d9)',
          border: `2px solid ${aura.borderColor}`,
          boxShadow: `0 0 ${glowPx}px ${aura.glowColor}`,
          animation: pulse ? 'rarityPulse 2.4s ease-in-out infinite' : undefined,
        }}
      >
        {champion ? (
          <CharacterCardThumb
            templateId={champion.templateId}
            formIndex={champion.formIndex}
            name={champion.name}
            rarity={champion.rarity}
            width={size}
            height={size}
          />
        ) : (
          <span style={{ fontFamily: 'var(--f-title)', fontWeight: 900, fontSize: size * 0.45, color: '#e2d9ff' }}>
            {fallbackLetter}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
