// lib/game/achievements.ts — Définition de tous les succès GachaVerse

import { CHARACTER_POOL } from './characters';
import { EQUIPMENT_DEFS } from './items';
import { PALIERS } from './paliers';
import { RARITY_ORDER_ASC, type Rarity } from '@/types/game';

// Totaux du Compadex — voir la section COMPADEX ci-dessous. Exportés pour que
// hooks/useAchievementTrackers.ts puisse détecter la complétion à 100% sans
// dupliquer CHARACTER_POOL.length / Object.keys(EQUIPMENT_DEFS).length.
export const COMPADEX_CHAR_TOTAL = CHARACTER_POOL.length;
export const COMPADEX_EQUIP_TOTAL = Object.keys(EQUIPMENT_DEFS).length;
export const WORLD_TOTAL = PALIERS.length;
// Nombre maximum de trophées mis en avant sur le profil (page Trophées).
export const MAX_SHOWCASED_TROPHIES = 5;

export type AchievCategory =
  | 'progression' | 'gacha' | 'collection' | 'combat' | 'mastery'
  | 'economy' | 'challenges' | 'exploration' | 'events' | 'secrets';

export type AchievTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id:          string;
  category:    AchievCategory;
  icon:        string;
  title:       string;           // titre débloquable
  name:        string;           // nom du succès
  description: string;
  target:      number;           // valeur cible
  // Masqué ("???") tant qu'il n'est pas débloqué. Toute la catégorie
  // 'secrets' l'est implicitement (voir isHiddenAchievement).
  secret?:     boolean;
  // true : progression/déblocage/récompense remis à zéro à chaque Prestige
  // (succès "de run" — kills, dps, coins, pulls, améliorations, collection
  // en cours, quêtes, rang 7★). Par défaut (absent/false) : permanent, comme
  // les titres, les éditions shiny et tout ce qui touche à la progression
  // de Prestige elle-même.
  resetsOnPrestige?: boolean;
  // Clé de `achievementStats` (voir store/slices/achievementSlice.ts) dont la
  // valeur sert directement de progression — suivi générique par
  // trackAchievementStats, sans traqueur dédié. Les clés "dérivées"
  // (DERIVED_STATS ci-dessous) sont recalculées à partir des autres.
  stat?: string;
  tier?: AchievTier;             // forcé ; sinon déduit de la récompense
  reward?: {
    type:  'title' | 'gems' | 'coins';
    value: number | string;
  };
}

// ── Catégories (ordre des onglets) ─────────────────────────────────────────
export interface AchievCategoryMeta {
  id:     AchievCategory;
  label:  string;
  icon:   string;
  accent: string;
  blurb:  string;
}

export const ACHIEVEMENT_CATEGORIES: AchievCategoryMeta[] = [
  { id:'progression', label:'PROGRESSION', icon:'📈', accent:'#c084fc', blurb:'Ton ascension dans le multivers : Prestige, améliorations, quêtes et temps de jeu.' },
  { id:'gacha',       label:'GACHA',       icon:'🎰', accent:'#22d3ee', blurb:'Invocations, raretés extrêmes et coups de chance insolents.' },
  { id:'collection',  label:'COLLECTION',  icon:'📚', accent:'#60a5fa', blurb:'Compadex, licences complètes, éditions Or et Diamant.' },
  { id:'combat',      label:'COMBAT',      icon:'⚔️', accent:'#f87171', blurb:'Monstres, boss de palier, boss de raid et combos dévastateurs.' },
  { id:'mastery',     label:'MAÎTRISE',    icon:'🎖️', accent:'#f472b6', blurb:'Chaque personnage a sa propre progression : fais-les tous briller.' },
  { id:'economy',     label:'ÉCONOMIE',    icon:'💰', accent:'#fbbf24', blurb:'Pixel-Coins, Neko-Gemmes, achats et ventes.' },
  { id:'challenges',  label:'DÉFIS',       icon:'🔥', accent:'#fb923c', blurb:'Des exploits réservés aux joueurs les plus audacieux.' },
  { id:'exploration', label:'EXPLORATION', icon:'🧭', accent:'#34d399', blurb:'Mondes, recoins cachés et secrets de l\'interface.' },
  { id:'events',      label:'ÉVÉNEMENTS',  icon:'🎉', accent:'#e879f9', blurb:'Ardeur, Tempête, Jackpot et bannière événementielle.' },
  { id:'secrets',     label:'SECRETS',     icon:'❔', accent:'#a78bfa', blurb:'Conditions inconnues. À toi de les découvrir…' },
];

export const CATEGORY_META: Record<AchievCategory, AchievCategoryMeta> = Object.fromEntries(
  ACHIEVEMENT_CATEGORIES.map(c => [c.id, c])
) as Record<AchievCategory, AchievCategoryMeta>;

// Libellés courts (compat — ancien affichage des filtres).
export const CATEGORY_LABELS: Record<AchievCategory, string> = Object.fromEntries(
  ACHIEVEMENT_CATEGORIES.map(c => [c.id, `${c.icon} ${c.label}`])
) as Record<AchievCategory, string>;

// ── Clés de achievementStats ───────────────────────────────────────────────
// Compteurs/drapeaux permanents (jamais remis à zéro au Prestige, synchronisés
// cloud avec une fusion "max par clé" — voir mergeMonotonicState).
export const STAT = {
  playtimeSec:     'playtimeSec',
  coinsSpent:      'coinsSpent',
  shopPurchases:   'shopPurchases',
  itemsSold:       'itemsSold',
  bossStreakCur:   'bossStreakCur',
  bossStreakMax:   'bossStreakMax',
  lastFailPalier:  'lastFailPalier',
  raidBossKills:   'raidBossKills',
  ultComboMax:     'ultComboMax',
  gachaLowRate:    'gachaLowRate',
  gachaSsrCur:     'gachaSsrCur',
  gachaSsrMax:     'gachaSsrMax',
  gachaMiracle:    'gachaMiracle',
  pullsVol2:       'pullsVol2',
  eventsSeen:      'eventsSeen',
  eventsJoined:    'eventsJoined',
  interactions:    'interactions',
  // Dérivées (recalculées, jamais stockées) — voir computeDerivedStats.
  pagesVisited:    'pagesVisited',
  secretsFound:    'secretsFound',
  eventsMastered:  'eventsMastered',
} as const;

// Drapeaux "découverte" (valeur 1 une fois trouvés).
export const EGG = {
  passage:   'egg:passage',
  object:    'egg:object',
  room:      'egg:room',
  npc:       'egg:npc',
  goldNeko:  'egg:goldneko',
  konami:    'egg:konami',
  night:     'egg:night',
  sixSeven:  'egg:67',
  bankrupt:  'egg:bankrupt',
  trophyRain:'egg:trophyrain',
} as const;

// Défis de boss (valeur 1 une fois réussis) — posés par bossVictoryStatsPatch.
export const CHAL = {
  flawless:  'chal:flawless',  // boss vaincu en ≤ 10 s
  clutch:    'chal:clutch',    // boss vaincu avec 1 s restante
  fast60:    'chal:fast60',    // boss vaincu en < 60 s (palier ≥ 20)
  noUlt:     'chal:noult',     // boss vaincu sans ultime (palier ≥ 15)
  commons:   'chal:commons',   // équipe de 4 Communs (palier ≥ 5)
  solo:      'chal:solo',      // un seul personnage (palier ≥ 10)
  maxDiff:   'chal:maxdiff',   // boss du dernier monde
  clean:     'chal:clean',     // palier ≥ 20 sans défaite ni retraite, boss en ≤ 30 s
} as const;

// Événements réussis parfaitement.
export const EV_PERFECT = {
  ardeur:  'ev:ardeur',
  tempete: 'ev:tempete',
  jackpot: 'ev:jackpot',
} as const;

// Pages visitables (voir GameLayout) — "Explorer toutes les sections".
export const EXPLORABLE_PAGES = [
  'home', 'companions', 'champions', 'equipment', 'collection', 'upgrades', 'prestige', 'anomalie',
  'mine', 'mastery', 'achievements', 'raids', 'expeditions', 'gacha', 'shop', 'marketplace', 'forge', 'profile',
  'quests', 'leaderboard', 'settings',
] as const;
export const pageStatKey = (page: string) => `page:${page}`;

// Secrets comptés par "Découvrir tous les secrets".
export const ALL_SECRET_KEYS: string[] = Object.values(EGG);

export function computeDerivedStats(stats: Record<string, number>): Record<string, number> {
  const has = (k: string) => (stats[k] ?? 0) > 0;
  return {
    ...stats,
    [STAT.pagesVisited]:   EXPLORABLE_PAGES.filter(p => has(pageStatKey(p))).length,
    [STAT.secretsFound]:   ALL_SECRET_KEYS.filter(has).length,
    [STAT.eventsMastered]: Object.values(EV_PERFECT).filter(has).length,
  };
}

// Regroupés par category (ordre de ACHIEVEMENT_CATEGORIES), puis par thème au
// sein de chaque catégorie, triés par target croissante dans chaque sous-groupe.
// Les `id` historiques sont conservés tels quels même quand leur catégorie a
// changé (progression/claims déjà sauvegardés chez les joueurs).
export const ACHIEVEMENTS: Achievement[] = [
  // ── PROGRESSION ──────────────────────────────────────────────────────────
  // — Prestige —
  {
    id:'prestige_1', category:'progression', icon:'🔄',
    title:'Réincarné', name:'Nouveau Départ',
    description:'Effectue ton premier Prestige. Le début d\'une nouvelle ère ?', target:1,
    reward:{ type:'title', value:'Réincarné' },
  },
  {
    id:'prestige_10', category:'progression', icon:'♾',
    title:'Ascendant', name:'Ascension Ultime',
    description:'Atteins le niveau 5 de Prestige.', target:5,
    reward:{ type:'gems', value:3000 },
    secret:true,
  },
  {
    id:'prestige_25', category:'progression', icon:'🔄',
    title:'Renaissant', name:'Renaissance Infinie',
    description:'Atteins le niveau 20 de Prestige.', target:20,
    reward:{ type:'gems', value:1500 },
    secret:true,
  },

  // — Temps de jeu (en ligne, onglet visible) —
  {
    id:'playtime_1h', category:'progression', icon:'⏱',
    title:'Habitué', name:'Une Heure de Plus',
    description:'Joue 1 heure au total.', target:3600, stat:STAT.playtimeSec,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'playtime_100h', category:'progression', icon:'⌛',
    title:'Dévoué', name:'Cent Heures',
    description:'Joue 100 heures au total.', target:360000, stat:STAT.playtimeSec,
    reward:{ type:'gems', value:500 },
  },
  {
    id:'playtime_500h', category:'progression', icon:'🕰',
    title:'Pilier du Multivers', name:'Une Vie de Joueur',
    description:'Joue 500 heures au total.', target:1800000, stat:STAT.playtimeSec,
    reward:{ type:'gems', value:2000 },
  },

  // — Améliorer (perso, héros, Coffre d'Or) —
  {
    id:'upgrade_10', category:'progression', icon:'⬆',
    title:'Optimisateur', name:'Toujours Plus Fort',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 50 fois au total.', target:50,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'upgrade_200', category:'progression', icon:'⚒',
    title:'Maître Artisan', name:'Maître Artisan',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 200 fois au total.', target:200,
    reward:{ type:'gems', value:300 },
    resetsOnPrestige:true,
  },
  {
    id:'upgrade_50', category:'progression', icon:'🔧',
    title:'Forgeron', name:'Perfectionniste',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 500 fois au total.', target:500,
    reward:{ type:'gems', value:50 },
    resetsOnPrestige:true,
  },

  // — Compléter des quêtes —
  {
    id:'quest_10', category:'progression', icon:'📜',
    title:'Serviteur', name:'Dix Missions',
    description:'Complète 10 quêtes.', target:10,
    reward:{ type:'gems', value:20 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_20', category:'progression', icon:'📯',
    title:'Émissaire', name:'Vingt Missions',
    description:'Complète 20 quêtes.', target:20,
    reward:{ type:'gems', value:45 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_50', category:'progression', icon:'🗺',
    title:'Aventurier', name:'Cinquante Missions',
    description:'Complète 50 quêtes.', target:50,
    reward:{ type:'gems', value:80 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_100', category:'progression', icon:'🏅',
    title:'Légat', name:'Cent Missions',
    description:'Complète 100 quêtes.', target:100,
    reward:{ type:'gems', value:180 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_500', category:'progression', icon:'📖',
    title:'Légende Vivante', name:'Héros Légendaire',
    description:'Complète 500 quêtes au total.', target:500,
    reward:{ type:'gems', value:1000 },
    secret:true,
    resetsOnPrestige:true,
  },

  // ── GACHA ────────────────────────────────────────────────────────────────
  // — Effectuer des tirages —
  {
    id:'pull_1', category:'gacha', icon:'🎰',
    title:'Joueur', name:'Premier Tirage',
    description:'Effectue ton premier tirage.', target:1,
    reward:{ type:'gems', value:5 },
    resetsOnPrestige:true,
  },
  {
    id:'pull_10', category:'gacha', icon:'🎲',
    title:'Parieur', name:'Dix Invocations',
    description:'Effectue 10 tirages.', target:10,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'pull_100', category:'gacha', icon:'🎯',
    title:'Invocateur', name:'Cent Tirages',
    description:'Effectue 100 tirages.', target:100,
    reward:{ type:'gems', value:30 },
    resetsOnPrestige:true,
  },
  {
    id:'pull_500', category:'gacha', icon:'🔮',
    title:'Grand Invocateur', name:'Cinq Cents Tirages',
    description:'Effectue 500 tirages.', target:500,
    reward:{ type:'gems', value:150 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'pull_1000', category:'gacha', icon:'🌀',
    title:'Insatiable', name:'Chance Insolente',
    description:'Effectue 1 000 tirages gacha.', target:1000,
    reward:{ type:'gems', value:400 },
    resetsOnPrestige:true,
  },
  {
    id:'pull_5000', category:'gacha', icon:'🎡',
    title:'Insatiable Absolu', name:'Addiction Sans Limite',
    description:'Effectue 5 000 tirages gacha.', target:5000,
    reward:{ type:'gems', value:1000 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Raretés (5★ = Légendaire, 6★ = Mythique) —
  {
    id:'legendary_1', category:'gacha', icon:'✨',
    title:'Chanceux', name:'Or Pur',
    description:'Obtiens un personnage de rareté 5★ (Légendaire) ou mieux.', target:1,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'mythic_1', category:'gacha', icon:'🔴',
    title:'Béni des Astres', name:'Sang Mythique',
    description:'Obtiens un personnage de rareté 6★ (Mythique) ou mieux.', target:1,
    reward:{ type:'gems', value:60 },
  },
  {
    id:'gacha_low_rate', category:'gacha', icon:'🍀',
    title:'Trèfle à Quatre Feuilles', name:'Moins d\'Un Pour Cent',
    description:'Obtiens un personnage dont la rareté avait moins de 1 % de chance de tomber.', target:1, stat:STAT.gachaLowRate,
    reward:{ type:'gems', value:80 },
  },
  {
    id:'gacha_ssr_streak', category:'gacha', icon:'🌟',
    title:'Triple Étoile', name:'Tir Groupé',
    description:'Obtiens 3 personnages SSR (5★ Légendaire ou mieux) d\'affilée.', target:3, stat:STAT.gachaSsrMax,
    reward:{ type:'gems', value:250 },
  },
  {
    id:'gacha_miracle', category:'gacha', icon:'🌠',
    title:'Miraculé', name:'Exploit Miraculeux',
    description:'Obtiens 2 personnages à moins de 1 % de chance dans un même tirage multiple.', target:1, stat:STAT.gachaMiracle,
    reward:{ type:'gems', value:600 },
    tier:'platinum',
  },

  // ── COLLECTION ──────────────────────────────────────────────────────────
  // — Obtenir des personnages différents —
  {
    id:'collect_1', category:'collection', icon:'🐣',
    title:'Recruteur', name:'Premier Allié',
    description:'Obtiens ton premier personnage.', target:1,
    reward:{ type:'gems', value:5 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_10', category:'collection', icon:'🤝',
    title:'Rassembleur', name:'Petite Troupe',
    description:'Possède 10 personnages différents.', target:10,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_5', category:'collection', icon:'👥',
    title:'Meneur', name:'L\'Équipe se Forme',
    description:'Possède 50 personnages différents.', target:50,
    reward:{ type:'gems', value:30 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_15', category:'collection', icon:'🏛',
    title:'Archiviste', name:'Petite Collection',
    description:'Possède 100 personnages différents.', target:100,
    reward:{ type:'gems', value:150 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_30', category:'collection', icon:'📚',
    title:'Collectionneur', name:'Bibliothèque',
    description:'Possède 150 personnages différents.', target:150,
    reward:{ type:'gems', value:400 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_250', category:'collection', icon:'🏰',
    title:'Conservateur', name:'Musée Vivant',
    description:'Possède 250 personnages différents.', target:250,
    reward:{ type:'gems', value:800 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_all', category:'collection', icon:'🌟',
    title:'Complétiste', name:'Tout Attraper',
    description:'Débloque tous les personnages.', target:CHARACTER_POOL.length,
    reward:{ type:'gems', value:1500 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Licences et raretés complètes —
  {
    id:'universe_complete', category:'collection', icon:'🧩',
    title:'Fan Absolu', name:'Licence Complète',
    description:'Possède tous les personnages d\'une même licence (univers).', target:1,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'rarity_complete', category:'collection', icon:'💎',
    title:'Minutieux', name:'Rareté Complète',
    description:'Possède tous les personnages d\'une même rareté.', target:1,
    reward:{ type:'gems', value:300 },
  },

  // — Compadex : personnages/équipements DÉJÀ obtenus, à vie —
  // Contrairement à collect_* ci-dessus (resetsOnPrestige, remis à zéro à
  // chaque Prestige), ces succès suivent compadexCharactersSeen/
  // compadexEquipmentSeen (voir types/game.ts) : un personnage/équipement
  // compte dès sa toute première obtention et reste acquis pour toujours,
  // même perdu ou remis à zéro depuis (Prestige, recyclage...).
  {
    id:'compadex_char_25', category:'collection', icon:'📖',
    title:'Archiviste des Âmes', name:'Premières Pages',
    description:'Compadex personnages : as croisé la route de 25% de tous les personnages du jeu (à vie).',
    target: Math.ceil(COMPADEX_CHAR_TOTAL * 0.25),
    reward:{ type:'gems', value:100 },
  },
  {
    id:'compadex_char_50', category:'collection', icon:'📗',
    title:'Chroniqueur des Âmes', name:'Mi-Parcours',
    description:'Compadex personnages : as croisé la route de 50% de tous les personnages du jeu (à vie).',
    target: Math.ceil(COMPADEX_CHAR_TOTAL * 0.5),
    reward:{ type:'gems', value:300 },
  },
  {
    id:'compadex_char_75', category:'collection', icon:'📘',
    title:'Gardien des Âmes', name:'Presque Complet',
    description:'Compadex personnages : as croisé la route de 75% de tous les personnages du jeu (à vie).',
    target: Math.ceil(COMPADEX_CHAR_TOTAL * 0.75),
    reward:{ type:'gems', value:800 },
    secret:true,
  },
  {
    id:'compadex_char_100', category:'collection', icon:'🌌',
    title:'🌌 Rassembleur d\'Âmes', name:'Collectionneur Ultime',
    description:'Complète 100% du Compadex des personnages (tous obtenus au moins une fois, à vie).',
    target: COMPADEX_CHAR_TOTAL,
    reward:{ type:'title', value:'🌌 Rassembleur d\'Âmes' },
    secret:true,
  },
  {
    id:'compadex_equip_25', category:'collection', icon:'🛡',
    title:'Apprenti Forgeron', name:'Premières Reliques',
    description:'Compadex équipements : as croisé la route de 25% de tous les équipements du jeu (à vie).',
    target: Math.ceil(COMPADEX_EQUIP_TOTAL * 0.25),
    reward:{ type:'gems', value:100 },
  },
  {
    id:'compadex_equip_50', category:'collection', icon:'⚔',
    title:'Forgeron Chevronné', name:'Arsenal Grandissant',
    description:'Compadex équipements : as croisé la route de 50% de tous les équipements du jeu (à vie).',
    target: Math.ceil(COMPADEX_EQUIP_TOTAL * 0.5),
    reward:{ type:'gems', value:300 },
  },
  {
    id:'compadex_equip_75', category:'collection', icon:'🏹',
    title:'Maître d\'Armes', name:'Coffre Presque Plein',
    description:'Compadex équipements : as croisé la route de 75% de tous les équipements du jeu (à vie).',
    target: Math.ceil(COMPADEX_EQUIP_TOTAL * 0.75),
    reward:{ type:'gems', value:800 },
    secret:true,
  },
  {
    id:'compadex_equip_100', category:'collection', icon:'⚔️',
    title:'⚔️ Collectionneur de reliques', name:'Compadex Complet — Équipements',
    description:'Complète 100% du Compadex des équipements (tous obtenus au moins une fois, à vie).',
    target: COMPADEX_EQUIP_TOTAL,
    reward:{ type:'title', value:'⚔️ Collectionneur de reliques' },
    secret:true,
  },
  {
    id:'compadex_both_100', category:'collection', icon:'👑',
    title:'👑 Souverain des Reliques et des Âmes perdues', name:'Compadex Absolu',
    description:'Complète 100% des DEUX Compadex à la fois — personnages ET équipements.',
    target: 2,
    reward:{ type:'title', value:'👑 Souverain des Reliques et des Âmes perdues' },
    secret:true,
  },

  // — Personnages Transcendants —
  {
    id:'transcendant_1', category:'collection', icon:'🌈',
    title:'Élu', name:'Au-Delà de Tout',
    description:'Obtiens un personnage Transcendant.', target:1,
    reward:{ type:'gems', value:400 },
    secret:true,
  },
  {
    id:'transcendant_3', category:'collection', icon:'🌈',
    title:'Élu Suprême', name:'Élu des Élus',
    description:'Possède 3 personnages Transcendants différents.', target:3,
    reward:{ type:'gems', value:1800 },
    secret:true,
  },

  // — Éditions Or/Diamant —
  {
    id:'gold_1', category:'collection', icon:'✨',
    title:'Étincelant', name:'Première Étincelle',
    description:'Obtiens ta première carte Édition Or.', target:1,
    reward:{ type:'gems', value:400 },
  },
  {
    id:'diamond_1', category:'collection', icon:'💠',
    title:'Éclat Pur', name:'Diamant Brut',
    description:'Obtiens ta première carte Édition Diamant.', target:1,
    reward:{ type:'gems', value:600 },
    secret:true,
  },
  {
    id:'diamond_3', category:'collection', icon:'👑',
    title:'Prisme Absolu', name:'Le Nec Plus Ultra',
    description:'Possède 3 personnages Diamant différents.', target:3,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'diamond_10', category:'collection', icon:'💎',
    title:'Éternel', name:'Diamant Éternel',
    description:'Possède 10 personnages différents en édition Diamant.', target:10,
    reward:{ type:'gems', value:2000 },
    secret:true,
  },
  {
    id:'shiny_10', category:'collection', icon:'🌟',
    title:'Scintillant', name:'Collection Étincelante',
    description:'Possède 10 cartes Or ou Diamant au total.', target:10,
    reward:{ type:'gems', value:550 },
  },

  // — Même personnage en Base + Or + Diamant (collection complète d'un perso) —
  {
    id:'trio_perfect', category:'collection', icon:'🔱',
    title:'Trinité', name:'Trio Parfait',
    description:'Complète la collection d\'un personnage : possède-le en Base, Or ET Diamant.', target:1,
    reward:{ type:'gems', value:300 },
    secret:true,
  },
  {
    id:'pantheon_5', category:'collection', icon:'🏺',
    title:'Architecte du Panthéon', name:'Panthéon Complet',
    description:'Possède 5 personnages différents en Base, Or ET Diamant à la fois.', target:5,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },

  // — Titres —
  {
    id:'titles_25', category:'collection', icon:'🎖',
    title:'Décoré', name:'Collectionneur de Titres',
    description:'Débloque 25 titres différents.', target:25,
    reward:{ type:'gems', value:300 },
  },

  // ── COMBAT ──────────────────────────────────────────────────────────────
  // — Vaincre des monstres —
  {
    id:'kills_1', category:'combat', icon:'🗡',
    title:'Premier Sang', name:'Baptême du Feu',
    description:'Remporte ton premier combat : vaincs un monstre.', target:1,
    reward:{ type:'title', value:'Premier Sang' },
  },
  {
    id:'kills_500', category:'combat', icon:'⚔',
    title:'Exterminateur', name:'Chasse Ouverte',
    description:'Vaincs 500 monstres au total.', target:500,
    reward:{ type:'gems', value:15 },
    resetsOnPrestige:true,
  },
  {
    id:'kills_5000', category:'combat', icon:'💥',
    title:'Faucheur', name:'Purge Totale',
    description:'Vaincs 5 000 monstres au total.', target:5000,
    reward:{ type:'gems', value:50 },
    resetsOnPrestige:true,
  },
  {
    id:'kills_50000', category:'combat', icon:'🔥',
    title:'Fléau', name:'Apocalypse Ambulante',
    description:'Vaincs 50 000 monstres au total.', target:50000,
    reward:{ type:'gems', value:150 },
    resetsOnPrestige:true,
  },
  {
    id:'kills_500000', category:'combat', icon:'☄',
    title:'Annihilateur', name:'Fin du Monde',
    description:'Vaincs 500 000 monstres au total.', target:500000,
    reward:{ type:'gems', value:500 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'kills_1000000', category:'combat', icon:'🔥',
    title:'Apocalypse', name:'Extermination Totale',
    description:'Vaincs 1 000 000 de monstres à vie.', target:1000000,
    reward:{ type:'gems', value:1000 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Victoires contre des boss —
  {
    id:'first_boss', category:'combat', icon:'💀',
    title:'Briseur de Cornes', name:'Chasseur de Boss',
    description:'Vaincs ton premier boss.', target:1,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'bosses_5', category:'combat', icon:'🏹',
    title:'Chasseur', name:'Bête Noire',
    description:'Vaincs 5 boss.', target:5,
    reward:{ type:'gems', value:25 },
  },
  {
    id:'bosses_10', category:'combat', icon:'🥊',
    title:'Bagarreur', name:'Dix Victoires',
    description:'Remporte 10 victoires contre des boss.', target:10,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'bosses_20', category:'combat', icon:'🗡',
    title:'Tueur de Dieux', name:'Nemesis',
    description:'Vaincs 20 boss.', target:20,
    reward:{ type:'gems', value:100 },
  },
  {
    id:'bosses_67', category:'combat', icon:'🎯',
    title:'Six Seven', name:'Mortels 67',
    description:'Vaincs 67 boss.', target:67,
    reward:{ type:'title', value:'Six Seven' },
  },
  {
    id:'bosses_100', category:'combat', icon:'⚰',
    title:'Fossoyeur', name:'Cent Victoires',
    description:'Remporte 100 victoires contre des boss.', target:100,
    reward:{ type:'gems', value:250 },
  },
  {
    id:'bosses_1000', category:'combat', icon:'🏆',
    title:'Seigneur de Guerre', name:'Mille Victoires',
    description:'Remporte 1 000 victoires contre des boss.', target:1000,
    reward:{ type:'gems', value:1500 },
  },

  // — Victoires remarquables —
  {
    id:'boss_flawless', category:'combat', icon:'🛡️',
    title:'Intouchable', name:'Victoire Parfaite',
    description:'Vaincs un boss de palier en 10 secondes ou moins — sans lui laisser le temps de riposter.', target:1, stat:CHAL.flawless,
    reward:{ type:'gems', value:60 },
  },
  {
    id:'boss_clutch', category:'combat', icon:'❤️‍🩹',
    title:'Sur le Fil', name:'Un Dernier Souffle',
    description:'Vaincs un boss de palier alors qu\'il ne reste plus qu\'1 seconde au chrono.', target:1, stat:CHAL.clutch,
    reward:{ type:'gems', value:120 },
  },
  {
    id:'ult_combo', category:'combat', icon:'💫',
    title:'Chef d\'Orchestre', name:'Combo Dévastateur',
    description:'Enchaîne 4 ultimes d\'affilée (1 actif + 3 en file d\'attente).', target:4, stat:STAT.ultComboMax,
    reward:{ type:'gems', value:80 },
  },
  {
    id:'raid_boss_1', category:'combat', icon:'🐉',
    title:'Pourfendeur', name:'Boss Légendaire',
    description:'Vaincs un boss de raid légendaire.', target:1, stat:STAT.raidBossKills,
    reward:{ type:'gems', value:100 },
  },
  {
    id:'raid_boss_25', category:'combat', icon:'🐲',
    title:'Tueur de Légendes', name:'Chasseur de Légendes',
    description:'Vaincs 25 boss de raid.', target:25, stat:STAT.raidBossKills,
    reward:{ type:'gems', value:500 },
  },

  // — Dégâts par seconde —
  {
    id:'dps_1000', category:'combat', icon:'📈',
    title:'Puissant', name:'Machine de Guerre',
    description:'Inflige 1 000 dégâts par seconde.', target:1000,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'dps_100k', category:'combat', icon:'💢',
    title:'Destructeur', name:'Cent Mille Coups',
    description:'Inflige 100 000 dégâts par seconde.', target:100000,
    reward:{ type:'gems', value:15 },
    resetsOnPrestige:true,
  },
  {
    id:'dps_1m', category:'combat', icon:'🌊',
    title:'Dévastateur', name:'Force Brute',
    description:'Inflige 1 000 000 dégâts par seconde.', target:1000000,
    reward:{ type:'gems', value:20 },
    resetsOnPrestige:true,
  },
  {
    id:'dps_100m', category:'combat', icon:'💢',
    title:'Cataclysme', name:'Puissance Infinie',
    description:'Atteins 100 000 000 DPS.', target:100000000,
    reward:{ type:'gems', value:50 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'dps_1b', category:'combat', icon:'🌀',
    title:'Singularité', name:'Singularité',
    description:'Atteins 1 000 000 000 DPS.', target:1000000000,
    reward:{ type:'gems', value:90 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Divers —
  {
    id:'crowns_50', category:'combat', icon:'👑',
    title:'Souverain', name:'Souverain',
    description:'Obtiens 50 Couronnes de Boss au total.', target:50,
    reward:{ type:'gems', value:200 },
  },
  {
    id:'equip_team', category:'combat', icon:'⚙',
    title:'Tacticien', name:'Équipe Complète',
    description:'Équipe les 4 emplacements d\'allié.', target:4,
    reward:{ type:'gems', value:15 },
  },

  // ── MAÎTRISE ─────────────────────────────────────────────────────────────
  // Suivis par personnage dans charMastery (voir MASTERY_MILESTONES
  // ci-dessous) : chaque succès est validé dès qu'UN personnage l'atteint.
  {
    id:'mastery_lv_10', category:'mastery', icon:'🔰',
    title:'Mentor', name:'Élève Prometteur',
    description:'Monte un personnage au niveau 10.', target:10,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'mastery_lv_50', category:'mastery', icon:'🎗',
    title:'Instructeur', name:'Disciple Accompli',
    description:'Monte un personnage au niveau 50.', target:50,
    reward:{ type:'gems', value:60 },
  },
  {
    id:'mastery_lv_100', category:'mastery', icon:'🏵',
    title:'Grand Maître', name:'Centenaire',
    description:'Monte un personnage au niveau 100.', target:100,
    reward:{ type:'gems', value:250 },
  },
  {
    id:'mastery_fights_100', category:'mastery', icon:'🤺',
    title:'Frère d\'Armes', name:'Compagnon de Route',
    description:'Livre 100 combats avec un même personnage dans ton équipe.', target:100,
    reward:{ type:'gems', value:15 },
  },
  {
    id:'mastery_fights_500', category:'mastery', icon:'⚔',
    title:'Vétéran', name:'Lien Indéfectible',
    description:'Livre 500 combats avec un même personnage.', target:500,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'mastery_fights_1000', category:'mastery', icon:'🗡️',
    title:'Âme Sœur', name:'Mille Batailles',
    description:'Livre 1 000 combats avec un même personnage.', target:1000,
    reward:{ type:'gems', value:80 },
  },
  {
    id:'mastery_wins_100', category:'mastery', icon:'🏆',
    title:'Champion Fidèle', name:'Cent Triomphes',
    description:'Vaincs 100 boss avec un même personnage dans ton équipe.', target:100,
    reward:{ type:'gems', value:200 },
  },
  {
    id:'mastery_full_1', category:'mastery', icon:'💯',
    title:'Maître Absolu', name:'Maîtrise 100 %',
    description:'Atteins 100 % de maîtrise sur un personnage.', target:1,
    reward:{ type:'title', value:'Maître Absolu' },
  },
  {
    id:'mastery_full_5', category:'mastery', icon:'🎼',
    title:'Virtuose', name:'Cinq Virtuoses',
    description:'Atteins 100 % de maîtrise sur 5 personnages.', target:5,
    reward:{ type:'gems', value:1200 },
    tier:'platinum',
  },

  // — Rang 7★ —
  {
    id:'rank7_1', category:'mastery', icon:'⭐',
    title:'Astre', name:'Étoile Filante',
    description:'Monte un personnage au rang 7★ maximum.', target:1,
    reward:{ type:'gems', value:40 },
    resetsOnPrestige:true,
  },
  {
    id:'rank7_5', category:'mastery', icon:'🌌',
    title:'Nébuleuse', name:'Constellation',
    description:'Monte 5 personnages différents au rang 7★.', target:5,
    reward:{ type:'gems', value:70 },
    resetsOnPrestige:true,
  },
  {
    id:'rank7_team', category:'mastery', icon:'🛡',
    title:'Garde d\'Élite', name:'Escouade d\'Élite',
    description:'Équipe une équipe complète (4/4) de personnages rang 7★.', target:1,
    reward:{ type:'gems', value:200 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'synergy_max', category:'mastery', icon:'🔗',
    title:'Harmonie Totale', name:'Synergie Parfaite',
    description:'Active une synergie d\'univers à son palier maximum.', target:1,
    reward:{ type:'gems', value:180 },
  },

  // ── ÉCONOMIE ────────────────────────────────────────────────────────────
  // — Posséder des Pixel-Coins —
  {
    id:'coins_1k', category:'economy', icon:'🪙',
    title:'Tirelire', name:'Mille Pièces',
    description:'Possède 1 000 Pixel-Coins.', target:1000,
    reward:{ type:'gems', value:5 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_100k', category:'economy', icon:'🪙',
    title:'Économe', name:'Cent Mille',
    description:'Possède 100 000 Pixel-Coins.', target:100000,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_1m', category:'economy', icon:'💵',
    title:'Nanti', name:'Un Million',
    description:'Possède 1 000 000 de Pixel-Coins.', target:1000000,
    reward:{ type:'gems', value:15 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_10m', category:'economy', icon:'💰',
    title:'Millionnaire', name:'Dix Millions',
    description:'Possède 10 000 000 de Pixel-Coins.', target:10000000,
    reward:{ type:'gems', value:20 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_1b', category:'economy', icon:'💎',
    title:'Oligarque', name:'Milliardaire',
    description:'Deviens milliardaire : possède 1 000 000 000 de Pixel-Coins.', target:1000000000,
    reward:{ type:'gems', value:40 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_10b', category:'economy', icon:'🏦',
    title:'Ploutocrate', name:'Au-delà des Étoiles',
    description:'Accumule 10 000 000 000 Pixel-Coins.', target:10000000000,
    reward:{ type:'gems', value:60 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'coins_100b', category:'economy', icon:'🏛',
    title:'Empereur', name:'Empereur Économique',
    description:'Accumule 100 000 000 000 Pixel-Coins.', target:100000000000,
    reward:{ type:'gems', value:100 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Dépenser des Pixel-Coins (cumul à vie) —
  {
    id:'spend_10k', category:'economy', icon:'🛍',
    title:'Client Fidèle', name:'Petites Dépenses',
    description:'Dépense 10 000 Pixel-Coins au total.', target:10000, stat:STAT.coinsSpent,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'spend_1m', category:'economy', icon:'💸',
    title:'Flambeur', name:'Train de Vie',
    description:'Dépense 1 000 000 de Pixel-Coins au total.', target:1000000, stat:STAT.coinsSpent,
    reward:{ type:'gems', value:40 },
  },

  // — Boutique et commerce —
  {
    id:'shop_first', category:'economy', icon:'🧾',
    title:'Premier Client', name:'Premier Achat',
    description:'Achète ton premier objet en Boutique ou à l\'Hôtel de Ville.', target:1, stat:STAT.shopPurchases,
    reward:{ type:'gems', value:5 },
  },
  {
    id:'shop_50', category:'economy', icon:'🛒',
    title:'Accro du Shopping', name:'Caddie Plein',
    description:'Effectue 50 achats en Boutique ou à l\'Hôtel de Ville.', target:50, stat:STAT.shopPurchases,
    reward:{ type:'gems', value:60 },
  },
  {
    id:'sell_first', category:'economy', icon:'🏷',
    title:'Marchand', name:'Première Vente',
    description:'Vends ton premier objet (inventaire ou Hôtel de Ville).', target:1, stat:STAT.itemsSold,
    reward:{ type:'gems', value:5 },
  },

  // — Gemmes et Orbes —
  {
    id:'gems_1000', category:'economy', icon:'💠',
    title:'Trésorier', name:'Trésor Sans Fond',
    description:'Possède 1 000 Neko-Gemmes en stock.', target:1000,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'gems_spent_10k', category:'economy', icon:'💎',
    title:'Mécène', name:'Pluie de Gemmes',
    description:'Dépense 10 000 Neko-Gemmes au total.', target:10000,
    reward:{ type:'gems', value:400 },
  },
  {
    id:'orbs_30', category:'economy', icon:'🔮',
    title:'Néant Incarné', name:'Le Vide t\'Appelle',
    description:'Accumule 30 Orbes du Néant.', target:30,
    reward:{ type:'gems', value:20 },
  },

  // ── DÉFIS ───────────────────────────────────────────────────────────────
  {
    id:'chal_streak_10', category:'challenges', icon:'🔥',
    title:'Invaincu', name:'Série Invaincue',
    description:'Remporte 10 victoires de boss consécutives sans défaite ni retraite.', target:10, stat:STAT.bossStreakMax,
    reward:{ type:'title', value:'Invaincu' },
  },
  {
    id:'chal_no_ult', category:'challenges', icon:'🚫',
    title:'Puriste', name:'Sans Filet',
    description:'Vaincs un boss du palier 15 ou plus sans utiliser le moindre ultime (aucun soin, aucun buff).', target:1, stat:CHAL.noUlt,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'chal_clean', category:'challenges', icon:'🪶',
    title:'Sans une Égratignure', name:'Parcours Immaculé',
    description:'Termine un palier 20+ sans aucune défaite ni retraite, et vaincs son boss en 30 secondes ou moins.', target:1, stat:CHAL.clean,
    reward:{ type:'gems', value:250 },
  },
  {
    id:'chal_fast_60', category:'challenges', icon:'⏱️',
    title:'Éclair', name:'Contre-la-Montre',
    description:'Vaincs un boss du palier 20 ou plus en moins de 60 secondes.', target:1, stat:CHAL.fast60,
    reward:{ type:'gems', value:120 },
  },
  {
    id:'chal_commons', category:'challenges', icon:'🪨',
    title:'Outsider', name:'L\'Union des Humbles',
    description:'Vaincs un boss du palier 5 ou plus avec une équipe de 4 personnages Communs uniquement.', target:1, stat:CHAL.commons,
    reward:{ type:'gems', value:200 },
  },
  {
    id:'chal_solo', category:'challenges', icon:'🧍',
    title:'Loup Solitaire', name:'Armée d\'Un Seul',
    description:'Vaincs un boss du palier 10 ou plus avec un seul personnage dans ton équipe.', target:1, stat:CHAL.solo,
    reward:{ type:'gems', value:200 },
  },
  {
    id:'chal_max_diff', category:'challenges', icon:'☠️',
    title:'Au Sommet', name:'Difficulté Maximale',
    description:`Vaincs le boss du dernier monde du multivers (palier ${WORLD_TOTAL}).`, target:1, stat:CHAL.maxDiff,
    reward:{ type:'gems', value:1500 },
    tier:'platinum',
  },

  // ── EXPLORATION ─────────────────────────────────────────────────────────
  // — Découvrir les mondes (paliers) —
  {
    id:'explore_zone_1', category:'exploration', icon:'🚪',
    title:'Explorateur', name:'Premier Horizon',
    description:'Découvre ta première nouvelle zone : atteins le palier 2.', target:2,
    reward:{ type:'gems', value:5 },
  },
  {
    id:'palier_5', category:'exploration', icon:'🌍',
    title:'Voyageur', name:'Cinq Mondes',
    description:'Découvre 5 zones : atteins le palier 5.', target:5,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'palier_10', category:'exploration', icon:'🌌',
    title:'Conquérant', name:'À Mi-Chemin',
    description:'Atteins le palier 10.', target:10,
    reward:{ type:'gems', value:50 },
  },
  {
    id:'palier_15', category:'exploration', icon:'🌠',
    title:'Dompteur de Mondes', name:'Quinze Univers',
    description:'Atteins le palier 15.', target:15,
    reward:{ type:'gems', value:100 },
  },
  {
    id:'palier_20', category:'exploration', icon:'👑',
    title:'Maître du Multivers', name:'Fin du Voyage',
    description:'Conquiers les 20 premiers paliers.', target:20,
    reward:{ type:'gems', value:500 },
    secret:true,
  },
  {
    id:'palier_40', category:'exploration', icon:'🏁',
    title:'Finisseur', name:'Le Bout du Voyage',
    description:'Atteins le palier 40, la fin du voyage...', target:40,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'explore_zone_all', category:'exploration', icon:'🗺️',
    title:'Cartographe', name:'Atlas Complet',
    description:`Découvre toutes les zones : les ${WORLD_TOTAL} mondes du multivers.`, target:WORLD_TOTAL,
    reward:{ type:'gems', value:2000 },
    tier:'platinum',
  },

  // — Recoins et secrets de l'interface —
  {
    id:'explore_pages', category:'exploration', icon:'🧭',
    title:'Curieux', name:'Tour du Propriétaire',
    description:'Visite toutes les sections du jeu au moins une fois.', target:EXPLORABLE_PAGES.length, stat:STAT.pagesVisited,
    reward:{ type:'gems', value:30 },
  },
  {
    id:'explore_interact_100', category:'exploration', icon:'👆',
    title:'Touche-à-Tout', name:'Mains Baladeuses',
    description:'Interagis avec 100 éléments de l\'interface.', target:100, stat:STAT.interactions,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'explore_passage', category:'exploration', icon:'🕳️',
    title:'Passe-Muraille', name:'Passage Secret',
    description:'Trouve le passage secret caché dans le logo du jeu.', target:1, stat:EGG.passage,
    reward:{ type:'gems', value:30 },
  },
  {
    id:'explore_object', category:'exploration', icon:'✧',
    title:'Œil de Lynx', name:'Objet Caché',
    description:'Attrape l\'éclat fugace qui apparaît parfois quelque part sur l\'écran.', target:1, stat:EGG.object,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'explore_room', category:'exploration', icon:'🚪',
    title:'Archiviste Secret', name:'Salle Secrète',
    description:'Découvre la salle secrète dissimulée dans la galerie des Trophées.', target:1, stat:EGG.room,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'explore_npc', category:'exploration', icon:'🐈‍⬛',
    title:'Ami des Chats', name:'PNJ Secret',
    description:'Salue le chat errant qui vient parfois jeter un œil à ton écran.', target:1, stat:EGG.npc,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'explore_all_secrets', category:'exploration', icon:'🗝️',
    title:'Gardien des Secrets', name:'Tous les Secrets',
    description:'Découvre tous les secrets de GachaVerse.', target:ALL_SECRET_KEYS.length, stat:STAT.secretsFound,
    reward:{ type:'title', value:'Gardien des Secrets' },
  },

  // ── ÉVÉNEMENTS ──────────────────────────────────────────────────────────
  {
    id:'event_seen', category:'events', icon:'📡',
    title:'Témoin', name:'Au Bon Moment',
    description:'Sois connecté quand un événement aléatoire se déclenche.', target:1, stat:STAT.eventsSeen,
    reward:{ type:'gems', value:5 },
  },
  {
    id:'event_join', category:'events', icon:'🎊',
    title:'Participant', name:'Dans la Mêlée',
    description:'Participe à un événement (Ardeur, Tempête ou Jackpot).', target:1, stat:STAT.eventsJoined,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'event_join_50', category:'events', icon:'🎆',
    title:'Fêtard', name:'Toujours Partant',
    description:'Participe à 50 événements.', target:50, stat:STAT.eventsJoined,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'event_pulls_10', category:'events', icon:'🎟',
    title:'Invocateur d\'Événement', name:'Bannière Événementielle',
    description:'Réalise 10 invocations sur la bannière événementielle (Vol.2).', target:10, stat:STAT.pullsVol2,
    reward:{ type:'gems', value:30 },
  },
  {
    id:'event_exclusive', category:'events', icon:'🎁',
    title:'Privilégié', name:'Édition Limitée',
    description:'Obtiens un personnage exclusif (Forge ou boss de raid, introuvable au gacha).', target:1,
    reward:{ type:'gems', value:200 },
  },
  {
    id:'event_secret_char', category:'events', icon:'😼',
    title:'Chasseur de Mythes', name:'Le Chat Doré',
    description:'Trouve le personnage secret qui ne se montre que pendant les événements.', target:1, stat:EGG.goldNeko,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'event_master', category:'events', icon:'🏅',
    title:'Maître des Festivités', name:'Grand Chelem',
    description:'Réussis parfaitement chaque événement : jauge d\'Ardeur au max, les 4 orbes de Tempête, un triple au Jackpot.', target:3, stat:STAT.eventsMastered,
    reward:{ type:'title', value:'Maître des Festivités' },
  },

  // ── SECRETS ─────────────────────────────────────────────────────────────
  // Tous masqués ("???", "Condition inconnue") jusqu'à leur découverte.
  {
    id:'secret_konami', category:'secrets', icon:'🎮',
    title:'Rétro Gamer', name:'Combinaison Secrète',
    description:'Tu as saisi le code légendaire : ↑ ↑ ↓ ↓ ← → ← → B A.', target:1, stat:EGG.konami,
    reward:{ type:'gems', value:67 },
  },
  {
    id:'secret_night', category:'secrets', icon:'🌙',
    title:'Oiseau de Nuit', name:'L\'Heure des Chats',
    description:'Tu jouais à 3h33 du matin. Les chats t\'ont vu.', target:1, stat:EGG.night,
    reward:{ type:'gems', value:50 },
  },
  {
    id:'secret_67', category:'secrets', icon:'🔢',
    title:'Numérologue', name:'Six-Seven',
    description:'Tu as possédé exactement 67 Neko-Gemmes. Coïncidence ?', target:1, stat:EGG.sixSeven,
    reward:{ type:'gems', value:67 },
  },
  {
    id:'secret_bankrupt', category:'secrets', icon:'🕳',
    title:'Beau Joueur', name:'Banqueroute',
    description:'Le Jackpot t\'a tout pris. Tu t\'en relèveras.', target:1, stat:EGG.bankrupt,
    reward:{ type:'gems', value:100 },
  },
  {
    id:'secret_trophy_rain', category:'secrets', icon:'🏆',
    title:'Easter Egg', name:'Pluie de Trophées',
    description:'Tu as tapoté le grand titre des Succès jusqu\'à faire pleuvoir des trophées.', target:1, stat:EGG.trophyRain,
    reward:{ type:'gems', value:50 },
  },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));

// ── Séries (succès à niveaux) ──────────────────────────────────────────────
// Plusieurs succès sur un même objectif (ex: vaincre 500 / 5 000 / 50 000
// monstres) sont affichés comme UNE seule carte à niveaux — chaque niveau
// reste un succès à part entière (id, progression, récompense et claim
// propres, rien ne change côté sauvegarde). Les niveaux d'une série doivent
// partager la même catégorie et le même `resetsOnPrestige` (vérifié par
// achievementStats.test.ts). Un succès absent de toute série reste une carte simple.
export interface AchievementSeries {
  id:   string;
  name: string;
  icon: string;
  ids:  string[];
}

export const ACHIEVEMENT_SERIES: AchievementSeries[] = [
  // Progression
  { id:'prestige',      name:'Cycle des Renaissances',     icon:'🔄', ids:['prestige_1', 'prestige_10', 'prestige_25'] },
  { id:'playtime',      name:'Temps de Jeu',               icon:'⏱', ids:['playtime_1h', 'playtime_100h', 'playtime_500h'] },
  { id:'upgrades',      name:'Améliorations',              icon:'⬆', ids:['upgrade_10', 'upgrade_200', 'upgrade_50'] },
  { id:'quests',        name:'Missions Accomplies',        icon:'📜', ids:['quest_10', 'quest_20', 'quest_50', 'quest_100', 'quest_500'] },
  // Gacha
  { id:'pulls',         name:'Invocations',                icon:'🎰', ids:['pull_1', 'pull_10', 'pull_100', 'pull_500', 'pull_1000', 'pull_5000'] },
  { id:'rarities',      name:'Haute Rareté',               icon:'✨', ids:['legendary_1', 'mythic_1'] },
  // Collection
  { id:'collect',       name:'Collection de Personnages',  icon:'👥', ids:['collect_1', 'collect_10', 'collect_5', 'collect_15', 'collect_30', 'collect_250', 'collect_all'] },
  { id:'compadex_char', name:'Compadex — Personnages',     icon:'📖', ids:['compadex_char_25', 'compadex_char_50', 'compadex_char_75', 'compadex_char_100'] },
  { id:'compadex_equip',name:'Compadex — Équipements',     icon:'🛡', ids:['compadex_equip_25', 'compadex_equip_50', 'compadex_equip_75', 'compadex_equip_100'] },
  { id:'transcendant',  name:'Transcendants',              icon:'🌈', ids:['transcendant_1', 'transcendant_3'] },
  { id:'shiny',         name:'Éditions Brillantes',        icon:'✨', ids:['gold_1', 'shiny_10'] },
  { id:'diamond',       name:'Éditions Diamant',           icon:'💠', ids:['diamond_1', 'diamond_3', 'diamond_10'] },
  { id:'trinity',       name:'Trinité',                    icon:'🔱', ids:['trio_perfect', 'pantheon_5'] },
  // Combat
  { id:'kills',         name:'Chasse aux Monstres',        icon:'⚔', ids:['kills_500', 'kills_5000', 'kills_50000', 'kills_500000', 'kills_1000000'] },
  { id:'bosses',        name:'Victoires contre les Boss',  icon:'💀', ids:['first_boss', 'bosses_5', 'bosses_10', 'bosses_20', 'bosses_67', 'bosses_100', 'bosses_1000'] },
  { id:'raid',          name:'Boss de Raid',               icon:'🐉', ids:['raid_boss_1', 'raid_boss_25'] },
  { id:'dps',           name:'Dégâts par Seconde',         icon:'💥', ids:['dps_1000', 'dps_100k', 'dps_1m', 'dps_100m', 'dps_1b'] },
  // Maîtrise
  { id:'mastery_lv',    name:"Niveau d'un Personnage",   icon:'🏵', ids:['mastery_lv_10', 'mastery_lv_50', 'mastery_lv_100'] },
  { id:'mastery_fights',name:"Combats d'un Personnage",  icon:'🤺', ids:['mastery_fights_100', 'mastery_fights_500', 'mastery_fights_1000'] },
  { id:'mastery_full',  name:'Maîtrise Totale',            icon:'💯', ids:['mastery_full_1', 'mastery_full_5'] },
  { id:'rank7',         name:'Rang 7★',                    icon:'⭐', ids:['rank7_1', 'rank7_5'] },
  // Économie
  { id:'coins',         name:'Fortune',                    icon:'🪙', ids:['coins_1k', 'coins_100k', 'coins_1m', 'coins_10m', 'coins_1b', 'coins_10b', 'coins_100b'] },
  { id:'spend',         name:'Dépenses',                   icon:'💸', ids:['spend_10k', 'spend_1m'] },
  { id:'shop',          name:'Achats',                     icon:'🛒', ids:['shop_first', 'shop_50'] },
  // Exploration
  { id:'worlds',        name:'Mondes Découverts',          icon:'🌍', ids:['explore_zone_1', 'palier_5', 'palier_10', 'palier_15', 'palier_20', 'palier_40', 'explore_zone_all'] },
  // Événements
  { id:'event_join',    name:'Participation aux Événements', icon:'🎊', ids:['event_join', 'event_join_50'] },
];

export const SERIES_BY_ACHIEVEMENT = new Map<string, AchievementSeries>(
  ACHIEVEMENT_SERIES.flatMap(s => s.ids.map(id => [id, s] as const))
);

/** Une carte de la page Succès : une série (plusieurs niveaux) ou un succès seul. */
export interface AchievementEntry {
  key:    string;
  series: AchievementSeries | null;
  levels: Achievement[];            // triés par target croissante
}

// Entrées dans l'ordre de ACHIEVEMENTS (position du premier niveau de chaque série).
export const ACHIEVEMENT_ENTRIES: AchievementEntry[] = (() => {
  const out: AchievementEntry[] = [];
  const seen = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    const series = SERIES_BY_ACHIEVEMENT.get(a.id);
    if (!series) { out.push({ key: a.id, series: null, levels: [a] }); continue; }
    if (seen.has(series.id)) continue;
    seen.add(series.id);
    const levels = series.ids.map(id => ACHIEVEMENT_BY_ID.get(id)!).sort((x, y) => x.target - y.target);
    out.push({ key: `series:${series.id}`, series, levels });
  }
  return out;
})();

export function isHiddenAchievement(a: Achievement): boolean {
  return a.category === 'secrets' || !!a.secret;
}

// Rang visuel d'un succès (bordure, trophées) — déduit de la récompense quand
// il n'est pas forcé.
export function getAchievementTier(a: Achievement): AchievTier {
  if (a.tier) return a.tier;
  if (a.reward?.type === 'title') return 'gold';
  const v = typeof a.reward?.value === 'number' ? a.reward.value : 0;
  if (v >= 800) return 'platinum';
  if (v >= 150) return 'gold';
  if (v >= 40)  return 'silver';
  return 'bronze';
}

export const TIER_META: Record<AchievTier, { label: string; color: string; glow: string; score: number }> = {
  bronze:   { label:'BRONZE',   color:'#d98b52', glow:'rgba(217,139,82,0.45)',  score:1 },
  silver:   { label:'ARGENT',   color:'#cbd5e1', glow:'rgba(203,213,225,0.45)', score:2 },
  gold:     { label:'OR',       color:'#fbbf24', glow:'rgba(251,191,36,0.55)',  score:3 },
  platinum: { label:'PLATINE',  color:'#a5f3fc', glow:'rgba(165,243,252,0.6)',  score:5 },
};

// ── Maîtrise par personnage ────────────────────────────────────────────────
// k = combats livrés (ennemis vaincus avec le perso dans l'équipe), w =
// victoires de boss de palier, lv = plus haut niveau jamais atteint, f = plus
// haute forme (évolution) jamais atteinte. Tout est "plus haut jamais atteint",
// jamais remis à zéro au Prestige.
export interface CharMastery { k: number; w: number; lv: number; f: number }

export interface MasteryMilestone {
  id:     string;
  label:  string;
  icon:   string;
  value:  number;
  target: number;
  done:   boolean;
}

// Paliers de maîtrise d'un personnage : niveau (plus haut jamais atteint),
// combats livrés (ennemis vaincus avec lui dans l'équipe) et boss vaincus.
// Les paliers de niveau sont les mêmes pour tous ; les combats et boss
// vaincus ci-dessous sont ceux d'un Commun, multipliés par
// MASTERY_RARITY_MULT selon la rareté du personnage (plus rare = plus dur).
const MASTERY_GOALS: { id: string; icon: string; key: keyof CharMastery; target: number; scaled: boolean }[] = [
  { id:'lv500',  icon:'⬆',  key:'lv', target:500,  scaled:false },
  { id:'lv1000', icon:'⬆',  key:'lv', target:1000, scaled:false },
  { id:'lv1500', icon:'⬆',  key:'lv', target:1500, scaled:false },
  { id:'lv2000', icon:'⏫', key:'lv', target:2000, scaled:false },
  { id:'lv2500', icon:'⏫', key:'lv', target:2500, scaled:false },
  { id:'lv3000', icon:'🔝', key:'lv', target:3000, scaled:false },
  { id:'k1',     icon:'⚔',  key:'k',  target:500,  scaled:true },
  { id:'k2',     icon:'⚔',  key:'k',  target:2000, scaled:true },
  { id:'k3',     icon:'⚔',  key:'k',  target:5000, scaled:true },
  { id:'w1',     icon:'💀', key:'w',  target:3,    scaled:true },
  { id:'w2',     icon:'💀', key:'w',  target:10,   scaled:true },
];

// Difficulté de la maîtrise par rareté (multiplicateur des combats et boss
// vaincus) : n = indice de la rareté (0 = Commun … 9 = Transcendant), arrondi
// à 1 décimale → 1 / 1.1 / 1.2 / 1.4 / 1.6 / 1.9 / 2.3 / 2.8 / 3.5 / 4.5.
const masteryRarityMult = (n: number) => Math.round(Math.exp(0.078 * n + 0.01 * n * n) * 10) / 10;

export const MASTERY_RARITY_MULT = Object.fromEntries(
  RARITY_ORDER_ASC.map((r, n) => [r, masteryRarityMult(n)])
) as Record<Rarity, number>;

const STAT_LABEL: Record<keyof CharMastery, (n: string) => string> = {
  lv: n => `Niveau ${n}`,
  k:  n => `${n} combats`,
  w:  n => `${n} boss vaincus`,
  f:  n => n,
};

function fmtGoal(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function getMasteryMilestones(m: CharMastery | undefined, rarity: Rarity = 'C'): MasteryMilestone[] {
  const e = m ?? { k: 0, w: 0, lv: 0, f: 0 };
  const mult = MASTERY_RARITY_MULT[rarity] ?? 1;
  return MASTERY_GOALS.map(g => {
    const target = g.scaled ? Math.round(g.target * mult) : g.target;
    return { id: g.id, label: STAT_LABEL[g.key](fmtGoal(target)), icon: g.icon, value: e[g.key], target, done: e[g.key] >= target };
  });
}

const MASTERY_GOAL_KEY = new Map(MASTERY_GOALS.map(g => [g.id, g.key]));

/**
 * Pourcentage de maîtrise (0-100) : moyenne de l'avancement de chaque palier.
 * Pour une même stat, seuls les paliers validés et le palier suivant comptent :
 * au niveau 1300, 500 et 1000 comptent pleinement, 1500 partiellement, et
 * 2000+ pas du tout tant que 1500 n'est pas validé.
 */
export function getMasteryPct(milestones: MasteryMilestone[]): number {
  if (milestones.length === 0) return 0;
  const blocked = new Set<string>();
  const sum = milestones.reduce((s, m) => {
    const key = MASTERY_GOAL_KEY.get(m.id) ?? m.id;
    if (blocked.has(key)) return s;
    if (!m.done) blocked.add(key);
    return s + Math.min(1, m.value / m.target);
  }, 0);
  return Math.floor((sum / milestones.length) * 100);
}

// Bonus de DPS accordé au personnage lui-même selon sa maîtrise.
export const MASTERY_DPS_TIERS: { pct: number; bonus: number }[] = [
  { pct: 25,  bonus: 0.05 },
  { pct: 50,  bonus: 0.10 },
  { pct: 75,  bonus: 0.15 },
  { pct: 100, bonus: 0.20 },
];

export function getMasteryDpsBonus(pct: number): number {
  let bonus = 0;
  for (const t of MASTERY_DPS_TIERS) if (pct >= t.pct) bonus = t.bonus;
  return bonus;
}

/** Multiplicateur de DPS (≥ 1) d'un personnage d'après sa maîtrise. */
export function getMasteryDpsMult(m: CharMastery | undefined, rarity: Rarity = 'C'): number {
  if (!m) return 1;
  return 1 + getMasteryDpsBonus(getMasteryPct(getMasteryMilestones(m, rarity)));
}
