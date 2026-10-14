// Château de Nakime — mode roguelike infini (rubrique Activités).
//
// Le joueur entre avec 5 cartes de sa collection (seules leur rareté, leur
// rôle, leurs synergies d'univers et leur type comptent, voir nakimeCombat.ts).
// Le château est découpé en ACTES de 10 étages : chaque acte a sa carte à
// embranchements (combats, élites, événements, boutiques, forges, repos,
// trésors) et se termine par un boss. Chaque acte se déroule dans un monde du
// multivers (acte 1 : l'Infinite Castle, boss Nakime ; une Lune Supérieure
// tous les 5 actes). La run s'arrête à la première défaite ou quand le joueur
// se retire ; le butin accumulé est crédité dans tous les cas.
//
// Toutes les fonctions de ce fichier sont pures et déterministes à partir de
// run.seed : recharger la page ne permet ni de rejouer un combat, ni de
// retirer une carte, des offres ou des récompenses différentes.
import { parseInstanceKey, type CardEdition } from './editions';
import { getCharacterById } from './characters';
import { getAffinityForId } from './affinities';
import {
  makeRng, subSeed, pickWeighted, relicMods, actWorld, isNakimeEligible, eventScale, boonShards, rarityIdx, NAKIME_META_STAT_PCT,
  NAKIME_RELIC_LIST, NAKIME_RELICS, NAKIME_EVENTS, NAKIME_EVENT_BY_ID, BOON_INFO,
  type BoonKind, type EventEffect, type RelicTier, type MetaUpgradeId,
} from './nakimeContent';
import {
  NAKIME_FORGE_MAX_TIER, NAKIME_MAX_LEVEL, buildAllies, createBattle, playerAction, autoAction, finalAllyHp, memberStats, nakimeSynergyAtkPct,
  type NakimeMember, type NakimeUnit, type TeamBonus, type BattleState, type NakimeEvent,
} from './nakimeCombat';
import { enemyAbilities, BASIC_ATTACK } from './nakimeAbilities';

export * from './nakimeContent';
export * from './nakimeCombat';
export * from './nakimeAbilities';

// ── Réglages ──────────────────────────────────────────────────────────────
export const NAKIME_TEAM_SIZE = 5;
export const NAKIME_DAILY_ENTRIES = 1;
// En local (npm run dev), entrées illimitées pour pouvoir tester le mode à
// volonté. Next remplace process.env.NODE_ENV au build : en production, cette
// constante vaut toujours false.
export const NAKIME_UNLIMITED_ENTRIES = process.env.NODE_ENV === 'development';
export const NAKIME_ACT_FLOORS = 10;
export const NAKIME_REST_HEAL = 0.35;
export const NAKIME_ACT_HEAL = 0.3;        // soin offert en changeant d'acte

// ── Nœuds de la carte ────────────────────────────────────────────────────
export type NakimeNodeKind = 'combat' | 'elite' | 'boss' | 'shop' | 'forge' | 'rest' | 'treasure' | 'event';

export const NAKIME_NODE_INFO: Record<NakimeNodeKind, { label: string; icon: string; color: string; text: string }> = {
  combat:   { label: 'Combat',    icon: '⚔️', color: '#f87171', text: 'Des ennemis gardent la salle. Récompense : une bénédiction au choix.' },
  elite:    { label: 'Élite',     icon: '💀', color: '#c084fc', text: 'Un adversaire redoutable. Récompense : une relique au choix.' },
  boss:     { label: 'Boss',      icon: '👹', color: '#ef4444', text: 'Le maître de l\'acte. Récompense : une relique de boss.' },
  shop:     { label: 'Boutique',  icon: '🏮', color: '#fbbf24', text: 'Soins, entraînement et reliques contre des Éclats.' },
  forge:    { label: 'Forge',     icon: '⚒️', color: '#fb923c', text: 'Armes, armures, Pierres d\'Évolution et coffres d\'équipement.' },
  rest:     { label: 'Repos',     icon: '🍵', color: '#4ade80', text: 'Soigne l\'équipe et ranime les alliés KO.' },
  treasure: { label: 'Trésor',    icon: '🎁', color: '#38bdf8', text: 'Des Éclats et une relique.' },
  event:    { label: 'Rencontre', icon: '❓', color: '#e879f9', text: 'Une rencontre étrange : à toi de choisir.' },
};

export const isFightNode = (k: NakimeNodeKind) => k === 'combat' || k === 'elite' || k === 'boss';

export interface MapNode { kind: NakimeNodeKind; lo: number; hi: number }  // liens vers [lo, hi] de la rangée suivante
export type ActMap = MapNode[][];   // rangée 0 = 1er étage de l'acte

const mapCache = new Map<string, ActMap>();

/** Carte d'un acte : rangées de 2 à 4 nœuds, liens sans croisement (déterministe). */
export function generateActMap(seed: number, act: number): ActMap {
  const cacheKey = `${seed}:${act}`;
  const cached = mapCache.get(cacheKey);
  if (cached) return cached;
  const rng = makeRng(subSeed(seed, act, 1));
  const kinds: NakimeNodeKind[][] = [];
  for (let r = 0; r < NAKIME_ACT_FLOORS; r++) {
    if (r === NAKIME_ACT_FLOORS - 1) { kinds.push(['boss']); continue; }
    if (r === NAKIME_ACT_FLOORS - 2) { kinds.push((['rest', 'shop', 'forge', 'rest'] as NakimeNodeKind[]).slice(0, 3 + Math.floor(rng() * 2))); continue; }
    if (r === 0) { kinds.push(['combat', 'combat', 'combat']); continue; }
    const n = 3 + Math.floor(rng() * 2);
    const pool: [NakimeNodeKind, number][] = [
      ['combat', 42], ['event', 18], ['elite', r >= 2 ? 13 : 0], ['shop', r >= 2 ? 9 : 0],
      ['forge', r >= 2 ? 7 : 0], ['rest', r >= 3 ? 7 : 0], ['treasure', r >= 3 && r <= 6 ? 7 : 0],
    ];
    const row: NakimeNodeKind[] = [];
    for (let i = 0; i < n; i++) {
      // Évite deux boutiques/forges/repos/trésors côte à côte dans une même rangée.
      const k = pickWeighted(rng, pool.filter(([kind, w]) => w > 0 && (kind === 'combat' || kind === 'event' || kind === 'elite' || row[i - 1] !== kind)));
      row.push(k);
    }
    if (!row.some(isFightNode)) row[Math.floor(rng() * n)] = 'combat';
    kinds.push(row);
  }
  // Liens : chaque nœud vise la colonne « la plus proche » de la rangée
  // suivante, avec parfois une voisine ; les intervalles [lo, hi] restent
  // ordonnés (lo d'un nœud ≥ hi du précédent), donc aucun croisement.
  const map: ActMap = kinds.map(row => row.map(kind => ({ kind, lo: 0, hi: 0 })));
  for (let r = 0; r < map.length - 1; r++) {
    const a = map[r].length, b = map[r + 1].length;
    const base = map[r].map((_, i) => Math.min(b - 1, Math.floor(((i + 0.5) / a) * b)));
    map[r].forEach((node, i) => { node.lo = base[i]; node.hi = base[i]; });
    map[r].forEach((node, i) => {
      if (rng() < 0.45 && node.hi + 1 < b && (i === a - 1 || base[i + 1] >= node.hi + 1)) node.hi++;
      else if (rng() < 0.3 && node.lo - 1 >= 0 && (i === 0 || map[r][i - 1].hi <= node.lo - 1)) node.lo--;
    });
    for (let j = 0; j < b; j++) {
      if (map[r].some(n => n.lo <= j && j <= n.hi)) continue;
      const before = map[r].filter(n => n.hi < j);
      if (before.length) before[before.length - 1].hi = j;
      else map[r][0].lo = j;
    }
  }
  mapCache.set(cacheKey, map);
  if (mapCache.size > 32) mapCache.delete(mapCache.keys().next().value as string);
  return map;
}

// ── Butin persistant (crédité à la fin de la run) ────────────────────────
// tickets : Tickets de l'Infini (1 par acte terminé), monnaie mise de côté pour plus tard.
export interface NakimeLoot { gems: number; stones: number; chestRare: number; chestEpic: number; tickets: number }
export const emptyNakimeLoot = (): NakimeLoot => ({ gems: 0, stones: 0, chestRare: 0, chestEpic: 0, tickets: 0 });

export function addLoot(a: NakimeLoot, b: Partial<NakimeLoot>): NakimeLoot {
  return {
    gems: a.gems + (b.gems ?? 0), stones: a.stones + (b.stones ?? 0),
    chestRare: a.chestRare + (b.chestRare ?? 0), chestEpic: a.chestEpic + (b.chestEpic ?? 0),
    tickets: (a.tickets ?? 0) + (b.tickets ?? 0),
  };
}

/** Butin d'un étage franchi : plus on monte, plus il grossit (sans limite). */
export function floorLoot(floor: number, kind: NakimeNodeKind): NakimeLoot {
  const loot = emptyNakimeLoot();
  // Butin volontairement maigre : une gemme tous les 8 étages environ, le
  // gros du butin vient des élites et des boss (fins d'acte).
  loot.gems = floor >= 10 ? 1 + Math.floor(floor / 50) : 0;
  if (kind === 'elite') loot.gems += 2 + Math.floor(floor / 25);
  if (kind === 'boss') {
    const n = Math.round(floor / NAKIME_ACT_FLOORS);
    loot.gems += 10 + n * 2;
    loot.stones += 1;
    loot.tickets += 1;               // Ticket de l'Infini : un par acte terminé
    if (n >= 3) loot.chestEpic += 1;
    else loot.chestRare += 1;
  }
  return loot;
}

// ── Run ──────────────────────────────────────────────────────────────────
export type NakimeOfferKind = 'heal' | 'revive' | 'train' | 'relic' | 'weapon' | 'armor' | 'whetstone' | 'stone' | 'chestRare' | 'chestEpic';

export interface NakimeOffer { kind: NakimeOfferKind; price: number; relic?: string; needsTarget?: boolean }

export const NAKIME_OFFER_INFO: Record<Exclude<NakimeOfferKind, 'relic'>, { name: string; icon: string; text: string }> = {
  heal:      { name: 'Thé de Glycine',            icon: '🍵', text: 'Soigne 40 % des PV de toute l\'équipe.' },
  revive:    { name: 'Encens de Résurrection',    icon: '🕯️', text: 'Ranime tous les alliés KO à 50 % de leurs PV.' },
  train:     { name: 'Parchemin d\'Entraînement', icon: '📜', text: '+1 niveau pour toutes les cartes debout.' },
  weapon:    { name: 'Forger une arme',           icon: '⚔️', text: `+25 % ATQ pour la carte choisie (${NAKIME_FORGE_MAX_TIER} paliers max).` },
  armor:     { name: 'Forger une armure',         icon: '🛡️', text: `+25 % PV pour la carte choisie (${NAKIME_FORGE_MAX_TIER} paliers max).` },
  whetstone: { name: 'Pierre à aiguiser',         icon: '🪨', text: '+6 % ATQ pour toute l\'équipe.' },
  stone:     { name: 'Pierre d\'Évolution',        icon: '💠', text: 'Ajoutée à ton butin : gardée à la fin de la run.' },
  chestRare: { name: 'Coffre d\'équipement rare',  icon: '🧰', text: 'Un vrai équipement, ajouté à ton butin.' },
  chestEpic: { name: 'Coffre d\'équipement épique', icon: '👑', text: 'Un vrai équipement épique, ajouté à ton butin.' },
};

export interface NakimeRoom { kind: 'shop' | 'forge'; offers: NakimeOffer[]; bought: number[]; rerolls: number }

export type NakimePending =
  | { kind: 'boon'; options: BoonKind[] }
  | { kind: 'relic'; tier: 'elite' | 'boss'; options: string[] }
  | { kind: 'event'; id: string };

export interface NakimeRunStats { fights: number; elites: number; bosses: number; events: number }

export interface NakimeRun {
  v: 3;
  seed: number;
  act: number;
  row: number;               // dernière rangée franchie dans l'acte (-1 = début d'acte)
  col: number;               // colonne du nœud courant (-1 en début d'acte)
  path: number[];            // colonnes parcourues dans l'acte courant
  members: NakimeMember[];
  shards: number;            // Éclats (monnaie de la run)
  relics: string[];
  bonus: TeamBonus;          // bénédictions / événements / Mémoire
  room: NakimeRoom | null;   // boutique / forge ouverte
  pending: NakimePending | null;
  loot: NakimeLoot;
  stats: NakimeRunStats;
  secondWind: boolean;       // Seconde chance encore disponible
  meta: { choices: number; restPct: number; discountPct: number; lootPct: number };
  battle: NakimeFight | null; // combat en cours (sauvegardé tour par tour)
  enemyScale?: number;        // adaptation des ennemis à la rareté de l'équipe (voir teamEnemyScale)
}

/** Combat en cours sur un nœud de la carte. */
export interface NakimeFight { kind: 'combat' | 'elite' | 'boss'; col: number; floor: number; state: BattleState }

export const isValidRun = (r: unknown): r is NakimeRun => !!r && typeof r === 'object' && (r as NakimeRun).v === 3;

/** Étage du prochain nœud à jouer. */
export const currentFloor = (run: Pick<NakimeRun, 'act' | 'row'>) => (run.act - 1) * NAKIME_ACT_FLOORS + run.row + 2;
export const floorsCleared = (run: Pick<NakimeRun, 'act' | 'row'>) => currentFloor(run) - 1;

/** Colonnes atteignables dans la prochaine rangée. */
export function reachableCols(run: NakimeRun): number[] {
  const map = generateActMap(run.seed, run.act);
  const nextRow = run.row + 1;
  if (nextRow >= map.length) return [];
  if (run.row < 0) return map[0].map((_, i) => i);
  const node = map[run.row][run.col];
  const out: number[] = [];
  for (let j = node.lo; j <= node.hi; j++) out.push(j);
  return out;
}

/** Vérifie une équipe : 5 cartes possédées, personnages distincts. */
export function validateTeam(keys: readonly string[], owned: Record<string, unknown>): string | null {
  if (keys.length !== NAKIME_TEAM_SIZE) return `Il faut ${NAKIME_TEAM_SIZE} cartes.`;
  const tids = new Set<string>();
  for (const k of keys) {
    if (!owned[k]) return 'Carte introuvable dans ta collection.';
    const tid = parseInstanceKey(k).templateId;
    if (!isNakimeEligible(tid)) return 'Carte invalide.';
    if (tids.has(tid)) return 'Chaque personnage ne peut être pris qu\'une fois.';
    tids.add(tid);
  }
  return null;
}

// Le château s'adapte à l'équipe : les ennemis sont renforcés selon la rareté
// moyenne des cartes (une équipe Transcendante reste ~3× plus forte qu'une
// équipe Commune, au lieu de ~12×), pour que même les meilleures équipes
// soient mises à l'épreuve dès l'acte 1.
export const NAKIME_ADAPT_EXP = 0.4;
export function teamEnemyScale(keys: readonly string[]): number {
  if (!keys.length) return 1;
  const growth = keys.map(k => Math.pow(1.32, rarityIdx(getCharacterById(parseInstanceKey(k).templateId)?.rarity ?? 'C')));
  return Math.pow(growth.reduce((s, g) => s + g, 0) / growth.length, NAKIME_ADAPT_EXP);
}

export type NakimeMetaLevels = Partial<Record<MetaUpgradeId, number>>;

export function createRun(keys: readonly string[], seed: number, meta: NakimeMetaLevels = {}, editions: Record<string, CardEdition | undefined> = {}): NakimeRun {
  const lv = (id: MetaUpgradeId) => meta[id] ?? 0;
  const bonus: TeamBonus = { atkPct: 0, hpPct: 0, energy: 0, metaAtkPct: lv('team_atk') * NAKIME_META_STAT_PCT, metaHpPct: lv('team_hp') * NAKIME_META_STAT_PCT };
  const relics: string[] = [];
  if (lv('start_relic') > 0) {
    const pool = NAKIME_RELIC_LIST.filter(r => r.tier === 'commune');
    relics.push(pool[Math.floor(makeRng(subSeed(seed, 0, 9))() * pool.length)].id);
  }
  const members: NakimeMember[] = keys.map(key => ({
    key, templateId: parseInstanceKey(key).templateId, hp: 0, level: 1, xp: 0, weapon: 0, armor: 0,
    edition: editions[key] ?? parseInstanceKey(key).edition,
  }));
  const run: NakimeRun = {
    v: 3, battle: null, enemyScale: teamEnemyScale(keys), seed, act: 1, row: -1, col: -1, path: [], members, shards: lv('start_shards') * 25, relics, bonus,
    room: null, pending: null, loot: emptyNakimeLoot(), stats: { fights: 0, elites: 0, bosses: 0, events: 0 },
    secondWind: lv('second_wind') > 0,
    meta: { choices: lv('choices') > 0 ? 4 : 3, restPct: lv('rest') * 6, discountPct: lv('discount') * 4, lootPct: lv('loot') * 8 },
  };
  const stats = runMemberStats(run);
  run.members = members.map((m, i) => ({ ...m, hp: stats[i].maxHp }));
  return run;
}

/** Stats courantes (PV max inclus) de chaque carte de la run. */
export function runMemberStats(run: Pick<NakimeRun, 'members' | 'relics' | 'bonus'>) {
  const syn = nakimeSynergyAtkPct(run.members.map(m => m.key));
  const mods = relicMods(run.relics);
  return run.members.map(m => memberStats(m, run.relics, syn[m.key] ?? 0, run.bonus, mods));
}

/** Recalcule les PV après un changement de PV max (garde le même écart aux PV max). */
function withStatsChange(before: NakimeRun, after: NakimeRun): NakimeRun {
  const a = runMemberStats(before), b = runMemberStats(after);
  return {
    ...after,
    members: after.members.map((m, i) => m.hp <= 0 ? m : { ...m, hp: Math.max(1, Math.min(b[i].maxHp, m.hp + (b[i].maxHp - a[i].maxHp))) }),
  };
}

/** Soigne chaque carte debout d'une part de ses PV max (et ranime à `revive` si > 0). */
export function healMembers(run: Pick<NakimeRun, 'members' | 'relics' | 'bonus'>, pct: number, revive = 0): NakimeMember[] {
  const stats = runMemberStats(run);
  return run.members.map((m, i) => {
    const max = stats[i].maxHp;
    if (m.hp <= 0) return revive > 0 ? { ...m, hp: Math.max(1, Math.round(max * revive)) } : m;
    return { ...m, hp: Math.min(max, m.hp + Math.round(max * pct)) };
  });
}

/** Inflige des dégâts en % des PV max sans jamais mettre KO. */
function hurtMembers(run: NakimeRun, pct: number): NakimeMember[] {
  const stats = runMemberStats(run);
  return run.members.map((m, i) => m.hp <= 0 ? m : { ...m, hp: Math.max(1, m.hp - Math.round(stats[i].maxHp * pct)) });
}

export function nakimeXpToNext(level: number): number {
  return 60 + level * 40;
}

export function xpReward(kind: NakimeNodeKind): number {
  return kind === 'boss' ? 160 : kind === 'elite' ? 90 : kind === 'combat' ? 50 : 25;
}

/** Ajoute de l'XP à toute l'équipe debout (passages de niveau inclus). */
export function giveXp(run: NakimeRun, xp: number): NakimeRun {
  const amount = Math.round(xp * (1 + relicMods(run.relics).xpPct / 100));
  const next = {
    ...run,
    members: run.members.map(m => {
      if (m.hp <= 0) return m;
      let { level, xp: cur } = m;
      cur += amount;
      while (level < NAKIME_MAX_LEVEL && cur >= nakimeXpToNext(level)) { cur -= nakimeXpToNext(level); level++; }
      return { ...m, level, xp: level >= NAKIME_MAX_LEVEL ? 0 : cur };
    }),
  };
  return withStatsChange(run, next);
}

export function shardReward(kind: NakimeNodeKind, floor: number, relics: readonly string[]): number {
  const base = kind === 'boss' ? 110 + floor * 6
    : kind === 'elite' ? 50 + floor * 3
    : kind === 'treasure' ? 45 + floor * 4
    : kind === 'combat' ? 25 + floor * 2
    : 0;
  return Math.round(base * (1 + relicMods(relics).shardPct / 100));
}

// ── Ennemis d'un nœud ────────────────────────────────────────────────────
/** Multiplicateur de puissance des ennemis à un étage (croissance infinie). */
export const NAKIME_GROWTH_RATE = 0.105;
export const NAKIME_GROWTH_POW = 2.6;

export function floorScale(floor: number): number {
  // Courbe polynomiale, douce au début et raide en fin de partie. Calibrée pour
  // qu'une équipe de 5 Transcendants prismatiques avec toute la Mémoire du
  // Château plafonne vers l'étage 100, et que rien de moins n'y arrive.
  return Math.pow(1 + NAKIME_GROWTH_RATE * (floor - 1), NAKIME_GROWTH_POW);
}

export function buildEnemies(seed: number, act: number, floor: number, col: number, kind: NakimeNodeKind, teamScale = 1): NakimeUnit[] {
  const world = actWorld(seed, act);
  const rng = makeRng(subSeed(seed, floor * 16 + col, 2));
  const s = floorScale(floor) * teamScale;
  const make = (e: { name: string; sprite: string }, i: number, ek: 'mob' | 'elite' | 'boss', hpMult: number, atkMult: number): NakimeUnit => ({
    id: `e${i}`, side: 'enemy', name: e.name, sprite: e.sprite, kind: ek,
    maxHp: Math.round(140 * s * hpMult), hp: Math.round(140 * s * hpMult), atk: Math.round(23 * s * atkMult),
    speed: 95 + Math.floor(rng() * 20) + (ek === 'boss' ? 8 : 0), crit: 0.08,
    affinity: getAffinityForId(e.name), abilities: [BASIC_ATTACK, ...enemyAbilities(ek, e.name)],
  });
  const mob = () => world.mobs[Math.floor(rng() * world.mobs.length)];
  if (kind === 'boss') return [make(world.boss, 0, 'boss', 3.9, 1.2), make(mob(), 1, 'mob', 1, 1), make(mob(), 2, 'mob', 1, 1)];
  if (kind === 'elite') {
    const out = [make(world.elites[Math.floor(rng() * world.elites.length)], 0, 'elite', 3.6, 1.5)];
    const extra = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < extra; i++) out.push(make(mob(), i + 1, 'mob', 1, 1));
    return out;
  }
  const count = 2 + Math.floor(rng() * (floor >= 6 ? 3 : 2));
  return Array.from({ length: count }, (_, i) => make(mob(), i, 'mob', 1, 1));
}

export const battleSeed = (seed: number, floor: number, col: number) => subSeed(seed, floor * 16 + col, 5);

// ── Choix de récompenses ─────────────────────────────────────────────────
const BOON_KINDS = Object.keys(BOON_INFO) as BoonKind[];

export function rollBoons(seed: number, floor: number, count: number): BoonKind[] {
  const rng = makeRng(subSeed(seed, floor, 6));
  const pool = [...BOON_KINDS];
  const out: BoonKind[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function rollRelicChoices(seed: number, floor: number, owned: readonly string[], tier: 'elite' | 'boss', count: number): string[] {
  const rng = makeRng(subSeed(seed, floor, 7));
  const free = (t: RelicTier) => NAKIME_RELIC_LIST.filter(r => r.tier === t && !owned.includes(r.id)).map(r => r.id);
  const out: string[] = [];
  const take = (pool: string[]) => {
    const left = pool.filter(id => !out.includes(id));
    if (left.length) out.push(left[Math.floor(rng() * left.length)]);
  };
  for (let i = 0; i < count; i++) {
    if (tier === 'boss') { take(free('boss')); if (out.length <= i) take(free('rare')); }
    else take(rng() < 0.35 ? free('rare') : free('commune'));
    if (out.length <= i) take([...free('commune'), ...free('rare')]);
  }
  return out;
}

export function rollTreasureRelic(seed: number, floor: number, owned: readonly string[]): string | null {
  const rng = makeRng(subSeed(seed, floor, 4));
  const tier: RelicTier = rng() < 0.3 ? 'rare' : 'commune';
  let pool = NAKIME_RELIC_LIST.filter(r => r.tier === tier && !owned.includes(r.id));
  if (!pool.length) pool = NAKIME_RELIC_LIST.filter(r => r.tier !== 'boss' && !owned.includes(r.id));
  return pool.length ? pool[Math.floor(rng() * pool.length)].id : null;
}

export function pickEvent(seed: number, floor: number, col: number): string {
  return NAKIME_EVENTS[Math.floor(makeRng(subSeed(seed, floor * 16 + col, 8))() * NAKIME_EVENTS.length)].id;
}

// ── Boutique et forge ────────────────────────────────────────────────────
const price = (run: NakimeRun, base: number) => Math.max(1, Math.round(base * (1 - run.meta.discountPct / 100)));

export function rollShop(run: NakimeRun, floor: number, reroll = 0): NakimeOffer[] {
  const rng = makeRng(subSeed(run.seed, floor, 3 + reroll * 101));
  const free = (t: RelicTier) => NAKIME_RELIC_LIST.filter(r => r.tier === t && !run.relics.includes(r.id)).map(r => r.id);
  const pick = (pool: string[], taken: string[]) => {
    const left = pool.filter(id => !taken.includes(id));
    return left.length ? left[Math.floor(rng() * left.length)] : null;
  };
  const relics: NakimeOffer[] = [];
  const taken: string[] = [];
  for (const t of ['commune', 'commune', 'rare'] as RelicTier[]) {
    const id = pick(free(t), taken) ?? pick([...free('commune'), ...free('rare')], taken);
    if (!id) continue;
    taken.push(id);
    relics.push({ kind: 'relic', relic: id, price: price(run, NAKIME_RELICS[id].tier === 'rare' ? 150 + floor * 8 : 80 + floor * 5) });
  }
  return [
    { kind: 'heal', price: price(run, 30 + floor * 3) },
    { kind: 'revive', price: price(run, 55 + floor * 5) },
    { kind: 'train', price: price(run, 65 + floor * 6) },
    ...relics,
  ];
}

export const rerollPrice = (run: NakimeRun, floor: number, rerolls: number) => price(run, Math.round((25 + floor * 2) * Math.pow(1.5, rerolls)));

export function forgeTierPrice(run: NakimeRun, floor: number, tier: number): number {
  return price(run, Math.round((45 + floor * 4) * (1 + tier * 0.5)));
}

export function rollForge(run: NakimeRun, floor: number): NakimeOffer[] {
  return [
    { kind: 'weapon', price: forgeTierPrice(run, floor, 0), needsTarget: true },
    { kind: 'armor', price: forgeTierPrice(run, floor, 0), needsTarget: true },
    { kind: 'whetstone', price: price(run, 90 + floor * 7) },
    { kind: 'stone', price: price(run, 110 + floor * 8) },
    { kind: 'chestRare', price: price(run, 140 + floor * 10) },
    ...(run.act >= 3 ? [{ kind: 'chestEpic' as const, price: price(run, 320 + floor * 16) }] : []),
  ];
}

/** Prix réel d'une offre (arme/armure : selon le palier de la carte ciblée). */
export function offerPrice(run: NakimeRun, offer: NakimeOffer, memberIndex?: number): number {
  if ((offer.kind === 'weapon' || offer.kind === 'armor') && memberIndex !== undefined) {
    const m = run.members[memberIndex];
    if (m) return forgeTierPrice(run, floorsCleared(run), offer.kind === 'weapon' ? m.weapon : m.armor);
  }
  return offer.price;
}

// ── Résolution des nœuds ─────────────────────────────────────────────────
export interface NodeResult {
  kind: NakimeNodeKind;
  floor: number;
  started?: boolean;       // un combat commence (voir run.battle)
  won?: boolean;           // combat gagné
  shards: number;
  relic?: string | null;
  defeated?: boolean;      // la run est perdue (le store la clôt)
  revived?: boolean;       // Seconde chance déclenchée
  newAct?: number;         // un nouvel acte commence
}

/** Avance le pion sur (rangée suivante, col) : XP et butin de l'étage. */
function moveTo(run: NakimeRun, col: number, kind: NakimeNodeKind): NakimeRun {
  const floor = currentFloor(run);
  const moved: NakimeRun = { ...run, row: run.row + 1, col, path: [...run.path, col], loot: addLoot(run.loot, floorLoot(floor, kind)) };
  return giveXp(moved, xpReward(kind));
}

/** Passe à l'acte suivant après le boss. */
function nextAct(run: NakimeRun): NakimeRun {
  const next: NakimeRun = { ...run, act: run.act + 1, row: -1, col: -1, path: [] };
  return { ...next, members: healMembers(next, NAKIME_ACT_HEAL) };
}

/** Applique la fin d'un combat : victoire (gains, récompense à choisir) ou défaite. */
function finishFight(run: NakimeRun, fight: NakimeFight, state: BattleState): { run: NakimeRun; result: NodeResult } {
  const { kind, col, floor } = fight;
  const mods = relicMods(run.relics);
  const hp = finalAllyHp(state);
  let next: NakimeRun = { ...run, battle: null, members: run.members.map((m, i) => ({ ...m, hp: hp[`a${i}`] ?? m.hp })) };
  if (state.over !== 'won') {
    if (!run.secondWind) return { run: next, result: { kind, floor, shards: 0, defeated: true } };
    // Seconde chance : l'équipe se relève, la salle compte comme franchie (sans récompense).
    next = { ...next, secondWind: false, members: healMembers(next, 0, 0.3) };
    next = moveTo(next, col, kind);
    if (kind === 'boss') next = nextAct(next);
    return { run: next, result: { kind, floor, shards: 0, revived: true, ...(kind === 'boss' ? { newAct: next.act } : {}) } };
  }
  if (mods.postHeal > 0 || mods.postRevive > 0) next = { ...next, members: healMembers(next, mods.postHeal, mods.postRevive) };
  const shards = shardReward(kind, floor, run.relics);
  next = {
    ...next, shards: next.shards + shards,
    stats: { ...next.stats, fights: next.stats.fights + 1, elites: next.stats.elites + (kind === 'elite' ? 1 : 0), bosses: next.stats.bosses + (kind === 'boss' ? 1 : 0) },
  };
  next = moveTo(next, col, kind);
  if (kind === 'combat') next.pending = { kind: 'boon', options: rollBoons(run.seed, floor, run.meta.choices) };
  else {
    const options = rollRelicChoices(run.seed, floor, next.relics, kind === 'boss' ? 'boss' : 'elite', run.meta.choices);
    next.pending = options.length ? { kind: 'relic', tier: kind === 'boss' ? 'boss' : 'elite', options } : { kind: 'boon', options: rollBoons(run.seed, floor, run.meta.choices) };
  }
  if (kind === 'boss') next = nextAct(next);
  return { run: next, result: { kind, floor, shards, won: true, ...(kind === 'boss' ? { newAct: next.act } : {}) } };
}

export interface BattleStep {
  run: NakimeRun;
  events: NakimeEvent[];
  state: BattleState;      // état final du combat (même s'il est terminé)
  result?: NodeResult;     // le combat est terminé
}

/** Ordre du joueur (ou de l'IA si `auto`) dans le combat en cours. */
export function battleAct(run: NakimeRun, ability: string | null, target?: string): BattleStep | string {
  const fight = run.battle;
  if (!fight) return 'Aucun combat en cours.';
  const res = ability === null ? autoAction(fight.state) : playerAction(fight.state, ability, target);
  if (typeof res === 'string') return res;
  if (!res.state.over) return { run: { ...run, battle: { ...fight, state: res.state } }, events: res.events, state: res.state };
  const done = finishFight(run, fight, res.state);
  return { run: done.run, events: res.events, state: res.state, result: done.result };
}

export function enterNode(run: NakimeRun, col: number): { run: NakimeRun; result: NodeResult } | null {
  if (run.room || run.pending || run.battle || !reachableCols(run).includes(col)) return null;
  const map = generateActMap(run.seed, run.act);
  const kind = map[run.row + 1][col].kind;
  const floor = currentFloor(run);

  if (isFightNode(kind)) {
    const allies = buildAllies(run.members, run.relics, run.bonus);
    const enemies = buildEnemies(run.seed, run.act, floor, col, kind, run.enemyScale ?? 1);
    const { state } = createBattle(battleSeed(run.seed, floor, col), allies, enemies, run.relics, run.bonus);
    const fight: NakimeFight = { kind, col, floor, state };
    if (state.over) return finishFight({ ...run, battle: fight }, fight, state);
    return { run: { ...run, battle: fight }, result: { kind, floor, shards: 0, started: true } };
  }

  if (kind === 'shop' || kind === 'forge') {
    const next = moveTo(run, col, kind);
    const offers = kind === 'shop' ? rollShop(next, floor) : rollForge(next, floor);
    return { run: { ...next, room: { kind, offers, bought: [], rerolls: 0 } }, result: { kind, floor, shards: 0 } };
  }

  if (kind === 'rest') {
    const healed = { ...run, members: healMembers(run, NAKIME_REST_HEAL + run.meta.restPct / 100, 0.25) };
    return { run: moveTo(healed, col, kind), result: { kind, floor, shards: 0 } };
  }

  if (kind === 'event') {
    const next = moveTo(run, col, kind);
    return { run: { ...next, pending: { kind: 'event', id: pickEvent(run.seed, floor, col) }, stats: { ...next.stats, events: next.stats.events + 1 } }, result: { kind, floor, shards: 0 } };
  }

  // Trésor
  const relic = rollTreasureRelic(run.seed, floor, run.relics);
  const shards = shardReward(kind, floor, run.relics);
  const withRelic = relic ? withStatsChange(run, { ...run, relics: [...run.relics, relic] }) : run;
  return { run: moveTo({ ...withRelic, shards: withRelic.shards + shards }, col, kind), result: { kind, floor, shards, relic } };
}

/** Applique une bénédiction ou une relique choisie (index null = passer : quelques Éclats). */
export function chooseReward(run: NakimeRun, index: number | null): NakimeRun | null {
  const p = run.pending;
  if (!p || p.kind === 'event') return null;
  const floor = floorsCleared(run);
  if (index === null) return { ...run, pending: null, shards: run.shards + Math.round(boonShards(floor) / 2) };
  if (p.kind === 'relic') {
    const id = p.options[index];
    if (!id || run.relics.includes(id)) return null;
    return withStatsChange(run, { ...run, relics: [...run.relics, id], pending: null });
  }
  const boon = p.options[index];
  if (!boon) return null;
  const base = { ...run, pending: null };
  switch (boon) {
    case 'shards': return { ...base, shards: base.shards + boonShards(floor) };
    case 'heal':   return { ...base, members: healMembers(base, 0.3, 0.15) };
    case 'xp':     return giveXp(base, 120);
    case 'atk':    return { ...base, bonus: { ...base.bonus, atkPct: base.bonus.atkPct + 8 } };
    case 'hp':     return withStatsChange(base, { ...base, bonus: { ...base.bonus, hpPct: base.bonus.hpPct + 8 } });
    case 'energy': return { ...base, bonus: { ...base.bonus, energy: base.bonus.energy + 20 } };
  }
}

/** Joue une option d'événement : renvoie la run modifiée et le récit de ce qui s'est passé. */
export function chooseEventOption(run: NakimeRun, optionIndex: number): { run: NakimeRun; lines: string[] } | string {
  const p = run.pending;
  if (!p || p.kind !== 'event') return 'Aucune rencontre en cours.';
  const ev = NAKIME_EVENT_BY_ID[p.id];
  const opt = ev?.options[optionIndex];
  if (!opt) return 'Choix invalide.';
  const floor = floorsCleared(run);
  const scale = eventScale(floor);
  const cost = opt.cost ? Math.round(opt.cost * scale) : 0;
  if (cost > run.shards) return 'Pas assez d\'Éclats.';
  const rng = makeRng(subSeed(run.seed, floor, 10 + optionIndex));
  const lines: string[] = [];
  let next: NakimeRun = { ...run, pending: null, shards: run.shards - cost };
  if (cost) lines.push(`−${cost} Éclats`);
  const apply = (effects: EventEffect[]) => {
    for (const e of effects) {
      switch (e.k) {
        case 'shards': { const n = Math.round(e.n * scale); next = { ...next, shards: next.shards + n }; lines.push(`+${n} Éclats`); break; }
        case 'pay': { const n = Math.floor(next.shards * e.pct); next = { ...next, shards: next.shards - n }; lines.push(`−${n} Éclats`); break; }
        case 'heal': next = { ...next, members: healMembers(next, e.pct) }; lines.push(`Soins : ${Math.round(e.pct * 100)} % des PV`); break;
        case 'revive': next = { ...next, members: healMembers(next, 0, e.pct) }; lines.push(`Les KO se relèvent à ${Math.round(e.pct * 100)} % PV`); break;
        case 'damage': next = { ...next, members: hurtMembers(next, e.pct) }; lines.push(`−${Math.round(e.pct * 100)} % PV pour l'équipe`); break;
        case 'xp': next = giveXp(next, e.n); lines.push(`+${e.n} XP`); break;
        case 'atk': next = { ...next, bonus: { ...next.bonus, atkPct: next.bonus.atkPct + e.pct } }; lines.push(`+${e.pct} % ATQ pour l'équipe`); break;
        case 'hp': next = withStatsChange(next, { ...next, bonus: { ...next.bonus, hpPct: next.bonus.hpPct + e.pct } }); lines.push(`+${e.pct} % PV max pour l'équipe`); break;
        case 'gems': next = { ...next, loot: addLoot(next.loot, { gems: e.n }) }; lines.push(`+${e.n} gemmes dans le butin`); break;
        case 'stone': next = { ...next, loot: addLoot(next.loot, { stones: e.n }) }; lines.push(`+${e.n} Pierre d'Évolution dans le butin`); break;
        case 'relic': {
          const pool = NAKIME_RELIC_LIST.filter(r => r.tier === e.tier && !next.relics.includes(r.id));
          const fallback = NAKIME_RELIC_LIST.filter(r => r.tier !== 'boss' && !next.relics.includes(r.id));
          const list = pool.length ? pool : fallback;
          if (!list.length) { const n = Math.round(60 * scale); next = { ...next, shards: next.shards + n }; lines.push(`+${n} Éclats`); break; }
          const r = list[Math.floor(rng() * list.length)];
          next = withStatsChange(next, { ...next, relics: [...next.relics, r.id] });
          lines.push(`Relique obtenue : ${r.icon} ${r.name}`);
          break;
        }
        case 'gamble': {
          const win = rng() < e.chance;
          lines.push(win ? 'La chance te sourit !' : 'Mauvaise pioche…');
          apply(win ? e.win : e.lose);
          break;
        }
      }
    }
  };
  apply(opt.effects);
  if (!lines.length) lines.push('Tu poursuis ta route.');
  return { run: next, lines };
}

/** Achat en boutique / forge. Renvoie la run modifiée, ou un message d'erreur. */
export function buyOffer(run: NakimeRun, offerIndex: number, memberIndex?: number): NakimeRun | string {
  const room = run.room;
  const offer = room?.offers[offerIndex];
  if (!room || !offer) return 'Offre introuvable.';
  const repeatable = offer.kind === 'weapon' || offer.kind === 'armor';
  if (!repeatable && room.bought.includes(offerIndex)) return 'Déjà acheté.';
  const cost = offerPrice(run, offer, memberIndex);
  if (run.shards < cost) return 'Pas assez d\'Éclats.';
  let next: NakimeRun = run;
  switch (offer.kind) {
    case 'heal':
      if (!run.members.some(m => m.hp > 0)) return 'Aucune carte à soigner.';
      next = { ...run, members: healMembers(run, 0.4) };
      break;
    case 'revive':
      if (!run.members.some(m => m.hp <= 0)) return 'Aucune carte KO.';
      next = { ...run, members: healMembers(run, 0, 0.5) };
      break;
    case 'train':
      if (!run.members.some(m => m.hp > 0 && m.level < NAKIME_MAX_LEVEL)) return 'Niveau maximum atteint.';
      next = withStatsChange(run, { ...run, members: run.members.map(m => m.hp > 0 ? { ...m, level: Math.min(NAKIME_MAX_LEVEL, m.level + 1) } : m) });
      break;
    case 'relic':
      if (!offer.relic || run.relics.includes(offer.relic)) return 'Relique déjà possédée.';
      next = withStatsChange(run, { ...run, relics: [...run.relics, offer.relic] });
      break;
    case 'weapon':
    case 'armor': {
      const m = memberIndex !== undefined ? run.members[memberIndex] : undefined;
      if (!m) return 'Choisis une carte.';
      if (m.hp <= 0) return 'Cette carte est KO.';
      if ((offer.kind === 'weapon' ? m.weapon : m.armor) >= NAKIME_FORGE_MAX_TIER) return 'Palier maximum atteint.';
      const members = run.members.map((x, i) => i !== memberIndex ? x
        : offer.kind === 'weapon' ? { ...x, weapon: x.weapon + 1 } : { ...x, armor: x.armor + 1 });
      next = withStatsChange(run, { ...run, members });
      break;
    }
    case 'whetstone': next = { ...run, bonus: { ...run.bonus, atkPct: run.bonus.atkPct + 6 } }; break;
    case 'stone': next = { ...run, loot: addLoot(run.loot, { stones: 1 }) }; break;
    case 'chestRare': next = { ...run, loot: addLoot(run.loot, { chestRare: 1 }) }; break;
    case 'chestEpic': next = { ...run, loot: addLoot(run.loot, { chestEpic: 1 }) }; break;
  }
  const bought = repeatable ? room.bought : [...room.bought, offerIndex];
  return { ...next, shards: next.shards - cost, room: { ...room, bought } };
}

/** Relance les reliques de la boutique. */
export function rerollShop(run: NakimeRun): NakimeRun | string {
  const room = run.room;
  if (!room || room.kind !== 'shop') return 'Pas de boutique ouverte.';
  const floor = floorsCleared(run);
  const cost = rerollPrice(run, floor, room.rerolls);
  if (run.shards < cost) return 'Pas assez d\'Éclats.';
  const rerolls = room.rerolls + 1;
  const fresh = rollShop(run, floor, rerolls);
  // Les soins/résurrection/entraînement déjà achetés le restent.
  const bought = room.bought.filter(i => room.offers[i]?.kind !== 'relic');
  return { ...run, shards: run.shards - cost, room: { ...room, offers: fresh, bought, rerolls } };
}

/** Notes de Biwa gagnées en fin de run (monnaie de la Mémoire du Château). */
export function notesEarned(run: Pick<NakimeRun, 'act' | 'row' | 'stats'>): number {
  return floorsCleared(run) + run.stats.elites * 3 + run.stats.bosses * 10;
}

/** Nom de la carte d'une clé (pratique pour l'historique). */
export function memberName(templateId: string): string {
  return getCharacterById(templateId)?.name ?? templateId;
}
