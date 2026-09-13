'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RaidLobby } from './raid/RaidLobby';
import { RaidBattle } from './raid/RaidBattle';

export function RaidPage() {
  // Un combat de boss de raid déjà en cours (voir raidBossFight dans le
  // store) survit à un changement d'onglet de l'appli : on rouvre directement
  // l'écran de combat plutôt que le lobby si c'est le cas.
  const [view, setView]     = useState<'lobby' | 'battle'>(() => useGameStore.getState().raidBossFight ? 'battle' : 'lobby');
  const [bossId, setBossId] = useState<string | null>(() => useGameStore.getState().raidBossFight?.bossId ?? null);

  const handleSelect = (id: string) => { setBossId(id); setView('battle'); };
  const handleBack   = () => {
    // Retour explicite au lobby : on abandonne le combat en cours (contrairement
    // à un simple changement d'onglet, qui le laisse en mémoire pour reprise).
    useGameStore.getState().setRaidBossFight(null);
    setView('lobby'); setBossId(null);
  };

  if (view === 'battle' && bossId) return <RaidBattle bossId={bossId} onBack={handleBack} />;
  return <RaidLobby onSelect={handleSelect} />;
}
