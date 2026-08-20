// lib/game/prestige.ts — Définitions du système de Prestige (New Game+)

export interface PrestigeUpgrade {
  id:          string;
  name:        string;
  icon:        string;
  description: string;
  cost:        number;   // Points de prestige
  maxLevel:    number;   // 1 = unique, N = empilable
  effect: {
    type:  'dps' | 'coins' | 'startGems' | 'startPalier' | 'upgradeDiscount';
    value: number;  // multiplicateur ou bonus flat
  };
}

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id:'coins_boost', name:'Fortune Ancestrale', icon:'🪙',
    description:'+30% de coins gagnés par ennemi vaincu, pour toujours.',
    cost:1, maxLevel:10,
    effect:{ type:'coins', value:1.30 },
  },
  {
    id:'start_gems', name:'Mémoire Quantique', icon:'💎',
    description:'Commence chaque nouveau run avec 500 Neko-Gemmes supplémentaires.',
    cost:3, maxLevel:3,
    effect:{ type:'startGems', value:500 },
  },
  {
    id:'dps_boost', name:'Transcendance', icon:'🔥',
    description:'+50% DPS de toute ton équipe de façon permanente.',
    cost:3, maxLevel:5,
    effect:{ type:'dps', value:1.50 },
  },
  {
    id:'start_palier', name:'Archives du Multivers', icon:'🌌',
    description:'Commence directement au palier 3 au lieu du palier 1.',
    cost:5, maxLevel:1,
    effect:{ type:'startPalier', value:3 },
  },
  {
    id:'upgrade_discount', name:'Fusion Parfaite', icon:'⚗',
    description:'Les upgrades d\'attaque coûtent 20% moins cher.',
    cost:2, maxLevel:3,
    effect:{ type:'upgradeDiscount', value:0.80 },
  },
];

export interface ActivePrestigeBonuses {
  dpsMult:         number;
  coinsMult:       number;
  startGems:       number;
  startPalier:     number;
  upgradeDiscount: number;  // ex: 0.64 = -36%
}

export function calcPrestigeBonuses(
  purchased: Record<string, number>  // id → level acheté
): ActivePrestigeBonuses {
  let dpsMult         = 1;
  let coinsMult       = 1;
  let startGems       = 0;
  let startPalier     = 1;
  let upgradeDiscount = 1;

  for (const upg of PRESTIGE_UPGRADES) {
    const level = purchased[upg.id] ?? 0;
    if (level <= 0) continue;
    const { type, value } = upg.effect;
    if (type === 'dps')             dpsMult         *= Math.pow(value, level);
    if (type === 'coins')           coinsMult       *= Math.pow(value, level);
    if (type === 'startGems')       startGems       += value * level;
    if (type === 'startPalier')     startPalier      = Math.max(startPalier, value);
    if (type === 'upgradeDiscount') upgradeDiscount *= Math.pow(value, level);
  }

  return { dpsMult, coinsMult, startGems, startPalier, upgradeDiscount };
}

// Bonus DPS passif par niveau de prestige (en plus du shop)
export const PRESTIGE_PASSIVE_DPS_PER_LEVEL  = 0.15;  // +15% DPS par niveau
export const PRESTIGE_PASSIVE_COIN_PER_LEVEL = 0.20;  // +20% coins par niveau
