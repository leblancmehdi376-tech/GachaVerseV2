// lib/game/bonds.ts — Liens légendaires : duos et trios iconiques dont
// chaque membre gagne un bonus de DPS quand TOUS sont dans l'équipe active
// (combat de l'accueil uniquement, comme la cohésion — voir characterSlice).
// Cachés tant qu'ils n'ont jamais été réunis : aucun indice sur leurs membres,
// c'est au joueur de chercher qui associer. La première fois, le lien est
// découvert (discoveredBonds, jamais remis à zéro par le Prestige) et apparaît
// dans l'onglet Liens du Compadex. Les bonus se cumulent avec les synergies.
import { parseInstanceKey } from './editions';

export interface BondDef {
  id:       string;
  name:     string;
  icon:     string;
  members:  string[]; // templateIds, tous requis dans l'équipe
  dpsBonus: number;   // % de DPS en plus pour chaque membre
  lore:     string;   // affiché une fois le lien découvert
}

// Volontairement modestes : ils se cumulent avec la synergie d'univers que la
// plupart des liens activent déjà.
export const BOND_DUO_BONUS  = 10;
export const BOND_TRIO_BONUS = 15;

function bond(id: string, name: string, icon: string, members: string[], lore: string): BondDef {
  return { id, name, icon, members, dpsBonus: members.length >= 3 ? BOND_TRIO_BONUS : BOND_DUO_BONUS, lore };
}

export const BONDS: BondDef[] = [
  // ── Duos ──────────────────────────────────────────────────────────────────
  bond('rivaux_eternels', 'Rivaux Éternels', '🔥', ['goku', 'vegeta'],
    'Kakarot et le Prince des Saiyans : chaque combat les pousse plus loin.'),
  bond('freres_elric', 'Les Frères Elric', '⚗️', ['edward', 'alphonse'],
    'Un bras, une jambe, un corps entier : l\'échange équivalent les lie à jamais.'),
  bond('duel_genies', 'Le Duel des Génies', '📓', ['light_yagami', 'l_dn'],
    'Kira contre L : le premier qui découvre le nom de l\'autre a gagné.'),
  bond('plus_fort', 'Le Plus Fort et le Roi des Fléaux', '🤞', ['satoru_gojo', 'ryomen_sukuna'],
    'Le duel au sommet du jujutsu moderne.'),
  bond('famille_kamado', 'Frère et Sœur Kamado', '🌸', ['tanjiro', 'nezuko'],
    'Tanjiro a juré de rendre son humanité à Nezuko.'),
  bond('gon_kirua', 'Gon et Kirua', '⚡', ['gon_freecss', 'kirua_zoldyck'],
    'Le fils de Ging et l\'héritier des Zoldyck, inséparables.'),
  bond('duo_aincrad', 'Le Duo d\'Aincrad', '⚔️', ['kirito', 'asuna'],
    'L\'Épéiste Noir et l\'Éclair, un duo forgé dans Aincrad.'),
  bond('genies_rivaux', 'Les Génies Rivaux', '🧠', ['aizen', 'kisuke_urahara'],
    'Le Hōgyoku est né de leur rivalité.'),
  bond('enfants_roi_pale', 'Les Enfants du Roi Pâle', '🪲', ['the_knight', 'hornet_hk'],
    'Le Vaisseau et la protectrice d\'Hallownest, liés par le sang du Roi Pâle.'),
  bond('freres_squelettes', 'Les Frères Squelettes', '💀', ['sans_ut', 'papyrus'],
    'Nyeh heh heh ! Et un mauvais jeu de mots pour la route.'),
  bond('chats_multivers', 'Les Chats du Multivers', '🐱', ['morgana', 'catnap'],
    'Un Voleur Fantôme et un cauchemar en peluche : les chats se reconnaissent entre eux.'),
  // ── Trios ─────────────────────────────────────────────────────────────────
  bond('equipe_7', 'L\'Équipe 7', '🍥', ['naruto', 'sasuke', 'sakura'],
    'Un ninja turbulent, un génie Uchiha et une kunoichi au poing d\'acier.'),
  bond('trio_monstre', 'Le Trio Monstre', '☠️', ['luffy', 'zoro', 'sanji'],
    'Le futur Roi des Pirates, le futur meilleur épéiste du monde et le cuisinier à la jambe noire.'),
  bond('famille_forger', 'La Famille Forger', '🥜', ['loid', 'yor', 'anya_spy'],
    'Une famille de façade… qui devient bien réelle. Waku waku !'),
  bond('groupe_frieren', 'Le Groupe de Frieren', '🪄', ['frieren', 'fern', 'stark'],
    'Un nouveau voyage, sur les traces du groupe du héros Himmel.'),
  bond('banquet_rois', 'Le Banquet des Rois', '👑', ['gilgamesh', 'iskandar', 'arthur_pandragon'],
    'Le Roi des Héros, le Roi de la Conquête et le Roi des Chevaliers débattent de la royauté.'),
  bond('enfants_shiganshina', 'Les Enfants de Shiganshina', '🪽', ['eren', 'mikasa', 'armin'],
    'Partis de Shiganshina, ils ont fini par voir la mer.'),
  bond('quatrieme_section', 'La 4e Section', '🪚', ['denji', 'power_csm', 'aki_csm'],
    'Un homme-tronçonneuse, une démone du sang et leur colocataire désabusé.'),
];

export const BOND_BY_ID: Map<string, BondDef> = new Map(BONDS.map(b => [b.id, b]));

// Mémo : même principe que computeActiveSynergies (l'équipe change rarement,
// mais cette fonction est relue à chaque calcul de DPS).
let _bondCacheKey = '';
let _bondCacheVal: BondDef[] = [];

/** Liens dont tous les membres sont dans l'équipe. */
export function computeActiveBonds(equippedTeam: (string | null)[]): BondDef[] {
  const key = equippedTeam.join('|');
  if (key === _bondCacheKey) return _bondCacheVal;
  // `id` peut être une clé composite (perso::édition) : on compare les templateIds.
  const ids = new Set(equippedTeam.filter((k): k is string => !!k).map(k => parseInstanceKey(k).templateId));
  _bondCacheVal = BONDS.filter(b => b.members.every(m => ids.has(m)));
  _bondCacheKey = key;
  return _bondCacheVal;
}

/** Multiplicateur de DPS d'un perso : somme des bonus des liens actifs dont il fait partie. */
export function getBondDpsMult(templateId: string, activeBonds: readonly BondDef[]): number {
  let pct = 0;
  for (const b of activeBonds) if (b.members.includes(templateId)) pct += b.dpsBonus;
  return 1 + pct / 100;
}

/** Nombre de liens découverts qui existent ENCORE (même garde-fou que countSeenCharacters). */
export function countDiscoveredBonds(discoveredBonds: Record<string, true>): number {
  let n = 0;
  for (const id of Object.keys(discoveredBonds)) if (BOND_BY_ID.has(id)) n++;
  return n;
}
