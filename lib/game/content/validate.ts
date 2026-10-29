// Vérification complète d'un brouillon AVANT publication (configurateur) :
// contrairement à parseContent (forme seulement), elle connaît le contenu de
// base du code. Une erreur bloque la publication ; un avertissement non.
import type { ContentOverrides } from './schema';
import { ENEMIES_PER_PALIER } from './apply';

export interface BaseInfo {
  paliersCount: number;           // paliers définis dans le code
  characterIds: Set<string>;      // persos du code
  bannerIds: Set<string>;         // bannières du code
}

export interface ValidationResult { errors: string[]; warnings: string[] }

export function validateDraft(c: ContentOverrides, base: BaseInfo): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Paliers : les nouveaux suivent le dernier, sans trou, avec nom et univers.
  const newPaliers = Object.keys(c.paliers).map(Number).filter(id => id > base.paliersCount).sort((a, b) => a - b);
  newPaliers.forEach((id, i) => {
    const p = c.paliers[id];
    if (id !== base.paliersCount + 1 + i) errors.push(`Palier ${id} : il manque le palier ${base.paliersCount + 1 + i} avant lui.`);
    if (!p.name || !p.universe) errors.push(`Palier ${id} : nom et univers obligatoires.`);
    const enemies = c.enemies[id];
    if (!enemies || enemies.length !== ENEMIES_PER_PALIER) errors.push(`Palier ${id} : il faut ses ${ENEMIES_PER_PALIER} ennemis.`);
  });
  const lastPalier = base.paliersCount + newPaliers.length;

  for (const [key, list] of Object.entries(c.enemies)) {
    const id = Number(key);
    if (id < 1 || id > lastPalier) { errors.push(`Ennemis du palier ${id} : ce palier n'existe pas.`); continue; }
    if (list.length !== ENEMIES_PER_PALIER) errors.push(`Palier ${id} : ${list.length} ennemis au lieu de ${ENEMIES_PER_PALIER}.`);
    list.forEach((e, i) => {
      if (!e.name.trim()) errors.push(`Palier ${id}, ennemi ${i + 1} : nom manquant.`);
      if (!e.sprite) errors.push(`Palier ${id}, ennemi ${i + 1} : image manquante.`);
    });
    if (!list.some(e => e.isBoss) && list.length === ENEMIES_PER_PALIER) warnings.push(`Palier ${id} : aucun ennemi marqué boss (le 10e le sera par défaut).`);
  }

  // Persos : un nouveau perso doit être complet (sinon il serait ignoré au démarrage).
  const allCharacters = new Set([...base.characterIds, ...Object.keys(c.characters)]);
  for (const [id, ch] of Object.entries(c.characters)) {
    if (base.characterIds.has(id)) continue;
    const missing = [
      !ch.name && 'nom', !ch.rarity && 'rareté', ch.baseDps === undefined && 'DPS', !ch.universe && 'univers',
      !ch.gender && 'genre', !ch.forms?.[0]?.image && 'image de la première forme',
    ].filter(Boolean);
    if (missing.length) errors.push(`Perso « ${ch.name ?? id} » : ${missing.join(', ')} manquant(s).`);
  }

  // Bannières : persos existants, et au moins un perso pour une nouvelle bannière.
  for (const [id, b] of Object.entries(c.banners)) {
    const unknown = (b.characterIds ?? []).filter(x => !allCharacters.has(x));
    if (unknown.length) errors.push(`Bannière « ${b.title ?? id} » : perso(s) inconnu(s) ${unknown.join(', ')}.`);
    if (!base.bannerIds.has(id)) {
      if (!b.title) errors.push(`Bannière « ${id} » : titre manquant.`);
      if (!b.characterIds?.length) errors.push(`Bannière « ${b.title ?? id} » : aucun perso.`);
    }
    const lostFeatured = (b.featuredIds ?? []).filter(x => !allCharacters.has(x));
    if (lostFeatured.length) warnings.push(`Bannière « ${b.title ?? id} » : perso(s) vedette(s) inconnu(s) ignoré(s) : ${lostFeatured.join(', ')}.`);
  }

  return { errors, warnings };
}
