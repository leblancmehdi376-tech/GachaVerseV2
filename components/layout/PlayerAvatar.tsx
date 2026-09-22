'use client';
import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { hasAvatarPulse } from '@/lib/game/avatarAura';
import { AvatarVisual } from '@/components/layout/AvatarVisual';

interface PlayerAvatarProps {
  size?: number;
  /** Overlay positionné en absolute par-dessus l'avatar (ex: badge de synchro). */
  children?: ReactNode;
  /** Survole personnalisé — sinon nom du champion sélectionné ou pseudo. */
  tooltip?: string;
}

// Avatar DU JOUEUR COURANT (header, page Profil, onglet Options) — lit le
// choix et la progression depuis gameStore et délègue le rendu à
// AvatarVisual (composant pur, réutilisé aussi par LeaderboardPage pour les
// AUTRES joueurs à partir des données Firestore).
export function PlayerAvatar({ size = 36, children, tooltip }: PlayerAvatarProps) {
  const { username, selectedAvatarChampionId, collection, maxPalierReached, unlockedCount } = useGameStore(useShallow(s => ({
    username: s.username,
    selectedAvatarChampionId: s.selectedAvatarChampionId,
    collection: s.collection,
    maxPalierReached: s.maxPalierReached,
    unlockedCount: s.unlockedCount,
  })));

  const champion = useMemo(() => {
    if (!selectedAvatarChampionId) return null;
    const ownedEntry = Object.entries(collection).find(([k]) => parseInstanceKey(k).templateId === selectedAvatarChampionId);
    if (!ownedEntry) return null;
    const tpl = CHARACTER_POOL.find(c => c.id === selectedAvatarChampionId);
    if (!tpl) return null;
    return { templateId: tpl.id, formIndex: ownedEntry[1].currentForm, name: tpl.name, rarity: tpl.rarity };
  }, [selectedAvatarChampionId, collection]);

  return (
    <AvatarVisual
      size={size}
      champion={champion}
      fallbackLetter={username.charAt(0).toUpperCase()}
      maxPalierReached={maxPalierReached}
      pulse={hasAvatarPulse(unlockedCount())}
      tooltip={tooltip ?? champion?.name ?? username}
    >
      {children}
    </AvatarVisual>
  );
}
