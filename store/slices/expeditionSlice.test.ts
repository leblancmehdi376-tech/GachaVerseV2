import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { ActiveExpedition } from '@/store/gameStore.types';
import { backfillDefAffinities, initialDefAffinities } from './expeditionSlice';
import { EXPEDITION_DEFS, hasRealUniverse } from '@/lib/game/expeditions';
import { AFFINITY_ORDER } from '@/lib/game/affinities';
import { bnToNumber } from '@/lib/game/bignum';

describe('backfillDefAffinities', () => {
  it("attribue un type à chaque expédition sans univers de personnage réel", () => {
    const out = backfillDefAffinities({});
    for (const def of EXPEDITION_DEFS) {
      if (!hasRealUniverse(def)) {
        expect(AFFINITY_ORDER).toContain(out[def.id]);
      } else {
        expect(out[def.id]).toBeUndefined();
      }
    }
  });

  it("ne modifie jamais une entrée déjà présente — le type ne doit changer qu'au claim de l'expédition, pas à chaque lecture/rechargement", () => {
    const existing = { mine_gemme: 'chaos' as const };
    const out = backfillDefAffinities(existing);
    expect(out.mine_gemme).toBe('chaos');
  });

  it("complète uniquement les entrées manquantes (ex: une expédition ajoutée après la dernière sauvegarde d'un joueur), sans toucher aux autres", () => {
    const existing = { mine_gemme: 'ordre' as const };
    const out = backfillDefAffinities(existing);
    expect(out.mine_gemme).toBe('ordre');
    expect(out.mine_gemme_profonde).toBeDefined();
    expect(out.mine_gemme_abyssale).toBeDefined();
  });

  it('est idempotent : ré-appliquer le backfill sur son propre résultat ne change plus rien', () => {
    const once = backfillDefAffinities({});
    const twice = backfillDefAffinities(once);
    expect(twice).toEqual(once);
  });
});

describe('initialDefAffinities', () => {
  it('couvre exactement les mêmes expéditions que backfillDefAffinities({})', () => {
    const initial = initialDefAffinities();
    const backfilled = backfillDefAffinities({});
    expect(Object.keys(initial).sort()).toEqual(Object.keys(backfilled).sort());
  });
});

describe('getExpeditionAffinity — stabilité du type requis', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("reste identique à travers plusieurs lectures tant qu'aucune expédition n'a été réclamée", () => {
    const first = useGameStore.getState().getExpeditionAffinity('mine_gemme');
    for (let i = 0; i < 20; i++) {
      expect(useGameStore.getState().getExpeditionAffinity('mine_gemme')).toBe(first);
    }
  });
});

describe('claimExpedition — Mine de Gemme', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  function injectFinishedExpedition(defId: string): ActiveExpedition {
    const exp: ActiveExpedition = {
      id: 'exp_test', defId, characterIds: [],
      startTime: Date.now() - 10_000, endTime: Date.now() - 1_000, claimed: false,
    };
    useGameStore.setState({ expeditionActive: [exp] });
    return exp;
  }

  it("ne change le type requis QUE lorsque l'expédition est réellement réclamée, jamais lors des lectures qui précèdent", () => {
    const before = useGameStore.getState().getExpeditionAffinity('mine_gemme');
    useGameStore.getState().getExpeditionAffinity('mine_gemme');
    useGameStore.getState().getExpeditionAffinity('mine_gemme');
    expect(useGameStore.getState().getExpeditionAffinity('mine_gemme')).toBe(before);

    injectFinishedExpedition('mine_gemme');
    useGameStore.getState().claimExpedition('exp_test');

    // Le claim retire l'expédition active et re-tire un type pour la
    // prochaine tentative (peut retomber sur la même valeur par hasard, donc
    // on vérifie juste qu'un type valide reste assigné, pas qu'il diffère).
    expect(useGameStore.getState().expeditionActive).toEqual([]);
    expect(AFFINITY_ORDER).toContain(useGameStore.getState().getExpeditionAffinity('mine_gemme'));
  });

  it('crédite des gemmes via le mécanisme de drop (0 ou dropGemsAmount, jamais une valeur intermédiaire) sans jamais toucher expeditionDropInventory', () => {
    const def = EXPEDITION_DEFS.find(d => d.id === 'mine_gemme')!;
    const gemsBefore = useGameStore.getState().nekoGems;

    injectFinishedExpedition('mine_gemme');
    useGameStore.getState().claimExpedition('exp_test');

    const gained = useGameStore.getState().nekoGems - gemsBefore;
    expect([0, def.rewards.dropGemsAmount]).toContain(gained);
    expect(useGameStore.getState().expeditionDropInventory).toEqual({});
  });

  it('crédite des pièces dans la fourchette de la définition', () => {
    const def = EXPEDITION_DEFS.find(d => d.id === 'mine_gemme')!;

    injectFinishedExpedition('mine_gemme');
    useGameStore.getState().claimExpedition('exp_test');

    const coins = Math.round(bnToNumber(useGameStore.getState().pixelCoins));
    expect(coins).toBeGreaterThanOrEqual(def.rewards.coinsMin);
    expect(coins).toBeLessThanOrEqual(def.rewards.coinsMax);
  });
});
