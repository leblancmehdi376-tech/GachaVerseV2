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
      // Onglet masqué : on ne fait AUCUN tick (plutôt qu'un tick au ralenti
      // dû au throttling navigateur) — le temps passé caché est rattrapé
      // d'un coup au retour via checkOfflineGain (voir useOfflineGainCheck),
      // qui applique le même quota/rendement AFK que la fermeture de l'app.
      if (document.visibilityState === 'hidden') return;
      tickDps();
      if (bossActive) tickBossTimer();
      tickUlt();
      tickMine();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickDps, tickBossTimer, bossActive, tickUlt, tickMine]);
}
