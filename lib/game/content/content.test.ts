import { describe, it, expect } from 'vitest';
import type { CharacterTemplate } from '@/types/game';
import type { PalierConfig } from '@/lib/game/paliers';
import type { EnemyDef } from '@/lib/game/enemies';
import type { GachaBanner } from '@/lib/game/gacha';
import { parseContent, collectContentImages, emptyContent, CONTENT_SCHEMA, type ContentOverrides } from './schema';
import { applyPalierContent, applyEnemyContent, applyCharacterContent, applyGenderContent, applyBannerContent } from './apply';
import { rollSplashClue } from '../guideSplashClue';

const IMG = 'content-img:abc123';
const content = (over: Partial<ContentOverrides>): ContentOverrides => ({ ...emptyContent(), version: 1, ...over });
const palier = (id: number): PalierConfig => ({
  id, name: `P${id}`, universe: 'U', arc: 'A', subtitle: '', bgGradient: 'g', accentColor: '#fff', bossTimerSeconds: 90, monstersPerPalier: 10,
});
const enemies = (n = 10) => Array.from({ length: n }, (_, i) => ({ name: `E${i}`, sprite: IMG, hpMult: 1 + i / 10 }));
const tpl = (id: string, extra: Partial<CharacterTemplate> = {}): CharacterTemplate =>
  ({ id, name: id, rarity: 'C', baseDps: 1, universe: 'U', description: id, ...extra });

describe('parseContent — vérification de forme', () => {
  it('refuse un contenu absent ou d’un autre format', () => {
    expect(parseContent(null).content).toBeNull();
    expect(parseContent({ schema: 99 }).content).toBeNull();
  });

  it('garde les champs valides, retire le reste, et signale les entrées ignorées', () => {
    const { content, errors } = parseContent({
      schema: CONTENT_SCHEMA, version: 3,
      paliers: { '66': { name: 'NOUVEAU', universe: 'X', bossTimerSeconds: 5000, hack: 1 }, abc: { name: 'x' } },
      characters: { 'Bad Id!': { name: 'x' }, new_one: { name: 'Neuf', rarity: 'ZZ', baseDps: 10 } },
    });
    expect(content?.version).toBe(3);
    expect(content?.paliers['66']).toEqual({ name: 'NOUVEAU', universe: 'X' });
    expect(content?.characters.new_one).toEqual({ name: 'Neuf', baseDps: 10 });
    expect(errors.length).toBe(2);
  });

  it('liste les images référencées', () => {
    const c = content({ characters: { a: { forms: [{ name: 'A', image: IMG }] } }, paliers: { '1': { bgImage: 'content-img:bg' } } });
    expect(collectContentImages(c).sort()).toEqual(['content-img:abc123', 'content-img:bg']);
  });
});

describe('application aux tables de base', () => {
  it('modifie un palier existant et ajoute le suivant, jamais avec un trou', () => {
    const paliers = [palier(1), palier(2)];
    applyPalierContent(paliers, content({ paliers: { '1': { name: 'RENOMMÉ' }, '3': { name: 'TROIS', universe: 'V' }, '9': { name: 'X', universe: 'Y' } } }));
    expect(paliers.map(p => p.name)).toEqual(['RENOMMÉ', 'P2', 'TROIS']);
    expect(paliers[2]).toMatchObject({ id: 3, bossTimerSeconds: 90, monstersPerPalier: 10 });
  });

  it("remplace les ennemis d'un palier seulement avec une liste complète de 10", () => {
    const table: Record<number, EnemyDef[]> = { 1: [] };
    applyEnemyContent(table, 2, content({ enemies: { '1': enemies(), '2': enemies(4), '5': enemies() } }));
    expect(table[1]).toHaveLength(10);
    expect(table[2]).toBeUndefined();
    expect(table[5]).toBeUndefined();
  });

  it('modifie un perso existant sans perdre ses formes du code, et ajoute un nouveau perso complet', () => {
    const goku = tpl('goku', { forms: [{ formId: 'g0', name: 'Goku', description: 'Goku', dpsFormMult: 1, requiredItemIds: ['x'] }] });
    const pool = [goku];
    const excluded = new Set<string>();
    applyCharacterContent(pool, excluded, new Set(), content({ characters: {
      goku: { baseDps: 99, forms: [{ name: 'Goku !' }, { name: 'Goku SSJ', image: IMG }] },
      neuf: { name: 'Neuf', rarity: 'T', baseDps: 120, universe: 'Nouveau', gender: 'female', excludeFromGacha: true, forms: [{ name: 'Neuf', image: IMG }] },
      incomplet: { name: 'Sans image', rarity: 'C', baseDps: 1, universe: 'U' },
    } }));
    expect(goku.baseDps).toBe(99);
    expect(goku.artName).toBeUndefined(); // pas renommé : rien à garder de côté
    expect(goku.forms?.[0]).toMatchObject({ name: 'Goku !', requiredItemIds: ['x'], dpsFormMult: 1 });
    expect(goku.forms?.[1]).toMatchObject({ name: 'Goku SSJ', dpsFormMult: 2 });
    expect(goku.images).toEqual([undefined, IMG]);
    expect(pool.map(t => t.id)).toEqual(['goku', 'neuf']);
    expect(excluded.has('neuf')).toBe(true);

    const genders: Record<string, 'male' | 'female' | 'mixed' | 'other'> = {};
    applyGenderContent(genders, content({ characters: { neuf: { gender: 'female' } } }));
    expect(genders.neuf).toBe('female');
  });

  it('crée une Vol.3 avec ses persos tirables, et ajoute des persos à la Vol.2', () => {
    const pool = [tpl('a'), tpl('b'), tpl('forge')];
    const byId = (id: string) => pool.find(t => t.id === id);
    const theme = { accent: '#000', hi: '#000', dark: '#000', deep: '#000', glow: 'x' };
    const banners: GachaBanner[] = [
      { id: 'vol1', title: 'V1', subtitle: '', pool: [...pool], featuredIds: [], theme },
      { id: 'vol2', title: 'V2', subtitle: '', pool: [pool[0]], featuredIds: [], theme },
    ];
    applyBannerContent(banners, byId, t => t.id !== 'forge', content({ banners: {
      vol2: { characterIds: ['a', 'b'] },
      vol3: { title: 'VOL.3', characterIds: ['b', 'forge', 'inconnu'], featuredIds: ['b', 'inconnu'] },
      vide: { title: 'Rien', characterIds: ['forge'] },
    } }));
    expect(banners.map(b => b.id)).toEqual(['vol1', 'vol2', 'vol3']);
    expect(banners[1].pool.map(t => t.id)).toEqual(['a', 'b']);
    expect(banners[2].pool.map(t => t.id)).toEqual(['b']);
    expect(banners[2].featuredIds).toEqual(['b']);
  });

  it("garde le nom d'origine pour retrouver le fichier de la carte après un renommage", () => {
    const goku = tpl('goku', { name: 'Goku', universe: 'Dragon Ball Z' });
    applyCharacterContent([goku], new Set(), new Set(), content({ characters: { goku: { name: 'Son Goku' } } }));
    applyCharacterContent([goku], new Set(), new Set(), content({ characters: { goku: { name: 'Kakarot' } } }));
    expect(goku).toMatchObject({ name: 'Kakarot', artName: 'Goku' });
    expect(goku.artUniverse).toBeUndefined();
  });

  it('ne fait rien sans contenu publié', () => {
    const paliers = [palier(1)];
    applyPalierContent(paliers, null);
    expect(paliers).toHaveLength(1);
  });
});

describe('indice de l’écran de chargement', () => {
  it('lit le guide dans la sauvegarde locale, sans le store', () => {
    const store = new Map<string, string>();
    const ls = { getItem: (k: string) => store.get(k) ?? null } as Storage;
    const prev = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
    try {
      expect(rollSplashClue(() => 0)).toBeNull();
      store.set('nekoz-world-v8', JSON.stringify({ state: { nekozGuide: { arrivalPrestige: 0 } } }));
      expect(rollSplashClue(() => 0)).toBe('une autre version existe');
      expect(rollSplashClue(() => 0.9)).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: prev, configurable: true });
    }
  });
});

describe('validateDraft — avant publication', () => {
  const base = { paliersCount: 2, characterIds: new Set(['goku']), bannerIds: new Set(['vol1', 'vol2']) };

  it('bloque un nouveau palier sans ses 10 ennemis, ou qui laisse un trou', async () => {
    const { validateDraft } = await import('./validate');
    const r = validateDraft(content({ paliers: { '3': { name: 'TROIS', universe: 'U' }, '5': { name: 'CINQ', universe: 'U' } } }), base);
    expect(r.errors).toContain('Palier 3 : il faut ses 10 ennemis.');
    expect(r.errors.some(e => e.includes('il manque le palier 4'))).toBe(true);
  });

  it('accepte un nouveau palier complet, et signale seulement l’absence de boss', async () => {
    const { validateDraft } = await import('./validate');
    const r = validateDraft(content({ paliers: { '3': { name: 'TROIS', universe: 'U' } }, enemies: { '3': enemies() } }), base);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
  });

  it('refuse un ennemi sans nom ni image', async () => {
    const { validateDraft } = await import('./validate');
    const list = enemies();
    list[2] = { name: ' ', sprite: '', hpMult: 1 };
    const r = validateDraft(content({ enemies: { '1': list } }), base);
    expect(r.errors).toEqual(['Palier 1, ennemi 3 : nom manquant.', 'Palier 1, ennemi 3 : image manquante.']);
  });
});

describe('validateDraft — persos et bannières', () => {
  const base = { paliersCount: 2, characterIds: new Set(['goku']), bannerIds: new Set(['vol1', 'vol2']) };

  it('bloque un nouveau perso incomplet, accepte un perso complet', async () => {
    const { validateDraft } = await import('./validate');
    const incomplete = validateDraft(content({ characters: { neuf: { name: 'Neuf', rarity: 'T', baseDps: 10 } } }), base);
    expect(incomplete.errors).toEqual(['Perso « Neuf » : univers, genre, image de la première forme manquant(s).']);
    const ok = validateDraft(content({ characters: { neuf: {
      name: 'Neuf', rarity: 'T', baseDps: 10, universe: 'U', gender: 'female', forms: [{ name: 'Neuf', image: IMG }],
    } } }), base);
    expect(ok.errors).toEqual([]);
  });

  it('bloque une bannière vide ou avec un perso inconnu', async () => {
    const { validateDraft } = await import('./validate');
    const r = validateDraft(content({ banners: { vol3: { title: 'V3', characterIds: [] }, vol2: { characterIds: ['fantome'] } } }), base);
    expect(r.errors).toEqual(['Bannière « V3 » : aucun perso.', 'Bannière « vol2 » : perso(s) inconnu(s) fantome.']);
  });
});

describe('bannières temporaires, taux augmenté et ordre', () => {
  it('une bannière est tirable seulement pendant sa période, et jamais masquée', async () => {
    const { isBannerActive } = await import('@/lib/game/gacha');
    const b = { startsAt: 1000, endsAt: 2000 };
    expect(isBannerActive(b, 999)).toBe(false);
    expect(isBannerActive(b, 1000)).toBe(true);
    expect(isBannerActive(b, 2000)).toBe(false);
    expect(isBannerActive({ hidden: true }, 1500)).toBe(false);
    expect(isBannerActive({}, 0)).toBe(true);
  });

  it('refuse un tirage sur une bannière terminée ou inconnue, jamais sur la Vedette', async () => {
    const { canPullOnBanner } = await import('@/lib/game/gacha');
    expect(canPullOnBanner('featured', 0)).toBe(true);
    expect(canPullOnBanner('vol1', Date.now())).toBe(true);
    expect(canPullOnBanner('inexistante', Date.now())).toBe(false);
  });

  it('les vedettes d’une bannière à taux augmenté tombent bien plus souvent', async () => {
    const { GACHA_BANNERS, rollCharacter, FEATURED_RATE_UP } = await import('@/lib/game/gacha');
    const pool = [tpl('star'), tpl('b'), tpl('c'), tpl('d')];
    const theme = { accent: '#000', hi: '#000', dark: '#000', deep: '#000', glow: 'x' };
    GACHA_BANNERS.push({ id: 'test_rateup', title: 'T', subtitle: '', pool, featuredIds: ['star'], rateUp: true, theme });
    try {
      let hits = 0;
      for (let i = 0; i < 4000; i++) if (rollCharacter(1, 'test_rateup') === 'star') hits++;
      // Attendu : 3 / (3 + 1 + 1 + 1) = 50 % (contre 25 % sans taux augmenté).
      expect(hits / 4000).toBeGreaterThan(0.42);
      expect(FEATURED_RATE_UP).toBe(3);
    } finally {
      GACHA_BANNERS.splice(GACHA_BANNERS.findIndex(b => b.id === 'test_rateup'), 1);
    }
  });

  it('applique dates, taux, ordre des onglets et persos limités', () => {
    const pool = [tpl('a'), tpl('limite')];
    const byId = (id: string) => pool.find(t => t.id === id);
    const theme = { accent: '#000', hi: '#000', dark: '#000', deep: '#000', glow: 'x' };
    const banners: GachaBanner[] = [
      { id: 'vol1', title: 'V1', subtitle: '', pool: [pool[0]], featuredIds: [], theme },
      { id: 'vol2', title: 'V2', subtitle: '', pool: [pool[0]], featuredIds: [], theme },
    ];
    const bannerOnly = new Set<string>();
    applyCharacterContent(pool, new Set(), bannerOnly, content({ characters: { limite: { bannerOnly: true } } }));
    expect(bannerOnly.has('limite')).toBe(true);
    applyBannerContent(banners, byId, () => true, content({ banners: {
      event: { title: 'ÉVÉNEMENT', characterIds: ['limite'], startsAt: 10, endsAt: 20, rateUp: true, order: -1 },
    } }));
    expect(banners.map(b => b.id)).toEqual(['event', 'vol1', 'vol2']);
    expect(banners[0]).toMatchObject({ startsAt: 10, endsAt: 20, rateUp: true });
  });
});

describe('vue du brouillon et relecture', () => {
  it('liste ce qui est ajouté, modifié ou supprimé par rapport à la version en ligne', async () => {
    const { diffContent } = await import('./draftView');
    const live = content({ banners: { vol9: { title: 'ANCIENNE', characterIds: ['goku'] } }, characters: { goku: { baseDps: 5 } } });
    const draft = content({
      characters: { goku: { baseDps: 6 }, neuf: { name: 'Neuf' } },
      paliers: { '1': { name: 'X' } },
    });
    const changes = diffContent(live, draft).map(c => `${c.kind} ${c.category} ${c.label}`);
    expect(changes).toEqual(expect.arrayContaining([
      'modified Palier #1 X', 'modified Perso Goku', 'added Perso Neuf', 'removed Bannière ANCIENNE',
    ]));
    expect(changes).toHaveLength(4);
  });

  it('range la Vol.3 où on veut et retire les persos limités de la Vol.1', async () => {
    const { editableBanners, reorderBanners } = await import('./draftView');
    let draft = content({
      characters: { limite: { name: 'Limité', rarity: 'T', baseDps: 1, universe: 'U', gender: 'other', bannerOnly: true, forms: [{ name: 'L', image: IMG }] } },
      banners: { vol3: { title: 'VOL.3', characterIds: ['limite'] } },
    });
    draft = reorderBanners(draft, ['vol3', 'vol1', 'vol2']);
    const banners = editableBanners(draft);
    expect(banners.map(b => b.id)).toEqual(['vol3', 'vol1', 'vol2']);
    expect(banners[0].memberIds).toEqual(['limite']);
    expect(banners[1].memberIds).not.toContain('limite');
    // Retour à l'ordre d'origine : les bannières du code ne sont plus « modifiées ».
    const back = reorderBanners(draft, ['vol1', 'vol2', 'vol3']);
    expect(back.banners.vol1).toBeUndefined();
    expect(back.banners.vol3).toEqual({ title: 'VOL.3', characterIds: ['limite'] });
  });

  it('refuse de supprimer un perso déjà publié, et vérifie les dates', async () => {
    const { validateDraft } = await import('./validate');
    const base = { paliersCount: 2, characterIds: new Set(['goku']), bannerIds: new Set(['vol1', 'vol2']) };
    const live = content({ characters: { neuf: { name: 'Neuf' } } });
    const r = validateDraft(content({ banners: { vol3: { title: 'V3', characterIds: ['goku'], startsAt: 20, endsAt: 10 } } }), base, live);
    expect(r.errors).toEqual(expect.arrayContaining([
      'Perso « Neuf » : déjà publié, des joueurs l\'ont peut-être. Coche plutôt « Retiré du gacha ».',
      'Bannière « V3 » : la fin doit être après le début.',
    ]));
  });
});
