import { describe, it, expect } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getSerializableState } from './useCloudSave';

// Champs de gameStore volontairement absents de la sauvegarde cloud/locale —
// état transitoire ou dérivable, qui n'a pas besoin de survivre à un refresh
// ou de se synchroniser entre appareils. Documenté ici pour que toute
// exclusion future soit un choix conscient, pas un oubli — voir le
// commentaire au-dessus de getSerializableState dans useCloudSave.ts pour
// l'historique de bugs (champs ajoutés au store mais jamais synchronisés)
// que ce test vise justement à prévenir.
const INTENTIONALLY_TRANSIENT_FIELDS = new Set([
  'bossAvoided',         // remis à zéro à chaque voyage/défi de boss, pas une vraie progression
  'ultUsedThisFight',    // remis à zéro à chaque combat
  'lastSaved',           // champ legacy non utilisé, supplanté par `savedAt`
  'lastBossVictory',     // déclencheur d'écran one-shot, effacé juste après affichage
  'suppressToasts',      // flag UI temporaire (pendant une restauration d'état)
  'lastEquipmentDrop',   // déclencheur de toast one-shot
  'focusedExpeditionId', // signal de navigation Forge → Expéditions, pas une donnée de progression
  // (eventCharacterPurchases retiré de cette liste : maintenant synchronisé,
  // voir partialize dans gameStore.ts et getSerializableState ci-dessus)
  'eventDpsMult',        // buff temporaire d'événement aléatoire (courte durée, faible enjeu)
  'eventDpsMultEndsAt',
  'collectionFilter',    // préférence d'affichage de la page Collection, pas de la progression
  'collectionUniverse',
  'collectionAffinity',
  'collectionSort',
  // Fusionnés depuis les anciens achievementStore/ultimateStore (voir Phase 2
  // du refacto stores) — n'étaient déjà pas cloud-synchronisés avant fusion.
  'achievementProgress', // jamais cloud-sync, seulement local (voir gameStore.ts partialize)
  'achievementUnlocked', // idem
  'ultCooldowns',        // idem (persisté local uniquement, jamais envoyé à Firestore)
  'ultActiveUlts',       // jamais persisté du tout (ni local ni cloud) — expire au reload
  'ultAnimating',        // idem
]);

describe('getSerializableState — exhaustivité', () => {
  it('inclut tous les champs de state de gameStore, sauf ceux explicitement marqués transitoires', () => {
    const state = useGameStore.getState() as unknown as Record<string, unknown>;
    const serialized = getSerializableState() as Record<string, unknown>;

    const missing = Object.keys(state).filter(key => {
      if (typeof state[key] === 'function') return false; // actions, pas du state
      if (INTENTIONALLY_TRANSIENT_FIELDS.has(key)) return false;
      return !(key in serialized);
    });

    expect(
      missing,
      `Champs présents dans gameStore mais absents de getSerializableState() (probablement oubliés — ` +
      `voir INTENTIONALLY_TRANSIENT_FIELDS si l'absence est volontaire) : ${missing.join(', ')}`
    ).toEqual([]);
  });
});
