import { getCharacterById } from './characters';
import { parseInstanceKey } from './editions';

export interface SynergyThreshold {
  count: number;
  label: string;
  dpsBonus: number;
  globalBonus: number;
}

export interface SynergyDef {
  id: string;
  universe: string;
  label: string;
  color: string;
  glow: string;
  icon: string;
  thresholds: SynergyThreshold[];
}

export interface ActiveSynergy {
  def: SynergyDef;
  threshold: SynergyThreshold;
  count: number;
  members: string[];
}

/**
 * Crée automatiquement les thresholds et leur label.
 *
 * Exemple :
 * threshold(2, 32, 0, 'Dragon Ball Z')
 * → {
 *     count: 2,
 *     label: '+32% DPS Dragon Ball Z',
 *     dpsBonus: 32,
 *     globalBonus: 0
 *   }
 */
const createThresholds = (
  universe: string,
  thresholds: [count: number, dpsBonus: number, globalBonus?: number][]
): SynergyThreshold[] =>
  thresholds.map(([count, dpsBonus, globalBonus = 0]) => ({
    count,
    dpsBonus,
    globalBonus,
    label: `+${dpsBonus}% DPS ${universe}${
      globalBonus > 0 ? ` +${globalBonus}% global` : ''
    }`,
  }));

/**
 * Helper pour éviter de répéter la logique de génération des labels.
 */
const synergy = ({
  id,
  universe,
  label,
  color,
  glow,
  icon,
  thresholds,
}: Omit<SynergyDef, 'thresholds'> & {
  thresholds: [count: number, dpsBonus: number, globalBonus?: number][];
}): SynergyDef => ({
  id,
  universe,
  label,
  color,
  glow,
  icon,
  thresholds: createThresholds(universe, thresholds),
});

export const SYNERGIES: SynergyDef[] = [

  synergy({
    id: 'dbz',
    universe: 'Dragon Ball Z',
    label: 'Dragon Ball Z',
    color: '#f97316',
    glow: '#ea580c',
    icon: '🐉',
    thresholds: [
      [2, 32],
      [4, 55, 15],
    ],
  }),

  synergy({
    id: 'onepiece',
    universe: 'One Piece',
    label: 'One Piece',
    color: '#f59e0b',
    glow: '#d97706',
    icon: '☠',
    thresholds: [
      [2, 28],
      [3, 35, 5],
    ],
  }),

  synergy({
    id: 'naruto',
    universe: 'Naruto',
    label: 'Naruto',
    color: '#f97316',
    glow: '#ea580c',
    icon: '🍃',
    thresholds: [
      [2, 23],
      [3, 35],
    ],
  }),

  synergy({
    id: 'pokemon',
    universe: 'Pokémon',
    label: 'Pokémon',
    color: '#fbbf24',
    glow: '#f59e0b',
    icon: '⚡',
    thresholds: [
      [2, 21],
      [4, 30, 5],
    ],
  }),

  synergy({
    id: 'persona5',
    universe: 'Persona 5',
    label: 'Persona 5',
    color: '#ef4444',
    glow: '#dc2626',
    icon: '🃏',
    thresholds: [
      [2, 18],
      [3, 40],
    ],
  }),

  synergy({
    id: 'poppy',
    universe: 'Poppy Playtime',
    label: 'Poppy Playtime',
    color: '#4ade80',
    glow: '#16a34a',
    icon: '🧸',
    thresholds: [
      [2, 22],
    ],
  }),

  synergy({
    id: 'blackclover',
    universe: 'Black Clover',
    label: 'Black Clover',
    color: '#fbbf24',
    glow: '#d97706',
    icon: '🍀',
    thresholds: [
      [2, 25],
      [3, 35],
    ],
  }),

  synergy({
    id: 'brotato',
    universe: 'Brotato',
    label: 'Brotato',
    color: '#fb923c',
    glow: '#ea580c',
    icon: '🥔',
    thresholds: [
      [2, 22],
    ],
  }),

  synergy({
    id: 'tensei',
    universe: 'Tensei Slime',
    label: 'Tensei Slime',
    color: '#34d399',
    glow: '#10b981',
    icon: '🌀',
    thresholds: [
      [2, 29],
    ],
  }),

  synergy({
    id: 'minecraft',
    universe: 'Minecraft',
    label: 'Minecraft',
    color: '#86efac',
    glow: '#22c55e',
    icon: '🟩',
    thresholds: [
      [2, 22],
    ],
  }),

  synergy({
    id: 'subnautica',
    universe: 'Subnautica',
    label: 'Subnautica',
    color: '#38bdf8',
    glow: '#0891b2',
    icon: '🌊',
    thresholds: [
      [2, 15],
    ],
  }),

  synergy({
    id: 'bleach',
    universe: 'Bleach',
    label: 'Bleach',
    color: '#60a5fa',
    glow: '#3b82f6',
    icon: '⚔',
    thresholds: [
      [2, 28],
      [4, 45, 6],
    ],
  }),

  synergy({
    id: 'fate',
    universe: 'Fate',
    label: 'Fate',
    color: '#c084fc',
    glow: '#9333ea',
    icon: '👑',
    thresholds: [
      [2, 25],
      [4, 40, 5],
    ],
  }),

  synergy({
    id: 'zelda',
    universe: 'The Legend of Zelda',
    label: 'Zelda',
    color: '#a3e635',
    glow: '#65a30d',
    icon: '🗡',
    thresholds: [
      [2, 15],
    ],
  }),

  synergy({
    id: 'repo',
    universe: 'R.E.P.O',
    label: 'R.E.P.O',
    color: '#a78bfa',
    glow: '#7c3aed',
    icon: '🔔',
    thresholds: [
      [2, 14],
    ],
  }),

  synergy({
    id: 'danganronpa',
    universe: 'Danganronpa',
    label: 'Danganronpa',
    color: '#ec4899',
    glow: '#db2777',
    icon: '💀',
    thresholds: [
      [2, 20],
      [3, 45],
    ],
  }),

  synergy({
    id: 'digital',
    universe: 'Digital Circus',
    label: 'Digital Circus',
    color: '#818cf8',
    glow: '#6366f1',
    icon: '🎪',
    thresholds: [
      [2, 15],
    ],
  }),

  synergy({
    id: 'sao',
    universe: 'Sword Art Online',
    label: 'SAO',
    color: '#67e8f9',
    glow: '#0284c7',
    icon: '🗾',
    thresholds: [
      [2, 15],
    ],
  }),

  synergy({
    id: 'bungou',
    universe: 'Bungou Stray Dogs',
    label: 'Bungou Stray Dogs',
    color: '#f472b6',
    glow: '#ec4899',
    icon: '📖',
    thresholds: [
      [2, 19],
    ],
  }),

  synergy({
    id: 'overwatch',
    universe: 'Overwatch',
    label: 'Overwatch',
    color: '#f59e0b',
    glow: '#d97706',
    icon: '🛡',
    thresholds: [
      [2, 17],
    ],
  }),

  synergy({
    id: 'chillcool',
    universe: 'Chill&Cool',
    label: 'Chill&Cool',
    color: '#818cf8',
    glow: '#6366f1',
    icon: '😎',
    thresholds: [
      [2, 35, 20],
    ],
  }),

  synergy({
    id: 'sao_kirito',
    universe: 'Sword Art Online',
    label: 'SAO',
    color: '#67e8f9',
    glow: '#0284c7',
    icon: '🗾',
    thresholds: [
      [2, 21],
    ],
  }),

  synergy({
    id: 'lol',
    universe: 'League of Legends',
    label: 'League of Legends',
    color: '#38bdf8',
    glow: '#0ea5e9',
    icon: '⚔',
    thresholds: [
      [2, 23],
      [4, 42, 6],
    ],
  }),

  synergy({
    id: 'demonslayer',
    universe: 'Demon Slayer',
    label: 'Demon Slayer',
    color: '#22d3ee',
    glow: '#0891b2',
    icon: '🗡',
    thresholds: [
      [2, 22],
      [3, 33],
    ],
  }),

  synergy({
    id: 'cuphead',
    universe: 'Cuphead',
    label: 'Cuphead',
    color: '#f87171',
    glow: '#dc2626',
    icon: '🎬',
    thresholds: [
      [2, 18],
      [3, 40],
    ],
  }),

  synergy({
    id: 'nosanimaux',
    universe: 'Nos Animaux',
    label: 'Nos Animaux',
    color: '#86efac',
    glow: '#22c55e',
    icon: '🐾',
    thresholds: [
      [2, 16],
      [3, 35, 5],
    ],
  }),

  synergy({
    id: 'spyfamily',
    universe: 'Spy x Family',
    label: 'Spy x Family',
    color: '#fca5a5',
    glow: '#ef4444',
    icon: '🕵',
    thresholds: [
      [2, 19],
    ],
  }),

  synergy({
    id: 'valkyrie',
    universe: 'Valkyrie Apocalypse',
    label: 'Valkyrie Apocalypse',
    color: '#fcd34d',
    glow: '#f59e0b',
    icon: '⚡',
    thresholds: [
      [2, 23],
    ],
  }),

  synergy({
    id: 'aot',
    universe: 'Attaque des Titans',
    label: 'Attaque des Titans',
    color: '#a3a3a3',
    glow: '#737373',
    icon: '🗡',
    thresholds: [
      [2, 24],
    ],
  }),

  synergy({
    id: 'hollowknight',
    universe: 'Hollow Knight',
    label: 'Hollow Knight',
    color: '#a78bfa',
    glow: '#7c3aed',
    icon: '🐛',
    thresholds: [
      [2, 21],
    ],
  }),

  synergy({
    id: 'chainsawman',
    universe: 'Chainsaw Man',
    label: 'Chainsaw Man',
    color: '#f87171',
    glow: '#dc2626',
    icon: '🪚',
    thresholds: [
      [2, 22],
    ],
  }),

  synergy({
    id: 'eldenring',
    universe: 'Elden Ring',
    label: 'Elden Ring',
    color: '#fbbf24',
    glow: '#d97706',
    icon: '🗡',
    thresholds: [
      [2, 23],
    ],
  }),

  synergy({
    id: 'tekken',
    universe: 'Tekken',
    label: 'Tekken',
    color: '#ef4444',
    glow: '#b91c1c',
    icon: '👊',
    thresholds: [
      [2, 24],
      [3, 35, 5],
    ],
  }),
];

// Déduplique par universe
const UNIQUE_SYNERGIES = SYNERGIES.filter(
  (s, i, arr) => arr.findIndex(x => x.universe === s.universe) === i
);

// Index universe → def (évite un find() linéaire par univers de l'équipe).
const SYNERGY_BY_UNIVERSE: Map<string, SynergyDef> = new Map(
  UNIQUE_SYNERGIES.map(s => [s.universe, s])
);

// Mémo : l'équipe change rarement, mais cette fonction est appelée plusieurs
// fois par rendu (DPS total, DPS par perso, badges de synergie...) et le combat
// re-rend chaque seconde. On garde le dernier résultat pour une équipe donnée.
let _synCacheKey = '';
let _synCacheVal: ActiveSynergy[] = [];

export function computeActiveSynergies(
  equippedTeam: (string | null)[]
): ActiveSynergy[] {
  const key = equippedTeam.join('|');
  if (key === _synCacheKey) return _synCacheVal;

  const universeCount: Record<string, string[]> = {};

  for (const id of equippedTeam) {
    if (!id) continue;

    // `id` peut être une clé de collection composite (perso::or/diamant) : le
    // templateId pur (pour retrouver l'univers dans CHARACTER_POOL) est
    // directement récupérable depuis la clé elle-même, sans consulter `collection`.
    const pureId = parseInstanceKey(id).templateId;
    const tpl = getCharacterById(pureId);

    if (!tpl?.universe) continue;

    if (!universeCount[tpl.universe]) {
      universeCount[tpl.universe] = [];
    }

    universeCount[tpl.universe].push(id);
  }

  const active: ActiveSynergy[] = [];

  for (const [universe, members] of Object.entries(universeCount)) {
    if (members.length < 2) continue;

    const def = SYNERGY_BY_UNIVERSE.get(universe);
    if (!def) continue;

    const reached = [...def.thresholds]
      .reverse()
      .find(t => members.length >= t.count);

    if (reached) {
      active.push({
        def,
        threshold: reached,
        count: members.length,
        members,
      });
    }
  }

  _synCacheKey = key;
  _synCacheVal = active;

  return active;
}

export function calcDpsWithSynergies(
  templateId: string,
  baseDps: number,
  activeSynergies: ActiveSynergy[]
): number {
  const tpl = getCharacterById(parseInstanceKey(templateId).templateId);
  if (!tpl) return baseDps;

  let mult = 1;

  for (const syn of activeSynergies) {
    if (
      syn.def.universe === tpl.universe &&
      syn.threshold.dpsBonus > 0
    ) {
      mult += syn.threshold.dpsBonus / 100;
    }

    if (syn.threshold.globalBonus > 0) {
      mult += syn.threshold.globalBonus / 100;
    }
  }

  return Math.floor(baseDps * mult);
}

export const getSynergyByUniverse = (universe: string) =>
  UNIQUE_SYNERGIES.find(s => s.universe === universe);

export { UNIQUE_SYNERGIES as SYNERGIES_LIST };

export default UNIQUE_SYNERGIES;