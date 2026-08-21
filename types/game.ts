import { getEditionStatMult, CardEdition } from '@/lib/game/editions';
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
  levelCap:    number;
  dpsFormMult: number; // toujours = position de la forme (1, 2, 3...), fixé par ce() — jamais un réglage par personnage
  description: string;
  requiredItemId?: string; // objet d'évolution requis (consommé) pour débloquer cette forme
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

// ── Fonctions de calcul de niveau ─────────────────────────────────────────
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.08, level - 1));
}

export function getLevelCap(character: CharacterTemplate, formIndex: number): number {
  if (!character.forms || character.forms.length === 0) return 100;
  return character.forms[formIndex]?.levelCap ?? 100 * (formIndex + 1);
}

// Coût en Pierres d'Évolution (drop d'expédition, voir lib/game/expeditions.ts
// — dropId 'pierre_evolution') : plus la rareté est haute et plus la forme
// actuelle est avancée, plus l'évolution suivante coûte cher en pierres.
export const EVOLUTION_STONE_ITEM_ID = 'pierre_evolution';
export function evoStoneCost(rarity: Rarity, currentForm: number): number {
  const rarityIdx = RARITY_ORDER_ASC.indexOf(rarity);
  return (rarityIdx + 1) * (currentForm + 1) * 3;
}

export function canEvolve(character: CharacterTemplate, owned: OwnedCharacter, inventory: Record<string, number> = {}, dropInventory: Record<string, number> = {}): boolean {
  if (!character.forms || character.forms.length === 0) return false;
  if (owned.currentForm >= character.forms.length - 1) return false;
  const nextForm = character.forms[owned.currentForm + 1];
  if (nextForm.requiredItemId && (inventory[nextForm.requiredItemId] ?? 0) < 1) return false;
  const stonesNeeded = evoStoneCost(character.rarity, owned.currentForm);
  if ((dropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0) < stonesNeeded) return false;
  return true;
}

export function canEvolveHero(forms: EvoForm[], hero: HeroState): boolean {
  if (!forms || forms.length === 0) return false;
  return hero.currentForm < forms.length - 1;
}

// ── Courbe de DPS perso (retranscrite du Google Sheet de simulation) ─────
// Excel : =ARRONDI(MAX((F$1*F$2^(E5-1)*(ARRONDI(E5/100)+1)*$B$42);(F4+1)))
//   F$1 = baseDps (rareté)     F$2 = pow (rareté, RARITY_CONFIG.dpsMultiplier)
//   E5  = niveau du perso      B42 = numéro de forme
//   F4  = DPS calculé au niveau précédent (garantit au moins +1 DPS/niveau,
//         même quand la courbe exponentielle est encore trop plate en début de jeu)
export function calcCharDps(tpl: CharacterTemplate, owned: OwnedCharacter): number {
  // Le niveau n'est plus plafonné : le numéro de forme sert de multiplicateur
  // (base = ×1, evo1 = ×2, evo2 = ×3, etc.).
  const formMult    = owned.currentForm + 1;
  const rankMult    = [1, 1.4, 1.9, 2.6, 3.5, 5.5, 9.0][Math.min(owned.rank - 1, 6)];
  const editionMult = getEditionStatMult(owned.edition); // ×1 base / ×1.2 or / ×1.5 diamant
  const pow         = RARITY_CONFIG[tpl.rarity].dpsMultiplier; // 1.024 + 0.001 par palier de rareté
  const otherMults  = formMult * rankMult * editionMult;

  const rawDpsAtLevel = (lvl: number) => {
    const tierMult = Math.round(lvl / 100) + 1; // palier tous les 100 niveaux
    return tpl.baseDps * Math.pow(pow, lvl - 1) * tierMult * otherMults;
  };

  let prevDps = Math.round(rawDpsAtLevel(1));
  for (let lvl = 2; lvl <= owned.level; lvl++) {
    const raw = rawDpsAtLevel(lvl);
    if (raw >= prevDps + 1) {
      // La courbe exponentielle dépasse désormais le palier "+1/niveau" et le
      // dépassera pour tous les niveaux suivants (croissance strictement
      // croissante) : plus besoin de repasser par le MAX, calcul direct.
      return Math.round(rawDpsAtLevel(owned.level));
    }
    prevDps = prevDps + 1; // MAX(raw, prevDps+1) avec raw < prevDps+1
  }
  return prevDps;
}

// ── Coûts de niveau ───────────────────────────────────────────────────────
// Excel : =ARRONDI(H$1*H$2^(E5-1))  —  H$1 = base (60), H$2 = pow (1.05), E5 = niveau.
// Coût identique pour toutes les raretés (ne dépend que du niveau).
export function levelUpCost(level: number): number {
  return Math.round(60 * Math.pow(1.05, level - 1));
}

export function heroLevelUpCost(level: number): number {
  // Augmenter légèrement le coût de montée du héros pour ralentir la progression
  // 200 × 1.20^(level-1)
  return Math.floor(200 * Math.pow(1.20, level - 1));
}

// ── Coût d'évolution ─────────────────────────────────────────────────────
export function evoCost(rarity: Rarity, currentForm: number): number {
  const base: Record<Rarity, number> = {
    C:50_000_000,  U:50_000_000,  R:50_000_000,  E:100_000_000,       // Commun à Épique
    L:500_000_000, M:750_000_000, S:1_000_000_000,                     // Légendaire à Stellaire
    CO:2_000_000_000,                                                // Cosmique
    P:4_000_000_000,                                                 // Primordial (entre Cosmique et Transcendant)
    T:10_000_000_000,                                                // Transcendant
  };
  return (base[rarity] ?? 0) * Math.pow(3, currentForm);
}

// ── Paliers ───────────────────────────────────────────────────────────────
export interface PalierConfig {
  id: number; name: string; universe: string; arc: string; subtitle: string;
  bgGradient: string; accentColor: string; bossTimerSeconds: number; monstersPerPalier: number;
}

export const PALIERS: PalierConfig[] = [
  { id:1,  name:'ARC SAIYEN',        universe:'Dragon Ball Z',                arc:'Arc Saiyen',                  subtitle:'Les Saiyens débarquent sur Terre',      bgGradient:'linear-gradient(180deg,#0a0f1a,#070b14)', accentColor:'#f97316', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:2,  name:'EAST BLUE',         universe:'One Piece',                    arc:'Saga East Blue',              subtitle:'La mer des rêves commence ici',          bgGradient:'linear-gradient(180deg,#041424,#030d1a)', accentColor:'#3b82f6', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:3,  name:'EXAMEN CHŪNIN',     universe:'Naruto',                       arc:'Première Partie',             subtitle:'Le ninja des feuilles grandit',          bgGradient:'linear-gradient(180deg,#0a1a08,#061004)', accentColor:'#f97316', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:4,  name:'KANTO',             universe:'Pokémon',                      arc:'Région Kanto',                subtitle:'Attrapez-les tous !',                   bgGradient:'linear-gradient(180deg,#0f0a1a,#08061a)', accentColor:'#f59e0b', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:5,  name:'PALAIS COGNITIF',   universe:'Persona 5',                    arc:'Les Voleurs Fantômes',        subtitle:'Tu vas nous le rendre',                 bgGradient:'linear-gradient(180deg,#1a0000,#0d0000)', accentColor:'#ef4444', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:6,  name:'USINE PLAYTIME',    universe:'Poppy Playtime',               arc:'Chapitre 3',                  subtitle:'Ils veulent juste jouer',               bgGradient:'linear-gradient(180deg,#001a1a,#000d0d)', accentColor:'#22d3ee', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:7,  name:'CLOVER KINGDOM',    universe:'Black Clover',                 arc:'Saga des Rois Maléfiques',    subtitle:'La magie est tout',                     bgGradient:'linear-gradient(180deg,#0a1a00,#060d00)', accentColor:'#4ade80', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:8,  name:'ZONE DANGER',       universe:'Brotato',                      arc:'Vague après vague',           subtitle:'Survive ou meurs',                      bgGradient:'linear-gradient(180deg,#1a0a00,#0d0600)', accentColor:'#fb923c', bossTimerSeconds:90,   monstersPerPalier:10 },
  { id:9,  name:'TEMPEST',           universe:'Tensei Slime',                 arc:'Nation de Tempest',           subtitle:'Rimuru veut la paix',                   bgGradient:'linear-gradient(180deg,#001a1a,#000d12)', accentColor:'#34d399', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:10, name:'OVERWORLD',         universe:'Minecraft',                    arc:'Minecraft Overworld',         subtitle:'La nuit tombe...',                      bgGradient:'linear-gradient(180deg,#0a0a00,#050500)', accentColor:'#86efac', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:11, name:'GRANDE BARRIÈRE',   universe:'Subnautica',                   arc:'Les Profondeurs',             subtitle:'4546B — Ne pas descendre',              bgGradient:'linear-gradient(180deg,#000d1a,#00060d)', accentColor:'#38bdf8', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:12, name:'SOUL SOCIETY',      universe:'Bleach',                       arc:'Arc Arrancar',                subtitle:'La société des âmes en guerre',          bgGradient:'linear-gradient(180deg,#0a0000,#050000)', accentColor:'#f87171', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:13, name:'HOLY GRAIL WAR',    universe:'Fate',                         arc:'Unlimited Blade Works',       subtitle:'Sept Servants, un Graal',               bgGradient:'linear-gradient(180deg,#0a0814,#05040a)', accentColor:'#a78bfa', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:14, name:'TWILIGHT REALM',    universe:'The Legend of Zelda',          arc:'Twilight Princess',           subtitle:'Le royaume du crépuscule',              bgGradient:'linear-gradient(180deg,#0a0a00,#060600)', accentColor:'#fbbf24', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:15, name:'REPO HOUSE',        universe:'R.E.P.O',                      arc:'The Collection',              subtitle:'Récupérez les objets... si vous pouvez', bgGradient:'linear-gradient(180deg,#080814,#04040a)', accentColor:'#818cf8', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:16, name:"HOPE'S PEAK",       universe:'Danganronpa',                  arc:'Killing Game',                subtitle:'Désespoir contre Espoir',               bgGradient:'linear-gradient(180deg,#1a0014,#0d000a)', accentColor:'#e879f9', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:17, name:'THE BIG TOP',       universe:'Digital Circus',               arc:'Saison 1',                    subtitle:'Bienvenue dans le cirque numérique',    bgGradient:'linear-gradient(180deg,#00001a,#00000d)', accentColor:'#c084fc', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:18, name:'AINCRAD',           universe:'Sword Art Online',             arc:'Alicization',                 subtitle:'La mort dans le jeu est réelle',        bgGradient:'linear-gradient(180deg,#001414,#000a0a)', accentColor:'#67e8f9', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:19, name:'YOKOHAMA',          universe:'Bungou Stray Dogs',            arc:'Arc Port Mafia',              subtitle:'Détective vs Mafia vs Guilde',          bgGradient:'linear-gradient(180deg,#14000a,#0a0005)', accentColor:'#f472b6', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:20, name:"KING'S ROW",        universe:'Overwatch',                    arc:'La Guerre des Omniums',       subtitle:'Les héros ne meurent jamais',           bgGradient:'linear-gradient(180deg,#00000a,#000005)', accentColor:'#fb923c', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:21, name:'PAVILLON DE JADE',  universe:"Les Carnets de l'Apothicaire",arc:'Le Pavillon de Jade',         subtitle:'Intrigues à la cour impériale',         bgGradient:'linear-gradient(180deg,#1a1200,#0d0900)', accentColor:'#fde68a', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:22, name:'SEC. PUBLIQUE',     universe:'Chainsaw Man',                 arc:'Secteur de la Sécurité',      subtitle:'Chasse aux démons — Tokyo',             bgGradient:'linear-gradient(180deg,#1a0000,#0d0000)', accentColor:'#f87171', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:23, name:'OP. STRIX',         universe:'Spy x Family',                 arc:'Opération Strix',             subtitle:'Mission : famille parfaite',            bgGradient:'linear-gradient(180deg,#1a0a14,#0d0509)', accentColor:'#f472b6', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:24, name:'ARC NAMEK',         universe:'Dragon Ball',                  arc:'Arc Namek',                   subtitle:'Le conflit sur Namek',                  bgGradient:'linear-gradient(180deg,#001a0a,#000d05)', accentColor:'#34d399', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:25, name:'INFINITE CASTLE',   universe:'Demon Slayer',                 arc:'Infinite Castle',             subtitle:'Le château infini de Muzan',            bgGradient:'linear-gradient(180deg,#0a0014,#050009)', accentColor:'#c084fc', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:26, name:'GREAT CATACLYSM',   universe:'Fire Force',                   arc:'The Great Cataclysm',         subtitle:'Le monde en flammes',                   bgGradient:'linear-gradient(180deg,#1a0500,#0d0200)', accentColor:'#fb923c', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:27, name:'AMESTRIS',          universe:'Fullmetal Alchemist',          arc:'Brotherhood',                 subtitle:"La philosophie de la pierre",           bgGradient:'linear-gradient(180deg,#1a1400,#0d0a00)', accentColor:'#fbbf24', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:28, name:"LA FAILLE",         universe:'League of Legends',            arc:"La Faille de l'Invocateur",   subtitle:'La Faille ne pardonne pas',             bgGradient:'linear-gradient(180deg,#000a1a,#00050d)', accentColor:'#60a5fa', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:29, name:'ALABASTA',          universe:'One Piece',                    arc:'Alabasta',                    subtitle:'Le désert et le secret du Baroque Works',bgGradient:'linear-gradient(180deg,#1a1200,#0d0900)', accentColor:'#fde68a', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:30, name:'ROYAUME DES ANIMAUX',universe:'Nos Animaux',                arc:'Le Royaume',                  subtitle:'Les gardiens du royaume',               bgGradient:'linear-gradient(180deg,#001a14,#000d09)', accentColor:'#4ade80', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:31, name:'RAGNARÖK',          universe:'Valkyrie Apocalypse',          arc:'Le Royaume des Dieux',        subtitle:'Humains contre Dieux',                  bgGradient:'linear-gradient(180deg,#0a0014,#05000a)', accentColor:'#a78bfa', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:32, name:'HALLOWNEST',        universe:'Hollow Knight',                arc:"Le Royaume d'Hallownest",     subtitle:'Les profondeurs du royaume oublié',     bgGradient:'linear-gradient(180deg,#000a14,#00050a)', accentColor:'#38bdf8', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:33, name:"L'ÎLE DE PARADIS",  universe:'Attaque des Titans',           arc:"L'Île de Paradis",            subtitle:'Les Titans en marche',                  bgGradient:'linear-gradient(180deg,#0a0a0a,#050505)', accentColor:'#9ca3af', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:34, name:'PAYS DES DÉLICES',  universe:'Cuphead',                      arc:'Le Pays des Délices',         subtitle:'Une dette envers le Diable',            bgGradient:'linear-gradient(180deg,#1a0a00,#0d0500)', accentColor:'#fb923c', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:35, name:'LE SAINT GRAAL II', universe:'Fate',                         arc:'Le Saint Graal',              subtitle:'Une nouvelle guerre commence',          bgGradient:'linear-gradient(180deg,#1a0814,#0d040a)', accentColor:'#e879f9', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:36, name:"FAZBEAR'S PIZZA",   universe:"Five Nights At Freddy's",      arc:"Freddy's Fazbear Pizza",      subtitle:'Ne les laisse pas entrer',              bgGradient:'linear-gradient(180deg,#0a0500,#050200)', accentColor:'#fbbf24', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:37, name:'TOURNOI DU ROI',    universe:'Tekken',                       arc:'Le Tournoi du Roi du Poing',  subtitle:'Le sang Mishima coule',                 bgGradient:'linear-gradient(180deg,#1a0000,#0d0000)', accentColor:'#f87171', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:38, name:'MONDE SOUTERRAIN',  universe:'Undertale',                    arc:'Le Monde Souterrain',         subtitle:'Determination.',                        bgGradient:'linear-gradient(180deg,#00081a,#00040d)', accentColor:'#60a5fa', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:39, name:'RÉGION DE JOHTO',   universe:'Pokémon',                      arc:'Johto',                       subtitle:'Un nouveau voyage commence',            bgGradient:'linear-gradient(180deg,#1a0a00,#0d0500)', accentColor:'#fb923c', bossTimerSeconds:90,  monstersPerPalier:10 },
  { id:40, name:"L'ENTRE-TERRE",     universe:'Elden Ring',                   arc:"Le Royaume de l'Entre-Terre", subtitle:'Que la grâce guide tes pas',            bgGradient:'linear-gradient(180deg,#0a0a00,#050500)', accentColor:'#fde68a', bossTimerSeconds:90,  monstersPerPalier:10 },
];

// Au-delà du dernier palier défini, on cycle sur les mondes précédents (le
// thème/décor se répète) — seules les STATS des mobs continuent de monter
// avec le vrai palier (voir generateEnemy dans lib/game/enemies.ts).
export function getPalierConfig(p: number): PalierConfig {
  const cycled = ((p - 1) % PALIERS.length) + 1;
  return PALIERS[cycled - 1];
}

export interface Enemy {
  id: string; name: string; wave: number; palier: number;
  maxHp: number; currentHp: number; spritePath: string;
  pixelCoinsReward: number; gemsReward: number; isBoss: boolean;
}

export interface GameState {
  pixelCoins: number; nekoGems: number; totalClicks: number;
  totalKills: number; totalQuestsCompleted: number; totalUpgradesPerformed: number; totalGachaPulls: number; totalBossKills: number; totalGemsSpent: number;
  wave: number; palier: number; maxPalierReached: number;
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