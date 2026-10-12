import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { useSpoilerStore, getSafeFormIndex, getSpoilerUniverses, getSafeEnemyDisplay, isPalierProtected } from './spoilerStore';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { SYNERGIES } from '@/lib/game/synergies';
import { PALIERS } from '@/lib/game/paliers';
import { generateEnemy } from '@/lib/game/enemies';

const ROOT = path.resolve(__dirname, '..');

describe('getSafeFormIndex', () => {
  beforeEach(() => useSpoilerStore.setState({ protectedUniverses: {} }));

  it('affiche la vraie forme pour un univers non protégé', () => {
    expect(getSafeFormIndex('Naruto', 0)).toBe(0);
    expect(getSafeFormIndex('Naruto', 1)).toBe(1);
    expect(getSafeFormIndex('Naruto', 3)).toBe(3);
  });

  it("affiche toujours l'Evo0 pour un univers protégé, quelle que soit l'évolution", () => {
    useSpoilerStore.getState().toggleUniverse('Naruto', true);
    expect(getSafeFormIndex('Naruto', 0)).toBe(0);
    expect(getSafeFormIndex('Naruto', 1)).toBe(0);
    expect(getSafeFormIndex('Naruto', 2)).toBe(0);
    expect(getSafeFormIndex('Naruto', 5)).toBe(0);
  });

  it("ne protège que l'univers coché", () => {
    useSpoilerStore.getState().toggleUniverse('Naruto', true);
    expect(getSafeFormIndex('Bleach', 2)).toBe(2);
  });

  it('rend la vraie forme une fois la case décochée', () => {
    useSpoilerStore.getState().toggleUniverse('Naruto', true);
    useSpoilerStore.getState().toggleUniverse('Naruto', false);
    expect(getSafeFormIndex('Naruto', 2)).toBe(2);
  });
});

describe('getSpoilerUniverses', () => {
  const universes = getSpoilerUniverses();

  it('propose tous les univers du pool de personnages', () => {
    for (const c of CHARACTER_POOL) {
      expect(c.universe, `${c.id} n'a pas d'univers : impossible de le protéger`).toBeTruthy();
      expect(universes).toContain(c.universe);
    }
  });

  it('propose toutes les synergies', () => {
    for (const s of SYNERGIES) expect(universes).toContain(s.universe);
  });

  it('ne contient ni doublon ni univers vide', () => {
    expect(new Set(universes).size).toBe(universes.length);
    expect(universes.every(u => u.trim().length > 0)).toBe(true);
  });

  it('est triée par ordre alphabétique', () => {
    expect(universes).toEqual([...universes].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('a un logo de synergie pour chaque univers', () => {
    for (const u of universes) {
      const def = SYNERGIES.find(s => s.universe === u);
      expect(def, `pas de synergie pour ${u}`).toBeDefined();
      expect(fs.existsSync(path.join(ROOT, 'public/sprites/synergies', `${def!.id}.webp`)), `logo manquant pour ${u}`).toBe(true);
    }
  });
});

// Garde-fou : tout composant qui construit lui-même l'URL d'un visuel de
// personnage doit passer par getSafeFormIndex, sinon l'anti-spoil est contourné.
// Le reste du jeu affiche les persos via CharacterCardThumb, qui l'applique.
describe('anti-spoil appliqué partout', () => {
  const CHARACTER_ART = /getCardBaseName|new_cards_processed|\/sprites\/cards\/|\/sprites\/allies\//;

  function listTsx(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return listTsx(p);
      return e.name.endsWith('.tsx') ? [p] : [];
    });
  }

  const files = ['components', 'app']
    .map(d => path.join(ROOT, d))
    .filter(d => fs.existsSync(d))
    .flatMap(listTsx);

  it('trouve des composants à vérifier', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("chaque composant qui affiche l'art d'un personnage applique getSafeFormIndex", () => {
    const offenders = files
      .filter(f => CHARACTER_ART.test(fs.readFileSync(f, 'utf8')))
      .filter(f => !fs.readFileSync(f, 'utf8').includes('getSafeFormIndex('))
      .map(f => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('CharacterCardThumb et la bannière du Gacha appliquent bien l’anti-spoil', () => {
    for (const f of ['components/ui/CharacterCardThumb.tsx', 'components/pages/GachaPage.tsx']) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).toContain('getSafeFormIndex(');
    }
  });
});

describe('getSafeEnemyDisplay', () => {
  beforeEach(() => useSpoilerStore.setState({ protectedUniverses: {} }));
  const enemy = (palier: number, wave = 3, isBoss = false) => ({ ...generateEnemy(wave, palier), isBoss });

  it("affiche le vrai ennemi quand l'univers du palier n'est pas protégé", () => {
    const e = enemy(31);
    expect(getSafeEnemyDisplay(e)).toEqual({ name: e.name, spritePath: e.spritePath });
  });

  it("remplace les ennemis d'un univers protégé par des Saibaman", () => {
    useSpoilerStore.getState().toggleUniverse('Valkyrie Apocalypse', true);
    const shown = getSafeEnemyDisplay(enemy(31));
    expect(shown.name).toBe('Saibaman');
    expect(shown.spritePath).toMatch(/^\/sprites\/enemies\/palier1\/saibaman\d?\.png$/);
    expect(getSafeEnemyDisplay(enemy(31, 10, true)).name).toBe('★ BOSS — Saibaman');
    expect(getSafeEnemyDisplay(enemy(32)).name).not.toBe('Saibaman');
  });

  it('suit le cycle des paliers et les univers nommés autrement', () => {
    useSpoilerStore.getState().toggleUniverse('Fullmetal Alchemist Brotherhood', true);
    expect(isPalierProtected(27)).toBe(true);
    expect(isPalierProtected(27 + PALIERS.length)).toBe(true);
    useSpoilerStore.getState().toggleUniverse('Dragon Ball Z', true);
    expect(isPalierProtected(24)).toBe(true);
  });

  it('chaque univers de palier correspond à un univers proposé dans les réglages', () => {
    for (const p of PALIERS) {
      useSpoilerStore.setState({ protectedUniverses: Object.fromEntries(getSpoilerUniverses().map(u => [u, true])) });
      expect(isPalierProtected(p.id), `palier ${p.id} (${p.universe}) impossible à protéger`).toBe(true);
    }
  });
});
