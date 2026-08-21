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

  canarticho: {
    templateId:'canarticho', name:'Pic-Vente', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  cyborg: {
    templateId:'cyborg', name:'Laser', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  slime: {
    templateId:'slime', name:'Noyade', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  axolotl: {
    templateId:'axolotl', name:'Plouf', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  garry_fish: {
    templateId:'garry_fish', name:'Écaille Brillante', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  birthday_boy: {
    templateId:'birthday_boy', name:'Surprise d\'anniversaire', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  gummigoo: {
    templateId:'gummigoo', name:'Rebond', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  yamcha: {
    templateId:'yamcha', name:'Dodon Ray', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  korogu: {
    templateId:'korogu', name:'Jet de Noix', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  bangers: {
    templateId:'bangers', name:'Coup de Poing', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  bubba: {
    templateId:'bubba', name:'Sourire', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  tentacool: {
    templateId:'tentacool', name:'Dard-Venin', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  chenipan: {
    templateId:'chenipan', name:'Strangulation', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  mr_popo: {
    templateId:'mr_popo', name:'Gifle', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  prince_lars: {
    templateId:'prince_lars', name:'Coup de Masse', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  eugeo: {
    templateId:'eugeo', name:'Geyser', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  angie: {
    templateId:'angie', name:'Mensonge', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  gobuta: {
    templateId:'gobuta', name:'Prédation', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  vogue_merry: {
    templateId:'vogue_merry', name:'Canon Principal', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  salamèche: {
    templateId:'salamèche', name:'Flammèche', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  carapuce: {
    templateId:'carapuce', name:'Pistolet à O', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  bulbizarre: {
    templateId:'bulbizarre', name:'Fouet Lianes', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  kissy_missy: {
    templateId:'kissy_missy', name:'Câlin', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  yuno: {
    templateId:'yuno', name:'Hekireki Issen', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  the_dress: {
    templateId:'the_dress', name:'Tissu Piégeur', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  kirito: {
    templateId:'kirito', name:'Starburst Stream', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  arsene: {
    templateId:'arsene', name:'Eiha', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  huggy_wuggy: {
    templateId:'huggy_wuggy', name:'Étreinte', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  diablo: {
    templateId:'diablo', name:'Megidolaon', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  reaper_leviathan: {
    templateId:'reaper_leviathan', name:'Morsure des Abysses', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  reinhardt: {
    templateId:'reinhardt', name:'Charge de Choc', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  sanji: {
    templateId:'sanji', name:'Diable Jambe', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  asta: {
    templateId:'asta', name:'Anti-Magic Slash', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  taureau: {
    templateId:'taureau', name:'Charge', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  kioraku: {
    templateId:'kioraku', name:'Katen Kyokotsu', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  arthur_pandragon: {
    templateId:'arthur_pandragon', name:'Excalibur', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  arthur_leywin: {
    templateId:'arthur_leywin', name:'Aether Blade', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  nagito_komaeda: {
    templateId:'nagito_komaeda', name:'Boucle de l\'Espoir', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  chuuya: {
    templateId:'chuuya', name:'Corruption', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  ren_m: {
    templateId:'ren_m', name:'Agi', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  ichigo: {
    templateId:'ichigo', name:'Getsuga Tensho', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  ouma: {
    templateId:'ouma', name:'Mensonge', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  jax: {
    templateId:'jax', name:'Farce', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  dazai: {
    templateId:'dazai', name:'No Longer Human', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  naruto: {
    templateId:'naruto', name:'Rasenshuriken', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  luffy: {
    templateId:'luffy', name:'Gum-Gum Gatling', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  vegeta: {
    templateId:'vegeta', name:'Final Flash', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  minato: {
    templateId:'minato', name:'Hiraishin no Jutsu', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  gilgamesh: {
    templateId:'gilgamesh', name:'Gate of Babylon', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  link_midona: {
    templateId:'link_midona', name:'Twilight', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  jinwoo: {
    templateId:'jinwoo', name:'Domain Expansion', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  cid_kagenou: {
    templateId:'cid_kagenou', name:'I Am Atomic', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  goku: {
    templateId:'goku', name:'Kamehameha', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  limule: {
    templateId:'limule', name:'Belzébuth', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  nekoz: {
    templateId:'nekoz', name:'Transcendence', duration:17, cooldown:110,
    description:'×3 DPS pendant 17s',
    effect:{ dpsMultiplier:3 }, animDuration:2550,
  },
  violet_p5: {
    templateId:'violet_p5', name:'Coup de Pied Tournoyant', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  zooble: {
    templateId:'zooble', name:'Chaos Numérique', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  bond: {
    templateId:'bond', name:'Coup de Museau', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  murata: {
    templateId:'murata', name:'Frappe Tranchante', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  grubs: {
    templateId:'grubs', name:'Nuée d\'Insectes', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  moris: {
    templateId:'moris', name:'Griffes', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  corayon: {
    templateId:'corayon', name:'Dard', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  qwilfish: {
    templateId:'qwilfish', name:'Piques', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  queulorior: {
    templateId:'queulorior', name:'Esquisse', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  sombra_ow: {
    templateId:'sombra_ow', name:'Piratage', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  connie: {
    templateId:'connie', name:'Lame Double', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  silverfish: {
    templateId:'silverfish', name:'Mandibule', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  spider_mc: {
    templateId:'spider_mc', name:'Toile', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  cochon: {
    templateId:'cochon', name:'Charge', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  kiba: {
    templateId:'kiba', name:'Kage Bunshin', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  caribou: {
    templateId:'caribou', name:'Piétinement', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  wapol: {
    templateId:'wapol', name:'Wapol House', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  mizuki_naruto: {
    templateId:'mizuki_naruto', name:'Substitution', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  oolong: {
    templateId:'oolong', name:'Transformation', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  teuchi: {
    templateId:'teuchi', name:'Bouillon de Ramen', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  kasugaigarasu: {
    templateId:'kasugaigarasu', name:'Vol', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  ribby_croaks: {
    templateId:'ribby_croaks', name:'Poing Crochu', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  sbire: {
    templateId:'sbire', name:'Ordre de Bataille', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  mr_satan: {
    templateId:'mr_satan', name:'Satan Miracle Special', duration:8, cooldown:110,
    description:'×1.2 DPS pendant 8s',
    effect:{ dpsMultiplier:1.2 }, animDuration:1200,
  },
  konohamaru: {
    templateId:'konohamaru', name:'Jutsu Boule de Feu', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  goron: {
    templateId:'goron', name:'Écrasement Sismique', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  repo_char: {
    templateId:'repo_char', name:'Extraction', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  tracer: {
    templateId:'tracer', name:'Chronotransfert', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  lishu_ap: {
    templateId:'lishu_ap', name:'Analyse', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  xiaolan_ap: {
    templateId:'xiaolan_ap', name:'Infusion de Thé', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  kobeni: {
    templateId:'kobeni', name:'Tranche-Viande', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  haumea_ff: {
    templateId:'haumea_ff', name:'Flammes', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  riza: {
    templateId:'riza', name:'Tir de Couverture', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  twix: {
    templateId:'twix', name:'Morsure', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  zote: {
    templateId:'zote', name:'Coup d\'Aiguillon', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  jean_aot: {
    templateId:'jean_aot', name:'Tourbillon de Vent', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  mugman: {
    templateId:'mugman', name:'Tir de Bulle', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  chica_fnaf: {
    templateId:'chica_fnaf', name:'Sourire d\'Animateur', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  poulet: {
    templateId:'poulet', name:'Picorage', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  tenten: {
    templateId:'tenten', name:'FILE', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  hanataro: {
    templateId:'hanataro', name:'Soin', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  kon: {
    templateId:'kon', name:'Âme Artificielle', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  don_kanonji: {
    templateId:'don_kanonji', name:'Onde Spirituelle', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  silica: {
    templateId:'silica', name:'Épée Courte', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  laboon: {
    templateId:'laboon', name:'Jet d\'Eau', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  fantome: {
    templateId:'fantome', name:'Apparition', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  sisigou: {
    templateId:'sisigou', name:'Runes de Combat', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  melina: {
    templateId:'melina', name:'Bénédiction', duration:9, cooldown:110,
    description:'×1.4 DPS pendant 9s',
    effect:{ dpsMultiplier:1.4 }, animDuration:1350,
  },
  boa_hancock: {
    templateId:'boa_hancock', name:'Mero Mero Mello', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  finral: {
    templateId:'finral', name:'Portail magique', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  enderman: {
    templateId:'enderman', name:'Téléportation', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  sabito: {
    templateId:'sabito', name:'Lame d\'Eau', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  k1bo: {
    templateId:'k1bo', name:'Calcul', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  yasutora_sado: {
    templateId:'yasutora_sado', name:'Dos Hands', duration:10, cooldown:110,
    description:'×1.6 DPS pendant 10s',
    effect:{ dpsMultiplier:1.6 }, animDuration:1500,
  },
  catnap: {
    templateId:'catnap', name:'Sourire', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  warden: {
    templateId:'warden', name:'Traque', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  reaper_ow: {
    templateId:'reaper_ow', name:'Faux Funeste', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  lihua_ap: {
    templateId:'lihua_ap', name:'Parfum', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  anya_spy: {
    templateId:'anya_spy', name:'Télépathie', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  maitre_yi: {
    templateId:'maitre_yi', name:'Alpha', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  herald: {
    templateId:'herald', name:'Frappe Temporelle', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  loki_va: {
    templateId:'loki_va', name:'Geirrod', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  kirigiri: {
    templateId:'kirigiri', name:'Deduction', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  asriel_ut: {
    templateId:'asriel_ut', name:'Hyper Blaster', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  bonny_fnaf: {
    templateId:'bonny_fnaf', name:'Jeu de Scène', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  panda_tekken: {
    templateId:'panda_tekken', name:'Piétinement', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  margith: {
    templateId:'margith', name:'Lame Dorée', duration:11, cooldown:110,
    description:'×1.8 DPS pendant 11s',
    effect:{ dpsMultiplier:1.8 }, animDuration:1650,
  },
  piccolo: {
    templateId:'piccolo', name:'Makankosappo', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  kakashi: {
    templateId:'kakashi', name:'Chidori', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  aki_csm: {
    templateId:'aki_csm', name:'Lame de Sang', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  arthur_ff: {
    templateId:'arthur_ff', name:'Caliburn', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  alphonse: {
    templateId:'alphonse', name:'Frappe d\'Armure', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  karma_lol: {
    templateId:'karma_lol', name:'Illumination', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  jinx_lol: {
    templateId:'jinx_lol', name:'Pow-Pow', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  igloo_na: {
    templateId:'igloo_na', name:'Igloo', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  thor_va: {
    templateId:'thor_va', name:'Mjolnir', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  mikasa: {
    templateId:'mikasa', name:'Lame', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  cuphead_char: {
    templateId:'cuphead_char', name:'Tir de Blaster', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  emiya_kiri: {
    templateId:'emiya_kiri', name:'Magnum Snipe', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  flowey_ut: {
    templateId:'flowey_ut', name:'Vignes', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  godrick_er: {
    templateId:'godrick_er', name:'Frappe Royale', duration:12, cooldown:110,
    description:'×2 DPS pendant 12s',
    effect:{ dpsMultiplier:2 }, animDuration:1800,
  },
  trunks: {
    templateId:'trunks', name:'Dimension Trip', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  explorer: {
    templateId:'explorer', name:'Racine', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  sea_emperor: {
    templateId:'sea_emperor', name:'Chant Profond', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  zelda_char: {
    templateId:'zelda_char', name:'Flèche de Lumière', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  clown_repo: {
    templateId:'clown_repo', name:'Laser', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  asuna: {
    templateId:'asuna', name:'Starburst Stream', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  power_csm: {
    templateId:'power_csm', name:'Blood Devil', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  yor: {
    templateId:'yor', name:'Coup de Poing', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  nezuko: {
    templateId:'nezuko', name:'Kekki Sanjutsu', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  zenitsu: {
    templateId:'zenitsu', name:'Hekireki Issen', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  jinshi_ap: {
    templateId:'jinshi_ap', name:'Parfum', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  adam_va: {
    templateId:'adam_va', name:'Poing Divin', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  hornet_hk: {
    templateId:'hornet_hk', name:'Aiguillon', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  claudio: {
    templateId:'claudio', name:'Jugement', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  celeste_drp: {
    templateId:'celeste_drp', name:'Danse', duration:13, cooldown:110,
    description:'×2.2 DPS pendant 13s',
    effect:{ dpsMultiplier:2.2 }, animDuration:1950,
  },
  zoro: {
    templateId:'zoro', name:'Ittoryu Iai', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  madara: {
    templateId:'madara', name:'Katon : Goka Messhaku', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  millim: {
    templateId:'millim', name:'Urgent Thunder', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  byakuya: {
    templateId:'byakuya', name:'Senbonzakura Kageyoshi', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  richard_coeur: {
    templateId:'richard_coeur', name:'Clarent', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  ganondorf_char: {
    templateId:'ganondorf_char', name:'Triforce', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  pomni: {
    templateId:'pomni', name:'Sursaut', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  alice_sao: {
    templateId:'alice_sao', name:'Sacred Sword', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  atsushi: {
    templateId:'atsushi', name:'Beast Moonlight', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  mao_mao_ap: {
    templateId:'mao_mao_ap', name:'Poudre d\'Apothicaire', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  denji: {
    templateId:'denji', name:'Chainsaw Man', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  loid: {
    templateId:'loid', name:'Couteau', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  tanjiro: {
    templateId:'tanjiro', name:'Hinokami Kagura', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  edward: {
    templateId:'edward', name:'Alchimie', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  roy: {
    templateId:'roy', name:'Alchimiya', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  horus_na: {
    templateId:'horus_na', name:'Plume', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  livai: {
    templateId:'livai', name:'Spear', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  freddy_fnaf: {
    templateId:'freddy_fnaf', name:'Jumpscare', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  sans_ut: {
    templateId:'sans_ut', name:'Gaster Blaster', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  pichu: {
    templateId:'pichu', name:'Thunder Shock', duration:14, cooldown:110,
    description:'×2.4 DPS pendant 14s',
    effect:{ dpsMultiplier:2.4 }, animDuration:2100,
  },
  yami: {
    templateId:'yami', name:'Dimensional Slash', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  aizen: {
    templateId:'aizen', name:'Kyoka Suigetsu', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  shinra: {
    templateId:'shinra', name:'Adora Burst', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  jin_tekken: {
    templateId:'jin_tekken', name:'Electric Wind God Fist', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  zorua: {
    templateId:'zorua', name:'Balle Ombre', duration:15, cooldown:110,
    description:'×2.6 DPS pendant 15s',
    effect:{ dpsMultiplier:2.6 }, animDuration:2250,
  },
  brume: {
    templateId:'brume', name:'Bénédiction', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  steve: {
    templateId:'steve', name:'Coup de Pioche', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  dva: {
    templateId:'dva', name:'Self-Destruct', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  benimaru: {
    templateId:'benimaru', name:'Purgatory', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  aatrox_lol: {
    templateId:'aatrox_lol', name:'Darkin Blade', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  the_knight: {
    templateId:'the_knight', name:'Dash', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  eren: {
    templateId:'eren', name:'Rumbling', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  rayquaza: {
    templateId:'rayquaza', name:'Draco-Météore', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  ouchuu: {
    templateId:'ouchuu', name:'Dépression', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  qin_shi_huang: {
    templateId:'qin_shi_huang', name:'Shi Shu Gong', duration:17, cooldown:110,
    description:'×3 DPS pendant 17s',
    effect:{ dpsMultiplier:3 }, animDuration:2550,
  },
  vegeto: {
    templateId:'vegeto', name:'Final Kamehameha', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  gogeta: {
    templateId:'gogeta', name:'Big Bang Kamehameha', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  aizen_t: {
    templateId:'aizen_t', name:'Kyoka Suigetsu', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  yoriichi: {
    templateId:'yoriichi', name:'Hinokami Kagura', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  brunhilde: {
    templateId:'brunhilde', name:'Jugement', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  chara: {
    templateId:'chara', name:'Slash', duration:16, cooldown:110,
    description:'×2.8 DPS pendant 16s',
    effect:{ dpsMultiplier:2.8 }, animDuration:2400,
  },
  shanks: {
    templateId:'shanks', name:'Kamusari', duration:17, cooldown:110,
    description:'×3 DPS pendant 17s',
    effect:{ dpsMultiplier:3 }, animDuration:2550,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR — tout perso sans ulti explicite reçoit un ulti idle échelonné
// selon sa rareté (nom + effet + cooldown/durée cohérents).
// ═══════════════════════════════════════════════════════════════════════════
type Rarity = 'C'|'U'|'R'|'E'|'L'|'M'|'S'|'CO'|'P'|'T';

// Barème uniforme par rareté (cooldown 110s partout) — voir ULTIMATE_DEFS
// ci-dessus, qui couvre déjà tous les persos existants avec leur propre nom ;
// ceci ne sert que de filet pour un futur perso ajouté sans entrée explicite.
const RARITY_ULT: Record<Rarity, { name: string; duration: number; cooldown: number; effect: UltimateEffect; anim: number }> = {
  C:  { name:'Ultime',  duration:8,  cooldown:110, effect:{ dpsMultiplier:1.2 }, anim:1200 },
  U:  { name:'Ultime',  duration:9,  cooldown:110, effect:{ dpsMultiplier:1.4 }, anim:1350 },
  R:  { name:'Ultime',  duration:10, cooldown:110, effect:{ dpsMultiplier:1.6 }, anim:1500 },
  E:  { name:'Ultime',  duration:11, cooldown:110, effect:{ dpsMultiplier:1.8 }, anim:1650 },
  L:  { name:'Ultime',  duration:12, cooldown:110, effect:{ dpsMultiplier:2.0 }, anim:1800 },
  M:  { name:'Ultime',  duration:13, cooldown:110, effect:{ dpsMultiplier:2.2 }, anim:1950 },
  S:  { name:'Ultime',  duration:14, cooldown:110, effect:{ dpsMultiplier:2.4 }, anim:2100 },
  CO: { name:'Ultime',  duration:15, cooldown:110, effect:{ dpsMultiplier:2.6 }, anim:2250 },
  P:  { name:'Ultime',  duration:16, cooldown:110, effect:{ dpsMultiplier:2.8 }, anim:2400 },
  T:  { name:'Ultime',  duration:17, cooldown:110, effect:{ dpsMultiplier:3.0 }, anim:2550 },
};

function generateUltimate(templateId: string): UltimateDef | undefined {
  const tpl = getCharacterById(templateId);
  if (!tpl) return undefined;
  const arch = RARITY_ULT[tpl.rarity as Rarity] ?? RARITY_ULT.C;
  return {
    templateId,
    name: arch.name,
    description: `×${arch.effect.dpsMultiplier} DPS pendant ${arch.duration}s`,
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