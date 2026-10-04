// Définition des quêtes GachaDle — isolée de gachadle.ts, sans dépendance,
// pour que achievements.ts puisse l'importer sans créer de cycle
// (gachadle → collectionFilters → achievements).

import type { Rarity } from '@/types/game';

export type DleQuestDef =
  | { id: string; label: string; gems: number; kind: 'streak' | 'played'; value: number }
  | { id: string; label: string; gems: number; kind: 'guesses'; value: number }
  | { id: string; label: string; gems: number; kind: 'rarity'; value: Rarity }
  | { id: string; label: string; gems: number; kind: 'all' };

const RARITY_QUEST_LABELS: [Rarity, string, number][] = [
  ['C', 'commun', 25], ['U', 'peu commun', 25], ['R', 'rare', 25], ['E', 'épique', 25], ['L', 'légendaire', 25],
  ['M', 'mythique', 25], ['S', 'stellaire', 25], ['CO', 'cosmique', 25], ['P', 'primordial', 25], ['T', 'transcendant', 50],
];

export const DLE_QUESTS: DleQuestDef[] = [
  ...([[3, 50], [5, 100], [8, 200], [10, 400], [15, 800], [20, 1000], [30, 1500]] as const).map(([n, gems]) =>
    ({ id: `dle_streak_${n}`, label: `Avoir une série de ${n} défis du jour`, gems, kind: 'streak' as const, value: n })),
  ...([[10, 50], [6, 100], [3, 200], [2, 300]] as const).map(([n, gems]) =>
    ({ id: `dle_guesses_${n}`, label: `Réussir en moins de ${n} essais`, gems, kind: 'guesses' as const, value: n })),
  ...([[1, 20], [10, 100], [20, 500], [30, 1200]] as const).map(([n, gems]) => ({
    id: `dle_played_${n}`,
    label: n === 1 ? 'Jouer au GachaDle pour la première fois' : `Jouer au GachaDle pour la ${n}e fois`,
    gems, kind: 'played' as const, value: n,
  })),
  ...RARITY_QUEST_LABELS.map(([r, name, gems]) =>
    ({ id: `dle_rarity_${r}`, label: `Trouver un personnage ${name}`, gems, kind: 'rarity' as const, value: r })),
  { id: 'dle_all', label: 'Accomplir toutes les quêtes GachaDle', gems: 900, kind: 'all' },
];
