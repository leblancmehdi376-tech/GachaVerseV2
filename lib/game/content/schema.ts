// Contenu en ligne (configurateur de la page admin) — format et vérification.
//
// Le contenu de base (paliers, ennemis, personnages, bannières) reste écrit
// dans le code. Firestore (`content/live`) ne stocke que les AJOUTS et
// MODIFICATIONS faits depuis le configurateur ; ils sont appliqués au
// démarrage, avant que le code du jeu ne soit chargé (voir runtime.ts et
// components/system/ContentGate.tsx).
//
// Ce fichier ne doit importer AUCUNE donnée de jeu (seulement des types) :
// il est chargé avant elles.
import type { Rarity } from '@/types/game';
import type { Gender } from '@/lib/game/characterGenders';

export const CONTENT_SCHEMA = 1;

// Référence vers une image stockée dans Firestore (voir images.ts).
export const CONTENT_IMAGE_PREFIX = 'content-img:';
export const isContentImageRef = (s: unknown): s is string => typeof s === 'string' && s.startsWith(CONTENT_IMAGE_PREFIX);

export interface PalierPatch {
  name?: string;
  universe?: string;
  arc?: string;
  subtitle?: string;
  bgGradient?: string;
  accentColor?: string;
  bossTimerSeconds?: number;
  monstersPerPalier?: number;
  bgImage?: string;        // référence content-img (fond du palier)
}

export interface EnemyInput {
  name: string;
  sprite: string;          // référence content-img, ou chemin existant (sprites/enemies/...)
  hpMult?: number;
  isBoss?: boolean;
}

export interface CharacterFormInput {
  name: string;
  image?: string;          // référence content-img
}

// Perso existant : tous les champs sont optionnels (seuls ceux fournis
// remplacent la valeur du code). Nouveau perso : name, rarity, baseDps,
// universe, gender et l'image de la première forme sont obligatoires.
export interface CharacterInput {
  name?: string;
  rarity?: Rarity;
  baseDps?: number;
  universe?: string;
  description?: string;
  gender?: Gender;
  excludeFromGacha?: boolean;   // absent de TOUT le gacha (perso de Forge / raid, ou retiré)
  bannerOnly?: boolean;         // perso limité : seulement dans ses bannières (ni Vol.1, ni Vedette)
  forms?: CharacterFormInput[];
}

export interface BannerThemeInput {
  accent: string; hi: string; dark: string; deep: string; glow: string;
}

// vol1 : contient toujours tous les persos tirables (characterIds ignoré).
// vol2 : characterIds = persos AJOUTÉS à la Vol.2.
// Nouvelle bannière (vol3...) : characterIds = son pool complet, title requis.
export interface BannerInput {
  title?: string;
  subtitle?: string;
  featuredIds?: string[];
  characterIds?: string[];
  theme?: BannerThemeInput;
  isNew?: boolean;
  hidden?: boolean;             // bannière retirée du Gacha (sans rien supprimer)
  startsAt?: number;            // bannière temporaire : visible à partir de… (ms)
  endsAt?: number;              // … et jusqu'à (ms, exclu)
  rateUp?: boolean;             // persos vedettes ×3 à rareté égale
  order?: number;               // position de l'onglet (plus petit = plus à gauche)
}

export interface ContentOverrides {
  schema: number;
  version: number;
  publishedAt: number;
  paliers: Record<string, PalierPatch>;     // clé = id du palier
  enemies: Record<string, EnemyInput[]>;    // clé = id du palier, 10 ennemis
  characters: Record<string, CharacterInput>; // clé = id du perso
  banners: Record<string, BannerInput>;     // clé = id de la bannière
}

export const emptyContent = (): ContentOverrides => ({
  schema: CONTENT_SCHEMA, version: 0, publishedAt: 0, paliers: {}, enemies: {}, characters: {}, banners: {},
});

const RARITIES: readonly Rarity[] = ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P', 'T'];
const GENDERS: readonly Gender[] = ['male', 'female', 'mixed', 'other'];
const ID_RE = /^[a-z0-9_]{2,40}$/;
export const isValidContentId = (id: string) => ID_RE.test(id);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 200): string | undefined => (typeof v === 'string' && v.trim() && v.length <= max ? v : undefined);
const num = (v: unknown, min: number, max: number): number | undefined =>
  (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const strList = (v: unknown): string[] | undefined =>
  (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length <= 80) : undefined);
const color = (v: unknown) => (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : undefined);
// Supprime les clés `undefined` : un champ absent ne doit jamais écraser la valeur du code.
function compact<T extends Obj>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

function parsePalier(v: unknown): PalierPatch | null {
  if (!isObj(v)) return null;
  return compact({
    name: str(v.name, 60), universe: str(v.universe, 80), arc: str(v.arc, 80), subtitle: str(v.subtitle, 120),
    bgGradient: str(v.bgGradient, 200), accentColor: color(v.accentColor),
    bossTimerSeconds: num(v.bossTimerSeconds, 10, 600), monstersPerPalier: num(v.monstersPerPalier, 1, 50),
    bgImage: isContentImageRef(v.bgImage) ? v.bgImage : undefined,
  });
}

function parseEnemy(v: unknown): EnemyInput | null {
  if (!isObj(v)) return null;
  const name = str(v.name, 60);
  const sprite = str(v.sprite, 200);
  if (!name || !sprite) return null;
  return compact({ name, sprite, hpMult: num(v.hpMult, 0.1, 1000), isBoss: v.isBoss === true ? true : undefined });
}

function parseCharacter(v: unknown): CharacterInput | null {
  if (!isObj(v)) return null;
  const forms = Array.isArray(v.forms)
    ? v.forms.flatMap(f => {
        if (!isObj(f) || !str(f.name, 80)) return [];
        return [compact({ name: f.name as string, image: isContentImageRef(f.image) ? f.image : undefined })];
      })
    : undefined;
  return compact({
    name: str(v.name, 60), rarity: RARITIES.includes(v.rarity as Rarity) ? (v.rarity as Rarity) : undefined,
    baseDps: num(v.baseDps, 0, 1e6), universe: str(v.universe, 80), description: str(v.description, 300),
    gender: GENDERS.includes(v.gender as Gender) ? (v.gender as Gender) : undefined,
    excludeFromGacha: v.excludeFromGacha === true ? true : undefined,
    bannerOnly: v.bannerOnly === true ? true : undefined,
    forms: forms && forms.length ? forms.slice(0, 8) : undefined,
  });
}

function parseBanner(v: unknown): BannerInput | null {
  if (!isObj(v)) return null;
  const t = isObj(v.theme) ? v.theme : null;
  const theme = t && color(t.accent) && color(t.hi) && color(t.dark) && color(t.deep) && str(t.glow, 60)
    ? { accent: t.accent as string, hi: t.hi as string, dark: t.dark as string, deep: t.deep as string, glow: t.glow as string }
    : undefined;
  return compact({
    title: str(v.title, 60), subtitle: str(v.subtitle, 120), featuredIds: strList(v.featuredIds),
    characterIds: strList(v.characterIds), theme, isNew: v.isNew === true ? true : undefined,
    hidden: v.hidden === true ? true : undefined,
    startsAt: num(v.startsAt, 1, 1e14), endsAt: num(v.endsAt, 1, 1e14),
    rateUp: v.rateUp === true ? true : undefined, order: num(v.order, -1000, 1000),
  });
}

function parseRecord<T>(v: unknown, parse: (x: unknown) => T | null, keyOk: (k: string) => boolean, errors: string[], label: string): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v)) {
    const parsed = keyOk(k) ? parse(x) : null;
    if (parsed) out[k] = parsed;
    else errors.push(`${label} « ${k} » ignoré (format invalide)`);
  }
  return out;
}

// Vérification de FORME uniquement (types, bornes, champs inconnus retirés) :
// n'importe quelle donnée lue dans Firestore passe par ici avant d'être
// appliquée. Les vérifications qui demandent le contenu de base (id en double,
// palier non contigu...) sont faites à l'application (apply.ts) et, avant
// publication, par le configurateur.
export function parseContent(raw: unknown): { content: ContentOverrides | null; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(raw)) return { content: null, errors: ['Contenu absent ou illisible'] };
  if (raw.schema !== CONTENT_SCHEMA) return { content: null, errors: [`Format de contenu inconnu (${String(raw.schema)})`] };
  const enemies = parseRecord(raw.enemies, x => {
    if (!Array.isArray(x)) return null;
    const list = x.map(parseEnemy);
    return list.every(Boolean) && list.length >= 1 && list.length <= 20 ? (list as EnemyInput[]) : null;
  }, k => /^\d+$/.test(k), errors, 'Ennemis du palier');
  return {
    content: {
      schema: CONTENT_SCHEMA,
      version: num(raw.version, 0, Number.MAX_SAFE_INTEGER) ?? 0,
      publishedAt: num(raw.publishedAt, 0, Number.MAX_SAFE_INTEGER) ?? 0,
      paliers: parseRecord(raw.paliers, parsePalier, k => /^\d+$/.test(k), errors, 'Palier'),
      enemies,
      characters: parseRecord(raw.characters, parseCharacter, isValidContentId, errors, 'Perso'),
      banners: parseRecord(raw.banners, parseBanner, isValidContentId, errors, 'Bannière'),
    },
    errors,
  };
}

// Toutes les images (content-img) référencées par ce contenu.
export function collectContentImages(c: ContentOverrides): string[] {
  const refs = new Set<string>();
  for (const p of Object.values(c.paliers)) if (p.bgImage) refs.add(p.bgImage);
  for (const list of Object.values(c.enemies)) for (const e of list) if (isContentImageRef(e.sprite)) refs.add(e.sprite);
  for (const ch of Object.values(c.characters)) for (const f of ch.forms ?? []) if (f.image) refs.add(f.image);
  return [...refs];
}
