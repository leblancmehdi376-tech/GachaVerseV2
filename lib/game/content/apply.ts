// Application du contenu en ligne aux tables de base du code. Appelé par
// chaque fichier de données au moment où il est évalué (voir runtime.ts),
// donc AVANT que tout ce qui en dérive (totaux du Compadex, succès, pools des
// bannières...) ne soit calculé. Imports de TYPES uniquement : ces fonctions
// modifient les tables qu'on leur passe, en place.
//
// Règles de sûreté : une entrée incohérente est ignorée (avec un
// avertissement), jamais appliquée à moitié ; aucun perso, palier ou ennemi du
// code n'est jamais supprimé (des sauvegardes y font référence).
import type { CharacterTemplate, EvoForm } from '@/types/game';
import type { PalierConfig } from '@/lib/game/paliers';
import type { EnemyDef } from '@/lib/game/enemies';
import type { Gender } from '@/lib/game/characterGenders';
import type { GachaBanner } from '@/lib/game/gacha';
import type { CharacterKit } from '@/lib/game/nakimeKits';
import type { UltimateDef } from '@/lib/game/ultimates';
import type { ContentOverrides, CharacterInput } from './schema';

const DEFAULT_PALIER: Omit<PalierConfig, 'id' | 'name' | 'universe' | 'arc' | 'subtitle'> = {
  bgGradient: 'linear-gradient(180deg,#0a0a14,#05050a)', accentColor: '#a855f7', bossTimerSeconds: 90, monstersPerPalier: 10,
};

export const ENEMIES_PER_PALIER = 10;

function warn(msg: string) {
  if (typeof console !== 'undefined') console.warn(`[Contenu] ${msg}`);
}

const sortedNumericKeys = (o: Record<string, unknown>) => Object.keys(o).map(Number).sort((a, b) => a - b);

export function applyPalierContent(paliers: PalierConfig[], c: ContentOverrides | null): void {
  if (!c) return;
  for (const id of sortedNumericKeys(c.paliers)) {
    const patch = c.paliers[id];
    if (id >= 1 && id <= paliers.length) {
      Object.assign(paliers[id - 1], patch);
    } else if (id === paliers.length + 1 && patch.name && patch.universe) {
      // Nouveau palier : toujours à la suite du dernier, jamais de trou.
      paliers.push({ ...DEFAULT_PALIER, arc: patch.name, subtitle: '', ...patch, id, name: patch.name, universe: patch.universe });
    } else {
      warn(`palier ${id} ignoré (doit suivre le palier ${paliers.length}, avec un nom et un univers)`);
    }
  }
}

export function applyEnemyContent(table: Record<number, EnemyDef[]>, paliersCount: number, c: ContentOverrides | null): void {
  if (!c) return;
  for (const id of sortedNumericKeys(c.enemies)) {
    const list = c.enemies[id];
    if (id < 1 || id > paliersCount || list.length !== ENEMIES_PER_PALIER) {
      warn(`ennemis du palier ${id} ignorés (il en faut ${ENEMIES_PER_PALIER}, sur un palier existant)`);
      continue;
    }
    table[id] = list.map(e => ({ name: e.name, sprite: e.sprite, hpMult: e.hpMult, isBoss: e.isBoss }));
  }
}

function contentForms(input: CharacterInput, base: EvoForm[] | undefined, id: string): EvoForm[] | undefined {
  if (!input.forms) return base;
  // Formes du code conservées (objets requis, description...), seuls nom et
  // image changent ; les formes en plus sont ajoutées à la suite.
  return input.forms.map((f, i) => ({
    ...(base?.[i] ?? { formId: `${id}_evo${i}`, description: f.name }),
    name: f.name,
    dpsFormMult: i + 1,
  }));
}

export function applyCharacterContent(
  pool: CharacterTemplate[],
  excludedFromGacha: Set<string>,
  bannerOnly: Set<string>,
  c: ContentOverrides | null,
): void {
  if (!c) return;
  const byId = new Map(pool.map(t => [t.id, t]));
  for (const [id, input] of Object.entries(c.characters)) {
    const images = input.forms?.map(f => f.image);
    const existing = byId.get(id);
    if (existing) {
      // Les fichiers de cartes sont nommés d'après le nom et l'univers du code :
      // on les garde de côté avant un éventuel renommage.
      if (input.name && input.name !== existing.name) existing.artName ??= existing.name;
      if (input.universe && input.universe !== existing.universe) existing.artUniverse ??= existing.universe;
      Object.assign(existing, {
        ...(input.name && { name: input.name }),
        ...(input.rarity && { rarity: input.rarity }),
        ...(input.baseDps !== undefined && { baseDps: input.baseDps }),
        ...(input.universe && { universe: input.universe }),
        ...(input.description && { description: input.description }),
        ...(input.forms && { forms: contentForms(input, existing.forms, id) }),
        ...(images?.some(Boolean) && { images }),
      });
    } else {
      if (!input.name || !input.rarity || input.baseDps === undefined || !input.universe || !images?.[0]) {
        warn(`nouveau perso « ${id} » ignoré (nom, rareté, DPS, univers et image obligatoires)`);
        continue;
      }
      const tpl: CharacterTemplate = {
        id, name: input.name, rarity: input.rarity, baseDps: input.baseDps, universe: input.universe,
        description: input.description ?? input.name,
        forms: input.forms && input.forms.length > 1 ? contentForms(input, undefined, id) : undefined,
        images,
      };
      pool.push(tpl);
      byId.set(id, tpl);
    }
    if (input.excludeFromGacha) excludedFromGacha.add(id);
    if (input.bannerOnly) bannerOnly.add(id);
  }
}

// Techniques du Château de Nakime (la cohérence avec la rareté est vérifiée
// avant publication, voir validate.ts).
export function applyKitContent(kits: Map<string, CharacterKit>, c: ContentOverrides | null): void {
  if (!c) return;
  for (const [id, input] of Object.entries(c.characters)) {
    if (input.kit) kits.set(id, { role: input.kit.role, moves: input.kit.moves.map(m => ({ ...m })) });
  }
}

// Ultime en combat : nom choisi, puissance reprise d'un autre perso (ou de la
// rareté via `fallback`). Doit tourner une fois ULTIMATE_DEFS et le barème
// par rareté définis.
export function applyUltimateContent(
  defs: Record<string, UltimateDef>,
  fallback: (id: string) => UltimateDef | undefined,
  c: ContentOverrides | null,
): void {
  if (!c) return;
  for (const [id, input] of Object.entries(c.characters)) {
    if (!input.ultimate) continue;
    const source = (input.ultimate.from && defs[input.ultimate.from]) || defs[id] || fallback(id);
    if (!source) { warn(`ultime de « ${id} » ignoré (perso introuvable)`); continue; }
    defs[id] = { ...source, effect: { ...source.effect }, templateId: id, name: input.ultimate.name };
  }
}

export function applyGenderContent(genders: Record<string, Gender>, c: ContentOverrides | null): void {
  if (!c) return;
  for (const [id, input] of Object.entries(c.characters)) if (input.gender) genders[id] = input.gender;
}

// `banners` contient déjà vol1 et vol2 (pools du code). Les pools des
// bannières ajoutées sont construits ici à partir de `characterIds`. L'ordre
// des onglets suit `order` (bannières du code d'abord, à défaut).
export function applyBannerContent(
  banners: GachaBanner[],
  getById: (id: string) => CharacterTemplate | undefined,
  isTirable: (t: CharacterTemplate) => boolean,
  c: ContentOverrides | null,
): void {
  if (!c) return;
  const resolve = (ids: string[] | undefined) =>
    (ids ?? []).map(getById).filter((t): t is CharacterTemplate => !!t && isTirable(t));
  const codeIndex = new Map(banners.map((b, i) => [b.id, i]));
  for (const [id, input] of Object.entries(c.banners)) {
    const existing = banners.find(b => b.id === id);
    const meta = {
      ...(input.title && { title: input.title }),
      ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
      ...(input.featuredIds && { featuredIds: input.featuredIds.filter(f => getById(f)) }),
      ...(input.theme && { theme: input.theme }),
      ...(input.isNew !== undefined && { isNew: input.isNew }),
      ...(input.hidden !== undefined && { hidden: input.hidden }),
      ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
      ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
      ...(input.rateUp !== undefined && { rateUp: input.rateUp }),
      ...(input.order !== undefined && { order: input.order }),
    };
    if (existing) {
      Object.assign(existing, meta);
      // vol1 couvre déjà tout le roster tirable ; les autres reçoivent les ajouts.
      if (id !== 'vol1' && input.characterIds) {
        const have = new Set(existing.pool.map(t => t.id));
        existing.pool = [...existing.pool, ...resolve(input.characterIds).filter(t => !have.has(t.id))];
      }
    } else {
      const pool = resolve(input.characterIds);
      if (!input.title || pool.length === 0) {
        warn(`bannière « ${id} » ignorée (titre et au moins un perso tirable obligatoires)`);
        continue;
      }
      banners.push({
        id, title: input.title, subtitle: input.subtitle ?? '', pool,
        featuredIds: (input.featuredIds ?? []).filter(f => getById(f)),
        theme: input.theme ?? { accent: '#22d3ee', hi: '#a5f3fc', dark: '#04161c', deep: '#0e5466', glow: 'rgba(34,211,238,0.35)' },
        ...meta,
      });
    }
  }
  // Tri stable : `order` choisi dans le configurateur, sinon position du code, puis ajout.
  const rank = (b: GachaBanner) => b.order ?? codeIndex.get(b.id) ?? 1000;
  banners.sort((a, b) => rank(a) - rank(b));
}
