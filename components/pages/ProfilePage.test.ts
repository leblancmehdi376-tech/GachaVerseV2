import { describe, it, expect } from 'vitest';
import { getOwnedChars, computeRarityBreakdown, fmtDur } from './ProfilePage';
import { CHARACTER_POOL } from '@/lib/game/characters';

// On s'appuie sur le vrai contenu du jeu (CHARACTER_POOL) sans coder en dur
// d'id précis — cf. convention de CompanionsPage.test.ts.
const [tplA, tplB] = CHARACTER_POOL;

describe('getOwnedChars', () => {
  it('retourne un tableau vide pour une collection vide', () => {
    expect(getOwnedChars({})).toEqual([]);
  });

  it('inclut un template possédé', () => {
    const owned = getOwnedChars({ [tplA.id]: {} });
    expect(owned.map(c => c.id)).toContain(tplA.id);
  });

  it('reconnaît encore une ancienne clé d’édition (save pas encore migrée)', () => {
    const owned = getOwnedChars({ [`${tplA.id}::gold`]: {}, [tplA.id]: {} });
    expect(owned.filter(c => c.id === tplA.id)).toHaveLength(1);
  });
});

describe('computeRarityBreakdown', () => {
  it('retourne un objet vide sans personnage possédé', () => {
    expect(computeRarityBreakdown([])).toEqual({});
  });

  it('compte les personnages possédés par rareté', () => {
    const breakdown = computeRarityBreakdown([tplA, tplB]);
    const expectedA = tplA.rarity === tplB.rarity ? 2 : 1;
    expect(breakdown[tplA.rarity]).toBe(expectedA);
  });
});

describe('fmtDur', () => {
  it('affiche juste les secondes sous la minute', () => {
    expect(fmtDur(42)).toBe('42s');
  });

  it('affiche minutes sous l’heure', () => {
    expect(fmtDur(150)).toBe('2min');
  });

  it('affiche heures + minutes au-delà de l’heure', () => {
    expect(fmtDur(3 * 3600 + 15 * 60)).toBe('3h 15min');
  });

  it('affiche juste les heures quand les minutes sont nulles', () => {
    expect(fmtDur(2 * 3600)).toBe('2h');
  });
});
