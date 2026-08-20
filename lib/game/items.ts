// ── Objets d'évolution ─────────────────────────────────────────────────
// Items obtenus via les boss d'événement, stockés dans l'inventaire du
// joueur (gameStore.inventory), et consommés pour débloquer certaines
// évolutions spéciales (voir EvoForm.requiredItemId dans characters.ts).

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sellGems: number; // Gemmes obtenues au recyclage
}

export const ITEM_DEFS: Record<string, ItemDef> = {
  elixir_vie: {
    id: 'elixir_vie', name: 'Élixir de Vie', icon: '🧪', color: '#4ade80',
    description: "Débloque la 1ère évolution de Sung Jin Woo.",
    sellGems: 100,
  },
  manteau_ombre: {
    id: 'manteau_ombre', name: "Manteau de l'Ombre", icon: '🧥', color: '#818cf8',
    description: "Débloque la 2ème évolution de Sung Jin Woo.",
    sellGems: 100,
  },
  beru: {
    id: 'beru', name: 'Beru', icon: '🐜', color: '#a855f7',
    description: "Débloque l'évolution finale de Sung Jin Woo.",
    sellGems: 100,
  },
  cristal_ether: {
    id: 'cristal_ether', name: 'Cristal d’Éther', icon: '💎', color: '#38bdf8',
    description: 'Matériau d’évolution requis pour Arthur Leywin.',
    sellGems: 100,
  },
  epee_ether: {
    id: 'epee_ether', name: 'Épée d’Éther', icon: '⚔️', color: '#f59e0b',
    description: 'Arme d’évolution requise pour Arthur Leywin.',
    sellGems: 100,
  },
  sylvia: {
    id: 'sylvia', name: 'Sylvia', icon: '👑', color: '#f97316',
    description: 'Trophée de Sylvia, utilisé pour la dernière évolution d’Arthur Leywin.',
    sellGems: 100,
  },
  masque_cid: {
    id: 'masque_cid', name: 'Masque de Cid', icon: '🎭', color: '#a78bfa',
    description: "Débloque la 1ère évolution de Cid Kagenou (Shadow).",
    sellGems: 100,
  },
  epee_slime: {
    id: 'epee_slime', name: 'Épée de Slime', icon: '🗡️', color: '#38bdf8',
    description: "Débloque la 2ème évolution de Cid Kagenou (John Smith).",
    sellGems: 100,
  },
  slime_eminence: {
    id: 'slime_eminence', name: 'Slime', icon: '🫧', color: '#67e8f9',
    description: "Armure de slime de l'Éminence de l'Ombre — trophée rare.",
    sellGems: 250,
  },
};

export interface EquipmentDef {
  id: string;
  name: string;
  slot: 'helmet' | 'chest' | 'pants' | 'boots' | 'weapon';
  rarity: string;
  description: string;
  icon: string;
  color: string;
  dpsMultiplier: number;
  recycleValue: number;
  bonusFor?: {
    templateId: string | string[]; // un seul perso, ou plusieurs (ex: Aizen ET Aizen Transcendant)
    multiplier: number;
    description: string;
  };
}

// Rééquilibrage v2.5 : les 10 raretés d'équipement s'alignent désormais sur
// celles des personnages (C,U,R,E,L,M,S,CO,P,T — cf. types/game.ts Rarity et
// gacha.ts RARITY_ORDER). Le multiplicateur de base est uniforme par palier
// de rareté (peu importe le slot), et chaque personnage de rareté T/P/CO
// dispose d'un équipement personnalisé à son tier, avec un bonus perso
// uniforme par tier (T:2.45, P:2.15, CO:2.0).
const RARITY_BASE_MULT: Record<string, number> = {
  C: 1.05, U: 1.08, R: 1.12, E: 1.17, L: 1.23, M: 1.3, S: 1.38, CO: 1.47, P: 1.57, T: 1.68,
};
const RARITY_RECYCLE_VALUE: Record<string, number> = {
  C: 1000, U: 2500, R: 4500, E: 13000, L: 80000, M: 300000, S: 900000, CO: 2500000, P: 6500000, T: 9000000,
};
const PERSO_BONUS_MULT: Record<'T' | 'P' | 'CO', number> = { T: 2.0, P: 1.85, CO: 1.7 };

export const EQUIPMENT_DEFS: Record<string, EquipmentDef> = {
  // Casques
  helmet_common: {
    id: 'helmet_common', name: 'Casque Commun', slot:'helmet', rarity:'C', icon:'⛑', color:'#9ca3af',
    description:'Casque robuste pour les débutants.', dpsMultiplier:RARITY_BASE_MULT.C, recycleValue:RARITY_RECYCLE_VALUE.C,
  },
  helmet_uncommon: {
    id: 'helmet_uncommon', name: 'Casque Peu Commun', slot:'helmet', rarity:'U', icon:'🧢', color:'#4ade80',
    description:'Casque amélioré pour les aventuriers expérimentés.', dpsMultiplier:RARITY_BASE_MULT.U, recycleValue:RARITY_RECYCLE_VALUE.U,
  },
  helmet_rare: {
    id: 'helmet_rare', name: 'Casque Rare', slot:'helmet', rarity:'R', icon:'🪖', color:'#60a5fa',
    description:'Casque plus résistant et élégant.', dpsMultiplier:RARITY_BASE_MULT.R, recycleValue:RARITY_RECYCLE_VALUE.R,
  },
  helmet_epic: {
    id: 'helmet_epic', name: 'Casque Épique', slot:'helmet', rarity:'E', icon:'🥽', color:'#c084fc',
    description:'Casque enchanté aux propriétés offensives.', dpsMultiplier:RARITY_BASE_MULT.E, recycleValue:RARITY_RECYCLE_VALUE.E,
  },
  helmet_legendary: {
    id: 'helmet_legendary', name: 'Casque Légendaire', slot:'helmet', rarity:'L', icon:'🥷', color:'#fbbf24',
    description:'Casque mythique issu des batailles anciennes.', dpsMultiplier:RARITY_BASE_MULT.L, recycleValue:RARITY_RECYCLE_VALUE.L,
  },
  helmet_mythique: {
    id: 'helmet_mythique', name: 'Casque Mythique', slot:'helmet', rarity:'M', icon:'👺', color:'#f87171',
    description:'Casque forgé selon des légendes oubliées.', dpsMultiplier:RARITY_BASE_MULT.M, recycleValue:RARITY_RECYCLE_VALUE.M,
  },
  helmet_stellar: {
    id: 'helmet_stellar', name: 'Casque Stellaire', slot:'helmet', rarity:'S', icon:'💫', color:'#e2e8f0',
    description:'Casque taillé dans la poussière d’étoiles.', dpsMultiplier:RARITY_BASE_MULT.S, recycleValue:RARITY_RECYCLE_VALUE.S,
  },
  helmet_cosmic: {
    id: 'helmet_cosmic', name: 'Casque Cosmique', slot:'helmet', rarity:'CO', icon:'🌠', color:'#34d399',
    description:'Casque imprégné de l’énergie du cosmos.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
  },
  helmet_primordial: {
    id: 'helmet_primordial', name: 'Casque Primordial', slot:'helmet', rarity:'P', icon:'👑', color:'#ff6b35',
    description:'Casque porté par les premiers héros.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:RARITY_RECYCLE_VALUE.P,
  },
  helmet_transcendant: {
    id: 'helmet_transcendant', name: 'Casque Transcendant', slot:'helmet', rarity:'T', icon:'😈', color:'#e879f9',
    description:'Casque ayant dépassé les limites du mortel.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:RARITY_RECYCLE_VALUE.T,
  },

  // Plastrons
  chest_common: {
    id: 'chest_common', name: 'Plastron Commun', slot:'chest', rarity:'C', icon:'🛡', color:'#9ca3af',
    description:'Plastron léger et fiable.', dpsMultiplier:RARITY_BASE_MULT.C, recycleValue:RARITY_RECYCLE_VALUE.C,
  },
  chest_uncommon: {
    id: 'chest_uncommon', name: 'Plastron Peu Commun', slot:'chest', rarity:'U', icon:'🦺', color:'#4ade80',
    description:'Plastron amélioré, mieux protégé.', dpsMultiplier:RARITY_BASE_MULT.U, recycleValue:RARITY_RECYCLE_VALUE.U,
  },
  chest_rare: {
    id: 'chest_rare', name: 'Plastron Rare', slot:'chest', rarity:'R', icon:'🦺', color:'#60a5fa',
    description:'Plastron renforcé contre les dégâts.', dpsMultiplier:RARITY_BASE_MULT.R, recycleValue:RARITY_RECYCLE_VALUE.R,
  },
  chest_epic: {
    id: 'chest_epic', name: 'Plastron Épique', slot:'chest', rarity:'E', icon:'🥼', color:'#c084fc',
    description:'Plastron chargé de magie offensive.', dpsMultiplier:RARITY_BASE_MULT.E, recycleValue:RARITY_RECYCLE_VALUE.E,
  },
  chest_legendary: {
    id: 'chest_legendary', name: 'Plastron Légendaire', slot:'chest', rarity:'L', icon:'🛡️', color:'#fbbf24',
    description:'Plastron des champions légendaires.', dpsMultiplier:RARITY_BASE_MULT.L, recycleValue:RARITY_RECYCLE_VALUE.L,
  },
  chest_mythique: {
    id: 'chest_mythique', name: 'Plastron Mythique', slot:'chest', rarity:'M', icon:'🥋', color:'#f87171',
    description:'Plastron né d’un mythe ancien.', dpsMultiplier:RARITY_BASE_MULT.M, recycleValue:RARITY_RECYCLE_VALUE.M,
  },
  chest_stellar: {
    id: 'chest_stellar', name: 'Plastron Stellaire', slot:'chest', rarity:'S', icon:'🌌', color:'#e2e8f0',
    description:'Plastron scintillant comme une nébuleuse.', dpsMultiplier:RARITY_BASE_MULT.S, recycleValue:RARITY_RECYCLE_VALUE.S,
  },
  chest_cosmic: {
    id: 'chest_cosmic', name: 'Plastron Cosmique', slot:'chest', rarity:'CO', icon:'🌠', color:'#34d399',
    description:'Plastron parcouru par l’énergie du cosmos.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
  },
  chest_primordial: {
    id: 'chest_primordial', name: 'Plastron Primordial', slot:'chest', rarity:'P', icon:'🛡️', color:'#ff6b35',
    description:'Plastron imprégné de l’énergie primordiale.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:RARITY_RECYCLE_VALUE.P,
  },
  chest_transcendant: {
    id: 'chest_transcendant', name: 'Plastron Transcendant', slot:'chest', rarity:'T', icon:'🔱', color:'#e879f9',
    description:'Plastron ayant dépassé les limites du mortel.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:RARITY_RECYCLE_VALUE.T,
  },
  chest_primordial_cid: {
    id: 'chest_primordial_cid', name: "Manteau de l'Éminence de l'Ombre", slot:'chest', rarity:'CO', icon:'🧥', color:'#a78bfa',
    description:"Le manteau de celui qui se tapit dans l'ombre. Bonus si équipé par Cid Kagenou.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
    bonusFor:{ templateId:'cid_kagenou', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Cid Kagenou' },
  },

  // Pantalons
  pants_common: {
    id: 'pants_common', name: 'Pantalon Commun', slot:'pants', rarity:'C', icon:'🩳', color:'#9ca3af',
    description:'Pantalon de voyage ordinaire.', dpsMultiplier:RARITY_BASE_MULT.C, recycleValue:RARITY_RECYCLE_VALUE.C,
  },
  pants_uncommon: {
    id: 'pants_uncommon', name: 'Pantalon Peu Commun', slot:'pants', rarity:'U', icon:'🩳', color:'#4ade80',
    description:'Pantalon amélioré pour plus de mobilité.', dpsMultiplier:RARITY_BASE_MULT.U, recycleValue:RARITY_RECYCLE_VALUE.U,
  },
  pants_rare: {
    id: 'pants_rare', name: 'Pantalon Rare', slot:'pants', rarity:'R', icon:'🩳', color:'#60a5fa',
    description:'Pantalon renforcé pour l’agilité.', dpsMultiplier:RARITY_BASE_MULT.R, recycleValue:RARITY_RECYCLE_VALUE.R,
  },
  pants_epic: {
    id: 'pants_epic', name: 'Pantalon Épique', slot:'pants', rarity:'E', icon:'👖', color:'#c084fc',
    description:'Pantalon mystique qui améliore les mouvements.', dpsMultiplier:RARITY_BASE_MULT.E, recycleValue:RARITY_RECYCLE_VALUE.E,
  },
  pants_legendary: {
    id: 'pants_legendary', name: 'Pantalon Légendaire', slot:'pants', rarity:'L', icon:'👖', color:'#fbbf24',
    description:'Pantalon des sages de bataille.', dpsMultiplier:RARITY_BASE_MULT.L, recycleValue:RARITY_RECYCLE_VALUE.L,
  },
  pants_mythique: {
    id: 'pants_mythique', name: 'Pantalon Mythique', slot:'pants', rarity:'M', icon:'👖', color:'#f87171',
    description:'Pantalon issu d’une légende oubliée.', dpsMultiplier:RARITY_BASE_MULT.M, recycleValue:RARITY_RECYCLE_VALUE.M,
  },
  pants_stellar: {
    id: 'pants_stellar', name: 'Pantalon Stellaire', slot:'pants', rarity:'S', icon:'👖', color:'#e2e8f0',
    description:'Pantalon tissé de lumière stellaire.', dpsMultiplier:RARITY_BASE_MULT.S, recycleValue:RARITY_RECYCLE_VALUE.S,
  },
  pants_cosmic: {
    id: 'pants_cosmic', name: 'Pantalon Cosmique', slot:'pants', rarity:'CO', icon:'👖', color:'#34d399',
    description:'Pantalon chargé de l’énergie du cosmos.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
  },
  pants_primordial: {
    id: 'pants_primordial', name: 'Pantalon Primordial', slot:'pants', rarity:'P', icon:'👖', color:'#ff6b35',
    description:'Pantalon chargé d’une force ancienne.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:RARITY_RECYCLE_VALUE.P,
  },
  pants_transcendant: {
    id: 'pants_transcendant', name: 'Pantalon Transcendant', slot:'pants', rarity:'T', icon:'👖', color:'#e879f9',
    description:'Pantalon ayant dépassé les limites du mortel.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:RARITY_RECYCLE_VALUE.T,
  },

  // Bottes
  boots_common: {
    id: 'boots_common', name: 'Bottes Communes', slot:'boots', rarity:'C', icon:'🥾', color:'#9ca3af',
    description:'Bottes simples pour marcher plus vite.', dpsMultiplier:RARITY_BASE_MULT.C, recycleValue:RARITY_RECYCLE_VALUE.C,
  },
  boots_uncommon: {
    id: 'boots_uncommon', name: 'Bottes Peu Communes', slot:'boots', rarity:'U', icon:'🥾', color:'#4ade80',
    description:'Bottes améliorées pour le combat.', dpsMultiplier:RARITY_BASE_MULT.U, recycleValue:RARITY_RECYCLE_VALUE.U,
  },
  boots_rare: {
    id: 'boots_rare', name: 'Bottes Rares', slot:'boots', rarity:'R', icon:'🥾', color:'#60a5fa',
    description:'Bottes équilibrées pour le combat.', dpsMultiplier:RARITY_BASE_MULT.R, recycleValue:RARITY_RECYCLE_VALUE.R,
  },
  boots_epic: {
    id: 'boots_epic', name: 'Bottes Épiques', slot:'boots', rarity:'E', icon:'🥾', color:'#c084fc',
    description:'Bottes enchantées pour l’élan.', dpsMultiplier:RARITY_BASE_MULT.E, recycleValue:RARITY_RECYCLE_VALUE.E,
  },
  boots_legendary: {
    id: 'boots_legendary', name: 'Bottes Légendaires', slot:'boots', rarity:'L', icon:'🥾', color:'#fbbf24',
    description:'Bottes des héros des âges anciens.', dpsMultiplier:RARITY_BASE_MULT.L, recycleValue:RARITY_RECYCLE_VALUE.L,
  },
  boots_mythique: {
    id: 'boots_mythique', name: 'Bottes Mythiques', slot:'boots', rarity:'M', icon:'🥾', color:'#f87171',
    description:'Bottes tirées d’un mythe oublié.', dpsMultiplier:RARITY_BASE_MULT.M, recycleValue:RARITY_RECYCLE_VALUE.M,
  },
  boots_stellar: {
    id: 'boots_stellar', name: 'Bottes Stellaires', slot:'boots', rarity:'S', icon:'🥾', color:'#e2e8f0',
    description:'Bottes qui foulent la poussière d’étoiles.', dpsMultiplier:RARITY_BASE_MULT.S, recycleValue:RARITY_RECYCLE_VALUE.S,
  },
  boots_cosmic: {
    id: 'boots_cosmic', name: 'Bottes Cosmiques', slot:'boots', rarity:'CO', icon:'🥾', color:'#34d399',
    description:'Bottes chargées de l’énergie du cosmos.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
  },
  boots_primordial: {
    id: 'boots_primordial', name: 'Bottes Primordiales', slot:'boots', rarity:'P', icon:'🥾', color:'#ff6b35',
    description:'Bottes imprégnées d’une force primale.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:RARITY_RECYCLE_VALUE.P,
  },
  boots_transcendant: {
    id: 'boots_transcendant', name: 'Bottes Transcendantes', slot:'boots', rarity:'T', icon:'🥾', color:'#e879f9',
    description:'Bottes ayant dépassé les limites du mortel.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:RARITY_RECYCLE_VALUE.T,
  },

  // Armes génériques
  weapon_common: {
    id: 'weapon_common', name: 'Arme Commune', slot:'weapon', rarity:'C', icon:'🗡', color:'#9ca3af',
    description:'Une arme simple, mais efficace.', dpsMultiplier:RARITY_BASE_MULT.C, recycleValue:RARITY_RECYCLE_VALUE.C,
  },
  weapon_uncommon: {
    id: 'weapon_uncommon', name: 'Arme Peu Commune', slot:'weapon', rarity:'U', icon:'⚔', color:'#4ade80',
    description:'Une arme améliorée, déjà redoutable.', dpsMultiplier:RARITY_BASE_MULT.U, recycleValue:RARITY_RECYCLE_VALUE.U,
  },
  weapon_rare: {
    id: 'weapon_rare', name: 'Arme Rare', slot:'weapon', rarity:'R', icon:'⚔', color:'#60a5fa',
    description:'Arme qui tranche avec précision.', dpsMultiplier:RARITY_BASE_MULT.R, recycleValue:RARITY_RECYCLE_VALUE.R,
  },
  weapon_epic: {
    id: 'weapon_epic', name: 'Arme Épique', slot:'weapon', rarity:'E', icon:'🗡️', color:'#c084fc',
    description:'Arme imprégnée d’énergie mystique.', dpsMultiplier:RARITY_BASE_MULT.E, recycleValue:RARITY_RECYCLE_VALUE.E,
  },
  weapon_legendary: {
    id: 'weapon_legendary', name: 'Arme Légendaire', slot:'weapon', rarity:'L', icon:'🗡️', color:'#fbbf24',
    description:'Arme qui a traversé les légendes.', dpsMultiplier:RARITY_BASE_MULT.L, recycleValue:RARITY_RECYCLE_VALUE.L,
  },
  weapon_mythique: {
    id: 'weapon_mythique', name: 'Arme Mythique', slot:'weapon', rarity:'M', icon:'🗡️', color:'#f87171',
    description:'Arme sortie tout droit d’un mythe oublié.', dpsMultiplier:RARITY_BASE_MULT.M, recycleValue:RARITY_RECYCLE_VALUE.M,
  },
  weapon_stellar: {
    id: 'weapon_stellar', name: 'Arme Stellaire', slot:'weapon', rarity:'S', icon:'🌟', color:'#e2e8f0',
    description:'Arme forgée dans la matière des étoiles.', dpsMultiplier:RARITY_BASE_MULT.S, recycleValue:RARITY_RECYCLE_VALUE.S,
  },
  weapon_cosmic: {
    id: 'weapon_cosmic', name: 'Arme Cosmique', slot:'weapon', rarity:'CO', icon:'☄️', color:'#34d399',
    description:'Arme chargée de l’énergie du cosmos.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:RARITY_RECYCLE_VALUE.CO,
  },
  weapon_primordial: {
    id: 'weapon_primordial', name: 'Arme Primordiale', slot:'weapon', rarity:'P', icon:'⚔️', color:'#ff6b35',
    description:'Arme ancestrale dotée d’un pouvoir brut.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:RARITY_RECYCLE_VALUE.P,
  },
  weapon_transcendant_generic: {
    id: 'weapon_transcendant_generic', name: 'Arme Transcendante', slot:'weapon', rarity:'T', icon:'⚡', color:'#e879f9',
    description:'Arme ayant dépassé les limites du mortel.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:RARITY_RECYCLE_VALUE.T,
  },

  // ── Armes Transcendantes personnalisées ──────────────────────────────────
  weapon_transcendant: {
    id: 'weapon_transcendant', name: 'Cigarette Electronique', slot:'weapon', rarity:'T', icon:'⌨️', color:'#e879f9',
    description:'Bonus si équipé par NekoZ.', dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:9000000,
    bonusFor:{ templateId:'nekoz', multiplier:PERSO_BONUS_MULT.T, description:'Bonus si équipé par NekoZ' },
  },
  weapon_transcendant_griffon: {
    id: 'weapon_transcendant_griffon', name: 'Griffon', slot:'weapon', rarity:'T', icon:'🦅', color:'#e879f9',
    description:"Une arme légendaire à la puissance du Roi. Bonus si équipé par Shanks.", dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:9300000,
    bonusFor:{ templateId:'shanks', multiplier:PERSO_BONUS_MULT.T, description:'Bonus si équipé par Shanks' },
  },
  weapon_transcendant_alte_alarmer: {
    id: 'weapon_transcendant_alte_alarmer', name: 'Alte Alarmer', slot:'weapon', rarity:'T', icon:'🔔', color:'#e879f9',
    description:"Une arme antique qui annonce la chute des empires. Bonus si équipé par Qin Shi Huang.", dpsMultiplier:RARITY_BASE_MULT.T, recycleValue:9400000,
    bonusFor:{ templateId:'qin_shi_huang', multiplier:PERSO_BONUS_MULT.T, description:'Bonus si équipé par Qin Shi Huang' },
  },

  // ── Équipements Primordiaux personnalisés ────────────────────────────────
  weapon_primordial_aatrox: {
    id: 'weapon_primordial_aatrox', name: 'Épée de Darkin', slot:'weapon', rarity:'P', icon:'🗡️', color:'#ff6b35',
    description:"Une lame maudite scellant un seigneur Darkin. Bonus si équipé par Aatrox.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'aatrox_lol', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Aatrox' },
  },
  weapon_primordial_hogyoku: {
    id: 'weapon_primordial_hogyoku', name: 'Hogyoku Éveillé', slot:'weapon', rarity:'P', icon:'💠', color:'#ff6b35',
    description:"L'orbe interdit qui efface les frontières entre Hollow et Shinigami. Bonus si équipé par Aizen Transcendant.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'aizen_t', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Aizen Transcendant' },
  },
  weapon_primordial_dawn: {
    id: 'weapon_primordial_dawn', name: "Épée de l'Aube", slot:'weapon', rarity:'P', icon:'🌅', color:'#ff6b35',
    description:"L'arme sacrée forgée à l'aurore des temps. Bonus si équipée par Arthur Leywin.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'arthur_leywin', multiplier:PERSO_BONUS_MULT.P, description:"Bonus si équipée par Arthur Leywin" },
  },
  weapon_primordial_benimaru: {
    id: 'weapon_primordial_benimaru', name: 'Le Matoi', slot:'weapon', rarity:'P', icon:'🚩', color:'#ff6b35',
    description:"L'étendard des pompiers de la 8ème Brigade. Bonus si équipé par Benimaru.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'benimaru', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Benimaru' },
  },
  weapon_primordial_brume: {
    id: 'weapon_primordial_brume', name: 'Arbre a chat', slot:'weapon', rarity:'P', icon:'🌳', color:'#ff6b35',
    description:"Un perchoir mystique qui décuple les instincts félins. Bonus si équipé par Brume.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'brume', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Brume' },
  },
  weapon_primordial_brunhilde: {
    id: 'weapon_primordial_brunhilde', name: '???', slot:'weapon', rarity:'P', icon:'❓', color:'#ff6b35',
    description:"Une relique dont la nature reste un mystère. Bonus si équipé par Brunhilde.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'brunhilde', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Brunhilde' },
  },
  weapon_primordial_chara: {
    id: 'weapon_primordial_chara', name: 'Toy Knife', slot:'weapon', rarity:'P', icon:'🔪', color:'#ff6b35',
    description:"Un couteau jouet à la lame étrangement acérée. Bonus si équipé par Chara.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'chara', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Chara' },
  },
  weapon_primordial_dva: {
    id: 'weapon_primordial_dva', name: 'MEKA', slot:'weapon', rarity:'P', icon:'🤖', color:'#ff6b35',
    description:"Le mécha de combat personnel de D.Va. Bonus si équipé par D.Va.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'dva', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par D.Va' },
  },
  weapon_primordial_eren: {
    id: 'weapon_primordial_eren', name: 'Lances Foudroyantes', slot:'weapon', rarity:'P', icon:'⚡', color:'#ff6b35',
    description:"Des lances capables de percer la nuque des Titans. Bonus si équipé par Eren.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'eren', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Eren' },
  },
  chest_primordial_gi_fusion: {
    id: 'chest_primordial_gi_fusion', name: 'Gi de Fusion', slot:'chest', rarity:'P', icon:'🥋', color:'#ff6b35',
    description:"Le vêtement porté lors des fusions les plus puissantes de l'univers. Bonus si équipé par Gogeta.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'gogeta', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Gogeta' },
  },
  weapon_primordial_magic: {
    id: 'weapon_primordial_magic', name: 'Bâton Magique', slot:'weapon', rarity:'P', icon:'✨', color:'#ff6b35',
    description:'Bonus si équipé par Goku.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'goku', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Goku' },
  },
  weapon_primordial_draconic: {
    id: 'weapon_primordial_draconic', name: 'Draconic Sword', slot:'weapon', rarity:'P', icon:'🐉', color:'#ff6b35',
    description:'Bonus si équipé par Limule.', dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'limule', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Limule' },
  },
  weapon_primordial_antidepresseur: {
    id: 'weapon_primordial_antidepresseur', name: 'Antidépresseur', slot:'weapon', rarity:'P', icon:'💊', color:'#ff6b35',
    description:"Un remède à la mélancolie... ou une arme redoutable. Bonus si équipé par Ouchuu.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'ouchuu', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Ouchuu' },
  },
  weapon_primordial_rayquaza: {
    id: 'weapon_primordial_rayquaza', name: 'MasterBall', slot:'weapon', rarity:'P', icon:'🔴', color:'#ff6b35',
    description:"La ball la plus rare, réservée aux légendaires. Bonus si équipé par Rayquaza.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'rayquaza', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Rayquaza' },
  },
  weapon_primordial_steve: {
    id: 'weapon_primordial_steve', name: 'épée en netherite', slot:'weapon', rarity:'P', icon:'🗡️', color:'#ff6b35',
    description:"L'arme la plus solide qu'un mineur puisse forger. Bonus si équipé par Steve.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'steve', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Steve' },
  },
  weapon_primordial_theknight: {
    id: 'weapon_primordial_theknight', name: 'Aiguillon', slot:'weapon', rarity:'P', icon:'⚔️', color:'#ff6b35',
    description:"Le clou aiguisé qui a percé mille adversaires. Bonus si équipé par The Knight.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'the_knight', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par The Knight' },
  },
  weapon_primordial_vegeto: {
    id: 'weapon_primordial_vegeto', name: 'Spirit Excalibur', slot:'weapon', rarity:'P', icon:'🗡️', color:'#ff6b35',
    description:"Une lame nourrie par les âmes vaincues. Bonus si équipé par Végéto.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'vegeto', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Végéto' },
  },
  weapon_primordial_yoriichi: {
    id: 'weapon_primordial_yoriichi', name: 'Sabre du soleil', slot:'weapon', rarity:'P', icon:'☀️', color:'#ff6b35',
    description:"Le sabre le plus puissant, forgé pour terrasser les démons. Bonus si équipé par Yoriichi Tsugikuni.", dpsMultiplier:RARITY_BASE_MULT.P, recycleValue:6500000,
    bonusFor:{ templateId:'yoriichi', multiplier:PERSO_BONUS_MULT.P, description:'Bonus si équipé par Yoriichi Tsugikuni' },
  },

  // ── Équipements Cosmiques personnalisés ──────────────────────────────────
  weapon_cosmic_aizen: {
    id: 'weapon_cosmic_aizen', name: 'Kyoka Suigetsu', slot:'weapon', rarity:'CO', icon:'🌸', color:'#34d399',
    description:"Le zanpakuto illusionniste d'Aizen. Bonus si équipé par Aizen.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'aizen', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Aizen' },
  },
  weapon_cosmic_gilgamesh: {
    id: 'weapon_cosmic_gilgamesh', name: 'Nature divine', slot:'weapon', rarity:'CO', icon:'🌿', color:'#34d399',
    description:'Bonus si équipé par Gilgamesh.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'gilgamesh', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Gilgamesh' },
  },
  weapon_cosmic_jinkazama: {
    id: 'weapon_cosmic_jinkazama', name: 'Géne Demoniaque', slot:'weapon', rarity:'CO', icon:'😈', color:'#34d399',
    description:"Le pouvoir démoniaque qui sommeille en Jin. Bonus si équipé par Jin Kazama.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'jin_tekken', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Jin Kazama' },
  },
  weapon_cosmic_linkmidona: {
    id: 'weapon_cosmic_linkmidona', name: 'miroir du Crépuscule', slot:'weapon', rarity:'CO', icon:'🪞', color:'#34d399',
    description:"Le portail entre le monde de la lumière et celui du crépuscule. Bonus si équipé par Link & Midona.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'link_midona', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Link & Midona' },
  },
  weapon_cosmic_shinra: {
    id: 'weapon_cosmic_shinra', name: 'Adora Burst', slot:'weapon', rarity:'CO', icon:'🔥', color:'#34d399',
    description:"La flamme adorable qui embrase les Infernaux. Bonus si équipé par Shinra.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'shinra', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Shinra' },
  },
  weapon_cosmic_jinwoo: {
    id: 'weapon_cosmic_jinwoo', name: 'La Colère de Kamish', slot:'weapon', rarity:'CO', icon:'🔥', color:'#34d399',
    description:'Bonus si équipé par Jinwoo.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'jinwoo', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Jinwoo' },
  },
  weapon_cosmic_vegeta: {
    id: 'weapon_cosmic_vegeta', name: 'Détecteur', slot:'weapon', rarity:'CO', icon:'🔭', color:'#34d399',
    description:'Bonus si équipé par Végéta.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'vegeta', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Végéta' },
  },
  weapon_cosmic_pourfenda: {
    id: 'weapon_cosmic_pourfenda', name: 'Pourfenda', slot:'weapon', rarity:'CO', icon:'⚔️', color:'#34d399',
    description:"Une lame sombre qui tranche l'espace lui-même. Bonus si équipé par Yami.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'yami', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Yami' },
  },
  weapon_cosmic_zorua: {
    id: 'weapon_cosmic_zorua', name: 'Hyper Ball', slot:'weapon', rarity:'CO', icon:'🟣', color:'#34d399',
    description:"Une ball rare parfaite pour capturer les illusionnistes. Bonus si équipé par Zorua.", dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'zorua', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Zorua' },
  },
  weapon_cosmic_luffy: {
    id: 'weapon_cosmic_luffy', name: 'Gomu Gomu No Mi', slot:'weapon', rarity:'CO', icon:'🍉', color:'#34d399',
    description:'Bonus si équipé par Luffy.', dpsMultiplier:RARITY_BASE_MULT.CO, recycleValue:2500000,
    bonusFor:{ templateId:'luffy', multiplier:PERSO_BONUS_MULT.CO, description:'Bonus si équipé par Luffy' },
  },
};

export const getItemDef = (id: string): ItemDef | undefined => ITEM_DEFS[id];
export const getEquipmentDef = (id: string): EquipmentDef | undefined => EQUIPMENT_DEFS[id];

export function getEquipmentForSlot(slot: EquipmentDef['slot']): EquipmentDef[] {
  return Object.values(EQUIPMENT_DEFS).filter(item => item.slot === slot);
}

// Tous les objets d'un slot+rareté donnés (générique + variantes personnalisées
// "bonusFor" le cas échéant). Sert à la fois de pool de fodder et de pool de
// sortie pour la fusion d'équipement (upgradeEquipment dans gameStore.ts).
export function getEquipmentGroup(slot: EquipmentDef['slot'], rarity: string): EquipmentDef[] {
  return Object.values(EQUIPMENT_DEFS).filter(item => item.slot === slot && item.rarity === rarity);
}

// Tirage pondéré du résultat d'une fusion d'équipement (10 → 1 rareté sup.) :
// l'objet générique (sans bonusFor) est nettement plus probable que chaque
// variante personnalisée liée à un perso précis.
const UPGRADE_GENERIC_WEIGHT = 6;
const UPGRADE_PERSONALIZED_WEIGHT = 1;

export function pickEquipmentUpgradeOutput(slot: EquipmentDef['slot'], nextRarity: string): EquipmentDef | null {
  const pool = getEquipmentGroup(slot, nextRarity);
  if (pool.length === 0) return null;
  const weighted = pool.map(item => ({ item, weight: item.bonusFor ? UPGRADE_PERSONALIZED_WEIGHT : UPGRADE_GENERIC_WEIGHT }));
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * total;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.item;
  }
  return weighted[weighted.length - 1].item;
}

// ── Drop d'équipement en combat ──────────────────────────────────────────
// Le déblocage du drop de chaque rareté ne dépend plus directement du palier :
// il faut avoir terminé l'expédition "Chasse — Rareté X" correspondante
// (voir EQUIP_DROP_UNLOCK_EXPEDITIONS dans lib/game/expeditions.ts et
// gameStore.unlockedEquipDropRarities/unlockEquipDropRarity).
// EQUIP_RARITY_MIN_PALIER sert désormais uniquement de palierRequired pour
// POUVOIR TENTER ces expéditions de déblocage (et celles de fusion) — pas
// pour le drop lui-même.
export const EQUIP_RARITY_MIN_PALIER: Record<string, number> = {
  C: 1, U: 3, R: 5, E: 7, L: 9, M: 11, S: 13, CO: 15, P: 17, T: 19,
};
// Probabilité de base par rareté (en % par kill), autorisée seulement si la
// rareté a été débloquée via son expédition. Décroissant du plus commun au
// plus rare.
const EQUIP_RARITY_WEIGHT: Record<string, number> = {
  C: 33, U: 5, R: 2, E: 1, L: 0.5, M: 0.25, S: 0.125, CO: 0.0625, P: 0.03125, T: 0.015625,
};
// Du plus rare au plus commun (ordre de test des bandes cumulées).
// Aligné sur RARITY_ORDER des personnages (gacha.ts) : T > P > CO > S > M > L > E > R > U > C.
const EQUIP_RARITY_ORDER = ['T', 'P', 'CO', 'S', 'M', 'L', 'E', 'R', 'U', 'C'] as const;

export function getEquipmentDrop(unlockedDropRarities: string[], rateMult = 1): string | null {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const r of EQUIP_RARITY_ORDER) {
    if (!unlockedDropRarities.includes(r)) continue; // rareté non débloquée (expédition non faite)
    acc += EQUIP_RARITY_WEIGHT[r] * rateMult;
    if (roll < acc) {
      const pool = Object.values(EQUIPMENT_DEFS).filter(item => item.rarity === r);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
    }
  }
  return null;
}

export function getEquipmentDpsMultiplier(owned: { equippedItems: Record<string, string | null> }, templateId?: string): number {
  let mult = 1;
  for (const equippedId of Object.values(owned.equippedItems)) {
    if (!equippedId) continue;
    const item = getEquipmentDef(equippedId);
    if (!item) continue;
    mult *= item.dpsMultiplier;
    if (item.bonusFor?.templateId && templateId === item.bonusFor.templateId) {
      mult *= item.bonusFor.multiplier;
    }
  }
  return mult;
}

export function getEquipmentEquippedCount(collection: { [templateId: string]: { equippedItems: Record<string, string | null> } }, equipmentId: string): number {
  return Object.values(collection).reduce((count, owned) => {
    return count + Object.values(owned.equippedItems).filter(eid => eid === equipmentId).length;
  }, 0);
}

/**
 * Drop d'items d'évolution sur les mobs normaux.
 * Chaque item droppable est listé avec sa chance (en %).
 * Retourne l'id de l'item dropé, ou null.
 */
const ITEM_DROP_TABLE: { id: string; chance: number }[] = [
  { id: 'clef_babylone', chance: 0.4 }, // ~1 drop toutes les 250 vagues
];

export function getItemDrop(): string | null {
  for (const entry of ITEM_DROP_TABLE) {
    if (Math.random() * 100 < entry.chance) return entry.id;
  }
  return null;
}

// ── Coffres d'équipement ────────────────────────────────────────────────────
export type ChestTier = 'common' | 'rare' | 'epic';

// Retourne un ID d'équipement aléatoire selon les drop rates du coffre
export function rollEquipmentChest(tier: ChestTier): string {
  const roll = Math.random() * 100;

  // Seuils cumulatifs du plus rare au plus commun (aligné sur EQUIP_RARITY_ORDER).
  const thresholds: Record<ChestTier, { rarity: string; threshold: number }[]> = {
    common: [
      { rarity:'T',  threshold: 0    },   // 0.00% — pas de T dans coffre commun
      { rarity:'P',  threshold: 0.01 },   // 0.01%
      { rarity:'CO', threshold: 0.10 },   // 0.09%
      { rarity:'S',  threshold: 0.30 },   // 0.20%
      { rarity:'M',  threshold: 0.45 },   // 0.15%
      { rarity:'L',  threshold: 0.95 },   // 0.50%
      { rarity:'E',  threshold: 2.25 },   // 1.30%
      { rarity:'R',  threshold: 5.05 },   // 2.80%
      { rarity:'U',  threshold: 7.05 },   // 2.00%
      { rarity:'C',  threshold: 100  },   // 92.95%
    ],
    rare: [
      { rarity:'T',  threshold: 0.05 },   // 0.05%
      { rarity:'P',  threshold: 0.83 },   // 0.78%
      { rarity:'CO', threshold: 1.83 },   // 1.00%
      { rarity:'S',  threshold: 3.43 },   // 1.60%
      { rarity:'M',  threshold: 4.43 },   // 1.00%
      { rarity:'L',  threshold: 9.43 },   // 5.00%
      { rarity:'E',  threshold: 21.43 },  // 12.00%
      { rarity:'R',  threshold: 46.43 },  // 25.00%
      { rarity:'U',  threshold: 54.43 },  // 8.00%
      { rarity:'C',  threshold: 100   },  // 45.57%
    ],
    epic: [
      { rarity:'T',  threshold: 0.91 },   // 0.91%
      { rarity:'P',  threshold: 7.43 },   // 6.52%
      { rarity:'CO', threshold: 15.43 },  // 8.00%
      { rarity:'S',  threshold: 24.43 },  // 9.00%
      { rarity:'M',  threshold: 32.43 },  // 8.00%
      { rarity:'L',  threshold: 47.43 },  // 15.00%
      { rarity:'E',  threshold: 77.43 },  // 30.00%
      { rarity:'R',  threshold: 89.43 },  // 12.00%
      { rarity:'U',  threshold: 97.43 },  // 8.00%
      { rarity:'C',  threshold: 100   },  // 2.57%
    ],
  };

  const steps = thresholds[tier];
  let selectedRarity = 'C';
  for (const step of steps) {
    if (roll < step.threshold) { selectedRarity = step.rarity; break; }
  }

  // Filtre les équipements de cette rareté
  const pool = Object.values(EQUIPMENT_DEFS).filter(e => e.rarity === selectedRarity);

  // Si aucun équipement de cette rareté n'existe, fallback vers le commun
  const fallback = pool.length > 0 ? pool : Object.values(EQUIPMENT_DEFS).filter(e => e.rarity === 'C');
  return fallback[Math.floor(Math.random() * fallback.length)].id;
}