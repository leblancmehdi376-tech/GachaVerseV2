'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { EventLobby } from './event/EventLobby';
import { EventBattle } from './event/EventBattle';

export function EventPage() {
  // Un combat de boss d'événement déjà en cours (voir eventBossFight dans le
  // store) survit à un changement d'onglet de l'appli : on rouvre directement
  // l'écran de combat plutôt que le lobby si c'est le cas.
  const [view, setView]     = useState<'lobby' | 'battle'>(() => useGameStore.getState().eventBossFight ? 'battle' : 'lobby');
  const [bossId, setBossId] = useState<string | null>(() => useGameStore.getState().eventBossFight?.bossId ?? null);

  const handleSelect = (id: string) => { setBossId(id); setView('battle'); };
  const handleBack   = () => {
    // Retour explicite au lobby : on abandonne le combat en cours (contrairement
    // à un simple changement d'onglet, qui le laisse en mémoire pour reprise).
    useGameStore.getState().setEventBossFight(null);
    setView('lobby'); setBossId(null);
  };

  if (view === 'battle' && bossId) return <EventBattle bossId={bossId} onBack={handleBack} />;
  return <EventLobby onSelect={handleSelect} />;
}
