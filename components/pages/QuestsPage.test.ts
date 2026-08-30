import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fmtCountdown, getNextResetMs } from './QuestsPage';

describe('fmtCountdown', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('formate le temps restant en HH:MM:SS', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const target = Date.now() + (2 * 3600 + 5 * 60 + 9) * 1000;
    expect(fmtCountdown(target)).toBe('02:05:09');
  });

  it('plafonne à 00:00:00 quand la cible est déjà passée', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    expect(fmtCountdown(Date.now() - 1000)).toBe('00:00:00');
  });
});

// Les resets utilisent explicitement le fuseau Europe/Paris (via
// toLocaleString({timeZone:'Europe/Paris'})), donc leur résultat ne dépend
// pas du fuseau de la machine qui exécute le test — on vérifie les parts
// Paris du timestamp obtenu plutôt qu'une valeur absolue codée en dur.
function parisParts(ts: number) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(ts));
  const get = (t: string) => parts.find(p => p.type === t)?.value;
  return { weekday: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) };
}

describe('getNextResetMs', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("'daily' retourne le prochain 2h00 heure de Paris, dans les 24h", () => {
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
    const next = getNextResetMs('daily');
    const parts = parisParts(next);
    expect(parts.hour).toBe(2);
    expect(parts.minute).toBe(0);
    expect(next).toBeGreaterThan(Date.now());
    expect(next - Date.now()).toBeLessThanOrEqual(24 * 3600_000);
  });

  it("'weekly' retourne le prochain lundi 2h00 heure de Paris, dans les 7 jours", () => {
    vi.setSystemTime(new Date('2024-06-15T10:00:00.000Z'));
    const next = getNextResetMs('weekly');
    const parts = parisParts(next);
    expect(parts.weekday).toBe('Mon');
    expect(parts.hour).toBe(2);
    expect(parts.minute).toBe(0);
    expect(next).toBeGreaterThan(Date.now());
    expect(next - Date.now()).toBeLessThanOrEqual(7 * 24 * 3600_000);
  });
});
