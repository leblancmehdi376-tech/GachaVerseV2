// lib/game/expeditions.ts

import { Rarity, RARITY_CONFIG, OwnedCharacter } from '@/types/game';
import { getPalierConfig } from '@/lib/game/paliers';
import { calcCharDps } from '@/lib/game/formulas';
import { EQUIP_RARITY_MIN_PALIER } from '@/lib/game/items';
import { RARITY_GATES } from '@/lib/game/gacha';
import { getPalierBossHp } from '@/lib/game/enemies';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { makeInstanceKey } from '@/lib/game/editions';
import { type BigNum, BN_ZERO, bnAdd, bnLog10, bnMax, bnToNumber } from '@/lib/game/bignum';

// ── Seuil de DPS d'équipe requis par expédition ───────────────────────────
// Le seuil n'est plus un poids de rareté arbitraire (RARITY_SCORE) mais un
// DPS réel, calibré sur la rareté du personnage que l'expédition sert à
// obtenir/faire évoluer (ses matériaux de forge, ou la rareté d'équipement
// débloquée) : "seuil = DPS nécessaire pour tuer le boss du palier où cette
// rareté se débloque, dans son temps imparti" — un repère 100% dérivé des
// courbes de combat existantes, jamais un nombre inventé.
// Bornée par le palier de déblocage (max 19, cf. RARITY_GATES) — jamais assez
// grand pour approcher les limites de précision d'un double, donc un simple
// `number` suffit ici même si getPalierBossHp retourne un BigNum.
function referenceTeamDps(rarity: Rarity): number {
  const palier = RARITY_GATES[rarity].unlockPalier;
  return bnToNumber(getPalierBossHp(palier)) / getPalierConfig(palier).bossTimerSeconds;
}

// Rareté "typique" débloquée à un palier donné (fallback pour les
// expéditions sans cible de craft précise, ex: farming générique).
const RARITY_BY_UNLOCK_PALIER: Rarity[] = (Object.keys(RARITY_GATES) as Rarity[])
  .sort((a, b) => RARITY_GATES[a].unlockPalier - RARITY_GATES[b].unlockPalier);
function rarityForPalier(palier: number): Rarity {
  let result: Rarity = 'C';
  for (const r of RARITY_BY_UNLOCK_PALIER) {
    if (RARITY_GATES[r].unlockPalier <= palier) result = r;
  }
  return result;
}

// DPS d'un personnage (par id de template pur, toutes éditions confondues)
// pour le calcul de score d'expédition : prend la meilleure édition possédée,
// puisque les expéditions ne distinguent pas Base/Or/Diamant.
export function getCharacterExpeditionDps(collection: Record<string, OwnedCharacter>, templateId: string): BigNum {
  const tpl = CHARACTER_POOL.find(c => c.id === templateId);
  if (!tpl) return BN_ZERO;
  let best = BN_ZERO;
  for (const ed of ['base', 'gold', 'diamond'] as const) {
    const owned = collection[makeInstanceKey(templateId, ed)];
    if (owned) best = bnMax(best, calcCharDps(tpl, owned));
  }
  return best;
}

export function getExpeditionTeamDps(collection: Record<string, OwnedCharacter>, characterIds: string[]): BigNum {
  return characterIds.reduce((sum, cid) => bnAdd(sum, getCharacterExpeditionDps(collection, cid)), BN_ZERO);
}

// ── Exigence d'univers ─────────────────────────────────────────────────────
// Le champ `universe` d'une expédition sert de thème d'affichage, mais aussi
// désormais de condition pour l'envoyer : toute l'équipe doit appartenir à ce
// même univers. Certaines expéditions ont un "univers" purement organisationnel
// (Atelier, Chasse, Mystique...) qui ne correspond à AUCUN personnage réel —
// pour celles-là, l'exigence bascule sur un TYPE (affinité) tiré au hasard par
// expédition, voir defAffinity dans expeditionStore.ts.
const REAL_CHARACTER_UNIVERSES: Set<string> = new Set(CHARACTER_POOL.map(c => c.universe).filter((u): u is string => !!u));

export function hasRealUniverse(def: ExpeditionDef): boolean {
  return REAL_CHARACTER_UNIVERSES.has(def.universe);
}

// ── Drops spéciaux par palier ────────────────────────────────────────────
export interface PalierDrop {
  id:          string;
  name:        string;
  icon:        string;
  description: string;
  palier:      number;   // palier source
  universName: string;
}

export const PALIER_DROPS: PalierDrop[] = [
  { id:'saiyen_power',   name:'Puissance Saiyen',       icon:'🔥', description:'Émane des guerriers Saiyen les plus puissants.',             palier:1,  universName:'Dragon Ball Z'        },
  { id:'ore_kame',       name:'Pierre de Kame',         icon:'🐢', description:'Fragment de la magie du Dieu de la Destruction.',            palier:1,  universName:'Dragon Ball Z'        },
  { id:'sea_fragment',   name:'Fragment Océanique',     icon:'🌊', description:'Écume des mers d\'East Blue.',                               palier:2,  universName:'One Piece'            },
  { id:'fruit_demon',    name:'Fruit du Démon',         icon:'🍈', description:'Fruit maudit conférant un pouvoir surnaturel... au prix de savoir nager.', palier:2, universName:'One Piece' },
  { id:'potala',         name:'Boucle Potara',          icon:'💫', description:'Boucle d\'oreille sacrée permettant la fusion Potara.',      palier:24, universName:'Dragon Ball Z'        },
  { id:'hogyoku',        name:'Fragment d\'Hogyoku',    icon:'💠', description:'Éclat de la sphère d\'Aizen qui transcende les limites.',    palier:12, universName:'Bleach'               },
  { id:'zanpakuto',      name:'Zanpakuto',              icon:'⚔️', description:'Lame vivante scellant le pouvoir d\'un Shinigami.',          palier:12, universName:'Bleach'               },
  { id:'ore_soleil',     name:'Minerai du Soleil',      icon:'☀',  description:'Métal forgé dans le soleil, seul capable de tuer un démon.', palier:25, universName:'Demon Slayer'         },
  { id:'manche_sabre',   name:'Manche de Sabre Nichirin', icon:'🗡️', description:'Poignée forgée pour recevoir une lame Nichirin.',          palier:25, universName:'Demon Slayer'         },
  { id:'bijou_divin',    name:'Bijou Divin',            icon:'⚡', description:'Artefact des dieux de Ragnarök.',                            palier:31, universName:'Valkyrie Apocalypse'  },
  { id:'ame_humaine',    name:'Âme Humaine',            icon:'❤',  description:'L\'une des 7 âmes humaines du monde souterrain.',           palier:38, universName:'Undertale'            },
  { id:'duplication_shards', name:'Éclat de Duplication', icon:'🔮', description:'Permet de dupliquer un objet ou une essence.',           palier:9,  universName:'Tensei Slime'         },
  { id:'pierre_evolution', name:'Pierre d\'Évolution',  icon:'🔷', description:'Catalyseur mystique nécessaire pour faire évoluer un personnage vers sa forme suivante.', palier:3, universName:'Mystique' },
];

export function getPalierDrop(id: string): PalierDrop | undefined {
  return PALIER_DROPS.find(d => d.id === id);
}

// ── Recettes de forge ────────────────────────────────────────────────────
export interface CraftIngredient {
  type:       'drop' | 'champion_dupe';
  id:         string;           // dropId ou characterId
  quantity:   number;
  label:      string;           // nom affiché
}

export interface CraftRecipe {
  id:           string;
  name:         string;
  icon:         string;
  description:  string;
  ingredients:  CraftIngredient[];
  reward: {
    type:       'character' | 'gems' | 'coins';
    characterId?: string;
    rarity?:    Rarity;
    amount?:    number;
    label:      string;
    icon:       string;
  };
  palierRequired: number;
  lore:         string;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  // ── Dragon Ball ─────────────────────────────────────────────────────────
  {
    id: 'vegeto',
    name: 'Fusion Potara : Végéto',
    icon: '💫',
    description: 'Fusionne Goku et Végéta à l\'aide des Boucles Potara en un être d\'une puissance absolue.',
    lore: '"La fusion Potara est permanente... sauf à l\'intérieur d\'un Super Buu." — Végéto',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'potala',  quantity:65, label:'Boucle Potara × 65'   },
      { type:'drop', id:'ore_kame', quantity:25, label:'Pierre de Kame × 25' },
    ],
    reward: { type:'character', characterId:'vegeto', rarity:'P', label:'Végéto', icon:'💫' },
  },
  {
    id: 'gogeta',
    name: 'Fusion EX : Gogeta',
    icon: '⚡',
    description: 'Fusion dansée parfaite entre Goku et Végéta. Plus puissant et stable que la Fusion Potara.',
    lore: '"Ceci s\'appelle... Gogeta !" — Gogeta SS Blue',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'saiyen_power', quantity:65, label:'Puissance Saiyen × 65' },
      { type:'drop', id:'ore_kame',     quantity:25, label:'Pierre de Kame × 25'   },
    ],
    reward: { type:'character', characterId:'gogeta', rarity:'P', label:'Gogeta', icon:'⚡' },
  },
  // ── Bleach ───────────────────────────────────────────────────────────────
  {
    id: 'aizen_transcendant',
    name: 'Aizen Transcendant',
    icon: '💠',
    description: 'Aizen fusionné avec l\'Hogyoku à son niveau ultime, transcendant Shinigami et Hollow.',
    lore: '"Je ne suis ni Shinigami, ni Hollow. Je suis au-delà de toute chose." — Aizen',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'hogyoku',   quantity:65, label:'Fragment d\'Hogyoku × 65' },
      { type:'drop', id:'zanpakuto', quantity:1,  label:'Zanpakuto × 1'            },
    ],
    reward: { type:'character', characterId:'aizen_t', rarity:'P', label:'Aizen Transcendant', icon:'💠' },
  },
  // ── Demon Slayer ─────────────────────────────────────────────────────────
  {
    id: 'yoriichi',
    name: 'Yoriichi Tsugikuni',
    icon: '🌅',
    description: 'Le chasseur de démons originel, inventeur des Formes de Respiration. Jamais égalé.',
    lore: '"Je suis né avec la Marque de la Mort... et une seule technique." — Yoriichi',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'ore_soleil',   quantity:65, label:'Minerai du Soleil × 65'          },
      { type:'drop', id:'manche_sabre', quantity:1,  label:'Manche de Sabre Nichirin × 1'    },
    ],
    reward: { type:'character', characterId:'yoriichi', rarity:'P', label:'Yoriichi Tsugikuni', icon:'🌅' },
  },
  // ── Valkyrie Apocalypse ──────────────────────────────────────────────────
  {
    id: 'brunhilde',
    name: 'Brunhilde',
    icon: '🛡',
    description: 'La Valkyrie à l\'origine du Ragnarök. Sa volonté est de sauver l\'humanité coûte que coûte.',
    lore: '"Je ne me battrai jamais moi-même. Mais je serai leur force." — Brunhilde',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'bijou_divin', quantity:85, label:'Bijou Divin × 85' },
    ],
    reward: { type:'character', characterId:'brunhilde', rarity:'CO', label:'Brunhilde', icon:'🛡' },
  },
  // ── Undertale ────────────────────────────────────────────────────────────
  {
    id: 'chara',
    name: 'Chara',
    icon: '🔪',
    description: 'L\'enfant qui tomba sous-terre en premier. Sa présence seule change l\'issue du voyage.',
    lore: '"Ce n\'était pas moi. C\'était toi." — Chara',
    palierRequired: RARITY_GATES.P.unlockPalier,
    ingredients: [
      { type:'drop', id:'ame_humaine', quantity:85, label:'Âme Humaine × 85' },
    ],
    reward: { type:'character', characterId:'chara', rarity:'P', label:'Chara', icon:'🔪' },
  },
  // ── Elden Ring ───────────────────────────────────────────────────────────
  {
    id: 'shanks',
    name: 'Shanks le Roux — Empereure des Mers',
    icon: '⚔',
    description: 'Invoque le plus puissant des Quatre Empereurs, dont le Haki du Conquérant peut arrêter Kaido lui-même.',
    lore: '"Je parie sur la nouvelle génération." — Shanks le Roux',
    palierRequired: RARITY_GATES.T.unlockPalier,
    ingredients: [
      { type:'drop', id:'sea_fragment', quantity:100, label:'Fragment Océanique × 100' },
      { type:'drop', id:'fruit_demon',  quantity:1,  label:'Fruit du Démon × 1'      },
    ],
    reward: { type:'character', characterId:'shanks', rarity:'T', label:'Shanks le Roux', icon:'⚔' },
  },
  // ── Récompense bonus ────────────────────────────────────────────────────
  {
    id: 'gem_bundle',
    name: 'Invocation Divine',
    icon: '🌟',
    description: 'Convertis des fragments interdimensionnels en pierres d\'invocation.',
    lore: 'Les voyageurs entre dimensions collectent bien des choses...',
    palierRequired: 5,
    ingredients: [
      { type:'drop', id:'duplication_shards', quantity:10, label:'Éclat de Duplication × 10' },
    ],
    reward: { type:'gems', amount:50, label:'+50 Neko-Gemmes', icon:'💎' },
  },
];

// ── Définitions des expéditions ──────────────────────────────────────────
export interface ExpeditionDef {
  id:             string;
  name:           string;
  icon:           string;
  description:    string;
  universe:       string;
  duration:       number;      // en secondes
  slots:          number;      // nb persos (1-4)
  palierRequired: number;
  minTeamDps:     number;      // DPS d'équipe requis (voir referenceTeamDps)
  rewards: {
    coinsMin:     number;
    coinsMax:     number;
    gemsMin?:     number;
    gemsMax?:     number;
    dropId?:      string;     // drop spécial possible (item), voir dropGems pour une variante en gemmes
    dropChance?:  number;     // 0-1
    dropQuantity?: number;
    dropQuantityCap?: number; // plafond du bonus de quantité (sinon illimité)
    dropGems?:      boolean; // si vrai, chaque tentative de drop réussie (même mécanique que dropId : dropChance/dropQuantity/dropQuantityCap/computeDropAttempts) donne des gemmes au lieu d'un item
    dropGemsAmount?: number; // gemmes accordées par tentative de drop réussie quand dropGems est vrai (défaut 1)
  };
  isFarming?:     boolean;    // expédition de retour-palier
  farmingPalier?: number;
  unlocksEquipRarity?: Rarity;     // débloque la fusion d'équipement vers cette rareté au claim
  unlocksEquipDropRarity?: Rarity; // débloque le drop en combat de cette rareté au claim
  isSpecialItem?: boolean;    // onglet "Objets spéciaux" (ex: pierres d'évolution)
}

const H = 3600;
const H30 = 3.5 * H; // 3h30 — durée commune à la plupart des expéditions de farm (voir rework ci-dessous)

// ── Ateliers de déblocage d'équipement (générées par rareté) ──────────────
const EQUIP_UNLOCK_TIER_ORDER: Rarity[] = ['U','R','E','L','M','S','CO','P','T'];

const EQUIP_UNLOCK_DURATION: Record<string, number> = {
  U: 15*60,   R: 30*60,   E: 1*H,     L: 1.5*H,   M: 2.5*H,
  S: 4.5*H,   CO: 7.5*H,  P: 13*H,    T: 24*H,
};
const EQUIP_UNLOCK_SLOTS: Record<string, number> = {
  U:1, R:1, E:1, L:2, M:2, S:2, CO:3, P:3, T:4,
};
const EQUIP_UNLOCK_REWARDS: Record<string, ExpeditionDef['rewards']> = {
  U:  { coinsMin:20_000,    coinsMax:60_000,     gemsMin:1,  gemsMax:2  },
  R:  { coinsMin:60_000,    coinsMax:150_000,    gemsMin:1,  gemsMax:3  },
  E:  { coinsMin:150_000,   coinsMax:400_000,    gemsMin:2,  gemsMax:5  },
  L:  { coinsMin:300_000,   coinsMax:800_000,    gemsMin:3,  gemsMax:8  },
  M:  { coinsMin:600_000,   coinsMax:1_500_000,  gemsMin:5,  gemsMax:12 },
  S:  { coinsMin:1_200_000, coinsMax:3_000_000,  gemsMin:8,  gemsMax:20 },
  CO: { coinsMin:2_500_000, coinsMax:6_000_000,  gemsMin:12, gemsMax:30 },
  P:  { coinsMin:5_000_000, coinsMax:12_000_000, gemsMin:20, gemsMax:50 },
  T:  { coinsMin:10_000_000,coinsMax:25_000_000, gemsMin:30, gemsMax:80 },
};

const EQUIP_UNLOCK_EXPEDITIONS: ExpeditionDef[] = EQUIP_UNLOCK_TIER_ORDER.map(r => ({
  id: `equip_unlock_${r}`,
  name: `Atelier — Rareté ${RARITY_CONFIG[r].label}`,
  icon: '🛠️',
  description: `Débloque la fusion d'équipement vers la rareté ${RARITY_CONFIG[r].label}.`,
  universe: 'Atelier',
  duration: EQUIP_UNLOCK_DURATION[r],
  slots: EQUIP_UNLOCK_SLOTS[r],
  palierRequired: EQUIP_RARITY_MIN_PALIER[r],
  minTeamDps: referenceTeamDps(r),
  rewards: EQUIP_UNLOCK_REWARDS[r],
  unlocksEquipRarity: r,
}));

// ── Chasses — déblocage du DROP d'équipement en combat (par rareté) ───────
// Même barème (durée/slots/récompenses) que les ateliers de fusion, mais
// débloque cette fois le droit d'obtenir la rareté en drop de combat
// (getEquipmentDrop dans lib/game/items.ts) plutôt que la fusion.
const EQUIP_DROP_UNLOCK_EXPEDITIONS: ExpeditionDef[] = EQUIP_UNLOCK_TIER_ORDER.map(r => ({
  id: `equip_drop_unlock_${r}`,
  name: `Chasse — Rareté ${RARITY_CONFIG[r].label}`,
  icon: '🏹',
  description: `Débloque le drop en combat d'équipement de rareté ${RARITY_CONFIG[r].label}.`,
  universe: 'Chasse',
  duration: EQUIP_UNLOCK_DURATION[r],
  slots: EQUIP_UNLOCK_SLOTS[r],
  palierRequired: EQUIP_RARITY_MIN_PALIER[r],
  minTeamDps: referenceTeamDps(r),
  rewards: EQUIP_UNLOCK_REWARDS[r],
  unlocksEquipDropRarity: r,
}));

export const EXPEDITION_DEFS: ExpeditionDef[] = [
  // ── Courtes (2-5h) ──────────────────────────────────────────────────────
  {
    id:'cave_cristal', name:'Caverne de Cristal', icon:'💎', universe:'Subnautica',
    description:'Explore les cavernes sous-marines à la recherche de ressources.',
    duration: 2*H, slots:1, palierRequired:1, minTeamDps: referenceTeamDps(rarityForPalier(1)),
    // Seule expédition (avec les Mines de Gemme) à donner des gemmes via
    // dropGems plutôt qu'un gain garanti — comme les autres, elle bénéficie
    // désormais de tentatives supplémentaires à haut DPS (computeDropAttempts).
    rewards:{ coinsMin:50_000, coinsMax:150_000, dropChance:0.5, dropQuantity:1, dropQuantityCap:5, dropGems:true, dropGemsAmount:2 },
  },
  {
    id:'foret_kame', name:'Forêt de la Tortue', icon:'🐢', universe:'Dragon Ball Z',
    description:'Cherche les pierres secrètes cachées par Maître Roshi.',
    duration: H30, slots:1, palierRequired:1, minTeamDps: referenceTeamDps('P'),
    rewards:{ coinsMin:80_000, coinsMax:200_000, dropId:'ore_kame', dropChance:0.6, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'entrainement_saiyen', name:'Entraînement Intensif — Capsule Corp', icon:'🔥', universe:'Dragon Ball Z',
    description:'Repousse tes limites dans la chambre de gravité pour éveiller ta puissance Saiyenne.',
    duration: H30, slots:1, palierRequired:1, minTeamDps: referenceTeamDps('P'),
    rewards:{ coinsMin:80_000, coinsMax:200_000, dropId:'saiyen_power', dropChance:0.6, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'sanctuaire_evolution', name:'Sanctuaire des Pierres', icon:'🔷', universe:'Mystique',
    description:'Explore un sanctuaire oublié où se forment les catalyseurs d\'évolution.',
    duration: 2*H, slots:2, palierRequired:3, minTeamDps: referenceTeamDps('R'),
    isSpecialItem: true,
    rewards:{ coinsMin:100_000, coinsMax:250_000, gemsMin:1, gemsMax:3, dropId:'pierre_evolution', dropChance:1, dropQuantity:1, dropQuantityCap:25 },
  },
  {
    id:'patrol_easblue', name:'Patrouille East Blue', icon:'🌊', universe:'One Piece',
    description:'Croise les mers d\'East Blue pour récupérer du butin.',
    duration: 5*H, slots:2, palierRequired:2, minTeamDps: referenceTeamDps('T'),
    rewards:{ coinsMin:150_000, coinsMax:400_000, gemsMin:2, gemsMax:5, dropId:'sea_fragment', dropChance:0.5, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'ile_fruit_demon', name:'Île Mystérieuse aux Fruits', icon:'🍈', universe:'One Piece',
    description:'Une île qui n\'apparaît qu\'une fois par génération, dit-on, chargée de fruits maudits.',
    duration: 48*H, slots:2, palierRequired:2, minTeamDps: referenceTeamDps('T'),
    rewards:{ coinsMin:200_000, coinsMax:500_000, gemsMin:2, gemsMax:6, dropId:'fruit_demon', dropChance:0.12, dropQuantity:1, dropQuantityCap:1 },
  },
  // ── Mine de Gemmes — pas de contrainte de personnage, contrainte de type ──
  // universe:'Mine' ne correspond à aucun univers de CHARACTER_POOL : voir
  // hasRealUniverse() plus haut, la contrainte bascule automatiquement sur un
  // TYPE (affinité) tiré au hasard, sans restreindre quels personnages du bon
  // type peuvent être envoyés. Répétable à l'infini (comme toute expédition,
  // seul le cooldown `duration` limite la cadence). dropGems:true fait que la
  // récompense en gemmes suit exactement la mécanique de drop d'objets
  // (dropChance/dropQuantity/computeDropAttempts) au lieu d'un gain garanti :
  // pas de dropQuantityCap ⇒ le nombre de tentatives grandit avec le DPS
  // d'équipe sans plafond ("tentatives de drop infinies").
  {
    id:'mine_gemme', name:'Mine de Gemme', icon:'⛏️', universe:'Mine',
    description:'Explore la mine de gemmes, et envoie tes compagnons te ramener le plus beau trésor possible.',
    duration: 15*60, slots:1, palierRequired:1, minTeamDps: referenceTeamDps(rarityForPalier(1)),
    rewards:{ coinsMin:6_000, coinsMax:18_000, dropChance:0.5, dropQuantity:1, dropGems:true, dropGemsAmount:1 },
  },
  {
    id:'mine_gemme_profonde', name:'Mine de Gemme Profonde', icon:'🪨', universe:'Mine',
    description:'Descends plus profondément dans la mine de gemmes, et envoie tes compagnons te ramener le plus beau trésor possible.',
    duration: H, slots:2, palierRequired:2, minTeamDps: referenceTeamDps(rarityForPalier(2)),
    rewards:{ coinsMin:25_000, coinsMax:75_000, dropChance:0.5, dropQuantity:1, dropGems:true, dropGemsAmount:2 },
  },
  {
    id:'mine_gemme_abyssale', name:'Mine de Gemme Abyssale', icon:'💎', universe:'Mine',
    description:'Plonge au cœur des abysses de la mine de gemmes, et envoie tes compagnons te ramener le plus beau trésor possible.',
    duration: 8*H, slots:2, palierRequired:9, minTeamDps: referenceTeamDps(rarityForPalier(9)),
    rewards:{ coinsMin:200_000, coinsMax:600_000, dropChance:0.5, dropQuantity:1, dropGems:true, dropGemsAmount:4 },
  },
  // ── Moyennes (6-12h) ────────────────────────────────────────────────────
  {
    id:'esplanade_tempest', name:'Esplanade de Tempest', icon:'🔮', universe:'Tensei Slime',
    description:'Sillonne les plaines de Tempest pour récolter des fragments magiques.',
    duration: 8*H, slots:2, palierRequired:9, minTeamDps: referenceTeamDps(rarityForPalier(9)),
    rewards:{ coinsMin:600_000, coinsMax:1_500_000, gemsMin:5, gemsMax:14, dropId:'duplication_shards', dropChance:0.65, dropQuantity:3 },
  },
  // ── Longues (12-24h) ────────────────────────────────────────────────────
  {
    id:'farm_namek', name:'Retour sur Namek', icon:'💫', universe:'Dragon Ball Z',
    description:'Retourne sur la planète Namek pour récolter les légendaires Boucles Potara.',
    duration: H30, slots:3, palierRequired:24, minTeamDps: referenceTeamDps('P'),
    isFarming:true, farmingPalier:24,
    rewards:{ coinsMin:1_000_000, coinsMax:3_000_000, gemsMin:8, gemsMax:20, dropId:'potala', dropChance:0.7, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'farm_bleach', name:'Soul Society — Secteur 1', icon:'💠', universe:'Bleach',
    description:'Infiltre Soul Society pour récupérer des fragments de l\'Hogyoku d\'Aizen.',
    duration: H30, slots:3, palierRequired:12, minTeamDps: referenceTeamDps('P'),
    isFarming:true, farmingPalier:12,
    rewards:{ coinsMin:1_200_000, coinsMax:3_500_000, gemsMin:10, gemsMax:22, dropId:'hogyoku', dropChance:0.65, dropQuantity:1, dropQuantityCap:1 },
  },
  {
    id:'chasse_zanpakuto', name:'Chasse au Zanpakuto Perdu', icon:'⚔️', universe:'Bleach',
    description:'Traque les lames abandonnées dans les ruines du Seireitei — rares et jalousement gardées.',
    duration: 24*H, slots:3, palierRequired:12, minTeamDps: referenceTeamDps('P'),
    rewards:{ coinsMin:1_200_000, coinsMax:3_500_000, gemsMin:10, gemsMax:22, dropId:'zanpakuto', dropChance:0.15, dropQuantity:1, dropQuantityCap:1 },
  },
  {
    id:'farm_demonslayer', name:'Montagne Wisteria', icon:'☀', universe:'Demon Slayer',
    description:'Escalade la montagne sacrée pour forger du minerai sous la lumière du soleil.',
    duration: H30, slots:3, palierRequired:25, minTeamDps: referenceTeamDps('P'),
    isFarming:true, farmingPalier:25,
    rewards:{ coinsMin:2_000_000, coinsMax:5_000_000, gemsMin:12, gemsMax:28, dropId:'ore_soleil', dropChance:0.6, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'forge_nichirin', name:'Forge du Sabre Nichirin', icon:'🗡️', universe:'Demon Slayer',
    description:'Assiste le forgeron Haganezuka dans la création d\'une lame Nichirin — un échec sur mille réussit.',
    duration: 24*H, slots:3, palierRequired:25, minTeamDps: referenceTeamDps('P'),
    rewards:{ coinsMin:2_000_000, coinsMax:5_000_000, gemsMin:12, gemsMax:28, dropId:'manche_sabre', dropChance:0.15, dropQuantity:1, dropQuantityCap:1 },
  },
  {
    id:'farm_ragnarok', name:'Colisée du Ragnarök', icon:'⚡', universe:'Valkyrie Apocalypse',
    description:'Affronte les dieux pour récupérer leurs Bijoux Divins perdus.',
    duration: H30, slots:4, palierRequired:31, minTeamDps: referenceTeamDps('CO'),
    isFarming:true, farmingPalier:31,
    rewards:{ coinsMin:3_000_000, coinsMax:7_000_000, gemsMin:15, gemsMax:35, dropId:'bijou_divin', dropChance:0.6, dropQuantity:1, dropQuantityCap:5 },
  },
  {
    id:'farm_undertale', name:'Monde Souterrain Profond', icon:'❤', universe:'Undertale',
    description:'Descends dans les abysses pour récolter les Âmes Humaines éparpillées.',
    duration: H30, slots:4, palierRequired:38, minTeamDps: referenceTeamDps('P'),
    isFarming:true, farmingPalier:38,
    rewards:{ coinsMin:5_000_000, coinsMax:12_000_000, gemsMin:20, gemsMax:50, dropId:'ame_humaine', dropChance:0.55, dropQuantity:1, dropQuantityCap:5 },
  },
  // ── Ateliers — déblocage de la fusion d'équipement par rareté ────────────
  // Une expédition dédiée par rareté (Peu Commun → Transcendant, Commun étant
  // débloqué par défaut) : la terminer débloque la fusion "10 → 1" vers cette
  // rareté dans la page Équipement (voir gameStore.unlockEquipRarity).
  ...EQUIP_UNLOCK_EXPEDITIONS,
  ...EQUIP_DROP_UNLOCK_EXPEDITIONS,
];

// ── Récompenses d'expédition (seule source de vérité pour les formules) ───
// Bonus de TENTATIVES de drop à rendements décroissants (pas de palier fixe à
// x3) : ratio = teamDps / minTeamDps -> bonusMult = 1 + log10(ratio), donc
// ratio=1 -> x1, ratio=10 -> x2, ratio=100 -> x3, ratio=1000 -> x4...
// Nombre de "dés" à lancer pour le drop spécial, pour un DPS d'équipe donné.
// Dépasser le seuil minTeamDps n'augmente PAS la quantité obtenue directement
// (le seuil, déjà garanti par canStart, ne fait que débloquer le premier dé) :
// ça augmente le nombre de tirages à dropChance, chacun indépendant. Le
// résultat final est donc aléatoire entre 0 et ce nombre de tentatives
// (loi binomiale), pas une quantité garantie.
export function computeDropAttempts(def: ExpeditionDef, teamDps: BigNum): number {
  const base = def.rewards.dropQuantity ?? 1;
  // ratio = teamDps / minTeamDps, calculé en espace log pour ne jamais
  // déborder même à très haut DPS (voir bnLog10) : dropBonusMult n'a besoin
  // que de log10(ratio), pas du ratio brut.
  const log10Ratio = def.minTeamDps > 0 ? bnLog10(teamDps) - Math.log10(def.minTeamDps) : 0;
  let attempts = Math.max(base, Math.floor(base * (1 + Math.max(0, log10Ratio))));
  if (def.rewards.dropQuantityCap) attempts = Math.min(attempts, def.rewards.dropQuantityCap);
  return attempts;
}

export interface ExpeditionRewardRoll {
  coins:      number;
  gems:       number;
  dropGained: number;
}

// Tire les récompenses d'une expédition terminée (pièces + gemmes fixes
// aléatoires entre min/max, + drop spécial : un dé à dropChance par tentative
// accordée par computeDropAttempts, chaque succès valant 1 item — ou, si
// dropGems est vrai, dropGemsAmount gemmes au lieu d'un item). Utilisé par
// claimExpedition (expeditionStore.ts).
export function rollExpeditionRewards(def: ExpeditionDef, teamDps: BigNum): ExpeditionRewardRoll {
  const coins = Math.floor(
    def.rewards.coinsMin + Math.random() * (def.rewards.coinsMax - def.rewards.coinsMin)
  );
  let gems = def.rewards.gemsMin !== undefined
    ? Math.floor(def.rewards.gemsMin + Math.random() * ((def.rewards.gemsMax ?? def.rewards.gemsMin) - def.rewards.gemsMin))
    : 0;

  let dropGained = 0;
  if (def.rewards.dropId || def.rewards.dropGems) {
    const attempts = computeDropAttempts(def, teamDps);
    for (let i = 0; i < attempts; i++) {
      if (Math.random() < (def.rewards.dropChance ?? 0)) {
        if (def.rewards.dropGems) gems += def.rewards.dropGemsAmount ?? 1;
        else dropGained++;
      }
    }
  }

  return { coins, gems, dropGained };
}

// ── Paliers de DPS par nombre de tentatives de drop ────────────────────────
// Inverse algébrique de dropBonusMult/computeDropAttempts : donne, à partir
// d'un nombre de tentatives cible, le DPS d'équipe minimum à atteindre —
// affiché aux joueurs (voir ExpeditionsPage.tsx) pour qu'ils sachent quel DPS
// viser. NB : atteindre ce DPS débloque N tentatives, pas N items garantis.
export function dpsForDropQty(def: ExpeditionDef, qty: number): number {
  const base = def.rewards.dropQuantity ?? 1;
  return def.minTeamDps * Math.pow(10, qty / base - 1);
}

export interface DropTier { qty: number; dps: number }

// Ne s'applique qu'aux expéditions à tentatives plafonnées explicitement
// (dropQuantityCap défini) : sans plafond, le nombre de tentatives grandit
// indéfiniment avec le DPS (log10), donc aucun "palier final" n'a de sens.
export function getDropTiers(def: ExpeditionDef): DropTier[] {
  if (!(def.rewards.dropId || def.rewards.dropGems) || def.rewards.dropQuantityCap === undefined) return [];
  const cap = def.rewards.dropQuantityCap;
  const tiers: DropTier[] = [];
  for (let q = 1; q <= cap; q++) tiers.push({ qty: q, dps: dpsForDropQty(def, q) });
  return tiers;
}
