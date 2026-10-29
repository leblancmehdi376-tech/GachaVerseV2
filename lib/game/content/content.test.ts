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
    applyCharacterContent(pool, excluded, content({ characters: {
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
    applyCharacterContent([goku], new Set(), content({ characters: { goku: { name: 'Son Goku' } } }));
    applyCharacterContent([goku], new Set(), content({ characters: { goku: { name: 'Kakarot' } } }));
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
