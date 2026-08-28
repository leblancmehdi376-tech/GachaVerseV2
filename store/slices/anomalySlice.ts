// Anomalies : bonus passifs permanents (jamais reset au Prestige — voir
// metaProgressionSlice.ts::doPrestige, qui ne touche pas ces champs, comme
// bossCrowns/voidOrbs). Extension d'emplacements achetable en BossCrowns,
// débloquée après le premier Prestige. Extrait de gameStore.ts (Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import {
  rollAnomaly, getAnomalyRerollCost, getAnomalySlotCost, ANOMALY_MAX_SLOTS,
} from '@/lib/game/anomalies';
import { broadcastLocalState, requestUrgentSave } from '../gameStoreHelpers';
import type { GameStore, AnomalyActions } from '../gameStore.types';

export const createAnomalySlice: StateCreator<GameStore, [], [], AnomalyActions> = (set, get) => ({
  getAnomalyRerollCost: () => {
    const lockedCount = get().ownedAnomalies.filter(a => a.locked).length;
    return getAnomalyRerollCost(lockedCount);
  },

  // Retire toutes les anomalies NON verrouillées et les remplace par un
  // nouveau tirage pondéré — jusqu'à combler tous les emplacements disponibles.
  rerollAnomalies: () => {
    const s = get();
    const cost = s.getAnomalyRerollCost();
    if (s.anomalyTokens < cost) return;
    const kept = s.ownedAnomalies.filter(a => a.locked);
    const toRoll = Math.max(0, s.anomalySlots - kept.length);
    const rolled = Array.from({ length: toRoll }, () => rollAnomaly());
    set({ anomalyTokens: s.anomalyTokens - cost, ownedAnomalies: [...kept, ...rolled] });
    broadcastLocalState();
    requestUrgentSave('anomaly_reroll');
  },

  toggleAnomalyLock: (id) => set(s => ({
    ownedAnomalies: s.ownedAnomalies.map(a => a.id === id ? { ...a, locked: !a.locked } : a),
  })),

  getAnomalySlotCost: () => getAnomalySlotCost(get().anomalySlots),

  buyAnomalySlot: () => {
    const s = get();
    if (s.prestigeLevel < 1) return;
    if (s.anomalySlots >= ANOMALY_MAX_SLOTS) return;
    const cost = getAnomalySlotCost(s.anomalySlots);
    if (cost === null || s.bossCrowns < cost) return;
    set({ bossCrowns: s.bossCrowns - cost, anomalySlots: s.anomalySlots + 1 });
    broadcastLocalState();
    requestUrgentSave('anomaly_slot');
  },
});
