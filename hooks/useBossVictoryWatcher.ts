'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

// Écran de victoire : piloté par un VRAI événement de kill de boss émis par
// le store (et non par une surveillance du palier, qui se déclenchait à tort
// au rechargement de la sauvegarde). Extrait de GameLayout.tsx.
export function useBossVictoryWatcher() {
  const { lastBossVictory, clearBossVictory } = useGameStore();
  const [victory, setVictory] = useState<{ palier: number; gems: number; coins: number } | null>(null);

  useEffect(() => {
    if (!lastBossVictory) return;
    setVictory({ palier: lastBossVictory.palier, gems: lastBossVictory.gems, coins: lastBossVictory.coins });
    clearBossVictory();
  }, [lastBossVictory, clearBossVictory]);

  return { victory, dismissVictory: () => setVictory(null) };
}
