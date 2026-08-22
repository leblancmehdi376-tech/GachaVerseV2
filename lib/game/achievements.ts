// lib/game/achievements.ts — Définition de tous les succès GachaVerse

import { CHARACTER_POOL } from './characters';

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
  reward?: {
    type:  'title' | 'gems' | 'coins';
    value: number | string;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── COMBAT ──────────────────────────────────────────────────────────────
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
  },
  {
    id:'kills_5000', category:'combat', icon:'💥',
    title:'Faucheur', name:'Purge Totale',
    description:'Vaincs 5 000 monstres au total.', target:5000,
    reward:{ type:'gems', value:50 },
  },
  {
    id:'kills_50000', category:'combat', icon:'🔥',
    title:'Fléau', name:'Apocalypse Ambulante',
    description:'Vaincs 50 000 monstres au total.', target:50000,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'kills_500000', category:'combat', icon:'☄',
    title:'Annihilateur', name:'Fin du Monde',
    description:'Vaincs 500 000 monstres au total.', target:500000,
    reward:{ type:'gems', value:500 },
    secret:true,
  },
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
    id:'dps_1000', category:'combat', icon:'📈',
    title:'Puissant', name:'Machine de Guerre',
    description:'Atteins 1 000 DPS.', target:1000,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'dps_1m', category:'combat', icon:'🌊',
    title:'Dévastateur', name:'Force Brute',
    description:'Atteins 1 000 000 DPS.', target:1000000,
    reward:{ type:'gems', value:50 },
  },

  // ── PROGRESSION ──────────────────────────────────────────────────────────
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
    id:'coins_100k', category:'progression', icon:'🪙',
    title:'Économe', name:'Cent Mille',
    description:'Accumule 100 000 Pixel-Coins.', target:100000,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'coins_10m', category:'progression', icon:'💰',
    title:'Millionnaire', name:'Dix Millions',
    description:'Accumule 10 000 000 Pixel-Coins.', target:10000000,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'coins_1b', category:'progression', icon:'💎',
    title:'Oligarque', name:'Milliardaire',
    description:'Accumule 1 000 000 000 Pixel-Coins.', target:1000000000,
    reward:{ type:'gems', value:200 },
    secret:true,
  },
  {
    id:'upgrade_10', category:'progression', icon:'⬆',
    title:'Optimisateur', name:'Toujours Plus Fort',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 50 fois au total.', target:50,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'upgrade_50', category:'progression', icon:'🔧',
    title:'Forgeron', name:'Perfectionniste',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 500 fois au total.', target:500,
    reward:{ type:'gems', value:50 },
  },

  // ── COLLECTION ──────────────────────────────────────────────────────────
  {
    id:'collect_1', category:'collection', icon:'🐣',
    title:'Recruteur', name:'Premier Allié',
    description:'Obtiens ton premier personnage.', target:1,
    reward:{ type:'gems', value:5 },
  },
  {
    id:'collect_5', category:'collection', icon:'👥',
    title:'Meneur', name:'L\'Équipe se Forme',
    description:'Obtiens 50 personnages différents.', target:50,
    reward:{ type:'gems', value:30 },
  },
  {
    id:'collect_15', category:'collection', icon:'🏛',
    title:'Archiviste', name:'Petite Collection',
    description:'Obtiens 100 personnages différents.', target:100,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'collect_30', category:'collection', icon:'📚',
    title:'Collectionneur', name:'Bibliothèque',
    description:'Obtiens 150 personnages différents.', target:150,
    reward:{ type:'gems', value:400 },
  },
  {
    id:'collect_all', category:'collection', icon:'🌟',
    title:'Complétiste', name:'Tout Attraper',
    description:'Débloque tous les personnages.', target:CHARACTER_POOL.length,
    reward:{ type:'gems', value:1500 },
    secret:true,
  },
  {
    id:'legendary_1', category:'collection', icon:'✨',
    title:'Chanceux', name:'Or Pur',
    description:'Obtiens un personnage Légendaire.', target:1,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'transcendant_1', category:'collection', icon:'🌈',
    title:'Élu', name:'Au-Delà de Tout',
    description:'Obtiens un personnage Transcendant.', target:1,
    reward:{ type:'gems', value:400 },
    secret:true,
  },
  {
    id:'equip_team', category:'collection', icon:'⚙',
    title:'Tacticien', name:'Équipe Complète',
    description:'Équipe les 4 emplacements d\'allié.', target:4,
    reward:{ type:'gems', value:15 },
  },

  // ── GACHA ────────────────────────────────────────────────────────────────
  {
    id:'pull_1', category:'gacha', icon:'🎰',
    title:'Joueur', name:'Premier Tirage',
    description:'Effectue ton premier tirage.', target:1,
    reward:{ type:'gems', value:5 },
  },
  {
    id:'pull_10', category:'gacha', icon:'🎲',
    title:'Parieur', name:'Dix Invocations',
    description:'Effectue 10 tirages.', target:10,
    reward:{ type:'gems', value:10 },
  },
  {
    id:'pull_100', category:'gacha', icon:'🎯',
    title:'Invocateur', name:'Cent Tirages',
    description:'Effectue 100 tirages.', target:100,
    reward:{ type:'gems', value:30 },
  },
  {
    id:'pull_500', category:'gacha', icon:'🔮',
    title:'Grand Invocateur', name:'Cinq Cents Tirages',
    description:'Effectue 500 tirages.', target:500,
    reward:{ type:'gems', value:150 },
    secret:true,
  },
  {
    id:'quest_10', category:'social', icon:'📜',
    title:'Serviteur', name:'Dix Missions',
    description:'Complète 10 quêtes.', target:10,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'quest_20', category:'social', icon:'📯',
    title:'Émissaire', name:'Vingt Missions',
    description:'Complète 20 quêtes.', target:20,
    reward:{ type:'gems', value:45 },
  },
  {
    id:'quest_50', category:'social', icon:'🗺',
    title:'Aventurier', name:'Cinquante Missions',
    description:'Complète 50 quêtes.', target:50,
    reward:{ type:'gems', value:80 },
  },
  {
    id:'quest_100', category:'social', icon:'🏅',
    title:'Légat', name:'Cent Missions',
    description:'Complète 100 quêtes.', target:100,
    reward:{ type:'gems', value:180 },
  },

  // ── DIFFICILES — ÉDITIONS SHINY ────────────────────────────────────────
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
    id:'shiny_10', category:'collection', icon:'🌟',
    title:'Scintillant', name:'Collection Étincelante',
    description:'Possède 10 cartes Or ou Diamant au total.', target:10,
    reward:{ type:'gems', value:550 },
  },
  {
    id:'trio_perfect', category:'collection', icon:'🔱',
    title:'Trinité', name:'Trio Parfait',
    description:'Possède un même personnage en Base, Or ET Diamant.', target:1,
    reward:{ type:'gems', value:300 },
    secret:true,
  },
  {
    id:'diamond_3', category:'collection', icon:'👑',
    title:'Prisme Absolu', name:'Le Nec Plus Ultra',
    description:'Possède 3 personnages Diamant différents.', target:3,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },

  // ── DIFFICILES — RANG & PUISSANCE ──────────────────────────────────────
  {
    id:'rank7_1', category:'collection', icon:'⭐',
    title:'Astre', name:'Étoile Filante',
    description:'Monte un personnage au rang 7★ maximum.', target:1,
    reward:{ type:'gems', value:40 },
  },
  {
    id:'rank7_5', category:'collection', icon:'🌌',
    title:'Nébuleuse', name:'Constellation',
    description:'Monte 5 personnages différents au rang 7★.', target:5,
    reward:{ type:'gems', value:70 },
  },
  {
    id:'rank7_team', category:'collection', icon:'🛡',
    title:'Garde d\'Élite', name:'Escouade d\'Élite',
    description:'Équipe une équipe complète (4/4) de personnages rang 7★.', target:1,
    reward:{ type:'gems', value:200 },
    secret:true,
  },
  {
    id:'dps_100m', category:'combat', icon:'💢',
    title:'Cataclysme', name:'Puissance Infinie',
    description:'Atteins 100 000 000 DPS.', target:100000000,
    reward:{ type:'gems', value:600 },
    secret:true,
  },

  // ── DIFFICILES — ÉCONOMIE ───────────────────────────────────────────────
  {
    id:'coins_10b', category:'progression', icon:'🏦',
    title:'Ploutocrate', name:'Au-delà des Étoiles',
    description:'Accumule 10 000 000 000 Pixel-Coins.', target:10000000000,
    reward:{ type:'gems', value:600 },
    secret:true,
  },
  {
    id:'gems_1000', category:'progression', icon:'💠',
    title:'Trésorier', name:'Trésor Sans Fond',
    description:'Accumule 1 000 Neko-Gemmes en stock.', target:1000,
    reward:{ type:'gems', value:150 },
  },
  {
    id:'crowns_50', category:'combat', icon:'👑',
    title:'Souverain', name:'Souverain',
    description:'Obtiens 50 Couronnes de Boss au total.', target:50,
    reward:{ type:'gems', value:200 },
  },
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

  // ── DIFFICILES — COMBAT & DIVERS ───────────────────────────────────────
  {
    id:'bosses_100', category:'combat', icon:'⚰',
    title:'Fossoyeur', name:'Chasseur de Titans',
    description:'Vaincs 100 boss au total.', target:100,
    reward:{ type:'gems', value:250 },
  },
  {
    id:'orbs_30', category:'progression', icon:'🔮',
    title:'Néant Incarné', name:'Le Vide t\'Appelle',
    description:'Accumule 30 Orbes du Néant.', target:30,
    reward:{ type:'gems', value:20 },
  },
  {
    id:'titles_25', category:'social', icon:'🎖',
    title:'Décoré', name:'Collectionneur de Titres',
    description:'Débloque 25 titres différents.', target:25,
    reward:{ type:'gems', value:300 },
  },
  {
    id:'pull_1000', category:'gacha', icon:'🌀',
    title:'Insatiable', name:'Chance Insolente',
    description:'Effectue 1 000 tirages gacha.', target:1000,
    reward:{ type:'gems', value:400 },
  },
  {
    id:'synergy_max', category:'collection', icon:'🔗',
    title:'Harmonie Totale', name:'Synergie Parfaite',
    description:'Active une synergie d\'univers à son palier maximum.', target:1,
    reward:{ type:'gems', value:180 },
  },
  {
    id:'upgrade_200', category:'progression', icon:'⚒',
    title:'Maître Artisan', name:'Maître Artisan',
    description:'Améliore un personnage, ton héros ou ton Coffre d\'Or 200 fois au total.', target:200,
    reward:{ type:'gems', value:300 },
  },

  // ── EXTRÊMEMENT DIFFICILES ──────────────────────────────────────────────
  {
    id:'diamond_10', category:'collection', icon:'💎',
    title:'Éternel', name:'Diamant Éternel',
    description:'Possède 10 personnages différents en édition Diamant.', target:10,
    reward:{ type:'gems', value:2000 },
    secret:true,
  },
  {
    id:'palier_40', category:'progression', icon:'🏁',
    title:'Finisseur', name:'Le Bout du Voyage',
    description:'Atteins le palier 40, la fin du voyage.', target:40,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'dps_1b', category:'combat', icon:'🌀',
    title:'Singularité', name:'Singularité',
    description:'Atteins 1 000 000 000 DPS.', target:1000000000,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'coins_100b', category:'progression', icon:'🏛',
    title:'Empereur', name:'Empereur Économique',
    description:'Accumule 100 000 000 000 Pixel-Coins.', target:100000000000,
    reward:{ type:'gems', value:1200 },
    secret:true,
  },
  {
    id:'prestige_25', category:'progression', icon:'🔄',
    title:'Renaissant', name:'Renaissance Infinie',
    description:'Atteins le niveau 20 de Prestige.', target:20,
    reward:{ type:'gems', value:1500 },
    secret:true,
  },
  {
    id:'pantheon_5', category:'collection', icon:'🏺',
    title:'Architecte du Panthéon', name:'Panthéon Complet',
    description:'Possède 5 personnages différents en Base, Or ET Diamant à la fois.', target:5,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'transcendant_3', category:'collection', icon:'🌈',
    title:'Élu Suprême', name:'Élu des Élus',
    description:'Possède 3 personnages Transcendants différents.', target:3,
    reward:{ type:'gems', value:1800 },
    secret:true,
  },
  {
    id:'pull_5000', category:'gacha', icon:'🎡',
    title:'Insatiable Absolu', name:'Addiction Sans Limite',
    description:'Effectue 5 000 tirages gacha.', target:5000,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'quest_500', category:'social', icon:'📖',
    title:'Légende Vivante', name:'Héros Légendaire',
    description:'Complète 500 quêtes au total.', target:500,
    reward:{ type:'gems', value:1000 },
    secret:true,
  },
  {
    id:'kills_1000000', category:'combat', icon:'🔥',
    title:'Apocalypse', name:'Extermination Totale',
    description:'Vaincs 1 000 000 de monstres à vie.', target:1000000,
    reward:{ type:'gems', value:1000 },
    secret:true,
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
