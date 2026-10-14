// Château de Nakime — contenu (données pures) : rôles, reliques, bénédictions,
// événements, mondes des actes, améliorations permanentes et paliers de record.
// La mécanique qui s'en sert vit dans lib/game/nakimeCombat.ts (combat) et
// lib/game/nakime.ts (déroulé d'une run).
import { RARITY_ORDER_ASC, type Rarity } from '@/types/game';
import { getCharacterById } from './characters';
import { ENEMY_ROSTER_PALIERS, getPalierEnemyRoster, type EnemyRosterEntry } from './enemies';
import { getPalierConfig } from './paliers';
import { getCharacterKit } from './nakimeKits';

// ── Aléatoire déterministe ───────────────────────────────────────────────
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Graine dérivée pour un usage précis (carte d'un acte, combat, offres...). */
export function subSeed(seed: number, a: number, salt: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 31) + Math.imul(a, 7919) + Math.imul(salt, 104729)) >>> 0;
}

export function pickWeighted<T>(rng: () => number, entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r < 0) return v;
  }
  return entries[entries.length - 1][0];
}

export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const rarityIdx = (r: Rarity) => Math.max(0, RARITY_ORDER_ASC.indexOf(r));

// ── Rôles ────────────────────────────────────────────────────────────────
// Chaque carte a un rôle fixe (tiré de son id, ou forcé ci-dessous) qui
// oriente ses stats, sa cible et sa compétence.
export type NakimeRole = 'assaillant' | 'gardien' | 'soigneur' | 'assassin' | 'mage';
export const NAKIME_ROLES: NakimeRole[] = ['assaillant', 'gardien', 'soigneur', 'assassin', 'mage'];

export interface RoleInfo {
  label: string; icon: string; color: string;
  hp: number; atk: number; speed: number; crit: number;
  text: string;            // résumé du rôle
}

export const ROLE_INFO: Record<NakimeRole, RoleInfo> = {
  assaillant: { label: 'Assaillant', icon: '⚔️', color: '#f87171', hp: 1.05, atk: 1.15, speed: 0,  crit: 0,
    text: 'Dégâts solides et réguliers.' },
  gardien:    { label: 'Gardien',    icon: '🛡️', color: '#60a5fa', hp: 1.7,  atk: 0.7,  speed: -6, crit: 0,
    text: 'Encaisse et protège ses alliés (boucliers, provocation).' },
  soigneur:   { label: 'Soigneur',   icon: '💚', color: '#4ade80', hp: 1.0,  atk: 0.75, speed: 4,  crit: 0,
    text: 'Garde l\'équipe en vie.' },
  assassin:   { label: 'Assassin',   icon: '🗡️', color: '#c084fc', hp: 0.8,  atk: 1.3,  speed: 12, crit: 0.15,
    text: 'Rapide et critique, achève les ennemis affaiblis.' },
  mage:       { label: 'Mage',       icon: '🔮', color: '#fbbf24', hp: 0.85, atk: 1.0,  speed: 2,  crit: 0,
    text: 'Frappe tout le monde à la fois.' },
};

const ROLE_OVERRIDES: Partial<Record<string, NakimeRole>> = {
  tanjiro: 'assaillant', giyu_tomioka: 'gardien', nezuko: 'gardien', zenitsu: 'assassin',
  kanao_tsuyuri: 'assassin', aoi_kanzaki: 'soigneur', yoriichi: 'assaillant', sabito: 'assaillant',
};

export function getNakimeRole(templateId: string): NakimeRole {
  return getCharacterKit(templateId)?.role ?? ROLE_OVERRIDES[templateId] ?? NAKIME_ROLES[hashId(`role:${templateId}`) % NAKIME_ROLES.length];
}

// ── Reliques ─────────────────────────────────────────────────────────────
export type RelicTier = 'commune' | 'rare' | 'boss';
export const RELIC_TIER_INFO: Record<RelicTier, { label: string; color: string }> = {
  commune: { label: 'Commune', color: '#cbd5e1' },
  rare:    { label: 'Rare',    color: '#60a5fa' },
  boss:    { label: 'Boss',    color: '#f87171' },
};

export interface RelicMods {
  atkPct: number; hpPct: number; crit: number; critDmg: number; lifesteal: number; postHeal: number;
  postRevive: number; shardPct: number; speed: number; guard: number; energyStart: number; energyGainPct: number;
  shieldStartPct: number; thornsPct: number; firstRoundPct: number; executePct: number; healPct: number;
  bigGameDmgPct: number; strongBonus: number; dodge: number; restPct: number; discountPct: number;
  xpPct: number; lowRarityPct: number; slayerPct: number;
}

export const ZERO_MODS: RelicMods = {
  atkPct: 0, hpPct: 0, crit: 0, critDmg: 0, lifesteal: 0, postHeal: 0, postRevive: 0, shardPct: 0, speed: 0, guard: 0,
  energyStart: 0, energyGainPct: 0, shieldStartPct: 0, thornsPct: 0, firstRoundPct: 0, executePct: 0, healPct: 0,
  bigGameDmgPct: 0, strongBonus: 0, dodge: 0, restPct: 0, discountPct: 0, xpPct: 0, lowRarityPct: 0, slayerPct: 0,
};

export interface RelicDef { id: string; name: string; icon: string; tier: RelicTier; text: string; mods: Partial<RelicMods> }

const relic = (id: string, tier: RelicTier, icon: string, name: string, text: string, mods: Partial<RelicMods>): RelicDef =>
  ({ id, tier, icon, name, text, mods });

export const NAKIME_RELIC_LIST: RelicDef[] = [
  // Communes
  relic('nichirin', 'commune', '🗡️', 'Lame Nichirin',        '+15 % ATQ.',                                   { atkPct: 15 }),
  relic('haori',    'commune', '🥋', 'Haori du Pilier',      '+15 % PV max.',                                { hpPct: 15 }),
  relic('souffle',  'commune', '🌬️', 'Souffle Total',        '+10 % de chances de critique.',                { crit: 0.1 }),
  relic('glycine',  'commune', '💜', 'Fleur de Glycine',     'Soigne 12 % des PV après chaque combat.',      { postHeal: 0.12 }),
  relic('biwa',     'commune', '🪕', 'Corde de Biwa',        '+30 % d\'Éclats gagnés.',                       { shardPct: 30 }),
  relic('tambour',  'commune', '🥁', 'Tambour de Kyogai',    '+20 vitesse : ton équipe agit plus tôt.',      { speed: 20 }),
  relic('gourde',   'commune', '🍶', 'Gourde de Saké',       'Commence chaque combat avec 40 d\'énergie.',   { energyStart: 40 }),
  relic('bambou',   'commune', '🎋', 'Muselière de Bambou',  'Bouclier de 12 % des PV max au début du combat.', { shieldStartPct: 0.12 }),
  relic('fil',      'commune', '🕸️', 'Fil de Rui',           'Renvoie 20 % des dégâts subis.',               { thornsPct: 0.2 }),
  relic('parchemin','commune', '📜', 'Carnet d\'Entraînement', '+35 % d\'expérience gagnée.',                 { xpPct: 35 }),
  // Rares
  relic('sang',     'rare', '🩸', 'Sang de Démon Rare',      'Vol de vie : 12 % des dégâts infligés.',        { lifesteal: 0.12 }),
  relic('masque',   'rare', '🦊', 'Masque de Renard',        'Une fois par combat, un allié qui tombe survit à 1 PV.', { guard: 1 }),
  relic('marque',   'rare', '🔥', 'Marque du Pourfendeur',   '+35 % ATQ, mais −10 % PV max.',                 { atkPct: 35, hpPct: -10 }),
  relic('oeil',     'rare', '👁️', 'Œil de Lune Supérieure',  '+50 % de dégâts critiques.',                    { critDmg: 0.5 }),
  relic('tamayo',   'rare', '🌸', 'Remède de Tamayo',        '+40 % de soins.',                                { healPct: 40 }),
  relic('corbeau',  'rare', '🐦‍⬛', 'Corbeau Kasugai',        '+25 % de dégâts contre les élites et les boss.', { bigGameDmgPct: 25 }),
  relic('ecarlate', 'rare', '🌋', 'Lame Écarlate',           '+50 % de dégâts sur les ennemis sous 30 % PV.',  { executePct: 50 }),
  relic('miroir',   'rare', '🪞', 'Miroir de Nakime',        'L\'avantage de type passe de ×1,5 à ×1,8.',      { strongBonus: 0.3 }),
  relic('sandales', 'rare', '🩴', 'Sandales du Vent',        '12 % de chances d\'esquiver une attaque.',       { dodge: 0.12 }),
  relic('murata',   'rare', '🎌', 'Volonté de Murata',       'Cartes Commune à Rare : +50 % ATQ et PV.',       { lowRarityPct: 50 }),
  // Boss
  relic('muzan',    'boss', '🫀', 'Sang de Muzan',           '+25 % ATQ et +25 % PV max.',                     { atkPct: 25, hpPct: 25 }),
  relic('sablier',  'boss', '⏳', 'Sablier du Biwa',          '+60 % d\'énergie gagnée : compétences bien plus fréquentes.', { energyGainPct: 60 }),
  relic('soleil',   'boss', '☀️', 'Danse du Dieu du Feu',     'Dégâts ×2 pendant le premier tour de chaque combat.', { firstRoundPct: 100 }),
  relic('eveil',    'boss', '🌙', 'Marque Éveillée',         '+15 % de critique et +60 % de dégâts critiques.', { crit: 0.15, critDmg: 0.6 }),
  relic('pilier',   'boss', '🏯', 'Lame du Hashira',         'Cartes Demon Slayer : +40 % ATQ et PV. Les autres : +10 %.', { slayerPct: 40, atkPct: 10, hpPct: 10 }),
  relic('phenix',   'boss', '🪶', 'Plume de Résurrection',   'Après chaque combat, les alliés KO reviennent à 25 % PV.', { postRevive: 0.25 }),
];
export const NAKIME_RELICS: Record<string, RelicDef> = Object.fromEntries(NAKIME_RELIC_LIST.map(r => [r.id, r]));

export function relicMods(relics: readonly string[]): RelicMods {
  const out: RelicMods = { ...ZERO_MODS };
  for (const id of relics) {
    const def = NAKIME_RELICS[id];
    if (!def) continue;
    for (const [k, v] of Object.entries(def.mods) as [keyof RelicMods, number][]) out[k] += v;
  }
  return out;
}

// ── Bénédictions (récompense de combat à choisir) ────────────────────────
export type BoonKind = 'shards' | 'heal' | 'xp' | 'atk' | 'hp' | 'energy';
export const BOON_INFO: Record<BoonKind, { icon: string; name: string; text: (floor: number) => string }> = {
  shards: { icon: '🪕', name: 'Bourse d\'Éclats',     text: f => `+${boonShards(f)} Éclats.` },
  heal:   { icon: '🍵', name: 'Thé de Glycine',       text: () => 'Soigne 30 % des PV et ranime les KO à 15 %.' },
  xp:     { icon: '📜', name: 'Leçon d\'un Pilier',    text: () => '+120 XP à toutes les cartes debout.' },
  atk:    { icon: '🗡️', name: 'Affûtage',             text: () => '+8 % ATQ pour toute l\'équipe (jusqu\'à la fin de la run).' },
  hp:     { icon: '🫀', name: 'Respiration Profonde', text: () => '+8 % PV max pour toute l\'équipe (jusqu\'à la fin de la run).' },
  energy: { icon: '⚡', name: 'Concentration',        text: () => '+20 d\'énergie de départ à chaque combat (jusqu\'à la fin de la run).' },
};
export const boonShards = (floor: number) => 40 + floor * 4;

// ── Événements ───────────────────────────────────────────────────────────
export type EventEffect =
  | { k: 'shards'; n: number }            // n × (1 + étage/10)
  | { k: 'heal'; pct: number }
  | { k: 'damage'; pct: number }          // % des PV max, ne peut pas mettre KO
  | { k: 'revive'; pct: number }
  | { k: 'relic'; tier: RelicTier }
  | { k: 'xp'; n: number }
  | { k: 'atk'; pct: number }
  | { k: 'hp'; pct: number }
  | { k: 'gems'; n: number }
  | { k: 'stone'; n: number }
  | { k: 'pay'; pct: number }             // perd une part des Éclats
  | { k: 'gamble'; chance: number; win: EventEffect[]; lose: EventEffect[] };

export interface EventOption { label: string; text: string; effects: EventEffect[]; cost?: number }  // cost : Éclats (× (1 + étage/10))
export interface EventDef { id: string; icon: string; title: string; text: string; options: EventOption[] }

export const NAKIME_EVENTS: EventDef[] = [
  { id: 'biwa', icon: '🪕', title: 'La Mélodie de Nakime',
    text: 'Une note de biwa résonne. Les murs tournent, une relique flotte au centre de la salle… et la mélodie fait saigner les oreilles.',
    options: [
      { label: 'Écouter jusqu\'au bout', text: 'Toute l\'équipe perd 15 % PV. Gagne une relique rare.', effects: [{ k: 'damage', pct: 0.15 }, { k: 'relic', tier: 'rare' }] },
      { label: 'Se boucher les oreilles', text: 'Rien ne se passe.', effects: [] },
    ] },
  { id: 'glycines', icon: '💜', title: 'La Maison aux Glycines',
    text: 'Une vieille dame t\'accueille dans une maison protégée par les glycines. Pour une fois, aucun démon ne rôde.',
    options: [
      { label: 'Dormir', text: 'Soigne 35 % des PV.', effects: [{ k: 'heal', pct: 0.35 }] },
      { label: 'Méditer', text: '+150 XP pour les cartes debout.', effects: [{ k: 'xp', n: 150 }] },
    ] },
  { id: 'haganezuka', icon: '🔨', title: 'Le Forgeron Masqué',
    text: 'Un forgeron au masque de hyottoko grommelle en voyant l\'état de tes lames.',
    options: [
      { label: 'Lui confier les lames', text: '+10 % ATQ pour toute l\'équipe.', cost: 50, effects: [{ k: 'atk', pct: 10 }] },
      { label: 'Fuir avant qu\'il s\'énerve', text: 'Rien ne se passe.', effects: [] },
    ] },
  { id: 'affame', icon: '🩸', title: 'Le Démon Affamé',
    text: 'Un démon blessé rampe dans un couloir. Il implore ta pitié… ou fait semblant.',
    options: [
      { label: 'L\'achever', text: 'Gagne des Éclats, perd 5 % PV.', effects: [{ k: 'shards', n: 45 }, { k: 'damage', pct: 0.05 }] },
      { label: 'L\'épargner', text: '50 % : relique commune. 50 % : il attaque (−20 % PV).',
        effects: [{ k: 'gamble', chance: 0.5, win: [{ k: 'relic', tier: 'commune' }], lose: [{ k: 'damage', pct: 0.2 }] }] },
    ] },
  { id: 'coffre', icon: '🧰', title: 'Le Coffre Suspect',
    text: 'Un coffre laqué trône au milieu d\'un pont suspendu. Bien trop facile.',
    options: [
      { label: 'L\'ouvrir', text: '60 % : beaucoup d\'Éclats. 40 % : piège (−25 % PV).',
        effects: [{ k: 'gamble', chance: 0.6, win: [{ k: 'shards', n: 110 }], lose: [{ k: 'damage', pct: 0.25 }] }] },
      { label: 'Passer son chemin', text: 'Rien ne se passe.', effects: [] },
    ] },
  { id: 'corbeau', icon: '🐦‍⬛', title: 'Le Corbeau Messager',
    text: '« CAW ! CAW ! » Un corbeau Kasugai a trouvé quelque chose de brillant.',
    options: [
      { label: 'Suivre le corbeau', text: '+1 Pierre d\'Évolution dans ton butin.', effects: [{ k: 'stone', n: 1 }] },
      { label: 'Le nourrir', text: 'Soigne 25 % des PV et ranime les KO à 30 %.', cost: 30, effects: [{ k: 'heal', pct: 0.25 }, { k: 'revive', pct: 0.3 }] },
    ] },
  { id: 'urokodaki', icon: '👺', title: 'L\'Épreuve d\'Urokodaki',
    text: 'Un vieil homme masqué te défie : « Descends la montagne avant l\'aube. »',
    options: [
      { label: 'Relever le défi', text: 'Perd 20 % PV. +8 % PV max pour toute l\'équipe.', effects: [{ k: 'damage', pct: 0.2 }, { k: 'hp', pct: 8 }] },
      { label: 'S\'entraîner tranquillement', text: '+100 XP pour les cartes debout.', effects: [{ k: 'xp', n: 100 }] },
    ] },
  { id: 'tamayo', icon: '🌸', title: 'Le Laboratoire de Tamayo',
    text: 'Tamayo et Yushiro t\'ouvrent la porte d\'un laboratoire caché.',
    options: [
      { label: 'Accepter un remède', text: 'Ranime les KO à 60 % PV.', effects: [{ k: 'revive', pct: 0.6 }] },
      { label: 'Donner un peu de sang', text: 'Perd 12 % PV. +10 gemmes dans ton butin.', effects: [{ k: 'damage', pct: 0.12 }, { k: 'gems', n: 10 }] },
    ] },
  { id: 'miroirs', icon: '🪞', title: 'La Salle des Miroirs',
    text: 'Des centaines de reflets. L\'un d\'eux te sourit alors que tu ne souris pas.',
    options: [
      { label: 'Traverser', text: '50 % : relique rare. 50 % : −30 % PV.',
        effects: [{ k: 'gamble', chance: 0.5, win: [{ k: 'relic', tier: 'rare' }], lose: [{ k: 'damage', pct: 0.3 }] }] },
      { label: 'Briser un miroir', text: 'Gagne quelques Éclats.', effects: [{ k: 'shards', n: 30 }] },
    ] },
  { id: 'autel', icon: '🌙', title: 'L\'Autel de la Lune',
    text: 'Un autel gravé de six lunes. Une offrande y est attendue.',
    options: [
      { label: 'Faire une offrande', text: 'Perd la moitié de tes Éclats. Gagne une relique rare.', effects: [{ k: 'pay', pct: 0.5 }, { k: 'relic', tier: 'rare' }] },
      { label: 'Profaner l\'autel', text: '40 % : relique rare. 60 % : −25 % PV.',
        effects: [{ k: 'gamble', chance: 0.4, win: [{ k: 'relic', tier: 'rare' }], lose: [{ k: 'damage', pct: 0.25 }] }] },
    ] },
  { id: 'marchand', icon: '🎎', title: 'Le Marchand Égaré',
    text: 'Un marchand ambulant s\'est perdu dans le château. Il brade tout pour en sortir.',
    options: [
      { label: 'Acheter une relique', text: 'Une relique commune.', cost: 55, effects: [{ k: 'relic', tier: 'commune' }] },
      { label: 'Lui indiquer la sortie', text: '+60 XP et quelques Éclats.', effects: [{ k: 'xp', n: 60 }, { k: 'shards', n: 20 }] },
    ] },
  { id: 'rotation', icon: '🌀', title: 'La Salle Tournante',
    text: 'Nakime frappe une corde : la pièce bascule, tout le monde valse contre les murs.',
    options: [
      { label: 'S\'accrocher', text: 'Perd 10 % PV. +80 XP.', effects: [{ k: 'damage', pct: 0.1 }, { k: 'xp', n: 80 }] },
      { label: 'Se laisser porter', text: '50 % : +70 Éclats. 50 % : −18 % PV.',
        effects: [{ k: 'gamble', chance: 0.5, win: [{ k: 'shards', n: 70 }], lose: [{ k: 'damage', pct: 0.18 }] }] },
    ] },
];
export const NAKIME_EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(NAKIME_EVENTS.map(e => [e.id, e]));
export const eventScale = (floor: number) => 1 + floor / 10;

// ── Mondes (un par acte) ─────────────────────────────────────────────────
export const CASTLE_PALIER = 25; // Infinite Castle

export interface ActWorld {
  palier: number;
  name: string;
  universe: string;
  accent: string;
  mobs: EnemyRosterEntry[];
  elites: EnemyRosterEntry[];
  boss: EnemyRosterEntry;
  bossTitle: string;      // « Lune Supérieure », « Gardienne du château »...
}

const castle = () => getPalierEnemyRoster(CASTLE_PALIER);
// Lunes Supérieures qui gardent le château tous les 5 actes.
const UPPER_MOONS = ['Akaza', 'Doma', 'Kokushibo', 'Muzan Kibutsuji'];

export function actWorld(seed: number, act: number): ActWorld {
  const cr = castle();
  if (act === 1 || cr.length < 10) {
    const cfg = getPalierConfig(CASTLE_PALIER);
    const nakime = cr.find(e => e.name === 'Nakime') ?? cr[5];
    return {
      palier: CASTLE_PALIER, name: cfg.name, universe: cfg.universe, accent: '#fb7185',
      mobs: cr.slice(0, 4), elites: [cr[4]], boss: { ...nakime, isBoss: true }, bossTitle: 'Gardienne du château',
    };
  }
  // Les autres actes : un monde du multivers tiré au sort (jamais deux fois de suite le même).
  const pool = ENEMY_ROSTER_PALIERS.filter(p => p !== CASTLE_PALIER && getPalierEnemyRoster(p).length >= 10);
  const rng = makeRng(subSeed(seed, act, 11));
  let palier = pool[Math.floor(rng() * pool.length)];
  const prevPick = act > 2 ? pool[Math.floor(makeRng(subSeed(seed, act - 1, 11))() * pool.length)] : -1;
  if (palier === prevPick) palier = pool[(pool.indexOf(palier) + 1) % pool.length];
  const roster = getPalierEnemyRoster(palier);
  const cfg = getPalierConfig(palier);
  let boss = roster.find(e => e.isBoss) ?? roster[9];
  let bossTitle = 'Seigneur du monde';
  if (act % 5 === 0) {
    const moonName = UPPER_MOONS[(act / 5 - 1) % UPPER_MOONS.length];
    const moon = cr.find(e => e.name === moonName);
    if (moon) { boss = { ...moon, isBoss: true }; bossTitle = moonName === 'Muzan Kibutsuji' ? 'Roi des démons' : 'Lune Supérieure'; }
  }
  return {
    palier, name: cfg.name, universe: cfg.universe, accent: cfg.accentColor,
    mobs: roster.slice(0, 6), elites: roster.slice(6, 9), boss, bossTitle,
  };
}

// ── Mémoire du Château (améliorations permanentes) ───────────────────────
export type MetaUpgradeId =
  | 'start_shards' | 'team_hp' | 'team_atk' | 'rest' | 'discount' | 'loot' | 'start_relic' | 'choices' | 'second_wind' | 'entries';

export interface MetaUpgradeDef {
  id: MetaUpgradeId; icon: string; name: string; max: number;
  text: (lv: number) => string;
  cost: (lv: number) => number;   // coût du niveau lv+1
}

// Prix exponentiel : le niveau 1 coûte `base`, chaque niveau suivant coûte
// `factor` fois le précédent (la Mémoire se construit sur la durée).
const grow = (base: number, factor: number) => (lv: number) => Math.round(base * Math.pow(factor, lv));

// Tranchant / Endurance : % d'ATQ / de PV par niveau (10 niveaux).
export const NAKIME_META_STAT_PCT = 8;

export const NAKIME_META: MetaUpgradeDef[] = [
  { id: 'team_atk',     icon: '🗡️', name: 'Tranchant',        max: 10, text: lv => `+${lv * NAKIME_META_STAT_PCT} % ATQ en début de run`, cost: grow(30, 2) },
  { id: 'team_hp',      icon: '🫀', name: 'Endurance',        max: 10, text: lv => `+${lv * NAKIME_META_STAT_PCT} % PV max en début de run`, cost: grow(30, 2) },
  { id: 'start_shards', icon: '🪕', name: 'Bourse de départ', max: 6,  text: lv => `+${lv * 25} Éclats au départ`, cost: grow(20, 2) },
  { id: 'rest',         icon: '🍵', name: 'Sommeil profond',  max: 5,  text: lv => `Repos : +${lv * 6} % de soins`, cost: grow(25, 2.5) },
  { id: 'discount',     icon: '🏮', name: 'Client fidèle',    max: 5,  text: lv => `Boutique et Forge : −${lv * 4} %`, cost: grow(30, 2.5) },
  { id: 'loot',         icon: '💎', name: 'Pillard',          max: 5,  text: lv => `+${lv * 8} % de gemmes gagnées`, cost: grow(40, 2.5) },
  { id: 'start_relic',  icon: '🎁', name: 'Héritage',         max: 1,  text: lv => lv ? 'Commence avec une relique commune' : 'Commencer avec une relique commune', cost: () => 300 },
  { id: 'choices',      icon: '👁️', name: 'Œil du Biwa',      max: 1,  text: () => '4 choix de récompense au lieu de 3', cost: () => 500 },
  { id: 'second_wind',  icon: '🪶', name: 'Seconde chance',   max: 1,  text: () => "Une fois par run, une défaite ranime l'équipe à 30 % PV", cost: () => 1000 },
  { id: 'entries',      icon: '🗝️', name: 'Clé supplémentaire', max: 2, text: lv => `+${lv} entrée${lv > 1 ? 's' : ''} par jour`, cost: lv => (lv === 0 ? 1000 : 3000) },
];

/** Coût total pour monter une amélioration au maximum (à partir du niveau `from`). */
export function metaTotalCost(def: MetaUpgradeDef, from = 0): number {
  let total = 0;
  for (let lv = from; lv < def.max; lv++) total += def.cost(lv);
  return total;
}
export const NAKIME_META_BY_ID = Object.fromEntries(NAKIME_META.map(m => [m.id, m])) as Record<MetaUpgradeId, MetaUpgradeDef>;

// ── Paliers de record (récompenses uniques) ──────────────────────────────
export const NAKIME_TITLE_BIWA = '🪕 Résonance du Biwa';
export const NAKIME_TITLE_LORD = '🏯 Seigneur du Château Infini';

export interface NakimeMilestone { floor: number; gems: number; stones?: number; chestEpic?: number; title?: string }
export const NAKIME_MILESTONES: NakimeMilestone[] = [
  { floor: 10,  gems: 40 },
  { floor: 20,  gems: 70, stones: 1 },
  { floor: 30,  gems: 120, title: NAKIME_TITLE_BIWA },
  { floor: 40,  gems: 150, stones: 1 },
  { floor: 50,  gems: 200, chestEpic: 1 },
  { floor: 75,  gems: 300, stones: 2 },
  { floor: 100, gems: 500, chestEpic: 1, title: NAKIME_TITLE_LORD },
  { floor: 150, gems: 800, stones: 3 },
  { floor: 200, gems: 1200, chestEpic: 2 },
];

/** Carte de la collection éligible ? (le héros principal ne l'est pas) */
export function isNakimeEligible(templateId: string): boolean {
  const tpl = getCharacterById(templateId);
  return !!tpl && !tpl.isHero;
}
