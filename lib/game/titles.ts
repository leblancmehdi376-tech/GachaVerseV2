// ── Bonus d'or par titre équipé ────────────────────────────────────────────
// Les titres sont classés du plus facile (Novice, +5%) au plus dur
// (Architecte du Panthéon — 5 personnages en Base+Or+Diamant à la fois, +75%),
// avec une montée linéaire entre les deux. Le classement suit la difficulté
// réelle des succès qui les débloquent (et non l'ordre du fichier, les
// catégories n'étant pas comparables entre elles en valeur brute).
const TITLE_ORDER: string[] = [
  'Novice', 'Premier Sang', 'Briseur de Cornes', 'Six Seven', 'Recruteur', 'Chanceux', 'Élu', 'Joueur', 'Serviteur',
  'Astre', 'Étincelant', 'Voyageur', 'Émissaire', 'Légat', 'Souverain',
  'Meneur', 'Tacticien', 'Chasseur', 'Exterminateur', 'Trésorier', 'Aventurier',
  'Conquérant', 'Optimisateur', 'Archiviste', 'Scintillant', 'Parieur', 'Forgeron', 'Faucheur', 'Insatiable',
  'Dompteur de Mondes', 'Tueur de Dieux', 'Collectionneur', 'Économe', 'Nébuleuse', 'Invocateur', 'Puissant', 'Fléau',
  'Harmonie Totale', 'Maître Artisan', 'Décoré', 'Fossoyeur',
  'Maître du Multivers', 'Millionnaire', 'Complétiste', 'Réincarné',
  'Éclat Pur', 'Trinité', 'Néant Incarné',
  'Dévastateur', 'Grand Invocateur', 'Garde d\'Élite',
  'Annihilateur', 'Cataclysme', 'Ploutocrate', 'Ascendant', 'Prisme Absolu',
  'Oligarque',
  // ── Extrêmement difficiles (au-delà de tout ce qui précède) ────────────
  'Finisseur', 'Légende Vivante', 'Apocalypse', 'Insatiable Absolu', 'Singularité',
  'Renaissant', 'Élu Suprême', 'Empereur', 'Éternel', 'Architecte du Panthéon',
];

const MIN_BONUS_PCT = 5;   // Novice
const MAX_BONUS_PCT = 75;  // Architecte du Panthéon (était 60, plafond relevé pour ce nouveau palier)

export const TITLE_GOLD_BONUS_PCT: Record<string, number> = Object.fromEntries(
  TITLE_ORDER.map((title, i) => [
    title,
    Math.round((MIN_BONUS_PCT + (MAX_BONUS_PCT - MIN_BONUS_PCT) * i / (TITLE_ORDER.length - 1)) * 10) / 10,
  ])
);
TITLE_GOLD_BONUS_PCT['Six Seven'] = 6.7;
TITLE_GOLD_BONUS_PCT['Réincarné'] = 15;

// ── Titres d'événement — drop rare (1%) sur un kill de boss d'event ───────
// Hors interpolation de TITLE_ORDER (pas liés à un succès), bonus fixé
// directement comme demandé.
export const EVENT_TITLES: Record<string, string> = {
  shadow_monarch:  'Shadow Monarch',
  eminence_shadow: 'Shadow Eminence',
  arthur_leywin:   'Godkiller',
};
TITLE_GOLD_BONUS_PCT['Shadow Monarch']  = 8;
TITLE_GOLD_BONUS_PCT['Shadow Eminence'] = 10;
TITLE_GOLD_BONUS_PCT['Godkiller']       = 12;

/** Multiplicateur d'or (1.05 → 1.60) du titre actuellement équipé. */
export function getTitleGoldMultiplier(activeTitle: string): number {
  const pct = TITLE_GOLD_BONUS_PCT[activeTitle] ?? 0;
  return 1 + pct / 100;
}
