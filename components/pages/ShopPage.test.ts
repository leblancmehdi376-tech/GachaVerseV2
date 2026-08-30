import { describe, it, expect } from 'vitest';
import { isCharacterOwned, formatDuration } from './ShopPage';
import { makeInstanceKey } from '@/lib/game/editions';
import { CHARACTER_POOL } from '@/lib/game/characters';

describe('isCharacterOwned', () => {
  const tplId = CHARACTER_POOL[0].id;

  it('vaut false quand aucune édition du template n’est en collection', () => {
    expect(isCharacterOwned({}, tplId)).toBe(false);
  });

  it('vaut true quand l’édition de base est possédée', () => {
    expect(isCharacterOwned({ [makeInstanceKey(tplId, 'base')]: {} }, tplId)).toBe(true);
  });

  it('vaut true quand seule l’édition or est possédée', () => {
    expect(isCharacterOwned({ [makeInstanceKey(tplId, 'gold')]: {} }, tplId)).toBe(true);
  });

  it('vaut true quand seule l’édition diamant est possédée', () => {
    expect(isCharacterOwned({ [makeInstanceKey(tplId, 'diamond')]: {} }, tplId)).toBe(true);
  });

  it('ignore les entrées d’un autre template', () => {
    const otherId = CHARACTER_POOL[1].id;
    expect(isCharacterOwned({ [makeInstanceKey(otherId, 'base')]: {} }, tplId)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('plafonne à 00:00 pour une durée nulle ou négative', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(-500)).toBe('00:00');
  });

  it('affiche minutes:secondes sous l’heure', () => {
    expect(formatDuration(65_000)).toBe('01:05');
  });

  it('affiche heures:minutes:secondes au-delà de l’heure', () => {
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('arrondit au-dessus à la seconde', () => {
    expect(formatDuration(1_001)).toBe('00:02');
  });
});
