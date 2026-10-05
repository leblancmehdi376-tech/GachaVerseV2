// ── Titres de raid — drop rare (1%) sur un kill de boss de raid ───────
export const RAID_TITLES: Record<string, string> = {
  shadow_monarch:  'Shadow Monarch',
  eminence_shadow: 'Shadow Eminence',
  arthur_leywin:   'Godkiller',
};

// ── Bonus d'or (%) par titre ───────────────────────────────────────────────
// Valeurs fixées à la main. Tous les titres débloqués cumulent leur bonus
// (voir getTotalTitleGoldBonusPct), le titre équipé ne sert qu'à l'affichage.
export const TITLE_GOLD_BONUS_PCT: Record<string, number> = {
  // ── Succès ─────────────────────────────────────────────────────────────
  'Novice':                5,
  'Premier Sang':          6,
  'Six Seven':             6.7,
  'Réincarné':             15,
  'Maître des Festivités': 12,
  'Gardien des Secrets':   15,
  'Invaincu':              18,
  'Maître Absolu':         20,
  // ── Compadex 100% — parmi les tout derniers succès du jeu ──────────────
  '🌌 Rassembleur d\'Âmes':                         73,
  '⚔️ Collectionneur de reliques':                  74,
  '👑 Souverain des Reliques et des Âmes perdues': 75,

  // ── Connexion journalière (voir lib/game/dailyRewards.ts) ─────────────
  '⚡ Le Protagoniste Prometteur': 7,
  '🌌 Briseur de Limites':         28,

  // ── GachaDle — toutes les quêtes accomplies (succès dle_pro) ─────────
  'Pro du GachaverseDLE': 10,

  // ── Le Grand Périple du Multivers — dernier palier (voir PERIPLE_TITLE) ──
  '🗺️ Grand Voyageur du Multivers': 15,

  // ── Raid (voir RAID_TITLES) ───────────────────────────────────────────
  'Shadow Monarch':  8,
  'Shadow Eminence': 10,
  'Godkiller':       12,

  // ── Anciens titres, plus obtenables depuis la refonte des succès ──────
  // 'Briseur de Cornes':      7,
  // 'Recruteur':              9.1,
  // 'Chanceux':               10.1,
  // 'Élu':                    11.1,
  // 'Joueur':                 12.1,
  // 'Serviteur':              13.1,
  // 'Astre':                  14.1,
  // 'Étincelant':             15.1,
  // 'Voyageur':               16.2,
  // 'Émissaire':              17.2,
  // 'Légat':                  18.2,
  // 'Souverain':              19.2,
  // 'Meneur':                 20.2,
  // 'Tacticien':              21.2,
  // 'Chasseur':               22.2,
  // 'Exterminateur':          23.3,
  // 'Trésorier':              24.3,
  // 'Aventurier':             25.3,
  // 'Conquérant':             26.3,
  // 'Optimisateur':           27.3,
  // 'Archiviste':             28.3,
  // 'Scintillant':            29.3,
  // 'Parieur':                30.4,
  // 'Forgeron':               31.4,
  // 'Faucheur':               32.4,
  // 'Insatiable':             33.4,
  // 'Dompteur de Mondes':     34.4,
  // 'Tueur de Dieux':         35.4,
  // 'Collectionneur':         36.4,
  // 'Économe':                37.5,
  // 'Nébuleuse':              38.5,
  // 'Invocateur':             39.5,
  // 'Puissant':               40.5,
  // 'Fléau':                  41.5,
  // 'Harmonie Totale':        42.5,
  // 'Maître Artisan':         43.6,
  // 'Décoré':                 44.6,
  // 'Fossoyeur':              45.6,
  // 'Maître du Multivers':    46.6,
  // 'Millionnaire':           47.6,
  // 'Complétiste':            48.6,
  // 'Éclat Pur':              50.7,
  // 'Trinité':                51.7,
  // 'Néant Incarné':          52.7,
  // 'Dévastateur':            53.7,
  // 'Grand Invocateur':       54.7,
  // 'Garde d\'Élite':         55.7,
  // 'Annihilateur':           56.7,
  // 'Cataclysme':             57.8,
  // 'Ploutocrate':            58.8,
  // 'Ascendant':              59.8,
  // 'Prisme Absolu':          60.8,
  // 'Oligarque':              61.8,
  // 'Finisseur':              62.8,
  // 'Légende Vivante':        63.8,
  // 'Apocalypse':             64.9,
  // 'Insatiable Absolu':      65.9,
  // 'Singularité':            66.9,
  // 'Renaissant':             67.9,
  // 'Élu Suprême':            68.9,
  // 'Empereur':               69.9,
  // 'Éternel':                70.9,
  // 'Architecte du Panthéon': 72,
};

/** Bonus d'or total (%) : somme des bonus de TOUS les titres débloqués. */
export function getTotalTitleGoldBonusPct(unlockedTitles: readonly string[]): number {
  const total = [...new Set(unlockedTitles)].reduce((sum, t) => sum + (TITLE_GOLD_BONUS_PCT[t] ?? 0), 0);
  return Math.round(total * 10) / 10;
}

/** Multiplicateur d'or cumulé de tous les titres débloqués (additif). */
export function getTitleGoldMultiplier(unlockedTitles: readonly string[]): number {
  return 1 + getTotalTitleGoldBonusPct(unlockedTitles) / 100;
}
