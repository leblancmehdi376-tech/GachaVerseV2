import { describe, it, expect } from 'vitest';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import { computeSleepRecap, takeSleepSnapshot, type SleepSource } from './sleepRecap';

const base: SleepSource = {
  pixelCoins: bnFromNumber(1000), nekoGems: 50, totalKills: 10, totalBossKills: 1,
  totalBossCrownsEarned: 2, totalVoidOrbsEarned: 0, palier: 5, maxPalierReached: 5,
  inventory: { elixir_vie: 1 }, equipmentInventory: {}, raidBossFight: { bossId: 'b', kills: 3 },
};

describe('computeSleepRecap', () => {
  it('renvoie null si rien n\'a été obtenu', () => {
    expect(computeSleepRecap(takeSleepSnapshot(base, 0), base, 60_000)).toBeNull();
  });

  it('calcule les gains pendant la veille', () => {
    const snap = takeSleepSnapshot(base, 0);
    const after: SleepSource = {
      ...base, pixelCoins: bnFromNumber(4000), nekoGems: 55, totalKills: 40, totalBossKills: 2,
      palier: 6, maxPalierReached: 6, inventory: { elixir_vie: 1, beru: 2 },
      equipmentInventory: { helmet_common: 1 }, raidBossFight: { bossId: 'b', kills: 5 },
    };
    const r = computeSleepRecap(snap, after, 90_000)!;
    expect(r.seconds).toBe(90);
    expect(bnToNumber(r.coins)).toBe(3000);
    expect(r).toMatchObject({ gems: 5, kills: 30, bossKills: 1, palierFrom: 5, palierTo: 6, newMaxPalier: 6 });
    expect(r.items).toEqual([{ id: 'beru', qty: 2 }]);
    expect(r.equipment).toEqual([{ id: 'helmet_common', qty: 1 }]);
    expect(r.raid).toEqual({ bossId: 'b', kills: 2 });
  });

  it('ignore les pertes et un autre boss de raid', () => {
    const r = computeSleepRecap(takeSleepSnapshot(base, 0), {
      ...base, nekoGems: 10, totalKills: 11, inventory: {}, raidBossFight: { bossId: 'c', kills: 9 },
    }, 1000)!;
    expect(r.gems).toBe(0);
    expect(r.items).toEqual([]);
    expect(r.raid).toBeNull();
  });
});
