import type { CharacterTemplate } from '@/types/game';

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
