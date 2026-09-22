// Aura visuelle de l'avatar joueur (header + profil) — dérivée du palier max
// JAMAIS atteint (progression pérenne, contrairement à `palier` qui repart de
// 1 après un Prestige) et du nombre de succès débloqués. Ce système n'existe
// nulle part ailleurs dans le jeu (les paliers ont chacun leur propre
// accentColor individuelle, voir lib/game/paliers.ts) — les seuils ci-dessous
// sont donc propres à l'avatar.

export interface AvatarAuraTier {
  name: string;
  borderColor: string;
  glowColor: string;
  glowSize: number;
}

const DEFAULT_TIER: AvatarAuraTier = {
  name: 'Débutant', borderColor: 'var(--purple-dim)', glowColor: 'rgba(109,40,217,0.35)', glowSize: 8,
};

// Du plus haut seuil au plus bas — le premier qui matche l'emporte.
const PALIER_AURA_TIERS: { minMaxPalier: number; tier: AvatarAuraTier }[] = [
  { minMaxPalier: 100, tier: { name: 'Prisme',  borderColor: '#f0abfc', glowColor: 'rgba(240,171,252,0.6)',  glowSize: 22 } },
  { minMaxPalier: 60,  tier: { name: 'Diamant', borderColor: '#67e8f9', glowColor: 'rgba(103,232,249,0.55)', glowSize: 19 } },
  { minMaxPalier: 40,  tier: { name: 'Or',      borderColor: '#facc15', glowColor: 'rgba(250,204,21,0.5)',   glowSize: 16 } },
  { minMaxPalier: 20,  tier: { name: 'Argent',  borderColor: '#cbd5e1', glowColor: 'rgba(203,213,225,0.45)', glowSize: 13 } },
  { minMaxPalier: 10,  tier: { name: 'Bronze',  borderColor: '#d99a5b', glowColor: 'rgba(217,154,91,0.4)',   glowSize: 10 } },
];

export function getPalierAuraTier(maxPalierReached: number): AvatarAuraTier {
  for (const { minMaxPalier, tier } of PALIER_AURA_TIERS) {
    if (maxPalierReached >= minMaxPalier) return tier;
  }
  return DEFAULT_TIER;
}

// `glowSize` ci-dessus est calibré pour un avatar d'environ 44px (onglet
// Options/header) — utilisé tel quel sur un avatar plus petit (32px dans le
// classement), le flou devient disproportionné par rapport à la boîte et se
// lit comme un halo carré et envahissant plutôt qu'une lueur. On le met donc
// à l'échelle de la taille réelle de l'avatar affiché.
const GLOW_REFERENCE_SIZE = 44;

export function getAvatarGlowPx(tier: AvatarAuraTier, avatarSize: number): number {
  return Math.max(4, Math.round(tier.glowSize * (avatarSize / GLOW_REFERENCE_SIZE)));
}

// Au-delà de ce nombre de succès débloqués, l'aura pulse doucement (clin
// d'œil "joueur accompli") — réutilise l'animation rarityPulse déjà définie
// dans globals.css (pulse générique de luminosité, sans couleur à dupliquer).
export const AVATAR_PULSE_ACHIEVEMENT_THRESHOLD = 40;

export function hasAvatarPulse(unlockedAchievementCount: number): boolean {
  return unlockedAchievementCount >= AVATAR_PULSE_ACHIEVEMENT_THRESHOLD;
}
