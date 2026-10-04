import { CharacterTemplate, Rarity } from '@/types/game';
import { BANNER_POOL, BANNER_POOL_VOL2 } from './characters';

export const GACHA_COSTS = { single: 10, multi10: 95, multi100: 900 };

// ── Bannières ─────────────────────────────────────────────────────────────
// Même coût et mêmes taux par rareté partout : seule la liste des
// personnages tirables change. Vol.1 couvre tout le roster (nouveaux
// personnages compris), Vol.2 uniquement les personnages de la Bannière Vol.2.
export type BannerId = 'vol1' | 'vol2';

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

export const DEFAULT_BANNER_ID: BannerId = 'vol1';

export function getBanner(id: BannerId): GachaBanner {
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

export function rollCharacter(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID): string {
  const bannerPool = getBanner(bannerId).pool;
  const rarity = rollRarity(maxPalier, bannerId);
  const pool   = bannerPool.filter(c => c.rarity === rarity);
  // Ne peut arriver que si aucune rareté débloquée n'existe dans la bannière.
  const source = pool.length > 0 ? pool : bannerPool;
  return source[Math.floor(Math.random() * source.length)].id;
}

export function rollMulti(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID): string[] {
  return Array.from({ length: 10 }, () => rollCharacter(maxPalier, bannerId));
}

export function rollMulti100(maxPalier = 1, bannerId: BannerId = DEFAULT_BANNER_ID): string[] {
  return Array.from({ length: 100 }, () => rollCharacter(maxPalier, bannerId));
}

