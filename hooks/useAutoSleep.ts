'use client';
import { useEffect } from 'react';
import { computeSleepMode } from '@/lib/ui/autoSleep';
import { useDisplaySettingsStore, setSleepLowFx } from '@/store/displaySettingsStore';
import { useSleepStore } from '@/store/sleepStore';
import { useGameStore } from '@/store/gameStore';
import { takeSleepSnapshot, computeSleepRecap } from '@/lib/ui/sleepRecap';

// Veille automatique quand la fenêtre n'a plus le focus (jeu ouvert sur un
// deuxième écran pendant qu'on joue à autre chose) : voir lib/ui/autoSleep.ts.
// Pose data-sleep="soft|full" sur <html> (globals.css) et force les effets
// réduits pendant la veille. Un clic (ou un toucher), une touche ou le retour
// du focus réveillent le jeu ; un simple passage de la souris, non (elle
// traverse souvent le 2e écran pendant qu'on joue à autre chose).
const CHECK_MS = 1000;
const INPUT_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

export function useAutoSleep() {
  const delay = useDisplaySettingsStore(s => s.sleepDelay);

  useEffect(() => {
    let focused = document.hasFocus();
    let blurAt = Date.now();
    let lastInputAt = 0;

    const apply = () => {
      const mode = computeSleepMode({ now: Date.now(), focused, blurAt, lastInputAt, delay });
      const sleep = useSleepStore.getState();
      if (mode === sleep.mode) return;
      // Récap de la veille complète : instantané à l'endormissement, comparé
      // à l'état du jeu au réveil (SleepRecapModal).
      if (mode === 'full') sleep.setSnapshot(takeSleepSnapshot(useGameStore.getState(), Date.now()));
      else if (sleep.mode === 'full' && sleep.snapshot) {
        sleep.setRecap(computeSleepRecap(sleep.snapshot, useGameStore.getState(), Date.now()));
        sleep.setSnapshot(null);
      }
      sleep.setMode(mode);
      if (mode === 'awake') document.documentElement.removeAttribute('data-sleep');
      else document.documentElement.setAttribute('data-sleep', mode);
      setSleepLowFx(mode !== 'awake');
    };

    const onFocus = () => { focused = true; apply(); };
    const onBlur = () => { focused = false; blurAt = Date.now(); apply(); };
    const onInput = () => { lastInputAt = Date.now(); apply(); };

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    for (const ev of INPUT_EVENTS) window.addEventListener(ev, onInput, { passive: true });
    const interval = setInterval(apply, CHECK_MS);
    apply();

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      for (const ev of INPUT_EVENTS) window.removeEventListener(ev, onInput);
      clearInterval(interval);
      // Démontage (ou changement de délai) : on repart éveillé.
      useSleepStore.getState().setSnapshot(null);
      useSleepStore.getState().setMode('awake');
      document.documentElement.removeAttribute('data-sleep');
      setSleepLowFx(false);
    };
  }, [delay]);
}
