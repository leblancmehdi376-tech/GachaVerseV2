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
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { initialBonusLevels } from '@/lib/game/prestige';
import type { GameStore } from './gameStore.types';
import { BN_ZERO, coerceBigNum } from '@/lib/game/bignum';
import { DAILY_QUEST_DEFS, WEEKLY_QUEST_DEFS, EVENT_QUESTS, rollQuestDefs, rollCoinHoursQuest } from './gameStoreHelpers';
import { createCombatSlice } from './slices/combatSlice';
import { createCharacterSlice } from './slices/characterSlice';
import { createEquipmentSlice } from './slices/equipmentSlice';
import { createGachaSlice } from './slices/gachaSlice';
import { createShopSlice } from './slices/shopSlice';
import { createQuestSlice } from './slices/questSlice';
import { createDailyRewardSlice } from './slices/dailyRewardSlice';
import { createMetaProgressionSlice } from './slices/metaProgressionSlice';
import { createAchievementSlice } from './slices/achievementSlice';
import { createPrestigeSlice } from './slices/prestigeSlice';
import { createUltimateSlice } from './slices/ultimateSlice';
import { createExpeditionSlice, initialDefAffinities, backfillDefAffinities } from './slices/expeditionSlice';
import { createMineSlice } from './slices/mineSlice';
import { createAnomalySlice } from './slices/anomalySlice';
import { migrateAnomalies } from '@/lib/game/anomalies';

// Réexports publics — préservent l'API historique de '@/store/gameStore'
// pour tous les fichiers qui importent ces symboles.
export type { Quest, OfflineGain, ActiveUlt, ActiveExpedition } from './gameStore.types';
export {
  getGoldChestCost, getGoldChestMultiplier, getPalierPassGems, bumpPalierBossQuests, bumpEventBossQuests,
  GOLD_CHEST_COST_BASE, GOLD_CHEST_COST_GROWTH, GOLD_CHEST_MULT_GROWTH,
  MOB_GEM_DROP_CHANCE, FARM_EQUIP_DROP_RATE,
  OFFLINE_MULT_TIERS, OFFLINE_REWARD_SCALE_TIERS, OFFLINE_CAP_TIERS_H,
  OFFLINE_MULT_COSTS, OFFLINE_CAP_COSTS, OFFLINE_MIN_SECONDS,
  MINE_PURCHASE_COST_CROWNS, MINE_BASE_RATE_PER_HOUR, MINE_CAP_TIERS, MINE_SPEED_MULT_TIERS,
  MINE_CAP_UPGRADE_COSTS, MINE_SPEED_UPGRADE_COSTS,
} from './gameStoreHelpers';

const makeInitial = () => ({
  pixelCoins: BN_ZERO, nekoGems: 10, totalClicks: 0,
  totalKills: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0, totalGachaPulls: 0, totalBossKills: 0, totalGemsSpent: 0,
  totalBossCrownsEarned: 0, totalVoidOrbsEarned: 0,
  prestigeStatBaselines: { totalKills: 0, totalGachaPulls: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0 },
  wave: 1, palier: 1, maxPalierReached: 1, runPeakPalier: null as number | null,
  currentEnemy: generateEnemy(1, 1),
  goldUpgradeLevel: 0,
  equippedTeam: [null, null, null, null] as (string|null)[],
  collection: {} as Record<string, OwnedCharacter>,
  compadexCharactersSeen: {} as Record<string, true>,
  compadexEquipmentSeen: {} as Record<string, true>,
  hero: { level: 1, currentForm: 0, xp: 0 } as HeroState,
  bossActive: false, bossTimeLeft: 0, bossAvoided: false,
  ultUsedThisFight: [] as string[],
  lastSaved: Date.now(),
  lastBossVictory: null as GameStore['lastBossVictory'],
  username: 'NEKOZ',
  quests: [...rollQuestDefs(DAILY_QUEST_DEFS), rollCoinHoursQuest(0)].map(q => ({ ...q, current: 0, done: false })),
  questsDayKey: getTodayDayKey(),
  weeklyQuests: rollQuestDefs(WEEKLY_QUEST_DEFS).map(q => ({ ...q, current: 0, done: false })),
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
  dailyShop: { dayKey: '', characterIds: [] as string[], purchased: [] as string[], rerollCount: 0 },
  collectionFilter: 'all',
  collectionUniverse: 'all',
  collectionAffinity: 'all',
  collectionSort: 'rarity',
  starterPackClaimed: false,
  dailyRewardDayKey: '',
  dailyRewardCurrentDay: 1,
  dailyRewardClaimedToday: false,
  dailyRewardClaimedDays: [] as number[],
  offlineMultLevel: 0,
  offlineCapLevel: 0,
  lastOfflineGain: null,
  savedAt: 0,
  // ── Succès et titres ──
  achievementProgress: {} as Record<string, number>,
  achievementUnlocked: {} as Record<string, boolean>,
  achievementsClaimed: {} as Record<string, boolean>,
  activeTitle: 'Novice',
  unlockedTitles: ['Novice'] as string[],
  // ── Prestige ──
  prestigeLevel: 0,
  prestigeTokens: 0,
  prestigeBonusLevels: initialBonusLevels(),
  prestigeRankRecoveryLevel: 0,
  // ── Ultimes (activeUlts/animating jamais persistés — expirent au reload) ──
  ultCooldowns: {} as Record<string, number>,
  ultActiveUlts: [] as GameStore['ultActiveUlts'],
  ultAnimating: null as string | null,
  // ── Expéditions et craft/forge ──
  expeditionActive: [] as GameStore['expeditionActive'],
  expeditionDropInventory: {} as Record<string, number>,
  expeditionCraftedRecipes: [] as string[],
  expeditionSlotLevel: 0,
  expeditionDefAffinities: initialDefAffinities(),
  // ── Mine de gemmes ──
  mineOwned: false,
  mineCapLevel: 0,
  mineSpeedLevel: 0,
  mineGems: 0,
  mineLastTickAt: 0,
  // ── Anomalies (jamais reset au Prestige) ──
  anomalyTokens: 0,
  ownedAnomalies: [] as GameStore['ownedAnomalies'],
  anomalySlots: 1,
});

// ─── Migration depuis les 4 anciens stores Zustand séparés ─────────────────
// Avant la fusion en slices (voir ce fichier + store/slices/achievement|
// prestige|ultimate|expeditionSlice.ts), achievements/prestige/ultimes/
// expéditions vivaient dans 4 stores persistés sous 4 clés localStorage
// distinctes. Ce marqueur garantit qu'on ne relit ces anciennes clés
// qu'UNE SEULE fois par navigateur (indépendamment de 'nekoz-world-v8', qui
// existe déjà pour tout joueur ayant une partie en cours et ne peut donc pas
// servir lui-même d'indicateur "déjà migré"). Les anciennes clés ne sont PAS
// supprimées après lecture (coût disque négligeable, évite un point de
// défaillance supplémentaire sur un chemin critique pour la rétention).
const LEGACY_MERGE_MARKER = 'nekoz-stores-merge-v1';
let didMigrateLegacyStoresThisLoad = false;

function readLegacyPersisted<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed?.state ?? null) as T | null;
  } catch { return null; }
}

function migrateLegacyStoresOnce(): Partial<GameStore> | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(LEGACY_MERGE_MARKER)) return null;
  localStorage.setItem(LEGACY_MERGE_MARKER, '1');

  const achievement = readLegacyPersisted<{ progress: Record<string, number>; unlocked: Record<string, boolean>; claimed: Record<string, boolean>; activeTitle: string; unlockedTitles: string[] }>('gachaverse_achievements_v2');
  const prestige     = readLegacyPersisted<{ level: number; tokens: number; bonusLevels: GameStore['prestigeBonusLevels']; rankRecoveryLevel: number }>('gachaverse_prestige_v2');
  const ultimate     = readLegacyPersisted<{ cooldowns: Record<string, number> }>('nekoz-ult-v2');
  const expedition   = readLegacyPersisted<{ active: GameStore['expeditionActive']; dropInventory: Record<string, number>; craftedRecipes: string[]; expeditionSlotLevel: number; defAffinities: Record<string, string> }>('gachaverse_expeditions_v2');
  if (!achievement && !prestige && !ultimate && !expedition) return null;

  didMigrateLegacyStoresThisLoad = true;
  return {
    ...(achievement && {
      achievementProgress: achievement.progress, achievementUnlocked: achievement.unlocked,
      achievementsClaimed: achievement.claimed, activeTitle: achievement.activeTitle, unlockedTitles: achievement.unlockedTitles,
    }),
    ...(prestige && {
      prestigeLevel: prestige.level, prestigeTokens: prestige.tokens,
      prestigeBonusLevels: prestige.bonusLevels, prestigeRankRecoveryLevel: prestige.rankRecoveryLevel,
    }),
    ...(ultimate && { ultCooldowns: ultimate.cooldowns }),
    ...(expedition && {
      expeditionActive: expedition.active, expeditionDropInventory: expedition.dropInventory,
      expeditionCraftedRecipes: expedition.craftedRecipes, expeditionSlotLevel: expedition.expeditionSlotLevel,
      expeditionDefAffinities: expedition.defAffinities as GameStore['expeditionDefAffinities'],
    }),
  };
}

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
      ...createDailyRewardSlice(set, get, api),
      ...createMetaProgressionSlice(set, get, api),
      ...createAchievementSlice(set, get, api),
      ...createPrestigeSlice(set, get, api),
      ...createUltimateSlice(set, get, api),
      ...createExpeditionSlice(set, get, api),
      ...createMineSlice(set, get, api),
      ...createAnomalySlice(set, get, api),

      resetGame: () => {
        try { localStorage.clear(); } catch {}
        set(makeInitial());
      },
    }),
    {
      name: 'nekoz-world-v8', // bump v2.5 : force un reset local pour tous les joueurs
      merge: (persisted, current) => {
        // Réhydratation tardive (voir waitForAllHydrated dans lib/firebase/cloudSaveSync.ts,
        // filet de sécurité 3s) : si `current` porte déjà un `savedAt` plus
        // récent que le blob localStorage qu'on s'apprête à fusionner, c'est
        // qu'un chargement cloud (loadAndApply) a eu le temps de s'appliquer
        // AVANT que cette réhydratation lente ne se termine — fusionner quand
        // même écraserait silencieusement cette donnée cloud fraîche (ex: reset
        // de prestige) par l'ancien state local périmé de CET appareil. On
        // ignore alors le blob localStorage plutôt que de l'utiliser.
        const persistedObj = (persisted ?? {}) as Record<string, unknown>;
        const currentSavedAt = (current as GameStore).savedAt;
        const persistedSavedAt = persistedObj.savedAt;
        const currentTs = typeof currentSavedAt === 'number' && Number.isFinite(currentSavedAt) ? currentSavedAt : 0;
        const persistedTs = typeof persistedSavedAt === 'number' && Number.isFinite(persistedSavedAt) ? persistedSavedAt : 0;
        const staleLocalRehydration = persistedTs < currentTs;
        const raw: Record<string, unknown> = staleLocalRehydration
          ? { ...current, ...migrateLegacyStoresOnce() }
          : { ...current, ...persistedObj, ...migrateLegacyStoresOnce() };
        // Migration BigNum : les anciennes sauvegardes (ou une save déjà
        // corrompue par le bug de débordement vers Infinity que ce type
        // corrige — JSON.stringify(Infinity) === null) stockent encore ces
        // champs en `number` brut (ou `null`) — coerceBigNum les remet en forme.
        raw.pixelCoins = coerceBigNum(raw.pixelCoins);
        if (raw.currentEnemy && typeof raw.currentEnemy === 'object') {
          const enemy = raw.currentEnemy as Record<string, unknown>;
          raw.currentEnemy = {
            ...enemy,
            maxHp: coerceBigNum(enemy.maxHp),
            currentHp: coerceBigNum(enemy.currentHp),
            pixelCoinsReward: coerceBigNum(enemy.pixelCoinsReward),
          };
        }
        if (raw.lastOfflineGain && typeof raw.lastOfflineGain === 'object') {
          const gain = raw.lastOfflineGain as Record<string, unknown>;
          raw.lastOfflineGain = { ...gain, coins: coerceBigNum(gain.coins) };
        }
        if (raw.lastBossVictory && typeof raw.lastBossVictory === 'object') {
          const victory = raw.lastBossVictory as Record<string, unknown>;
          raw.lastBossVictory = { ...victory, coins: coerceBigNum(victory.coins) };
        }
        const merged = raw as unknown as GameStore;
        // Backfill des types d'expédition manquants (voir backfillDefAffinities) :
        // une sauvegarde antérieure à l'ajout d'une nouvelle expédition sans
        // univers de perso réel n'a pas d'entrée pour elle dans
        // expeditionDefAffinities — sans ce backfill, getExpeditionAffinity
        // retombe sur un tirage à la volée à CHAQUE lecture (donc à chaque
        // render) au lieu d'un type stable jusqu'au claim de l'expédition.
        merged.expeditionDefAffinities = backfillDefAffinities(merged.expeditionDefAffinities ?? {});
        // Migration des anomalies possédées dont la `value` persistée ne
        // correspond plus au barème actuel (rework d'échelle, voir
        // migrateAnomalies) — tourne à CHAQUE réhydratation, pas juste lors
        // d'une migration legacy, pour rattraper aussi un joueur qui n'ouvre
        // le jeu qu'après plusieurs rebalances successives.
        merged.ownedAnomalies = migrateAnomalies(merged.ownedAnomalies ?? []);
        // Backfill titres (ex-onRehydrateStorage d'achievementStore) — tourne à
        // CHAQUE rehydration, pas juste lors d'une migration legacy : garantit
        // 'Novice' (titre de départ gratuit) même pour les parties commencées
        // avant l'ajout de ce correctif, et reconstruit les titres de succès
        // déjà débloqués avant l'ajout de la récompense de titre correspondante.
        if (!merged.unlockedTitles.includes('Novice')) {
          merged.unlockedTitles = [...merged.unlockedTitles, 'Novice'];
        }
        const missingTitles = ACHIEVEMENTS.filter(a =>
          a.reward?.type === 'title' && typeof a.reward.value === 'string' &&
          !merged.unlockedTitles.includes(a.reward.value) && !!merged.achievementUnlocked[a.id]
        ).map(a => a.reward!.value as string);
        if (missingTitles.length > 0) {
          merged.unlockedTitles = [...new Set([...merged.unlockedTitles, ...missingTitles])];
        }
        return merged;
      },
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
        prestigeStatBaselines:s.prestigeStatBaselines ?? { totalKills: 0, totalGachaPulls: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0 },
        inventory:s.inventory,
        equipmentInventory:s.equipmentInventory,
        unlockedEquipRarities:s.unlockedEquipRarities,
        unlockedEquipDropRarities:s.unlockedEquipDropRarities,
        championInventory:s.championInventory ?? {},
        bankedRanks:s.bankedRanks ?? {},
        historicalMaxRank:s.historicalMaxRank ?? {},
        // Nombre d'achats déjà effectués par boss d'événement (prix +10% par
        // achat, voir getEventCharacterCost) — jamais synchronisé avant ce
        // correctif : un refresh/reconnexion faisait revenir le prix à son
        // tarif de départ (bug mineur, favorable au joueur).
        eventCharacterPurchases:s.eventCharacterPurchases ?? {},
        dpsBoostEndsAt:s.dpsBoostEndsAt, goldBoostEndsAt:s.goldBoostEndsAt,
        dailyShop:s.dailyShop, starterPackClaimed:s.starterPackClaimed,
        dailyRewardDayKey:s.dailyRewardDayKey, dailyRewardCurrentDay:s.dailyRewardCurrentDay,
        dailyRewardClaimedToday:s.dailyRewardClaimedToday, dailyRewardClaimedDays:s.dailyRewardClaimedDays ?? [],
        username:s.username,
        offlineMultLevel:s.offlineMultLevel, offlineCapLevel:s.offlineCapLevel, lastOfflineGain:s.lastOfflineGain,
        // savedAt DOIT être persisté ici : c'est ce qui permet à loadAndApply
        // (useCloudSave) de savoir que cet état local rechargé est déjà à jour.
        // Sans lui, il retombe à 0 à chaque refresh et se fait écraser par la
        // sauvegarde localStorage/Firebase précédente (jusqu'à 30s/10min plus
        // vieille) — ce qui annule les coffres ouverts, quêtes/succès réclamés
        // juste avant le refresh.
        savedAt:s.savedAt,
        // Champs migrés depuis les 4 anciens stores (voir migrateLegacyStoresOnce
        // ci-dessus) — persistés localement dans leurs stores d'origine, donc
        // persistés ici aussi. ultActiveUlts/ultAnimating restent volontairement
        // HORS partialize (n'étaient déjà pas persistés avant cette fusion —
        // expirent au reload). achievementProgress/achievementUnlocked SONT
        // persistés localement ici (comme avant), mais restent hors cloud-sync
        // (voir INTENTIONALLY_TRANSIENT_FIELDS dans hooks/useCloudSave.test.ts).
        achievementProgress:s.achievementProgress, achievementUnlocked:s.achievementUnlocked,
        achievementsClaimed:s.achievementsClaimed, activeTitle:s.activeTitle, unlockedTitles:s.unlockedTitles,
        prestigeLevel:s.prestigeLevel, prestigeTokens:s.prestigeTokens,
        prestigeBonusLevels:s.prestigeBonusLevels, prestigeRankRecoveryLevel:s.prestigeRankRecoveryLevel,
        ultCooldowns:s.ultCooldowns,
        expeditionActive:s.expeditionActive, expeditionDropInventory:s.expeditionDropInventory,
        expeditionCraftedRecipes:s.expeditionCraftedRecipes, expeditionSlotLevel:s.expeditionSlotLevel,
        expeditionDefAffinities:s.expeditionDefAffinities,
        mineOwned:s.mineOwned, mineCapLevel:s.mineCapLevel, mineSpeedLevel:s.mineSpeedLevel,
        mineGems:s.mineGems, mineLastTickAt:s.mineLastTickAt,
        // Anomalies — jamais reset au Prestige (voir doPrestige), doivent donc
        // être persistées comme bossCrowns/voidOrbs.
        anomalyTokens:s.anomalyTokens ?? 0, ownedAnomalies:s.ownedAnomalies ?? [], anomalySlots:s.anomalySlots ?? 1,
        // Compadex — jamais reset au Prestige (même traitement qu'historicalMaxRank).
        compadexCharactersSeen:s.compadexCharactersSeen ?? {}, compadexEquipmentSeen:s.compadexEquipmentSeen ?? {},
      }),
    }
  )
);

// Si une migration legacy vient d'avoir lieu (voir migrateLegacyStoresOnce),
// force un flush immédiat sur disque une fois l'hydratation terminée : sans
// ça, les champs migrés ne seraient écrits dans 'nekoz-world-v8' qu'au
// prochain set() réel (le middleware persist n'écrit pas spontanément après
// merge()) — une fermeture/crash du navigateur entre les deux, avant ce
// premier set(), perdrait la migration (LEGACY_MERGE_MARKER empêche toute
// nouvelle tentative). onFinishHydration (plutôt qu'un simple check juste
// après create()) est nécessaire : le storage du middleware persist est lu
// via une chaîne de Promises, donc merge() n'a pas encore tourné au moment
// où create() retourne — s'abonner ici, synchrone, avant le premier
// microtask, ne peut pas rater l'événement.
if (typeof window !== 'undefined') {
  useGameStore.persist.onFinishHydration(() => {
    if (didMigrateLegacyStoresThisLoad) useGameStore.setState({});
  });
}
