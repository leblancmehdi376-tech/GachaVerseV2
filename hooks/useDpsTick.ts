'use client';
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { STAT } from '@/lib/game/achievements';

// Le temps de jeu (succès "100 heures de jeu") est cumulé en mémoire et
// écrit dans le store par paquets, pour ne pas ajouter une mise à jour du
// store (et une réécriture de la sauvegarde locale) de plus à chaque seconde.
const PLAYTIME_FLUSH_SEC = 10;

export function useDpsTick() {
  const tickDps       = useGameStore(s => s.tickDps);
  const tickBossTimer = useGameStore(s => s.tickBossTimer);
  const bossActive    = useGameStore(s => s.bossActive);
  const tickUlt       = useGameStore(s => s.tickUlt);
  const tickMine       = useGameStore(s => s.tickMine);
  const playtimeRef    = useRef(0);

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
      if (++playtimeRef.current >= PLAYTIME_FLUSH_SEC) {
        useGameStore.getState().addStat(STAT.playtimeSec, playtimeRef.current);
        playtimeRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tickDps, tickBossTimer, bossActive, tickUlt, tickMine]);
}
