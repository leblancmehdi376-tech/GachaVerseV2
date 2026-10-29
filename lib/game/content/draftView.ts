// Vue « telle que le jeu la verra » d'un brouillon du configurateur : contenu
// du code + modifications du brouillon. Réservé à la page admin (qui charge
// toujours les données du CODE, sans contenu en ligne appliqué).
import { PALIERS, type PalierConfig } from '@/lib/game/paliers';
import { CHARACTER_POOL, GACHA_EXCLUDED_IDS, getCharacterById } from '@/lib/game/characters';
import { GACHA_BANNERS } from '@/lib/game/gacha';
import type { Rarity } from '@/types/game';
import type { BannerInput, BannerThemeInput, ContentOverrides } from './schema';

// ── Paliers ────────────────────────────────────────────────────────────────

export type PalierForm = Omit<PalierConfig, 'id'>;

export const NEW_PALIER: PalierForm = {
  name: '', universe: '', arc: '', subtitle: '', bgGradient: 'linear-gradient(180deg,#0a0a14,#05050a)',
  accentColor: '#a855f7', bossTimerSeconds: 90, monstersPerPalier: 10,
};

export function effectivePalier(draft: ContentOverrides, id: number): PalierForm | null {
  const base = PALIERS[id - 1];
  const patch = draft.paliers[id];
  if (!base && !patch) return null;
  return { ...NEW_PALIER, ...(base ?? {}), ...(patch ?? {}) };
}

/** Nombre de paliers une fois le brouillon appliqué (les nouveaux se suivent). */
export function draftPaliersCount(draft: ContentOverrides): number {
  let n = PALIERS.length;
  while (draft.paliers[n + 1]) n++;
  return n;
}

// ── Persos ─────────────────────────────────────────────────────────────────

export interface CharacterRow {
  id: string;
  name: string;
  rarity: Rarity;
  universe: string;
  isNew: boolean;        // ajouté par le configurateur
  modified: boolean;     // présent dans le brouillon
  excluded: boolean;     // absent de tout le gacha
  bannerOnly: boolean;   // limité à ses bannières
  image?: string;        // content-img de la forme de base, si changée
}

export function draftCharacters(draft: ContentOverrides): CharacterRow[] {
  const rows: CharacterRow[] = CHARACTER_POOL.filter(t => !t.isHero).map(t => {
    const input = draft.characters[t.id];
    return {
      id: t.id, name: input?.name ?? t.name, rarity: input?.rarity ?? t.rarity, universe: input?.universe ?? t.universe ?? '',
      isNew: false, modified: !!input, excluded: GACHA_EXCLUDED_IDS.has(t.id) || !!input?.excludeFromGacha,
      bannerOnly: !!input?.bannerOnly, image: input?.forms?.[0]?.image,
    };
  });
  for (const [id, input] of Object.entries(draft.characters)) {
    if (getCharacterById(id)) continue;
    rows.push({
      id, name: input.name ?? id, rarity: input.rarity ?? 'C', universe: input.universe ?? '', isNew: true, modified: true,
      excluded: !!input.excludeFromGacha, bannerOnly: !!input.bannerOnly, image: input.forms?.[0]?.image,
    });
  }
  return rows;
}

const rowById = (draft: ContentOverrides) => new Map(draftCharacters(draft).map(r => [r.id, r]));

/** Le perso peut-il être tiré sur cette bannière ? (persos limités : pas sur la Vol.1) */
export function isTirableIn(row: CharacterRow | undefined, bannerId: string): boolean {
  return !!row && !row.excluded && (bannerId !== 'vol1' || !row.bannerOnly);
}

// ── Bannières ──────────────────────────────────────────────────────────────

export type BannerStatus = 'live' | 'scheduled' | 'ended' | 'hidden';

export interface EditableBanner {
  id: string;
  title: string;
  subtitle: string;
  theme: BannerThemeInput;
  isNew: boolean;
  hidden: boolean;
  startsAt?: number;
  endsAt?: number;
  rateUp: boolean;
  featuredIds: string[];
  inCode: boolean;       // vol1, vol2 : bannières du code (on peut les masquer, pas les supprimer)
  memberIds: string[];   // persos tirables sur cette bannière, brouillon compris
  lockedIds: string[];   // persos du code, qu'on ne peut pas retirer d'une bannière du code
}

export const DEFAULT_BANNER_THEME: BannerThemeInput = { accent: '#22d3ee', hi: '#a5f3fc', dark: '#04161c', deep: '#0e5466', glow: 'rgba(34,211,238,0.35)' };

/** Bannières telles que le jeu les verra, dans l'ordre des onglets. */
export function editableBanners(draft: ContentOverrides): EditableBanner[] {
  const rows = rowById(draft);
  const tirableFor = (bannerId: string) => [...rows.values()].filter(r => isTirableIn(r, bannerId)).map(r => r.id);
  const codeIndex = new Map(GACHA_BANNERS.map((b, i) => [b.id, i]));
  const fromCode = GACHA_BANNERS.map(b => {
    const input = draft.banners[b.id] ?? {};
    const base = b.pool.map(t => t.id).filter(id => !rows.get(id)?.excluded);
    const extra = (input.characterIds ?? []).filter(id => isTirableIn(rows.get(id), b.id) && !base.includes(id));
    return {
      id: b.id, title: input.title ?? b.title, subtitle: input.subtitle ?? b.subtitle, theme: input.theme ?? b.theme,
      isNew: input.isNew ?? !!b.isNew, hidden: input.hidden ?? !!b.hidden, startsAt: input.startsAt, endsAt: input.endsAt,
      rateUp: input.rateUp ?? false, featuredIds: input.featuredIds ?? b.featuredIds, inCode: true,
      memberIds: b.id === 'vol1' ? tirableFor('vol1') : [...base, ...extra],
      lockedIds: b.id === 'vol1' ? tirableFor('vol1') : base,
      order: input.order,
    };
  });
  const added = Object.entries(draft.banners).filter(([id]) => !codeIndex.has(id)).map(([id, input]) => ({
    id, title: input.title ?? id, subtitle: input.subtitle ?? '', theme: input.theme ?? DEFAULT_BANNER_THEME,
    isNew: !!input.isNew, hidden: !!input.hidden, startsAt: input.startsAt, endsAt: input.endsAt, rateUp: !!input.rateUp,
    featuredIds: input.featuredIds ?? [], inCode: false,
    memberIds: (input.characterIds ?? []).filter(x => isTirableIn(rows.get(x), id)), lockedIds: [] as string[],
    order: input.order,
  }));
  const rank = (b: { id: string; order?: number }) => b.order ?? codeIndex.get(b.id) ?? 1000;
  return [...fromCode, ...added].sort((a, b) => rank(a) - rank(b)).map(({ order: _order, ...b }) => b);
}

export function bannerStatus(b: Pick<EditableBanner, 'hidden' | 'startsAt' | 'endsAt'>, now: number): BannerStatus {
  if (b.hidden) return 'hidden';
  if (b.startsAt && now < b.startsAt) return 'scheduled';
  if (b.endsAt && now >= b.endsAt) return 'ended';
  return 'live';
}

/** Ajoute ou retire un perso d'une bannière (sans effet sur la Vol.1, qui contient tout). */
export function setBannerMember(draft: ContentOverrides, bannerId: string, charId: string, member: boolean): ContentOverrides {
  if (bannerId === 'vol1') return draft;
  const codePool = GACHA_BANNERS.find(b => b.id === bannerId)?.pool.map(t => t.id) ?? [];
  if (codePool.includes(charId)) return draft; // déjà dans la bannière du code
  const input: BannerInput = { ...(draft.banners[bannerId] ?? {}) };
  const before = input.characterIds ?? [];
  if (member === before.includes(charId)) return draft;
  input.characterIds = member ? [...before, charId] : before.filter(id => id !== charId);
  if (!member) input.featuredIds = input.featuredIds?.filter(f => f !== charId);
  return { ...draft, banners: { ...draft.banners, [bannerId]: input } };
}

/**
 * Réécrit `order` de toutes les bannières selon la liste d'ids donnée. Revenu
 * à l'ordre par défaut (code, puis bannières ajoutées), plus aucun `order` :
 * une bannière du code n'apparaît plus « modifiée » pour rien.
 */
export function reorderBanners(draft: ContentOverrides, orderedIds: string[]): ContentOverrides {
  const codeIds = new Set(GACHA_BANNERS.map(b => b.id));
  const defaultIds = [...codeIds, ...Object.keys(draft.banners).filter(id => !codeIds.has(id))];
  const banners = { ...draft.banners };
  if (orderedIds.length === defaultIds.length && orderedIds.every((id, i) => id === defaultIds[i])) {
    for (const id of orderedIds) {
      if (!banners[id]) continue;
      const { order: _order, ...rest } = banners[id];
      if (Object.keys(rest).length || !codeIds.has(id)) banners[id] = rest; else delete banners[id];
    }
  } else {
    orderedIds.forEach((id, i) => { banners[id] = { ...(banners[id] ?? {}), order: i }; });
  }
  return { ...draft, banners };
}

// ── Changements avant publication ──────────────────────────────────────────

export interface ContentChange {
  kind: 'added' | 'modified' | 'removed';
  category: 'Palier' | 'Ennemis' | 'Perso' | 'Bannière';
  label: string;
}

function diffRecord<T>(
  live: Record<string, T>, draft: Record<string, T>, category: ContentChange['category'],
  label: (id: string, v: T) => string, isNewEntity: (id: string) => boolean,
): ContentChange[] {
  const out: ContentChange[] = [];
  for (const id of new Set([...Object.keys(live), ...Object.keys(draft)])) {
    const a = live[id];
    const b = draft[id];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const kind = !a ? (isNewEntity(id) ? 'added' : 'modified') : !b ? (isNewEntity(id) ? 'removed' : 'modified') : 'modified';
    out.push({ kind, category, label: label(id, (b ?? a)!) });
  }
  return out;
}

/**
 * Ce que la publication changera par rapport à la version en ligne. « Retiré »
 * ne concerne que ce que le configurateur avait AJOUTÉ (palier, perso,
 * bannière) ; un élément du code qui perd ses modifications est « modifié »
 * (il revient à ses valeurs d'origine).
 */
export function diffContent(live: ContentOverrides | null, draft: ContentOverrides): ContentChange[] {
  const l = live ?? { paliers: {}, enemies: {}, characters: {}, banners: {} } as unknown as ContentOverrides;
  return [
    ...diffRecord(l.paliers, draft.paliers, 'Palier', (id, p) => `#${id} ${p.name ?? PALIERS[Number(id) - 1]?.name ?? ''}`.trim(), id => Number(id) > PALIERS.length),
    ...diffRecord(l.enemies, draft.enemies, 'Ennemis', id => `du palier ${id}`, () => false),
    ...diffRecord(l.characters, draft.characters, 'Perso', (id, c) => c.name ?? getCharacterById(id)?.name ?? id, id => !getCharacterById(id)),
    ...diffRecord(l.banners, draft.banners, 'Bannière', (id, b) => b.title ?? GACHA_BANNERS.find(x => x.id === id)?.title ?? id, id => !GACHA_BANNERS.some(x => x.id === id)),
  ];
}
