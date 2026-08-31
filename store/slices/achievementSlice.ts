// Succès (achievements) et titres. Fusionné dans gameStore depuis
// l'ancien store/achievementStore.ts (voir Phase 2 du refacto) — les
// require() différés qui évitaient un cycle d'import avec gameStore ne sont
// plus nécessaires : tout passe par get()/set() sur le même store.
import type { StateCreator } from 'zustand';
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { toast } from '@/hooks/useToast';
import type { GameStore, AchievementActions } from '../gameStore.types';

export const createAchievementSlice: StateCreator<GameStore, [], [], AchievementActions> = (set, get) => ({
  getAchievement: (id) => ACHIEVEMENTS.find(a => a.id === id),
  getProgress:    (id) => get().achievementProgress[id] ?? 0,
  isUnlocked:     (id) => !!get().achievementUnlocked[id],
  isClaimed:      (id) => !!get().achievementsClaimed[id],
  unlockedCount:  ()   => Object.values(get().achievementUnlocked).filter(Boolean).length,

  setActiveTitle: (title) => set({ activeTitle: title }),

  // Octroi direct d'un titre hors succès (ex: drop rare de boss d'event —
  // voir EVENT_TITLES dans lib/game/titles.ts).
  unlockTitle: (title) => set(s =>
    s.unlockedTitles.includes(title) ? s : { unlockedTitles: [...s.unlockedTitles, title] }
  ),

  setProgress: (id, value) => {
    const achiev = ACHIEVEMENTS.find(a => a.id === id);
    if (!achiev) return;
    const already = get().achievementUnlocked[id];
    const prev    = get().achievementProgress[id] ?? 0;
    const next    = Math.max(prev, value);
    const done    = next >= achiev.target;

    set(s => {
      const patch: Partial<GameStore> = {
        achievementProgress: { ...s.achievementProgress, [id]: next },
        achievementUnlocked: done ? { ...s.achievementUnlocked, [id]: true } : s.achievementUnlocked,
      };
      // Rattrapage : un succès "de run" (resetsOnPrestige) peut se retrouver
      // marqué `claimed` alors qu'il n'est plus débloqué — un claim pré-
      // Prestige ressuscité par un remote Firestore pas encore synchronisé au
      // moment du reset (voir mergeMonotonicState dans cloudSaveSync.ts, bug
      // de fusion désormais corrigé, mais les comptes déjà touchés avant ce
      // correctif gardent la trace). On la corrige ici, dès que la vraie
      // progression (recalculée depuis les stats, elles bien synchronisées)
      // prouve que ce n'est PAS actuellement terminé — le bouton RÉCUP
      // réapparaît alors normalement au lieu du badge "Reçu" trompeur, sans
      // risque de double-récompense : tant que `!done`, aucun bouton RÉCUP ne
      // s'affiche de toute façon (voir AchievementsPage.tsx).
      if (!done && achiev.resetsOnPrestige && s.achievementsClaimed[id]) {
        const achievementsClaimed = { ...s.achievementsClaimed };
        delete achievementsClaimed[id];
        patch.achievementsClaimed = achievementsClaimed;
      }
      return patch;
    });

    // Notification de déblocage — la récompense elle-même n'est créditée
    // que via le bouton RÉCUP (claimAchievement), pas automatiquement ici.
    if (done && !already) {
      if (!get().suppressToasts) {
        toast.levelup(`🏆 ${achiev.name}`, 'Récompense disponible — clique sur RÉCUP !');
      }
    }
  },

  // Réclame la récompense d'un succès débloqué (bouton RÉCUP côté UI).
  claimAchievement: (id) => {
    const achiev = ACHIEVEMENTS.find(a => a.id === id);
    const already = get().achievementsClaimed[id];
    if (!achiev || !get().achievementUnlocked[id] || already) return;

    set(s => ({
      achievementsClaimed: { ...s.achievementsClaimed, [id]: true },
      unlockedTitles: (achiev.reward?.type === 'title' && typeof achiev.reward.value === 'string' && !s.unlockedTitles.includes(achiev.reward.value))
        ? [...s.unlockedTitles, achiev.reward.value as string]
        : s.unlockedTitles,
    }));

    if (achiev.reward?.type === 'gems' && typeof achiev.reward.value === 'number') {
      set(s => ({ nekoGems: s.nekoGems + (achiev.reward!.value as number) }));
    }

    const rewardMsg = achiev.reward
      ? achiev.reward.type === 'gems'
        ? `+${achiev.reward.value} 💎`
        : achiev.reward.type === 'title'
          ? `Titre : « ${achiev.reward.value} »`
          : ''
      : '';
    if (!get().suppressToasts) {
      toast.levelup(`✅ Récompense reçue`, rewardMsg || achiev.description);
    }
  },

  bumpProgress: (id, by = 1) => {
    const current = get().achievementProgress[id] ?? 0;
    get().setProgress(id, current + by);
  },

  // Remet à zéro uniquement les succès marqués `resetsOnPrestige` (kills,
  // dps, coins, pulls, améliorations, collection en cours, quêtes, rang
  // 7★ — voir lib/game/achievements.ts). Les succès permanents (titres,
  // shiny, boss, gemmes, prestige, boss crowns...) ne sont pas touchés.
  resetPrestigeAchievements: () => set(s => {
    const achievementProgress = { ...s.achievementProgress };
    const achievementUnlocked = { ...s.achievementUnlocked };
    const achievementsClaimed = { ...s.achievementsClaimed };
    for (const a of ACHIEVEMENTS) {
      if (!a.resetsOnPrestige) continue;
      delete achievementProgress[a.id];
      delete achievementUnlocked[a.id];
      delete achievementsClaimed[a.id];
    }
    // totalKills/totalGachaPulls/totalQuestsCompleted/totalUpgradesPerformed
    // sont des cumuls à vie (jamais remis à zéro, utilisés aussi par l'admin/
    // le classement) — voir prestigeStatBaselines dans types/game.ts. Sans
    // cette référence, les succès "de run" ci-dessus se re-valideraient tout
    // seuls dès que ces compteurs (déjà au-delà de leur target) rebougent,
    // au lieu de rester à 0 jusqu'à ce qu'ils soient re-atteints CETTE run.
    const prestigeStatBaselines = {
      totalKills: s.totalKills,
      totalGachaPulls: s.totalGachaPulls,
      totalQuestsCompleted: s.totalQuestsCompleted,
      totalUpgradesPerformed: s.totalUpgradesPerformed,
    };
    return { achievementProgress, achievementUnlocked, achievementsClaimed, prestigeStatBaselines };
  }),
});
