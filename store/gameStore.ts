'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState, OwnedCharacter, HeroState, EquipmentSlot, EquippedItems, defaultEquippedItems, getPalierConfig,
  calcCharDps, calcHeroDpc, xpToNextLevel, levelUpCost, heroLevelUpCost,
  calcBaseDpc, calcClickUpgradeCost,
  evoCost, canEvolve, canEvolveHero, getLevelCap, RARITY_CONFIG, Rarity,
} from '@/types/game';
import { generateEnemy } from '@/lib/game/enemies';
import { rollCharacter, rollMulti, rollMulti100, GACHA_COSTS } from '@/lib/game/gacha';
import { getCharacterById, HERO_TEMPLATE, BANNER_POOL } from '@/lib/game/characters';
import { ITEM_DEFS, rollEquipmentChest } from '@/lib/game/items';
import { EQUIPMENT_CHESTS } from '@/lib/game/shop';
import { computeActiveSynergies, calcDpsWithSynergies } from '@/lib/game/synergies';
import { getUltimateDef } from '@/lib/game/ultimates';
import { auth } from '@/lib/firebase/config';
import { updatePlayerScore } from '@/lib/firebase/leaderboard';
import { useUltimateStore, getActiveCoinMultiplier } from '@/store/ultimateStore';
import { usePrestigeStore, getPrestigeBonuses } from '@/store/prestigeStore';
import { getAffinityForId, getAffinityMultiplier } from '@/lib/game/affinities';
import { rollCardEdition, makeInstanceKey, parseInstanceKey, CardEdition } from '@/lib/game/editions';
import { useAchievementStore } from '@/store/achievementStore';
import { getTitleGoldMultiplier } from '@/lib/game/titles';
import { getEquipmentDrop, getEquipmentDef } from '@/lib/game/items';
import {
  CROWN_GEM_PACKS, ORB_GEM_PACKS, GEM_GOLD_PACKS, BOOST_COST_CROWNS, BOOST_DURATION_MS, BOOST_MULTIPLIER,
  getVoidOrbsForRarity, SHOP_CHAR_PRICE_ORBS, getTodayDayKey, getThisWeekKey, generateDailyShopCharacters,
  LAUNCH_TIMESTAMP, STARTER_PACK_WINDOW_MS, STARTER_PACK_REWARDS,
} from '@/lib/game/shop';

export interface Quest {
  id: string; label: string; icon: string;
  target: number; current: number; reward: number; rewardType: 'gems'|'coins'; done: boolean;
  type: 'daily' | 'weekly' | 'event';
}

// ── Quêtes journalières (reset 2h Paris) ─────────────────────────────────
const DAILY_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'d_kills_500',    label:'Vaincre 500 monstres',          icon:'⚔',  target:500,   reward:15, rewardType:'gems',  type:'daily' },
  { id:'d_kills_1000',   label:'Vaincre 1 000 monstres',        icon:'💀',  target:1000,  reward:25, rewardType:'gems',  type:'daily' },
  { id:'d_kills_250',    label:'Vaincre 250 monstres',          icon:'⚔',  target:250,   reward:12, rewardType:'gems',  type:'daily' },
  { id:'d_upgrade_10',   label:'Améliorer 10 fois',             icon:'⬆',  target:10,    reward:10, rewardType:'gems',  type:'daily' },
  { id:'d_boss_kill',    label:'Vaincre 1 boss de palier',      icon:'👑',  target:1,     reward:20, rewardType:'gems',  type:'daily' },
  { id:'d_coins_1m',     label:'Accumuler 1 000 000 coins',     icon:'🪙',  target:1_000_000, reward:15, rewardType:'gems', type:'daily' },
];

// ── Quêtes hebdomadaires (reset lundi 2h Paris) ───────────────────────────
const WEEKLY_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'w_kills_5000',   label:'Vaincre 5 000 monstres',        icon:'⚔',  target:5000,  reward:80,  rewardType:'gems',  type:'weekly' },
  { id:'w_boss_5',       label:'Vaincre 5 boss de palier',      icon:'👑',  target:5,     reward:100, rewardType:'gems',  type:'weekly' },
  { id:'w_upgrade_50',   label:'Améliorer 50 fois',             icon:'⬆',  target:50,    reward:60,  rewardType:'gems',  type:'weekly' },
  { id:'w_gacha_10',     label:'Effectuer 10 tirages gacha',    icon:'💎',  target:10,    reward:120, rewardType:'gems',  type:'weekly' },
  { id:'w_coins_10m',    label:'Accumuler 10 000 000 coins',    icon:'🪙',  target:10_000_000, reward:70, rewardType:'gems', type:'weekly' },
  { id:'w_expedition_1', label:'Terminer 1 expédition',         icon:'🧭',  target:1,     reward:90,  rewardType:'gems',  type:'weekly' },
];

// ── Quêtes d'événement (permanentes jusqu'à complétion) ───────────────────
const EVENT_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'e_forge_1',      label:'Forger ton premier personnage',         icon:'⚗',  target:1,   reward:200, rewardType:'gems',  type:'event' },
  { id:'e_expedition_5', label:'Terminer 5 expéditions',               icon:'🧭',  target:5,   reward:150, rewardType:'gems',  type:'event' },
  { id:'e_palier_10',    label:'Atteindre le palier 10',               icon:'🌌',  target:10,  reward:180, rewardType:'gems',  type:'event' },
  { id:'e_palier_20',    label:'Atteindre le palier 20',               icon:'👑',  target:20,  reward:300, rewardType:'gems',  type:'event' },
  { id:'e_collection_20',label:'Obtenir 20 personnages différents',    icon:'📚',  target:20,  reward:120, rewardType:'gems',  type:'event' },
  { id:'e_boss_20',      label:'Vaincre 20 boss au total',             icon:'💀',  target:20,  reward:250, rewardType:'gems',  type:'event' },
];

// Coût et multiplicateur du Coffre d'Or — partagés entre upgradeGold() et resolveEnemyDeath()
// 8 niveaux, multiplicateur max ×5 (était ×2 en 6 niveaux)
export const GOLD_UPGRADE_COSTS = [
  6_000,       // lv1 (≈×1.5)
  30_000,      // lv2
  120_000,     // lv3
  450_000,     // lv4
  1_200_000,   // lv5
  4_500_000,   // lv6
  18_000_000,  // lv7
  75_000_000,  // lv8
];
export const GOLD_MULTIPLIERS = [1, 1.25, 1.55, 1.90, 2.35, 2.90, 3.75, 4.50, 5.00];

// ── Anti-exploit multi-onglets ─────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'gachaverse_save';
const BROADCAST_CHANNEL = typeof window !== 'undefined' ? new BroadcastChannel('gachaverse_state') : null;

// Vérifie le bonus "bonusFor" d'un équipement pour un perso donné — accepte
// une cible unique ou plusieurs (ex: un objet qui boost Aizen ET Aizen
// Transcendant). Utilisé pour TOUS les emplacements, pas juste l'arme —
// avant ce correctif, le bonus des objets non-armes (ex: Plastron Primordial
// de Cid Kagenou) était défini mais jamais réellement appliqué au DPS.
function getEquipBonusMult(def: ReturnType<typeof getEquipmentDef>, templateId: string): number {
  if (!def?.bonusFor) return 1;
  const target = def.bonusFor.templateId;
  const matches = Array.isArray(target) ? target.includes(templateId) : target === templateId;
  return matches ? def.bonusFor.multiplier : 1;
}

// Sauvegarde immédiate en localStorage + diffuse aux autres onglets
function broadcastAndSaveLocal() {
  if (typeof window === 'undefined') return;
  try {
    const s = useGameStore.getState();
    const snapshot = { nekoGems: s.nekoGems, collection: s.collection, equipmentInventory: s.equipmentInventory, savedAt: Date.now() };
    const raw = JSON.stringify(snapshot);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '{}'), ...snapshot }));
    BROADCAST_CHANNEL?.postMessage({ type: 'PULL_SYNC', data: snapshot });
  } catch { /* ignore */ }
}

// Écoute les mises à jour des autres onglets
if (BROADCAST_CHANNEL) {
  BROADCAST_CHANNEL.onmessage = (event) => {
    if (event.data?.type === 'PULL_SYNC') {
      const { nekoGems, collection, equipmentInventory } = event.data.data;
      useGameStore.setState({ nekoGems, collection, equipmentInventory });
    }
  };
}

// Récompenses de progression
export const PALIER_PASS_GEMS    = 20;     // gemmes données à chaque palier franchi (mort du boss)
export const MOB_GEM_DROP_CHANCE = 0.005;  // 0.5% de chance de looter 1 gemme bonus sur N'IMPORTE QUEL ennemi tué
// Taux de drop d'équipement en mode farm (palier < maxPalierReached) : ×0.25 = 4× plus lent.
export const FARM_EQUIP_DROP_RATE = 0.25;

// Cooldown anti-spam entre deux mobs : après un clic qui TUE un ennemi, les clics
// suivants sont ignorés pendant ce court délai (évite qu'un très gros CPS enchaîne
// 15-20 mobs/seconde sur un palier bas et fasse buguer le spawn).
const SPAWN_COOLDOWN_MS = 80;
let clickSpawnLockUntil = 0;

// Idle : plancher de DPS pour qu'un joueur SANS compagnon progresse quand même
// (lentement) en début de partie. Exprimé en fraction des PV de l'ennemi courant
// → temps de kill ~constant, mais trop faible pour battre un boss dans les temps.
const BASE_IDLE_DPS_HP_FRACTION = 0.006; // ~167 s pour tuer un mob sans aucun compagnon

// ─── Gains hors-ligne (idle) ────────────────────────────────────────────
// Multiplicateur appliqué au revenu passif (DPS) accumulé hors-ligne.
export const OFFLINE_MULT_TIERS  = [0.5, 0.55, 0.6, 0.65, 0.7];
// Échelle du gain réel hors-ligne : 0.30 au niveau 1, jusqu'à 0.90 au niveau max.
export const OFFLINE_REWARD_SCALE_TIERS = [0.30, 0.42, 0.55, 0.72, 0.90];
// Durée max créditée hors-ligne, en heures : 2h au niveau 1, 12h au niveau max.
export const OFFLINE_CAP_TIERS_H = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Coûts en couronnes (👑) pour passer au niveau suivant (index = niveau actuel).
export const OFFLINE_MULT_COSTS  = [20, 45, 80, 130];                              // 5 paliers → 4 upgrades
export const OFFLINE_CAP_COSTS   = [10, 18, 28, 42, 60, 82, 108, 140, 178, 220];   // 11 paliers → 10 upgrades
export const OFFLINE_MIN_SECONDS = 60; // en dessous, on n'affiche pas de récap

export interface OfflineGain {
  coins: number;      // coins crédités
  gems: number;       // gemmes crédités (drops de mobs normaux uniquement)
  kills: number;      // nombre de mobs normaux simulés
  seconds: number;    // durée créditée (après plafond)
  rawSeconds: number; // durée réelle d'absence
  capped: boolean;    // true si l'absence a dépassé le plafond
  at: number;         // timestamp du calcul
}

// Critique de base (hors ultimates) — Canarticho/The Dress peuvent le surcharger temporairement
const BASE_CRIT_CHANCE  = 0.08;
const CRIT_DAMAGE_BONUS = 0.5; // +50% de dégâts sur un coup critique

export interface ClickResult { dmg: number; crit: boolean; }

interface GameStore extends GameState {
  quests: Quest[];
  questsDayKey: string;
  weeklyQuests: Quest[];
  weeklyQuestsDayKey: string;
  eventQuests: Quest[];
  // Musique
  musicVolume: number;
  musicMuted:  boolean;
  setMusicVolume: (v: number) => void;
  toggleMusicMuted: () => void;
  eventMusicActive: boolean;          // true tant qu'une page d'event avec sa propre musique est ouverte
  setEventMusicActive: (v: boolean) => void;
  // Monnaies additionnelles
  bossCrowns: number;
  voidOrbs: number;
  // Boosts temporaires (BossCrown)
  dpsBoostEndsAt: number;
  eventDpsMult: number;
  eventDpsMultEndsAt: number;
  getEventDpsMult: () => number;
  setEventDpsMult: (mult: number, durationMs: number) => void;
  dealInstantDamage: (dmg: number) => void;
  grantEventRewards: (coins?: number, gems?: number, crowns?: number) => void;
  goldBoostEndsAt: number;
  isDpsBoostActive: () => boolean;
  isGoldBoostActive: () => boolean;
  buyDpsBoost: () => void;
  buyGoldBoost: () => void;
  buyGemsWithCrowns: (packId: string) => void;
  buyGoldWithGems: (packId: string) => void;
  // Inventaire objets d'évolution
  inventory: Record<string, number>;
  equipmentInventory: Record<string, number>;
  lastEquipmentDrop: string | null;
  addItem: (itemId: string, qty?: number) => void;
  sellItem: (itemId: string, qty: number) => void;
  addEquipment: (equipmentId: string, qty?: number) => void;
  recycleEquipment: (equipmentId: string, qty?: number) => void;
  equipItem: (templateId: string, slot: EquipmentSlot, equipmentId: string) => void;
  unequipItem: (templateId: string, slot: EquipmentSlot) => void;
  setLastEquipmentDrop: (id: string | null) => void;
  // Filtres de collection persistants entre les pages / onglets
  collectionFilter: string;
  collectionUniverse: string | 'all';
  collectionAffinity: string;
  collectionSort: string;
  setCollectionFilters: (patch: { filter?: string; universe?: string | 'all'; affinity?: string; sort?: string }) => void;
  // Boutique quotidienne (Orbe du Néant)
  dailyShop: { dayKey: string; characterIds: string[]; purchased: string[] };
  ensureDailyShop: () => void;
  buyShopCharacter: (slotIndex: number) => void;
  buyGemsWithOrbs: (packId: string) => void;
  buyEquipmentChest: (tier: 'common' | 'rare' | 'epic') => string | null;
  recycleChampion:   (templateId: string) => void;
  recycleChampionsByRarity: (rarity: Rarity) => { count: number; orbs: number };
  removeChampion:    (templateId: string) => void; // pour HdV
  // Pack de démarrage Early Access
  starterPackClaimed: boolean;
  isStarterPackAvailable: () => boolean;
  claimStarterPack: () => { templateId: string; edition: CardEdition } | null;
  // Pause (anti-autoclick)
  gamePaused: boolean;
  setGamePaused: (v: boolean) => void;
  // Timestamp de la dernière sauvegarde locale (anti-rollback)
  savedAt: number;
  // Flag to temporarily suppress toasts/notifications during state restore
  suppressToasts: boolean;
  // Combat
  clickEnemy: () => ClickResult;
  retreatFromBoss: () => void;
  challengeBoss: () => void;
  travelToPalier: (palier: number) => void;
  tickDps: () => void;
  tickBossTimer: () => void;
  activateCharacterUltimate: (templateId: string, formIndex: number) => void;
  // Ressources
  spendPixelCoins: (n: number) => boolean;
  // Héros
  levelUpHero: () => void;
  evolveHero: () => void;
  getHeroDpc: () => number;
  getClickUpgradeCost: () => number;
  upgradeClick: () => void;
  upgradeGold: () => void;
  getGoldMultiplier: () => number;
  getGoldUpgradeCost: () => number;
  // Personnages
  levelUpCharacter: (templateId: string) => void;
  evolveCharacter: (templateId: string) => void;
  getTotalDps: () => number;
  getCharDpsBreakdown: (templateId: string) => { base: number; typeMult: number; final: number };
  equipCharacter: (id: string, slot: number) => void;
  unequipCharacter: (slot: number) => void;
  // Joueur
  username: string;
  setUsername: (name: string) => void;
  // Gacha
  pullSingle: () => { templateId: string; edition: CardEdition } | null;
  pullMulti: () => { templateId: string; edition: CardEdition }[] | null;
  pullMulti100: () => { templateId: string; edition: CardEdition }[] | null;
  addToCollection: (id: string) => CardEdition;
  grantMaxedCharacter: (templateId: string, edition?: CardEdition) => void;
  // Quêtes
  bumpQuestProgress: (id: string, by?: number) => void;
  setQuestProgress: (id: string, value: number) => void;
  claimQuest: (id: string) => void;
  ensureDailyQuests: () => void;
  ensureWeeklyQuests: () => void;
  claimWeeklyQuest: (id: string) => void;
  claimEventQuest: (id: string) => void;
  bumpEventQuest: (id: string, by?: number) => void;
  doPrestige: () => void;
  // Gains hors-ligne (idle)
  lastActiveAt: number;
  offlineMultLevel: number;
  offlineCapLevel: number;
  lastOfflineGain: OfflineGain | null;
  lastBossVictory: { palier: number; gems: number; coins: number; crowns: number; at: number } | null;
  clearBossVictory: () => void;
  getOfflineMult: () => number;
  getOfflineCapHours: () => number;
  getOfflineRewardScale: () => number;
  getOfflineCoinsPerHour: () => number;
  getOfflineKillsPerHour: () => number;
  getOfflineGemsPerHour: () => number;
  getOfflineMultCost: () => number | null;
  getOfflineCapCost: () => number | null;
  upgradeOfflineMult: () => void;
  upgradeOfflineCap: () => void;
  claimOfflineEarnings: () => OfflineGain | null;
  resetGame: () => void;
}

const makeInitial = () => ({
  pixelCoins: 0, nekoGems: 10, totalClicks: 0,
  totalKills: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0, totalGachaPulls: 0, totalBossKills: 0, totalGemsSpent: 0,
  wave: 1, palier: 1, maxPalierReached: 1,
  currentEnemy: generateEnemy(1, 1),
  baseDpc: 1, clickUpgradeLevel: 0, goldUpgradeLevel: 0,
  equippedTeam: [null, null, null, null] as (string|null)[],
  collection: {} as Record<string, OwnedCharacter>,
  hero: { level: 1, currentForm: 0, xp: 0 } as HeroState,
  bossActive: false, bossTimeLeft: 0, bossAvoided: false,
  ultUsedThisFight: [] as string[],
  lastSaved: Date.now(),
  lastActiveAt: Date.now(),
  offlineMultLevel: 0,
  offlineCapLevel: 0,
  lastOfflineGain: null as OfflineGain | null,
  lastBossVictory: null as { palier: number; gems: number; coins: number; crowns: number; at: number } | null,
  username: 'NEKOZ',
  quests: DAILY_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  questsDayKey: getTodayDayKey(),
  weeklyQuests: WEEKLY_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  weeklyQuestsDayKey: getThisWeekKey(),
  eventQuests: EVENT_QUESTS.map(q => ({ ...q, current: 0, done: false })),
  musicVolume: 0.5, musicMuted: false, eventMusicActive: false,
  // Flag to temporarily suppress toasts/notifications during state restore
  suppressToasts: false,
  bossCrowns: 0, voidOrbs: 0,
  inventory: {} as Record<string, number>,
  equipmentInventory: {} as Record<string, number>,
  championInventory:  {} as Record<string, number>,
  lastEquipmentDrop: null,
  dpsBoostEndsAt: 0, goldBoostEndsAt: 0,
  eventDpsMult: 1, eventDpsMultEndsAt: 0,
  dailyShop: { dayKey: '', characterIds: [] as string[], purchased: [] as string[] },
  collectionFilter: 'all',
  collectionUniverse: 'all',
  collectionAffinity: 'all',
  collectionSort: 'rarity',
  starterPackClaimed: false,
  gamePaused: false,
  savedAt: 0,
});

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...makeInitial(),

      setCollectionFilters: (patch) => set((state) => ({
        collectionFilter: patch.filter ?? state.collectionFilter,
        collectionUniverse: patch.universe ?? state.collectionUniverse,
        collectionAffinity: patch.affinity ?? state.collectionAffinity,
        collectionSort: patch.sort ?? state.collectionSort,
      })),

      // ─── Combat ───────────────────────────────────────────────────────
      retreatFromBoss: () => {
        const state = get();
        if (!state.bossActive && state.wave !== 10) return;
        set({
          wave:         1,
          bossActive:   false,
          bossTimeLeft: 0,
          bossAvoided:  true,
          currentEnemy: generateEnemy(1, state.palier, state.maxPalierReached),
        });
      },

      challengeBoss: () => {
        const state = get();
        if (state.palier < state.maxPalierReached) return; // pas de boss en mode farm
        set({
          wave:         10,
          bossActive:   true,
          bossAvoided:  false,
          bossTimeLeft: getPalierConfig(state.palier).bossTimerSeconds,
          currentEnemy: generateEnemy(10, state.palier, state.maxPalierReached),
        });
      },

      // Voyage vers un palier déjà atteint (1..maxPalierReached) pour re-farmer
      // coins / drops. Interdit pendant un combat de boss chronométré.
      travelToPalier: (target) => {
        const state = get();
        const dest = Math.floor(target);
        if (dest < 1 || dest > state.maxPalierReached) return;
        if (state.bossActive) return;              // pas de fuite du boss via voyage
        if (dest === state.palier && state.wave === 1 && !state.bossAvoided) return; // déjà ici, rien à faire
        set({
          palier:        dest,
          wave:          1,
          bossActive:    false,
          bossTimeLeft:  0,
          bossAvoided:   false,
          ultUsedThisFight: [],
          currentEnemy:  generateEnemy(1, dest, state.maxPalierReached),
        });
      },

      clickEnemy: () => {
        // Cooldown de spawn : on ignore les clics juste après un kill.
        if (Date.now() < clickSpawnLockUntil) return { dmg: 0, crit: false };

        const ult = useUltimateStore.getState();
        ult.registerClick();

        const baseDpc       = get().getHeroDpc();
        const dpcMult        = ult.getClickDpcMultiplier();
        const nextClickMult  = ult.consumeNextClickMultiplier();
        const enemyMult       = ult.getActiveEnemyDamageTakenMultiplier();
        const critChance       = ult.getActiveCritChance() ?? BASE_CRIT_CHANCE;
        const crit              = Math.random() < critChance;
        const critMult           = crit ? (1 + CRIT_DAMAGE_BONUS) : 1;

        const finalDmg = Math.max(1, Math.floor(baseDpc * dpcMult * nextClickMult * enemyMult * critMult));

        const coinBurst        = ult.rollClickCoinBursts();
        const damageToCoinPct  = ult.getActiveDamageToCoinPct();
        const bonusCoins       = Math.floor(finalDmg * damageToCoinPct / 100) + coinBurst;

        // Ce clic va-t-il tuer l'ennemi ? (pour armer le cooldown de spawn)
        const willKill = get().currentEnemy.currentHp - finalDmg <= 0;

        set(state => {
          const newHp  = Math.max(0, state.currentEnemy.currentHp - finalDmg);
          const clicks = state.totalClicks + 1;
          const quests = state.quests.map(q =>
            q.id === 'd_clicks_1000' && !q.done ? { ...q, current: Math.min(q.current+1, q.target) } : q
          );
          const withCoins = bonusCoins > 0 ? { pixelCoins: state.pixelCoins + bonusCoins } : {};
          if (newHp <= 0) {
            return { totalClicks: clicks, quests, ...withCoins, ...resolveEnemyDeath({ ...state, weeklyQuests: state.weeklyQuests ?? [], eventQuests: state.eventQuests ?? [], currentEnemy:{ ...state.currentEnemy, currentHp:newHp }, ...withCoins }) };
          }
          return { totalClicks: clicks, quests, ...withCoins, currentEnemy: { ...state.currentEnemy, currentHp: newHp } };
        });

        if (willKill) clickSpawnLockUntil = Date.now() + SPAWN_COOLDOWN_MS;

        return { dmg: finalDmg, crit };
      },

      tickDps: () => {
        const ult         = useUltimateStore.getState();
        const heroDpc      = get().getHeroDpc();
        const baseTeamDps   = get().getTotalDps(); // inclut déjà dpsMultiplier/selfDpsMultiplier par perso
        const bonusFlat      = ult.getActiveBonusDpsFlat(heroDpc, baseTeamDps);
        const enemyMult       = ult.getActiveEnemyDamageTakenMultiplier();
        const damageToCoinPct  = ult.getActiveDamageToCoinPct();

        // Filet de sécurité "sans aucun compagnon" : uniquement si l'équipe
        // est VRAIMENT vide (0 perso équipé). Avant ce correctif, ce filet
        // s'ajoutait TOUJOURS en plus du DPS réel, calculé comme un
        // pourcentage des PV de l'ennemi — donc à PV d'ennemi très élevés
        // (fin de partie), il dépassait largement le DPS réel de l'équipe et
        // rendait toute la puissance du joueur insignifiante : n'importe
        // quel ennemi mourait en ~167s peu importe l'équipe (voire sans
        // équipe du tout), ce qui cassait complètement la difficulté.
        const hasNoTeam = get().equippedTeam.every(id => !id);
        const idleFloor = hasNoTeam ? Math.max(1, Math.floor(get().currentEnemy.maxHp * BASE_IDLE_DPS_HP_FRACTION)) : 0;

        const finalDps = Math.floor((baseTeamDps + bonusFlat) * enemyMult * get().getEventDpsMult()) + idleFloor;
        if (finalDps <= 0) { set({ lastActiveAt: Date.now() }); return; }

        const bonusCoins = Math.floor(finalDps * damageToCoinPct / 100);

        set(state => {
          const newHp = Math.max(0, state.currentEnemy.currentHp - finalDps);
          const withCoins = bonusCoins > 0 ? { pixelCoins: state.pixelCoins + bonusCoins } : {};
          if (newHp <= 0) return { ...withCoins, lastActiveAt: Date.now(), ...resolveEnemyDeath({ ...state, weeklyQuests: state.weeklyQuests ?? [], eventQuests: state.eventQuests ?? [], currentEnemy:{ ...state.currentEnemy, currentHp:newHp }, ...withCoins }) };
          return { ...withCoins, lastActiveAt: Date.now(), currentEnemy: { ...state.currentEnemy, currentHp: newHp } };
        });
      },

      tickBossTimer: () => set(state => {
        if (!state.bossActive || state.bossTimeLeft <= 0) return {};
        const t = state.bossTimeLeft - 1;
        if (t <= 0) return { bossActive:false, bossTimeLeft:0, wave:1, currentEnemy: generateEnemy(1, state.palier, state.maxPalierReached) };
        return { bossTimeLeft: t };
      }),

      activateCharacterUltimate: (templateId, formIndex) => {
        const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (ulti partagé entre éditions)
        const def = getUltimateDef(pureId);
        if (!def) return;
        const ultState = useUltimateStore.getState();
        if ((ultState.cooldowns[templateId] ?? 0) > 0) return; // pas prêt, sécurité

        // Marque ce perso comme ayant utilisé son ult pendant ce combat
        set(s => ({
          ultUsedThisFight: s.ultUsedThisFight.includes(templateId)
            ? s.ultUsedThisFight
            : [...s.ultUsedThisFight, templateId],
        }));

        const eff   = def.effect;
        const state = get();
        const heroDpc   = state.getHeroDpc();
        const teamDps   = state.getTotalDps();
        const ownedSelf = state.collection[templateId];
        const tplSelf   = getCharacterById(pureId);
        const selfDps   = (ownedSelf && tplSelf) ? calcCharDps(tplSelf, ownedSelf) : 0;

        // ── Dégâts instantanés (one-shot, calculés à l'activation) ────────
        let instantDmg = 0;
        if (eff.instantClicks)           instantDmg += eff.instantClicks * heroDpc;
        if (eff.instantDamagePctSelfDps) instantDmg += selfDps * (eff.instantDamagePctSelfDps / 100);
        if (eff.instantDamagePctTeamDps) instantDmg += teamDps * (eff.instantDamagePctTeamDps / 100);
        if (eff.instantDamagePctMaxHp)   instantDmg += state.currentEnemy.maxHp * (eff.instantDamagePctMaxHp / 100);
        instantDmg = Math.floor(instantDmg);

        // ── Monnaie instantanée (one-shot) ────────────────────────────────
        let instantCoins = 0;
        if (eff.instantCoinMultiplierBurst) {
          instantCoins += Math.floor(state.currentEnemy.pixelCoinsReward * (eff.instantCoinMultiplierBurst - 1));
        }

        if (instantDmg > 0 || instantCoins > 0) {
          set(s => {
            const withCoins = instantCoins > 0 ? { pixelCoins: s.pixelCoins + instantCoins } : {};
            const newHp = Math.max(0, s.currentEnemy.currentHp - instantDmg);
            if (newHp <= 0) return { ...withCoins, ...resolveEnemyDeath({ ...s, weeklyQuests: s.weeklyQuests ?? [], eventQuests: s.eventQuests ?? [], currentEnemy:{ ...s.currentEnemy, currentHp:newHp }, ...withCoins }) };
            return { ...withCoins, currentEnemy: { ...s.currentEnemy, currentHp: newHp } };
          });
        }

        // ── Activer le buff (cooldown, durée, gestion cooldowns alliés) ────
        useUltimateStore.getState().activateUlt(templateId, formIndex, get().equippedTeam);
      },

      spendPixelCoins: (n) => {
        if (get().pixelCoins < n) return false;
        set(s => ({ pixelCoins: s.pixelCoins - n }));
        return true;
      },

      // ─── Musique ──────────────────────────────────────────────────────
      setMusicVolume:   (v) => set({ musicVolume: Math.max(0, Math.min(1, v)) }),
      toggleMusicMuted: () => set(s => ({ musicMuted: !s.musicMuted })),
      setEventMusicActive: (v) => set({ eventMusicActive: v }),      setUsername: (name) => set({ username: name.trim().slice(0, 20) }),
      // ─── Boutique : BossCrown (boosts + gemmes) ─────────────────────────
      isDpsBoostActive:  () => Date.now() < get().dpsBoostEndsAt,
      isGoldBoostActive: () => Date.now() < get().goldBoostEndsAt,

      buyDpsBoost: () => {
        if (get().bossCrowns < BOOST_COST_CROWNS) return;
        set(state => ({
          bossCrowns: state.bossCrowns - BOOST_COST_CROWNS,
          dpsBoostEndsAt: Math.max(Date.now(), state.dpsBoostEndsAt) + BOOST_DURATION_MS,
        }));
      },
      buyGoldBoost: () => {
        if (get().bossCrowns < BOOST_COST_CROWNS) return;
        set(state => ({
          bossCrowns: state.bossCrowns - BOOST_COST_CROWNS,
          goldBoostEndsAt: Math.max(Date.now(), state.goldBoostEndsAt) + BOOST_DURATION_MS,
        }));
      },

      // ─── API générique pour les événements aléatoires ─────────────────
      // Multiplicateur de DPS temporaire (Ardeur / malus). >1 = boost, <1 = malus.
      getEventDpsMult: () => (Date.now() < get().eventDpsMultEndsAt ? get().eventDpsMult : 1),
      setEventDpsMult: (mult: number, durationMs: number) =>
        set({ eventDpsMult: mult, eventDpsMultEndsAt: Date.now() + durationMs }),

      // Inflige des dégâts instantanés à l'ennemi courant (orbes de Tempête, etc.).
      dealInstantDamage: (dmg: number) => {
        const amount = Math.floor(dmg);
        if (amount <= 0) return;
        set(s => {
          const newHp = Math.max(0, s.currentEnemy.currentHp - amount);
          if (newHp <= 0) return resolveEnemyDeath({ ...s, weeklyQuests: s.weeklyQuests ?? [], eventQuests: s.eventQuests ?? [], currentEnemy:{ ...s.currentEnemy, currentHp:newHp } });
          return { currentEnemy: { ...s.currentEnemy, currentHp: newHp } };
        });
      },

      // Crédite des récompenses (slots casino, jackpots...).
      grantEventRewards: (coins = 0, gems = 0, crowns = 0) =>
        set(s => {
          const amount = Math.max(0, Math.floor(coins));
          const cq = bumpCoinQuests(s.quests, s.weeklyQuests ?? [], amount);
          return {
            pixelCoins: s.pixelCoins + amount,
            nekoGems:   s.nekoGems + Math.max(0, Math.floor(gems)),
            bossCrowns: s.bossCrowns + Math.max(0, Math.floor(crowns)),
            quests: cq.quests, weeklyQuests: cq.weeklyQuests,
          };
        }),
      buyGemsWithCrowns: (packId) => {
        const pack = CROWN_GEM_PACKS.find(p => p.id === packId);
        if (!pack || get().bossCrowns < pack.crowns) return;
        set(state => ({ bossCrowns: state.bossCrowns - pack.crowns, nekoGems: state.nekoGems + pack.gems }));
      },
      buyGoldWithGems: (packId) => {
        const pack = GEM_GOLD_PACKS.find(p => p.id === packId);
        if (!pack || get().nekoGems < pack.gems) return;
        const palierMult = Math.pow(1.45, get().palier - 1);
        const scaledCoins = Math.floor(pack.coins * palierMult);
        set(state => ({ nekoGems: state.nekoGems - pack.gems, pixelCoins: state.pixelCoins + scaledCoins, totalGemsSpent: (state.totalGemsSpent ?? 0) + pack.gems }));
      },

      // ─── Boutique : Orbe du Néant (persos + gemmes) ─────────────────────
      ensureDailyShop: () => {
        const today = getTodayDayKey();
        if (get().dailyShop.dayKey === today) return; // déjà à jour
        set({ dailyShop: { dayKey: today, characterIds: generateDailyShopCharacters(), purchased: [] } });
      },
      buyShopCharacter: (slotIndex) => {
        const { dailyShop, voidOrbs } = get();
        const templateId = dailyShop.characterIds[slotIndex];
        if (!templateId || dailyShop.purchased.includes(templateId)) return;
        const tpl = getCharacterById(templateId);
        if (!tpl) return;
        const price = SHOP_CHAR_PRICE_ORBS[tpl.rarity];
        if (voidOrbs < price) return;
        set(state => ({
          voidOrbs: state.voidOrbs - price,
          dailyShop: { ...state.dailyShop, purchased: [...state.dailyShop.purchased, templateId] },
        }));
        get().addToCollection(templateId);
      },
      buyGemsWithOrbs: (packId) => {
        const pack = ORB_GEM_PACKS.find(p => p.id === packId);
        if (!pack || get().voidOrbs < pack.orbs) return;
        set(state => ({ voidOrbs: state.voidOrbs - pack.orbs, nekoGems: state.nekoGems + pack.gems }));
      },

      buyEquipmentChest: (tier) => {
        const def = EQUIPMENT_CHESTS.find(c => c.id === `chest_${tier}`);
        if (!def || get().nekoGems < def.gems) return null;
        const itemId = rollEquipmentChest(tier);
        set(state => ({
          nekoGems: state.nekoGems - def.gems,
          totalGemsSpent: (state.totalGemsSpent ?? 0) + def.gems,
          equipmentInventory: {
            ...state.equipmentInventory,
            [itemId]: (state.equipmentInventory[itemId] ?? 0) + 1,
          },
        }));
        return itemId;
      },

      recycleChampion: (templateId) => {
        const qty = get().championInventory[templateId] ?? 0;
        if (qty <= 0) return;
        const tpl  = getCharacterById(templateId);
        const orbs = tpl ? getVoidOrbsForRarity(tpl.rarity) : 1;
        set(state => {
          const inv = { ...state.championInventory };
          if (inv[templateId] <= 1) delete inv[templateId];
          else inv[templateId] -= 1;
          return { championInventory: inv, voidOrbs: state.voidOrbs + orbs };
        });
      },

      recycleChampionsByRarity: (rarity) => {
        const inv = get().championInventory;
        const orbsPerUnit = getVoidOrbsForRarity(rarity);
        let count = 0;
        let orbs = 0;
        const nextInv = { ...inv };
        for (const [templateId, qty] of Object.entries(inv)) {
          if ((qty ?? 0) <= 0) continue;
          if (getCharacterById(templateId)?.rarity !== rarity) continue;
          count += qty;
          orbs += qty * orbsPerUnit;
          delete nextInv[templateId];
        }
        if (count > 0) {
          set(state => ({ championInventory: nextInv, voidOrbs: state.voidOrbs + orbs }));
        }
        return { count, orbs };
      },

      removeChampion: (templateId) => {
        set(state => {
          const inv = { ...state.championInventory };
          if ((inv[templateId] ?? 0) <= 1) delete inv[templateId];
          else inv[templateId] -= 1;
          return { championInventory: inv };
        });
      },

      // ─── Pack de démarrage Early Access (24h après le lancement) ───────
      isStarterPackAvailable: () => {
        if (get().starterPackClaimed) return false;
        const now = Date.now();
        return now >= LAUNCH_TIMESTAMP && now < LAUNCH_TIMESTAMP + STARTER_PACK_WINDOW_MS;
      },
      claimStarterPack: () => {
        if (!get().isStarterPackAvailable()) return null;
        const stellairePool = BANNER_POOL.filter(c => c.rarity === 'S');
        const templateId = stellairePool[Math.floor(Math.random() * stellairePool.length)].id;
        const edition = get().addToCollection(templateId);
        set(state => ({
          starterPackClaimed: true,
          nekoGems: state.nekoGems + STARTER_PACK_REWARDS.gems,
        }));
        return { templateId, edition };
      },

      // ─── Pause (anti-autoclick) ────────────────────────────────────────
      setGamePaused: (v: boolean) => set({ gamePaused: v }),

      // ─── Héros ────────────────────────────────────────────────────────
      getHeroDpc: () => {
        const { hero, clickUpgradeLevel } = get();
        // On dérive toujours le baseDpc depuis le niveau pour garantir la cohérence
        // même pour les sauvegardes existantes.
        const baseDpc = calcBaseDpc(clickUpgradeLevel);
        const dpc = calcHeroDpc(hero, HERO_TEMPLATE.forms ?? [], baseDpc);
        // Bonus de Prestige (shop "Éveil du Héros") appliqué au DPC final
        return dpc * getPrestigeBonuses().dpcMult;
      },

      // Coût d'amélioration du clic, remise de Prestige incluse ("Fusion Parfaite").
      // Source unique de vérité : utilisé par upgradeClick() ET l'affichage (UpgradesPage).
      getClickUpgradeCost: () => {
        const level = get().clickUpgradeLevel;
        const base  = calcClickUpgradeCost(level);
        const discount = getPrestigeBonuses().upgradeDiscount; // ex: 0.64 = -36%
        return Math.max(1, Math.ceil(base * discount));
      },

      upgradeClick: () => {
        const level = get().clickUpgradeLevel;
        const cost  = get().getClickUpgradeCost(); // formule centralisée = même valeur que l'UI
        if (!get().spendPixelCoins(cost)) return;
        const newLevel = level + 1;
        set(state => ({
          clickUpgradeLevel: newLevel,
          baseDpc: calcBaseDpc(newLevel), // courbe puissance, stocké pour les sauvegardes
        }));
        get().bumpQuestProgress('d_upgrade_10', 1);
        get().bumpQuestProgress('w_upgrade_50', 1);
        set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
      },

      upgradeGold: () => {
        const level = get().goldUpgradeLevel ?? 0;
        if (level >= GOLD_UPGRADE_COSTS.length) return;
        const cost = GOLD_UPGRADE_COSTS[level];
        if (!get().spendPixelCoins(cost)) return;
        set(state => ({
          goldUpgradeLevel: (state.goldUpgradeLevel ?? 0) + 1,
        }));
        get().bumpQuestProgress('d_upgrade_10', 1);
        get().bumpQuestProgress('w_upgrade_50', 1);
        set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
      },

      getGoldMultiplier: () => {
        const level = get().goldUpgradeLevel ?? 0;
        const chestMult = GOLD_MULTIPLIERS[Math.min(level, GOLD_MULTIPLIERS.length - 1)];
        const titleMult = getTitleGoldMultiplier(useAchievementStore.getState().activeTitle);
        return chestMult * titleMult;
      },

      getGoldUpgradeCost: () => {
        const level = get().goldUpgradeLevel ?? 0;
        return level >= GOLD_UPGRADE_COSTS.length ? 0 : GOLD_UPGRADE_COSTS[level];
      },

      levelUpHero: () => {
        const { hero } = get();
        const cap  = HERO_TEMPLATE.forms?.[hero.currentForm]?.levelCap ?? 100;
        if (hero.level >= cap) return;                 // doit évoluer d'abord
        const cost = heroLevelUpCost(hero.level);
        if (!get().spendPixelCoins(cost)) return;
        set(state => ({
          hero: { ...state.hero, level: state.hero.level + 1, xp: 0 },
        }));
        get().bumpQuestProgress('d_upgrade_10', 1);
        get().bumpQuestProgress('w_upgrade_50', 1);
        set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
      },

      evolveHero: () => {
        const { hero } = get();
        const forms = HERO_TEMPLATE.forms ?? [];
        if (!canEvolveHero(forms, hero)) return;
        const cost = evoCost('L', hero.currentForm);
        if (!get().spendPixelCoins(cost)) return;
        set(state => ({
          hero: { ...state.hero, currentForm: state.hero.currentForm + 1, level: state.hero.level + 1 },
        }));
      },

      // ─── Inventaire ───────────────────────────────────────────────────
      addItem: (itemId, qty = 1) => set(s => ({
        inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + qty },
      })),

      sellItem: (itemId, qty) => {
        const item = ITEM_DEFS[itemId];
        if (!item) return;
        const current = get().inventory[itemId] ?? 0;
        const toSell = Math.min(qty, current);
        if (toSell <= 0) return;
        const gained = (item.sellGems ?? 100) * toSell;
        set(s => ({
          inventory:  { ...s.inventory, [itemId]: s.inventory[itemId] - toSell },
          nekoGems:   s.nekoGems + gained,
        }));
      },
      addEquipment: (equipmentId, qty = 1) => set(s => ({
        equipmentInventory: { ...s.equipmentInventory, [equipmentId]: (s.equipmentInventory[equipmentId] ?? 0) + qty },
      })),
      recycleEquipment: (equipmentId, qty = 1) => {
        const def = getEquipmentDef(equipmentId);
        if (!def) return;
        set(s => {
          const current = s.equipmentInventory[equipmentId] ?? 0;
          if (current <= 0) return {};
          const removed = Math.min(current, qty);
          return {
            equipmentInventory: { ...s.equipmentInventory, [equipmentId]: current - removed },
            pixelCoins: s.pixelCoins + def.recycleValue * removed,
          };
        });
      },
      equipItem: (templateId, slot, equipmentId) => {
        const owned = get().collection[templateId];
        const def = getEquipmentDef(equipmentId);
        if (!owned || !def || def.slot !== slot) return;
        const currentQty = get().equipmentInventory[equipmentId] ?? 0;
        if (currentQty <= 0) return;
        set(state => {
          const existing = state.collection[templateId];
          if (!existing) return {};
          const equipped = existing.equippedItems ?? defaultEquippedItems();
          if (equipped[slot] === equipmentId) return {};
          const previousId = equipped[slot];
          const newInventory = {
            ...state.equipmentInventory,
            [equipmentId]: currentQty - 1,
          };
          if (previousId) {
            newInventory[previousId] = (newInventory[previousId] ?? 0) + 1;
          }
          return {
            collection: {
              ...state.collection,
              [templateId]: {
                ...existing,
                equippedItems: { ...equipped, [slot]: equipmentId },
              },
            },
            equipmentInventory: newInventory,
          };
        });
      },
      unequipItem: (templateId, slot) => {
        const owned = get().collection[templateId];
        if (!owned || !owned.equippedItems) return;
        const equipped = owned.equippedItems as EquippedItems;
        const equipmentId = equipped[slot];
        if (!equipmentId) return;
        const nextOwned: OwnedCharacter = {
          ...owned,
          equippedItems: { ...equipped, [slot]: null },
        };
        set(state => ({
          collection: {
            ...state.collection,
            [templateId]: nextOwned,
          },
          equipmentInventory: { ...state.equipmentInventory, [equipmentId]: (state.equipmentInventory[equipmentId] ?? 0) + 1 },
        }));
      },

      // ─── Personnages ──────────────────────────────────────────────────
      levelUpCharacter: (templateId) => {
        const owned = get().collection[templateId];
        if (!owned) return;
        const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
        if (!tpl) return;
        const cap = getLevelCap(tpl, owned.currentForm);
        if (owned.level >= cap) return;
        const cost = levelUpCost(owned.level, tpl.rarity);
        if (!get().spendPixelCoins(cost)) return;
        set(state => ({
          collection: {
            ...state.collection,
            [templateId]: { ...owned, level: owned.level + 1, xp: 0 },
          },
        }));
        get().bumpQuestProgress('d_upgrade_10', 1);
        get().bumpQuestProgress('w_upgrade_50', 1);
        set(s => ({ totalUpgradesPerformed: (s.totalUpgradesPerformed ?? 0) + 1 }));
      },

      evolveCharacter: (templateId) => {
        const owned = get().collection[templateId];
        if (!owned) return;
        const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
        if (!tpl || !canEvolve(tpl, owned, get().inventory)) return;
        const cost = evoCost(tpl.rarity, owned.currentForm);
        if (!get().spendPixelCoins(cost)) return;
        // Consomme l'item requis pour cette évolution si applicable
        const nextForm = tpl.forms?.[owned.currentForm + 1];
        const requiredItem = nextForm?.requiredItemId;
        set(state => {
          const newInventory = requiredItem
            ? { ...state.inventory, [requiredItem]: Math.max(0, (state.inventory[requiredItem] ?? 0) - 1) }
            : state.inventory;
          return {
            inventory: newInventory,
            collection: {
              ...state.collection,
              [templateId]: { ...owned, currentForm: owned.currentForm + 1, level: owned.level + 1 },
            },
          };
        });
      },

      // Détail du DPS d'UN allié équipé : base (avant type), multiplicateur de
      // type vs l'ennemi courant, et DPS final. Utilise la même math que getTotalDps.
      getCharDpsBreakdown: (templateId: string) => {
        const { equippedTeam, collection } = get();
        const owned = collection[templateId];
        const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/ulti/type/synergie partagés entre éditions)
        const tpl   = getCharacterById(pureId);
        if (!owned || !tpl) return { base: 0, typeMult: 1, final: 0 };

        const activeSynergies = computeActiveSynergies(equippedTeam);
        const ult          = useUltimateStore.getState();
        const boostMult    = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
        const prestigeMult = getPrestigeBonuses().dpsMult;

        const helmetDef = getEquipmentDef(owned.equippedItems?.helmet ?? '');
        const chestDef  = getEquipmentDef(owned.equippedItems?.chest ?? '');
        const pantsDef  = getEquipmentDef(owned.equippedItems?.pants ?? '');
        const bootsDef  = getEquipmentDef(owned.equippedItems?.boots ?? '');
        const weaponDef = getEquipmentDef(owned.equippedItems?.weapon ?? '');
        const helmetMult = (helmetDef?.dpsMultiplier ?? 1) * getEquipBonusMult(helmetDef, tpl.id);
        const chestMult  = (chestDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(chestDef,  tpl.id);
        const pantsMult  = (pantsDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(pantsDef,  tpl.id);
        const bootsMult  = (bootsDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(bootsDef,  tpl.id);
        const weaponMult = (weaponDef?.dpsMultiplier ?? 1) * getEquipBonusMult(weaponDef, tpl.id);
        const equippedMult = helmetMult * chestMult * pantsMult * bootsMult * weaponMult;

        const dpsWithEquip = Math.floor(calcCharDps(tpl, owned) * equippedMult);
        const withSyn = calcDpsWithSynergies(templateId, dpsWithEquip, activeSynergies);
        const ultMult = ult.getDpsMultiplierFor(templateId);

        const base     = withSyn * ultMult * boostMult * prestigeMult;
        const typeMult = getAffinityMultiplier(getAffinityForId(pureId), getAffinityForId(get().currentEnemy?.name ?? ''));
        return { base: Math.floor(base), typeMult, final: Math.floor(base * typeMult) };
      },

      getTotalDps: () => {
        const { equippedTeam, collection } = get();
        const activeSynergies = computeActiveSynergies(equippedTeam);
        const ult = useUltimateStore.getState();
        const boostMult = get().isDpsBoostActive() ? BOOST_MULTIPLIER : 1;
        const prestigeMult = getPrestigeBonuses().dpsMult; // passif +15%/niveau × shop "Transcendance"
        const enemyAffinity = getAffinityForId(get().currentEnemy?.name ?? ''); // type de l'ennemi courant
        const teamDps = equippedTeam.reduce((total, id) => {
          if (!id) return total;
          const owned = collection[id];
          const pureId = parseInstanceKey(id).templateId; // clé composite -> id pur
          const tpl   = getCharacterById(pureId);
          if (!owned || !tpl) return total;
          const baseDps  = calcCharDps(tpl, owned);
          const helmetDef = getEquipmentDef(owned.equippedItems?.helmet ?? '');
          const chestDef  = getEquipmentDef(owned.equippedItems?.chest ?? '');
          const pantsDef  = getEquipmentDef(owned.equippedItems?.pants ?? '');
          const bootsDef  = getEquipmentDef(owned.equippedItems?.boots ?? '');
          const weaponDef = getEquipmentDef(owned.equippedItems?.weapon ?? '');
          const helmetMult = (helmetDef?.dpsMultiplier ?? 1) * getEquipBonusMult(helmetDef, tpl.id);
          const chestMult  = (chestDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(chestDef,  tpl.id);
          const pantsMult  = (pantsDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(pantsDef,  tpl.id);
          const bootsMult  = (bootsDef?.dpsMultiplier  ?? 1) * getEquipBonusMult(bootsDef,  tpl.id);
          const weaponMult = (weaponDef?.dpsMultiplier ?? 1) * getEquipBonusMult(weaponDef, tpl.id);
          const equippedMult = helmetMult * chestMult * pantsMult * bootsMult * weaponMult;
          const dpsWithEquip = Math.floor(baseDps * equippedMult);
          const withSyn  = calcDpsWithSynergies(id, dpsWithEquip, activeSynergies);
          const ultMult  = ult.getDpsMultiplierFor(id);
          const typeMult = getAffinityMultiplier(getAffinityForId(pureId), enemyAffinity); // avantage de type
          return total + withSyn * ultMult * boostMult * typeMult;
        }, 0);
        return teamDps * prestigeMult;
      },
      equipCharacter: (id, slot) => {
        const character = get().collection[id];
        if (!character) return;
        set(state => {
          const team = [...state.equippedTeam] as (string | null)[];
          const currentSlot = team.findIndex(entry => entry === id);
          if (currentSlot === slot) return { equippedTeam: team };
          if (currentSlot !== -1) team[currentSlot] = null;
          team[slot] = id;
          return { equippedTeam: team };
        });
      },
      unequipCharacter: (slot) => set(s => {
        const tid = s.equippedTeam[slot];
        // Bloque le retrait uniquement si : ult utilisé ET on est sur le boss (wave 10)
        const onBoss = s.bossActive || s.wave === 10;
        if (tid && onBoss && s.ultUsedThisFight.includes(tid)) return {};
        const t = [...s.equippedTeam] as (string|null)[];
        t[slot] = null;
        return { equippedTeam: t };
      }),

      // ─── Gacha ────────────────────────────────────────────────────────
      pullSingle: () => {
        if (get().nekoGems < GACHA_COSTS.single) return null;
        set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.single, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.single }));
        const id = rollCharacter(get().maxPalierReached);
        const edition = get().addToCollection(id);
        get().bumpQuestProgress('w_gacha_10', 1);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + 1 }));
        broadcastAndSaveLocal();
        return { templateId: id, edition };
      },
      pullMulti: () => {
        if (get().nekoGems < GACHA_COSTS.multi10) return null;
        set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi10, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi10 }));
        const ids = rollMulti(get().maxPalierReached);
        const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
        get().bumpQuestProgress('w_gacha_10', ids.length);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
        broadcastAndSaveLocal();
        return results;
      },
      pullMulti100: () => {
        if (get().nekoGems < GACHA_COSTS.multi100) return null;
        set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi100, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi100 }));
        const ids = rollMulti100(get().maxPalierReached);
        const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
        get().bumpQuestProgress('w_gacha_10', ids.length);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
        broadcastAndSaveLocal();
        return results;
      },
      addToCollection: (templateId) => {
        // L'édition (Base/Or/Diamant) est tirée à CHAQUE obtention — pas
        // seulement la première fois. Chaque édition d'un perso est une
        // entrée de collection séparée (progression indépendante), reliée au
        // même templateId pour l'art/nom/ultime.
        const edition = rollCardEdition();
        const instanceKey = makeInstanceKey(templateId, edition);

        const ex = get().collection[instanceKey];
        if (ex && ex.rank >= 7) {
          // Déjà au rang maximum (7★) → va dans l'Inventaire des Champions
          set(state => ({
            championInventory: {
              ...state.championInventory,
              [templateId]: (state.championInventory[templateId] ?? 0) + 1,
            },
          }));
          return edition;
        }
        set(state => {
          const ex2 = state.collection[instanceKey];
          const equippedItems = ex2?.equippedItems ?? defaultEquippedItems();
          return {
            collection: {
              ...state.collection,
              [instanceKey]: ex2
                ? { ...ex2, copies: ex2.copies+1, rank: Math.min(ex2.rank+1, 7), equippedItems }
                : { templateId, rank:1, copies:1, level:1, currentForm:0, xp:0, equippedItems, edition },
            },
          };
        });
        // "Obtenir X personnages différents" compte les TEMPLATES uniques
        // possédés (peu importe l'édition), pas le nombre d'instances.
        const uniqueOwned = new Set(
          Object.values(get().collection).map(c => c.templateId)
        ).size;
        get().setQuestProgress('e_collection_20', uniqueOwned);
        return edition;
      },

      // Octroi déterministe (codes cadeaux "cheat") : rang 7★, dernière évolution,
      // niveau max de cette forme, édition choisie. Contourne le tirage aléatoire
      // normal d'addToCollection — sert pour des récompenses garanties.
      grantMaxedCharacter: (templateId, edition = 'diamond') => {
        const tpl = getCharacterById(templateId);
        if (!tpl) return;
        const lastForm = Math.max(0, (tpl.forms?.length ?? 1) - 1);
        const level = getLevelCap(tpl, lastForm);
        const key = makeInstanceKey(templateId, edition);
        set(state => ({
          collection: {
            ...state.collection,
            [key]: {
              templateId, rank: 7, copies: 7, level, currentForm: lastForm, xp: 0,
              edition, equippedItems: state.collection[key]?.equippedItems ?? defaultEquippedItems(),
            },
          },
        }));
      },

      // ─── Quêtes ───────────────────────────────────────────────────────
      // Helper générique et réutilisable pour toute future quête : cherche l'id
      // dans les 3 tableaux (jour/semaine/événement) et incrémente celle trouvée.
      // Appelable depuis n'importe où dans le store, ou depuis un autre store
      // (ex: useGameStore.getState().bumpQuestProgress('w_expedition_1')).
      bumpQuestProgress: (id, by = 1) => set(state => {
        const bump = (arr: Quest[]) => arr.map(q => q.id === id && !q.done ? { ...q, current: Math.min(q.current + by, q.target) } : q);
        return {
          quests: bump(state.quests),
          weeklyQuests: bump(state.weeklyQuests ?? []),
          eventQuests: bump(state.eventQuests ?? []),
        };
      }),
      // Fixe directement la progression (pour les quêtes "atteindre X", pas "cumuler +1").
      setQuestProgress: (id, value) => set(state => {
        const setVal = (arr: Quest[]) => arr.map(q => q.id === id && !q.done ? { ...q, current: Math.min(Math.max(q.current, value), q.target) } : q);
        return {
          quests: setVal(state.quests),
          weeklyQuests: setVal(state.weeklyQuests ?? []),
          eventQuests: setVal(state.eventQuests ?? []),
        };
      }),
      claimQuest: (id) => set(s => {
        const q = s.quests.find(q => q.id === id);
        if (!q || q.current < q.target || q.done) return {};
        try {
          const uid = require('@/lib/firebase/config').auth?.currentUser?.uid ?? null;
        } catch {}
        return {
          quests: s.quests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
          nekoGems:   q.rewardType==='gems'  ? s.nekoGems  + q.reward : s.nekoGems,
          pixelCoins: q.rewardType==='coins' ? s.pixelCoins + q.reward : s.pixelCoins,
          totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
        };
      }),

      // Réinitialise les quêtes à un jour nouveau (progression + statut "réclamé" remis à zéro)
      ensureDailyQuests: () => {
        const today = getTodayDayKey();
        set(state => {
          const dayChanged = state.questsDayKey !== today;
          const quests = DAILY_QUESTS.map(def => {
            const prev = state.quests.find(q => q.id === def.id);
            return {
              ...def,
              current: dayChanged ? 0 : (prev?.current ?? 0),
              done:    dayChanged ? false : (prev?.done ?? false),
            };
          });
          return { questsDayKey: today, quests };
        });
      },

      ensureWeeklyQuests: () => {
        const thisWeek = getThisWeekKey();
        set(state => {
          const weekChanged = state.weeklyQuestsDayKey !== thisWeek;
          const weeklyQuests = WEEKLY_QUESTS.map(def => {
            const prev = state.weeklyQuests?.find(q => q.id === def.id);
            return {
              ...def,
              current: weekChanged ? 0 : (prev?.current ?? 0),
              done:    weekChanged ? false : (prev?.done ?? false),
            };
          });
          return { weeklyQuestsDayKey: thisWeek, weeklyQuests };
        });
      },

      claimWeeklyQuest: (id) => set(s => {
        const q = s.weeklyQuests?.find(q => q.id === id);
        if (!q || q.current < q.target || q.done) return {};
        try {
          const uid = require('@/lib/firebase/config').auth?.currentUser?.uid ?? null;
        } catch {}
        return {
          weeklyQuests: s.weeklyQuests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
          nekoGems:   q.rewardType==='gems'  ? s.nekoGems   + q.reward : s.nekoGems,
          pixelCoins: q.rewardType==='coins' ? s.pixelCoins + q.reward : s.pixelCoins,
          totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
        };
      }),

      claimEventQuest: (id) => set(s => {
        const q = s.eventQuests?.find(q => q.id === id);
        if (!q || q.current < q.target || q.done) return {};
        try {
          const uid = require('@/lib/firebase/config').auth?.currentUser?.uid ?? null;
        } catch {}
        return {
          eventQuests: s.eventQuests.map(q2 => q2.id===id ? { ...q2, done:true } : q2),
          nekoGems:   q.rewardType==='gems'  ? s.nekoGems   + q.reward : s.nekoGems,
          pixelCoins: q.rewardType==='coins' ? s.pixelCoins + q.reward : s.pixelCoins,
          totalQuestsCompleted: (s.totalQuestsCompleted ?? 0) + 1,
        };
      }),

      bumpEventQuest: (id, by = 1) => set(s => {
        const q = s.eventQuests?.find(q => q.id === id);
        if (!q || q.done) return {};
        return {
          eventQuests: s.eventQuests.map(q2 =>
            q2.id === id ? { ...q2, current: Math.min(q2.current + by, q2.target) } : q2
          ),
        };
      }),

      setLastEquipmentDrop: (id) => set(() => ({ lastEquipmentDrop: id })),

      // ─── Prestige (New Game+) ─────────────────────────────────────────
      // Reset : coins, palier, upgrades d'attaque/or, niveau du héros, combat en cours.
      // Conserve : collection, gemmes, maxPalierReached, succès (store dédié),
      //            expéditions (store dédié), inventaires, champions, monnaies premium.
      doPrestige: () => {
        const prestige = usePrestigeStore.getState();
        const maxPalier = get().maxPalierReached;
        if (!prestige.canPrestige(maxPalier)) return;

        // Incrémente le niveau de prestige (+1) et les points (+3) + toast.
        prestige.doPrestige();

        // Bonus de départ du shop de prestige (lecture après incrément : inchangés).
        const bonuses     = getPrestigeBonuses();
        const startPalier = Math.max(1, bonuses.startPalier);
        const startGems   = Math.max(0, bonuses.startGems);

        set(state => ({
          // ── Reset du run ──
          pixelCoins:        0,
          wave:              1,
          palier:            startPalier,
          baseDpc:           calcBaseDpc(0),
          clickUpgradeLevel: 0,
          goldUpgradeLevel:  0,
          hero:              { level: 1, currentForm: 0, xp: 0 },
          currentEnemy:      generateEnemy(1, startPalier, state.maxPalierReached),
          bossActive:        false,
          bossTimeLeft:      0,
          bossAvoided:       false,
          ultUsedThisFight:  [],
          // ── Conservé + bonus de gemmes de départ ──
          nekoGems:          state.nekoGems + startGems,
        }));

        broadcastAndSaveLocal();
      },

      clearBossVictory: () => set({ lastBossVictory: null }),

      // ─── Gains hors-ligne (idle) ──────────────────────────────────────
      getOfflineMult: () => OFFLINE_MULT_TIERS[Math.min(get().offlineMultLevel ?? 0, OFFLINE_MULT_TIERS.length - 1)],
      getOfflineCapHours: () => OFFLINE_CAP_TIERS_H[Math.min(get().offlineCapLevel ?? 0, OFFLINE_CAP_TIERS_H.length - 1)],
      getOfflineRewardScale: () => OFFLINE_REWARD_SCALE_TIERS[Math.min(get().offlineMultLevel ?? 0, OFFLINE_REWARD_SCALE_TIERS.length - 1)],

      // Nombre de mobs NORMAUX tués par heure (aucun boss n'est simulé hors-ligne).
      getOfflineKillsPerHour: () => {
        const s = get();
        const enemy = s.currentEnemy;
        if (!enemy || enemy.maxHp <= 0) return 0;
        const dps = s.getTotalDps();
        if (dps <= 0) return 0;
        return (dps / enemy.maxHp) * 3600 * s.getOfflineMult();
      },

      // Revenu passif estimé (coins/heure) = mobs/h × butin d'un mob × multiplicateurs.
      getOfflineCoinsPerHour: () => {
        const s = get();
        const enemy = s.currentEnemy;
        if (!enemy) return 0;
        const goldMult = s.getGoldMultiplier();
        const coinMult = getPrestigeBonuses().coinsMult;
        const coinsPerKill = enemy.pixelCoinsReward * goldMult * coinMult;
        return s.getOfflineKillsPerHour() * coinsPerKill;
      },

      // Gemmes/heure = mobs/h × taux de drop de gemme sur un mob normal.
      // (Aucune gemme de passage de palier : on ne simule pas de boss.)
      getOfflineGemsPerHour: () => get().getOfflineKillsPerHour() * MOB_GEM_DROP_CHANCE,

      getOfflineMultCost: () => {
        const lvl = get().offlineMultLevel ?? 0;
        return lvl >= OFFLINE_MULT_COSTS.length ? null : OFFLINE_MULT_COSTS[lvl];
      },
      getOfflineCapCost: () => {
        const lvl = get().offlineCapLevel ?? 0;
        return lvl >= OFFLINE_CAP_COSTS.length ? null : OFFLINE_CAP_COSTS[lvl];
      },

      upgradeOfflineMult: () => {
        const cost = get().getOfflineMultCost();
        if (cost === null || get().bossCrowns < cost) return;
        set(state => ({ bossCrowns: state.bossCrowns - cost, offlineMultLevel: (state.offlineMultLevel ?? 0) + 1 }));
        broadcastAndSaveLocal();
      },
      upgradeOfflineCap: () => {
        const cost = get().getOfflineCapCost();
        if (cost === null || get().bossCrowns < cost) return;
        set(state => ({ bossCrowns: state.bossCrowns - cost, offlineCapLevel: (state.offlineCapLevel ?? 0) + 1 }));
        broadcastAndSaveLocal();
      },

      // Calcule et crédite les gains depuis la dernière activité. Retourne le récap
      // (ou null si < OFFLINE_MIN_SECONDS). Appelé une fois au chargement.
      claimOfflineEarnings: () => {
        const s = get();
        const now  = Date.now();
        const last = s.lastActiveAt ?? now;
        const rawSeconds = Math.max(0, Math.floor((now - last) / 1000));
        if (rawSeconds < OFFLINE_MIN_SECONDS) { set({ lastActiveAt: now }); return null; }

        const capSeconds = s.getOfflineCapHours() * 3600;
        const seconds    = Math.min(rawSeconds, capSeconds);
        const hours      = seconds / 3600;

        // Simulation de mobs NORMAUX uniquement : aucun boss → aucune couronne,
        // aucun passage de palier, et les gemmes viennent du drop des mobs.
        const rewardScale = s.getOfflineRewardScale();
        const kills = Math.floor(s.getOfflineKillsPerHour() * hours);
        const coins = Math.floor(s.getOfflineCoinsPerHour()  * hours * rewardScale);
        const gems  = Math.floor(s.getOfflineGemsPerHour()   * hours * rewardScale);

        const gain: OfflineGain = { coins, gems, kills, seconds, rawSeconds, capped: rawSeconds > capSeconds, at: now };
        set(state => {
          const cq = bumpCoinQuests(state.quests, state.weeklyQuests ?? [], coins);
          return {
            pixelCoins: state.pixelCoins + coins,
            nekoGems:   state.nekoGems + gems,
            lastActiveAt: now,
            savedAt: now,
            lastOfflineGain: gain,
            quests: cq.quests, weeklyQuests: cq.weeklyQuests,
          };
        });
        broadcastAndSaveLocal();
        return (coins > 0 || gems > 0) ? gain : null;
      },

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
      name: 'nekoz-world-v7',
      partialize: (s) => ({
        pixelCoins:s.pixelCoins, nekoGems:s.nekoGems, totalClicks:s.totalClicks,
        totalKills:s.totalKills ?? 0, totalQuestsCompleted:s.totalQuestsCompleted ?? 0, totalUpgradesPerformed:s.totalUpgradesPerformed ?? 0, totalGachaPulls:s.totalGachaPulls ?? 0, totalBossKills:s.totalBossKills ?? 0, totalGemsSpent:s.totalGemsSpent ?? 0,
        wave:s.wave, palier:s.palier, maxPalierReached:s.maxPalierReached,
        currentEnemy:s.currentEnemy, baseDpc:s.baseDpc, clickUpgradeLevel:s.clickUpgradeLevel,
        equippedTeam:s.equippedTeam, collection:s.collection, hero:s.hero, goldUpgradeLevel:s.goldUpgradeLevel ?? 0,
        bossActive:s.bossActive, bossTimeLeft:s.bossTimeLeft,
        quests:s.quests, questsDayKey:s.questsDayKey,
        weeklyQuests:s.weeklyQuests, weeklyQuestsDayKey:s.weeklyQuestsDayKey,
        eventQuests:s.eventQuests,
        musicVolume:s.musicVolume, musicMuted:s.musicMuted,
        bossCrowns:s.bossCrowns, voidOrbs:s.voidOrbs,
        inventory:s.inventory,
        equipmentInventory:s.equipmentInventory,
        championInventory:s.championInventory ?? {},
        dpsBoostEndsAt:s.dpsBoostEndsAt, goldBoostEndsAt:s.goldBoostEndsAt,
        dailyShop:s.dailyShop, starterPackClaimed:s.starterPackClaimed,
        username:s.username,
        lastActiveAt:s.lastActiveAt, offlineMultLevel:s.offlineMultLevel, offlineCapLevel:s.offlineCapLevel, lastOfflineGain:s.lastOfflineGain,
      }),
    }
  )
);

type QuestState = { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] };
// Incrémente la progression des quêtes "accumuler X coins" (jour/semaine),
// quelle que soit la source du gain (kill, offline, jackpot...). Sans ce
// helper, ces quêtes restent bloquées à 0 puisqu'aucune autre logique ne les
// met à jour ailleurs dans le store.
// Incrémente les quêtes "vaincre X boss" (palier / semaine / événement) à chaque
// mort de boss, progression ou re-farm. Les boss d'événement doivent passer par
// ce helper pour être comptés comme des boss dans les quêtes et succés.
export function bumpBossQuests(
  quests: Quest[],
  weeklyQuests: Quest[],
  eventQuests: Quest[] = []
): { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] } {
  return {
    quests: quests.map(q => q.id === 'd_boss_kill' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_boss_5' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    eventQuests: eventQuests.map(q => q.id === 'e_boss_20' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
  };
}

function bumpCoinQuests(quests: Quest[], weeklyQuests: Quest[], amount: number): { quests: Quest[]; weeklyQuests: Quest[] } {
  if (amount <= 0) return { quests, weeklyQuests };
  return {
    quests: quests.map(q => q.id === 'd_coins_1m' && !q.done ? { ...q, current: Math.min(q.current + amount, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_coins_10m' && !q.done ? { ...q, current: Math.min(q.current + amount, q.target) } : q),
  };
}

function resolveEnemyDeath(state: GameState & QuestState): Partial<GameState & QuestState> {
  // Garde-fou : ne résout la mort que si currentEnemy.currentHp <= 0 a bien été
  // appliqué par l'appelant (voir clickEnemy/tickDps/activateCharacterUltimate,
  // qui fusionnent { currentHp: newHp } avant d'appeler cette fonction).
  if (state.currentEnemy.currentHp > 0) return {};

  // Multiplicateurs de coins (or + ult + boost BossCrown)
  const chestMult    = GOLD_MULTIPLIERS[Math.min((state as {goldUpgradeLevel?:number}).goldUpgradeLevel ?? 0, GOLD_MULTIPLIERS.length - 1)];
  const titleMult    = getTitleGoldMultiplier(useAchievementStore.getState().activeTitle);
  const goldMult     = chestMult * titleMult;
  const ultCoinMult  = getActiveCoinMultiplier(useUltimateStore.getState());
  const goldBoostEndsAt = (state as {goldBoostEndsAt?:number}).goldBoostEndsAt ?? 0;
  const boostGoldMult   = Date.now() < goldBoostEndsAt ? BOOST_MULTIPLIER : 1;
  const prestigeCoinMult = getPrestigeBonuses().coinsMult; // passif +20%/niveau × shop "Fortune Ancestrale"
  const baseCoins   = Math.floor(state.currentEnemy.pixelCoinsReward * goldMult * ultCoinMult * boostGoldMult * prestigeCoinMult);
  const coins = state.pixelCoins + baseCoins;

  // 0.5% de chance de looter 1 gemme bonus sur n'importe quel ennemi (boss inclus)
  const mobGemDrop = Math.random() < MOB_GEM_DROP_CHANCE ? 1 : 0;
  const gems  = state.nekoGems + state.currentEnemy.gemsReward + mobGemDrop;

  const quests = state.quests.map(q =>
    (q.id === 'd_kills_250' || q.id === 'd_kills_500' || q.id === 'd_kills_1000') && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const weeklyQuests = (state.weeklyQuests ?? []).map(q =>
    q.id === 'w_kills_5000' && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const coinQuestUpdate = bumpCoinQuests(quests, weeklyQuests, baseCoins);
  const eventQuests = (state.eventQuests ?? []).map(q =>
    q.id === 'e_boss_20' && state.currentEnemy.isBoss && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const bossCrownsBefore = (state as {bossCrowns?:number}).bossCrowns ?? 0;
  if (state.currentEnemy.isBoss) {
    const next = state.palier + 1;
    // On ne pousse au classement QUE lors d'une vraie progression : re-farmer un
    // palier déjà validé (voyage) ne doit pas écraser le score avec une valeur plus basse.
    const isNewProgress = next > state.maxPalierReached;
    if (isNewProgress && auth?.currentUser?.uid) {
      updatePlayerScore(auth.currentUser.uid, {
        username: state.username,
        palier: next,
        wave: 1,
        totalClicks: state.totalClicks,
        pixelCoins: coins,
      }).catch(() => {});
    }
    // +20 gemmes et +1 couronne de boss : réservés à une vraie progression
    // (sinon re-farmer un boss trivial = robinet infini de gemmes/couronnes).
    const passGems     = isNewProgress ? PALIER_PASS_GEMS : 0;
    const crownGain    = isNewProgress ? 1 : 0;
    // Événement de victoire (source de vérité pour l'écran de victoire).
    const bossVictory = { palier: next, gems: passGems, coins: baseCoins, crowns: crownGain, at: Date.now() };
    const bossQuestUpdate = bumpBossQuests(coinQuestUpdate.quests, coinQuestUpdate.weeklyQuests, eventQuests);
    // "Atteindre le palier X" : on fixe la progression au palier réellement
    // atteint (pas un simple +1), et seulement lors d'une vraie progression.
    const finalEventQuests = isNewProgress
      ? eventQuests.map(q =>
          (q.id === 'e_palier_10' || q.id === 'e_palier_20') && !q.done
            ? { ...q, current: Math.min(Math.max(q.current, next), q.target) } : q
        )
      : eventQuests;
    return { pixelCoins:coins, nekoGems:gems + passGems, quests:bossQuestUpdate.quests, weeklyQuests:bossQuestUpdate.weeklyQuests, eventQuests:finalEventQuests, wave:1, palier:next, maxPalierReached:Math.max(state.maxPalierReached,next), bossActive:false, bossTimeLeft:0, bossAvoided:false, ultUsedThisFight:[], currentEnemy:generateEnemy(1,next,Math.max(state.maxPalierReached,next)), bossCrowns: bossCrownsBefore + crownGain, lastBossVictory: bossVictory, totalKills: (state.totalKills ?? 0) + 1, totalBossKills: (state.totalBossKills ?? 0) + 1 } as Partial<GameState & { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] }>;
  }
  const nw = state.wave + 1;
  if (nw === 10) {
    // Mode farm (palier < maxPalierReached) OU boss évité → boucle sur vague 1,
    // le boss ne se déclenche jamais (les boss ne sont pas refaisables).
    const isFarming = state.palier < state.maxPalierReached;
    if (isFarming || state.bossAvoided) {
      return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:1, ultUsedThisFight:[], currentEnemy:generateEnemy(1, state.palier, state.maxPalierReached), totalKills: (state.totalKills ?? 0) + 1 };
    }
    return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:10, bossActive:true, bossTimeLeft:getPalierConfig(state.palier).bossTimerSeconds, ultUsedThisFight:[], currentEnemy:generateEnemy(10,state.palier,state.maxPalierReached), totalKills: (state.totalKills ?? 0) + 1 };
  }
  const equipDrop = getEquipmentDrop(
    state.palier,
    state.palier < state.maxPalierReached ? FARM_EQUIP_DROP_RATE : 1,
  );
  const newEquipmentInventory = equipDrop
    ? { ...state.equipmentInventory, [equipDrop]: (state.equipmentInventory[equipDrop] ?? 0) + 1 }
    : state.equipmentInventory;
  return {
    pixelCoins:coins,
    nekoGems:gems,
    quests:coinQuestUpdate.quests,
    weeklyQuests:coinQuestUpdate.weeklyQuests,
    eventQuests,
    wave:nw,
    ultUsedThisFight:[], currentEnemy:generateEnemy(nw,state.palier,state.maxPalierReached),
    equipmentInventory:newEquipmentInventory,
    lastEquipmentDrop: equipDrop ?? null,
    totalKills: (state.totalKills ?? 0) + 1,
  };
}