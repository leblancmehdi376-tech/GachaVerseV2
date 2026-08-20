import { getCharacterById } from './characters';

export interface UltimateEffect {
  dpsMultiplier?:              number;
  coinMultiplier?:             number;
  selfDpsMultiplier?:          number;
  enemyDamageTakenBonusPct?:  number;
  critChance?:                 number;
  autoStrikes?:                { perSecond: number; source: 'teamDpsPct'; value: number };
  damageToCoinPct?:            number;
  instantDamagePctSelfDps?:    number;
  instantDamagePctTeamDps?:    number;
  instantDamagePctMaxHp?:      number;
  instantCoinMultiplierBurst?: number;
  reduceOtherCooldownsSeconds?:number;
  haltTeamCooldownHalved?:     boolean;
  resetBestOtherCooldown?:     boolean;
}

export interface UltimateDef {
  templateId:   string;
  name:         string;
  description:  string;
  duration:     number;
  cooldown:     number;
  effect:       UltimateEffect;
  animDuration: number;
}

export const ULTIMATE_DEFS: Record<string, UltimateDef> = {

  // ══ COMMUNS — cooldown 90s ═══════════════════════════════════════════
  canarticho: {
    templateId:'canarticho', name:'Coup Critique', duration:4, cooldown:90,
    description:'Taux de critique à 100% pendant 4s',
    effect:{ critChance:1.0 }, animDuration:1200,
  },
  cyborg: {
    templateId:'cyborg', name:'Tir Automatique', duration:6, cooldown:90,
    description:'Tir automatique (1/s à 30% du DPS d\'équipe) pendant 6s',
    effect:{ autoStrikes:{ perSecond:1, source:'teamDpsPct', value:0.3 } }, animDuration:1200,
  },
  slime: {
    templateId:'slime', name:'Explosion Visqueuse', duration:1, cooldown:90,
    description:'Inflige instantanément 160% du DPS d\'équipe',
    effect:{ instantDamagePctTeamDps:160 }, animDuration:1200,
  },
  axolotl: {
    templateId:'axolotl', name:'Capture Surprise', duration:1, cooldown:90,
    description:'×0 coins instantané sur l\'ennemi actuel',
    effect:{ instantCoinMultiplierBurst:0 }, animDuration:1200,
  },
  garry_fish: {
    templateId:'garry_fish', name:'Saut Hors de l\'Eau', duration:8, cooldown:90,
    description:'×1.4 monnaie obtenue pendant 8s',
    effect:{ coinMultiplier:1.4 }, animDuration:1200,
  },
  birthday_boy: {
    templateId:'birthday_boy', name:'Bougie Magique', duration:6, cooldown:90,
    description:'×1.3 DPS pendant 6s',
    effect:{ dpsMultiplier:1.3 }, animDuration:1200,
  },
  gummigoo: {
    templateId:'gummigoo', name:'Glu Collante', duration:6, cooldown:90,
    description:'L\'ennemi reçoit +5% de dégâts pendant 6s',
    effect:{ enemyDamageTakenBonusPct:5 }, animDuration:1200,
  },
  yamcha: {
    templateId:'yamcha', name:'La Pose', duration:1, cooldown:90,
    description:'×0 coins instantané sur l\'ennemi actuel',
    effect:{ instantCoinMultiplierBurst:0 }, animDuration:1400,
  },
  korogu: {
    templateId:'korogu', name:'Cri de la Forêt', duration:8, cooldown:90,
    description:'×1.4 monnaie obtenue pendant 8s',
    effect:{ coinMultiplier:1.4 }, animDuration:1200,
  },
  bangers: {
    templateId:'bangers', name:'Explosion', duration:1, cooldown:120,
    description:'Inflige instantanément 3% des PV max de l\'ennemi',
    effect:{ instantDamagePctMaxHp:3 }, animDuration:1600,         // ← nerfé : était 25%
  },
  bubba: {
    templateId:'bubba', name:'Piétinement', duration:8, cooldown:90,
    description:'×1.4 DPS personnel pendant 8s',
    effect:{ selfDpsMultiplier:1.4 }, animDuration:1200,
  },
  tentacool: {
    templateId:'tentacool', name:'Venin', duration:8, cooldown:90,
    description:'×1.5 DPS pendant 8s',
    effect:{ dpsMultiplier:1.5 }, animDuration:1200,
  },
  chenipan: {
    templateId:'chenipan', name:'Évolution Rapide', duration:1, cooldown:90,
    description:'Réduit le cooldown de tous les autres ultimates de 15s',
    effect:{ reduceOtherCooldownsSeconds:15 }, animDuration:1200,  // ← nerfé : était 30s
  },
  mr_popo: {
    templateId:'mr_popo', name:'Pecking Order', duration:15, cooldown:300,
    description:'×1.8 DPS d\'équipe et ×1.5 or sur cet ennemi pendant 15s',
    effect:{ dpsMultiplier:1.8, coinMultiplier:1.5 }, animDuration:1800,  // ← nerfé : était x3/x2 20s
  },

  // ══ UNCOMMUNS — cooldown 120s ═════════════════════════════════════════
  prince_lars: {
    templateId:'prince_lars', name:'Caprice Royal', duration:6, cooldown:120,
    description:'×1.3 DPS pendant 6s',
    effect:{ dpsMultiplier:1.3 }, animDuration:1400,
  },
  eugeo: {
    templateId:'eugeo', name:'Lame de Glace', duration:8, cooldown:120,
    description:'×1.5 DPS personnel pendant 8s',
    effect:{ selfDpsMultiplier:1.5 }, animDuration:1400,
  },
  angie: {
    templateId:'angie', name:'Volée de Papillons', duration:8, cooldown:120,
    description:'×1.4 monnaie obtenue pendant 8s',
    effect:{ coinMultiplier:1.4 }, animDuration:1400,
  },
  gobuta: {
    templateId:'gobuta', name:'Charge Gobeline', duration:1, cooldown:120,
    description:'Inflige instantanément 2% des PV max de l\'ennemi',
    effect:{ instantDamagePctMaxHp:2 }, animDuration:1400,
  },
  vogue_merry: {
    templateId:'vogue_merry', name:'Réparation', duration:1, cooldown:240,
    description:'Réduit de 20s le cooldown de tous les autres ultimates',
    effect:{ reduceOtherCooldownsSeconds:20 }, animDuration:1600,  // ← nerfé : était /2
  },

  // ══ RARES — cooldown 150s ═════════════════════════════════════════════
  'salamèche': {
    templateId:'salamèche', name:'Brûlure', duration:8, cooldown:150,
    description:'L\'ennemi reçoit +8% de dégâts pendant 8s',
    effect:{ enemyDamageTakenBonusPct:8 }, animDuration:1600,
  },
  carapuce: {
    templateId:'carapuce', name:'Bulles', duration:20, cooldown:150,
    description:'×1.5 monnaie obtenue pendant 20s',
    effect:{ coinMultiplier:1.5 }, animDuration:1600,              // ← nerfé : était x2 30s
  },
  bulbizarre: {
    templateId:'bulbizarre', name:'Vampigraine', duration:12, cooldown:150,
    description:'Convertit 50% des dégâts infligés en monnaie pendant 12s',
    effect:{ damageToCoinPct:50 }, animDuration:1600,
  },
  kissy_missy: {
    templateId:'kissy_missy', name:'Cadeau', duration:1, cooldown:150,
    description:'×0 monnaie instantané sur l\'ennemi actuel',
    effect:{ instantCoinMultiplierBurst:0 }, animDuration:1600,    // ← nerfé : était x10
  },
  yuno: {
    templateId:'yuno', name:'Tempête de Vent', duration:5, cooldown:150,
    description:'×2 DPS pendant 5s',
    effect:{ dpsMultiplier:2 }, animDuration:1600,                 // ← nerfé : était x5
  },
  the_dress: {
    templateId:'the_dress', name:'Illusion Optique', duration:6, cooldown:150,
    description:'Taux de critique à 40% pendant 6s',
    effect:{ critChance:0.4 }, animDuration:1600,
  },
  kirito: {
    templateId:'kirito', name:'Dual Wield', duration:8, cooldown:150,
    description:'×1.8 DPS pendant 8s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1600,
  },

  // ══ ÉPIQUES — cooldown 210s ═══════════════════════════════════════════
  arsene: {
    templateId:'arsene', name:'Agile', duration:10, cooldown:210,
    description:'×1.3 DPS d\'équipe pendant 10s',
    effect:{ dpsMultiplier:1.3 }, animDuration:1800,               // ← nerfé : était x1.5
  },
  huggy_wuggy: {
    templateId:'huggy_wuggy', name:'Étreinte', duration:8, cooldown:210,
    description:'×1.35 DPS pendant 8s',
    effect:{ dpsMultiplier:1.35 }, animDuration:1800,
  },
  diablo: {
    templateId:'diablo', name:'Chaos Imprévisible', duration:10, cooldown:210,
    description:'×1.45 DPS pendant 10s',
    effect:{ dpsMultiplier:1.45 }, animDuration:1800,
  },
  reaper_leviathan: {
    templateId:'reaper_leviathan', name:'Attaque des Profondeurs', duration:8, cooldown:210,
    description:'×2 DPS personnel pendant 8s',
    effect:{ selfDpsMultiplier:2 }, animDuration:2000,             // ← nerfé : était x4
  },
  reinhardt: {
    templateId:'reinhardt', name:'Marteau Pilon', duration:1, cooldown:210,
    description:'Inflige instantanément 80% du DPS d\'équipe',
    effect:{ instantDamagePctTeamDps:80 }, animDuration:1800,      // ← nerfé : était 150%
  },

  // ══ LÉGENDAIRES — cooldown 270s ═══════════════════════════════════════
  sanji: {
    templateId:'sanji', name:'Diable Jambe', duration:8, cooldown:270,
    description:'×2 DPS pendant 8s',
    effect:{ dpsMultiplier:2 }, animDuration:2000,                 // ← nerfé : était x3
  },
  asta: {
    templateId:'asta', name:'Black Hurricane', duration:20, cooldown:270,
    description:'×1.5 DPS personnel pendant 20s',
    effect:{ selfDpsMultiplier:1.5 }, animDuration:2000,           // ← nerfé : était x2 30s
  },
  taureau: {
    templateId:'taureau', name:'Charge Furieuse', duration:10, cooldown:270,
    description:'×2 DPS personnel pendant 10s',
    effect:{ selfDpsMultiplier:2 }, animDuration:2000,
  },
  kioraku: {
    templateId:'kioraku', name:'Jeux d\'Ombre', duration:1, cooldown:270,
    description:'Inflige instantanément 120% du DPS d\'équipe',
    effect:{ instantDamagePctTeamDps:120 }, animDuration:2200,
  },
  arthur_pandragon: {
    templateId:'arthur_pandragon', name:'Excalibur', duration:1, cooldown:270,
    description:'Inflige instantanément 150% du DPS d\'équipe',
    effect:{ instantDamagePctTeamDps:150 }, animDuration:2200,      // ← nerfé : était 300%
  },
  nagito_komaeda: {
    templateId:'nagito_komaeda', name:'Chance', duration:8, cooldown:270,
    description:'×1.4 monnaie obtenue pendant 8s',
    effect:{ coinMultiplier:1.4 }, animDuration:2000,
  },
  chuuya: {
    templateId:'chuuya', name:'Gravité', duration:8, cooldown:270,
    description:'L\'ennemi reçoit +20% de dégâts pendant 8s',
    effect:{ enemyDamageTakenBonusPct:20 }, animDuration:2000,     // ← nerfé : était +30% 10s
  },

  // ══ MYTHIQUES — cooldown 360s ═════════════════════════════════════════
  ren_m: {
    templateId:'ren_m', name:'All-Out Attack', duration:1, cooldown:360,
    description:'Inflige instantanément 180% du DPS d\'équipe',
    effect:{ instantDamagePctTeamDps:180 }, animDuration:2400,     // ← nerfé : était 500%
  },
  ichigo: {
    templateId:'ichigo', name:'Bankai', duration:1, cooldown:360,
    description:'Envoie une attaque à 8200% de son propre DPS',
    effect:{ instantDamagePctSelfDps:8200 }, animDuration:2400,     // ← nerfé : était 1000%
  },
  ouma: {
    templateId:'ouma', name:'Mensonge', duration:10, cooldown:360,
    description:'×1.5 DPS pendant 10s',
    effect:{ dpsMultiplier:1.5 }, animDuration:2200,
  },
  jax: {
    templateId:'jax', name:'Numéro de Charme', duration:12, cooldown:360,
    description:'×1.45 DPS pendant 12s',
    effect:{ dpsMultiplier:1.45 }, animDuration:2200,
  },
  dazai: {
    templateId:'dazai', name:'Annulation', duration:1, cooldown:360,
    description:'Réinitialise le cooldown de l\'ultimate allié le plus avancé',
    effect:{ resetBestOtherCooldown:true }, animDuration:2200,
  },

  // ══ STELLAIRES — cooldown 420s ════════════════════════════════════════
  naruto: {
    templateId:'naruto', name:'Rasengan Géant', duration:12, cooldown:420,
    description:'×3 DPS personnel pendant 12s',
    effect:{ selfDpsMultiplier:3 }, animDuration:2400,             // ← nerfé : était x5
  },
  luffy: {
    templateId:'luffy', name:'Gatling Gun', duration:7, cooldown:420,
    description:'attaque automatiques (30/s à 5% du DPS d\'équipe) pendant 7s',
    effect:{ autoStrikes:{ perSecond:30, source:'teamDpsPct', value:5 } }, animDuration:2800, // ← nerfé
  },

  // ══ COSMIQUES — cooldown 480s ═════════════════════════════════════════
  vegeta: {
    templateId:'vegeta', name:'Final Flash', duration:30, cooldown:480,
    description:'×3.5 DPS pendant 30s',
    effect:{ dpsMultiplier:3.5 }, animDuration:2600,               // ← nerfé : était x5
  },
  minato: {
    templateId:'minato', name:'Hiraishin', duration:1, cooldown:480,
    description:'Inflige instantanément 15% des PV max de l\'ennemi',
    effect:{ instantDamagePctMaxHp:15 }, animDuration:2600,         // ← nerfé : était 35%
  },
  gilgamesh: {
    templateId:'gilgamesh', name:'Gate of Babylon', duration:5, cooldown:480,
    description:'Épées automatiques (3/s à 90% du DPS d\'équipe) pendant 5s',
    effect:{ autoStrikes:{ perSecond:3, source:'teamDpsPct', value:90 } }, animDuration:2800, // ← nerfé
  },
  link_midona: {
    templateId:'link_midona', name:'Lien', duration:15, cooldown:480,
    description:'×1.45 DPS pendant 15s',
    effect:{ dpsMultiplier:1.45 }, animDuration:2600,
  },
  jinwoo: {
    templateId:'jinwoo', name:'Arise', duration:7, cooldown:480,
    description:'Soldats de l\'ombre (3 attaques/s à 80% du DPS d\'équipe) pendant 7s',
    effect:{ autoStrikes:{ perSecond:3, source:'teamDpsPct', value:80 } }, animDuration:2600, // ← nerfé
  },

  // ══ PRIMORDIAUX — cooldown 540s ═══════════════════════════════════════
  goku: {
    templateId:'goku', name:'Kamehameha', duration:1, cooldown:540,
    description:'Inflige instantanément 22% des PV max de l\'ennemi',
    effect:{ instantDamagePctMaxHp:22 }, animDuration:2600, 
  },
  limule: {
    templateId:'limule', name:'Prédateur', duration:15, cooldown:540,
    description:'×2 DPS et ×2 monnaie pendant 15s',
    effect:{ dpsMultiplier:2, coinMultiplier:2 }, animDuration:3200,  // ← nerfé : était x6/x2
  },
  arthur_leywin: {
    templateId:'arthur_leywin', name:'Lame d\'Éther', duration:5, cooldown:540,
    description:'Épées automatiques (4/s à 60% du DPS d\'équipe) pendant 5s',
    effect:{ autoStrikes:{ perSecond:4, source:'teamDpsPct', value:60 } }, animDuration:3000, // ← nerfé : était 100% (x5.0 au total, désormais x3.4 comme les ultimes similaires)
  },

  // ══ TRANSCENDANT — cooldown 600s ══════════════════════════════════════
  nekoz: {
    templateId:'nekoz', name:'A Perte', duration:15, cooldown:600,
    description:'×2.5 DPS et ×1.5 monnaie pendant 15s',
    effect:{ dpsMultiplier:2.5, coinMultiplier:1.5 }, animDuration:3200, // ← nerfé : était x3
  },
  cid_kagenou: {
    templateId:'cid_kagenou', name:'Atomic', duration:14, cooldown:300,
    description:'×4 DPS pendant 14s et 350% du DPS d’équipe en dégâts instantanés',
    effect:{ dpsMultiplier:4.0, instantDamagePctTeamDps:350 }, animDuration:2400,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR — tout perso sans ulti explicite reçoit un ulti idle échelonné
// selon sa rareté (nom + effet + cooldown/durée cohérents).
// ═══════════════════════════════════════════════════════════════════════════
type Rarity = 'C'|'U'|'R'|'E'|'L'|'M'|'S'|'CO'|'P'|'T';

const RARITY_ULT: Record<Rarity, { name: string; duration: number; cooldown: number; effect: UltimateEffect; anim: number }> = {
  C:  { name:'Assaut',        duration:8,  cooldown:90,  effect:{ dpsMultiplier:1.5 },                                anim:1200 },
  U:  { name:'Déferlante',    duration:8,  cooldown:110, effect:{ dpsMultiplier:1.7 },                                anim:1200 },
  R:  { name:'Percée',        duration:9,  cooldown:130, effect:{ dpsMultiplier:1.9, coinMultiplier:1.2 },            anim:1300 },
  E:  { name:'Fureur',        duration:10, cooldown:150, effect:{ dpsMultiplier:2.1, coinMultiplier:1.3 },            anim:1400 },
  L:  { name:'Cataclysme',    duration:12, cooldown:180, effect:{ dpsMultiplier:2.4, coinMultiplier:1.4 },            anim:1600 },
  M:  { name:'Jugement',      duration:12, cooldown:210, effect:{ dpsMultiplier:2.8, enemyDamageTakenBonusPct:8 },    anim:1800 },
  S:  { name:'Supernova',     duration:13, cooldown:240, effect:{ dpsMultiplier:3.2, instantDamagePctTeamDps:200 },   anim:2000 },
  CO: { name:'Singularité',   duration:14, cooldown:300, effect:{ dpsMultiplier:3.8, coinMultiplier:1.6 },            anim:2200 },
  P:  { name:'Genèse',        duration:15, cooldown:360, effect:{ dpsMultiplier:4.5, instantDamagePctTeamDps:300 },   anim:2600 },
  T:  { name:'Transcendance',  duration:15, cooldown:480, effect:{ dpsMultiplier:5.5, coinMultiplier:1.8, instantDamagePctTeamDps:400 }, anim:3000 },
};

function describeEffect(e: UltimateEffect): string {
  const parts: string[] = [];
  if (e.dpsMultiplier)             parts.push(`×${e.dpsMultiplier} DPS`);
  if (e.coinMultiplier)            parts.push(`×${e.coinMultiplier} or`);
  if (e.enemyDamageTakenBonusPct)  parts.push(`+${e.enemyDamageTakenBonusPct}% dégâts subis`);
  if (e.instantDamagePctTeamDps)   parts.push(`+${e.instantDamagePctTeamDps}% DPS en dégâts instantanés`);
  return parts.join(', ');
}

function generateUltimate(templateId: string): UltimateDef | undefined {
  const tpl = getCharacterById(templateId);
  if (!tpl) return undefined;
  const arch = RARITY_ULT[tpl.rarity as Rarity] ?? RARITY_ULT.C;
  return {
    templateId,
    name: arch.name,
    description: `${describeEffect(arch.effect)} pendant ${arch.duration}s`,
    duration: arch.duration,
    cooldown: arch.cooldown,
    effect: arch.effect,
    animDuration: arch.anim,
  };
}

// Cache des ultis résolus (def explicite, ou généré par rareté).
const _ultCache: Record<string, UltimateDef | undefined> = {};

export const getUltimateDef = (templateId: string): UltimateDef | undefined => {
  if (templateId in _ultCache) return _ultCache[templateId];
  const resolved = ULTIMATE_DEFS[templateId] ?? generateUltimate(templateId);
  _ultCache[templateId] = resolved;
  return resolved;
};