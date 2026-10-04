import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDynamicRates, rollRarity, rollCharacter, rollMulti, rollMulti100, RARITY_GATES, GACHA_BANNERS } from './gacha';
import { BANNER_POOL, BANNER_POOL_VOL2 } from './characters';
import type { Rarity } from '@/types/game';

describe('getDynamicRates', () => {
  it('les taux retournés totalisent toujours 100% (aux arrondis près)', () => {
    for (const palier of [1, 5, 10, 20, 30, 40, 60]) {
      const rates = getDynamicRates(palier);
      const total = Object.values(rates).reduce((a, b) => a + (b ?? 0), 0);
      expect(total).toBeCloseTo(100, 2);
    }
  });

  it('ne retourne que des raretés débloquées au palier donné', () => {
    const rates = getDynamicRates(1);
    expect(Object.keys(rates)).toEqual(['C']);
    expect(rates.C).toBe(100);
  });

  it('débloque progressivement les raretés à mesure que le palier augmente', () => {
    const ratesAtGate    = getDynamicRates(RARITY_GATES.U.unlockPalier);
    const ratesBeforeGate = getDynamicRates(RARITY_GATES.U.unlockPalier - 1);
    expect(ratesAtGate.U).toBeGreaterThan(0);
    expect(ratesBeforeGate.U ?? 0).toBe(0);
  });

  it('les rateAtMax totalisent 100 et sont exactement les taux affichés au palier 40', () => {
    const total = Object.values(RARITY_GATES).reduce((a, g) => a + g.rateAtMax, 0);
    expect(total).toBeCloseTo(100, 6);
    const at40 = getDynamicRates(40);
    for (const [r, g] of Object.entries(RARITY_GATES)) expect(at40[r as Rarity]).toBeCloseTo(g.rateAtMax, 6);
  });

  it('au-delà du palier 40, les taux sont identiques à ceux du palier 40 (pas d\'extrapolation)', () => {
    const at40 = getDynamicRates(40);
    const at100 = getDynamicRates(100);
    expect(at100).toEqual(at40);
  });
});

describe('rollRarity', () => {
  it('ne retourne que des raretés débloquées au palier donné', () => {
    for (let i = 0; i < 200; i++) {
      expect(rollRarity(1)).toBe('C');
    }
  });

  it('retourne toujours une clé de rareté valide', () => {
    const valid: Rarity[] = ['C','U','R','E','L','M','S','CO','P','T'];
    for (let i = 0; i < 200; i++) {
      expect(valid).toContain(rollRarity(40));
    }
  });
});

describe('rollRarity (cas limites)', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('un tirage à 0 ne renvoie jamais une rareté verrouillée', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollRarity(1)).toBe('C');
    expect(rollRarity(RARITY_GATES.U.unlockPalier)).toBe('U');
  });

  it('un tirage tout en haut de la plage renvoie une rareté débloquée', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999999);
    expect(rollRarity(40)).toBe('C');
  });
});

describe('getDynamicRates par bannière', () => {
  afterEach(() => { GACHA_BANNERS[1].pool = BANNER_POOL_VOL2; });

  it('exclut les raretés absentes de la bannière et renormalise à 100%', () => {
    GACHA_BANNERS[1].pool = BANNER_POOL_VOL2.filter(c => c.rarity !== 'T');
    const rates = getDynamicRates(40, 'vol2');
    expect(rates.T).toBeUndefined();
    const total = Object.values(rates).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBeCloseTo(100, 3);
    // Plus aucun tirage ne tombe sur T ni ne retombe en R par défaut.
    for (const id of rollMulti100(40, 'vol2')) {
      expect(BANNER_POOL_VOL2.find(c => c.id === id)?.rarity).not.toBe('T');
    }
  });

  it('sans bannière vide, les taux sont identiques aux taux globaux', () => {
    expect(getDynamicRates(40, 'vol1')).toEqual(getDynamicRates(40));
  });
});

describe('rollCharacter / rollMulti / rollMulti100', () => {
  it('rollCharacter retourne toujours un id non vide', () => {
    for (let i = 0; i < 50; i++) {
      expect(typeof rollCharacter(20)).toBe('string');
      expect(rollCharacter(20).length).toBeGreaterThan(0);
    }
  });

  it('rollMulti retourne exactement 10 tirages', () => {
    expect(rollMulti(20)).toHaveLength(10);
  });

  it('rollMulti100 retourne exactement 100 tirages', () => {
    expect(rollMulti100(20)).toHaveLength(100);
  });
});

describe('bannières', () => {
  it('la bannière Vol.2 ne tire que des personnages de la Vol.2', () => {
    const vol2Ids = new Set(BANNER_POOL_VOL2.map(c => c.id));
    for (const id of rollMulti100(40, 'vol2')) expect(vol2Ids.has(id)).toBe(true);
  });

  it('les personnages de la Vol.2 sont aussi tirables sur la Vol.1', () => {
    const vol1Ids = new Set(BANNER_POOL.map(c => c.id));
    for (const c of BANNER_POOL_VOL2) expect(vol1Ids.has(c.id)).toBe(true);
  });
});
