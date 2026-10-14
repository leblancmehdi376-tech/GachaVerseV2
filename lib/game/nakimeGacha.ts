// Château de Nakime — Gachapon de l'Infini.
//
// Chaque Ticket de l'Infini (1 par acte terminé, voir floorLoot) se dépense
// dans une machine à capsules : une capsule = un lot tiré selon les poids
// ci-dessous. Garantie : au plus tard tous les NAKIME_GACHA_PITY tirages sans
// capsule Légendaire ou mieux, la suivante l'est forcément.

export type GachaTier = 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';

export const GACHA_TIER_INFO: Record<GachaTier, { label: string; color: string; weight: number }> = {
  commun:     { label: 'Commune',    color: '#cbd5e1', weight: 55.25 },
  rare:       { label: 'Rare',       color: '#60a5fa', weight: 30 },
  epique:     { label: 'Épique',     color: '#c084fc', weight: 12.5 },
  legendaire: { label: 'Légendaire', color: '#fbbf24', weight: 2 },
  mythique:   { label: 'Mythique',   color: '#f472b6', weight: 0.25 },
};
export const GACHA_TIERS = Object.keys(GACHA_TIER_INFO) as GachaTier[];

export const NAKIME_GACHA_PITY = 20;

/** Titre exclusif du Gachapon (lot Mythique). Déjà obtenu : remplacé par des gemmes. */
export const NAKIME_GACHA_TITLE = '♾️ Élu de l\'Infini';
export const NAKIME_GACHA_TITLE_DUPLICATE_GEMS = 2000;

export type GachaRewardKind = 'gems' | 'stones' | 'notes' | 'pulls' | 'chestRare' | 'chestEpic' | 'anomaly' | 'title';
export interface GachaReward { kind: GachaRewardKind; amount: number }

export interface GachaPrize { id: string; tier: GachaTier; icon: string; name: string; rewards: GachaReward[] }

const p = (id: string, tier: GachaTier, icon: string, name: string, ...rewards: GachaReward[]): GachaPrize => ({ id, tier, icon, name, rewards });

// Lots, répartis à poids égal au sein de chaque rareté de capsule.
export const NAKIME_GACHA_PRIZES: GachaPrize[] = [
  p('c_gems',   'commun', '💎', 'Bourse de gemmes',        { kind: 'gems', amount: 60 }),
  p('c_stones', 'commun', '💠', 'Duo de Pierres',          { kind: 'stones', amount: 2 }),
  p('c_notes',  'commun', '🎵', 'Partition de Biwa',       { kind: 'notes', amount: 30 }),
  p('c_pull',   'commun', '🎴', 'Invocation gratuite',     { kind: 'pulls', amount: 1 }),
  p('r_gems',   'rare',   '💎', 'Coffret de gemmes',       { kind: 'gems', amount: 150 }),
  p('r_pulls',  'rare',   '🎴', 'Triple invocation',       { kind: 'pulls', amount: 3 }),
  p('r_chests', 'rare',   '🧰', 'Double coffre rare',      { kind: 'chestRare', amount: 2 }),
  p('r_bag',    'rare',   '🎒', 'Sac du voyageur',         { kind: 'stones', amount: 3 }, { kind: 'notes', amount: 40 }),
  p('e_gems',   'epique', '💰', 'Trésor de gemmes',        { kind: 'gems', amount: 350 }),
  p('e_pulls',  'epique', '🃏', 'Quintuple invocation',    { kind: 'pulls', amount: 5 }),
  p('e_chest',  'epique', '👑', 'Coffre du Pourfendeur',   { kind: 'chestEpic', amount: 1 }, { kind: 'stones', amount: 4 }),
  p('e_notes',  'epique', '🎼', 'Symphonie de Biwa',       { kind: 'notes', amount: 120 }),
  p('l_gems',   'legendaire', '🌠', 'Pluie de gemmes',      { kind: 'gems', amount: 1500 }),
  p('l_pulls',  'legendaire', '🌟', 'Vingt invocations',    { kind: 'pulls', amount: 20 }),
  p('l_hoard',  'legendaire', '🏯', 'Trésor du château',    { kind: 'chestEpic', amount: 3 }, { kind: 'stones', amount: 10 }, { kind: 'anomaly', amount: 1 }),
  p('m_infini', 'mythique', '♾️', 'Jackpot de l\'Infini',   { kind: 'gems', amount: 5000 }, { kind: 'pulls', amount: 30 }, { kind: 'chestEpic', amount: 5 }),
  p('m_nakime', 'mythique', '🪕', 'Bénédiction de Nakime',  { kind: 'title', amount: 1 }, { kind: 'gems', amount: 2000 }, { kind: 'anomaly', amount: 2 }),
];

export const GACHA_REWARD_LABEL: Record<GachaRewardKind, (n: number) => string> = {
  gems:      n => `${n} gemme${n > 1 ? 's' : ''}`,
  stones:    n => `${n} Pierre${n > 1 ? 's' : ''} d'Évolution`,
  notes:     n => `${n} Notes de Biwa`,
  pulls:     n => `${n} invocation${n > 1 ? 's' : ''}`,
  chestRare: n => `${n} coffre${n > 1 ? 's' : ''} rare${n > 1 ? 's' : ''}`,
  chestEpic: n => `${n} coffre${n > 1 ? 's' : ''} épique${n > 1 ? 's' : ''}`,
  anomaly:   n => `${n} Jeton${n > 1 ? 's' : ''} d'Anomalie`,
  title:     () => `titre « ${NAKIME_GACHA_TITLE} »`,
};

export const describeGachaPrize = (prize: GachaPrize) => prize.rewards.map(r => GACHA_REWARD_LABEL[r.kind](r.amount)).join(' + ');

/** Probabilité (%) d'une rareté de capsule, hors garantie. */
export function gachaTierChance(tier: GachaTier): number {
  const total = GACHA_TIERS.reduce((s, t) => s + GACHA_TIER_INFO[t].weight, 0);
  return (GACHA_TIER_INFO[tier].weight / total) * 100;
}

/**
 * Tire une capsule. `pity` = tirages consécutifs sans Légendaire ou mieux :
 * au NAKIME_GACHA_PITY-ième, la capsule est au moins Légendaire.
 */
export function rollGachaPrize(pity: number, rand: () => number = Math.random): GachaPrize {
  const forced = pity + 1 >= NAKIME_GACHA_PITY;
  const tiers = forced ? GACHA_TIERS.filter(isHighTier) : GACHA_TIERS;
  const total = tiers.reduce((s, t) => s + GACHA_TIER_INFO[t].weight, 0);
  let r = rand() * total;
  let tier = tiers[tiers.length - 1];
  for (const t of tiers) {
    r -= GACHA_TIER_INFO[t].weight;
    if (r < 0) { tier = t; break; }
  }
  const pool = NAKIME_GACHA_PRIZES.filter(x => x.tier === tier);
  return pool[Math.floor(rand() * pool.length)];
}

export function isHighTier(tier: GachaTier): boolean {
  return tier === 'legendaire' || tier === 'mythique';
}
