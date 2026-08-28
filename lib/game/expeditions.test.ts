import { describe, it, expect } from 'vitest';
import {
  EXPEDITION_DEFS, ExpeditionDef, hasRealUniverse,
  computeDropAttempts, rollExpeditionRewards, getDropTiers,
} from './expeditions';
import { CHARACTER_POOL } from './characters';
import { bnFromNumber } from './bignum';

// Construit une ExpeditionDef minimale valide pour isoler les tests de
// formules (rollExpeditionRewards/computeDropAttempts/getDropTiers) des
// contraintes de EXPEDITION_DEFS (palier réel, univers réel, etc.).
function makeDef(overrides: Partial<ExpeditionDef> & { rewards: ExpeditionDef['rewards'] }): ExpeditionDef {
  return {
    id: 'test_def', name: 'Test', icon: '🧪', description: '', universe: 'TestUnivers',
    duration: 3600, slots: 1, palierRequired: 1, minTeamDps: 100,
    ...overrides,
  };
}

describe('EXPEDITION_DEFS — cohérence globale', () => {
  it('a des ids uniques', () => {
    const ids = EXPEDITION_DEFS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a des champs de base valides pour chaque expédition (durée, slots, palier, fourchettes de récompense)', () => {
    for (const def of EXPEDITION_DEFS) {
      expect(def.duration).toBeGreaterThan(0);
      expect(def.slots).toBeGreaterThanOrEqual(1);
      expect(def.palierRequired).toBeGreaterThanOrEqual(1);
      expect(def.minTeamDps).toBeGreaterThanOrEqual(0);
      expect(def.rewards.coinsMax).toBeGreaterThanOrEqual(def.rewards.coinsMin);
      if (def.rewards.gemsMin !== undefined) {
        expect(def.rewards.gemsMax ?? def.rewards.gemsMin).toBeGreaterThanOrEqual(def.rewards.gemsMin);
      }
      if (def.rewards.dropChance !== undefined) {
        expect(def.rewards.dropChance).toBeGreaterThanOrEqual(0);
        expect(def.rewards.dropChance).toBeLessThanOrEqual(1);
      }
      // dropGems et dropId sont deux variantes exclusives du même mécanisme de
      // drop (item vs gemmes) — jamais les deux en même temps sur une expédition.
      if (def.rewards.dropGems) expect(def.rewards.dropId).toBeUndefined();
    }
  });

  it("les expéditions sans univers de personnage réel (contrainte de TYPE, pas de personnage) ne correspondent à aucun univers de CHARACTER_POOL", () => {
    for (const def of EXPEDITION_DEFS) {
      if (!hasRealUniverse(def)) {
        expect(CHARACTER_POOL.some(c => c.universe === def.universe)).toBe(false);
      }
    }
  });
});

describe('hasRealUniverse', () => {
  it("retourne true quand l'univers correspond à un univers de personnage existant", () => {
    const realUniverse = CHARACTER_POOL.find(c => !!c.universe)!.universe!;
    expect(hasRealUniverse(makeDef({ universe: realUniverse, rewards: { coinsMin: 0, coinsMax: 0 } }))).toBe(true);
  });

  it("retourne false pour un univers fictif (aucune contrainte de personnage, seulement de type)", () => {
    expect(hasRealUniverse(makeDef({ universe: 'Mine', rewards: { coinsMin: 0, coinsMax: 0 } }))).toBe(false);
  });
});

describe('Mine de Gemme — les 3 expéditions de farm de gemmes', () => {
  const H = 3600;
  const specs: Array<{ id: string; duration: number; gemsPerSuccess: number }> = [
    { id: 'mine_gemme',          duration: 15 * 60, gemsPerSuccess: 1 },
    { id: 'mine_gemme_profonde', duration: H,        gemsPerSuccess: 2 },
    { id: 'mine_gemme_abyssale', duration: 8 * H,     gemsPerSuccess: 4 },
  ];

  it('existent avec le bon cooldown, le bon gain par succès et 50% de chance de succès', () => {
    for (const spec of specs) {
      const def = EXPEDITION_DEFS.find(d => d.id === spec.id);
      expect(def, `expédition ${spec.id} introuvable`).toBeDefined();
      expect(def!.duration).toBe(spec.duration);
      expect(def!.rewards.dropChance).toBe(0.5);
      expect(def!.rewards.dropGems).toBe(true);
      expect(def!.rewards.dropGemsAmount).toBe(spec.gemsPerSuccess);
    }
  });

  it("n'ont pas de contrainte de personnage (aucun univers réel) mais une contrainte de type", () => {
    for (const spec of specs) {
      const def = EXPEDITION_DEFS.find(d => d.id === spec.id)!;
      expect(hasRealUniverse(def)).toBe(false);
    }
  });

  it("n'ont pas de dropQuantityCap : les tentatives de drop sont illimitées (scalent avec le DPS d'équipe)", () => {
    for (const spec of specs) {
      const def = EXPEDITION_DEFS.find(d => d.id === spec.id)!;
      expect(def.rewards.dropQuantityCap).toBeUndefined();
    }
  });

  it("ne donnent aucun objet spécial, uniquement des gemmes (pas de dropId)", () => {
    for (const spec of specs) {
      const def = EXPEDITION_DEFS.find(d => d.id === spec.id)!;
      expect(def.rewards.dropId).toBeUndefined();
    }
  });
});

describe('Caverne de Cristal (Subnautica) — a désormais des tentatives supplémentaires', () => {
  it("n'a plus de gain de gemmes garanti (gemsMin) : les gemmes passent par le mécanisme de drop, comme les Mines de Gemme", () => {
    const def = EXPEDITION_DEFS.find(d => d.id === 'cave_cristal')!;
    expect(def.rewards.gemsMin).toBeUndefined();
    expect(def.rewards.dropGems).toBe(true);
    expect(def.rewards.dropChance).toBeGreaterThan(0);
  });

  it('accorde plus de tentatives de drop quand le DPS d\'équipe dépasse le seuil minimum', () => {
    const def = EXPEDITION_DEFS.find(d => d.id === 'cave_cristal')!;
    const baseAttempts = computeDropAttempts(def, bnFromNumber(def.minTeamDps));
    const highDpsAttempts = computeDropAttempts(def, bnFromNumber(def.minTeamDps * 1_000));
    expect(highDpsAttempts).toBeGreaterThan(baseAttempts);
  });
});

describe('computeDropAttempts', () => {
  it('accorde exactement la quantité de base au seuil minTeamDps', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropChance: 0.5, dropQuantity: 2 } });
    expect(computeDropAttempts(def, bnFromNumber(100))).toBe(2);
  });

  it('augmente les tentatives à rendements décroissants (×10 DPS -> +1 tentative)', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropChance: 0.5, dropQuantity: 1 } });
    expect(computeDropAttempts(def, bnFromNumber(100))).toBe(1);
    expect(computeDropAttempts(def, bnFromNumber(1_000))).toBe(2);
    expect(computeDropAttempts(def, bnFromNumber(10_000))).toBe(3);
  });

  it('respecte dropQuantityCap quand il est défini', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropChance: 0.5, dropQuantity: 1, dropQuantityCap: 2 } });
    expect(computeDropAttempts(def, bnFromNumber(1_000_000_000))).toBe(2);
  });

  it("n'est jamais plafonné sans dropQuantityCap, même à très haut DPS (ex: Mine de Gemme Abyssale)", () => {
    const def = EXPEDITION_DEFS.find(d => d.id === 'mine_gemme_abyssale')!;
    expect(computeDropAttempts(def, bnFromNumber(def.minTeamDps * 1_000_000))).toBeGreaterThan(5);
  });
});

describe('rollExpeditionRewards', () => {
  it('les pièces restent toujours dans [coinsMin, coinsMax]', () => {
    const def = makeDef({ rewards: { coinsMin: 100, coinsMax: 200 } });
    for (let i = 0; i < 200; i++) {
      const { coins } = rollExpeditionRewards(def, bnFromNumber(0));
      expect(coins).toBeGreaterThanOrEqual(100);
      expect(coins).toBeLessThanOrEqual(200);
    }
  });

  it('les gemmes à taux fixe (gemsMin/gemsMax) restent dans leur fourchette et sont toujours accordées', () => {
    const def = makeDef({ rewards: { coinsMin: 0, coinsMax: 0, gemsMin: 5, gemsMax: 10 } });
    for (let i = 0; i < 200; i++) {
      const { gems } = rollExpeditionRewards(def, bnFromNumber(0));
      expect(gems).toBeGreaterThanOrEqual(5);
      expect(gems).toBeLessThanOrEqual(10);
    }
  });

  it("le drop d'objet (dropId) reste borné par le nombre de tentatives et n'affecte jamais les gemmes", () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropId: 'x', dropChance: 0.5, dropQuantity: 3 } });
    for (let i = 0; i < 100; i++) {
      const { dropGained, gems } = rollExpeditionRewards(def, bnFromNumber(100));
      expect(dropGained).toBeGreaterThanOrEqual(0);
      expect(dropGained).toBeLessThanOrEqual(3);
      expect(gems).toBe(0);
    }
  });

  it("dropGems:true fait gagner des gemmes via la même mécanique que le drop d'objets (jamais dropGained)", () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropChance: 0.5, dropQuantity: 1, dropGems: true, dropGemsAmount: 3 } });
    let sawZero = false, sawReward = false;
    for (let i = 0; i < 300; i++) {
      const { gems, dropGained } = rollExpeditionRewards(def, bnFromNumber(100));
      expect(dropGained).toBe(0);
      expect([0, 3]).toContain(gems);
      if (gems === 0) sawZero = true;
      if (gems === 3) sawReward = true;
    }
    // Sur 300 tirages à 50%, les deux issues doivent forcément apparaître —
    // sinon la probabilité n'est pas appliquée (ex: gain systématique).
    expect(sawZero).toBe(true);
    expect(sawReward).toBe(true);
  });

  it('avec plusieurs tentatives (DPS très supérieur au seuil), dropGems peut accorder un multiple du montant par succès', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropChance: 1, dropQuantity: 1, dropGems: true, dropGemsAmount: 2 } });
    const highDps = bnFromNumber(100_000);
    const attempts = computeDropAttempts(def, highDps);
    expect(attempts).toBeGreaterThan(1);
    const { gems, dropGained } = rollExpeditionRewards(def, highDps);
    expect(gems).toBe(attempts * 2); // dropChance:1 -> toutes les tentatives réussissent
    expect(dropGained).toBe(0);
  });
});

describe('getDropTiers', () => {
  it('retourne un palier par tentative jusqu\'au plafond quand dropQuantityCap est défini (item)', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropId: 'x', dropChance: 0.5, dropQuantity: 1, dropQuantityCap: 5 } });
    const tiers = getDropTiers(def);
    expect(tiers).toHaveLength(5);
    expect(tiers[0].qty).toBe(1);
    expect(tiers[4].qty).toBe(5);
  });

  it('fonctionne aussi pour dropGems (même mécanique que dropId)', () => {
    const def = makeDef({ minTeamDps: 100, rewards: { coinsMin: 0, coinsMax: 0, dropGems: true, dropGemsAmount: 2, dropChance: 0.5, dropQuantity: 1, dropQuantityCap: 3 } });
    expect(getDropTiers(def)).toHaveLength(3);
  });

  it('retourne un tableau vide sans dropQuantityCap (tentatives infinies, ex: les 3 expéditions Mine de Gemme)', () => {
    for (const id of ['mine_gemme', 'mine_gemme_profonde', 'mine_gemme_abyssale']) {
      const def = EXPEDITION_DEFS.find(d => d.id === id)!;
      expect(getDropTiers(def)).toEqual([]);
    }
  });

  it('retourne un tableau vide pour une expédition sans aucun drop (ni item ni gemmes)', () => {
    const def = makeDef({ rewards: { coinsMin: 0, coinsMax: 100 } });
    expect(getDropTiers(def)).toEqual([]);
  });
});
