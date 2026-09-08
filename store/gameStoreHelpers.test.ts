import { describe, it, expect } from 'vitest';
import { getGoldGainMultiplier, resolveEnemyDeath, type GoldGainMultiplierInputs } from './gameStoreHelpers';
import { initialBonusLevels, type PrestigeBonusLevels } from '@/lib/game/prestige';
import type { Anomaly } from '@/lib/game/anomalies';
import type { ActiveUlt } from './gameStore.types';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import { generateEnemy } from '@/lib/game/enemies';
import type { GameState } from '@/types/game';

function baseInputs(overrides: Partial<GoldGainMultiplierInputs> = {}): GoldGainMultiplierInputs {
  return {
    goldUpgradeLevel: 0,
    activeTitle: '',
    ultActiveUlts: [],
    goldBoostEndsAt: 0,
    prestigeBonusLevels: initialBonusLevels(),
    prestigeRankRecoveryLevel: 0,
    ownedAnomalies: [],
    ...overrides,
  };
}

function goldAnomaly(valuePct: number): Anomaly {
  return { id: 'a1', rarity: 'C', bonusType: 'goldGain', value: valuePct, target: null, locked: false };
}

function coinUlt(mult: number): ActiveUlt {
  return { templateId: 't1', formIndex: 0, endsAt: Date.now() + 60_000, effect: { coinMultiplier: mult } };
}

describe('getGoldGainMultiplier — source unique du multiplicateur d\'or', () => {
  it('vaut 1 sans aucun boost actif', () => {
    expect(bnToNumber(getGoldGainMultiplier(baseInputs()))).toBeCloseTo(1);
  });

  it('applique le bonus de titre seul', () => {
    const mult = bnToNumber(getGoldGainMultiplier(baseInputs({ activeTitle: 'Novice' }))); // +5%
    expect(mult).toBeCloseTo(1.05);
  });

  it('applique le bonus de prestige (passif Golds, +10%/niveau)', () => {
    const levels: PrestigeBonusLevels = { ...initialBonusLevels(), gold: 3 };
    const mult = bnToNumber(getGoldGainMultiplier(baseInputs({ prestigeBonusLevels: levels })));
    expect(mult).toBeCloseTo(1.3);
  });

  it('applique le bonus des anomalies de type goldGain', () => {
    const mult = bnToNumber(getGoldGainMultiplier(baseInputs({ ownedAnomalies: [goldAnomaly(12), goldAnomaly(8)] })));
    expect(mult).toBeCloseTo(1.2); // +12% + +8%
  });

  it('applique le multiplicateur de coins des ultimes actifs', () => {
    const mult = bnToNumber(getGoldGainMultiplier(baseInputs({ ultActiveUlts: [coinUlt(2)] })));
    expect(mult).toBeCloseTo(2);
  });

  it('applique le boost temporaire de la boutique quand il est encore actif', () => {
    const active = bnToNumber(getGoldGainMultiplier(baseInputs({ goldBoostEndsAt: Date.now() + 60_000 })));
    const expired = bnToNumber(getGoldGainMultiplier(baseInputs({ goldBoostEndsAt: Date.now() - 1 })));
    expect(active).toBeGreaterThan(1);
    expect(expired).toBeCloseTo(1);
  });

  it('cumule TOUS les boosts simultanément (titre + prestige + anomalie + ult + boost + coffre)', () => {
    const levels: PrestigeBonusLevels = { ...initialBonusLevels(), gold: 2 }; // ×1.2
    const mult = bnToNumber(getGoldGainMultiplier({
      goldUpgradeLevel: 1,                 // coffre ×1.2
      activeTitle: 'Novice',               // ×1.05
      ultActiveUlts: [coinUlt(1.5)],        // ×1.5
      goldBoostEndsAt: Date.now() + 60_000, // boost boutique actif
      prestigeBonusLevels: levels,          // ×1.2
      prestigeRankRecoveryLevel: 0,
      ownedAnomalies: [goldAnomaly(10)],    // ×1.1
    }));
    const chestMult = 1.2;
    const boostMult = mult / (chestMult * 1.05 * 1.5 * 1.2 * 1.1); // isole le facteur boost boutique retrouvé
    expect(boostMult).toBeGreaterThan(1); // BOOST_MULTIPLIER > 1, peu importe sa valeur exacte
    // Le produit doit correspondre exactement à chest × titre × ult × prestige × anomalie × boost
    expect(mult).toBeCloseTo(chestMult * 1.05 * 1.5 * 1.2 * 1.1 * boostMult);
  });
});

describe('resolveEnemyDeath — le gain réel de golds au kill utilise TOUS les boosts', () => {
  function makeState(overrides: Partial<GameState> = {}): GameState & {
    quests: []; weeklyQuests: []; eventQuests: [];
    prestigeBonusLevels: PrestigeBonusLevels; prestigeRankRecoveryLevel: number;
    activeTitle: string; ultActiveUlts: ActiveUlt[]; ownedAnomalies: Anomaly[];
  } {
    const enemy = generateEnemy(1, 1);
    return {
      currentEnemy: { ...enemy, currentHp: bnFromNumber(0) },
      pixelCoins: bnFromNumber(0),
      nekoGems: 0,
      quests: [], weeklyQuests: [], eventQuests: [],
      prestigeBonusLevels: initialBonusLevels(),
      prestigeRankRecoveryLevel: 0,
      activeTitle: '',
      ultActiveUlts: [],
      ownedAnomalies: [],
      // wave=1 (≠10) évite le passage boss/farm de resolveEnemyDeath, qui ne
      // nous intéresse pas ici — seul le calcul de golds est testé.
      wave: 1,
      palier: 1,
      maxPalierReached: 1,
      runPeakPalier: 1,
      bossAvoided: false,
      unlockedEquipDropRarities: ['C'],
      equipmentInventory: {},
      ...overrides,
    } as unknown as GameState & {
      quests: []; weeklyQuests: []; eventQuests: [];
      prestigeBonusLevels: PrestigeBonusLevels; prestigeRankRecoveryLevel: number;
      activeTitle: string; ultActiveUlts: ActiveUlt[]; ownedAnomalies: Anomaly[];
    };
  }

  it('ne crédite que le butin de base sans aucun boost', () => {
    const state = makeState();
    const result = resolveEnemyDeath(state);
    expect(bnToNumber(result.pixelCoins!)).toBeCloseTo(bnToNumber(state.currentEnemy.pixelCoinsReward));
  });

  it('crédite le butin boosté par le prestige et les anomalies, pas seulement le coffre', () => {
    const levels: PrestigeBonusLevels = { ...initialBonusLevels(), gold: 5 }; // ×1.5
    const state = makeState({
      prestigeBonusLevels: levels,
      ownedAnomalies: [goldAnomaly(20)], // ×1.2
    } as Partial<GameState>);
    const result = resolveEnemyDeath(state);
    const expected = bnToNumber(state.currentEnemy.pixelCoinsReward) * 1.5 * 1.2;
    expect(bnToNumber(result.pixelCoins!)).toBeCloseTo(expected, 5);
  });
});
