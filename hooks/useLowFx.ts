'use client';
import { useSyncExternalStore } from 'react';
import { useDisplaySettingsStore } from '@/store/displaySettingsStore';

// Effets réduits : mode économie (Options) OU préférence système "réduire les
// animations". La règle CSS prefers-reduced-motion de globals.css ne touche
// pas les animations dessinées en JS (canvas) : elles lisent ce hook.
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useLowFx(): boolean {
  const eco = useDisplaySettingsStore(s => s.ecoMode);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  return eco || reduced;
}
