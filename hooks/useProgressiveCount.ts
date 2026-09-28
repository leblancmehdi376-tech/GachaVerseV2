'use client';
import { useEffect, useState } from 'react';

// Rendu progressif d'une longue liste : renvoie combien d'éléments afficher,
// en commençant par `initial` puis en ajoutant `chunk` éléments à chaque
// frame jusqu'à `total`. Chaque paquet reste court, la page s'affiche donc
// sans geler. (Une transition React unique ne convient pas ici : les ticks de
// combat l'interrompent et la relancent sans cesse, puis elle finit par tout
// monter d'un bloc.)
export function useProgressiveCount(total: number, initial = 40, chunk = 60): number {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    if (count >= total) return;
    const id = requestAnimationFrame(() => setCount(c => c + chunk));
    return () => cancelAnimationFrame(id);
  }, [count, total, chunk]);
  return count;
}
