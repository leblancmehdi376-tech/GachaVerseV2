'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACHIEVEMENTS, Achievement } from '@/lib/game/achievements';
import { toast } from '@/hooks/useToast';

interface AchievementState {
  // id → progress value
  progress: Record<string, number>;
  // id → unlocked (cible atteinte, mais récompense pas forcément réclamée)
  unlocked: Record<string, boolean>;
  // id → récompense réclamée (bouton RÉCUP cliqué)
  claimed: Record<string, boolean>;
  // titre actif choisi par le joueur
  activeTitle: string;
  // Titres débloqués
  unlockedTitles: string[];

  // Actions
  setProgress: (id: string, value: number) => void;
  bumpProgress: (id: string, by?: number) => void;
  setActiveTitle: (title: string) => void;
  unlockTitle: (title: string) => void;
  getAchievement: (id: string) => Achievement | undefined;
  getProgress: (id: string) => number;
  isUnlocked: (id: string) => boolean;
  isClaimed: (id: string) => boolean;
  claimAchievement: (id: string) => void;
  unlockedCount: () => number;
  resetAchievements: () => void;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      progress: {},
      unlocked: {},
      claimed: {},
      activeTitle: 'Novice',
      unlockedTitles: ['Novice'],

      getAchievement: (id) => ACHIEVEMENTS.find(a => a.id === id),
      getProgress:    (id) => get().progress[id] ?? 0,
      isUnlocked:     (id) => !!get().unlocked[id],
      isClaimed:      (id) => !!get().claimed[id],
      unlockedCount:  ()   => Object.values(get().unlocked).filter(Boolean).length,

      setActiveTitle: (title) => set({ activeTitle: title }),

      // Octroi direct d'un titre hors succès (ex: drop rare de boss d'event —
      // voir EVENT_TITLES dans lib/game/titles.ts).
      unlockTitle: (title) => set(s =>
        s.unlockedTitles.includes(title) ? s : { unlockedTitles: [...s.unlockedTitles, title] }
      ),

      setProgress: (id, value) => {
        const achiev = ACHIEVEMENTS.find(a => a.id === id);
        if (!achiev) return;
        const already = get().unlocked[id];
        const prev    = get().progress[id] ?? 0;
        const next    = Math.max(prev, value);
        const done    = next >= achiev.target;

        set(s => ({
          progress: { ...s.progress, [id]: next },
          unlocked: done ? { ...s.unlocked, [id]: true } : s.unlocked,
        }));

        // Notification de déblocage — la récompense elle-même n'est créditée
        // que via le bouton RÉCUP (claimAchievement), pas automatiquement ici.
        if (done && !already) {
          try {
            // Avoid showing toasts when the app is restoring state (e.g. on login).
            const gs = require('@/store/gameStore').useGameStore.getState();
            if (!gs.suppressToasts) {
              toast.levelup(`🏆 ${achiev.name}`, 'Récompense disponible — clique sur RÉCUP !');
            }
          } catch (e) {
            // If require fails for any reason, fallback to showing the toast.
            toast.levelup(`🏆 ${achiev.name}`, 'Récompense disponible — clique sur RÉCUP !');
          }
        }
      },

      // Réclame la récompense d'un succès débloqué (bouton RÉCUP côté UI).
      claimAchievement: (id) => {
        const achiev = ACHIEVEMENTS.find(a => a.id === id);
        const already = get().claimed[id];
        if (!achiev || !get().unlocked[id] || already) return;

        set(s => ({
          claimed: { ...s.claimed, [id]: true },
          unlockedTitles: (achiev.reward?.type === 'title' && typeof achiev.reward.value === 'string' && !s.unlockedTitles.includes(achiev.reward.value))
            ? [...s.unlockedTitles, achiev.reward.value as string]
            : s.unlockedTitles,
        }));

        if (achiev.reward?.type === 'gems' && typeof achiev.reward.value === 'number') {
          // Import différé pour éviter un cycle d'import gameStore <-> achievementStore
          const { useGameStore } = require('@/store/gameStore');
          useGameStore.setState((gs: { nekoGems: number }) => ({ nekoGems: gs.nekoGems + (achiev.reward!.value as number) }));
        }

        // Audit log
        try {
          const uid = require('@/lib/firebase/config').auth?.currentUser?.uid ?? null;
        } catch {}

        const rewardMsg = achiev.reward
          ? achiev.reward.type === 'gems'
            ? `+${achiev.reward.value} 💎`
            : achiev.reward.type === 'title'
              ? `Titre : « ${achiev.reward.value} »`
              : ''
          : '';
        try {
          const gs = require('@/store/gameStore').useGameStore.getState();
          if (!gs.suppressToasts) {
            toast.levelup(`✅ Récompense reçue`, rewardMsg || achiev.description);
          }
        } catch (e) {
          toast.levelup(`✅ Récompense reçue`, rewardMsg || achiev.description);
        }
      },

      bumpProgress: (id, by = 1) => {
        const current = get().progress[id] ?? 0;
        get().setProgress(id, current + by);
      },

      // Remet les succès à zéro (utilisé par "Réinitialiser mon compte").
      resetAchievements: () => set({
        progress: {},
        unlocked: {},
        claimed: {},
        activeTitle: 'Novice',
        unlockedTitles: ['Novice'],
      }),
    }),
    {
      name: 'gachaverse_achievements_v2', // bump v2.5 : force un reset local pour tous les joueurs
      partialize: (s) => ({
        progress: s.progress,
        unlocked: s.unlocked,
        claimed: s.claimed,
        activeTitle: s.activeTitle,
        unlockedTitles: s.unlockedTitles,
      }),
      // Migration pour les sauvegardes existantes : "Novice" doit toujours
      // être débloqué (c'est le titre de départ gratuit), même pour les
      // parties commencées avant l'ajout de ce correctif.
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Titre de départ garanti.
        if (!state.unlockedTitles.includes('Novice')) {
          state.unlockedTitles = [...state.unlockedTitles, 'Novice'];
        }

        // Migration des titres déjà débloqués avant l'ajout de la récompense de titre.
        // On reconstruit le set à partir des succès validés, puis on ajoute les titres manquants.
        const missingTitles = ACHIEVEMENTS.filter(a => {
          if (a.reward?.type !== 'title' || typeof a.reward.value !== 'string') return false;
          if (state.unlockedTitles.includes(a.reward.value)) return false;
          return !!state.unlocked[a.id];
        }).map(a => a.reward!.value as string);

        if (missingTitles.length > 0) {
          state.unlockedTitles = [...new Set([...state.unlockedTitles, ...missingTitles])];
        }
      },
    }
  )
);

// ── Helpers appelés depuis gameStore / GameLayout ─────────────────────────

// "Vaincre X boss" (first_boss, bosses_5/20/100) : compte TOUS les boss vaincus,
// re-farm inclus. Ne pas confondre avec les couronnes (crowns_50), qui elles
// ne sont accordées que sur une VRAIE progression de palier.
export function trackBossKills(totalBossKills: number) {
  const s = useAchievementStore.getState();
  s.setProgress('first_boss', Math.min(totalBossKills, 1));
  s.setProgress('bosses_5',   Math.min(totalBossKills, 5));
  s.setProgress('bosses_20',  Math.min(totalBossKills, 20));
  s.setProgress('bosses_67',  Math.min(totalBossKills, 67));
  s.setProgress('bosses_100', Math.min(totalBossKills, 100));
}

export function trackBossCrowns(bossCrowns: number) {
  useAchievementStore.getState().setProgress('crowns_50', Math.min(bossCrowns, 50));
}

export function trackPalier(palier: number) {
  const s = useAchievementStore.getState();
  s.setProgress('palier_5',  Math.min(palier, 5));
  s.setProgress('palier_10', Math.min(palier, 10));
  s.setProgress('palier_15', Math.min(palier, 15));
  s.setProgress('palier_20', Math.min(palier, 20));
  s.setProgress('palier_40', Math.min(palier, 40));
}

export function trackCoins(coins: number) {
  const s = useAchievementStore.getState();
  s.setProgress('coins_100k', Math.min(coins, 100000));
  s.setProgress('coins_10m',  Math.min(coins, 10000000));
  s.setProgress('coins_1b',   Math.min(coins, 1000000000));
  s.setProgress('coins_10b',  Math.min(coins, 10000000000));
  s.setProgress('coins_100b', Math.min(coins, 100000000000));
}

export function trackDps(dps: number) {
  const s = useAchievementStore.getState();
  s.setProgress('dps_1000', Math.min(dps, 1000));
  s.setProgress('dps_1m',   Math.min(dps, 1000000));
  s.setProgress('dps_100m', Math.min(dps, 100000000));
  s.setProgress('dps_1b',   Math.min(dps, 1000000000));
}

export function trackCollection(ownedCount: number, hasLegendary: boolean, hasTranscendant: boolean, totalPool: number, transcendantCount: number = hasTranscendant ? 1 : 0) {
  const s = useAchievementStore.getState();
  s.setProgress('collect_1',  Math.min(ownedCount, 1));
  s.setProgress('collect_5',  Math.min(ownedCount, 5));
  s.setProgress('collect_15', Math.min(ownedCount, 15));
  s.setProgress('collect_30', Math.min(ownedCount, 30));
  s.setProgress('collect_all', ownedCount >= totalPool ? 999 : ownedCount);
  if (hasLegendary)     s.setProgress('legendary_1',     1);
  if (hasTranscendant)  s.setProgress('transcendant_1',  1);
  s.setProgress('transcendant_3', Math.min(transcendantCount, 3));
}

export function trackEquippedTeam(filledSlots: number) {
  const s = useAchievementStore.getState();
  s.setProgress('equip_team', Math.min(filledSlots, 4));
}

export function trackGachaPulls(total: number) {
  const s = useAchievementStore.getState();
  s.setProgress('pull_1',    Math.min(total, 1));
  s.setProgress('pull_10',   Math.min(total, 10));
  s.setProgress('pull_100',  Math.min(total, 100));
  s.setProgress('pull_500',  Math.min(total, 500));
  s.setProgress('pull_1000', Math.min(total, 1000));
  s.setProgress('pull_5000', Math.min(total, 5000));
}

export function trackQuestsCompleted(count: number) {
  const s = useAchievementStore.getState();
  s.setProgress('quest_10',  Math.min(count, 10));
  s.setProgress('quest_20',  Math.min(count, 20));
  s.setProgress('quest_50',  Math.min(count, 50));
  s.setProgress('quest_100', Math.min(count, 100));
  s.setProgress('quest_500', Math.min(count, 500));
}

export function trackKills(totalKills: number) {
  const s = useAchievementStore.getState();
  s.setProgress('kills_1',       Math.min(totalKills, 1));
  s.setProgress('kills_500',     Math.min(totalKills, 500));
  s.setProgress('kills_5000',    Math.min(totalKills, 5000));
  s.setProgress('kills_50000',   Math.min(totalKills, 50000));
  s.setProgress('kills_500000',  Math.min(totalKills, 500000));
  s.setProgress('kills_1000000', Math.min(totalKills, 1000000));
}

export function trackUpgrades(totalUpgrades: number) {
  const s = useAchievementStore.getState();
  s.setProgress('upgrade_10',  Math.min(totalUpgrades, 10));
  s.setProgress('upgrade_50',  Math.min(totalUpgrades, 50));
  s.setProgress('upgrade_200', Math.min(totalUpgrades, 200));
}

// ── Nouveaux traqueurs (20 succès difficiles) ─────────────────────────────

/** Gemmes en stock (plus haut jamais atteint — Math.max interne à setProgress). */
export function trackGems(gems: number) {
  useAchievementStore.getState().setProgress('gems_1000', Math.min(gems, 1000));
}

export function trackPrestige(level: number) {
  const s = useAchievementStore.getState();
  s.setProgress('prestige_10', Math.min(level, 10));
  s.setProgress('prestige_25', Math.min(level, 25));
}

export function trackVoidOrbs(orbs: number) {
  useAchievementStore.getState().setProgress('orbs_30', Math.min(orbs, 30));
}

export function trackUnlockedTitles(count: number) {
  useAchievementStore.getState().setProgress('titles_25', Math.min(count, 25));
}

/** Éditions shiny (Or/Diamant) : détectées en scannant la collection. */
export function trackShinyEditions(goldOrDiamondCount: number, hasGold: boolean, hasDiamond: boolean, diamondUniqueCount: number, hasTrio: boolean, pantheonCount: number) {
  const s = useAchievementStore.getState();
  if (hasGold)    s.setProgress('gold_1', 1);
  if (hasDiamond) s.setProgress('diamond_1', 1);
  if (hasTrio)    s.setProgress('trio_perfect', 1);
  s.setProgress('shiny_10', Math.min(goldOrDiamondCount, 10));
  s.setProgress('diamond_3', Math.min(diamondUniqueCount, 3));
  s.setProgress('diamond_10', Math.min(diamondUniqueCount, 10));
  s.setProgress('pantheon_5', Math.min(pantheonCount, 5));
}

/** Rangs 7★ : détectés en scannant la collection + l'équipe active. */
export function trackRank7(count7Star: number, fullTeamRank7: boolean) {
  const s = useAchievementStore.getState();
  s.setProgress('rank7_1', Math.min(count7Star, 1));
  s.setProgress('rank7_5', Math.min(count7Star, 5));
  if (fullTeamRank7) s.setProgress('rank7_team', 1);
}

export function trackSynergyMax(hasMaxSynergy: boolean) {
  if (hasMaxSynergy) useAchievementStore.getState().setProgress('synergy_max', 1);
}
