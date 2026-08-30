import { describe, it, expect } from 'vitest';
import { formatBonusValue } from './PrestigePage';
import { PRESTIGE_BONUS_DEFS } from '@/lib/game/prestige';

describe('formatBonusValue', () => {
  it('tokenGain affiche un entier brut (pas un pourcentage)', () => {
    expect(formatBonusValue('tokenGain', 3)).toBe(`+${PRESTIGE_BONUS_DEFS.tokenGain.perLevel * 3}`);
  });

  it('shinyGold / shinyDiamond affichent un pourcentage à 2 décimales', () => {
    const level = 4;
    const expected = `+${(PRESTIGE_BONUS_DEFS.shinyGold.perLevel * level).toFixed(2)}%`;
    expect(formatBonusValue('shinyGold', level)).toBe(expected);
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
