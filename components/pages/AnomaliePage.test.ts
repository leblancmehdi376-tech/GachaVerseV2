import { describe, it, expect } from 'vitest';
import { targetLabel, formatBonusRange } from './AnomaliePage';
import type { Anomaly } from '@/lib/game/anomalies';
import { AFFINITY_CONFIG, AFFINITY_ORDER } from '@/lib/game/affinities';
import { SYNERGIES_LIST } from '@/lib/game/synergies';

// On s'appuie sur le vrai contenu du jeu (AFFINITY_CONFIG / SYNERGIES_LIST)
// sans coder en dur d'id précis — cf. convention de CompanionsPage.test.ts.
function makeAnomaly(overrides: Partial<Anomaly> = {}): Anomaly {
  return { id: 'a', rarity: 'C', bonusType: 'goldGain', value: 1, target: null, locked: false, ...overrides };
}

describe('targetLabel', () => {
  it('retourne null quand la anomalie n’a pas de cible', () => {
    expect(targetLabel(makeAnomaly({ target: null }))).toBeNull();
  });

  it("affiche icône + label de l'affinité pour un bonus typeDamage", () => {
    const affinity = AFFINITY_ORDER[0];
    const cfg = AFFINITY_CONFIG[affinity];
    const label = targetLabel(makeAnomaly({ bonusType: 'typeDamage', target: affinity }));
    expect(label).toBe(`${cfg.icon} ${cfg.label}`);
  });

  it("affiche icône + univers pour un bonus synergyBoost dont l'univers a une synergie connue", () => {
    const syn = SYNERGIES_LIST[0];
    const label = targetLabel(makeAnomaly({ bonusType: 'synergyBoost', target: syn.universe }));
    expect(label).toBe(`${syn.icon} ${syn.universe}`);
  });

  it("retombe sur la cible brute pour un bonus synergyBoost dont l'univers n'a pas de synergie", () => {
    const label = targetLabel(makeAnomaly({ bonusType: 'synergyBoost', target: 'Univers Inconnu Sans Synergie' }));
    expect(label).toBe('Univers Inconnu Sans Synergie');
  });

  it("retourne null pour un bonus sans cible (ex: globalDps) même si target est renseigné", () => {
    expect(targetLabel(makeAnomaly({ bonusType: 'globalDps', target: 'peu importe' }))).toBeNull();
  });
});

describe('formatBonusRange', () => {
  it('affiche une valeur unique quand min === max', () => {
    expect(formatBonusRange('gachaCostReduction', [4, 4])).toBe('+4.0%');
  });

  it('affiche une plage min-max quand min !== max', () => {
    expect(formatBonusRange('goldGain', [1, 6])).toBe('+1% – +6%');
  });

  it('utilise 2 décimales pour globalDps', () => {
    expect(formatBonusRange('globalDps', [0.1, 0.3])).toBe('+0.10% – +0.30%');
  });

  it('utilise 1 décimale pour gachaCostReduction et upgradeCostReduction', () => {
    expect(formatBonusRange('gachaCostReduction', [0.1, 0.1])).toBe('+0.1%');
    expect(formatBonusRange('upgradeCostReduction', [0.2, 0.2])).toBe('+0.2%');
  });

  it('utilise 0 décimale pour les autres types (goldGain, typeDamage, synergyBoost)', () => {
    expect(formatBonusRange('typeDamage', [1, 2])).toBe('+1% – +2%');
  });
});
