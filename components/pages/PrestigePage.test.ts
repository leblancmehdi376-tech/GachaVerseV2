import { describe, it, expect } from 'vitest';
import { formatBonusValue } from './PrestigePage';
import { PRESTIGE_BONUS_DEFS } from '@/lib/game/prestige';

describe('formatBonusValue', () => {
  it('tokenGain affiche un entier brut (pas un pourcentage)', () => {
    expect(formatBonusValue('tokenGain', 3)).toBe(`+${PRESTIGE_BONUS_DEFS.tokenGain.perLevel * 3}`);
  });

  it('editionRate affiche un pourcentage à 1 décimale', () => {
    const level = 3;
    const expected = `+${(PRESTIGE_BONUS_DEFS.editionRate.perLevel * level * 100).toFixed(1)}%`;
    expect(formatBonusValue('editionRate', level)).toBe(expected);
    expect(formatBonusValue('editionRate', 3)).toBe('+7.5%');
  });

  it('les autres types (dps, gold, equipDrop) affichent un pourcentage arrondi sans décimale', () => {
    const level = 5;
    const total = PRESTIGE_BONUS_DEFS.dps.perLevel * level;
    expect(formatBonusValue('dps', level)).toBe(`+${(total * 100).toFixed(0)}%`);
  });

  it('vaut +0 / +0% au niveau 0', () => {
    expect(formatBonusValue('tokenGain', 0)).toBe('+0');
    expect(formatBonusValue('dps', 0)).toBe('+0%');
  });
});
