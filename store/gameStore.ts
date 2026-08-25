'use client';
// Store de jeu principal — combine les slices (store/slices/*.ts) en un seul
// store Zustand persistant. Chaque slice porte les actions d'un domaine
// (combat, personnages, équipement, gacha, boutiques, quêtes, progression) ;
// les valeurs INITIALES de tout l'état restent centralisées ici, dans
// makeInitial(), pour que resetGame() (set(makeInitial())) réinitialise bien
// la totalité du store en un seul appel. Voir Phase 2 du refacto pour le
// détail de ce découpage (gameStoreHelpers.ts et gameStore.types.ts).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OwnedCharacter, HeroState, Rarity } from '@/types/game';
import { generateEnemy } from '@/lib/game/enemies';
import { getTodayDayKey, getThisWeekKey } from '@/lib/game/shop';
import { useAchievementStore } from '@/store/achievementStore';
import { usePrestigeStore } from '@/store/prestigeStore';
import { useUltimateStore } from '@/store/ultimateStore';
import type { GameStore } from './gameStore.types';
import { DAILY_QUESTS, WEEKLY_QUESTS, EVENT_QUESTS } from './gameStoreHelpers';
import { createCombatSlice } from './slices/combatSlice';
import { createCharacterSlice } from './slices/characterSlice';
import { createEquipmentSlice } from './slices/equipmentSlice';
import { createGachaSlice } from './slices/gachaSlice';
import { createShopSlice } from './slices/shopSlice';
import { createQuestSlice } from './slices/questSlice';
import { createMetaProgressionSlice } from './slices/metaProgressionSlice';

// Réexports publics — préservent l'API historique de '@/store/gameStore'
// pour tous les fichiers qui importent ces symboles.
export type { Quest, OfflineGain } from './gameStore.types';
export {
  getGoldChestCost, getGoldChestMultiplier, getPalierPassGems, bumpBossQuests,
  GOLD_CHEST_COST_BASE, GOLD_CHEST_COST_GROWTH, GOLD_CHEST_MULT_GROWTH,
  MOB_GEM_DROP_CHANCE, FARM_EQUIP_DROP_RATE,
  OFFLINE_MULT_TIERS, OFFLINE_REWARD_SCALE_TIERS, OFFLINE_CAP_TIERS_H,
  OFFLINE_MULT_COSTS, OFFLINE_CAP_COSTS, OFFLINE_MIN_SECONDS,
} from './gameStoreHelpers';

const makeInitial = () => ({
  pixelCoins: 0, nekoGems: 10, totalClicks: 0,
  totalKills: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0, totalGachaPulls: 0, totalBossKills: 0, totalGemsSpent: 0,
  totalBossCrownsEarned: 0, totalVoidOrbsEarned: 0,
  wave: 1, palier: 1, maxPalierReached: 1, runPeakPalier: null as number | null,
  currentEnemy: generateEnemy(1, 1),
  goldUpgradeLevel: 0,
  equippedTeam: [null, null, null, null] as (string|null)[],
  collection: {} as Record<string, OwnedCharacter>,
  hero: { level: 1, currentForm: 0, xp: 0 } as HeroState,
  bossActive: false, bossTimeLeft: 0, bossAvoided: false,
  ultUsedThisFight: [] as string[],
  lastSaved: Date.now(),
  lastBossVictory: null as { palier: number; gems: number; coins: number; crowns: number; at: number } | null,
  username: 'NEKOZ',
  quests: DAILY_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  questsDayKey: getTodayDayKey(),
  weeklyQuests: WEEKLY_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  weeklyQuestsDayKey: getThisWeekKey(),
  eventQuests: EVENT_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  // Flag to temporarily suppress toasts/notifications during state restore
  suppressToasts: false,
  bossCrowns: 0, voidOrbs: 0,
  inventory: {} as Record<string, number>,
  equipmentInventory: {} as Record<string, number>,
  championInventory:  {} as Record<string, number>,
  lastEquipmentDrop: null,
  focusedExpeditionId: null,
  bankedRanks: {} as Record<string, number>,
  eventCharacterPurchases: {} as Record<string, number>,
  historicalMaxRank: {} as Record<string, number>,
  unlockedEquipRarities: ['C'] as Rarity[],
  unlockedEquipDropRarities: ['C'] as Rarity[],
  dpsBoostEndsAt: 0, goldBoostEndsAt: 0,
  eventDpsMult: 1, eventDpsMultEndsAt: 0,
  dailyShop: { dayKey: '', characterIds: [] as string[], purchased: [] as string[] },
  collectionFilter: 'all',
  collectionUniverse: 'all',
  collectionAffinity: 'all',
  collectionSort: 'rarity',
  starterPackClaimed: false,
  offlineMultLevel: 0,
  offlineCapLevel: 0,
  lastOfflineGain: null,
  savedAt: 0,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get, api) => ({
      ...makeInitial(),
      ...createCombatSlice(set, get, api),
      ...createCharacterSlice(set, get, api),
      ...createEquipmentSlice(set, get, api),
      ...createGachaSlice(set, get, api),
      ...createShopSlice(set, get, api),
      ...createQuestSlice(set, get, api),
      ...createMetaProgressionSlice(set, get, api),

      resetGame: () => {
        // localStorage.clear() vide bien le disque, mais les AUTRES stores
        // Zustand (succès, prestige, expéditions, ultimes) gardent leurs
        // données EN MÉMOIRE dans le navigateur tant que la page n'est pas
        // rechargée — et les réécrivent aussitôt sur le disque au moindre
        // changement d'état, annulant le clear(). Il faut les réinitialiser
        // explicitement, pas juste vider le stockage.
        try { localStorage.clear(); } catch {}
        set(makeInitial());
        try {
          useAchievementStore.getState().resetAchievements();
          usePrestigeStore.getState().resetPrestige();
          useUltimateStore.getState().resetUltimates();
          // Import différé : expeditionStore importe déjà gameStore, un import
          // statique créerait un cycle.
          const { useExpeditionStore } = require('@/store/expeditionStore');
          useExpeditionStore.getState().resetExpeditions();
        } catch {}
      },
    }),
    {
      name: 'nekoz-world-v8', // bump v2.5 : force un reset local pour tous les joueurs
      partialize: (s) => ({
        pixelCoins:s.pixelCoins, nekoGems:s.nekoGems, totalClicks:s.totalClicks,
        totalKills:s.totalKills ?? 0, totalQuestsCompleted:s.totalQuestsCompleted ?? 0, totalUpgradesPerformed:s.totalUpgradesPerformed ?? 0, totalGachaPulls:s.totalGachaPulls ?? 0, totalBossKills:s.totalBossKills ?? 0, totalGemsSpent:s.totalGemsSpent ?? 0,
        wave:s.wave, palier:s.palier, maxPalierReached:s.maxPalierReached, runPeakPalier:s.runPeakPalier ?? null,
        currentEnemy:s.currentEnemy,
        equippedTeam:s.equippedTeam, collection:s.collection, hero:s.hero, goldUpgradeLevel:s.goldUpgradeLevel ?? 0,
        bossActive:s.bossActive, bossTimeLeft:s.bossTimeLeft,
        quests:s.quests, questsDayKey:s.questsDayKey,
        weeklyQuests:s.weeklyQuests, weeklyQuestsDayKey:s.weeklyQuestsDayKey,
        eventQuests:s.eventQuests,
        bossCrowns:s.bossCrowns, voidOrbs:s.voidOrbs,
        totalBossCrownsEarned:s.totalBossCrownsEarned ?? 0, totalVoidOrbsEarned:s.totalVoidOrbsEarned ?? 0,
        inventory:s.inventory,
        equipmentInventory:s.equipmentInventory,
        unlockedEquipRarities:s.unlockedEquipRarities,
        unlockedEquipDropRarities:s.unlockedEquipDropRarities,
        championInventory:s.championInventory ?? {},
        bankedRanks:s.bankedRanks ?? {},
        historicalMaxRank:s.historicalMaxRank ?? {},
        dpsBoostEndsAt:s.dpsBoostEndsAt, goldBoostEndsAt:s.goldBoostEndsAt,
        dailyShop:s.dailyShop, starterPackClaimed:s.starterPackClaimed,
        username:s.username,
        offlineMultLevel:s.offlineMultLevel, offlineCapLevel:s.offlineCapLevel, lastOfflineGain:s.lastOfflineGain,
        // savedAt DOIT être persisté ici : c'est ce qui permet à loadAndApply
        // (useCloudSave) de savoir que cet état local rechargé est déjà à jour.
        // Sans lui, il retombe à 0 à chaque refresh et se fait écraser par la
        // sauvegarde localStorage/Firebase précédente (jusqu'à 30s/10min plus
        // vieille) — ce qui annule les coffres ouverts, quêtes/succès réclamés
        // juste avant le refresh.
        savedAt:s.savedAt,
      }),
    }
  )
);
