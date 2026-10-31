import { CharacterTemplate, Rarity, RARITY_ORDER_ASC } from '@/types/game';
import { BANNER_POOL, BANNER_POOL_VOL2, GACHA_EXCLUDED_IDS, getCharacterById } from './characters';
import { applyBannerContent } from './content/apply';
import { getLoadedContent } from './content/runtime';

export const GACHA_COSTS = { single: 10, multi10: 95, multi100: 900 };

// ── Bannières ─────────────────────────────────────────────────────────────
// Même coût et mêmes taux par rareté partout : seule la liste des
// personnages tirables change. Vol.1 couvre tout le roster (nouveaux
// personnages compris), Vol.2 uniquement les personnages de la Bannière Vol.2.
// La bannière vedette reprend le pool de la Vol.1 avec un univers mis en
// avant chaque jour (voir lib/game/featuredBanner.ts).
// 'vol1' | 'vol2' | 'featured', plus les bannières ajoutées depuis le configurateur (vol3...).
export type BannerId = string;

// Couleurs propres à chaque bannière (onglet, visuel, bandeau, boutons).
export interface BannerTheme {
  accent:  string; // couleur principale (bordures, titres)
  hi:      string; // variante claire (sous-titres, coûts)
  dark:    string; // fond le plus sombre (bandeau, bas du dégradé)
  deep:    string; // fond saturé (dégradés des boutons et de l'onglet actif)
  glow:    string; // lueur rgba
}

export interface GachaBanner {
  id:       BannerId;
  title:    string;
  subtitle: string;
  pool:     CharacterTemplate[];
  // Personnages mis en avant sur le visuel (collage de leurs cartes) : choisis
  // parmi les 4 meilleures raretés (T, P, CO, S) et les illustrations nettes.
  featuredIds: string[];
  // Forme affichée pour certains persos vedettes (par défaut Evo0), quand une
  // évolution a une illustration plus nette que la forme de base.
  featuredForms?: Partial<Record<string, number>>;
  // Affiche un badge "NEW" sur l'onglet de la bannière.
  isNew?: boolean;
  // Retirée du Gacha depuis le configurateur (sans rien supprimer).
  hidden?: boolean;
  // Bannière temporaire (configurateur) : visible de startsAt à endsAt (ms).
  startsAt?: number;
  endsAt?:   number;
  // Persos vedettes ×FEATURED_RATE_UP à rareté égale (configurateur).
  rateUp?:   boolean;
  order?:    number;
  theme:  BannerTheme;
}

export const GACHA_BANNERS: GachaBanner[] = [
  {
    id: 'vol1', title: 'GACHA VERSE VOL.1', subtitle: 'Tous les personnages', pool: BANNER_POOL,
    featuredIds: ['qin_shi_huang', 'goku', 'gilgamesh', 'rayquaza', 'luffy', 'limule'],
    featuredForms: { limule: 2 },
    theme: { accent: '#a855f7', hi: '#d8b4fe', dark: '#12071f', deep: '#4c1d95', glow: 'rgba(168,85,247,0.35)' },
  },
  {
    id: 'vol2', title: 'GACHA VERSE VOL.2', subtitle: 'Nouveaux personnages uniquement', pool: BANNER_POOL_VOL2,
    isNew: true,
    featuredIds: ['frieren', 'ryomen_sukuna', 'chiaki_nanami', 'enjin', 'luminus_valentine', 'gohan'],
    // Pourpre : violet tirant sur le rouge, pour bien se distinguer du Vol.1.
    theme: { accent: '#d9468f', hi: '#f9a8d4', dark: '#1a0512', deep: '#6b0f45', glow: 'rgba(217,70,143,0.35)' },
  },
];

// Bannières modifiées ou ajoutées depuis le configurateur (contenu en ligne).
// Les persos limités (BANNER_ONLY_IDS) y sont admis : c'est justement leur place.
applyBannerContent(GACHA_BANNERS, getCharacterById, t => !t.isHero && !GACHA_EXCLUDED_IDS.has(t.id), getLoadedContent());

// Une bannière est tirable si elle n'est pas masquée et qu'on est dans sa
// période (bannière temporaire). La Bannière Vedette l'est toujours.
export function isBannerActive(b: Pick<GachaBanner, 'hidden' | 'startsAt' | 'endsAt'>, now: number): boolean {
  return !b.hidden && (!b.startsAt || now >= b.startsAt) && (!b.endsAt || now < b.endsAt);
}

export function getActiveBanners(now: number): GachaBanner[] {
  return GACHA_BANNERS.filter(b => isBannerActive(b, now));
}

export function canPullOnBanner(id: BannerId, now: number): boolean {
  if (id === 'featured') return true;
  const b = GACHA_BANNERS.find(x => x.id === id);
  return !!b && isBannerActive(b, now);
}

// Partie fixe de la bannière vedette : sous-titre et cartes vedettes
// dépendent du jour (voir getFeaturedBanner).
export const FEATURED_BANNER_BASE: GachaBanner = {
  id: 'featured', title: 'BANNIÈRE VEDETTE', subtitle: '', pool: BANNER_POOL, featuredIds: [],
  isNew: true,
  // Or : se distingue du violet (Vol.1) et du pourpre (Vol.2).
  theme: { accent: '#f59e0b', hi: '#fcd34d', dark: '#1a1003', deep: '#7c4a03', glow: 'rgba(245,158,11,0.35)' },
};

// À rareté égale, un perso de l'univers vedette pèse ce poids (1 pour les autres).
export const FEATURED_RATE_UP = 3;

export const DEFAULT_BANNER_ID: BannerId = 'vol1';

export function getBanner(id: BannerId): GachaBanner {
  if (id === 'featured') return FEATURED_BANNER_BASE;
  return GACHA_BANNERS.find(b => b.id === id) ?? GACHA_BANNERS[0];
}

// ── Courbes de taux (déblocage progressif par palier) ─────────────────────
// Chaque rareté n'est tirable qu'à partir du palier `unlockPalier` (cf. tableau
// de déblocage). En dessous, son taux est nul et le budget est reporté sur les
// raretés déjà débloquées. Une fois débloquée, son taux progresse linéairement
// entre rateAtUnlock et rateAtMax jusqu'au palier 40.
// rateAtUnlock : poids brut au palier de déblocage (renormalisé avec les autres
//                raretés débloquées pour que le total fasse 100 %)
// rateAtMax    : taux (%) exact au palier 40 — la somme des rateAtMax vaut 100

export const RARITY_GATES: Record<Rarity, {
  unlockPalier: number;
  rateAtUnlock: number;
  rateAtMax:    number;
}> = {
  C:  { unlockPalier: 1,  rateAtUnlock: 123.2,   rateAtMax: 36.9444 },
  U:  { unlockPalier: 3,  rateAtUnlock:   6.16,  rateAtMax: 24.6296 },
  R:  { unlockPalier: 5,  rateAtUnlock:   2.464, rateAtMax: 18.4723 },
  E:  { unlockPalier: 7,  rateAtUnlock:   0.616, rateAtMax: 12.3148 },
  L:  { unlockPalier: 9,  rateAtUnlock:   0.1848,  rateAtMax: 4.9285 },
  M:  { unlockPalier: 11, rateAtUnlock:   0.037,   rateAtMax: 1.8482 },
  S:  { unlockPalier: 13, rateAtUnlock:   0.0074,  rateAtMax: 0.6161 },
  CO: { unlockPalier: 15, rateAtUnlock:   0.00265, rateAtMax: 0.1761 },
  P:  { unlockPalier: 17, rateAtUnlock:   0.00072, rateAtMax: 0.0600 },
  T:  { unlockPalier: 19, rateAtUnlock:   0.00021, rateAtMax: 0.0100 },
};

const MAX_PALIER = 40;
const RARITY_ORDER: Rarity[] = ['T','P','CO','S','M','L','E','R','U','C'];

/**
 * Calcule les taux dynamiques normalisés selon le palier max atteint.
 * - Retourne uniquement les raretés débloquées.
 * - Les taux progressent linéairement entre rateAtUnlock et rateAtMax.
 * - La somme est toujours normalisée à exactement 100%.
 * - Avec `bannerId`, les raretés sans aucun personnage dans cette bannière
 *   sont exclues avant normalisation (leur part est répartie sur les autres),
 *   pour que les taux affichés restent exactement ceux du tirage.
 */
export function getDynamicRates(maxPalier: number, bannerId?: BannerId): Partial<Record<Rarity, number>> {
  // Passé le palier 40 (prestige), les taux ne doivent plus continuer à
  // extrapoler : T est déjà à son taux max à ce stade.
  const clampedMax = Math.min(maxPalier, MAX_PALIER);
  const bannerRarities = bannerId ? new Set(getBanner(bannerId).pool.map(c => c.rarity)) : null;
  const raw: Partial<Record<Rarity, number>> = {};
  let total = 0;

  for (const r of RARITY_ORDER) {
    const gate = RARITY_GATES[r];
    if (clampedMax < gate.unlockPalier) continue;
    if (bannerRarities && !bannerRarities.has(r)) continue;

    // Interpolation linéaire entre unlock et max
    const range = MAX_PALIER - gate.unlockPalier;
    const progress = range <= 0 ? 1 : (clampedMax - gate.unlockPalier) / range;
    const rate = gate.rateAtUnlock + (gate.rateAtMax - gate.rateAtUnlock) * progress;

    raw[r] = Math.max(0, rate);
    total += raw[r]!;
  }

  // Normalisation à 100%
  if (total === 0) return { C: 100 };
  const normalized: Partial<Record<Rarity, number>> = {};
  for (const [r, v] of Object.entries(raw) as [Rarity, number][]) {
    // 6 décimales : l'affichage descend à 5 décimales pour les taux < 0,01 %.
    normalized[r] = parseFloat(((v / total) * 100).toFixed(6));
  }
  return normalized;
}

export function rollRarity(maxPalier = 1, bannerId?: BannerId): Rarity {
  const rates = getDynamicRates(maxPalier, bannerId);
  const rand = Math.random() * 100;
  let cum = 0;
  let last: Rarity = 'C';
  for (const r of RARITY_ORDER) {
    const rate = rates[r] ?? 0;
    if (rate <= 0) continue; // rareté verrouillée ou absente : jamais tirée
    cum += rate;
    last = r;
    if (rand < cum) return r;
  }
  // Arrondis : la somme peut être très légèrement < 100.
  return last;
}

/**
 * Tire un personnage. Avec `rateUpUniverse` (bannière vedette), la rareté est
 * tirée normalement, puis les persos de cet univers pèsent FEATURED_RATE_UP
 * fois plus que les autres au sein de cette rareté : les taux par rareté
 * affichés restent exacts.
 */
export function rollCharacter(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID, rateUpUniverse?: string): string {
  return pickCharacterOfRarity(bannerId, rollRarity(maxPalier, bannerId), rateUpUniverse);
}

// Choisit un perso de la rareté donnée dans la bannière (avec le taux augmenté
// des vedettes / de l'univers vedette s'il y en a un).
function pickCharacterOfRarity(bannerId: BannerId, rarity: Rarity, rateUpUniverse?: string): string {
  const banner = getBanner(bannerId);
  const bannerPool = banner.pool;
  const pool   = bannerPool.filter(c => c.rarity === rarity);
  // Ne peut arriver que si aucune rareté débloquée n'existe dans la bannière.
  const source = pool.length > 0 ? pool : bannerPool;
  // Bannière à taux augmenté (configurateur) : ses persos vedettes pèsent plus.
  const rateUpIds = banner.rateUp && banner.featuredIds.length ? new Set(banner.featuredIds) : null;
  if (!rateUpUniverse && !rateUpIds) return source[Math.floor(Math.random() * source.length)].id;
  const weight = (c: CharacterTemplate) => (c.universe === rateUpUniverse || rateUpIds?.has(c.id) ? FEATURED_RATE_UP : 1);
  let r = Math.random() * source.reduce((sum, c) => sum + weight(c), 0);
  for (const c of source) {
    r -= weight(c);
    if (r < 0) return c.id;
  }
  return source[source.length - 1].id;
}

/** Part (0 à 1) des persos de `rateUpUniverse` parmi les tirages d'une rareté. */
export function getRateUpShare(rarity: Rarity, rateUpUniverse: string, bannerId: BannerId = 'featured'): number {
  const pool = getBanner(bannerId).pool.filter(c => c.rarity === rarity);
  const featured = pool.filter(c => c.universe === rateUpUniverse).length;
  const total = pool.length + featured * (FEATURED_RATE_UP - 1);
  return total > 0 ? (featured * FEATURED_RATE_UP) / total : 0;
}

/**
 * Tire un perso de rareté `minRarity` ou mieux (cartes garanties des boosters
 * du Plinko), avec les mêmes proportions entre ces raretés qu'une invocation
 * normale. Si aucune n'est encore débloquée à ce palier, la carte est de la
 * meilleure rareté débloquée : la progression par palier est respectée.
 */
export function rollCharacterAtLeast(maxPalier: number, minRarity: Rarity, bannerId: BannerId = DEFAULT_BANNER_ID): string {
  const rates = getDynamicRates(maxPalier, bannerId);
  const minIndex = RARITY_ORDER_ASC.indexOf(minRarity);
  const unlocked = RARITY_ORDER.filter(r => (rates[r] ?? 0) > 0);
  const eligible = unlocked.filter(r => RARITY_ORDER_ASC.indexOf(r) >= minIndex);
  if (eligible.length === 0) return pickCharacterOfRarity(bannerId, unlocked[0] ?? 'C');
  let rand = Math.random() * eligible.reduce((sum, r) => sum + rates[r]!, 0);
  for (const r of eligible) {
    rand -= rates[r]!;
    if (rand < 0) return pickCharacterOfRarity(bannerId, r);
  }
  return pickCharacterOfRarity(bannerId, eligible[eligible.length - 1]);
}

export function rollMulti(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID, rateUpUniverse?: string): string[] {
  return Array.from({ length: 10 }, () => rollCharacter(maxPalier, bannerId, rateUpUniverse));
}

export function rollMulti100(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID, rateUpUniverse?: string): string[] {
  return Array.from({ length: 100 }, () => rollCharacter(maxPalier, bannerId, rateUpUniverse));
}

