// Succès (achievements) et titres. Fusionné dans gameStore depuis
// l'ancien store/achievementStore.ts (voir Phase 2 du refacto) — les
// require() différés qui évitaient un cycle d'import avec gameStore ne sont
// plus nécessaires : tout passe par get()/set() sur le même store.
import type { StateCreator } from 'zustand';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, MAX_SHOWCASED_TROPHIES } from '@/lib/game/achievements';
import { addStats, maxStats, gachaStatsPatch } from '@/lib/game/achievementStats';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { toast } from '@/hooks/useToast';
import { useAchievementFxStore } from '../achievementFxStore';
import { runPeakPalierOf } from '../gameStoreHelpers';
import type { GameStore, AchievementActions } from '../gameStore.types';

export const createAchievementSlice: StateCreator<GameStore, [], [], AchievementActions> = (set, get) => ({
  getAchievement: (id) => ACHIEVEMENT_BY_ID.get(id),
  getProgress:    (id) => get().achievementProgress[id] ?? 0,
  isUnlocked:     (id) => !!get().achievementUnlocked[id],
  isClaimed:      (id) => !!get().achievementsClaimed[id],
  unlockedCount:  ()   => Object.values(get().achievementUnlocked).filter(Boolean).length,

  setActiveTitle: (title) => set({ activeTitle: title }),

  // Octroi direct d'un titre hors succès (ex: drop rare de boss de raid —
  // voir RAID_TITLES dans lib/game/titles.ts).
  unlockTitle: (title) => set(s =>
    s.unlockedTitles.includes(title) ? s : { unlockedTitles: [...s.unlockedTitles, title] }
  ),

  setProgress: (id, value) => {
    const achiev = ACHIEVEMENT_BY_ID.get(id);
    if (!achiev) return;
    const already = get().achievementUnlocked[id];
    const prev    = get().achievementProgress[id] ?? 0;
    const next    = Math.max(prev, value);
    const done    = next >= achiev.target;

    // Sans ce garde-fou, chaque appel réalloue achievementProgress/
    // achievementUnlocked même quand rien ne change — un des trackers (voir
    // useAchievementTrackers) rappelle setProgress à chaque tick/action, donc
    // ça force GameLayout (souscrit au store entier) à re-render en boucle,
    // jusqu'à dépasser la limite de nested updates de React ("Maximum update
    // depth exceeded") sous spam de clics.
    if (next === prev && (!done || already)) return;

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

    // Bannière animée de déblocage (voir AchievementUnlockBanner) — la
    // récompense elle-même n'est créditée que via le bouton RÉCUP
    // (claimAchievement), pas automatiquement ici.
    if (done && !already) {
      if (!get().suppressToasts) useAchievementFxStore.getState().push(id);
    }
  },

  // Réclame la récompense d'un succès débloqué (bouton RÉCUP côté UI).
  claimAchievement: (id) => {
    const achiev = ACHIEVEMENT_BY_ID.get(id);
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

  // Réclame plusieurs récompenses d'un coup (tous les niveaux débloqués d'une
  // série, ou tout ce qui est en attente) — un seul set() et un seul toast
  // récapitulatif, plutôt qu'un claimAchievement par succès.
  claimAchievements: (candidateIds) => {
    const s = get();
    const pool = candidateIds ?? ACHIEVEMENTS.map(a => a.id);
    const ids = pool.filter(id => ACHIEVEMENT_BY_ID.has(id) && s.achievementUnlocked[id] && !s.achievementsClaimed[id]);
    if (ids.length === 0) return 0;
    let gems = 0;
    const titles = new Set(s.unlockedTitles);
    const claimed = { ...s.achievementsClaimed };
    for (const id of ids) {
      const r = ACHIEVEMENT_BY_ID.get(id)!.reward;
      claimed[id] = true;
      if (r?.type === 'gems' && typeof r.value === 'number') gems += r.value;
      if (r?.type === 'title' && typeof r.value === 'string') titles.add(r.value);
    }
    set(st => ({ achievementsClaimed: claimed, unlockedTitles: Array.from(titles), nekoGems: st.nekoGems + gems }));
    if (!get().suppressToasts) {
      toast.levelup(`✅ ${ids.length} récompense${ids.length > 1 ? 's' : ''} reçue${ids.length > 1 ? 's' : ''}`, gems > 0 ? `+${gems} 💎` : undefined);
    }
    return ids.length;
  },
  claimAllAchievements: () => get().claimAchievements(),

  // ── Statistiques de succès (achievementStats) ──────────────────────────
  addStat: (key, by = 1) => {
    if (!by) return;
    set(s => ({ achievementStats: addStats(s.achievementStats, { [key]: by }) }));
  },
  maxStat: (key, value) => {
    const next = maxStats(get().achievementStats, { [key]: value });
    if (next) set({ achievementStats: next });
  },
  discover: (key) => get().maxStat(key, 1),

  recordGachaResults: (templateIds, isEventBanner) => {
    if (templateIds.length === 0) return;
    set(s => ({ achievementStats: gachaStatsPatch(s.achievementStats, templateIds, runPeakPalierOf(s), isEventBanner) }));
  },

  // Plus haut niveau / plus haute forme jamais atteints par personnage (toutes
  // éditions confondues) — n'écrit que si quelque chose a réellement augmenté.
  recordMasteryLevels: () => {
    const s = get();
    let next: GameStore['charMastery'] | null = null;
    for (const [key, owned] of Object.entries(s.collection)) {
      const id = parseInstanceKey(key).templateId;
      if (!getCharacterById(id)) continue;
      const cur = (next ?? s.charMastery)[id] ?? { k: 0, w: 0, lv: 0, f: 0 };
      if (owned.level <= cur.lv && owned.currentForm <= cur.f) continue;
      next ??= { ...s.charMastery };
      next[id] = { ...cur, lv: Math.max(cur.lv, owned.level), f: Math.max(cur.f, owned.currentForm) };
    }
    if (next) set({ charMastery: next });
  },

  // ── Vitrine de trophées (profil) ────────────────────────────────────────
  toggleShowcasedTrophy: (id) => set(s => {
    if (s.showcasedTrophies.includes(id)) return { showcasedTrophies: s.showcasedTrophies.filter(t => t !== id) };
    if (!s.achievementUnlocked[id] || s.showcasedTrophies.length >= MAX_SHOWCASED_TROPHIES) return s;
    return { showcasedTrophies: [...s.showcasedTrophies, id] };
  }),
  setShowcasedTrophies: (ids) => set({ showcasedTrophies: ids.slice(0, MAX_SHOWCASED_TROPHIES) }),

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
