import type { CharacterTemplate } from '@/types/game';

// Les fichiers de public/sprites/new_cards_processed sont chargés via une
// URL fixe (basée sur le nom du perso, pas un hash de contenu) : sans ce
// paramètre, un navigateur/CDN qui a déjà mis une image en cache continue de
// la servir après un remplacement de fichier (recadrage, correction...), le
// nom ne changeant pas. Incrémenter cette version force tout le monde à
// retélécharger les visuels de carte après un remplacement d'assets — voir
// FRAMEWORK_ASSET_VERSION dans types/game.ts pour le même mécanisme côté
// cadres de rareté.
export const NEW_CARDS_ASSET_VERSION = 4;

// Convention de nommage des visuels de carte : "NomDuPerso_Synergie_EvoN"
// (Synergie = univers du perso, voir lib/game/synergies.ts) — remplace
// l'ancienne convention "{templateId}[_evoN]". N démarre à 0 pour la forme
// de base, même pour les persos sans évolution (toujours "Evo0").
function sanitizeForFilename(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-zA-Z0-9]+/g, ''); // enlève espaces/apostrophes/points/etc.
}

export function getCardFormCount(tpl: Pick<CharacterTemplate, 'forms'>): number {
  return tpl.forms && tpl.forms.length > 0 ? tpl.forms.length : 1;
}

export function getCardBaseName(tpl: Pick<CharacterTemplate, 'name' | 'universe'>, formIndex: number): string {
  const name = sanitizeForFilename(tpl.name);
  const synergie = sanitizeForFilename(tpl.universe ?? '');
  return `${name}_${synergie}_Evo${formIndex}`;
}
