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
import type { CollectionFilterState } from '@/lib/game/collectionFilters';
import type { CohesionResult } from '@/lib/game/cohesion';
import {
  GameState, EquipmentSlot, Rarity,
} from '@/types/game';
import { CardEdition } from '@/lib/game/editions';
import type { BannerId } from '@/lib/game/gacha';
import { Achievement, CharMastery } from '@/lib/game/achievements';
import { PrestigeBonusLevels, PrestigeBonusType } from '@/lib/game/prestige';
import { UltimateEffect } from '@/lib/game/ultimates';
import { Affinity } from '@/lib/game/affinities';
import { Anomaly } from '@/lib/game/anomalies';
import { BigNum } from '@/lib/game/bignum';
import type { GoldGainBreakdown } from './gameStoreHelpers';

export interface Quest {
  id: string; label: string; icon: string;
  target: number; current: number; reward: number; rewardType: 'gems'|'coins'; done: boolean;
  type: 'daily' | 'weekly' | 'raid';
}

// ─── Historique de solde (pour le graphe admin coins/gemmes) ───────────────
// Un point par sauvegarde Firestore (périodique ~10min, ou urgente) — voir
// recordCurrencySnapshot dans gameStore.ts et son appel dans saveToFirebase
// (lib/firebase/cloudSaveSync.ts) : le point est pris juste avant l'écriture
// déjà prévue, donc inclus dans le MÊME setDoc, sans lecture/écriture Firestore
// supplémentaire. Le solde (pas le delta) est stocké : le delta gagné/dépensé
// entre deux points est recalculé à l'affichage (voir CurrencyHistoryChart).
export interface CurrencySnapshot {
  t: number;      // Date.now() au moment du snapshot
  coins: BigNum;  // solde de pixelCoins à cet instant
  gems: number;   // solde de nekoGems à cet instant
}

export interface OfflineGain {
  coins: BigNum;       // coins crédités (dérivé de pixelCoinsReward, non-plafonné)
  gems: number;        // gemmes crédités (drops de mobs normaux uniquement)
  kills: number;       // nombre de mobs normaux simulés
  seconds: number;     // durée créditée (après plafond)
  rawSeconds: number;  // durée réelle d'absence
  capped: boolean;     // true si l'absence a dépassé le plafond
  at: number;          // timestamp du calcul
}

// ─── Combat : boucle ennemi/boss, ultimes, ressources ─────────────────────
export interface CombatState {
  lastBossVictory: { palier: number; gems: number; coins: BigNum; crowns: number; at: number } | null;
}
export interface CombatActions {
  clearBossVictory: () => void;
  getRunPeakPalier: () => number;
  retreatFromBoss: () => void;
  challengeBoss: () => void;
  travelToPalier: (palier: number) => void;
  tickDps: () => void;
  tickBossTimer: () => void;
  /** Lance l'ulti — ou le met en file d'attente si un ulti est déjà actif
   *  (re-cliquer un ulti en file le retire de la file). */
  activateCharacterUltimate: (templateId: string, formIndex: number) => void;
  /** Lance le prochain ulti de la file si plus aucun ulti n'est actif. */
  launchNextQueuedUlt: () => void;
  spendPixelCoins: (n: BigNum) => boolean;
  /** Debug localhost uniquement : tue instantanément l'ennemi courant. */
  debugKillEnemy: () => void;
}
export type CombatSlice = CombatState & CombatActions;

// ─── Personnages : héros, niveaux/évolutions, équipe, DPS ──────────────────
// (aucun champ propre : hero/collection/equippedTeam/username vivent déjà
// dans GameState — cette slice n'ajoute que des actions)
export interface CharacterSlice {
  setUsername: (name: string) => void;
  setSelectedAvatarChampionId: (templateId: string | null) => void;
  levelUpHero: () => void;
  evolveHero: () => void;
  upgradeGold: () => void;
  getGoldMultiplier: () => BigNum;
  /** Détail de getGoldMultiplier (même calcul) : chaque source de bonus d'or. */
  getGoldBreakdown: () => GoldGainBreakdown;
  getGoldUpgradeCost: () => BigNum;
  levelUpCharacter: (templateId: string) => void;
  /** Monte jusqu'à `count` niveaux (s'arrête dès qu'un niveau n'est plus payable), en une seule mise à jour. */
  levelUpCharacterN: (templateId: string, count: number) => void;
  evolveCharacter: (templateId: string) => void;
  getTotalDps: () => BigNum;
  /** Détail de getTotalDps (même calcul) : contribution de chaque perso et bonus appliqués. */
  getDpsBreakdown: () => DpsBreakdown;
  // Cohésion d'équipe (combat de l'accueil uniquement) — voir lib/game/cohesion.ts
  getTeamCohesion: () => CohesionResult;
  getCharDpsBreakdown: (templateId: string) => { base: BigNum; typeMult: number; final: BigNum };
  equipCharacter: (id: string, slot: number) => void;
  unequipCharacter: (slot: number) => void;
}

// Détail du DPS d'équipe affiché au survol du DPS (combat de l'accueil).
// Les multiplicateurs sont exprimés en facteur (1.2 = +20 %).
export interface DpsBreakdownChar {
  key: string;            // clé de collection (instance)
  templateId: string;
  name: string;
  dps: BigNum;            // contribution finale au DPS total (somme = total)
  ownDps: BigNum;         // DPS avec ses bonus propres (maîtrise, équipement, synergies, ultime perso, type), hors bonus d'équipe
  equipMult: number;      // équipement
  masteryMult: number;    // maîtrise du personnage
  synergyMult: number;    // synergies d'univers (+ boost d'anomalie de synergie)
  synergies: { label: string; color: string; global: boolean }[]; // synergies qui s'appliquent à CE perso
  selfUltMult: number;    // ultime personnel actif
  typeMult: number;       // avantage/désavantage de type vs l'ennemi (+ anomalies de type)
}
export interface DpsBreakdown {
  total: BigNum;
  chars: DpsBreakdownChar[];
  teamUltMult: number;    // ultimes qui boostent toute l'équipe
  boostMult: number;      // boost DPS de la boutique
  cohesionMult: number;
  prestigeMult: number;
  anomalyMult: number;    // anomalies "DPS global"
  eventMult: number;      // événement aléatoire (Ardeur…) — appliqué aux dégâts, hors total affiché
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
  equipItem: (templateId: string, slot: EquipmentSlot, equipmentId: string) => void;
  unequipItem: (templateId: string, slot: EquipmentSlot) => void;
  setLastEquipmentDrop: (id: string | null) => void;
  focusExpedition: (id: string | null) => void;
  unlockEquipRarity: (rarity: Rarity) => void;
  upgradeEquipment: (slot: EquipmentSlot, rarity: Rarity) => { ok: boolean; reason?: string; resultId?: string };
  // Fusion d'armes spéciales (3 armes de perso Cosmique+ d'une rareté → 1 arme
  // de perso aléatoire de la MÊME rareté — pas de changement de rareté).
  fuseSpecialWeapons: (rarity: Rarity) => { ok: boolean; reason?: string; resultId?: string };
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
  // Filtres de collection partagés entre les pages (en mémoire, non persistés)
  collectionFilters: CollectionFilterState;
  // Boutique — achat d'un perso de raid contre ses pièces (voir lib/game/raidBoss.ts)
  // Nombre d'achats déjà effectués par boss : le prix (getRaidCharacterCost)
  // augmente de 10% à chaque achat.
  raidCharacterPurchases: Record<string, number>;
}
export interface GachaActions {
  setCollectionFilters: (patch: Partial<CollectionFilterState>) => void;
  // Coûts en gemmes après réduction des anomalies "Réduc. Coût Gacha" (arrondis).
  getGachaCosts: () => { single: number; multi10: number; multi100: number };
  pullSingle: (bannerId?: BannerId) => { templateId: string; edition: CardEdition } | null;
  pullMulti: (bannerId?: BannerId) => { templateId: string; edition: CardEdition }[] | null;
  pullMulti100: (bannerId?: BannerId) => { templateId: string; edition: CardEdition }[] | null;
  addToCollection: (id: string) => CardEdition;
  grantMaxedCharacter: (templateId: string, edition?: CardEdition) => void;
  buyRaidCharacter: (bossId: string) => boolean;
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
  dailyShop: { dayKey: string; characterIds: string[]; purchased: string[]; rerollCount: number };
  starterPackClaimed: boolean;
}
export interface ShopActions {
  getEventDpsMult: () => number;
  setEventDpsMult: (mult: number, durationMs: number) => void;
  dealInstantDamage: (dmg: BigNum) => void;
  grantEventRewards: (coins?: BigNum, gems?: number, crowns?: number) => void;
  isDpsBoostActive: () => boolean;
  isGoldBoostActive: () => boolean;
  buyDpsBoost: () => void;
  buyGoldBoost: () => void;
  buyGemsWithCrowns: (packId: string) => void;
  buyGoldWithGems: (packId: string) => void;
  ensureDailyShop: () => void;
  buyShopCharacter: (slotIndex: number) => void;
  rerollDailyShop: () => void;
  buyGemsWithOrbs: (packId: string) => void;
  buyEquipmentChest: (tier: 'common' | 'rare' | 'epic') => string | null;
  recycleChampion:   (templateId: string) => void;
  recycleChampionsByRarity: (rarity: Rarity) => { count: number; orbs: number };
  removeChampion:    (templateId: string) => void; // pour HdV
  isStarterPackAvailable: () => boolean;
  claimStarterPack: () => { templateId: string; edition: CardEdition } | null;
}
export type ShopSlice = ShopState & ShopActions;

// ─── Quêtes journalières / hebdomadaires / raid ───────────────────────
export interface QuestState {
  quests: Quest[];
  questsDayKey: string;
  weeklyQuests: Quest[];
  weeklyQuestsDayKey: string;
  raidQuests: Quest[];
}
export interface QuestActions {
  bumpQuestProgress: (id: string, by?: number) => void;
  setQuestProgress: (id: string, value: number) => void;
  claimQuest: (id: string) => void;
  ensureDailyQuests: () => void;
  ensureWeeklyQuests: () => void;
  claimWeeklyQuest: (id: string) => void;
  claimRaidQuest: (id: string) => void;
  bumpRaidQuest: (id: string, by?: number) => void;
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
  getOfflineCoinsPerHour: () => BigNum;
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
  // Async : attend la confirmation Firestore avant de résoudre (voir
  // requestUrgentSaveAndWait) — l'UI doit attendre cette promesse avant de
  // rendre la main au joueur (fermer le dialogue de confirmation). Renvoie
  // false si la confirmation cloud a échoué (un toast d'avertissement a déjà
  // été affiché et un rattrapage en arrière-plan programmé) — l'appelant
  // peut choisir d'agir dessus (ex: garder un indicateur visible).
  doPrestige: () => Promise<boolean>;
}
export type MetaProgressionSlice = MetaProgressionState & MetaProgressionActions;

// ─── Succès (achievements) et titres ───────────────────────────────────────
export interface AchievementState {
  achievementProgress: Record<string, number>;
  achievementUnlocked: Record<string, boolean>;
  achievementsClaimed: Record<string, boolean>;
  activeTitle: string;
  unlockedTitles: string[];
  // Compteurs et drapeaux de succès permanents (jamais remis à zéro au
  // Prestige) : temps de jeu, séries, défis, secrets découverts... — clés
  // listées dans lib/game/achievements.ts (STAT/EGG/CHAL/EV_PERFECT/page:*).
  // Synchronisés cloud avec une fusion "max par clé" (mergeMonotonicState).
  achievementStats: Record<string, number>;
  // Maîtrise par personnage (templateId pur, toutes éditions confondues) —
  // voir CharMastery. Même règle de synchro (max par champ).
  charMastery: Record<string, CharMastery>;
  // Succès mis en avant sur le profil (page Trophées), dans l'ordre choisi.
  showcasedTrophies: string[];
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
  /** Réclame les récompenses en attente parmi `ids` (toutes si absent) ; renvoie le nombre réclamé. */
  claimAchievements: (ids?: string[]) => number;
  /** Réclame toutes les récompenses en attente ; renvoie le nombre de succès réclamés. */
  claimAllAchievements: () => number;
  unlockedCount: () => number;
  addStat: (key: string, by?: number) => void;
  maxStat: (key: string, value: number) => void;
  /** Marque un secret/une découverte (clé EGG.*, page:*, ev:*) comme trouvé. */
  discover: (key: string) => void;
  recordGachaResults: (templateIds: string[], isEventBanner: boolean) => void;
  recordMasteryLevels: () => void;
  toggleShowcasedTrophy: (id: string) => void;
  setShowcasedTrophies: (ids: string[]) => void;
  resetPrestigeAchievements: () => void;
}
export type AchievementSlice = AchievementState & AchievementActions;

// ─── Récompenses de connexion journalière (calendrier 28 jours) ────────────
export interface DailyRewardState {
  dailyRewardDayKey: string;       // dernière date (getTodayDayKey) prise en compte
  dailyRewardCurrentDay: number;   // jour courant du cycle (1-28)
  dailyRewardClaimedToday: boolean;
  dailyRewardClaimedDays: number[]; // jours déjà réclamés dans le cycle en cours (affichage)
}
export interface DailyRewardActions {
  ensureDailyReward: () => void;
  claimDailyReward: () => void;
}
export type DailyRewardSlice = DailyRewardState & DailyRewardActions;

// ─── GachaDle : défi du jour, série et quêtes (jamais reset au Prestige) ─────
export interface GachaDleState {
  dleDailyDate: string;         // jour (getDleDateKey) des essais ci-dessous
  dleDailyGuesses: string[];    // ids proposés au défi du jour, dans l'ordre
  dleStreak: number;            // série au moment de dleLastWinDate
  dleBestStreak: number;
  dleLastWinDate: string;       // dernier défi du jour réussi ('' = jamais)
  // Dernières victoires au défi du jour (la plus récente d'abord, 2 max) :
  // alimente le classement GachaDle du jour ET de la veille, alors que
  // dleDailyGuesses est écrasé dès le premier essai du jour suivant.
  dleRecentWins: DleWin[];
  dleGamesWon: number;          // défis du jour réussis (parties libres exclues)
  dleBestGuesses: number;       // moins d'essais pour une victoire (0 = aucune)
  dleRaritiesFound: Rarity[];   // raretés des personnages déjà trouvés
  dleQuestsClaimed: string[];
}
export interface DleWin { date: string; guesses: number }
export interface GachaDleActions {
  // Ajoute un essai au défi du jour ; en cas de victoire, crédite les gemmes
  // du jour (une seule fois par jour) et fait avancer la série.
  submitDleDailyGuess: (dateKey: string, characterId: string) => void;
  claimDleQuest: (id: string) => void;
}
export type GachaDleSlice = GachaDleState & GachaDleActions;

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
export interface QueuedUlt {
  templateId: string;
  formIndex:  number;
}
export interface UltimateState {
  ultCooldowns: Record<string, number>;
  ultActiveUlts: ActiveUlt[];
  /** Ultis stackés, lancés un par un dès que l'ulti actif se termine.
   *  Leur cooldown ne démarre qu'au lancement effectif. Jamais persisté. */
  ultQueue: QueuedUlt[];
  ultAnimating: string | null;
}
export interface UltimateActions {
  startCooldown: (templateId: string, duration: number) => void;
  activateUlt: (templateId: string, formIndex: number, equippedTeam?: (string | null)[]) => void;
  tickUlt: () => void;
  getDpsMultiplierFor: (templateId: string) => number;
  getActiveCritChance: () => number | null;
  getActiveEnemyDamageTakenMultiplier: () => number;
  getActiveBonusDpsFlat: (teamDps: BigNum) => BigNum;
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
  /** Debug localhost uniquement : termine instantanément une expédition. */
  debugFinishExpedition: (instanceId: string) => void;
  getDropCount: (dropId: string) => number;
  consumeDrop: (dropId: string, quantity: number) => boolean;
  canCraft: (recipeId: string) => { ok: boolean; missing: string[] };
  craftRecipe: (recipeId: string) => boolean;
  getActiveForChar: (charId: string) => ActiveExpedition | undefined;
  isCharOnExpedition: (charId: string) => boolean;
  getFinished: () => ActiveExpedition[];
}
export type ExpeditionSlice = ExpeditionState & ExpeditionActions;

// ─── Mine de gemmes (débloquée au premier Prestige) ────────────────────────
export interface MineState {
  mineOwned: boolean;
  mineCapLevel: number;
  mineSpeedLevel: number;
  mineGems: number;       // gemmes accumulées en attente de collecte (peut être fractionnaire entre 2 ticks)
  mineLastTickAt: number; // timestamp de la dernière production appliquée (tick en ligne ou rattrapage hors-ligne)
}
export interface MineActions {
  getMineCap: () => number;
  getMineRatePerHour: () => number;
  getMineCapUpgradeCost: () => number | null;
  getMineSpeedUpgradeCost: () => number | null;
  buyMine: () => void;
  upgradeMineCap: () => void;
  upgradeMineSpeed: () => void;
  // Production en ligne (appelée chaque seconde, voir useDpsTick) — plein
  // régime, seulement plafonnée par le stockage de la mine.
  tickMine: () => void;
  // Rattrapage hors-ligne (appelé une fois au chargement, voir
  // useOfflineGainCheck) — plafonné par les mêmes quotas AFK (durée + taux)
  // que les gains hors-ligne classiques.
  applyMineOfflineProduction: () => void;
  collectMineGems: () => void;
}
export type MineSlice = MineState & MineActions;

// ─── Anomalies : bonus passifs permanents (jamais reset au Prestige) ───────
export interface AnomalyState {
  anomalyTokens: number;
  ownedAnomalies: Anomaly[];
  anomalySlots: number; // 1 par défaut, jusqu'à ANOMALY_MAX_SLOTS (5)
}
export interface AnomalyActions {
  getAnomalyRerollCost: () => number;
  rerollAnomalies: () => void;
  toggleAnomalyLock: (id: string) => void;
  getAnomalySlotCost: () => number | null;
  buyAnomalySlot: () => void;
}
export type AnomalySlice = AnomalyState & AnomalyActions;

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
  & DailyRewardSlice
  & MetaProgressionSlice
  & AchievementSlice
  & PrestigeSlice
  & UltimateSlice
  & ExpeditionSlice
  & MineSlice
  & AnomalySlice
  & GachaDleSlice
  & {
    // Flag to temporarily suppress toasts/notifications during state restore
    suppressToasts: boolean;
    resetGame: () => void;
    // Historique de solde pour le graphe admin (voir CurrencySnapshot) —
    // ring buffer borné, alimenté uniquement au moment d'une sauvegarde
    // Firestore déjà prévue (voir son commentaire).
    currencyHistory: CurrencySnapshot[];
    recordCurrencySnapshot: () => void;
    // Combat de boss de raid en cours (voir components/pages/raid/RaidBattle.tsx) —
    // conservé en mémoire (hors partialize, pas de persistance disque/cloud) pour
    // survivre à un changement d'onglet de l'appli (RaidPage démonte/remonte
    // RaidBattle à chaque fois) sans perdre la progression déjà faite.
    raidBossFight: RaidBossFightState | null;
    setRaidBossFight: (fight: RaidBossFightState | null) => void;
  };

export interface RaidBossFightState {
  bossId: string;
  hp: BigNum;
  maxHp: BigNum;
  bossAffinity: Affinity;
  companionIds: string[];
  kills: number;
  dead: boolean;
}
