// Vérification complète d'un brouillon AVANT publication (configurateur) :
// contrairement à parseContent (forme seulement), elle connaît le contenu de
// base du code. Une erreur bloque la publication ; un avertissement non.
import { RARITY_CONFIG, type Rarity } from '@/types/game';
import { ABILITIES, BASIC_ATTACK, abilityCount } from '@/lib/game/nakimeAbilities';
import type { ContentOverrides } from './schema';
import { ENEMIES_PER_PALIER } from './apply';

export interface BaseInfo {
  paliersCount: number;           // paliers définis dans le code
  characterIds: Set<string>;      // persos du code
  bannerIds: Set<string>;         // bannières du code
  codeBannerMemberIds?: Set<string>; // persos des bannières du code autres que la Vol.1
  characterRarities?: Map<string, Rarity>; // rareté des persos du code (kits du Château)
}

/** Problèmes d'un kit du Château de Nakime pour cette rareté (vide si tout va bien). */
export function kitProblems(moves: { name: string; ability: string }[], rarity: Rarity): string[] {
  const out: string[] = [];
  const n = abilityCount(rarity);
  if (moves.length !== n) out.push(`${moves.length} technique(s) au lieu de ${n} pour la rareté ${RARITY_CONFIG[rarity].label}`);
  moves.forEach((m, i) => {
    const def = ABILITIES[m.ability];
    if (!def || m.ability === BASIC_ATTACK || m.ability.startsWith('e_')) out.push(`mécanique « ${m.ability} » inconnue`);
    else if (!!def.ult !== (i === 2)) out.push(i === 2 ? 'la 3e technique doit être un ultime' : `« ${m.name} » ne peut pas être un ultime`);
  });
  if (new Set(moves.map(m => m.ability)).size !== moves.length) out.push('mécanique utilisée deux fois');
  return out;
}

export interface ValidationResult { errors: string[]; warnings: string[] }

// `live` : version en ligne, pour repérer ce qui a déjà été publié.
export function validateDraft(c: ContentOverrides, base: BaseInfo, live: ContentOverrides | null = null): ValidationResult {
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

  // Un perso ajouté puis publié a pu être obtenu par des joueurs : on ne le
  // supprime jamais (leurs sauvegardes y font référence), on le retire du gacha.
  for (const [id, ch] of Object.entries(live?.characters ?? {})) {
    if (!base.characterIds.has(id) && !c.characters[id]) {
      errors.push(`Perso « ${ch.name ?? id} » : déjà publié, des joueurs l'ont peut-être. Coche plutôt « Retiré du gacha ».`);
    }
  }
  for (const id of Object.keys(live?.paliers ?? {}).map(Number)) {
    if (id > base.paliersCount && !c.paliers[id]) warnings.push(`Palier ${id} : déjà publié. Les joueurs qui l'avaient atteint reverront le décor d'un palier précédent.`);
  }

  // Château de Nakime et ultime.
  for (const [id, ch] of Object.entries(c.characters)) {
    const rarity = ch.rarity ?? base.characterRarities?.get(id);
    if (ch.kit && rarity) for (const p of kitProblems(ch.kit.moves, rarity)) errors.push(`Perso « ${ch.name ?? id} », Château : ${p}.`);
    if (ch.ultimate?.from && !allCharacters.has(ch.ultimate.from)) errors.push(`Perso « ${ch.name ?? id} » : ultime repris d'un perso inconnu (${ch.ultimate.from}).`);
  }

  // Persos limités : sans bannière, ils ne seraient plus obtenables.
  const inSomeBanner = new Set([...(base.codeBannerMemberIds ?? []), ...Object.values(c.banners).flatMap(b => b.characterIds ?? [])]);
  for (const [id, ch] of Object.entries(c.characters)) {
    if (ch.bannerOnly && !ch.excludeFromGacha && !inSomeBanner.has(id)) {
      warnings.push(`Perso « ${ch.name ?? id} » : exclusif à ses bannières, mais dans aucune (introuvable au gacha).`);
    }
  }

  // Bannières : persos existants, et au moins un perso pour une nouvelle bannière.
  for (const [id, b] of Object.entries(c.banners)) {
    const unknown = (b.characterIds ?? []).filter(x => !allCharacters.has(x));
    if (unknown.length) errors.push(`Bannière « ${b.title ?? id} » : perso(s) inconnu(s) ${unknown.join(', ')}.`);
    if (!base.bannerIds.has(id)) {
      if (!b.title) errors.push(`Bannière « ${id} » : titre manquant.`);
      if (!b.characterIds?.length) errors.push(`Bannière « ${b.title ?? id} » : aucun perso.`);
    }
    if (b.startsAt && b.endsAt && b.endsAt <= b.startsAt) errors.push(`Bannière « ${b.title ?? id} » : la fin doit être après le début.`);
    if (b.rateUp && !(b.featuredIds?.length)) warnings.push(`Bannière « ${b.title ?? id} » : taux augmenté sans perso vedette (aucun effet).`);
    const lostFeatured = (b.featuredIds ?? []).filter(x => !allCharacters.has(x));
    if (lostFeatured.length) warnings.push(`Bannière « ${b.title ?? id} » : perso(s) vedette(s) inconnu(s) ignoré(s) : ${lostFeatured.join(', ')}.`);
  }

  return { errors, warnings };
}
