'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

// Alimente le Compadex : union persistante des personnages/équipements DÉJÀ
// obtenus au moins une fois (compadexCharactersSeen/compadexEquipmentSeen,
// voir types/game.ts) — contrairement à `collection`/`equipmentInventory`,
// qui eux sont vidés par le Prestige (voir doPrestige). On ne fait qu'AJOUTER
// à ces deux maps, jamais retirer : c'est le seul endroit du code qui les
// écrit, pour que rien ne puisse accidentellement en faire disparaître une
// entrée (recyclage, fusion, perte au Prestige...).
export function useCompadexTracker() {
  const collection = useGameStore(s => s.collection);
  const equipmentInventory = useGameStore(s => s.equipmentInventory);

  useEffect(() => {
    const seen = useGameStore.getState().compadexCharactersSeen;
    const missing = Object.values(collection)
      .map(owned => owned.templateId)
      .filter(id => !seen[id]);
    if (missing.length === 0) return;
    useGameStore.setState(s => {
      const next = { ...s.compadexCharactersSeen };
      for (const id of missing) next[id] = true;
      return { compadexCharactersSeen: next };
    });
  }, [collection]);

  useEffect(() => {
    const seen = useGameStore.getState().compadexEquipmentSeen;
    const missing = new Set<string>();
    for (const [id, qty] of Object.entries(equipmentInventory)) {
      if (qty > 0 && !seen[id]) missing.add(id);
    }
    // Un équipement peut être équipé (donc absent de equipmentInventory) sans
    // que l'effet ci-dessus ait tourné entre-temps (ex: restauration cloud
    // d'une sauvegarde antérieure à ce correctif) — on scanne aussi les
    // équipements portés pour ne rien manquer.
    for (const owned of Object.values(collection)) {
      if (!owned.equippedItems) continue;
      for (const id of Object.values(owned.equippedItems)) {
        if (id && !seen[id]) missing.add(id);
      }
    }
    if (missing.size === 0) return;
    useGameStore.setState(s => {
      const next = { ...s.compadexEquipmentSeen };
      for (const id of missing) next[id] = true;
      return { compadexEquipmentSeen: next };
    });
  }, [collection, equipmentInventory]);
}
