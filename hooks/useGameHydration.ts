'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

// Réhydratation locale (Zustand persist / localStorage), puis reset des
// quêtes quotidiennes/hebdomadaires une fois hydratation + chargement cloud
// terminés. Extrait de GameLayout.tsx.
//
// IMPORTANT : on attend hasHydrated ET cloudLoaded avant de comparer
// questsDayKey à la date du jour — sinon, sur un appareil qui a déjà une
// sauvegarde locale périmée (questsDayKey d'hier), ce check se déclenche
// AVANT que la vraie progression cloud n'ait été appliquée, réinitialise les
// quêtes localement, et ce reset est ensuite re-synchronisé vers le cloud en
// écrasant la progression réelle.
export function useGameHydration(cloudLoaded: boolean): boolean {
  const { ensureDailyQuests, ensureWeeklyQuests } = useGameStore();
  const [hasHydrated, setHasHydrated] = useState(() => useGameStore.persist?.hasHydrated?.() ?? false);

  useEffect(() => {
    if (hasHydrated) return;
    if (!useGameStore.persist) { setHasHydrated(true); return; } // pas de persist (SSR/fallback) : ne bloque rien
    const unsub = useGameStore.persist.onFinishHydration(() => setHasHydrated(true));
    // Sécurité : si la réhydratation était déjà finie entre le calcul initial
    // du useState et le montage de cet effet, on ne resterait pas bloqué.
    if (useGameStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !cloudLoaded) return;
    ensureDailyQuests();
    ensureWeeklyQuests();
  }, [hasHydrated, cloudLoaded, ensureDailyQuests, ensureWeeklyQuests]);

  return hasHydrated;
}
