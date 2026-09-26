import { describe, it, expect } from 'vitest';
import { CHARACTER_POOL } from './characters';
import { CHARACTER_QUOTES } from './gachaReveal';

describe('CHARACTER_QUOTES', () => {
  it('chaque Primordial et Transcendant a sa propre réplique d’invocation', () => {
    const missing = CHARACTER_POOL
      .filter(c => c.rarity === 'P' || c.rarity === 'T')
      .filter(c => !CHARACTER_QUOTES[c.id])
      .map(c => c.id);
    expect(missing).toEqual([]);
  });
});
