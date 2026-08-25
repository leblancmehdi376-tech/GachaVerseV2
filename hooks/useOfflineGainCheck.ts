'use client';
import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { OfflineGain } from '@/store/gameStore';

// Gains hors-ligne : calcul unique une fois l'hydratation + le chargement
// cloud terminés. Extrait de GameLayout.tsx.
//
// IMPORTANT : on attend la fin de la réhydratation Zustand (localStorage) ET
// du chargement cloud (cloudLoaded) — sinon `savedAt` peut encore valoir une
// valeur périmée ou par défaut au lieu du vrai dernier timestamp de
// sauvegarde (le même, quel que soit l'appareil, que celui lu/écrit en
// base), et le calcul se tromperait sur la durée réelle d'absence.
// Rien n'est crédité ici : checkOfflineGain ne fait QUE lire `savedAt` et
// calculer — le gain n'est ajouté à la banque que si le joueur clique sur
// RÉCUPÉRER (claimOfflineGain), pour ne jamais créditer une popup qu'il n'a
// pas encore validée.
export function useOfflineGainCheck(hasHydrated: boolean, cloudLoaded: boolean) {
  const [offlineGain, setOfflineGain] = useState<OfflineGain | null>(null);
  const offlineCheckedRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || !cloudLoaded || offlineCheckedRef.current) return;
    offlineCheckedRef.current = true;
    const g = useGameStore.getState().checkOfflineGain();
    if (g) setOfflineGain(g);
  }, [hasHydrated, cloudLoaded]);

  const claimOfflineGain = () => {
    if (offlineGain) useGameStore.getState().claimOfflineEarnings(offlineGain);
    setOfflineGain(null);
  };

  return { offlineGain, claimOfflineGain };
}
