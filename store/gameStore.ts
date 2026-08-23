'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  GameState, OwnedCharacter, HeroState, EquipmentSlot, EquippedItems, defaultEquippedItems, getPalierConfig,
  calcCharDps, xpToNextLevel, levelUpCost, heroLevelUpCost,
  evoCost, canEvolve, canEvolveHero, getLevelCap, RARITY_CONFIG, Rarity, getNextRarity,
  evoStoneCost, EVOLUTION_STONE_ITEM_ID,
} from '@/types/game';
import { generateEnemy } from '@/lib/game/enemies';
import { rollCharacter, rollMulti, rollMulti100, GACHA_COSTS, RARITY_GATES } from '@/lib/game/gacha';
import { getCharacterById, HERO_TEMPLATE, BANNER_POOL, isForgeOrEventCharacter } from '@/lib/game/characters';
import { ITEM_DEFS, rollEquipmentChest } from '@/lib/game/items';
import { EQUIPMENT_CHESTS } from '@/lib/game/shop';
import { computeActiveSynergies, calcDpsWithSynergies } from '@/lib/game/synergies';
import { getUltimateDef } from '@/lib/game/ultimates';
import { auth } from '@/lib/firebase/config';
import { updatePlayerScore } from '@/lib/firebase/leaderboard';
import { useUltimateStore, getActiveCoinMultiplier } from '@/store/ultimateStore';
import { usePrestigeStore, getPrestigeBonuses } from '@/store/prestigeStore';
import { useExpeditionStore } from '@/store/expeditionStore';
import { getAffinityForId, getAffinityMultiplier } from '@/lib/game/affinities';
import { rollCardEdition, makeInstanceKey, parseInstanceKey, CardEdition } from '@/lib/game/editions';
import { useAchievementStore } from '@/store/achievementStore';
import { getTitleGoldMultiplier } from '@/lib/game/titles';
import { getEquipmentDrop, getEquipmentDef, getEquipmentGroup, pickEquipmentUpgradeOutput } from '@/lib/game/items';
import { EVENT_BOSSES } from '@/lib/game/eventBoss';
import {
  CROWN_GEM_PACKS, ORB_GEM_PACKS, GEM_GOLD_PACKS, getGoldPackCoins, BOOST_COST_CROWNS, BOOST_DURATION_MS, BOOST_MULTIPLIER,
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
// Chaque palier atteint débloque un niveau de coffre achetable (niveau max
// achetable = maxPalierReached) ; le multiplicateur et le coût sont désormais
// des formules fixes, plus des paliers manuels plafonnés.
import { COIN_BASE, COIN_GROWTH } from '@/lib/game/enemies';
//base=COIN_BASE*50 COIN_BASE retrouvable dans ennemies.ts
export const GOLD_CHEST_COST_BASE   = COIN_BASE * 50;  // coût du coffre d'or niveau 0
//growth=COIN_GROWTH+0.02 COIN_GROWTH retrouvable dans ennemies.ts
export const GOLD_CHEST_COST_GROWTH = COIN_GROWTH + 0.02; // coût du coffre d'or croît plus vite que le butin de base
export const GOLD_CHEST_MULT_GROWTH = 1.2;  // boost golds ×1.2^niveau_du_coffre

// base*pow^level_du_palier
export function getGoldChestCost(level: number): number {
  return Math.round(GOLD_CHEST_COST_BASE * Math.pow(GOLD_CHEST_COST_GROWTH, (level*10-1)) * Math.pow(GOLD_CHEST_MULT_GROWTH, level));
}
export function getGoldChestMultiplier(level: number): number {
  return Math.pow(GOLD_CHEST_MULT_GROWTH, level);
}

// ── Anti-exploit multi-onglets ─────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'gachaverse_save_v2'; // bump v2.5 : doit rester identique à useCloudSave.ts (même entrée localStorage partagée)
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

// Force une sauvegarde immédiate en base (localStorage + Firestore) après un
// événement majeur (palier franchi, pull gacha, achat de coffre d'équipement,
// boss vaincu, expédition récupérée) — sans ça, ces gains ne seraient garantis
// en base qu'au prochain cycle périodique (jusqu'à 10min plus tard) et
// pourraient être perdus en cas de fermeture/crash avant cette échéance.
// Import différé : useCloudSave importe déjà gameStore, un import statique
// créerait un cycle (voir le même correctif pour expeditionStore ci-dessus).
function requestUrgentSave() {
  if (typeof window === 'undefined') return;
  try { require('@/hooks/useCloudSave').requestUrgentSave(); } catch { /* ignore */ }
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
// Gemmes données à chaque palier franchi (mort du boss) — récompense de fin
// de palier, distincte du butin par ennemi (gemsReward dans enemies.ts).
export function getPalierPassGems(palier: number): number {
  return palier * 10;
}
export const MOB_GEM_DROP_CHANCE = 0.005;  // 0.5% de chance de looter 1 gemme bonus sur N'IMPORTE QUEL ennemi tué
// Taux de drop d'équipement en mode farm (palier < runPeakPalier) : ×0.25 = 4× plus lent.
export const FARM_EQUIP_DROP_RATE = 0.25;

// Palier max atteint DEPUIS LE DERNIER PRESTIGE — détermine le mode farm
// (palier déjà validé CETTE run), la portée du voyage, et l'éligibilité/le
// gain de jetons du prochain prestige. Contrairement à maxPalierReached (qui
// ne redescend jamais, gardé pour le classement), ce compteur repart à 1 à
// chaque prestige. `null` = jamais divergé de maxPalierReached (sauvegarde
// jamais prestige, ou antérieure à l'ajout de ce champ) → on retombe alors
// sur maxPalierReached, ce qui est le comportement correct dans ce cas précis.
function runPeakPalierOf(state: { runPeakPalier: number | null; maxPalierReached: number }): number {
  return state.runPeakPalier ?? state.maxPalierReached;
}

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

interface GameStore extends GameState {
  quests: Quest[];
  questsDayKey: string;
  weeklyQuests: Quest[];
  weeklyQuestsDayKey: string;
  eventQuests: Quest[];
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
  // Signal de navigation "Forge → Expéditions" : id de l'expédition à mettre
  // en avant (onglet + surbrillance) quand on clique sur un ingrédient.
  focusedExpeditionId: string | null;
  focusExpedition: (id: string | null) => void;
  // Rangs banqués à travers un prestige (cartes shiny + persos forge/event) —
  // clé = instance key (templateId ou templateId::gold/diamond), voir doPrestige
  // et addToCollection.
  bankedRanks: Record<string, number>;
  // Fusion d'équipement (10 items d'un slot+rareté → 1 de la rareté suivante)
  unlockedEquipRarities: Rarity[];
  unlockEquipRarity: (rarity: Rarity) => void;
  upgradeEquipment: (slot: EquipmentSlot, rarity: Rarity) => { ok: boolean; reason?: string; resultId?: string };
  // Déblocage du drop d'équipement par rareté (via expédition "Chasse — Rareté X")
  unlockedEquipDropRarities: Rarity[];
  unlockEquipDropRarity: (rarity: Rarity) => void;
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
  // Timestamp de la dernière sauvegarde locale (anti-rollback)
  savedAt: number;
  // Flag to temporarily suppress toasts/notifications during state restore
  suppressToasts: boolean;
  // Combat
  retreatFromBoss: () => void;
  challengeBoss: () => void;
  travelToPalier: (palier: number) => void;
  // Palier max atteint depuis le dernier prestige — voir runPeakPalierOf().
  getRunPeakPalier: () => number;
  tickDps: () => void;
  tickBossTimer: () => void;
  activateCharacterUltimate: (templateId: string, formIndex: number) => void;
  // Ressources
  spendPixelCoins: (n: number) => boolean;
  // Héros
  levelUpHero: () => void;
  evolveHero: () => void;
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
  // Boutique — achat d'un perso d'événement contre ses pièces (voir lib/game/eventBoss.ts)
  buyEventCharacter: (bossId: string) => boolean;
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
  // Calcule (sans rien créditer) le gain hors-ligne en attente, à partir du
  // dernier `savedAt` connu (même valeur que celle lue/écrite en base) — donc
  // identique quel que soit l'appareil qui se reconnecte. `claimOfflineEarnings`
  // crédite ensuite CE gain précis (calculé une fois, affiché, puis réclamé).
  checkOfflineGain: () => OfflineGain | null;
  claimOfflineEarnings: (gain: OfflineGain) => void;
  resetGame: () => void;
}

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
  // Flag to temporarily suppress toasts/notifications during state restore
  suppressToasts: false,
  bossCrowns: 0, voidOrbs: 0,
  inventory: {} as Record<string, number>,
  equipmentInventory: {} as Record<string, number>,
  championInventory:  {} as Record<string, number>,
  lastEquipmentDrop: null,
  focusedExpeditionId: null,
  bankedRanks: {} as Record<string, number>,
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
      getRunPeakPalier: () => runPeakPalierOf(get()),

      retreatFromBoss: () => {
        const state = get();
        if (!state.bossActive && state.wave !== 10) return;
        set({
          wave:         1,
          bossActive:   false,
          bossTimeLeft: 0,
          bossAvoided:  true,
          currentEnemy: generateEnemy(1, state.palier, runPeakPalierOf(state)),
        });
      },

      challengeBoss: () => {
        const state = get();
        if (state.palier < runPeakPalierOf(state)) return; // pas de boss en mode farm
        set({
          wave:         10,
          bossActive:   true,
          bossAvoided:  false,
          bossTimeLeft: getPalierConfig(state.palier).bossTimerSeconds,
          currentEnemy: generateEnemy(10, state.palier, runPeakPalierOf(state)),
        });
      },

      // Voyage vers un palier déjà atteint CETTE RUN (1..runPeakPalier) pour
      // re-farmer coins / drops. Interdit pendant un combat de boss chronométré.
      travelToPalier: (target) => {
        const state = get();
        const dest = Math.floor(target);
        const peak = runPeakPalierOf(state);
        if (dest < 1 || dest > peak) return;
        if (state.bossActive) return;              // pas de fuite du boss via voyage
        if (dest === state.palier && state.wave === 1 && !state.bossAvoided) return; // déjà ici, rien à faire
        set({
          palier:        dest,
          wave:          1,
          bossActive:    false,
          bossTimeLeft:  0,
          bossAvoided:   false,
          ultUsedThisFight: [],
          currentEnemy:  generateEnemy(1, dest, peak),
        });
      },

      tickDps: () => {
        const ult         = useUltimateStore.getState();
        const baseTeamDps   = get().getTotalDps(); // inclut déjà dpsMultiplier/selfDpsMultiplier par perso
        const bonusFlat      = ult.getActiveBonusDpsFlat(baseTeamDps);
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
        if (finalDps <= 0) return;

        const bonusCoins = Math.floor(finalDps * damageToCoinPct / 100);

        set(state => {
          const newHp = Math.max(0, state.currentEnemy.currentHp - finalDps);
          const withCoins = bonusCoins > 0 ? { pixelCoins: state.pixelCoins + bonusCoins } : {};
          if (newHp <= 0) return { ...withCoins, ...resolveEnemyDeath({ ...state, weeklyQuests: state.weeklyQuests ?? [], eventQuests: state.eventQuests ?? [], currentEnemy:{ ...state.currentEnemy, currentHp:newHp }, ...withCoins }) };
          return { ...withCoins, currentEnemy: { ...state.currentEnemy, currentHp: newHp } };
        });
      },

      tickBossTimer: () => set(state => {
        if (!state.bossActive || state.bossTimeLeft <= 0) return {};
        const t = state.bossTimeLeft - 1;
        // Défaite (timer écoulé) : même état qu'une retraite volontaire —
        // bossAvoided:true permet de retenter le boss directement (bouton
        // "⚡ BOSS") au lieu de forcer un reclear complet des vagues 1-9.
        if (t <= 0) return { bossActive:false, bossTimeLeft:0, bossAvoided:true, wave:1, currentEnemy: generateEnemy(1, state.palier, runPeakPalierOf(state)) };
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
        const teamDps   = state.getTotalDps();
        const ownedSelf = state.collection[templateId];
        const tplSelf   = getCharacterById(pureId);
        const selfDps   = (ownedSelf && tplSelf) ? calcCharDps(tplSelf, ownedSelf) : 0;

        // ── Dégâts instantanés (one-shot, calculés à l'activation) ────────
        let instantDmg = 0;
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

      setUsername: (name) => set({ username: name.trim().slice(0, 20) }),
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
          const crownsGained = Math.max(0, Math.floor(crowns));
          return {
            pixelCoins: s.pixelCoins + amount,
            nekoGems:   s.nekoGems + Math.max(0, Math.floor(gems)),
            bossCrowns: s.bossCrowns + crownsGained,
            totalBossCrownsEarned: (s.totalBossCrownsEarned ?? 0) + crownsGained,
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
        const scaledCoins = getGoldPackCoins(pack, get().palier, getGoldChestMultiplier(get().goldUpgradeLevel ?? 0));
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
        requestUrgentSave();
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
          return { championInventory: inv, voidOrbs: state.voidOrbs + orbs, totalVoidOrbsEarned: (state.totalVoidOrbsEarned ?? 0) + orbs };
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
          set(state => ({ championInventory: nextInv, voidOrbs: state.voidOrbs + orbs, totalVoidOrbsEarned: (state.totalVoidOrbsEarned ?? 0) + orbs }));
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

      upgradeGold: () => {
        const level = get().goldUpgradeLevel ?? 0;
        const maxLevel = runPeakPalierOf(get());
        if (level >= maxLevel) return; // pas encore débloqué par la progression de palier
        const cost = getGoldChestCost(level);
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
        const chestMult = getGoldChestMultiplier(level);
        const titleMult = getTitleGoldMultiplier(useAchievementStore.getState().activeTitle);
        return chestMult * titleMult;
      },

      getGoldUpgradeCost: () => {
        const level = get().goldUpgradeLevel ?? 0;
        const maxLevel = runPeakPalierOf(get());
        return level >= maxLevel ? 0 : getGoldChestCost(level);
      },

      levelUpHero: () => {
        const { hero } = get();
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
      unlockEquipRarity: (rarity) => set(s =>
        s.unlockedEquipRarities.includes(rarity) ? {} : { unlockedEquipRarities: [...s.unlockedEquipRarities, rarity] }
      ),
      unlockEquipDropRarity: (rarity) => set(s =>
        s.unlockedEquipDropRarities.includes(rarity) ? {} : { unlockedEquipDropRarities: [...s.unlockedEquipDropRarities, rarity] }
      ),
      upgradeEquipment: (slot, rarity) => {
        const nextRarity = getNextRarity(rarity);
        if (!nextRarity) return { ok: false, reason: 'Rareté maximale atteinte' };
        if (!get().unlockedEquipRarities.includes(nextRarity)) {
          return { ok: false, reason: 'Fusion non débloquée pour cette rareté' };
        }

        const fodderGroup = getEquipmentGroup(slot, rarity);
        const inv = get().equipmentInventory;
        const totalOwned = fodderGroup.reduce((sum, item) => sum + (inv[item.id] ?? 0), 0);
        if (totalOwned < 10) return { ok: false, reason: 'Pas assez d’objets (10 requis)' };

        const output = pickEquipmentUpgradeOutput(slot, nextRarity);
        if (!output) return { ok: false, reason: 'Aucun objet disponible à cette rareté' };

        set(s => {
          let toConsume = 10;
          const newInv = { ...s.equipmentInventory };
          for (const item of fodderGroup) {
            if (toConsume <= 0) break;
            const have = newInv[item.id] ?? 0;
            const take = Math.min(have, toConsume);
            newInv[item.id] = have - take;
            toConsume -= take;
          }
          newInv[output.id] = (newInv[output.id] ?? 0) + 1;
          return { equipmentInventory: newInv };
        });

        return { ok: true, resultId: output.id };
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
        const cost = levelUpCost(owned.level);
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
        const expState = useExpeditionStore.getState();
        if (!tpl || !canEvolve(tpl, owned, get().inventory, expState.dropInventory)) return;
        const cost = evoCost(tpl.rarity, owned.currentForm);
        if (!get().spendPixelCoins(cost)) return;
        // Consomme les Pierres d'Évolution (drop d'expédition) requises —
        // sauf pour les persos de boss d'événement (noEvoStones), dont
        // l'objet d'évolution dédié suffit.
        if (!tpl.noEvoStones) {
          const stonesCost = evoStoneCost(tpl.rarity, owned.currentForm);
          if (stonesCost > 0) expState.consumeDrop(EVOLUTION_STONE_ITEM_ID, stonesCost);
        }
        // Consomme les items requis pour cette évolution si applicable (1 de
        // chacun — cumulatif d'une forme à l'autre, voir EvoForm.requiredItemIds)
        const nextForm = tpl.forms?.[owned.currentForm + 1];
        const requiredItems = nextForm?.requiredItemIds;
        set(state => {
          const newInventory = requiredItems?.length
            ? { ...state.inventory }
            : state.inventory;
          if (requiredItems?.length) {
            for (const id of requiredItems) newInventory[id] = Math.max(0, (newInventory[id] ?? 0) - 1);
          }
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
        const tpl = getCharacterById(parseInstanceKey(id).templateId);
        if (!tpl) return;
        if (runPeakPalierOf(get()) < RARITY_GATES[tpl.rarity].unlockPalier) return;
        // Exclusivité expédition ↔ équipe active : un perso en expédition ne
        // peut pas être équipé (voir aussi canStart dans expeditionStore.ts,
        // qui bloque le sens inverse).
        if (useExpeditionStore.getState().isCharOnExpedition(parseInstanceKey(id).templateId)) return;
        set(state => {
          const team = [...state.equippedTeam] as (string | null)[];
          const currentSlot = team.findIndex(entry => entry === id);
          if (currentSlot === slot) return { equippedTeam: team };
          // Bloque l'échange si le perso actuellement dans ce slot a utilisé son
          // ult pendant le combat de boss en cours (même règle que unequipCharacter,
          // sinon on pouvait contourner le verrou en écrasant le slot).
          const onBoss = state.bossActive || state.wave === 10;
          const occupant = team[slot];
          if (occupant && occupant !== id && onBoss && state.ultUsedThisFight.includes(occupant)) return { equippedTeam: team };
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
        const id = rollCharacter(runPeakPalierOf(get()));
        const edition = get().addToCollection(id);
        get().bumpQuestProgress('w_gacha_10', 1);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + 1 }));
        broadcastAndSaveLocal();
        requestUrgentSave();
        return { templateId: id, edition };
      },
      pullMulti: () => {
        if (get().nekoGems < GACHA_COSTS.multi10) return null;
        set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi10, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi10 }));
        const ids = rollMulti(runPeakPalierOf(get()));
        const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
        get().bumpQuestProgress('w_gacha_10', ids.length);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
        broadcastAndSaveLocal();
        requestUrgentSave();
        return results;
      },
      pullMulti100: () => {
        if (get().nekoGems < GACHA_COSTS.multi100) return null;
        set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi100, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi100 }));
        const ids = rollMulti100(runPeakPalierOf(get()));
        const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
        get().bumpQuestProgress('w_gacha_10', ids.length);
        set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
        broadcastAndSaveLocal();
        requestUrgentSave();
        return results;
      },
      addToCollection: (templateId) => {
        // L'édition (Base/Or/Diamant) est tirée à CHAQUE obtention — pas
        // seulement la première fois. Chaque édition d'un perso est une
        // entrée de collection séparée (progression indépendante), reliée au
        // même templateId pour l'art/nom/ultime.
        const prestigeBonuses = getPrestigeBonuses();
        const edition = rollCardEdition(prestigeBonuses.shinyGoldBonusPct, prestigeBonuses.shinyDiamondBonusPct);
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
          // Rang banqué (shiny/forge/event conservés à travers un prestige) :
          // restauré une seule fois à la première re-obtention post-prestige.
          const banked = state.bankedRanks[instanceKey];
          const newBankedRanks = banked !== undefined
            ? Object.fromEntries(Object.entries(state.bankedRanks).filter(([k]) => k !== instanceKey))
            : state.bankedRanks;
          return {
            collection: {
              ...state.collection,
              [instanceKey]: ex2
                ? { ...ex2, copies: ex2.copies+1, rank: Math.min(ex2.rank+1, 7), equippedItems }
                : { templateId, rank: banked ?? 1, copies: banked ?? 1, level:1, currentForm:0, xp:0, equippedItems, edition },
            },
            bankedRanks: newBankedRanks,
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

      buyEventCharacter: (bossId) => {
        const boss = EVENT_BOSSES.find(b => b.id === bossId);
        if (!boss) return false;
        const owned = get().inventory[boss.coinItemId] ?? 0;
        if (owned < boss.buyCost) return false;
        set(state => ({
          inventory: { ...state.inventory, [boss.coinItemId]: owned - boss.buyCost },
        }));
        get().addToCollection(boss.characterId);
        return true;
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
      focusExpedition: (id) => set(() => ({ focusedExpeditionId: id })),

      // ─── Prestige (New Game+) ─────────────────────────────────────────
      // Débloqué au palier 41 CETTE run (runPeakPalier, pas le lifetime
      // maxPalierReached), non obligatoire, repétable à volonté au-delà —
      // il faut regrinder jusqu'à 41 à chaque fois, runPeakPalier étant remis
      // à 1 par ce reset (voir runPeakPalierOf()).
      // Reset : équipements, coins, collection (rang/forme/niveau des cartes),
      //         pièces perso d'event, items de forge, héros, combat en cours,
      //         expéditions en cours (annulées : leurs persos n'existeront
      //         plus dans la collection vidée).
      // Conserve : gemmes, maxPalierReached (classement), succès/titres
      //            (store dédié), quêtes, monnaies premium (BossCrowns,
      //            Orbes du Néant). Les cartes shiny (or/diamant) et les persos
      //            forge/event gardent leur RANG en banque (bankedRanks),
      //            restauré automatiquement à la re-obtention (addToCollection).
      doPrestige: () => {
        const state = get();
        const runPeak = runPeakPalierOf(state);
        if (!usePrestigeStore.getState().canPrestige(runPeak)) return;

        // Banque le rang des cartes shiny/forge/event AVANT de vider la collection.
        const newBankedRanks = { ...state.bankedRanks };
        for (const owned of Object.values(state.collection)) {
          const edition = owned.edition ?? 'base';
          if (isForgeOrEventCharacter(owned.templateId) || edition !== 'base') {
            newBankedRanks[makeInstanceKey(owned.templateId, edition)] = owned.rank;
          }
        }

        // Incrémente le niveau de prestige et crédite les jetons + toast
        // (le nombre de jetons dépend du palier atteint CETTE run, pas du
        // lifetime — sinon represtiger juste après en donnerait déjà plein).
        usePrestigeStore.getState().doPrestige(runPeak);

        // Succès "de run" (kills, dps, coins, pulls, amélios, collection,
        // quêtes, rang 7★) remis à zéro — voir lib/game/achievements.ts.
        useAchievementStore.getState().resetPrestigeAchievements();

        set({
          // ── Reset ──
          equipmentInventory: {},
          unlockedEquipRarities: ['C'] as Rarity[],
          unlockedEquipDropRarities: ['C'] as Rarity[],
          pixelCoins: 0,
          collection: {},
          championInventory: {},
          bankedRanks: newBankedRanks,
          equippedTeam: [null, null, null, null],
          inventory: {},
          goldUpgradeLevel: 0,
          hero: { level: 1, currentForm: 0, xp: 0 },
          wave: 1,
          palier: 1,
          runPeakPalier: 1,
          currentEnemy: generateEnemy(1, 1, 1),
          bossActive: false,
          bossTimeLeft: 0,
          bossAvoided: false,
          ultUsedThisFight: [],
          // ── Conservé : maxPalierReached, nekoGems, bossCrowns, voidOrbs ──
        });
        // Annule les expéditions en cours (leurs persos n'existent plus dans
        // la collection qu'on vient de vider) et vide les drops de forge.
        useExpeditionStore.setState({ dropInventory: {}, active: [] });

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

      // Calcule (SANS RIEN CRÉDITER) le gain depuis la dernière sauvegarde connue
      // (`savedAt` — la même valeur, quel que soit l'appareil, que celle lue/écrite
      // en base par useCloudSave). Comparer "maintenant" à ce timestamp unique est
      // ce qui rend le calcul identique sur PC, téléphone ou ailleurs : on ne
      // dépend plus d'un compteur local mis à jour pendant qu'on joue. Retourne
      // le récap à afficher (ou null si rien à réclamer) ; ne modifie aucun état.
      checkOfflineGain: () => {
        const s = get();
        const now  = Date.now();
        const last = s.savedAt;
        if (!last) return null; // jamais sauvegardé (tout nouveau compte) : rien à calculer
        const rawSeconds = Math.max(0, Math.floor((now - last) / 1000));
        if (rawSeconds < OFFLINE_MIN_SECONDS) return null;

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
        return (coins > 0 || gems > 0) ? gain : null;
      },

      // Crédite un gain précédemment calculé par checkOfflineGain — appelé
      // uniquement quand le joueur clique sur "RÉCUPÉRER" dans la popup.
      claimOfflineEarnings: (gain) => {
        set(state => {
          const cq = bumpCoinQuests(state.quests, state.weeklyQuests ?? [], gain.coins);
          return {
            pixelCoins: state.pixelCoins + gain.coins,
            nekoGems:   state.nekoGems + gain.gems,
            savedAt: gain.at,
            lastOfflineGain: gain,
            quests: cq.quests, weeklyQuests: cq.weeklyQuests,
          };
        });
        broadcastAndSaveLocal();
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
  // appliqué par l'appelant (voir tickDps/activateCharacterUltimate,
  // qui fusionnent { currentHp: newHp } avant d'appeler cette fonction).
  if (state.currentEnemy.currentHp > 0) return {};

  // Multiplicateurs de coins (or + ult + boost BossCrown)
  const chestMult    = getGoldChestMultiplier((state as {goldUpgradeLevel?:number}).goldUpgradeLevel ?? 0);
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
    // Passage à un palier jamais atteint : événement majeur, sauvegarde immédiate
    // (pas d'attente du prochain cycle périodique) pour ne jamais perdre cette progression.
    if (isNewProgress) requestUrgentSave();
    if (isNewProgress && auth?.currentUser?.uid) {
      updatePlayerScore(auth.currentUser.uid, {
        username: state.username,
        palier: next,
        maxPalierReached: next,
        wave: 1,
        totalClicks: state.totalClicks,
        pixelCoins: coins,
      }).catch(() => {});
    }
    // Gemmes (palier×10) et +1 couronne de boss : réservées à une vraie
    // progression (sinon re-farmer un boss trivial = robinet infini).
    const passGems     = isNewProgress ? getPalierPassGems(state.palier) : 0;
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
    const newRunPeak = Math.max(runPeakPalierOf(state), next);
    return { pixelCoins:coins, nekoGems:gems + passGems, quests:bossQuestUpdate.quests, weeklyQuests:bossQuestUpdate.weeklyQuests, eventQuests:finalEventQuests, wave:1, palier:next, maxPalierReached:Math.max(state.maxPalierReached,next), runPeakPalier:newRunPeak, bossActive:false, bossTimeLeft:0, bossAvoided:false, ultUsedThisFight:[], currentEnemy:generateEnemy(1,next,newRunPeak), bossCrowns: bossCrownsBefore + crownGain, totalBossCrownsEarned: ((state as {totalBossCrownsEarned?:number}).totalBossCrownsEarned ?? 0) + crownGain, lastBossVictory: bossVictory, totalKills: (state.totalKills ?? 0) + 1, totalBossKills: (state.totalBossKills ?? 0) + 1 } as Partial<GameState & { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] }>;
  }
  const nw = state.wave + 1;
  const runPeak = runPeakPalierOf(state);
  if (nw === 10) {
    // Mode farm (palier < runPeakPalier, càd déjà validé CETTE run) OU boss
    // évité → boucle sur vague 1, le boss ne se déclenche jamais.
    const isFarming = state.palier < runPeak;
    if (isFarming || state.bossAvoided) {
      return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:1, ultUsedThisFight:[], currentEnemy:generateEnemy(1, state.palier, runPeak), totalKills: (state.totalKills ?? 0) + 1 };
    }
    return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:10, bossActive:true, bossTimeLeft:getPalierConfig(state.palier).bossTimerSeconds, ultUsedThisFight:[], currentEnemy:generateEnemy(10,state.palier,runPeak), totalKills: (state.totalKills ?? 0) + 1 };
  }
  const equipDrop = getEquipmentDrop(
    state.unlockedEquipDropRarities ?? ['C'],
    (state.palier < runPeak ? FARM_EQUIP_DROP_RATE : 1) * getPrestigeBonuses().equipDropRateMult,
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
    ultUsedThisFight:[], currentEnemy:generateEnemy(nw,state.palier,runPeak),
    equipmentInventory:newEquipmentInventory,
    lastEquipmentDrop: equipDrop ?? null,
    totalKills: (state.totalKills ?? 0) + 1,
  };
}