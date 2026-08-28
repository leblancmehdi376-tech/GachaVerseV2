// lib/game/achievements.ts — Définition de tous les succès GachaVerse

import { CHARACTER_POOL } from './characters';
import { EQUIPMENT_DEFS } from './items';

// Totaux du Compadex — voir la section COMPADEX ci-dessous. Exportés pour que
// hooks/useAchievementTrackers.ts puisse détecter la complétion à 100% sans
// dupliquer CHARACTER_POOL.length / Object.keys(EQUIPMENT_DEFS).length.
export const COMPADEX_CHAR_TOTAL = CHARACTER_POOL.length;
export const COMPADEX_EQUIP_TOTAL = Object.keys(EQUIPMENT_DEFS).length;

export type AchievCategory = 'combat' | 'collection' | 'gacha' | 'progression' | 'social';

export interface Achievement {
  id:          string;
  category:    AchievCategory;
  icon:        string;
  title:       string;           // titre débloquable
  name:        string;           // nom du succès
  description: string;
  target:      number;           // valeur cible
  secret?:     boolean;
  // true : progression/déblocage/récompense remis à zéro à chaque Prestige
  // (succès "de run" — kills, dps, coins, pulls, améliorations, collection
  // en cours, quêtes, rang 7★). Par défaut (absent/false) : permanent, comme
  // les titres, les éditions shiny et tout ce qui touche à la progression
  // de Prestige elle-même.
  resetsOnPrestige?: boolean;
  reward?: {
    type:  'title' | 'gems' | 'coins';
    value: number | string;
  };
}

// Regroupés par category (voir AchievCategory), puis par thème de description
// au sein de chaque catégorie (ex: tous les "kills_*" ensemble, tous les
// "dps_*" ensemble...), triés par target croissante dans chaque sous-groupe.
// Quand un succès n'a pas d'équivalent thématique dans sa catégorie, il forme
// son propre groupe d'un seul élément, ordonné par target parmi les autres.
export const ACHIEVEMENTS: Achievement[] = [
  // ── COMBAT ──────────────────────────────────────────────────────────────
  // — Vaincre des monstres —
  {
    id:'kills_1', category:'combat', icon:'🗡',
    title:'Premier Sang', name:'Baptême du Feu',
    description:'Vaincs ton premier monstre.', target:1,
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

  // — Vaincre des boss —
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
    title:'Fossoyeur', name:'Chasseur de Titans',
    description:'Vaincs 100 boss au total.', target:100,
    reward:{ type:'gems', value:250 },
  },

  // — Atteindre un DPS —
  {
    id:'dps_1000', category:'combat', icon:'📈',
    title:'Puissant', name:'Machine de Guerre',
    description:'Atteins 1 000 DPS.', target:1000,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'dps_1m', category:'combat', icon:'🌊',
    title:'Dévastateur', name:'Force Brute',
    description:'Atteins 1 000 000 DPS.', target:1000000,
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

  // — Couronnes de Boss (sans équivalent thématique) —
  {
    id:'crowns_50', category:'combat', icon:'👑',
    title:'Souverain', name:'Souverain',
    description:'Obtiens 50 Couronnes de Boss au total.', target:50,
    reward:{ type:'gems', value:200 },
  },

  // ── PROGRESSION ──────────────────────────────────────────────────────────
  // — Atteindre un palier —
  {
    id:'palier_5', category:'progression', icon:'🌍',
    title:'Voyageur', name:'Cinq Mondes',
    description:'Atteins le palier 5.', target:5,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'palier_10', category:'progression', icon:'🌌',
    title:'Conquérant', name:'À Mi-Chemin',
    description:'Atteins le palier 10.', target:10,
    reward:{ type:'gems', value:50 },
  },
  {
    id:'palier_15', category:'progression', icon:'🌠',
    title:'Dompteur de Mondes', name:'Quinze Univers',
    description:'Atteins le palier 15.', target:15,
    reward:{ type:'gems', value:100 },
  },
  {
    id:'palier_20', category:'progression', icon:'👑',
    title:'Maître du Multivers', name:'Fin du Voyage',
    description:'Conquiers les 20 paliers.', target:20,
    reward:{ type:'gems', value:500 },
    secret:true,
  },
  {
    id:'palier_40', category:'progression', icon:'🏁',
    title:'Finisseur', name:'Le Bout du Voyage',
    description:'Atteins le palier 40, la fin du voyage.', target:40,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },

  // — Accumuler des Pixel-Coins —
  {
    id:'coins_100k', category:'progression', icon:'🪙',
    title:'Économe', name:'Cent Mille',
    description:'Accumule 100 000 Pixel-Coins.', target:100000,
    reward:{ type:'gems', value:10 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_10m', category:'progression', icon:'💰',
    title:'Millionnaire', name:'Dix Millions',
    description:'Accumule 10 000 000 Pixel-Coins.', target:10000000,
    reward:{ type:'gems', value:20 },
    resetsOnPrestige:true,
  },
  {
    id:'coins_1b', category:'progression', icon:'💎',
    title:'Oligarque', name:'Milliardaire',
    description:'Accumule 1 000 000 000 Pixel-Coins.', target:1000000000,
    reward:{ type:'gems', value:40 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'coins_10b', category:'progression', icon:'🏦',
    title:'Ploutocrate', name:'Au-delà des Étoiles',
    description:'Accumule 10 000 000 000 Pixel-Coins.', target:10000000000,
    reward:{ type:'gems', value:60 },
    secret:true,
    resetsOnPrestige:true,
  },
  {
    id:'coins_100b', category:'progression', icon:'🏛',
    title:'Empereur', name:'Empereur Économique',
    description:'Accumule 100 000 000 000 Pixel-Coins.', target:100000000000,
    reward:{ type:'gems', value:100 },
    secret:true,
    resetsOnPrestige:true,
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

  // — Prestige —
  {
    id:'prestige_1', category:'progression', icon:'🔄',
    title:'Réincarné', name:'Nouveau Départ',
    description:'Effectue ton premier Prestige.', target:1,
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

  // — Accumuler une ressource (sans équivalent thématique chacune) —
  {
    id:'gems_1000', category:'progression', icon:'💠',
    title:'Trésorier', name:'Trésor Sans Fond',
    description:'Accumule 1 000 Neko-Gemmes en stock.', target:1000,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'orbs_30', category:'progression', icon:'🔮',
    title:'Néant Incarné', name:'Le Vide t\'Appelle',
    description:'Accumule 30 Orbes du Néant.', target:30,
    reward:{ type:'gems', value:20 },
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
    id:'collect_5', category:'collection', icon:'👥',
    title:'Meneur', name:'L\'Équipe se Forme',
    description:'Obtiens 50 personnages différents.', target:50,
    reward:{ type:'gems', value:30 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_15', category:'collection', icon:'🏛',
    title:'Archiviste', name:'Petite Collection',
    description:'Obtiens 100 personnages différents.', target:100,
    reward:{ type:'gems', value:150 },
    resetsOnPrestige:true,
  },
  {
    id:'collect_30', category:'collection', icon:'📚',
    title:'Collectionneur', name:'Bibliothèque',
    description:'Obtiens 150 personnages différents.', target:150,
    reward:{ type:'gems', value:400 },
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
    title:'🌌 Rassembleur d\'Âmes', name:'Compadex Complet — Personnages',
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

  // — Même personnage en Base + Or + Diamant —
  {
    id:'trio_perfect', category:'collection', icon:'🔱',
    title:'Trinité', name:'Trio Parfait',
    description:'Possède un même personnage en Base, Or ET Diamant.', target:1,
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

  // — Rang 7★ —
  {
    id:'rank7_1', category:'collection', icon:'⭐',
    title:'Astre', name:'Étoile Filante',
    description:'Monte un personnage au rang 7★ maximum.', target:1,
    reward:{ type:'gems', value:40 },
    resetsOnPrestige:true,
  },
  {
    id:'rank7_5', category:'collection', icon:'🌌',
    title:'Nébuleuse', name:'Constellation',
    description:'Monte 5 personnages différents au rang 7★.', target:5,
    reward:{ type:'gems', value:70 },
    resetsOnPrestige:true,
  },
  {
    id:'rank7_team', category:'collection', icon:'🛡',
    title:'Garde d\'Élite', name:'Escouade d\'Élite',
    description:'Équipe une équipe complète (4/4) de personnages rang 7★.', target:1,
    reward:{ type:'gems', value:200 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Sans équivalent thématique —
  {
    id:'legendary_1', category:'collection', icon:'✨',
    title:'Chanceux', name:'Or Pur',
    description:'Obtiens un personnage Légendaire.', target:1,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'equip_team', category:'collection', icon:'⚙',
    title:'Tacticien', name:'Équipe Complète',
    description:'Équipe les 4 emplacements d\'allié.', target:4,
    reward:{ type:'gems', value:15 },
  },
  {
    id:'synergy_max', category:'collection', icon:'🔗',
    title:'Harmonie Totale', name:'Synergie Parfaite',
    description:'Active une synergie d\'univers à son palier maximum.', target:1,
    reward:{ type:'gems', value:180 },
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

  // ── SOCIAL (MISSIONS) ────────────────────────────────────────────────────
  // — Compléter des quêtes —
  {
    id:'quest_10', category:'social', icon:'📜',
    title:'Serviteur', name:'Dix Missions',
    description:'Complète 10 quêtes.', target:10,
    reward:{ type:'gems', value:20 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_20', category:'social', icon:'📯',
    title:'Émissaire', name:'Vingt Missions',
    description:'Complète 20 quêtes.', target:20,
    reward:{ type:'gems', value:45 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_50', category:'social', icon:'🗺',
    title:'Aventurier', name:'Cinquante Missions',
    description:'Complète 50 quêtes.', target:50,
    reward:{ type:'gems', value:80 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_100', category:'social', icon:'🏅',
    title:'Légat', name:'Cent Missions',
    description:'Complète 100 quêtes.', target:100,
    reward:{ type:'gems', value:180 },
    resetsOnPrestige:true,
  },
  {
    id:'quest_500', category:'social', icon:'📖',
    title:'Légende Vivante', name:'Héros Légendaire',
    description:'Complète 500 quêtes au total.', target:500,
    reward:{ type:'gems', value:1000 },
    secret:true,
    resetsOnPrestige:true,
  },

  // — Sans équivalent thématique —
  {
    id:'titles_25', category:'social', icon:'🎖',
    title:'Décoré', name:'Collectionneur de Titres',
    description:'Débloque 25 titres différents.', target:25,
    reward:{ type:'gems', value:300 },
  },
];

// Catégorie label
export const CATEGORY_LABELS: Record<AchievCategory, string> = {
  combat:      '⚔ COMBAT',
  collection:  '📚 COLLECTION',
  gacha:       '🎰 GACHA',
  progression: '📈 PROGRESSION',
  social:      '📜 MISSIONS',
};
