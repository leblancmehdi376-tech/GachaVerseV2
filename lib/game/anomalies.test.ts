import { describe, it, expect } from 'vitest';
import {
  rollAnomalyRarity, rollAnomaly, getAnomalyRerollCost, getAnomalySlotCost,
  calcAnomalyBonuses, ANOMALY_RARITY_TABLE, ANOMALY_SLOT_COSTS_CROWNS, ANOMALY_MAX_SLOTS,
  ANOMALY_BONUS_TYPES, type Anomaly,
} from './anomalies';
import { RARITY_ORDER_ASC } from '@/types/game';
import { AFFINITY_ORDER } from './affinities';
import { SYNERGIES_LIST } from './synergies';

describe('ANOMALY_RARITY_TABLE', () => {
  it('les taux de drop des 10 raretés totalisent 100%', () => {
    const total = RARITY_ORDER_ASC.reduce((sum, r) => sum + ANOMALY_RARITY_TABLE[r].dropRate, 0);
    expect(total).toBeCloseTo(100, 6);
  });
});

describe('rollAnomalyRarity', () => {
  it('retourne toujours une rareté valide', () => {
    for (let i = 0; i < 300; i++) {
      expect(RARITY_ORDER_ASC).toContain(rollAnomalyRarity());
    }
  });
});

describe('rollAnomaly', () => {
  it('la valeur tirée reste dans la plage min-max de la rareté et du type de bonus', () => {
    for (let i = 0; i < 500; i++) {
      const a = rollAnomaly();
      const [min, max] = ANOMALY_RARITY_TABLE[a.rarity].ranges[a.bonusType];
      expect(a.value).toBeGreaterThanOrEqual(min);
      expect(a.value).toBeLessThanOrEqual(max);
    }
  });

  it('bonusType tiré appartient toujours à la liste des types possibles', () => {
    for (let i = 0; i < 200; i++) {
      expect(ANOMALY_BONUS_TYPES).toContain(rollAnomaly().bonusType);
    }
  });

  // Régression : `target` DOIT être `null` (jamais `undefined`) quand le bonus
  // n'a pas de cible — un objet avec `target: undefined` dans un tableau fait
  // planter setDoc() côté Firestore ("Unsupported field value: undefined").
  it('target est null (jamais undefined) pour les bonus sans cible', () => {
    for (let i = 0; i < 300; i++) {
      const a = rollAnomaly();
      if (a.bonusType !== 'synergyBoost' && a.bonusType !== 'typeDamage') {
        expect(a.target).toBeNull();
        expect('target' in a).toBe(true); // clé bien présente, jamais omise avec une valeur undefined
      }
    }
  });

  it('target est un univers connu pour synergyBoost', () => {
    let found = false;
    for (let i = 0; i < 500 && !found; i++) {
      const a = rollAnomaly();
      if (a.bonusType === 'synergyBoost') {
        found = true;
        expect(SYNERGIES_LIST.map(s => s.universe)).toContain(a.target);
      }
    }
    expect(found).toBe(true);
  });

  it('target est une affinité connue pour typeDamage', () => {
    let found = false;
    for (let i = 0; i < 500 && !found; i++) {
      const a = rollAnomaly();
      if (a.bonusType === 'typeDamage') {
        found = true;
        expect(AFFINITY_ORDER).toContain(a.target);
      }
    }
    expect(found).toBe(true);
  });

  it('chaque anomalie tirée a un id unique', () => {
    const ids = new Set(Array.from({ length: 50 }, () => rollAnomaly().id));
    expect(ids.size).toBe(50);
  });

  it('une anomalie tirée n\'est jamais verrouillée par défaut', () => {
    expect(rollAnomaly().locked).toBe(false);
  });
});

describe('getAnomalyRerollCost', () => {
  it('coûte 1 jeton sans verrou', () => {
    expect(getAnomalyRerollCost(0)).toBe(1);
  });

  it('double à chaque anomalie verrouillée', () => {
    expect(getAnomalyRerollCost(1)).toBe(2);
    expect(getAnomalyRerollCost(2)).toBe(4);
    expect(getAnomalyRerollCost(3)).toBe(8);
  });
});

describe('getAnomalySlotCost', () => {
  it('renvoie le coût du 2e emplacement à 1 slot possédé', () => {
    expect(getAnomalySlotCost(1)).toBe(ANOMALY_SLOT_COSTS_CROWNS[0]);
  });

  it('renvoie null une fois ANOMALY_MAX_SLOTS atteint', () => {
    expect(getAnomalySlotCost(ANOMALY_MAX_SLOTS)).toBeNull();
  });

  it('les coûts sont strictement croissants', () => {
    for (let i = 1; i < ANOMALY_SLOT_COSTS_CROWNS.length; i++) {
      expect(ANOMALY_SLOT_COSTS_CROWNS[i]).toBeGreaterThan(ANOMALY_SLOT_COSTS_CROWNS[i - 1]);
    }
  });
});

function makeAnomaly(overrides: Partial<Anomaly>): Anomaly {
  return { id: 'a', rarity: 'C', bonusType: 'globalDps', value: 10, target: null, locked: false, ...overrides };
}

describe('calcAnomalyBonuses', () => {
  it('sans anomalie, tous les multiplicateurs sont neutres', () => {
    const b = calcAnomalyBonuses([]);
    expect(b.globalDpsMult).toBe(1);
    expect(b.goldGainMult).toBe(1);
    expect(b.gachaCostReductionPct).toBe(0);
    expect(b.upgradeCostReductionPct).toBe(0);
    expect(b.synergyBoostByUniverse).toEqual({});
  });

  it('additionne plusieurs bonus globalDps en multiplicateur', () => {
    const b = calcAnomalyBonuses([makeAnomaly({ bonusType: 'globalDps', value: 5 }), makeAnomaly({ bonusType: 'globalDps', value: 2.5 })]);
    expect(b.globalDpsMult).toBeCloseTo(1.075, 10);
  });

  it('additionne les bonus goldGain', () => {
    const b = calcAnomalyBonuses([makeAnomaly({ bonusType: 'goldGain', value: 50 })]);
    expect(b.goldGainMult).toBeCloseTo(1.5, 10);
  });

  it('plafonne la réduction de coût gacha à 90%', () => {
    const many = Array.from({ length: 20 }, () => makeAnomaly({ bonusType: 'gachaCostReduction', value: 10 }));
    const b = calcAnomalyBonuses(many);
    expect(b.gachaCostReductionPct).toBe(0.9);
  });

  it('plafonne la réduction de coût amélioration à 90%', () => {
    const many = Array.from({ length: 20 }, () => makeAnomaly({ bonusType: 'upgradeCostReduction', value: 20 }));
    const b = calcAnomalyBonuses(many);
    expect(b.upgradeCostReductionPct).toBe(0.9);
  });

  it('cumule le boost de synergie par univers ciblé, sans affecter les autres univers', () => {
    const b = calcAnomalyBonuses([
      makeAnomaly({ bonusType: 'synergyBoost', value: 20, target: 'Dragon Ball Z' }),
      makeAnomaly({ bonusType: 'synergyBoost', value: 5, target: 'Dragon Ball Z' }),
      makeAnomaly({ bonusType: 'synergyBoost', value: 30, target: 'One Piece' }),
    ]);
    expect(b.synergyBoostByUniverse['Dragon Ball Z']).toBeCloseTo(0.25, 10);
    expect(b.synergyBoostByUniverse['One Piece']).toBeCloseTo(0.30, 10);
  });

  it('cumule les dégâts de type par affinité ciblée', () => {
    const b = calcAnomalyBonuses([
      makeAnomaly({ bonusType: 'typeDamage', value: 10, target: 'chaos' }),
      makeAnomaly({ bonusType: 'typeDamage', value: 15, target: 'chaos' }),
    ]);
    expect(b.typeDamageByAffinity.chaos).toBeCloseTo(0.25, 10);
  });
});
