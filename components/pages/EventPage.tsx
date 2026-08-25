'use client';
import { useState } from 'react';
import { EventLobby } from './event/EventLobby';
import { EventBattle } from './event/EventBattle';

export function EventPage() {
  const [view, setView]     = useState<'lobby' | 'battle'>('lobby');
  const [bossId, setBossId] = useState<string | null>(null);

  const handleSelect = (id: string) => { setBossId(id); setView('battle'); };
  const handleBack   = ()          => { setView('lobby'); setBossId(null); };

  if (view === 'battle' && bossId) return <EventBattle bossId={bossId} onBack={handleBack} />;
  return <EventLobby onSelect={handleSelect} />;
}
