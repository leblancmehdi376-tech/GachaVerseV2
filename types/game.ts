import type { CardEdition } from '@/lib/game/editions';
export type { CardEdition };

// ── Rareté — ordre de puissance : C < U < R < E < L < M < S < CO < P < T
export type Rarity = 'C' | 'U' | 'R' | 'E' | 'L' | 'M' | 'S' | 'CO' | 'P' | 'T';

export type EquipmentSlot = 'helmet' | 'chest' | 'pants' | 'boots' | 'weapon';
export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['helmet', 'chest', 'pants', 'boots', 'weapon'];
export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  helmet: 'Casque', chest: 'Plastron', pants: 'Pantalon', boots: 'Bottes', weapon: 'Arme',
};

export interface EquippedItems {
  helmet: string | null;
  chest:  string | null;
  pants:  string | null;
  boots:  string | null;
  weapon: string | null;
}

export function defaultEquippedItems(): EquippedItems {
  return { helmet: null, chest: null, pants: null, boots: null, weapon: null };
}

export const RARITY_CONFIG: Record<Rarity, {
  label: string; color: string; glow: string; dpsMultiplier: number;
}> = {
  // dpsMultiplier = base de croissance par niveau (Math.pow(base, level-1) dans calcCharDps),
  // pas un multiplicateur plat : 1.024 + 0.001 par palier de rareté.
  C:  { label:'Commun',      color:'#9ca3af', glow:'#9ca3af', dpsMultiplier:1.024, },
  U:  { label:'Uncommun',    color:'#86efac', glow:'#22c55e', dpsMultiplier:1.025, },
  R:  { label:'Rare',        color:'#60a5fa', glow:'#3b82f6', dpsMultiplier:1.026, },
  E:  { label:'Épique',      color:'#c084fc', glow:'#a855f7', dpsMultiplier:1.027, },
  L:  { label:'Légendaire',  color:'#fbbf24', glow:'#f59e0b', dpsMultiplier:1.028, },
  M:  { label:'Mythique',    color:'#f87171', glow:'#ef4444', dpsMultiplier:1.029, },
  S:  { label:'Stellaire',   color:'#ffffff', glow:'#fbbf24', dpsMultiplier:1.030, },
  CO: { label:'Cosmique',    color:'#34d399', glow:'#10b981', dpsMultiplier:1.031, },
  P:  { label:'Primordial',  color:'#ff6b35', glow:'#ff4500', dpsMultiplier:1.032, },
  T:  { label:'Transcendant',color:'#e879f9', glow:'#d946ef', dpsMultiplier:1.033, },
};

// Ordre croissant C→T, dérivé de RARITY_CONFIG (déjà ordonné dans ce sens).
export const RARITY_ORDER_ASC = Object.keys(RARITY_CONFIG) as Rarity[];

export function getNextRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER_ASC.indexOf(r);
  return i >= 0 && i < RARITY_ORDER_ASC.length - 1 ? RARITY_ORDER_ASC[i + 1] : null;
}

export function getPrevRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER_ASC.indexOf(r);
  return i > 0 ? RARITY_ORDER_ASC[i - 1] : null;
}

// ── Forme d'évolution d'un personnage ─────────────────────────────────────
export interface EvoForm {
  formId:      string;
  name:        string;
  spritePath:  string;
  dpsFormMult: number; // toujours = position de la forme (1, 2, 3...), fixé par ce() — jamais un réglage par personnage
  description: string;
  // Objets d'évolution requis (consommés, 1 exemplaire chacun) pour débloquer
  // cette forme — cumulatif d'un perso de boss d'événement à l'autre : la
  // forme N requiert les N premiers objets d'évolution du perso (voir ce()
  // dans lib/game/characters.ts, qui construit ces listes automatiquement).
  requiredItemIds?: string[];
}

// ── Template personnage ───────────────────────────────────────────────────
export interface CharacterTemplate {
  id:          string;
  name:        string;
  rarity:      Rarity;
  baseDps:     number;
  spritePath:  string;
  description: string;
  universe?:   string;
  forms?:      EvoForm[];
  isHero?:     boolean;
  // Perso de boss d'événement : les objets d'évolution dédiés (requiredItemIds,
  // achetés en Boutique avec les pièces du boss) suffisent seuls à faire évoluer —
  // pas besoin de farmer des Pierres d'Évolution en plus.
  noEvoStones?: boolean;
}

// ── Personnage possédé ────────────────────────────────────────────────────
export interface OwnedCharacter {
  templateId:  string;
  rank:        number;
  copies:      number;
  level:       number;
  currentForm: number;
  xp:          number;
  equippedItems?: EquippedItems;
  edition?:    CardEdition; // tirée une seule fois, à l'obtention (absent = 'base')
}

// ── Héros principal ───────────────────────────────────────────────────────
export interface HeroState {
  level:       number;
  currentForm: number;
  xp:          number;
}

// Id d'inventaire des Pierres d'Évolution (drop d'expédition, voir
// lib/game/expeditions.ts — dropId 'pierre_evolution'). Coût et logique
// d'éligibilité : evoStoneCost()/canEvolve() dans lib/game/formulas.ts.
export const EVOLUTION_STONE_ITEM_ID = 'pierre_evolution';

export interface Enemy {
  id: string; name: string; wave: number; palier: number;
  maxHp: number; currentHp: number; spritePath: string;
  pixelCoinsReward: number; gemsReward: number; isBoss: boolean;
}

export interface GameState {
  pixelCoins: number; nekoGems: number; totalClicks: number;
  totalKills: number; totalQuestsCompleted: number; totalUpgradesPerformed: number; totalGachaPulls: number; totalBossKills: number; totalGemsSpent: number;
  // Cumuls à vie (jamais décrémentés, contrairement au solde dépensable) —
  // utilisés par les succès "au total"/"accumule X" (crowns_50, orbs_30).
  totalBossCrownsEarned: number; totalVoidOrbsEarned: number;
  wave: number; palier: number; maxPalierReached: number;
  // Palier max atteint DEPUIS LE DERNIER PRESTIGE (contrairement à
  // maxPalierReached, qui ne redescend jamais et sert de référence pour le
  // classement). Détermine l'éligibilité au prochain prestige, la portée du
  // voyage/farm, et le nombre de jetons gagnés. `null` = jamais divergé de
  // maxPalierReached (sauvegarde jamais prestige ou antérieure à ce champ) —
  // voir runPeakPalierOf() dans gameStore.ts pour le fallback.
  runPeakPalier: number | null;
  currentEnemy: Enemy;
  equippedTeam: (string | null)[];
  goldUpgradeLevel: number;
  collection: Record<string, OwnedCharacter>;
  hero: HeroState;
  bossActive: boolean; bossTimeLeft: number; lastSaved: number;
  bossAvoided: boolean;
  ultUsedThisFight: string[];
  username: string;
  equipmentInventory: Record<string, number>;
  championInventory:  Record<string, number>; // doublons 7★ en attente
  lastEquipmentDrop: string | null;
  unlockedEquipDropRarities: Rarity[];
}