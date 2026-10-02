'use client';
import { useEffect, useRef, useState } from 'react';

// Un seul IntersectionObserver partagé par tous les éléments observés : les
// grilles de cartes en montent des centaines, un observer chacun coûterait cher.
type Listener = (visible: boolean) => void;
const listeners = new Map<Element, Listener>();
let observer: IntersectionObserver | null = null;

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(entries => {
      for (const e of entries) listeners.get(e.target)?.(e.isIntersecting);
    }, { rootMargin: '150px' });
  }
  return observer;
}

// Vrai tant que l'élément est (presque) à l'écran. Sert à couper les
// animations infinies des éléments hors champ. `enabled` = false : pas
// d'observation, renvoie toujours true.
export function useInView<T extends Element>(enabled = true) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    listeners.set(el, setVisible);
    const obs = getObserver();
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      listeners.delete(el);
    };
  }, [enabled]);

  return [ref, visible] as const;
}
