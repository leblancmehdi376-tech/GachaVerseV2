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

  return { errors, warnings };
}
