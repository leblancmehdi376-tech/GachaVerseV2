'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export function useDpsTick() {
  const tickDps       = useGameStore(s => s.tickDps);
  const tickBossTimer = useGameStore(s => s.tickBossTimer);
  const bossActive    = useGameStore(s => s.bossActive);
  const tickUlt       = useGameStore(s => s.tickUlt);
  const tickMine       = useGameStore(s => s.tickMine);

  useEffect(() => {
    const interval = setInterval(() => {
      tickDps();
      if (bossActive) tickBossTimer();
      tickUlt();
      tickMine();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickDps, tickBossTimer, bossActive, tickUlt, tickMine]);
}
