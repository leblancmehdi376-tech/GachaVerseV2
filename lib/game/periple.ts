// Le Grand Périple du Multivers — événement temporaire en plateau de jeu
// (type jeu de l'oie). Chaque case lance un mini-jeu dont la médaille fixe
// la récompense. Ce fichier ne contient que des données et des fonctions
// pures : l'état du joueur vit dans store/slices/peripleSlice.ts,
// l'interface dans components/pages/periple/.
//
// Repères d'équilibrage (voir quêtes quotidiennes, ~100-150 💎/jour, et
// GACHA_COSTS, 10 💎 l'invocation) : un joueur actif lance ~15 dés par jour
// (régénération + missions), soit ~300 lancers sur 3 semaines. Un lancer
// rapporte en moyenne ~45 points et ~30 jetons : le joueur actif termine
// les 15 paliers vers la fin de la 2e semaine, un joueur occasionnel
// (~8 dés/jour) atteint les paliers 11-12. La boutique coûte bien plus que
// ce qu'on peut gagner : il faut choisir.

// ─── Fenêtre de l'événement ──────────────────────────────────────────────────
// Changer `id` à chaque nouvelle édition : la progression de l'édition
// précédente (dés, jetons, paliers, achats) est alors remise à zéro.
export const PERIPLE_EVENT = {
  id: 'periple-2026-10',
  name: 'Le Grand Périple du Multivers',
  endsAt: Date.parse('2026-10-26T02:00:00+01:00'),
};

export function isPeripleActive(now = Date.now()): boolean {
  return now < PERIPLE_EVENT.endsAt;
}

// ─── Dés ─────────────────────────────────────────────────────────────────────
export const PERIPLE_MAX_DICE = 6;
export const PERIPLE_DICE_REGEN_MS = 2 * 3600_000;   // +1 dé toutes les 2 h
// Les dés gagnés (missions, cases, boutique) peuvent dépasser le plafond de
// régénération, dans une certaine limite.
export const PERIPLE_DICE_HARD_CAP = 40;

/** Dés disponibles maintenant, en appliquant la régénération écoulée depuis `at`. */
export function computePeripleDice(dice: number, at: number, now = Date.now()): { dice: number; at: number } {
  if (dice >= PERIPLE_MAX_DICE) return { dice, at: now };
  const ticks = Math.floor(Math.max(0, now - at) / PERIPLE_DICE_REGEN_MS);
  if (ticks <= 0) return { dice, at };
  const next = Math.min(PERIPLE_MAX_DICE, dice + ticks);
  return { dice: next, at: next >= PERIPLE_MAX_DICE ? now : at + ticks * PERIPLE_DICE_REGEN_MS };
}

/** Millisecondes avant le prochain dé régénéré (null si déjà au plafond). */
export function msToNextPeripleDie(dice: number, at: number, now = Date.now()): number | null {
  if (dice >= PERIPLE_MAX_DICE) return null;
  return Math.max(0, PERIPLE_DICE_REGEN_MS - ((now - at) % PERIPLE_DICE_REGEN_MS));
}

// ─── Récompenses ─────────────────────────────────────────────────────────────
export type PeripleRewardKind =
  | 'gems' | 'tokens' | 'dice' | 'pulls' | 'crowns' | 'orbs' | 'anomaly'
  | 'chestRare' | 'chestEpic' | 'boost' | 'gold' | 'title' | 'points';

export interface PeripleReward { kind: PeripleRewardKind; amount: number }

// Titre exclusif du dernier palier (bonus d'or : voir TITLE_GOLD_BONUS_PCT).
export const PERIPLE_TITLE = '🗺️ Grand Voyageur du Multivers';

const REWARD_NAMES: Record<PeripleRewardKind, [string, string]> = {
  gems: ['gemme', 'gemmes'], tokens: ['jeton', 'jetons'], dice: ['dé', 'dés'],
  pulls: ['invocation', 'invocations'], crowns: ['couronne', 'couronnes'], orbs: ['orbe du Néant', 'orbes du Néant'],
  anomaly: ['jeton d\'Anomalie', 'jetons d\'Anomalie'], chestRare: ['coffre Rare', 'coffres Rares'],
  chestEpic: ['coffre Épique', 'coffres Épiques'], boost: ['', ''], gold: ['', ''], title: ['', ''], points: ['point', 'points'],
};

export function formatPeripleReward(r: PeripleReward): string {
  if (r.kind === 'boost') return `Boost DPS + Or ${r.amount} min`;
  if (r.kind === 'gold') return `Sac d'or (${r.amount} combats)`;
  if (r.kind === 'title') return `Titre « ${PERIPLE_TITLE} »`;
  const [one, many] = REWARD_NAMES[r.kind];
  return `${r.amount} ${r.amount > 1 ? many : one}`;
}

/** Libellé court pour les pastilles (×N). */
export function shortPeripleReward(r: PeripleReward): string {
  if (r.kind === 'boost') return `${r.amount} min`;
  if (r.kind === 'title') return 'Titre';
  if (r.kind === 'gold') return 'Or';
  return `×${r.amount}`;
}

// ─── Plateau ─────────────────────────────────────────────────────────────────
export type TileKind = 'start' | 'combat' | 'chance' | 'gacha' | 'isekai' | 'action' | 'scifi' | 'hunt';
export type SkillTileKind = 'combat' | 'isekai' | 'action' | 'scifi';

export interface TileInfo {
  label: string;
  game: string;     // nom du mini-jeu
  top: string;      // couleur de la face supérieure
  side: string;     // couleur des flancs
  glow: string;
  desc: string;
}

export const TILE_INFO: Record<TileKind, TileInfo> = {
  start:  { label: 'Départ',         game: 'Prime de tour',        top: '#fbbf24', side: '#b45309', glow: '#fde68a', desc: 'Passer le Départ rapporte des jetons. S\'y arrêter pile rapporte une grosse prime.' },
  combat: { label: 'Combat Rapide',  game: 'Duel Éclair',          top: '#f43f5e', side: '#9f1239', glow: '#fda4af', desc: 'Arrête la jauge dans la zone pour frapper. Les coups critiques font deux fois plus mal.' },
  chance: { label: 'Case Chance',    game: 'Cartes du Destin',     top: '#a855f7', side: '#6b21a8', glow: '#e9d5ff', desc: 'Trois cartes, un seul choix : dés, gemmes, couronnes, bond en avant… ou tempête.' },
  gacha:  { label: 'Gacha Gratuit',  game: 'Roue des Invocations', top: '#22d3ee', side: '#0e7490', glow: '#a5f3fc', desc: 'Fais tourner la roue : jusqu\'à 10 invocations offertes.' },
  isekai: { label: 'Monde Isekai',   game: 'Portail des Runes',    top: '#34d399', side: '#047857', glow: '#a7f3d0', desc: 'Mémorise la séquence de runes et reproduis-la. Riche en jetons.' },
  action: { label: 'Arène Action',   game: 'Combo Rush',           top: '#fb923c', side: '#c2410c', glow: '#fed7aa', desc: 'Enchaîne les bonnes directions avant la fin du chrono. Riche en points.' },
  scifi:  { label: 'Station Sci-Fi', game: 'Piratage',             top: '#60a5fa', side: '#1d4ed8', glow: '#bfdbfe', desc: 'Retrouve les paires de modules avant la coupure du système. L\'Or donne un dé.' },
  hunt:   { label: 'Case Spéciale',  game: 'Chasse aux Raretés',   top: '#ec4899', side: '#9d174d', glow: '#fbcfe8', desc: 'Pile en face du Départ. Touche un maximum de personnages de la rareté demandée en 20 s : plus ton score est haut, plus la récompense est grosse.' },
};

export const SKILL_TILES: SkillTileKind[] = ['combat', 'isekai', 'action', 'scifi'];
export function isSkillTile(kind: TileKind): kind is SkillTileKind {
  return (SKILL_TILES as TileKind[]).includes(kind);
}

// Boucle de 24 cases tracée sur le pourtour d'une grille 7×7.
export const BOARD_GRID = 7;

const BOARD_KINDS: TileKind[] = [
  'start', 'isekai', 'combat', 'chance', 'action', 'scifi',
  'gacha', 'combat', 'isekai', 'chance', 'action', 'combat',
  'hunt', 'chance', 'isekai', 'combat', 'action', 'scifi',
  'gacha', 'combat', 'chance', 'isekai', 'action', 'scifi',
];

function perimeterCells(n: number): { r: number; c: number }[] {
  const cells: { r: number; c: number }[] = [];
  for (let c = 0; c < n; c++) cells.push({ r: 0, c });
  for (let r = 1; r < n; r++) cells.push({ r, c: n - 1 });
  for (let c = n - 2; c >= 0; c--) cells.push({ r: n - 1, c });
  for (let r = n - 2; r >= 1; r--) cells.push({ r, c: 0 });
  return cells;
}

export interface BoardTile { index: number; kind: TileKind; r: number; c: number }

export const PERIPLE_BOARD: BoardTile[] = perimeterCells(BOARD_GRID).map((cell, index) => ({
  index, kind: BOARD_KINDS[index], ...cell,
}));

export const BOARD_SIZE = PERIPLE_BOARD.length;

/** Cases traversées (incluant l'arrivée) en avançant de `steps` depuis `from`. */
export function boardPath(from: number, steps: number): number[] {
  const path: number[] = [];
  const dir = steps >= 0 ? 1 : -1;
  for (let i = 1; i <= Math.abs(steps); i++) path.push(((from + dir * i) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE);
  return path;
}

/** Nombre de passages par le Départ en avançant (jamais en reculant). */
export function countStartPasses(from: number, steps: number): number {
  if (steps <= 0) return 0;
  return Math.floor((from + steps) / BOARD_SIZE);
}

export const PERIPLE_POINTS_PER_PIP = 5;
export const PERIPLE_PASS_START_TOKENS = 40;
// S'arrêter pile sur le Départ (remplace la prime de passage).
export const PERIPLE_START_REWARDS: PeripleReward[] = [
  { kind: 'tokens', amount: 100 }, { kind: 'dice', amount: 1 }, { kind: 'points', amount: 60 },
];

// ─── Mini-jeux d'adresse : médaille → récompense ─────────────────────────────
export type Medal = 0 | 1 | 2 | 3;     // raté, bronze, argent, or

export const MEDAL_INFO: { label: string; color: string; dark: string }[] = [
  { label: 'Raté',   color: '#94a3b8', dark: '#475569' },
  { label: 'Bronze', color: '#f0a868', dark: '#9a5a26' },
  { label: 'Argent', color: '#e2e8f0', dark: '#7c8798' },
  { label: 'Or',     color: '#fde047', dark: '#b7791f' },
];

// [raté, bronze, argent, or] — le raté rapporte un lot de consolation.
const SKILL_TABLE: Record<SkillTileKind, { tokens: number[]; points: number[]; goldBonus?: PeripleReward }> = {
  combat: { tokens: [8, 18, 28, 40], points: [10, 25, 40, 60] },
  isekai: { tokens: [10, 28, 45, 65], points: [5, 12, 20, 30] },
  action: { tokens: [5, 10, 16, 24], points: [15, 40, 65, 95] },
  scifi:  { tokens: [8, 16, 26, 36], points: [10, 22, 34, 48], goldBonus: { kind: 'dice', amount: 1 } },
};

export function getSkillRewards(kind: SkillTileKind, medal: Medal): PeripleReward[] {
  const t = SKILL_TABLE[kind];
  const out: PeripleReward[] = [
    { kind: 'tokens', amount: t.tokens[medal] },
    { kind: 'points', amount: t.points[medal] },
  ];
  if (medal === 3 && t.goldBonus) out.push(t.goldBonus);
  return out;
}

// ─── Chasse aux Raretés (case spéciale, en face du Départ) ───────────────────
// Récompense proportionnelle au score (personnages de la bonne rareté
// touchés en 20 s, erreurs déduites), plus un bonus par médaille. Une seule
// case de ce type sur le plateau : elle est plus généreuse que les autres.
export const HUNT_TIME_MS = 20_000;
export const HUNT_SCORE_CAP = 25;
export const HUNT_MEDAL_SCORES = [0, 5, 10, 15];   // score minimal pour bronze / argent / or
export const HUNT_RARITIES = ['R', 'E', 'L', 'M'] as const;

export function huntMedal(score: number): Medal {
  return score >= HUNT_MEDAL_SCORES[3] ? 3 : score >= HUNT_MEDAL_SCORES[2] ? 2 : score >= HUNT_MEDAL_SCORES[1] ? 1 : 0;
}

const HUNT_MEDAL_BONUS: PeripleReward[][] = [
  [],
  [{ kind: 'dice', amount: 1 }],
  [{ kind: 'pulls', amount: 3 }],
  [{ kind: 'pulls', amount: 5 }, { kind: 'gems', amount: 40 }],
];

export function getHuntRewards(score: number): PeripleReward[] {
  const sc = Math.max(0, Math.min(HUNT_SCORE_CAP, Math.floor(score)));
  return [
    { kind: 'tokens', amount: 10 + 6 * sc },
    { kind: 'points', amount: 15 + 9 * sc },
    ...HUNT_MEDAL_BONUS[huntMedal(sc)],
  ];
}

// ─── Cartes du Destin (case Chance) ──────────────────────────────────────────
export interface ChanceCard {
  id: string;
  title: string;
  text: string;
  rewards: PeripleReward[];
  move: number;
  bad?: boolean;
  weight: number;
}

export const CHANCE_CARDS: ChanceCard[] = [
  { id: 'dice',    weight: 18, title: 'Pluie de dés',       text: 'Deux dés tombent du ciel.',                  rewards: [{ kind: 'dice', amount: 2 }], move: 0 },
  { id: 'tokens',  weight: 20, title: 'Trésor caché',       text: 'Un coffre oublié entre deux dimensions.',    rewards: [{ kind: 'tokens', amount: 70 }], move: 0 },
  { id: 'gems',    weight: 14, title: 'Éclat stellaire',    text: 'Des gemmes scintillent dans le vide.',       rewards: [{ kind: 'gems', amount: 25 }], move: 0 },
  { id: 'crowns',  weight: 8,  title: 'Butin royal',        text: 'La couronne d\'un boss déchu.',              rewards: [{ kind: 'crowns', amount: 2 }], move: 0 },
  { id: 'star',    weight: 12, title: 'Étoile filante',     text: 'Ton équipe gagne en renommée.',              rewards: [{ kind: 'points', amount: 120 }], move: 0 },
  { id: 'warp',    weight: 14, title: 'Faille cosmique',    text: 'Une faille t\'emporte 4 cases plus loin.',   rewards: [{ kind: 'points', amount: 20 }], move: 4 },
  { id: 'pulls',   weight: 6,  title: 'Portail béni',       text: 'Trois invocations offertes.',                rewards: [{ kind: 'pulls', amount: 3 }], move: 0 },
  { id: 'storm',   weight: 8,  title: 'Tempête temporelle', text: 'Recul de 3 cases… avec un dédommagement.',   rewards: [{ kind: 'tokens', amount: 20 }], move: -3, bad: true },
];

/** Tire 3 cartes différentes (pondérées). */
export function drawChanceCards(rand: () => number = Math.random): ChanceCard[] {
  const pool = [...CHANCE_CARDS];
  const out: ChanceCard[] = [];
  while (out.length < 3 && pool.length > 0) {
    const total = pool.reduce((s, c) => s + c.weight, 0);
    let roll = rand() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { roll -= pool[i].weight; if (roll < 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// ─── Roue des Invocations (case Gacha) ───────────────────────────────────────
// La part de chaque segment sur la roue est proportionnelle à son poids :
// ce que le joueur voit correspond aux vraies chances.
export interface WheelSegment { reward: PeripleReward; weight: number; color: string }

export const GACHA_WHEEL: WheelSegment[] = [
  { reward: { kind: 'pulls', amount: 1 },  weight: 22, color: '#0891b2' },
  { reward: { kind: 'pulls', amount: 3 },  weight: 18, color: '#7c3aed' },
  { reward: { kind: 'gems',  amount: 30 }, weight: 13, color: '#0ea5e9' },
  { reward: { kind: 'pulls', amount: 2 },  weight: 19, color: '#2563eb' },
  { reward: { kind: 'pulls', amount: 5 },  weight: 12, color: '#c026d3' },
  { reward: { kind: 'dice',  amount: 2 },  weight: 11, color: '#ea580c' },
  { reward: { kind: 'pulls', amount: 10 }, weight: 5,  color: '#ca8a04' },
];

export function spinGachaWheel(rand: () => number = Math.random): number {
  const total = GACHA_WHEEL.reduce((s, w) => s + w.weight, 0);
  let roll = rand() * total;
  for (let i = 0; i < GACHA_WHEEL.length; i++) { roll -= GACHA_WHEEL[i].weight; if (roll < 0) return i; }
  return GACHA_WHEEL.length - 1;
}

// ─── Paliers de récompenses ──────────────────────────────────────────────────
export interface PeripleTier { points: number; reward: PeripleReward; big?: boolean }

export const PERIPLE_TIERS: PeripleTier[] = [
  { points: 200,   reward: { kind: 'dice',      amount: 5   } },
  { points: 500,   reward: { kind: 'gems',      amount: 120 } },
  { points: 900,   reward: { kind: 'pulls',     amount: 15  }, big: true },
  { points: 1300,  reward: { kind: 'crowns',    amount: 10  } },
  { points: 1800,  reward: { kind: 'dice',      amount: 8   } },
  { points: 2400,  reward: { kind: 'chestRare', amount: 2   } },
  { points: 3100,  reward: { kind: 'gems',      amount: 250 } },
  { points: 3900,  reward: { kind: 'orbs',      amount: 600 } },
  { points: 4800,  reward: { kind: 'pulls',     amount: 20  }, big: true },
  { points: 5800,  reward: { kind: 'boost',     amount: 120 } },
  { points: 6900,  reward: { kind: 'gems',      amount: 400 } },
  { points: 8100,  reward: { kind: 'chestEpic', amount: 2   } },
  { points: 9400,  reward: { kind: 'anomaly',   amount: 2   }, big: true },
  { points: 10800, reward: { kind: 'pulls',     amount: 50  }, big: true },
  { points: 12000, reward: { kind: 'title',     amount: 1   }, big: true },
];

export const PERIPLE_MAX_POINTS = PERIPLE_TIERS[PERIPLE_TIERS.length - 1].points;

/** Progression vers le prochain palier (0–100) et index de ce palier (-1 = tout atteint). */
export function getPeripleTierProgress(points: number): { next: number; pct: number; overallPct: number } {
  const next = PERIPLE_TIERS.findIndex(t => points < t.points);
  const overallPct = Math.min(100, (points / PERIPLE_MAX_POINTS) * 100);
  if (next === -1) return { next, pct: 100, overallPct };
  const prev = next === 0 ? 0 : PERIPLE_TIERS[next - 1].points;
  return { next, pct: Math.min(100, ((points - prev) / (PERIPLE_TIERS[next].points - prev)) * 100), overallPct };
}

// ─── Missions quotidiennes ───────────────────────────────────────────────────
export type PeripleCounter = 'rolls' | 'games' | 'gold' | 'combat' | 'laps';

export interface PeripleDaily {
  day: string;
  rolls: number;
  games: number;    // mini-jeux joués (toutes cases)
  gold: number;     // médailles d'or
  combat: number;   // Combats Rapides gagnés (argent ou mieux)
  laps: number;
  claimed: string[];
  shop: Record<string, number>;   // achats du jour (articles à stock quotidien)
}

export function emptyPeripleDaily(day = ''): PeripleDaily {
  return { day, rolls: 0, games: 0, gold: 0, combat: 0, laps: 0, claimed: [], shop: {} };
}

export interface PeripleMission {
  id: string;
  label: string;
  counter: PeripleCounter;
  target: number;
  reward: PeripleReward;
}

export const PERIPLE_MISSIONS: PeripleMission[] = [
  { id: 'm_rolls',  label: 'Lancer 8 dés',                   counter: 'rolls',  target: 8, reward: { kind: 'dice',   amount: 3  } },
  { id: 'm_games',  label: 'Jouer 4 mini-jeux',              counter: 'games',  target: 4, reward: { kind: 'tokens', amount: 80 } },
  { id: 'm_gold',   label: 'Décrocher 2 médailles d\'or',    counter: 'gold',   target: 2, reward: { kind: 'gems',   amount: 40 } },
  { id: 'm_combat', label: 'Gagner 2 Combats Rapides',       counter: 'combat', target: 2, reward: { kind: 'dice',   amount: 2  } },
  { id: 'm_lap',    label: 'Boucler un tour du plateau',     counter: 'laps',   target: 1, reward: { kind: 'pulls',  amount: 5  } },
  { id: 'm_orbs',   label: 'Lancer 15 dés',                  counter: 'rolls',  target: 15, reward: { kind: 'orbs',  amount: 150 } },
];

// ─── Quêtes de l'événement (sur toute sa durée) ──────────────────────────────
// Compteurs cumulés depuis le début de l'édition (remis à zéro avec elle).
// Calibrées pour un joueur très assidu : ~350 lancers sur 3 semaines (dés
// régénérés + missions + paliers + boutique, sans en rater). Un joueur actif
// « normal » (~300) en boucle les deux tiers, un occasionnel environ la moitié.
export type PeripleStat =
  | 'rolls' | 'games' | 'gold' | 'combat' | 'laps' | 'wheel' | 'chance' | 'missions' | 'spent' | 'huntBest'
  // Or obtenu au moins une fois à chaque jeu d'adresse (quête « tous les Or »)
  | 'gold_combat' | 'gold_isekai' | 'gold_action' | 'gold_scifi' | 'gold_hunt';

export type PeripleStats = Partial<Record<PeripleStat, number>>;

export const GOLD_GAME_STATS: PeripleStat[] = ['gold_combat', 'gold_isekai', 'gold_action', 'gold_scifi', 'gold_hunt'];

export interface PeripleQuest {
  id: string;
  label: string;
  stat: PeripleStat | 'tiers' | 'goldAll';   // 'tiers' = paliers réclamés ; 'goldAll' = jeux d'adresse réussis en Or
  target: number;
  gems: number;
}

export const PERIPLE_QUESTS: PeripleQuest[] = [
  { id: 'q_rolls_100',    label: 'Lancer 100 dés',                                  stat: 'rolls',    target: 100,    gems: 500 },
  { id: 'q_rolls_350',    label: 'Lancer 350 dés',                                  stat: 'rolls',    target: 350,    gems: 2000 },
  { id: 'q_laps_30',      label: 'Boucler 30 tours du plateau',                     stat: 'laps',     target: 30,     gems: 1500 },
  { id: 'q_games_250',    label: 'Jouer 250 mini-jeux',                             stat: 'games',    target: 250,    gems: 2000 },
  { id: 'q_gold_80',      label: "Décrocher 80 médailles d'or",                     stat: 'gold',     target: 80,     gems: 2000 },
  { id: 'q_gold_all',     label: "Décrocher l'Or aux 5 jeux d'adresse",             stat: 'goldAll',  target: 5,      gems: 1500 },
  { id: 'q_combat_60',    label: 'Gagner 60 Combats Rapides',                       stat: 'combat',   target: 60,     gems: 1500 },
  { id: 'q_chance_45',    label: 'Tirer 45 Cartes du Destin',                       stat: 'chance',   target: 45,     gems: 1000 },
  { id: 'q_wheel_25',     label: 'Faire tourner 25 fois la Roue',                   stat: 'wheel',    target: 25,     gems: 500 },
  { id: 'q_hunt_22',      label: 'Atteindre 22 à la Chasse aux Raretés',            stat: 'huntBest', target: 22,     gems: 1500 },
  { id: 'q_missions_110', label: 'Accomplir 110 missions du jour',                  stat: 'missions', target: 110,    gems: 2000 },
  { id: 'q_spent_12000',  label: 'Dépenser 12 000 jetons en boutique',              stat: 'spent',    target: 12000,  gems: 1500 },
  { id: 'q_tiers_15',     label: 'Réclamer les 15 paliers',                         stat: 'tiers',    target: 15,     gems: 2500 },
];

export const PERIPLE_QUESTS_TOTAL_GEMS = PERIPLE_QUESTS.reduce((s, q) => s + q.gems, 0);

export function getPeripleQuestProgress(q: PeripleQuest, stats: PeripleStats, tiersClaimed: number): number {
  const v = q.stat === 'tiers' ? tiersClaimed
    : q.stat === 'goldAll' ? GOLD_GAME_STATS.filter(k => (stats[k] ?? 0) > 0).length
    : stats[q.stat] ?? 0;
  return Math.min(q.target, v);
}

// ─── Boutique de l'événement ─────────────────────────────────────────────────
export type ShopSection = 'featured' | 'summon' | 'resources' | 'daily';

export const SHOP_SECTIONS: { id: ShopSection; title: string; hint?: string }[] = [
  { id: 'featured',  title: 'Exclusivités du Périple' },
  { id: 'summon',    title: 'Invocations' },
  { id: 'resources', title: 'Ressources' },
  { id: 'daily',     title: 'Offres du jour', hint: 'Stock renouvelé chaque jour à 2h' },
];

export interface PeripleShopItem {
  id: string;
  section: ShopSection;
  name: string;
  cost: number;              // en jetons du Périple
  stock: number;             // achats max (sur l'événement, ou par jour si daily)
  daily?: boolean;
  reward: PeripleReward;
  tag?: string;              // bandeau (« -20% », « Rare »…)
}

export const PERIPLE_SHOP: PeripleShopItem[] = [
  { id: 's_anomaly', section: 'featured',  name: "Jetons d'Anomalie",          cost: 2400, stock: 1,  reward: { kind: 'anomaly',   amount: 2 },   tag: 'Ultra rare' },
  { id: 's_pull30',  section: 'featured',  name: "Grand pack d'invocations",   cost: 1000, stock: 2,  reward: { kind: 'pulls',     amount: 40 },  tag: '-37%' },
  { id: 's_epic',    section: 'featured',  name: 'Coffres Épiques',            cost: 850,  stock: 2,  reward: { kind: 'chestEpic', amount: 2 } },
  { id: 's_pull10',  section: 'summon',    name: "Pack d'invocations",         cost: 380,  stock: 8,  reward: { kind: 'pulls',     amount: 12 },  tag: '-20%' },
  { id: 's_pull1',   section: 'summon',    name: 'Invocation',                 cost: 40,   stock: 20, reward: { kind: 'pulls',     amount: 1 } },
  { id: 's_gems',    section: 'resources', name: 'Bourse de gemmes',           cost: 420,  stock: 5,  reward: { kind: 'gems',      amount: 180 } },
  { id: 's_crowns',  section: 'resources', name: 'Couronnes de boss',          cost: 280,  stock: 6,  reward: { kind: 'crowns',    amount: 8 } },
  { id: 's_orbs',    section: 'resources', name: 'Orbes du Néant',             cost: 700,  stock: 4,  reward: { kind: 'orbs',      amount: 450 } },
  { id: 's_rare',    section: 'resources', name: 'Coffres Rares',              cost: 480,  stock: 3,  reward: { kind: 'chestRare', amount: 2 } },
  { id: 's_die',     section: 'daily',     name: 'Dé du Périple',              cost: 70,   stock: 6,  daily: true, reward: { kind: 'dice',  amount: 1 } },
  { id: 's_boost',   section: 'daily',     name: 'Boost DPS + Or',             cost: 140,  stock: 2,  daily: true, reward: { kind: 'boost', amount: 45 } },
  { id: 's_gold',    section: 'daily',     name: "Sac d'or",                   cost: 110,  stock: 2,  daily: true, reward: { kind: 'gold',  amount: 100 } },
];
