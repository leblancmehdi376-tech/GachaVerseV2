'use client';
import { useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/hooks/useToast';

// Déclenche les toasts de drop d'équipement et de quête accomplie ; renvoie
// aussi le nombre de quêtes réclamables (utilisé pour les badges de nav).
// Extrait de GameLayout.tsx.
export function useGameToasts(): number {
  const { lastEquipmentDrop, setLastEquipmentDrop, quests, weeklyQuests, eventQuests } = useGameStore();
  const countClaimable = (list: typeof quests) => (list ?? []).filter(q => q.current >= q.target && !q.done).length;
  const claimable = countClaimable(quests) + countClaimable(weeklyQuests) + countClaimable(eventQuests);

  // Watch equipment drops → toast
  useEffect(() => {
    if (!lastEquipmentDrop) return;
    toast.loot('Équipement trouvé !', lastEquipmentDrop);
    setLastEquipmentDrop(null);
  }, [lastEquipmentDrop, setLastEquipmentDrop]);

  // Watch quest completions → toast
  const prevClaimableRef = useRef(claimable);
  useEffect(() => {
    if (claimable > prevClaimableRef.current) {
      toast.quest('Quête accomplie !', 'Récupère ta récompense →');
    }
    prevClaimableRef.current = claimable;
  }, [claimable]);

  return claimable;
}
