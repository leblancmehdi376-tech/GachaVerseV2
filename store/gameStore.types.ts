// Types partagés du store de jeu — extraits de gameStore.ts pour que chaque
// slice (store/slices/*.ts) puisse typer ses actions contre le store COMBINÉ
// (accès croisé aux autres domaines via get()/set()) sans dépendre du fichier
// combinateur lui-même (évite tout cycle d'import).
//
// Chaque domaine expose un type "...State" (champs qu'il possède, au-delà de
// GameState) et un type "...Actions" (méthodes). Les valeurs INITIALES de
// TOUT le store (GameState + tous les "...State" ci-dessous) restent
// centralisées dans makeInitial() (gameStore.ts) — un seul et unique endroit
// à jour pour que resetGame() (qui fait set(makeInitial())) réinitialise bien
// TOUT l'état d'un coup. Les fichiers slices/*.ts, eux, n'exportent que des
// actions (aucune valeur par défaut), pour ne jamais diverger de makeInitial().
import {
  GameState, EquipmentSlot, Rarity,
} from '@/types/game';
import { CardEdition } from '@/lib/game/editions';
import { Achievement } from '@/lib/game/achievements';
import { PrestigeBonusLevels, PrestigeBonusType } from '@/lib/game/prestige';
import { UltimateEffect } from '@/lib/game/ultimates';
import { Affinity } from '@/lib/game/affinities';

export interface Quest {
  id: string; label: string; icon: string;
  target: number; current: number; reward: number; rewardType: 'gems'|'coins'; done: boolean;
  type: 'daily' | 'weekly' | 'event';
}

export interface OfflineGain {
  coins: number;      // coins crédités
  gems: number;       // gemmes crédités (drops de mobs normaux uniquement)
  kills: number;      // nombre de mobs normaux simulés
  seconds: number;    // durée créditée (après plafond)
  rawSeconds: number; // durée réelle d'absence
  capped: boolean;    // true si l'absence a dépassé le plafond
  at: number;         // timestamp du calcul
}

// ─── Combat : boucle ennemi/boss, ultimes, ressources ─────────────────────
export interface CombatState {
  lastBossVictory: { palier: number; gems: number; coins: number; crowns: number; at: number } | null;
}
export interface CombatActions {
  clearBossVictory: () => void;
  getRunPeakPalier: () => number;
  retreatFromBoss: () => void;
  challengeBoss: () => void;
  travelToPalier: (palier: number) => void;
  tickDps: () => void;
  tickBossTimer: () => void;
  activateCharacterUltimate: (templateId: string, formIndex: number) => void;
  spendPixelCoins: (n: number) => boolean;
}
export type CombatSlice = CombatState & CombatActions;

// ─── Personnages : héros, niveaux/évolutions, équipe, DPS ──────────────────
// (aucun champ propre : hero/collection/equippedTeam/username vivent déjà
// dans GameState — cette slice n'ajoute que des actions)
export interface CharacterSlice {
  setUsername: (name: string) => void;
  levelUpHero: () => void;
  evolveHero: () => void;
  upgradeGold: () => void;
  getGoldMultiplier: () => number;
  getGoldUpgradeCost: () => number;
  levelUpCharacter: (templateId: string) => void;
  evolveCharacter: (templateId: string) => void;
  getTotalDps: () => number;
  getCharDpsBreakdown: (templateId: string) => { base: number; typeMult: number; final: number };
  equipCharacter: (id: string, slot: number) => void;
  unequipCharacter: (slot: number) => void;
}

// ─── Équipement : inventaire d'objets, équipement, fusion ──────────────────
export interface EquipmentState {
  inventory: Record<string, number>;
  // Signal de navigation "Forge → Expéditions" : id de l'expédition à mettre
  // en avant (onglet + surbrillance) quand on clique sur un ingrédient.
  focusedExpeditionId: string | null;
  // Fusion d'équipement (10 items d'un slot+rareté → 1 de la rareté suivante)
  unlockedEquipRarities: Rarity[];
}
export interface EquipmentActions {
  addItem: (itemId: string, qty?: number) => void;
  sellItem: (itemId: string, qty: number) => void;
  addEquipment: (equipmentId: string, qty?: number) => void;
  recycleEquipment: (equipmentId: string, qty?: number) => void;
  equipItem: (templateId: string, slot: EquipmentSlot, equipmentId: string) => void;
  unequipItem: (templateId: string, slot: EquipmentSlot) => void;
  setLastEquipmentDrop: (id: string | null) => void;
  focusExpedition: (id: string | null) => void;
  unlockEquipRarity: (rarity: Rarity) => void;
  upgradeEquipment: (slot: EquipmentSlot, rarity: Rarity) => { ok: boolean; reason?: string; resultId?: string };
  // Déblocage du drop d'équipement par rareté (via expédition "Chasse — Rareté X")
  unlockEquipDropRarity: (rarity: Rarity) => void;
}
export type EquipmentSlice = EquipmentState & EquipmentActions;

// ─── Gacha & collection ─────────────────────────────────────────────────
export interface GachaState {
  // LEGACY — ancienne banque illimitée (shiny/forge/event uniquement), avant
  // l'unification dans historicalMaxRank. Plus jamais écrit par doPrestige ;
  // conservé en lecture seule dans addToCollection pour replier une bonne
  // fois les rangs déjà en attente chez des joueurs existants dans le pic
  // historique, sans perte. Peut être supprimé une fois toutes ces entrées
  // consommées (mappe vide chez tout joueur ayant prestigé depuis).
  bankedRanks: Record<string, number>;
  // Rang MAX jamais atteint (toutes vies confondues) pour CHAQUE carte —
  // shiny/forge/event compris, même traitement que les persos normaux —
  // banqué à chaque Prestige. Sert au bonus "Mémoire des Rangs" (achat direct
  // côté Prestige) : jamais consommé/supprimé, plafonné par le niveau du
  // bonus à la ré-obtention (voir addToCollection).
  historicalMaxRank: Record<string, number>;
  // Filtres de collection persistants entre les pages / onglets
  collectionFilter: string;
  collectionUniverse: string | 'all';
  collectionAffinity: string;
  collectionSort: string;
  // Boutique — achat d'un perso d'événement contre ses pièces (voir lib/game/eventBoss.ts)
  // Nombre d'achats déjà effectués par boss : le prix (getEventCharacterCost)
  // augmente de 10% à chaque achat.
  eventCharacterPurchases: Record<string, number>;
}
export interface GachaActions {
  setCollectionFilters: (patch: { filter?: string; universe?: string | 'all'; affinity?: string; sort?: string }) => void;
  pullSingle: () => { templateId: string; edition: CardEdition } | null;
  pullMulti: () => { templateId: string; edition: CardEdition }[] | null;
  pullMulti100: () => { templateId: string; edition: CardEdition }[] | null;
  addToCollection: (id: string) => CardEdition;
  grantMaxedCharacter: (templateId: string, edition?: CardEdition) => void;
  buyEventCharacter: (bossId: string) => boolean;
}
export type GachaSlice = GachaState & GachaActions;

// ─── Boutiques : BossCrown, Orbe du Néant, champions, pack de démarrage ────
export interface ShopState {
  bossCrowns: number;
  voidOrbs: number;
  dpsBoostEndsAt: number;
  goldBoostEndsAt: number;
  eventDpsMult: number;
  eventDpsMultEndsAt: number;
  dailyShop: { dayKey: string; characterIds: string[]; purchased: string[] };
  starterPackClaimed: boolean;
}
export interface ShopActions {
  getEventDpsMult: () => number;
  setEventDpsMult: (mult: number, durationMs: number) => void;
  dealInstantDamage: (dmg: number) => void;
  grantEventRewards: (coins?: number, gems?: number, crowns?: number) => void;
  isDpsBoostActive: () => boolean;
  isGoldBoostActive: () => boolean;
  buyDpsBoost: () => void;
  buyGoldBoost: () => void;
  buyGemsWithCrowns: (packId: string) => void;
  buyGoldWithGems: (packId: string) => void;
  ensureDailyShop: () => void;
  buyShopCharacter: (slotIndex: number) => void;
  buyGemsWithOrbs: (packId: string) => void;
  buyEquipmentChest: (tier: 'common' | 'rare' | 'epic') => string | null;
  recycleChampion:   (templateId: string) => void;
  recycleChampionsByRarity: (rarity: Rarity) => { count: number; orbs: number };
  removeChampion:    (templateId: string) => void; // pour HdV
  isStarterPackAvailable: () => boolean;
  claimStarterPack: () => { templateId: string; edition: CardEdition } | null;
}
export type ShopSlice = ShopState & ShopActions;

// ─── Quêtes journalières / hebdomadaires / événement ───────────────────────
export interface QuestState {
  quests: Quest[];
  questsDayKey: string;
  weeklyQuests: Quest[];
  weeklyQuestsDayKey: string;
  eventQuests: Quest[];
}
export interface QuestActions {
  bumpQuestProgress: (id: string, by?: number) => void;
  setQuestProgress: (id: string, value: number) => void;
  claimQuest: (id: string) => void;
  ensureDailyQuests: () => void;
  ensureWeeklyQuests: () => void;
  claimWeeklyQuest: (id: string) => void;
  claimEventQuest: (id: string) => void;
  bumpEventQuest: (id: string, by?: number) => void;
}
export type QuestSlice = QuestState & QuestActions;

// ─── Progression long-terme : gains hors-ligne (idle) + Prestige ──────────
export interface MetaProgressionState {
  offlineMultLevel: number;
  offlineCapLevel: number;
  lastOfflineGain: OfflineGain | null;
  // Timestamp de la dernière sauvegarde locale (anti-rollback)
  savedAt: number;
}
export interface MetaProgressionActions {
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
  doPrestige: () => void;
}
export type MetaProgressionSlice = MetaProgressionState & MetaProgressionActions;

// ─── Succès (achievements) et titres ───────────────────────────────────────
export interface AchievementState {
  achievementProgress: Record<string, number>;
  achievementUnlocked: Record<string, boolean>;
  achievementsClaimed: Record<string, boolean>;
  activeTitle: string;
  unlockedTitles: string[];
}
export interface AchievementActions {
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
  resetPrestigeAchievements: () => void;
}
export type AchievementSlice = AchievementState & AchievementActions;

// ─── Prestige (New Game+) ───────────────────────────────────────────────────
export interface PrestigeState {
  prestigeLevel: number;
  prestigeTokens: number;
  prestigeBonusLevels: PrestigeBonusLevels;
  prestigeRankRecoveryLevel: number;
}
export interface PrestigeActions {
  canPrestige: (maxPalierReached: number) => boolean;
  spendToken: () => PrestigeBonusType | null;
  buyRankRecovery: () => boolean;
}
export type PrestigeSlice = PrestigeState & PrestigeActions;

// ─── Ultimes de personnage ──────────────────────────────────────────────────
export interface ActiveUlt {
  templateId: string;
  formIndex:  number;
  endsAt:     number;   // timestamp ms
  effect:     UltimateEffect;
}
export interface UltimateState {
  ultCooldowns: Record<string, number>;
  ultActiveUlts: ActiveUlt[];
  ultAnimating: string | null;
}
export interface UltimateActions {
  startCooldown: (templateId: string, duration: number) => void;
  activateUlt: (templateId: string, formIndex: number, equippedTeam?: (string | null)[]) => void;
  tickUlt: () => void;
  getDpsMultiplierFor: (templateId: string) => number;
  getActiveCritChance: () => number | null;
  getActiveEnemyDamageTakenMultiplier: () => number;
  getActiveBonusDpsFlat: (teamDps: number) => number;
  getActiveDamageToCoinPct: () => number;
}
export type UltimateSlice = UltimateState & UltimateActions;

// ─── Expéditions et craft/forge ─────────────────────────────────────────────
export interface ActiveExpedition {
  id:           string;  // unique instance id
  defId:        string;
  characterIds: string[];
  startTime:    number;
  endTime:      number;
  claimed:      boolean;
}
export interface ExpeditionState {
  expeditionActive: ActiveExpedition[];
  expeditionDropInventory: Record<string, number>;
  expeditionCraftedRecipes: string[];
  expeditionSlotLevel: number;
  expeditionDefAffinities: Record<string, Affinity>;
}
export interface ExpeditionActions {
  getMaxActiveExpeditions: () => number;
  getExpeditionSlotCost: () => number | null;
  upgradeExpeditionSlot: () => void;
  getExpeditionAffinity: (defId: string) => Affinity;
  canStart: (defId: string, characterIds: string[]) => { ok: boolean; reason?: string };
  startExpedition: (defId: string, characterIds: string[]) => void;
  claimExpedition: (instanceId: string) => void;
  cancelExpedition: (instanceId: string) => void;
  getDropCount: (dropId: string) => number;
  consumeDrop: (dropId: string, quantity: number) => boolean;
  canCraft: (recipeId: string) => { ok: boolean; missing: string[] };
  craftRecipe: (recipeId: string) => boolean;
  getActiveForChar: (charId: string) => ActiveExpedition | undefined;
  isCharOnExpedition: (charId: string) => boolean;
  getFinished: () => ActiveExpedition[];
}
export type ExpeditionSlice = ExpeditionState & ExpeditionActions;

// ─── Store combiné ─────────────────────────────────────────────────────────
// GameState (types/game.ts) porte les champs de base partagés par plusieurs
// domaines (pixelCoins, collection, equippedTeam, hero, currentEnemy...).
// Chaque slice n'y rajoute que SES champs/actions propres — voir
// store/gameStore.ts pour l'assemblage (spread de chaque slice + makeInitial()).
export type GameStore = GameState
  & CombatSlice
  & CharacterSlice
  & EquipmentSlice
  & GachaSlice
  & ShopSlice
  & QuestSlice
  & MetaProgressionSlice
  & AchievementSlice
  & PrestigeSlice
  & UltimateSlice
  & ExpeditionSlice
  & {
    // Flag to temporarily suppress toasts/notifications during state restore
    suppressToasts: boolean;
    resetGame: () => void;
  };
