import { describe, it, expect } from 'vitest';
import { mergePendingGain } from './useOfflineGainCheck';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import type { OfflineGain } from '@/store/gameStore';

const gain = (seconds: number, at: number): OfflineGain => ({
  coins: bnFromNumber(seconds * 10), gems: seconds, kills: seconds,
  seconds, rawSeconds: seconds, capped: false, at,
});

describe('mergePendingGain', () => {
  it('sans popup en attente : prend le nouveau gain', () => {
    const next = gain(100, 2000);
    expect(mergePendingGain(null, next, 1000)).toBe(next);
  });

  it('onglet resté masqué (savedAt inchangé) : le nouveau gain couvre toute l\'absence et remplace l\'ancien', () => {
    const prev = gain(600, 1_000_000);
    const next = gain(1200, 1_600_000);
    expect(mergePendingGain(prev, next, 400_000)).toBe(next);
  });

  it('joueur revenu entre-temps sans récupérer : les deux absences s\'additionnent', () => {
    const prev = gain(600, 1_000_000);
    const next = gain(300, 2_000_000);
    const merged = mergePendingGain(prev, next, 1_700_000);
    expect(merged.seconds).toBe(900);
    expect(merged.gems).toBe(900);
    expect(bnToNumber(merged.coins)).toBe(9000);
    expect(merged.at).toBe(2_000_000);
  });
});
