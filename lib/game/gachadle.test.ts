import { describe, it, expect } from 'vitest';
import { CharacterTemplate } from '@/types/game';
import { getCharacterById } from './characters';
import { getAffinityForId } from './affinities';
import { compareGuess, getDailyTarget, getDleDateKey, suggestCharacters, DLE_POOL } from './gachadle';

const mk = (id: string, name: string, rarity: CharacterTemplate['rarity'], universe: string): CharacterTemplate =>
  ({ id, name, rarity, universe, baseDps: 1, spritePath: '', description: name });

describe('compareGuess', () => {
  const target = mk('t', 'Cible', 'L', 'One Piece');

  it('tout correct quand on propose la cible', () => {
    expect(compareGuess(target, target)).toEqual({ name: 'correct', gender: 'correct', rarity: 'correct', affinity: 'correct', universe: 'correct', forms: 'correct' });
  });

  it('indique si la cible est plus ou moins rare', () => {
    expect(compareGuess(mk('a', 'A', 'C', 'One Piece'), target).rarity).toBe('higher');
    expect(compareGuess(mk('b', 'B', 'T', 'One Piece'), target).rarity).toBe('lower');
  });

  it('compare le nombre de formes (1 sans évolution)', () => {
    const withForms = (n: number): CharacterTemplate => ({
      ...mk('f', 'F', 'L', 'One Piece'),
      forms: Array.from({ length: n }, (_, i) => ({ formId: `f${i}`, name: 'F', spritePath: '', description: '', dpsFormMult: i + 1 })),
    });
    expect(compareGuess(withForms(3), target).forms).toBe('lower');
    expect(compareGuess(target, withForms(3)).forms).toBe('higher');
    expect(compareGuess(withForms(1), target).forms).toBe('correct');
  });

  it('type voisin dans le cycle = proche', () => {
    // 'vegeta' est forcé en Ordre : Chaos (le bat) et Stase (battu) sont voisins, Vitalité non.
    const vegeta = getCharacterById('vegeta')!;
    const byAffinity = (a: string) => DLE_POOL.find(c => getAffinityForId(c.id) === a)!;
    expect(compareGuess(byAffinity('ordre'), vegeta).affinity).toBe('correct');
    expect(compareGuess(byAffinity('chaos'), vegeta).affinity).toBe('close');
    expect(compareGuess(byAffinity('stase'), vegeta).affinity).toBe('close');
    expect(compareGuess(byAffinity('vitalite'), vegeta).affinity).toBe('wrong');
  });

  it('compare le genre', () => {
    const [goku, peach, luffy] = ['goku', 'peach', 'luffy'].map(id => getCharacterById(id)!);
    expect(compareGuess(peach, goku).gender).toBe('wrong');
    expect(compareGuess(luffy, goku).gender).toBe('correct');
  });

  it("compare l'univers", () => {
    expect(compareGuess(mk('a', 'A', 'L', 'Naruto'), target).universe).toBe('wrong');
    expect(compareGuess(mk('a', 'A', 'L', 'One Piece'), target).universe).toBe('correct');
  });
});

describe('getDailyTarget', () => {
  it('est stable pour une même date', () => {
    expect(getDailyTarget('2026-09-28').id).toBe(getDailyTarget('2026-09-28').id);
  });

  it('ne tire jamais le héros', () => {
    expect(DLE_POOL.some(c => c.isHero)).toBe(false);
  });

  it('formate la date du jour', () => {
    expect(getDleDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('suggestCharacters', () => {
  const pool = [mk('a', 'Éren', 'C', 'X'), mk('b', 'Karen', 'C', 'X'), mk('c', 'Luffy', 'C', 'Y')];

  it('met les noms qui commencent par la saisie en premier, sans tenir compte des accents', () => {
    expect(suggestCharacters('ere', new Set(), 8, pool).map(c => c.id)).toEqual(['a']);
    expect(suggestCharacters('en', new Set(), 8, pool).map(c => c.id)).toEqual(['a', 'b']);
    expect(suggestCharacters('re', new Set(), 8, pool).map(c => c.id)).toEqual(['a', 'b']);
  });

  it('exclut les persos déjà proposés et ignore une saisie vide', () => {
    expect(suggestCharacters('en', new Set(['a']), 8, pool).map(c => c.id)).toEqual(['b']);
    expect(suggestCharacters('  ', new Set(), 8, pool)).toEqual([]);
  });
});
