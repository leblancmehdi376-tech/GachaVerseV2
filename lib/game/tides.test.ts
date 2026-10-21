import { describe, it, expect } from 'vitest';
import { AFFINITY_ORDER } from './affinities';
import { getTideForDayKey, getNextTide, tideMultFor, TIDE_UP_MULT, TIDE_DOWN_MULT } from './tides';

function dayKey(offset: number): string {
  const d = new Date(Date.UTC(2026, 9, 21 + offset));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

describe('Marées cosmiques', () => {
  it('la marée basse est toujours le type opposé de la roue (4 crans plus loin)', () => {
    for (let i = 0; i < 30; i++) {
      const t = getTideForDayKey(dayKey(i));
      const up = AFFINITY_ORDER.indexOf(t.up);
      expect(AFFINITY_ORDER.indexOf(t.down)).toBe((up + AFFINITY_ORDER.length / 2) % AFFINITY_ORDER.length);
    }
  });

  it('sur 8 jours consécutifs, chaque type passe une fois en marée haute, jamais deux jours de suite', () => {
    const ups = Array.from({ length: 8 }, (_, i) => getTideForDayKey(dayKey(i)).up);
    expect(new Set(ups).size).toBe(8);
    for (let i = 1; i < 40; i++) {
      expect(getTideForDayKey(dayKey(i)).up).not.toBe(getTideForDayKey(dayKey(i - 1)).up);
    }
  });

  it('est déterministe : la même journée donne la même marée', () => {
    expect(getTideForDayKey('2026-10-21')).toEqual(getTideForDayKey('2026-10-21'));
  });

  it('getNextTide donne la marée du lendemain, y compris en changement de mois', () => {
    expect(getNextTide(getTideForDayKey('2026-10-21'))).toEqual(getTideForDayKey('2026-10-22'));
    expect(getNextTide(getTideForDayKey('2026-10-31'))).toEqual(getTideForDayKey('2026-11-01'));
  });

  it('tideMultFor : bonus en marée haute, malus en marée basse, neutre sinon', () => {
    const t = getTideForDayKey('2026-10-21');
    expect(tideMultFor(t.up, t)).toBe(TIDE_UP_MULT);
    expect(tideMultFor(t.down, t)).toBe(TIDE_DOWN_MULT);
    const other = AFFINITY_ORDER.find(a => a !== t.up && a !== t.down)!;
    expect(tideMultFor(other, t)).toBe(1);
    expect(tideMultFor(t.up, null)).toBe(1);
  });
});
