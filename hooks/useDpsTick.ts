'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUltimateStore } from '@/store/ultimateStore';

export function useDpsTick() {
  const tickDps       = useGameStore(s => s.tickDps);
  const tickBossTimer = useGameStore(s => s.tickBossTimer);
  const bossActive    = useGameStore(s => s.bossActive);
  const tickUlt       = useUltimateStore(s => s.tick);

  useEffect(() => {
    const interval = setInterval(() => {
      tickDps();
      if (bossActive) tickBossTimer();
      tickUlt();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickDps, tickBossTimer, bossActive, tickUlt]);
}
