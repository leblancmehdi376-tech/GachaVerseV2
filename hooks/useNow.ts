'use client';
import { useEffect, useState } from 'react';

// Horloge réactive : renvoie Date.now() rafraîchi toutes les `intervalMs`.
// À utiliser pour les comptes à rebours plutôt qu'appeler Date.now() pendant
// le rendu (impur : la valeur ne bouge que si autre chose re-render).
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
