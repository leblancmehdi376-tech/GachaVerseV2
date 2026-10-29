import type { CharacterTemplate } from '@/types/game';
import { buildImageCandidates } from '@/lib/image-fallback';
import { resolveContentImage } from './content/images';

// Les fichiers de public/sprites/new_cards_processed sont chargés via une
// URL fixe (basée sur le nom du perso, pas un hash de contenu) : sans ce
// paramètre, un navigateur/CDN qui a déjà mis une image en cache continue de
// la servir après un remplacement de fichier (recadrage, correction...), le
// nom ne changeant pas. Incrémenter cette version force tout le monde à
// retélécharger les visuels de carte après un remplacement d'assets — voir
// FRAMEWORK_ASSET_VERSION dans types/game.ts pour le même mécanisme côté
// cadres de rareté.
export const NEW_CARDS_ASSET_VERSION = 8;

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

export function getCardBaseName(tpl: Pick<CharacterTemplate, 'name' | 'universe' | 'artName' | 'artUniverse'>, formIndex: number): string {
  // Nom/univers d'origine si le configurateur les a renommés (le fichier, lui, ne change pas).
  const name = sanitizeForFilename(tpl.artName ?? tpl.name);
  const synergie = sanitizeForFilename(tpl.artUniverse ?? tpl.universe ?? '');
  return `${name}_${synergie}_Evo${formIndex}`;
}

const cardFileCandidates = (tpl: Pick<CharacterTemplate, 'name' | 'universe' | 'artName' | 'artUniverse'>, formIndex: number) =>
  buildImageCandidates(`/sprites/new_cards_processed/${getCardBaseName(tpl, formIndex)}`).map(c => `${c}?v=${NEW_CARDS_ASSET_VERSION}`);

/**
 * Visuels à essayer, dans l'ordre, pour la forme `formIndex` d'un perso :
 * image du configurateur s'il y en a une, sinon le fichier du projet ; puis
 * la forme de base (visuel d'évolution pas encore dessiné). `formIndex` doit
 * déjà tenir compte de l'anti-spoil (getSafeFormIndex).
 */
export function getCardImageCandidates(tpl: Pick<CharacterTemplate, 'name' | 'universe' | 'artName' | 'artUniverse' | 'images'>, formIndex: number): string[] {
  const content = (i: number) => {
    const ref = tpl.images?.[i];
    const url = ref ? resolveContentImage(ref) : null;
    return url ? [url] : [];
  };
  return [
    ...content(formIndex),
    ...cardFileCandidates(tpl, formIndex),
    ...(formIndex > 0 ? [...content(0), ...cardFileCandidates(tpl, 0)] : []),
  ];
}
