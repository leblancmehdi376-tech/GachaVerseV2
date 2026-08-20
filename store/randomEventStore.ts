'use client';
import { create } from 'zustand';
import { useGameStore } from '@/store/gameStore';

export type RandomEventType = 'ardeur' | 'tempete' | 'jackpot';

// ── Réglages (facilement ajustables) ────────────────────────────────────
// Prochain event programmé à un délai ALÉATOIRE entre ces deux bornes.
export const RE_MIN_DELAY_MS = 180000;  // 3 min
export const RE_MAX_DELAY_MS = 480000;  // 8 min

// Ardeur : jauge de chaleur qui monte au clic mais REDESCEND en continu.
export const ARDEUR_DURATION_MS   = 9000;   // fenêtre pour cliquer
export const ARDEUR_MAX_MULT      = 2.0;    // ×2 DPS au max (dur à atteindre)
export const ARDEUR_GAIN_PER_CLICK = 0.07;  // +7% de jauge par clic
export const ARDEUR_DECAY_PER_SEC = 0.32;   // -32% de jauge par seconde (exigeant mais atteignable)
export const ARDEUR_BUFF_MS       = 20000;  // durée du boost obtenu

// Tempête de neige : UNE orbe à la fois, toutes les 5 s.
export const TEMPETE_ORBES       = 4;      // nombre d'orbes sur l'event
export const TEMPETE_INTERVAL_MS = 5000;   // une orbe toutes les 5 s
export const TEMPETE_ORB_LIFE_MS = 4500;   // durée de vie d'une orbe
export const TEMPETE_MULT_MIN    = 1.1;    // multiplicateur mini
export const TEMPETE_MULT_MAX    = 2.5;    // multiplicateur maxi

// Jackpot : bouton clignotant → machine à sous.
export const JACKPOT_BUTTON_MS   = 10000;  // fenêtre pour cliquer le bouton

export interface RandomEventState {
  active: RandomEventType | null;
  lastEndedAt: number;
  nextEventAt: number; // timestamp programmé pour le prochain event

  startCheckLoop: () => () => void;
  scheduleNext: () => void;
  trigger: (type: RandomEventType) => void;
  end: () => void;
  endForBoss: () => boolean; // termine si un boss est atteint ; renvoie true si un event a été coupé
}

function bossReached(): boolean {
  const g = useGameStore.getState();
  return g.bossActive || g.wave === 10;
}

function randomDelay(): number {
  return RE_MIN_DELAY_MS + Math.random() * (RE_MAX_DELAY_MS - RE_MIN_DELAY_MS);
}

export const useRandomEventStore = create<RandomEventState>((set, get) => ({
  active: null,
  lastEndedAt: 0,
  nextEventAt: Date.now() + randomDelay(),

  // Reprogramme le prochain event à un délai aléatoire de 3 à 8 minutes.
  scheduleNext: () => set({ nextEventAt: Date.now() + randomDelay() }),

  startCheckLoop: () => {
    const id = setInterval(() => {
      const st = get();
      // Jamais pendant un boss (ni pendant la vague 10) : on attend, l'heure
      // programmée n'avance pas — l'event tombera juste après la fin du boss.
      if (bossReached()) { st.endForBoss(); return; }
      if (st.active) return;                         // un event est déjà en cours
      if (Date.now() < st.nextEventAt) return;        // pas encore l'heure

      const roll = Math.random();
      const type: RandomEventType = roll < 0.4 ? 'tempete' : roll < 0.75 ? 'ardeur' : 'jackpot';
      st.trigger(type);
    }, 1000);
    return () => clearInterval(id);
  },

  trigger: (type) => {
    if (bossReached()) return;
    set({ active: type });
  },

  end: () => { set({ active: null, lastEndedAt: Date.now() }); get().scheduleNext(); },

  endForBoss: () => {
    if (get().active) {
      set({ active: null, lastEndedAt: Date.now() });
      get().scheduleNext();
      return true;
    }
    return false;
  },
}));
