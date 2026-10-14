// Château de Nakime — capacités et statuts du combat tactique.
//
// Chaque carte a une Attaque de base + 1 à 3 capacités selon sa rareté
// (Commune→Rare : 1, Épique→Mythique : 2, Stellaire et au-delà : 3, la
// troisième étant un ULTIME qui consomme 100 d'énergie). Les capacités sont
// tirées du « kit » de son rôle, de façon fixe pour chaque personnage. Les
// ennemis ont aussi leurs capacités (1 pour un sbire, 2 pour une élite, 3
// pour un boss) et annoncent leur prochaine action (intention).
import type { Rarity } from '@/types/game';
import { ULTIMATE_DEFS } from './ultimates';
import { getNakimeRole, hashId, rarityIdx, type NakimeRole } from './nakimeContent';
import { getCharacterKit } from './nakimeKits';

// ── Statuts ──────────────────────────────────────────────────────────────
export type StatusId = 'burn' | 'stun' | 'weak' | 'vuln' | 'atkUp' | 'regen' | 'taunt' | 'evade';

export const STATUS_INFO: Record<StatusId, { icon: string; label: string; color: string; text: string; debuff: boolean }> = {
  burn:  { icon: '🔥', label: 'Brûlure',        color: '#fb923c', debuff: true,  text: 'Subit des dégâts au début de chacun de ses tours.' },
  stun:  { icon: '💫', label: 'Étourdi',        color: '#facc15', debuff: true,  text: 'Passe son prochain tour.' },
  weak:  { icon: '🥀', label: 'Affaibli',       color: '#a3a3a3', debuff: true,  text: 'Inflige 30 % de dégâts en moins.' },
  vuln:  { icon: '🎯', label: 'Vulnérable',     color: '#f87171', debuff: true,  text: 'Subit 30 % de dégâts en plus.' },
  atkUp: { icon: '💢', label: 'Rage',           color: '#ef4444', debuff: false, text: 'Inflige 30 % de dégâts en plus.' },
  regen: { icon: '🌿', label: 'Régénération',   color: '#4ade80', debuff: false, text: 'Récupère des PV au début de chacun de ses tours.' },
  taunt: { icon: '🛡️', label: 'Provocation',    color: '#60a5fa', debuff: false, text: 'Les ennemis sont forcés de le viser.' },
  evade: { icon: '💨', label: 'Esquive',        color: '#e2e8f0', debuff: false, text: 'Esquive la prochaine attaque ciblée.' },
};

export const STATUS_DMG_MULT = 0.3;  // Affaibli / Vulnérable / Rage

// ── Capacités ────────────────────────────────────────────────────────────
export type AbilityTarget = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';

export type AbilityEffect =
  | { k: 'dmg'; mult: number; execute?: boolean; self?: boolean }      // × ATQ ; execute : ×2 sous 35 % PV
  | { k: 'heal'; mult: number; self?: boolean }                         // × ATQ
  | { k: 'shield'; pct: number; self?: boolean }                        // % des PV max du lanceur
  | { k: 'status'; s: StatusId; turns: number; chance?: number; self?: boolean; power?: number }  // power : × ATQ (brûlure/régén)
  | { k: 'cleanse'; self?: boolean };

export interface AbilityDef {
  id: string;
  name: string;
  icon: string;
  target: AbilityTarget;
  cd: number;              // recharge (tours du lanceur), 0 = aucune
  ult?: boolean;           // coûte 100 d'énergie
  effects: AbilityEffect[];
}

const a = (id: string, name: string, icon: string, target: AbilityTarget, cd: number, effects: AbilityEffect[], ult = false): AbilityDef =>
  ({ id, name, icon, target, cd, effects, ...(ult ? { ult } : {}) });

export const BASIC_ATTACK = 'basic';

export const ABILITIES: Record<string, AbilityDef> = Object.fromEntries([
  a(BASIC_ATTACK, 'Attaque', '⚔️', 'enemy', 0, [{ k: 'dmg', mult: 1 }]),
  // Assaillant
  a('as_slash',   'Taillade sanglante', '🩸', 'enemy',   2, [{ k: 'dmg', mult: 1.7 }, { k: 'status', s: 'vuln', turns: 2 }]),
  a('as_charge',  'Charge brutale',     '🐗', 'enemy',   3, [{ k: 'dmg', mult: 2.2 }, { k: 'status', s: 'stun', turns: 1, chance: 0.5 }]),
  a('as_cry',     'Cri de guerre',      '📯', 'allies',  4, [{ k: 'status', s: 'atkUp', turns: 2 }]),
  a('as_whirl',   'Lame tournoyante',   '🌀', 'enemies', 3, [{ k: 'dmg', mult: 0.85 }]),
  a('as_ult',     'Frappe dévastatrice', '💥', 'enemy',  0, [{ k: 'dmg', mult: 3.6 }, { k: 'status', s: 'atkUp', turns: 2, self: true }], true),
  // Gardien
  a('gd_taunt',   'Provocation',        '🛡️', 'self',    3, [{ k: 'status', s: 'taunt', turns: 2 }, { k: 'shield', pct: 0.25 }]),
  a('gd_wall',    'Mur de boucliers',   '🧱', 'allies',  3, [{ k: 'shield', pct: 0.12 }]),
  a('gd_bash',    'Coup de bouclier',   '🔨', 'enemy',   2, [{ k: 'dmg', mult: 1.2 }, { k: 'status', s: 'stun', turns: 1, chance: 0.6 }]),
  a('gd_crush',   'Écrasement',         '🪨', 'enemy',   3, [{ k: 'dmg', mult: 1.1 }, { k: 'status', s: 'weak', turns: 2 }]),
  a('gd_ult',     'Rempart absolu',     '🏯', 'allies',  0, [{ k: 'shield', pct: 0.3 }, { k: 'status', s: 'taunt', turns: 2, self: true }], true),
  // Soigneur
  a('hl_heal',    'Soin',               '💚', 'ally',    1, [{ k: 'heal', mult: 1.7 }]),
  a('hl_prayer',  'Prière',             '🙏', 'allies',  3, [{ k: 'heal', mult: 0.85 }]),
  a('hl_regen',   'Souffle de vie',     '🌿', 'ally',    3, [{ k: 'status', s: 'regen', turns: 3, power: 0.7 }, { k: 'cleanse' }]),
  a('hl_purify',  'Purification',       '✨', 'allies',  3, [{ k: 'cleanse' }, { k: 'heal', mult: 0.45 }]),
  a('hl_ult',     'Renaissance',        '🌸', 'allies',  0, [{ k: 'heal', mult: 1.9 }, { k: 'status', s: 'atkUp', turns: 2 }], true),
  // Assassin
  a('sn_poison',  'Lame empoisonnée',   '🧪', 'enemy',   2, [{ k: 'dmg', mult: 1.2 }, { k: 'status', s: 'burn', turns: 3, power: 0.45 }]),
  a('sn_exec',    'Exécution',          '🗡️', 'enemy',   3, [{ k: 'dmg', mult: 1.9, execute: true }]),
  a('sn_shadow',  'Pas de l\'ombre',    '💨', 'enemy',   3, [{ k: 'dmg', mult: 1.3 }, { k: 'status', s: 'evade', turns: 2, self: true }]),
  a('sn_lowblow', 'Coup bas',           '🥀', 'enemy',   3, [{ k: 'dmg', mult: 0.9 }, { k: 'status', s: 'weak', turns: 2 }, { k: 'status', s: 'vuln', turns: 2 }]),
  a('sn_ult',     'Danse des lames',    '🌙', 'enemy',   0, [{ k: 'dmg', mult: 4, execute: true }], true),
  // Mage
  a('mg_fire',    'Boule de feu',       '🔥', 'enemies', 2, [{ k: 'dmg', mult: 0.7 }, { k: 'status', s: 'burn', turns: 2, power: 0.3 }]),
  a('mg_bolt',    'Éclair',             '⚡', 'enemy',   2, [{ k: 'dmg', mult: 1.9 }]),
  a('mg_frost',   'Prison de glace',    '🧊', 'enemy',   3, [{ k: 'dmg', mult: 0.9 }, { k: 'status', s: 'stun', turns: 1 }]),
  a('mg_curse',   'Malédiction',        '🔮', 'enemies', 3, [{ k: 'status', s: 'vuln', turns: 2 }, { k: 'status', s: 'weak', turns: 1 }]),
  a('mg_ult',     'Cataclysme',         '☄️', 'enemies', 0, [{ k: 'dmg', mult: 1.7 }, { k: 'status', s: 'burn', turns: 2, power: 0.4 }], true),
  // Mécaniques signatures (utilisées par les kits nommés, voir nakimeKits.ts)
  a('sk_drain',   'Vol de vie',         '🩸', 'enemy',   3, [{ k: 'dmg', mult: 1.4 }, { k: 'heal', mult: 0.6, self: true }]),
  a('sk_powerup', 'Transformation',     '💥', 'self',    4, [{ k: 'status', s: 'atkUp', turns: 3 }, { k: 'shield', pct: 0.15 }]),
  a('sk_flurry',  'Rafale',             '👊', 'enemy',   2, [{ k: 'dmg', mult: 0.6 }, { k: 'dmg', mult: 0.6 }, { k: 'dmg', mult: 0.6 }]),
  a('sk_quake',   'Séisme',             '🌋', 'enemies', 3, [{ k: 'dmg', mult: 0.5 }, { k: 'status', s: 'stun', turns: 1, chance: 0.35 }]),
  a('ux_domain',  'Extension du territoire', '🌀', 'enemies', 0, [{ k: 'dmg', mult: 1 }, { k: 'status', s: 'stun', turns: 1 }, { k: 'status', s: 'vuln', turns: 2 }], true),
  a('ux_awaken',  'Éveil',              '✨', 'self',    0, [{ k: 'status', s: 'atkUp', turns: 3 }, { k: 'shield', pct: 0.4 }, { k: 'status', s: 'evade', turns: 2 }, { k: 'heal', mult: 0.5 }], true),
  // Ennemis
  a('e_bite',     'Morsure venimeuse',  '🐍', 'enemy',   3, [{ k: 'dmg', mult: 1 }, { k: 'status', s: 'burn', turns: 2, power: 0.35 }]),
  a('e_howl',     'Hurlement',          '🐺', 'allies',  4, [{ k: 'status', s: 'atkUp', turns: 2 }]),
  a('e_heavy',    'Coup lourd',         '🪓', 'enemy',   3, [{ k: 'dmg', mult: 1.7 }]),
  a('e_hex',      'Maléfice',           '🕯️', 'enemy',   3, [{ k: 'dmg', mult: 0.6 }, { k: 'status', s: 'weak', turns: 2 }]),
  a('e_guard',    'Carapace',           '🐢', 'self',    4, [{ k: 'shield', pct: 0.25 }]),
  a('e_sweep',    'Assaut',             '🌪️', 'enemies', 3, [{ k: 'dmg', mult: 0.6 }]),
  a('e_stun',     'Frappe étourdissante', '💫', 'enemy', 4, [{ k: 'dmg', mult: 1.2 }, { k: 'status', s: 'stun', turns: 1, chance: 0.6 }]),
  a('e_drain',    'Festin de sang',     '🩸', 'enemy',   3, [{ k: 'dmg', mult: 1.3 }, { k: 'heal', mult: 0.8, self: true }]),
  a('e_rampage',  'Déchaînement',       '👹', 'enemies', 3, [{ k: 'dmg', mult: 0.75 }]),
  a('e_mark',     'Marque démoniaque',  '🎯', 'enemies', 4, [{ k: 'status', s: 'vuln', turns: 2 }]),
  a('e_crush',    'Coup fatal',         '☠️', 'enemy',   3, [{ k: 'dmg', mult: 2.4 }]),
  a('e_inferno',  'Ultime démoniaque',  '🌋', 'enemies', 4, [{ k: 'dmg', mult: 1.1 }, { k: 'status', s: 'burn', turns: 2, power: 0.4 }]),
].map(x => [x.id, x]));

const ROLE_KITS: Record<NakimeRole, { skills: string[]; ult: string }> = {
  assaillant: { skills: ['as_slash', 'as_charge', 'as_cry', 'as_whirl'], ult: 'as_ult' },
  gardien:    { skills: ['gd_taunt', 'gd_wall', 'gd_bash', 'gd_crush'], ult: 'gd_ult' },
  soigneur:   { skills: ['hl_heal', 'hl_prayer', 'hl_regen', 'hl_purify'], ult: 'hl_ult' },
  assassin:   { skills: ['sn_poison', 'sn_exec', 'sn_shadow', 'sn_lowblow'], ult: 'sn_ult' },
  mage:       { skills: ['mg_fire', 'mg_bolt', 'mg_frost', 'mg_curse'], ult: 'mg_ult' },
};

// Capacité « signature » garantie en premier pour certains rôles (sinon un
// Soigneur commun pourrait ne pas savoir soigner une cible précise).
const ROLE_SIGNATURE: Partial<Record<NakimeRole, string>> = { soigneur: 'hl_heal', gardien: 'gd_taunt' };

/** Nombre de capacités (hors Attaque) selon la rareté. */
export function abilityCount(rarity: Rarity): number {
  const i = rarityIdx(rarity);
  return i <= 2 ? 1 : i <= 5 ? 2 : 3;
}

/** Capacités d'une carte (sans l'Attaque de base), fixes pour chaque personnage. */
export function cardAbilities(templateId: string, rarity: Rarity): string[] {
  const role = getNakimeRole(templateId);
  const kit = ROLE_KITS[role];
  const n = abilityCount(rarity);
  // Vraies techniques du personnage (nakimeKits.ts), complétées par son rôle si besoin.
  const named = getCharacterKit(templateId);
  if (named) {
    const skills = named.moves.filter(m => !ABILITIES[m.ability]?.ult).map(m => m.ability);
    const ult = named.moves.find(m => ABILITIES[m.ability]?.ult)?.ability;
    const out = skills.slice(0, Math.min(n, 2));
    for (const id of kit.skills) if (out.length < Math.min(n, 2) && !out.includes(id)) out.push(id);
    if (n >= 3) out.push(ult ?? kit.ult);
    return out;
  }
  const pool = [...kit.skills];
  const out: string[] = [];
  const sig = ROLE_SIGNATURE[role];
  if (sig) { out.push(sig); pool.splice(pool.indexOf(sig), 1); }
  let h = hashId(`kit:${templateId}`);
  while (out.length < Math.min(n, 2)) {
    out.push(pool.splice(h % pool.length, 1)[0]);
    h = Math.floor(h / 7) + 13;
  }
  if (n >= 3) out.push(kit.ult);
  return out;
}

/** Nom affiché d'une capacité : la vraie technique du personnage, sinon le nom générique. */
export function abilityName(id: string, templateId?: string): string {
  const move = templateId ? getCharacterKit(templateId)?.moves.find(m => m.ability === id) : undefined;
  if (move) return move.name;
  const def = ABILITIES[id];
  if (def?.ult && templateId && ULTIMATE_DEFS[templateId]) return ULTIMATE_DEFS[templateId].name;
  return def?.name ?? id;
}

// ── Kits des ennemis ─────────────────────────────────────────────────────
const MOB_SKILLS = ['e_bite', 'e_howl', 'e_heavy', 'e_hex', 'e_guard'];
const ELITE_SKILLS = ['e_sweep', 'e_stun', 'e_drain', 'e_hex', 'e_heavy'];

export function enemyAbilities(kind: 'mob' | 'elite' | 'boss', name: string): string[] {
  const h = hashId(`ekit:${name}`);
  if (kind === 'boss') return ['e_rampage', 'e_mark', 'e_crush'];
  if (kind === 'elite') {
    const first = ELITE_SKILLS[h % ELITE_SKILLS.length];
    const rest = ELITE_SKILLS.filter(x => x !== first);
    return [first, rest[Math.floor(h / 5) % rest.length]];
  }
  return [MOB_SKILLS[h % MOB_SKILLS.length]];
}
/** Capacité débloquée par un boss en rage (sous 50 % PV). */
export const BOSS_RAGE_ABILITY = 'e_inferno';

// ── Description lisible ──────────────────────────────────────────────────
const TARGET_TXT: Record<AbilityTarget, string> = {
  enemy: 'un ennemi', enemies: 'tous les ennemis', ally: 'un allié', allies: 'toute l\'équipe', self: 'soi-même',
};

export type AbilityKind = 'ult' | 'heal' | 'shield' | 'ctrl' | 'buff' | 'dmg';

/** Famille d'une capacité (couleur des boutons). */
export function abilityKind(id: string): AbilityKind {
  const def = ABILITIES[id];
  if (!def) return 'dmg';
  if (def.ult) return 'ult';
  const ks = def.effects.map(e => e.k);
  if (ks.includes('heal') && !ks.includes('dmg') || ks.includes('cleanse')) return 'heal';
  if (ks.includes('shield') || def.effects.some(e => e.k === 'status' && e.s === 'taunt')) return 'shield';
  if (def.effects.some(e => e.k === 'status' && (e.s === 'stun' || e.s === 'weak' || e.s === 'vuln'))) return ks.includes('dmg') && !def.effects.some(e => e.k === 'status' && e.s === 'stun') ? 'dmg' : 'ctrl';
  if (!ks.includes('dmg')) return 'buff';
  return 'dmg';
}

/** Icône affichée d'une capacité (celle de la technique du personnage si elle en a une). */
export function abilityIcon(id: string, templateId?: string): string {
  const move = templateId ? getCharacterKit(templateId)?.moves.find(m => m.ability === id) : undefined;
  return move?.icon ?? ABILITIES[id]?.icon ?? '✦';
}

export function describeAbility(id: string): string {
  const def = ABILITIES[id];
  if (!def) return '';
  const parts: string[] = [];
  for (let i = 0; i < def.effects.length; i++) {
    const e = def.effects[i];
    const who = e.self ? 'soi-même' : TARGET_TXT[def.target];
    switch (e.k) {
      case 'dmg': {
        // Coups identiques à la suite : « 3 × 60 % d'ATQ ».
        let hits = 1;
        while (def.effects[i + 1]?.k === 'dmg' && (def.effects[i + 1] as typeof e).mult === e.mult) { hits++; i++; }
        parts.push(`${hits > 1 ? `${hits} coups de ` : ''}${Math.round(e.mult * 100)} % d'ATQ à ${who}${e.execute ? ' (×2 sous 35 % PV)' : ''}`);
        break;
      }
      case 'heal': parts.push(`soigne ${who} de ${Math.round(e.mult * 100)} % d'ATQ`); break;
      case 'shield': parts.push(`bouclier de ${Math.round(e.pct * 100)} % des PV max${e.self || def.target === 'self' ? '' : ` à ${who}`}`); break;
      case 'status': {
        const st = STATUS_INFO[e.s];
        const dur = e.s === 'stun' ? '' : ` (${e.turns} tours)`;
        parts.push(`${e.chance ? `${Math.round(e.chance * 100)} % de chances : ` : ''}${st.icon} ${st.label}${dur}${e.self && def.target !== 'self' ? ' sur soi' : ''}`);
        break;
      }
      case 'cleanse': parts.push('retire les altérations'); break;
    }
  }
  const txt = parts.join(', ');
  return txt.charAt(0).toUpperCase() + txt.slice(1) + '.';
}

export function abilityMeta(id: string): string {
  const def = ABILITIES[id];
  if (!def) return '';
  if (def.ult) return 'Ultime · 100 énergie';
  return def.cd > 0 ? `Recharge ${def.cd} tours` : 'Sans recharge';
}

