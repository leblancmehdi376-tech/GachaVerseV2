// Château de Nakime — stats des cartes et combat tactique au tour par tour.
//
// Seules la rareté, le rôle, les synergies d'univers et le type d'une carte
// comptent (pas son niveau ni son équipement du mode principal). L'ordre des
// tours suit une frise d'initiative (valeur d'action = 1000 / vitesse). Au
// tour d'une carte, le JOUEUR choisit une capacité et une cible ; les
// ennemis agissent seuls et annoncent leur prochaine action (intention).
//
// Tout l'état du combat (PV, statuts, recharges, graine aléatoire...) est
// une donnée simple, sauvegardée avec la run : recharger la page reprend le
// combat exactement où il en était, sans pouvoir relancer un coup raté.
import { getCharacterById } from './characters';
import { parseInstanceKey, editionTier, type CardEdition } from './editions';
import { computeActiveSynergies } from './synergies';
import { getAffinityForId, affinityBeats, affinityBeatenBy, AFFINITY_STRONG, AFFINITY_WEAK, type Affinity } from './affinities';
import { ROLE_INFO, getNakimeRole, hashId, rarityIdx, relicMods, type NakimeRole, type RelicMods } from './nakimeContent';
import {
  ABILITIES, BASIC_ATTACK, BOSS_RAGE_ABILITY, STATUS_DMG_MULT, STATUS_INFO, abilityName, cardAbilities,
  type AbilityDef, type StatusId,
} from './nakimeAbilities';

export const NAKIME_LEVEL_STAT_PCT = 8;    // +8 % PV/ATQ par niveau de run
export const NAKIME_MAX_LEVEL = 20;        // niveau de run maximum
export const NAKIME_RUN_STAT_CAP = 80;     // bonus de run (bénédictions, événements...) plafonné à +80 % ATQ / PV
export const NAKIME_FORGE_TIER_PCT = 25;   // +25 % ATQ (arme) ou PV (armure) par palier
export const NAKIME_FORGE_MAX_TIER = 3;
export const NAKIME_MAX_ACTIONS = 600;     // garde-fou : au-delà, le combat est perdu (épuisement)
export const NAKIME_ENERGY_MAX = 100;

// Croissance des stats par cran de rareté (C → T ≈ ×12).
const RARITY_GROWTH = 1.32;
const BASE_HP = 120;
const BASE_ATK = 24;
const AV_BASE = 1000;

export interface NakimeMember {
  key: string;          // clé de collection (instance)
  templateId: string;
  hp: number;           // PV actuels (0 = KO)
  level: number;        // niveau de run (part de 1)
  xp: number;
  weapon: number;       // paliers d'arme forgée
  armor: number;        // paliers d'armure forgée
  edition?: CardEdition; // édition de la carte au moment d'entrer (bonus de stats)
}

/** Bonus des éditions au château : +10 % PV et ATQ par cran (Prismatique : +70 %). */
export const NAKIME_EDITION_PCT = 10;
export const editionStatMult = (edition?: CardEdition) => 1 + (NAKIME_EDITION_PCT / 100) * editionTier(edition);

/** Bonus de run communs à toute l'équipe (bénédictions, événements, Mémoire). */
// atkPct/hpPct : bonus de la run (bénédictions, événements...), additionnés aux reliques.
// metaAtkPct/metaHpPct : Mémoire du Château, multiplicateur à part (jamais dilué).
export interface TeamBonus { atkPct: number; hpPct: number; energy: number; metaAtkPct?: number; metaHpPct?: number }
export const NO_BONUS: TeamBonus = { atkPct: 0, hpPct: 0, energy: 0 };

/** Bonus d'ATQ (%) des synergies d'univers de l'équipe, par clé de carte. */
export function nakimeSynergyAtkPct(keys: readonly string[]): Record<string, number> {
  const syns = computeActiveSynergies([...keys]);
  const out: Record<string, number> = {};
  for (const key of keys) {
    const universe = getCharacterById(parseInstanceKey(key).templateId)?.universe;
    let pct = 0;
    for (const s of syns) {
      if (s.def.universe === universe) pct += s.threshold.dpsBonus;
      pct += s.threshold.globalBonus;
    }
    out[key] = pct;
  }
  return out;
}

export interface NakimeStats {
  maxHp: number; atk: number; speed: number; crit: number;
  affinity: Affinity; role: NakimeRole;
}

export function memberStats(
  m: Pick<NakimeMember, 'templateId' | 'level' | 'weapon' | 'armor' | 'edition'>,
  relics: readonly string[], synergyPct = 0, bonus: TeamBonus = NO_BONUS, mods: RelicMods = relicMods(relics),
): NakimeStats {
  const tpl = getCharacterById(m.templateId);
  const idx = rarityIdx(tpl?.rarity ?? 'C');
  const role = getNakimeRole(m.templateId);
  const ri = ROLE_INFO[role];
  const g = Math.pow(RARITY_GROWTH, idx);
  const lvl = 1 + (NAKIME_LEVEL_STAT_PCT / 100) * (m.level - 1);
  const special = (idx <= 2 ? mods.lowRarityPct : 0) + (tpl?.universe === 'Demon Slayer' ? mods.slayerPct : 0);
  const ed = editionStatMult(m.edition);
  const hpMult = ed * (1 + (bonus.metaHpPct ?? 0) / 100) * ri.hp * lvl * (1 + (NAKIME_FORGE_TIER_PCT / 100) * m.armor) * Math.max(0.1, 1 + (mods.hpPct + Math.min(NAKIME_RUN_STAT_CAP, bonus.hpPct) + special) / 100);
  const atkMult = ed * (1 + (bonus.metaAtkPct ?? 0) / 100) * ri.atk * lvl * (1 + (NAKIME_FORGE_TIER_PCT / 100) * m.weapon) * Math.max(0.1, 1 + (mods.atkPct + Math.min(NAKIME_RUN_STAT_CAP, bonus.atkPct) + special) / 100) * (1 + synergyPct / 100);
  return {
    maxHp: Math.round(BASE_HP * g * hpMult),
    atk: Math.round(BASE_ATK * g * atkMult),
    speed: 100 + idx * 2 + (hashId(m.templateId) % 10) + ri.speed + mods.speed,
    crit: 0.08 + ri.crit + mods.crit,
    affinity: getAffinityForId(m.templateId),
    role,
  };
}

/** Puissance indicative d'une équipe (affichée avant d'entrer). */
export function teamPower(keys: readonly string[], bonus: TeamBonus = NO_BONUS, editions: Record<string, CardEdition | undefined> = {}): number {
  const syn = nakimeSynergyAtkPct(keys);
  let p = 0;
  for (const key of keys) {
    const st = memberStats({ templateId: parseInstanceKey(key).templateId, level: 1, weapon: 0, armor: 0, edition: editions[key] ?? parseInstanceKey(key).edition }, [], syn[key] ?? 0, bonus);
    p += st.atk * 4 + st.maxHp;
  }
  return Math.round(p);
}

/** Capacités d'une carte, Attaque de base comprise. */
export function memberAbilities(templateId: string): string[] {
  const tpl = getCharacterById(templateId);
  return [BASIC_ATTACK, ...cardAbilities(templateId, tpl?.rarity ?? 'C')];
}

// ── Unités et état du combat ─────────────────────────────────────────────
export type EnemyKind = 'mob' | 'elite' | 'boss';

/** Unité telle qu'elle entre en combat. */
export interface NakimeUnit {
  id: string;           // unique dans le combat (a0..a4, e0..)
  side: 'ally' | 'enemy';
  name: string;
  templateId?: string;  // alliés
  sprite?: string;      // ennemis
  role?: NakimeRole;    // alliés
  kind?: EnemyKind;     // ennemis
  maxHp: number;
  hp: number;
  atk: number;
  speed: number;
  crit: number;
  affinity: Affinity;
  abilities: string[];  // Attaque de base en premier
}

export interface Status { id: StatusId; turns: number; value?: number }
export interface Intent { ability: string; target?: string }

export interface BUnit extends NakimeUnit {
  shield: number;
  energy: number;
  statuses: Status[];
  cds: Record<string, number>;   // tours de recharge restants
  av: number;                    // valeur d'action : la plus basse joue
  acted: number;                 // nombre de tours joués
  enraged?: boolean;
  intent?: Intent | null;        // ennemis : prochaine action annoncée
}

export interface BattleState {
  units: BUnit[];
  rng: number;                   // état du générateur aléatoire
  active: string | null;         // allié qui attend un ordre
  over: 'won' | 'lost' | null;
  actions: number;
  guards: number;                // Masque de Renard restants
  relics: string[];
  dmg: Record<string, number>;   // dégâts infligés par unité
  heal: Record<string, number>;  // soins prodigués par unité
  log: string[];                 // derniers événements (le plus récent en premier)
}

// ── Événements (pour l'animation) ────────────────────────────────────────
export interface NakimeEffect {
  tgt: string;
  dmg?: number;
  heal?: number;
  shield?: number;
  crit?: boolean;
  dodged?: boolean;
  guarded?: boolean;
  status?: StatusId;
  cleanse?: boolean;
  dot?: boolean;
  matchup?: 'strong' | 'weak' | 'neutral';
}

export interface UnitSnap { hp: number; shield: number; energy: number; st: Status[] }

export interface NakimeEvent {
  kind: 'act' | 'tick' | 'skip' | 'rage';
  src: string;
  ability?: string;
  name?: string;          // nom affiché de la capacité
  effects: NakimeEffect[];
  text: string;
  snap: UnitSnap[];       // état de chaque unité APRÈS l'événement
}

// ── Aléatoire (état sérialisable) ────────────────────────────────────────
function rand(st: BattleState): number {
  st.rng = (st.rng + 0x6d2b79f5) >>> 0;
  let t = st.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function matchupMult(atk: Affinity, def: Affinity, strongBonus: number): number {
  if (atk === def) return 1;
  if (affinityBeats(atk) === def) return AFFINITY_STRONG + strongBonus;
  if (affinityBeatenBy(atk) === def) return AFFINITY_WEAK;
  return 1;
}

const alive = (st: BattleState, side: 'ally' | 'enemy') => st.units.filter(u => u.side === side && u.hp > 0);
const has = (u: BUnit, s: StatusId) => u.statuses.some(x => x.id === s);
const unitById = (st: BattleState, id: string | null | undefined) => st.units.find(u => u.id === id);
const hpPct = (u: BUnit) => u.hp / u.maxHp;

export function snapUnits(st: BattleState): UnitSnap[] {
  return st.units.map(u => ({ hp: u.hp, shield: u.shield, energy: Math.round(u.energy), st: u.statuses.map(s => ({ ...s })) }));
}

function pushLog(st: BattleState, line: string) {
  st.log = [line, ...st.log].slice(0, 30);
}

function gainEnergy(st: BattleState, u: BUnit, n: number) {
  if (u.side !== 'ally' || u.hp <= 0) return;
  const mods = relicMods(st.relics);
  u.energy = Math.min(NAKIME_ENERGY_MAX, u.energy + n * (1 + mods.energyGainPct / 100));
}

export function abilityReady(u: BUnit, id: string): boolean {
  const def = ABILITIES[id];
  if (!def || !u.abilities.includes(id)) return false;
  if (def.ult) return u.energy >= NAKIME_ENERGY_MAX;
  return (u.cds[id] ?? 0) <= 0;
}

/** Statut appliqué par `src` sur `tgt` (un statut sur soi dure un tour de plus : il décompte dès la fin de ce tour). */
function applyStatus(st: BattleState, src: BUnit, tgt: BUnit, s: StatusId, turns: number, value?: number) {
  const t = turns + (src.id === tgt.id && s !== 'stun' ? 1 : 0);
  const cur = tgt.statuses.find(x => x.id === s);
  if (cur) {
    cur.turns = Math.max(cur.turns, t);
    if (value !== undefined) cur.value = Math.max(cur.value ?? 0, value);
  } else tgt.statuses.push({ id: s, turns: t, ...(value !== undefined ? { value } : {}) });
}

// Bouclier d'abord, Masque de Renard, énergie, épines, vol de vie.
function strike(st: BattleState, src: BUnit, tgt: BUnit, mult: number, execute: boolean, single: boolean, effects: NakimeEffect[]) {
  const mods = relicMods(st.relics);
  const allyAtk = src.side === 'ally';
  if (single && has(tgt, 'evade')) {
    tgt.statuses = tgt.statuses.filter(x => x.id !== 'evade');
    effects.push({ tgt: tgt.id, dmg: 0, dodged: true });
    return;
  }
  if (!allyAtk && mods.dodge > 0 && rand(st) < mods.dodge) {
    effects.push({ tgt: tgt.id, dmg: 0, dodged: true });
    return;
  }
  const aff = matchupMult(src.affinity, tgt.affinity, allyAtk ? mods.strongBonus : 0);
  const crit = rand(st) < (allyAtk ? src.crit : 0.08);
  let m = mult * aff * (crit ? 1.6 + (allyAtk ? mods.critDmg : 0) : 1) * (0.92 + rand(st) * 0.16);
  if (has(src, 'weak')) m *= 1 - STATUS_DMG_MULT;
  if (has(src, 'atkUp')) m *= 1 + STATUS_DMG_MULT;
  if (has(tgt, 'vuln')) m *= 1 + STATUS_DMG_MULT;
  if (execute && hpPct(tgt) < 0.35) m *= 2;
  if (allyAtk) {
    if (src.acted === 0) m *= 1 + mods.firstRoundPct / 100;
    if (hpPct(tgt) < 0.3) m *= 1 + mods.executePct / 100;
    if (tgt.kind === 'elite' || tgt.kind === 'boss') m *= 1 + mods.bigGameDmgPct / 100;
  }
  const dmg = Math.max(1, Math.round(src.atk * m));
  const absorbed = Math.min(tgt.shield, dmg);
  tgt.shield -= absorbed;
  tgt.hp = Math.max(0, tgt.hp - (dmg - absorbed));
  st.dmg[src.id] = (st.dmg[src.id] ?? 0) + dmg;
  let guarded = false;
  if (tgt.side === 'ally' && tgt.hp === 0 && st.guards > 0) {
    tgt.hp = 1;
    st.guards--;
    guarded = true;
  }
  effects.push({ tgt: tgt.id, dmg, crit, matchup: aff > 1 ? 'strong' : aff < 1 ? 'weak' : 'neutral', ...(guarded ? { guarded } : {}) });
  gainEnergy(st, tgt, 10);
  if (allyAtk && mods.lifesteal > 0 && src.hp > 0) {
    const h = Math.min(src.maxHp - src.hp, Math.round(dmg * mods.lifesteal));
    if (h > 0) { src.hp += h; st.heal[src.id] = (st.heal[src.id] ?? 0) + h; }
  }
  if (!allyAtk && tgt.side === 'ally' && mods.thornsPct > 0 && src.hp > 0) {
    const back = Math.max(1, Math.round(dmg * mods.thornsPct));
    src.hp = Math.max(0, src.hp - back);
    st.dmg[tgt.id] = (st.dmg[tgt.id] ?? 0) + back;
    effects.push({ tgt: src.id, dmg: back });
  }
}

function healUnit(st: BattleState, src: BUnit, tgt: BUnit, amount: number, effects: NakimeEffect[]) {
  if (tgt.hp <= 0) return;
  const mods = relicMods(st.relics);
  const h = Math.min(tgt.maxHp - tgt.hp, Math.round(amount * (src.side === 'ally' ? 1 + mods.healPct / 100 : 1)));
  tgt.hp += h;
  st.heal[src.id] = (st.heal[src.id] ?? 0) + h;
  effects.push({ tgt: tgt.id, heal: h });
}

/** Cibles réelles d'une capacité (la provocation force les attaques ciblées des ennemis). */
function resolveTargets(st: BattleState, u: BUnit, def: AbilityDef, targetId?: string): BUnit[] {
  const foes = alive(st, u.side === 'ally' ? 'enemy' : 'ally');
  const friends = alive(st, u.side);
  switch (def.target) {
    case 'enemies': return foes;
    case 'allies': return friends;
    case 'self': return [u];
    case 'ally': {
      const t = friends.find(f => f.id === targetId);
      return [t ?? friends.reduce((x, y) => (hpPct(y) < hpPct(x) ? y : x))];
    }
    case 'enemy': {
      if (u.side === 'enemy') {
        const taunt = foes.find(f => has(f, 'taunt'));
        if (taunt) return [taunt];
      }
      const t = foes.find(f => f.id === targetId);
      return t ? [t] : foes.length ? [foes[0]] : [];
    }
  }
}

function checkOver(st: BattleState) {
  if (!alive(st, 'enemy').length) st.over = 'won';
  else if (!alive(st, 'ally').length) st.over = 'lost';
}

function castAbility(st: BattleState, u: BUnit, id: string, targetId: string | undefined, events: NakimeEvent[]) {
  const def = ABILITIES[id] ?? ABILITIES[BASIC_ATTACK];
  const targets = resolveTargets(st, u, def, targetId);
  const effects: NakimeEffect[] = [];
  const single = def.target === 'enemy';
  for (const e of def.effects) {
    const list = e.self ? [u] : targets;
    for (const t of list) {
      if (t.hp <= 0 && e.k !== 'cleanse') continue;
      switch (e.k) {
        case 'dmg': strike(st, u, t, e.mult, !!e.execute, single, effects); break;
        case 'heal': healUnit(st, u, t, u.atk * e.mult, effects); break;
        case 'shield': {
          const s = Math.round(u.maxHp * e.pct);
          t.shield += s;
          effects.push({ tgt: t.id, shield: s });
          break;
        }
        case 'status':
          if (e.chance !== undefined && rand(st) >= e.chance) break;
          if (t.hp <= 0) break;
          applyStatus(st, u, t, e.s, e.turns, e.power ? Math.round(u.atk * e.power) : undefined);
          effects.push({ tgt: t.id, status: e.s });
          break;
        case 'cleanse':
          if (t.statuses.some(x => STATUS_INFO[x.id].debuff)) {
            t.statuses = t.statuses.filter(x => !STATUS_INFO[x.id].debuff);
            effects.push({ tgt: t.id, cleanse: true });
          }
          break;
      }
    }
  }
  if (def.ult) u.energy = 0;
  else gainEnergy(st, u, id === BASIC_ATTACK ? 30 : 20);
  if (def.cd > 0) u.cds[id] = def.cd;
  const name = abilityName(id, u.templateId);
  const tgtName = def.target === 'enemy' || def.target === 'ally' ? targets[0]?.name : undefined;
  const text = `${u.name} — ${name}${tgtName ? ` → ${tgtName}` : ''}`;
  pushLog(st, text);
  events.push({ kind: 'act', src: u.id, ability: id, name, effects, text, snap: snapUnits(st) });

  // Rage des boss sous 50 % PV : +30 % ATQ et une capacité ultime en plus.
  for (const b of st.units) {
    if (b.kind === 'boss' && !b.enraged && b.hp > 0 && hpPct(b) < 0.5) {
      b.enraged = true;
      b.atk = Math.round(b.atk * 1.3);
      if (!b.abilities.includes(BOSS_RAGE_ABILITY)) b.abilities.push(BOSS_RAGE_ABILITY);
      b.intent = { ability: BOSS_RAGE_ABILITY };
      const txt = `${b.name} entre en rage ! ATQ +30 %`;
      pushLog(st, txt);
      events.push({ kind: 'rage', src: b.id, effects: [], text: txt, snap: snapUnits(st) });
    }
  }
  checkOver(st);
}

// ── IA ennemie : intention annoncée un tour à l'avance ───────────────────
function planIntent(st: BattleState, u: BUnit): Intent {
  const foes = alive(st, 'ally');
  const friends = alive(st, 'enemy');
  const usable = u.abilities.filter(id => {
    if (id === BASIC_ATTACK) return false;
    if ((u.cds[id] ?? 0) > 1) return false;   // recharge décomptée au début de son prochain tour
    if (id === 'e_guard') return hpPct(u) < 0.7;
    if (id === 'e_howl') return !friends.some(f => has(f, 'atkUp'));
    if (id === 'e_mark') return !foes.every(f => has(f, 'vuln'));
    return true;
  });
  let ability = BASIC_ATTACK;
  if (usable.includes(BOSS_RAGE_ABILITY)) ability = BOSS_RAGE_ABILITY;
  else if (usable.length && rand(st) < 0.75) ability = usable[Math.floor(rand(st) * usable.length)];
  const def = ABILITIES[ability];
  if (def.target !== 'enemy' || !foes.length) return { ability };
  const taunt = foes.find(f => has(f, 'taunt'));
  if (taunt) return { ability, target: taunt.id };
  const weights = foes.map(f => {
    const idx = st.units.filter(x => x.side === 'ally').indexOf(f);
    return (idx < 2 ? 2 : 1) * (hpPct(f) < 0.35 ? 1.6 : 1);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand(st) * total;
  for (let i = 0; i < foes.length; i++) { r -= weights[i]; if (r < 0) return { ability, target: foes[i].id }; }
  return { ability, target: foes[0].id };
}

function enemyTurn(st: BattleState, u: BUnit, events: NakimeEvent[]) {
  let intent = u.intent ?? planIntent(st, u);
  if (!abilityReady(u, intent.ability) && intent.ability !== BASIC_ATTACK) intent = { ability: BASIC_ATTACK, target: intent.target };
  const def = ABILITIES[intent.ability];
  let target = intent.target;
  if (def.target === 'enemy' && !alive(st, 'ally').some(f => f.id === target)) target = planIntent(st, u).target;
  castAbility(st, u, intent.ability, target, events);
}

// ── Déroulé des tours ────────────────────────────────────────────────────
function nextActor(st: BattleState): BUnit | null {
  let best: BUnit | null = null;
  for (const u of st.units) if (u.hp > 0 && (!best || u.av < best.av)) best = u;
  return best;
}

function endTurn(st: BattleState, u: BUnit) {
  u.statuses = u.statuses.filter(s => s.id === 'stun' || --s.turns > 0);
  u.av += AV_BASE / u.speed;
  u.acted++;
  st.actions++;
  if (u.side === 'enemy' && u.hp > 0) u.intent = planIntent(st, u);
  if (st.actions >= NAKIME_MAX_ACTIONS && !st.over) st.over = 'lost';
}

/** Joue les tours jusqu'à ce qu'un allié doive agir (ou que le combat se termine). */
function advance(st: BattleState, events: NakimeEvent[]) {
  st.active = null;
  for (let guard = 0; guard < 400 && !st.over; guard++) {
    const u = nextActor(st);
    if (!u) { checkOver(st); return; }
    for (const k of Object.keys(u.cds)) u.cds[k] = Math.max(0, u.cds[k] - 1);
    // Effets de début de tour : brûlure, régénération.
    const ticks: NakimeEffect[] = [];
    for (const s of u.statuses) {
      if (s.id === 'burn' && s.value) {
        const d = Math.min(u.hp, s.value);
        u.hp -= d;
        ticks.push({ tgt: u.id, dmg: d, dot: true, status: 'burn' });
      } else if (s.id === 'regen' && s.value && u.hp > 0) {
        const h = Math.min(u.maxHp - u.hp, s.value);
        u.hp += h;
        ticks.push({ tgt: u.id, heal: h, dot: true, status: 'regen' });
      }
    }
    if (ticks.length) {
      const txt = `${u.name} : ${ticks.map(t => (t.dmg ? `🔥 −${t.dmg}` : `🌿 +${t.heal}`)).join(', ')}`;
      pushLog(st, txt);
      events.push({ kind: 'tick', src: u.id, effects: ticks, text: txt, snap: snapUnits(st) });
    }
    if (u.hp <= 0) { u.av += AV_BASE / u.speed; checkOver(st); continue; }
    if (has(u, 'stun')) {
      u.statuses = u.statuses.filter(s => s.id !== 'stun');
      const txt = `${u.name} est étourdi et passe son tour.`;
      pushLog(st, txt);
      events.push({ kind: 'skip', src: u.id, effects: [], text: txt, snap: snapUnits(st) });
      endTurn(st, u);
      continue;
    }
    if (u.side === 'ally') { st.active = u.id; return; }
    enemyTurn(st, u, events);
    endTurn(st, u);
  }
}

export function createBattle(seed: number, allies: NakimeUnit[], enemies: NakimeUnit[], relics: readonly string[], bonus: TeamBonus = NO_BONUS): { state: BattleState; events: NakimeEvent[] } {
  const mods = relicMods(relics);
  const st: BattleState = {
    units: [], rng: seed >>> 0, active: null, over: null, actions: 0, guards: mods.guard, relics: [...relics], dmg: {}, heal: {}, log: [],
  };
  st.units = [...allies, ...enemies].map(u => ({
    ...u,
    shield: u.side === 'ally' && u.hp > 0 && mods.shieldStartPct > 0 ? Math.round(u.maxHp * mods.shieldStartPct) : 0,
    energy: u.side === 'ally' ? Math.min(NAKIME_ENERGY_MAX, mods.energyStart + bonus.energy) : 0,
    statuses: [], cds: {}, av: 0, acted: 0, intent: null,
  }));
  for (const u of st.units) u.av = (AV_BASE / u.speed) * (1 + rand(st) * 0.08);
  for (const u of st.units) if (u.side === 'enemy') u.intent = planIntent(st, u);
  const events: NakimeEvent[] = [];
  advance(st, events);
  return { state: st, events };
}

const clone = (st: BattleState): BattleState => JSON.parse(JSON.stringify(st));

/** Ordre du joueur pour l'allié actif. Renvoie le nouvel état et les événements à animer. */
export function playerAction(state: BattleState, abilityId: string, targetId?: string): { state: BattleState; events: NakimeEvent[] } | string {
  if (state.over || !state.active) return 'Ce n\'est pas ton tour.';
  const st = clone(state);
  const u = unitById(st, st.active);
  if (!u || u.hp <= 0) return 'Carte introuvable.';
  if (!abilityReady(u, abilityId)) return 'Capacité indisponible.';
  const def = ABILITIES[abilityId];
  if (def.target === 'enemy' && !alive(st, 'enemy').some(e => e.id === targetId)) return 'Choisis un ennemi.';
  if (def.target === 'ally' && !alive(st, 'ally').some(e => e.id === targetId)) return 'Choisis un allié.';
  const events: NakimeEvent[] = [];
  castAbility(st, u, abilityId, targetId, events);
  endTurn(st, u);
  advance(st, events);
  return { state: st, events };
}

// ── IA alliée (mode Auto, simulations) ───────────────────────────────────
export function suggestAction(st: BattleState): { ability: string; target?: string } | null {
  const u = unitById(st, st.active);
  if (!u) return null;
  const foes = alive(st, 'enemy');
  const friends = alive(st, 'ally');
  if (!foes.length) return null;
  const ready = u.abilities.filter(id => abilityReady(u, id));
  const scoreFoe = (f: BUnit) => hpPct(f) - (matchupMult(u.affinity, f.affinity, 0) > 1 ? 0.35 : 0) - (f.kind === 'boss' ? 0.1 : 0);
  const bestFoe = foes.reduce((x, y) => (scoreFoe(y) < scoreFoe(x) ? y : x));
  const dangerous = foes.filter(f => !has(f, 'stun')).reduce((x, y) => (y.atk > x.atk ? y : x), foes[0]);
  const lowest = friends.reduce((x, y) => (hpPct(y) < hpPct(x) ? y : x));
  const hurt = friends.filter(f => hpPct(f) < 0.7).length;
  const pick = (id: string): { ability: string; target?: string } => {
    const def = ABILITIES[id];
    if (def.target === 'ally') return { ability: id, target: lowest.id };
    if (def.target !== 'enemy') return { ability: id };
    const stuns = def.effects.some(e => e.k === 'status' && e.s === 'stun');
    return { ability: id, target: (stuns ? dangerous : bestFoe).id };
  };
  const useful = (id: string): boolean => {
    const def = ABILITIES[id];
    if (def.ult) return true;
    if (def.effects.some(e => e.k === 'heal')) return def.target === 'allies' ? hurt >= 2 : hpPct(lowest) < 0.6;
    if (id === 'gd_taunt') return !has(u, 'taunt') && friends.some(f => f.id !== u.id && hpPct(f) < 0.8);
    if (id === 'gd_wall') return hurt >= 2;
    if (id === 'hl_regen' || id === 'hl_purify') return hurt >= 1 || friends.some(f => f.statuses.some(s => STATUS_INFO[s.id].debuff));
    if (def.target === 'allies' && def.effects.every(e => e.k === 'status')) return !friends.some(f => has(f, 'atkUp'));
    if (id === 'mg_curse') return foes.length >= 2 && !foes.every(f => has(f, 'vuln'));
    if (def.target === 'enemies') return foes.length >= 2;
    return true;
  };
  const order = [...ready.filter(id => ABILITIES[id].ult), ...ready.filter(id => !ABILITIES[id].ult && id !== BASIC_ATTACK)];
  for (const id of order) if (useful(id)) return pick(id);
  return pick(BASIC_ATTACK);
}

export function autoAction(state: BattleState): { state: BattleState; events: NakimeEvent[] } | string {
  const s = suggestAction(state);
  if (!s) return 'Aucune action possible.';
  return playerAction(state, s.ability, s.target);
}

/** Prochains acteurs selon la frise d'initiative (sans tenir compte des étourdissements). */
export function turnOrder(st: BattleState, n: number): string[] {
  const av = new Map(st.units.filter(u => u.hp > 0).map(u => [u.id, u.av]));
  const speed = new Map(st.units.map(u => [u.id, u.speed]));
  const out: string[] = [];
  while (out.length < n && av.size) {
    let best = '';
    for (const [id, v] of av) if (!best || v < av.get(best)!) best = id;
    out.push(best);
    av.set(best, av.get(best)! + AV_BASE / speed.get(best)!);
  }
  return out;
}

/** PV finaux des alliés (par id). */
export function finalAllyHp(st: BattleState): Record<string, number> {
  return Object.fromEntries(st.units.filter(u => u.side === 'ally').map(u => [u.id, u.hp]));
}

export function buildAllies(members: readonly NakimeMember[], relics: readonly string[], bonus: TeamBonus = NO_BONUS): NakimeUnit[] {
  const syn = nakimeSynergyAtkPct(members.map(m => m.key));
  const mods = relicMods(relics);
  return members.map((m, i) => {
    const st = memberStats(m, relics, syn[m.key] ?? 0, bonus, mods);
    return {
      id: `a${i}`, side: 'ally' as const, name: getCharacterById(m.templateId)?.name ?? m.templateId, templateId: m.templateId,
      role: st.role, maxHp: st.maxHp, hp: Math.min(st.maxHp, m.hp), atk: st.atk, speed: st.speed, crit: st.crit,
      affinity: st.affinity, abilities: memberAbilities(m.templateId),
    };
  });
}
