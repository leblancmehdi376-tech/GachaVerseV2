// lib/game/expeditions.ts

import { Rarity } from '@/types/game';

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
  { id:'chakra_crystal', name:'Cristal de Chakra',      icon:'🌀', description:'Concentre l\'énergie vitale des ninjas.',                    palier:3,  universName:'Naruto'               },
  { id:'pierre_lune',    name:'Pierre Lune',            icon:'🌙', description:'Pierre évolutive rare du monde Pokémon.',                    palier:4,  universName:'Pokémon'              },
  { id:'masque_vo',      name:'Masque des Voleurs',     icon:'🎭', description:'Emblème des Voleurs Fantômes de Persona 5.',                 palier:5,  universName:'Persona 5'            },
  { id:'potala',         name:'Boucle Potara',          icon:'💫', description:'Boucle d\'oreille sacrée permettant la fusion Potara.',      palier:24, universName:'Dragon Ball Z'        },
  { id:'hogyoku',        name:'Fragment d\'Hogyoku',    icon:'💠', description:'Éclat de la sphère d\'Aizen qui transcende les limites.',    palier:12, universName:'Bleach'               },
  { id:'ore_soleil',     name:'Minerai du Soleil',      icon:'☀',  description:'Métal forgé dans le soleil, seul capable de tuer un démon.', palier:25, universName:'Demon Slayer'         },
  { id:'bijou_divin',    name:'Bijou Divin',            icon:'⚡', description:'Artefact des dieux de Ragnarök.',                            palier:31, universName:'Valkyrie Apocalypse'  },
  { id:'ame_humaine',    name:'Âme Humaine',            icon:'❤',  description:'L\'une des 7 âmes humaines du monde souterrain.',           palier:38, universName:'Undertale'            },
  { id:'rune_ancestrale',name:'Rune Ancestrale',        icon:'✨', description:'Rune imprégnée de la Grâce de l\'Entre-Terre.',              palier:40, universName:'Elden Ring'           },
  { id:'duplication_shards', name:'Éclat de Duplication', icon:'🔮', description:'Permet de dupliquer un objet ou une essence.',           palier:9,  universName:'Tensei Slime'         },
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
    palierRequired: 24,
    ingredients: [
      { type:'drop',          id:'potala',  quantity:2, label:'Boucle Potara × 2'       },
      { type:'champion_dupe', id:'goku',    quantity:1, label:'Doublon Goku maxé (inv. champions)' },
      { type:'champion_dupe', id:'vegeta',  quantity:1, label:'Doublon Végéta maxé (inv. champions)' },
    ],
    reward: { type:'character', characterId:'vegeto', rarity:'P', label:'Végéto', icon:'💫' },
  },
  {
    id: 'gogeta',
    name: 'Fusion EX : Gogeta',
    icon: '⚡',
    description: 'Fusion dansée parfaite entre Goku et Végéta. Plus puissant et stable que la Fusion Potara.',
    lore: '"Ceci s\'appelle... Gogeta !" — Gogeta SS Blue',
    palierRequired: 24,
    ingredients: [
      { type:'drop',          id:'saiyen_power', quantity:5, label:'Puissance Saiyen × 5'  },
      { type:'drop',          id:'ore_kame',     quantity:3, label:'Pierre de Kame × 3'    },
      { type:'champion_dupe', id:'goku',         quantity:1, label:'Doublon Goku maxé (inv. champions)'    },
      { type:'champion_dupe', id:'vegeta',       quantity:1, label:'Doublon Végéta maxé (inv. champions)'  },
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
    palierRequired: 12,
    ingredients: [
      { type:'drop',          id:'hogyoku', quantity:5, label:'Fragment d\'Hogyoku × 5'  },
      { type:'champion_dupe', id:'aizen',   quantity:1, label:'Doublon Aizen maxé (inv. champions)'      },
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
    palierRequired: 25,
    ingredients: [
      { type:'drop',          id:'ore_soleil',  quantity:7, label:'Minerai du Soleil × 7'  },
      { type:'champion_dupe', id:'tanjiro',     quantity:1, label:'Doublon Tanjiro maxé (inv. champions)'  },
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
    palierRequired: 31,
    ingredients: [
      { type:'drop', id:'bijou_divin', quantity:4, label:'Bijou Divin × 4' },
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
    palierRequired: 38,
    ingredients: [
      { type:'drop',          id:'ame_humaine', quantity:6, label:'Âme Humaine × 6'       },
      { type:'champion_dupe', id:'flowey_ut',   quantity:1, label:'Doublon Flowey maxé (inv. champions)'  },
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
    palierRequired: 2,
    ingredients: [
      { type:'drop',          id:'sea_fragment', quantity:8,  label:'Fragment Océanique × 8'          },
      { type:'champion_dupe', id:'zoro',         quantity:1,  label:'Doublon Zoro maxé (inv. champions)' },
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
  minRarityScore: number;      // somme basique de "poids de rareté" requis
  rewards: {
    coinsMin:     number;
    coinsMax:     number;
    gemsMin?:     number;
    gemsMax?:     number;
    dropId?:      string;     // drop spécial possible
    dropChance?:  number;     // 0-1
    dropQuantity?: number;
  };
  isFarming?:     boolean;    // expédition de retour-palier
  farmingPalier?: number;
}

const H = 3600;

export const EXPEDITION_DEFS: ExpeditionDef[] = [
  // ── Courtes (2-4h) ──────────────────────────────────────────────────────
  {
    id:'cave_cristal', name:'Caverne de Cristal', icon:'💎', universe:'Subnautica',
    description:'Explore les cavernes sous-marines à la recherche de ressources.',
    duration: 2*H, slots:1, palierRequired:1, minRarityScore:1,
    rewards:{ coinsMin:50_000, coinsMax:150_000, gemsMin:1, gemsMax:3 },
  },
  {
    id:'foret_kame', name:'Forêt de la Tortue', icon:'🐢', universe:'Dragon Ball Z',
    description:'Cherche les pierres secrètes cachées par Maître Roshi.',
    duration: 3*H, slots:1, palierRequired:1, minRarityScore:2,
    rewards:{ coinsMin:80_000, coinsMax:200_000, dropId:'ore_kame', dropChance:0.6, dropQuantity:1 },
  },
  {
    id:'patrol_easblue', name:'Patrouille East Blue', icon:'🌊', universe:'One Piece',
    description:'Croise les mers d\'East Blue pour récupérer du butin.',
    duration: 4*H, slots:2, palierRequired:2, minRarityScore:4,
    rewards:{ coinsMin:150_000, coinsMax:400_000, gemsMin:2, gemsMax:5, dropId:'sea_fragment', dropChance:0.5, dropQuantity:1 },
  },
  // ── Moyennes (6-12h) ────────────────────────────────────────────────────
  {
    id:'mission_ninja', name:'Mission Secrète — Konoha', icon:'🌀', universe:'Naruto',
    description:'Infiltre une base ennemie pour récupérer des cristaux de chakra.',
    duration: 6*H, slots:2, palierRequired:3, minRarityScore:6,
    rewards:{ coinsMin:300_000, coinsMax:800_000, gemsMin:3, gemsMax:8, dropId:'chakra_crystal', dropChance:0.55, dropQuantity:2 },
  },
  {
    id:'safari_kanto', name:'Safari de Kanto', icon:'🌙', universe:'Pokémon',
    description:'Explore la Zone Safari pour trouver des pierres évolutives rares.',
    duration: 6*H, slots:2, palierRequired:4, minRarityScore:8,
    rewards:{ coinsMin:350_000, coinsMax:900_000, gemsMin:4, gemsMax:10, dropId:'pierre_lune', dropChance:0.5, dropQuantity:1 },
  },
  {
    id:'palais_persona', name:'Exploration du Palais', icon:'🎭', universe:'Persona 5',
    description:'Infiltre un palais de la conscience pour voler le trésor.',
    duration: 8*H, slots:3, palierRequired:5, minRarityScore:12,
    rewards:{ coinsMin:500_000, coinsMax:1_200_000, gemsMin:5, gemsMax:12, dropId:'masque_vo', dropChance:0.5, dropQuantity:1 },
  },
  {
    id:'esplanade_tempest', name:'Esplanade de Tempest', icon:'🔮', universe:'Tensei Slime',
    description:'Sillonne les plaines de Tempest pour récolter des fragments magiques.',
    duration: 8*H, slots:2, palierRequired:9, minRarityScore:10,
    rewards:{ coinsMin:600_000, coinsMax:1_500_000, gemsMin:5, gemsMax:14, dropId:'duplication_shards', dropChance:0.65, dropQuantity:3 },
  },
  // ── Longues (12-24h) ────────────────────────────────────────────────────
  {
    id:'farm_namek', name:'Retour sur Namek', icon:'💫', universe:'Dragon Ball Z',
    description:'Retourne sur la planète Namek pour récolter les légendaires Boucles Potara.',
    duration: 12*H, slots:3, palierRequired:24, minRarityScore:20,
    isFarming:true, farmingPalier:24,
    rewards:{ coinsMin:1_000_000, coinsMax:3_000_000, gemsMin:8, gemsMax:20, dropId:'potala', dropChance:0.7, dropQuantity:1 },
  },
  {
    id:'farm_bleach', name:'Soul Society — Secteur 1', icon:'💠', universe:'Bleach',
    description:'Infiltre Soul Society pour récupérer des fragments de l\'Hogyoku d\'Aizen.',
    duration: 12*H, slots:3, palierRequired:12, minRarityScore:18,
    isFarming:true, farmingPalier:12,
    rewards:{ coinsMin:1_200_000, coinsMax:3_500_000, gemsMin:10, gemsMax:22, dropId:'hogyoku', dropChance:0.65, dropQuantity:1 },
  },
  {
    id:'farm_demonslayer', name:'Montagne Wisteria', icon:'☀', universe:'Demon Slayer',
    description:'Escalade la montagne sacrée pour forger du minerai sous la lumière du soleil.',
    duration: 16*H, slots:3, palierRequired:25, minRarityScore:24,
    isFarming:true, farmingPalier:25,
    rewards:{ coinsMin:2_000_000, coinsMax:5_000_000, gemsMin:12, gemsMax:28, dropId:'ore_soleil', dropChance:0.6, dropQuantity:2 },
  },
  {
    id:'farm_ragnarok', name:'Colisée du Ragnarök', icon:'⚡', universe:'Valkyrie Apocalypse',
    description:'Affronte les dieux pour récupérer leurs Bijoux Divins perdus.',
    duration: 20*H, slots:4, palierRequired:31, minRarityScore:32,
    isFarming:true, farmingPalier:31,
    rewards:{ coinsMin:3_000_000, coinsMax:7_000_000, gemsMin:15, gemsMax:35, dropId:'bijou_divin', dropChance:0.6, dropQuantity:1 },
  },
  {
    id:'farm_undertale', name:'Monde Souterrain Profond', icon:'❤', universe:'Undertale',
    description:'Descends dans les abysses pour récolter les Âmes Humaines éparpillées.',
    duration: 24*H, slots:4, palierRequired:38, minRarityScore:40,
    isFarming:true, farmingPalier:38,
    rewards:{ coinsMin:5_000_000, coinsMax:12_000_000, gemsMin:20, gemsMax:50, dropId:'ame_humaine', dropChance:0.55, dropQuantity:2 },
  },
  {
    id:'farm_eldenring', name:'L\'Entre-Terre Éternel', icon:'✨', universe:'Elden Ring',
    description:'Parcours l\'Entre-Terre pour graver les Runes Ancestrales en toi.',
    duration: 36*H, slots:4, palierRequired:40, minRarityScore:50,
    isFarming:true, farmingPalier:40,
    rewards:{ coinsMin:10_000_000, coinsMax:25_000_000, gemsMin:30, gemsMax:80, dropId:'rune_ancestrale', dropChance:0.5, dropQuantity:2 },
  },
];

// Poids de rareté pour calculer le score d'une équipe
export const RARITY_SCORE: Record<string, number> = {
  C:1, U:2, R:4, E:8, L:15, M:25, S:40, CO:60, P:90, T:150,
};
