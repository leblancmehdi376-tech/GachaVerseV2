// ── Codes cadeaux ─────────────────────────────────────────────────────
// Deux modes d'usage unique, au choix par code (voir `perUser` ci-dessous) :
//  - GLOBAL (par défaut) : le premier joueur qui valide le code le consomme
//    définitivement, pour tout le monde.
//  - PAR JOUEUR (perUser: true) : chaque joueur peut valider le code une
//    seule fois, indépendamment des autres (ex: code de bienvenue).
// Tracké côté Firestore, voir lib/firebase/giftCodes.ts.
// Pour ajouter/retirer des codes, modifie simplement ce tableau.

export interface GiftCodeDef {
  code: string;           // stocké en MAJUSCULES, la saisie est normalisée avant comparaison
  perUser?: boolean;      // true = chaque joueur peut l'utiliser une fois ; sinon usage unique GLOBAL
  gems?: number;          // Neko-Gemmes à distribuer (optionnel)
  pixelCoins?: number;    // Pixel-Coins à distribuer (optionnel)
  characters?: string[];  // IDs de personnages à ajouter à la collection (édition tirée normalement)
  maxCharacters?: string[]; // IDs de personnages octroyés déjà MAX (7★, dernière évo, niveau max, édition Diamant)
  items?: string[];       // IDs d'items à ajouter à l'inventaire (optionnel)
  equipment?: string[];   // IDs d'équipements (armes/armures) à ajouter à l'équipementInventaire (optionnel)
  drops?: Record<string, number>; // Drops spéciaux d'expédition (dropInventory) à ajouter, ex: { pierre_evolution: 1000 }
}

// ── Exemples (à titre indicatif, ne pas décommenter tel quel) ──────────
//
// 1) Code global classique — gemmes + coins, épuisé après le 1er joueur :
//    { code: 'NOEL-2026', gems: 500, pixelCoins: 1_000_000 },
//
// 2) Code "par joueur" — chaque compte peut le valider une fois, pas de
//    limite globale (idéal pour un code de bienvenue distribué à tous) :
//    { code: 'BIENVENUE-2026', perUser: true, gems: 100 },
//
// 3) Personnage offert, tiré "normalement" (niveau 1, forme de base) :
//    { code: 'LUFFY-CADEAU', characters: ['luffy'] },
//
// 4) Même personnage mais directement au maximum (7★, dernière évolution,
//    niveau max, édition Diamant) :
//    { code: 'LUFFY-DIAMOND-MAX', maxCharacters: ['luffy'] },
//
// 5) Équipement + items d'inventaire combinés :
//    { code: 'EPEE-AUBE', equipment: ['weapon_primordial_dawn'], items: ['elixir_vie'] },
//
// 6) Drops spéciaux d'expédition (dropInventory), ex: pierres d'évolution :
//    { code: 'PIERRE-EVO-TEST-1000', drops: { pierre_evolution: 1000 } },
//
// 7) Combo complet, code global (un seul gagnant au monde) :
//    { code: 'EVENT-RARE', perUser: false, gems: 1200, pixelCoins: 500_000,
//      characters: ['dazai'], items: ['manteau_ombre'], drops: { pierre_evolution: 40 } },
//
// Rappel : `perUser` absent ou `false` = usage unique GLOBAL (comportement
// par défaut, un seul joueur au total peut consommer le code). `perUser: true`
// = usage unique PAR JOUEUR (chacun peut le valider une fois).

export const GIFT_CODES: GiftCodeDef[] = [
  // Débloque tous les personnages du jeu (édition tirée normalement, pas
  // de bonus max) — liste calculée depuis CHARACTER_POOL pour ne jamais
  // devenir obsolète quand le roster change.
  /*{
    code:       'GACHAVERSE-ALL-CHARS',
    characters: CHARACTER_POOL.map(c => c.id),
  },

  // Dev code de test : 1000 Pierres d'Évolution (voir evoStoneCost dans types/game.ts).
  {
    code:  'PIERRE-EVO-TEST-1000',
    drops: { pierre_evolution: 1000 },
  },*/

  //{ code: 'NEKOZ-TEST-neklo',  characters:   ['atsushi'] },

  // Dev code: grants Atsushi (forme de base, niveau 1)
  //{ code: 'ATSUSHI-BASE-1', characters: ['atsushi'] },
    // Dev code: grants Sea Emperor (base form)
    //{ code: 'SEA-EMPEROR-BASE', characters: ['sea_emperor'] },
    // Dev code: grants Godrick (base) + 900 gems
    //{ code: 'GODRICK-900', characters: ['godrick_er'], gems: 900 },

  // ── Codes 70M Coins ───────────────────────────────────────────────
  //{ code: 'NEKOZ-RICH-4F7H',  pixelCoins: 10_000_000 },

  // ── Code Arthur Leywin ────────────────────────────────────────────
  /*{
    code:         'ARTHUR-LEYWIN-GV2',
    pixelCoins:   700_000_000,
    characters:   ['arthur_leywin', 'arthur_leywin'],
    gems:1200,
  },*/
  //code pour évo jinwoo et vegeta
  /*{
    code:         'LULUUUUUUX',
    items:        ['elixir_vie', 'elixir_vie', 'manteau_ombre', 'manteau_ombre', 'beru'],
    drops:        { pierre_evolution: 40 },
  },*/
  {
    code:         'CRISTAL-ETHER',
    items:        ['cristal_ether'],
  },
  /*{
    code:         'CODE-SORRY-INES',
    pixelCoins:   1_000_000,
    gems: 400,
    characters:   ['dazai', 'ichigo'],
  },
  {
    code:         'CODE-SORRY-LISA3',
    pixelCoins:   10_000_000,
    gems: 200,
    characters:   ['dazai', 'sanji', 'naruto'],
  },
  {
    code:         'COIN',
    pixelCoins:   1_000_000_000_000_000_000_000,
  },
  {
    code:         'BLOCK-SYLVIA',
    items:        ['sylvia'],
  },
  {
    code:         'AYGRO-EPEE',
    items:        ['epee_ether'],
    gems: 200,
  },
  {
    code:         'ROKLOU-EPEE',
    items:        ['epee_ether'],
  },*/
  // ── Goku max (7★, dernière évolution, niveau max, édition Diamant) ──
  /*{
    code:          'GOKU-DIAMOND-MAX',
    maxCharacters: ['goku'],
  },
  {
    code:          'POPO-DIAMOND-MAX',
    maxCharacters: ['mr_popo'],
  },
  {
    code:          'NARUTO-DIAMOND-MAX',
    maxCharacters: ['naruto'],
  },*/
  // ── Personnages offerts (édition tirée normalement, pas de bonus max) ──
  /*{
    code:       'OUCHUU-CADEAU',
    characters: ['ouchuu'],
  },
  {
    code:       'YAMI-CADEAU',
    characters: ['yami'],
  },
  {
    code:       'LUFFY-CADEAU',
    characters: ['luffy'],
  },
  {
    code:       'POWER-CADEAU',
    characters: ['power_csm'],
  },
  {
    code:      'EPEE-AUBE',
    equipment: ['weapon_primordial_dawn'],
  },*/
  {
    code:       'AIR-MAIS-CHAMP-TRACTEUR',
    gems:       900,
  },
  // Code utilisable par chaque joueur (une fois par compte), pas de limite globale
  {
    code:       'CT-BOGOSSE',
    perUser:    true,
    gems:       900,
  }
];

// Normalise une saisie utilisateur (espaces, casse) pour la comparaison
export function normalizeGiftCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function findGiftCode(raw: string): GiftCodeDef | undefined {
  const normalized = normalizeGiftCode(raw);
  return GIFT_CODES.find(c => c.code === normalized);
}