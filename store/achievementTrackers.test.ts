import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { CHARACTER_POOL } from '@/lib/game/characters';
import {
  trackBossKills, trackBossCrowns, trackPalier, trackCoins, trackDps, trackCollection,
  trackEquippedTeam, trackKills, trackQuestsCompleted, trackUpgrades, trackGems, trackPrestige,
  trackVoidOrbs, trackUnlockedTitles, trackGachaPulls, trackShinyEditions, trackRank7, trackSynergyMax,
  trackCompadexCharacters, trackCompadexEquipment, trackCompadexBoth,
} from '@/store/achievementTrackers';

// Cible réelle lue dans lib/game/achievements.ts — jamais codée en dur ici,
// pour rester valide même si le contenu du jeu (paliers, roster...) change.
function targetOf(id: string) {
  return ACHIEVEMENTS.find(a => a.id === id)!.target;
}

function unlocked(id: string) {
  return !!useGameStore.getState().achievementUnlocked[id];
}

// Vérifie qu'un traqueur "à seuils" (plusieurs succès sur un même compteur
// croissant) débloque chaque succès exactement à sa vraie target, ni avant.
function expectThresholds(ids: string[], call: (n: number) => void) {
  const targets = ids.map(id => ({ id, target: targetOf(id) })).sort((a, b) => a.target - b.target);
  const maxTarget = targets[targets.length - 1].target;

  call(maxTarget - 1);
  for (const { id, target } of targets) {
    expect(unlocked(id)).toBe(target <= maxTarget - 1);
  }

  call(maxTarget);
  for (const { id } of targets) {
    expect(unlocked(id)).toBe(true);
  }
}

beforeEach(() => {
  useGameStore.getState().resetGame();
});

describe('trackBossKills / trackBossCrowns / trackPalier / trackCoins / trackDps', () => {
  it('trackBossKills débloque first_boss/bosses_5/20/67/100 à leurs vraies targets', () => {
    expectThresholds(['first_boss', 'bosses_5', 'bosses_20', 'bosses_67', 'bosses_100'], trackBossKills);
  });

  it('trackBossCrowns débloque crowns_50 à sa vraie target', () => {
    expectThresholds(['crowns_50'], trackBossCrowns);
  });

  it('trackPalier débloque palier_5/10/15/20/40 à leurs vraies targets', () => {
    expectThresholds(['palier_5', 'palier_10', 'palier_15', 'palier_20', 'palier_40'], trackPalier);
  });

  it('trackCoins débloque coins_100k/10m/1b/10b/100b à leurs vraies targets', () => {
    expectThresholds(['coins_100k', 'coins_10m', 'coins_1b', 'coins_10b', 'coins_100b'], trackCoins);
  });

  it('trackDps débloque dps_1000/1m/100m/1b à leurs vraies targets', () => {
    expectThresholds(['dps_1000', 'dps_1m', 'dps_100m', 'dps_1b'], trackDps);
  });
});

describe('trackKills / trackGachaPulls / trackQuestsCompleted / trackUpgrades — succès "de run"', () => {
  it('trackKills débloque les seuils sur le cumul brut quand aucun prestige n\'a eu lieu (baseline à 0)', () => {
    expectThresholds(['kills_1', 'kills_500', 'kills_5000', 'kills_50000', 'kills_500000', 'kills_1000000'], trackKills);
  });

  it('trackGachaPulls débloque les seuils sur le cumul brut quand aucun prestige n\'a eu lieu', () => {
    expectThresholds(['pull_1', 'pull_10', 'pull_100', 'pull_500', 'pull_1000', 'pull_5000'], trackGachaPulls);
  });

  it('trackQuestsCompleted débloque les seuils sur le cumul brut quand aucun prestige n\'a eu lieu', () => {
    expectThresholds(['quest_10', 'quest_20', 'quest_50', 'quest_100', 'quest_500'], trackQuestsCompleted);
  });

  it('trackUpgrades débloque les seuils sur le cumul brut quand aucun prestige n\'a eu lieu', () => {
    expectThresholds(['upgrade_10', 'upgrade_50', 'upgrade_200'], trackUpgrades);
  });

  it('trackKills retranche prestigeStatBaselines.totalKills pour ne suivre que la run courante', () => {
    useGameStore.setState({ prestigeStatBaselines: { totalKills: 1000, totalGachaPulls: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0 } });

    trackKills(1000); // cumul à vie == baseline → 0 ce run
    expect(unlocked('kills_1')).toBe(false);

    trackKills(1000 + targetOf('kills_1'));
    expect(unlocked('kills_1')).toBe(true);
  });

  it('trackGachaPulls, trackQuestsCompleted et trackUpgrades retranchent aussi leur baseline respective', () => {
    useGameStore.setState({
      prestigeStatBaselines: { totalKills: 0, totalGachaPulls: 200, totalQuestsCompleted: 90, totalUpgradesPerformed: 900 },
    });

    trackGachaPulls(200);
    trackQuestsCompleted(90);
    trackUpgrades(900);
    expect(unlocked('pull_1')).toBe(false);
    expect(unlocked('quest_10')).toBe(false);
    expect(unlocked('upgrade_10')).toBe(false);

    trackGachaPulls(200 + targetOf('pull_1'));
    trackQuestsCompleted(90 + targetOf('quest_10'));
    trackUpgrades(900 + targetOf('upgrade_10'));
    expect(unlocked('pull_1')).toBe(true);
    expect(unlocked('quest_10')).toBe(true);
    expect(unlocked('upgrade_10')).toBe(true);
  });

  it('ne descend jamais sous zéro si le cumul à vie est (improbablement) inférieur à la baseline', () => {
    useGameStore.setState({ prestigeStatBaselines: { totalKills: 500, totalGachaPulls: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0 } });

    expect(() => trackKills(100)).not.toThrow();
    expect(useGameStore.getState().getProgress('kills_1')).toBe(0);
  });
});

describe('trackCollection', () => {
  it('débloque collect_1/5/15/30 à leurs vraies targets sur ownedCount', () => {
    expectThresholds(['collect_1', 'collect_5', 'collect_15', 'collect_30'], n => trackCollection(n, false, false, CHARACTER_POOL.length));
  });

  it('collect_all ne se débloque que quand ownedCount atteint le roster réel (CHARACTER_POOL.length)', () => {
    const total = CHARACTER_POOL.length;

    trackCollection(total - 1, false, false, total);
    expect(unlocked('collect_all')).toBe(false);

    trackCollection(total, false, false, total);
    expect(unlocked('collect_all')).toBe(true);
  });

  it('legendary_1 et transcendant_1 ne se déclenchent que sur leur flag booléen dédié', () => {
    trackCollection(1, true, false, CHARACTER_POOL.length, 0);
    expect(unlocked('legendary_1')).toBe(true);
    expect(unlocked('transcendant_1')).toBe(false);

    trackCollection(1, false, true, CHARACTER_POOL.length, 1);
    expect(unlocked('transcendant_1')).toBe(true);
  });

  it('transcendant_3 suit transcendantCount jusqu\'à sa vraie target', () => {
    expectThresholds(['transcendant_3'], n => trackCollection(n, false, n > 0, CHARACTER_POOL.length, n));
  });
});

describe('trackEquippedTeam / trackGems / trackPrestige / trackVoidOrbs / trackUnlockedTitles', () => {
  it('trackEquippedTeam débloque equip_team à sa vraie target', () => {
    expectThresholds(['equip_team'], trackEquippedTeam);
  });

  it('trackGems débloque gems_1000 à sa vraie target', () => {
    expectThresholds(['gems_1000'], trackGems);
  });

  it('trackGems retient le pic de gemmes jamais atteint (Math.max de setProgress), pas le solde courant', () => {
    trackGems(targetOf('gems_1000'));
    expect(unlocked('gems_1000')).toBe(true);

    trackGems(0); // le joueur dépense ses gemmes ensuite

    expect(unlocked('gems_1000')).toBe(true);
    expect(useGameStore.getState().getProgress('gems_1000')).toBe(targetOf('gems_1000'));
  });

  it('trackPrestige débloque prestige_1/10/25 à leurs vraies targets', () => {
    expectThresholds(['prestige_1', 'prestige_10', 'prestige_25'], trackPrestige);
  });

  it('trackVoidOrbs débloque orbs_30 à sa vraie target', () => {
    expectThresholds(['orbs_30'], trackVoidOrbs);
  });

  it('trackUnlockedTitles débloque titles_25 à sa vraie target', () => {
    expectThresholds(['titles_25'], trackUnlockedTitles);
  });
});

describe('trackShinyEditions', () => {
  it('gold_1 / diamond_1 / trio_perfect ne se déclenchent que sur leur flag booléen respectif', () => {
    trackShinyEditions(0, true, false, 0, false, 0);
    expect(unlocked('gold_1')).toBe(true);
    expect(unlocked('diamond_1')).toBe(false);
    expect(unlocked('trio_perfect')).toBe(false);

    trackShinyEditions(0, false, true, 0, false, 0);
    expect(unlocked('diamond_1')).toBe(true);

    trackShinyEditions(0, false, false, 0, true, 0);
    expect(unlocked('trio_perfect')).toBe(true);
  });

  it('shiny_10 suit le nombre de cartes or+diamant jusqu\'à sa vraie target', () => {
    expectThresholds(['shiny_10'], n => trackShinyEditions(n, false, false, 0, false, 0));
  });

  it('diamond_3 et diamond_10 suivent le nombre de diamants uniques jusqu\'à leurs vraies targets', () => {
    expectThresholds(['diamond_3', 'diamond_10'], n => trackShinyEditions(0, false, false, n, false, 0));
  });

  it('pantheon_5 suit le nombre de panthéons jusqu\'à sa vraie target', () => {
    expectThresholds(['pantheon_5'], n => trackShinyEditions(0, false, false, 0, false, n));
  });
});

describe('trackRank7 / trackSynergyMax', () => {
  it('rank7_1 et rank7_5 suivent le nombre de persos rang 7★ jusqu\'à leurs vraies targets', () => {
    expectThresholds(['rank7_1', 'rank7_5'], n => trackRank7(n, false));
  });

  it('rank7_team ne se déclenche que si fullTeamRank7 est vrai', () => {
    trackRank7(0, false);
    expect(unlocked('rank7_team')).toBe(false);

    trackRank7(0, true);
    expect(unlocked('rank7_team')).toBe(true);
  });

  it('trackSynergyMax ne débloque que si hasMaxSynergy est vrai, et un rappel à false ne régresse pas', () => {
    trackSynergyMax(false);
    expect(unlocked('synergy_max')).toBe(false);

    trackSynergyMax(true);
    expect(unlocked('synergy_max')).toBe(true);

    trackSynergyMax(false); // ex: équipe démontée ensuite
    expect(unlocked('synergy_max')).toBe(true);
  });
});

describe('trackCompadexCharacters / trackCompadexEquipment / trackCompadexBoth', () => {
  it('trackCompadexCharacters débloque compadex_char_25/50/75/100 à leurs vraies targets dynamiques', () => {
    expectThresholds(['compadex_char_25', 'compadex_char_50', 'compadex_char_75', 'compadex_char_100'], trackCompadexCharacters);
  });

  it('trackCompadexEquipment débloque compadex_equip_25/50/75/100 à leurs vraies targets dynamiques', () => {
    expectThresholds(['compadex_equip_25', 'compadex_equip_50', 'compadex_equip_75', 'compadex_equip_100'], trackCompadexEquipment);
  });

  it("compadex_both_100 ne se débloque que quand les DEUX Compadex sont complets, pas un seul", () => {
    trackCompadexBoth(true, false);
    expect(unlocked('compadex_both_100')).toBe(false);
    expect(useGameStore.getState().getProgress('compadex_both_100')).toBe(1);

    trackCompadexBoth(true, true);
    expect(unlocked('compadex_both_100')).toBe(true);
  });
});
