// Plinko Multiversel — événement mensuel : 5 billes par jour, chacune tombe
// dans l'une des 15 cases du bas du plateau et rapporte sa récompense. Ce
// fichier ne contient que la configuration et des fonctions pures : l'état du
// joueur vit dans store/slices/plinkoSlice.ts, l'interface dans
// components/pages/plinko/.
//
// La case est tirée selon PLINKO_SLOTS[].weight (modifiable ici sans toucher
// au reste), PUIS un trajet de bille est généré pour y arriver : l'animation
// ne fait que rejouer un résultat déjà décidé et crédité.
//
// Repères d'équilibrage (quêtes quotidiennes ~100-150 💎/jour) : une bille
// rapporte en moyenne ~8 💎 et ~8 jetons, soit ~1 250 jetons sur le mois pour
// ~3 500 jetons d'améliorations : il faut choisir (le Stock de billes,
// acheté tôt, se rembourse en jetons sur le mois).

// ─── Fenêtre de l'événement ──────────────────────────────────────────────────
// Changer `id` à chaque nouvelle édition : jetons, améliorations et
// historique de l'édition précédente sont alors remis à zéro.
export const PLINKO_EVENT = {
  id: 'plinko-2026-11',
  name: 'Plinko Multiversel',
  startsAt: Date.parse('2026-11-01T02:00:00+01:00'),
  endsAt: Date.parse('2026-12-01T02:00:00+01:00'),
};

// En développement (npm run dev), l'événement est ouvert avant son début
// pour pouvoir le tester. Sans effet en production et dans les tests.
const OPEN_EARLY = process.env.NODE_ENV === 'development';

export function isPlinkoActive(now = Date.now()): boolean {
  return (OPEN_EARLY || now >= PLINKO_EVENT.startsAt) && now < PLINKO_EVENT.endsAt;
}

export function isPlinkoUpcoming(now = Date.now()): boolean {
  return !OPEN_EARLY && now < PLINKO_EVENT.startsAt;
}

// ─── Billes ──────────────────────────────────────────────────────────────────
// Renouvelées chaque jour à 2 h (heure de Paris, voir getTodayDayKey) ; les
// billes non jouées ne sont pas reportées. 5 de base, jusqu'à 8 avec
// l'amélioration « Stock de billes » (voir plinkoDailyBalls).
export const PLINKO_DAILY_BALLS = 5;

export interface PlinkoDaily { day: string; used: number }
export const emptyPlinkoDaily = (day = ''): PlinkoDaily => ({ day, used: 0 });

export function plinkoBallsLeft(daily: PlinkoDaily | undefined, today: string, levels?: PlinkoUpgradeLevels): number {
  const max = plinkoDailyBalls(levels);
  if (!daily || daily.day !== today) return max;
  return Math.max(0, max - daily.used);
}

// ─── Récompenses ─────────────────────────────────────────────────────────────
export type PlinkoRewardKind = 'gems' | 'crowns' | 'tokens' | 'chestRare' | 'chestEpic' | 'booster' | 'goldBooster';

export interface PlinkoReward { kind: PlinkoRewardKind; amount: number }

// Booster classique : au moins une carte Stellaire ou mieux. Booster doré :
// au moins une Primordiale ou mieux. Si le joueur n'a pas encore débloqué
// cette rareté, la carte garantie est de la meilleure rareté qu'il peut tirer
// (voir rollCharacterAtLeast).
export const PLINKO_BOOSTERS = {
  booster:     { name: 'Booster classique', cards: 5, minRarity: 'S' },
  goldBooster: { name: 'Booster doré',      cards: 5, minRarity: 'P' },
} as const;

const REWARD_NAMES: Record<PlinkoRewardKind, [string, string]> = {
  gems: ['gemme', 'gemmes'], crowns: ['couronne', 'couronnes'], tokens: ['jeton Plinko', 'jetons Plinko'],
  chestRare: ['coffre Rare', 'coffres Rares'], chestEpic: ['coffre Épique', 'coffres Épiques'],
  booster: ['Booster classique', 'Boosters classiques'], goldBooster: ['Booster doré', 'Boosters dorés'],
};

export const PLINKO_REWARD_ICON: Record<PlinkoRewardKind, string> = {
  gems: '💎', crowns: '👑', tokens: '🪙', chestRare: '📦', chestEpic: '🎁', booster: '🃏', goldBooster: '🌟',
};

export function formatPlinkoReward(r: PlinkoReward): string {
  const [one, many] = REWARD_NAMES[r.kind];
  return `${r.amount} ${r.amount > 1 ? many : one}`;
}

// ─── Les 15 cases ────────────────────────────────────────────────────────────
// weight : poids relatif (total actuel 1000, donc weight/10 = % de base).
// rare   : case renforcée par l'amélioration « Chance ».
export interface PlinkoSlot { reward: PlinkoReward; weight: number; rare?: boolean }

export const PLINKO_SLOTS: PlinkoSlot[] = [
  { reward: { kind: 'goldBooster', amount: 1 },  weight: 3,   rare: true },  // 0,3 %
  { reward: { kind: 'gems',        amount: 100 }, weight: 15,  rare: true },
  { reward: { kind: 'chestEpic',   amount: 1 },  weight: 30,  rare: true },
  { reward: { kind: 'tokens',      amount: 40 }, weight: 60 },
  { reward: { kind: 'crowns',      amount: 2 },  weight: 80 },
  { reward: { kind: 'gems',        amount: 30 }, weight: 100 },
  { reward: { kind: 'tokens',      amount: 15 }, weight: 120 },
  { reward: { kind: 'gems',        amount: 10 }, weight: 150 },
  { reward: { kind: 'tokens',      amount: 15 }, weight: 120 },
  { reward: { kind: 'crowns',      amount: 1 },  weight: 100 },
  { reward: { kind: 'chestRare',   amount: 1 },  weight: 80 },
  { reward: { kind: 'tokens',      amount: 40 }, weight: 60 },
  { reward: { kind: 'gems',        amount: 50 }, weight: 37,  rare: true },
  { reward: { kind: 'crowns',      amount: 4 },  weight: 30,  rare: true },
  { reward: { kind: 'booster',     amount: 1 },  weight: 15,  rare: true },  // 1,5 %
];

export const PLINKO_SLOT_COUNT = PLINKO_SLOTS.length;   // 15
export const PLINKO_ROWS = PLINKO_SLOT_COUNT - 1;       // 14 rangées de picots

// ─── Améliorations (boutique) ────────────────────────────────────────────────
// Achetées en jetons, actives jusqu'à la fin de l'édition. costs[i] = prix
// du niveau i+1 ; le nombre de niveaux est costs.length.
export type PlinkoUpgradeId = 'balls' | 'luck' | 'gain' | 'booster';

export interface PlinkoUpgrade {
  id: PlinkoUpgradeId;
  icon: string;
  name: string;
  desc: string;
  perLevel: number;
  costs: number[];
}

export const PLINKO_UPGRADES: PlinkoUpgrade[] = [
  // +1 bille par jour et par niveau : 5 → 8 au niveau max. Effet immédiat,
  // y compris le jour de l'achat.
  { id: 'balls',   icon: '⚪', name: 'Stock de billes', desc: 'Billes en plus chaque jour',           perLevel: 1,   costs: [80, 160, 280] },
  // Poids des cases rares ×(1 + 0,2 × niveau), puis renormalisé : au niveau
  // max, le Booster doré passe de 0,3 % à ~0,5 %. Jamais garanti.
  { id: 'luck',    icon: '🍀', name: 'Chance',        desc: 'Cases rares plus fréquentes',            perLevel: 0.2, costs: [60, 120, 200, 300, 400] },
  { id: 'gain',    icon: '💰', name: 'Gains',         desc: 'Gemmes, couronnes et jetons augmentés', perLevel: 0.1, costs: [50, 100, 160, 240, 320] },
  { id: 'booster', icon: '🃏', name: 'Gros boosters', desc: 'Cartes en plus dans chaque booster',    perLevel: 1,   costs: [150, 300, 450] },
];

export type PlinkoUpgradeLevels = Partial<Record<PlinkoUpgradeId, number>>;

export const getPlinkoUpgrade = (id: string) => PLINKO_UPGRADES.find(u => u.id === id);

export function plinkoUpgradeLevel(levels: PlinkoUpgradeLevels | undefined, id: PlinkoUpgradeId): number {
  const u = getPlinkoUpgrade(id);
  return u ? Math.max(0, Math.min(u.costs.length, Math.floor(levels?.[id] ?? 0))) : 0;
}

/** Prix du prochain niveau, ou null au niveau max. */
export function nextPlinkoUpgradeCost(levels: PlinkoUpgradeLevels | undefined, id: PlinkoUpgradeId): number | null {
  const u = getPlinkoUpgrade(id);
  if (!u) return null;
  return u.costs[plinkoUpgradeLevel(levels, id)] ?? null;
}

/** Billes offertes par jour avec l'amélioration « Stock de billes » (5 à 8). */
export function plinkoDailyBalls(levels?: PlinkoUpgradeLevels): number {
  return PLINKO_DAILY_BALLS + plinkoUpgradeLevel(levels, 'balls') * (getPlinkoUpgrade('balls')?.perLevel ?? 0);
}

/** Poids effectifs des 15 cases avec l'amélioration « Chance ». */
export function plinkoWeights(levels?: PlinkoUpgradeLevels): number[] {
  const luck = plinkoUpgradeLevel(levels, 'luck') * (getPlinkoUpgrade('luck')?.perLevel ?? 0);
  return PLINKO_SLOTS.map(s => s.weight * (s.rare ? 1 + luck : 1));
}

/** Probabilité (0 à 1) de chaque case. */
export function plinkoOdds(levels?: PlinkoUpgradeLevels): number[] {
  const w = plinkoWeights(levels);
  const total = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / total);
}

/** Récompense réelle d'une case avec les améliorations « Gains » et « Gros boosters ». */
export function plinkoSlotReward(slot: number, levels?: PlinkoUpgradeLevels): PlinkoReward {
  const base = PLINKO_SLOTS[slot].reward;
  const gain = 1 + plinkoUpgradeLevel(levels, 'gain') * (getPlinkoUpgrade('gain')?.perLevel ?? 0);
  if (base.kind === 'gems' || base.kind === 'crowns' || base.kind === 'tokens') {
    return { kind: base.kind, amount: Math.round(base.amount * gain) };
  }
  return { ...base };
}

/** Cartes par booster avec l'amélioration « Gros boosters ». */
export function plinkoBoosterSize(kind: 'booster' | 'goldBooster', levels?: PlinkoUpgradeLevels): number {
  return PLINKO_BOOSTERS[kind].cards + plinkoUpgradeLevel(levels, 'booster') * (getPlinkoUpgrade('booster')?.perLevel ?? 0);
}

// ─── Tirage ──────────────────────────────────────────────────────────────────

export function rollPlinkoSlot(levels?: PlinkoUpgradeLevels, rand = Math.random): number {
  const w = plinkoWeights(levels);
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return w.length - 1;
}

/**
 * Trajet de la bille jusqu'à `slot` : une direction par rangée de picots
 * (true = droite). Il faut exactement `slot` virages à droite pour arriver
 * dans la case `slot` ; leur ordre est tiré au hasard.
 */
export function plinkoPath(slot: number, rand = Math.random): boolean[] {
  const k = Math.max(0, Math.min(PLINKO_ROWS, Math.floor(slot)));
  const path = Array.from({ length: PLINKO_ROWS }, (_, i) => i < k);
  for (let i = path.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [path[i], path[j]] = [path[j], path[i]];
  }
  return path;
}

// ─── Historique ──────────────────────────────────────────────────────────────
export const PLINKO_HISTORY_LIMIT = 30;

export interface PlinkoHistoryEntry {
  n: number;              // numéro du lancer dans l'édition (1, 2, ...)
  at: number;
  slot: number;
  reward: PlinkoReward;
}

// ─── Quêtes de l'événement (sur toute sa durée) ──────────────────────────────
// Compteurs cumulés depuis le début de l'édition (remis à zéro avec elle).
// Calibrées pour un joueur qui lance ses billes tous les jours : ~150 à 200
// lancers sur le mois selon le Stock de billes. Récompense en gemmes, plus un
// bonus par quête : Orbes du Néant, Notes de Biwa (Château de Nakime) ou,
// pour la plus longue, le titre de l'événement.
export type PlinkoStat = 'days' | 'rare' | 'chests' | 'boosters' | 'tokens' | 'upgrades';
export type PlinkoStats = Partial<Record<PlinkoStat, number>>;

export const PLINKO_TITLE = '🎯 Maître du Plinko';

export interface PlinkoQuestBonus { kind: 'orbs' | 'notes' | 'title'; amount: number }

export interface PlinkoQuest {
  id: string;
  icon: string;
  label: string;
  stat: PlinkoStat | 'drops' | 'maxUpgrade';   // 'drops' = billes lancées ; 'maxUpgrade' = améliorations au niveau max
  target: number;
  gems: number;
  bonus?: PlinkoQuestBonus;
}

export function formatPlinkoQuestBonus(b: PlinkoQuestBonus): string {
  if (b.kind === 'title') return `Titre « ${PLINKO_TITLE} »`;
  return b.kind === 'orbs' ? `${b.amount} 🔮 Orbes du Néant` : `${b.amount} 🎵 Notes de Biwa`;
}

export const PLINKO_QUESTS: PlinkoQuest[] = [
  { id: 'pq_drops_25',    icon: '⚪', label: 'Lancer 25 billes',                         stat: 'drops',      target: 25,   gems: 500,  bonus: { kind: 'orbs',  amount: 150 } },
  { id: 'pq_drops_75',    icon: '⚪', label: 'Lancer 75 billes',                         stat: 'drops',      target: 75,   gems: 1000, bonus: { kind: 'notes', amount: 40 } },
  { id: 'pq_drops_150',   icon: '⚪', label: 'Lancer 150 billes',                        stat: 'drops',      target: 150,  gems: 2000, bonus: { kind: 'orbs',  amount: 400 } },
  { id: 'pq_days_7',      icon: '📅', label: 'Jouer au Plinko 7 jours',                  stat: 'days',       target: 7,    gems: 500,  bonus: { kind: 'notes', amount: 30 } },
  { id: 'pq_days_20',     icon: '📅', label: 'Jouer au Plinko 20 jours',                 stat: 'days',       target: 20,   gems: 1500, bonus: { kind: 'orbs',  amount: 300 } },
  { id: 'pq_days_28',     icon: '📅', label: 'Jouer au Plinko 28 jours',                 stat: 'days',       target: 28,   gems: 2000, bonus: { kind: 'title', amount: 1 } },
  { id: 'pq_rare_15',     icon: '✨', label: 'Tomber 15 fois dans une case rare',        stat: 'rare',       target: 15,   gems: 1500, bonus: { kind: 'notes', amount: 60 } },
  { id: 'pq_chests_10',   icon: '📦', label: 'Gagner 10 coffres',                        stat: 'chests',     target: 10,   gems: 1000, bonus: { kind: 'orbs',  amount: 200 } },
  { id: 'pq_booster_1',   icon: '🃏', label: 'Gagner un booster',                        stat: 'boosters',   target: 1,    gems: 1000, bonus: { kind: 'notes', amount: 30 } },
  { id: 'pq_tokens_1000', icon: '🪙', label: 'Gagner 1 000 jetons Plinko',               stat: 'tokens',     target: 1000, gems: 1500, bonus: { kind: 'orbs',  amount: 300 } },
  { id: 'pq_upgrades_6',  icon: '🛒', label: "Acheter 6 niveaux d'amélioration",         stat: 'upgrades',   target: 6,    gems: 1500, bonus: { kind: 'notes', amount: 50 } },
  { id: 'pq_max_1',       icon: '⭐', label: 'Monter une amélioration au niveau max',    stat: 'maxUpgrade', target: 1,    gems: 1000, bonus: { kind: 'notes', amount: 40 } },
];

export const PLINKO_QUESTS_TOTAL_GEMS = PLINKO_QUESTS.reduce((s, q) => s + q.gems, 0);

export function getPlinkoQuestProgress(q: PlinkoQuest, p: { stats: PlinkoStats; drops: number; levels: PlinkoUpgradeLevels }): number {
  const v = q.stat === 'drops' ? p.drops
    : q.stat === 'maxUpgrade' ? PLINKO_UPGRADES.filter(u => plinkoUpgradeLevel(p.levels, u.id) >= u.costs.length).length
    : p.stats[q.stat] ?? 0;
  return Math.min(q.target, v);
}
