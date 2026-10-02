import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { killAchievementPatch, bossFailPatch, gachaStatsPatch, addStats, maxStats } from './achievementStats';
import {
  ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_SERIES, ACHIEVEMENT_ENTRIES, CHAL, EGG, STAT, EV_PERFECT, WORLD_TOTAL, ALL_SECRET_KEYS,
  computeDerivedStats, getMasteryMilestones, getMasteryPct, getMasteryDpsBonus, getMasteryDpsMult, MASTERY_RARITY_MULT, bankMasteryLevel, pageStatKey, EXPLORABLE_PAGES,
} from './achievements';
import { CHARACTER_POOL, getCharacterById } from './characters';
import { getPalierConfig } from './paliers';
import { TITLE_GOLD_BONUS_PCT } from './titles';
import { trackAchievementStats, trackMastery } from '@/store/achievementTrackers';
import { mergeMonotonicState } from '@/lib/firebase/cloudSaveSync';
import { bnToNumber } from './bignum';

const commons = CHARACTER_POOL.filter(c => c.rarity === 'C' && !c.isHero).slice(0, 4).map(c => c.id);
const timer = (palier: number) => getPalierConfig(palier).bossTimerSeconds;

function bossState(over: Partial<Parameters<typeof killAchievementPatch>[0]> = {}) {
  return { equippedTeam: [commons[0], null, null, null], palier: 1, bossTimeLeft: timer(1) - 45, ultUsedThisFight: ['x'], ...over };
}

describe('définitions des succès', () => {
  it('ont des id uniques et une catégorie connue', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const cats = new Set(ACHIEVEMENT_CATEGORIES.map(c => c.id));
    for (const a of ACHIEVEMENTS) expect(cats.has(a.category)).toBe(true);
  });

  it('chaque série regroupe des succès existants, homogènes (catégorie + reset au Prestige), sans doublon', () => {
    const seen = new Set<string>();
    for (const series of ACHIEVEMENT_SERIES) {
      const levels = series.ids.map(id => ACHIEVEMENTS.find(a => a.id === id)!);
      expect(levels.every(Boolean)).toBe(true);
      expect(new Set(levels.map(a => a.category)).size).toBe(1);
      expect(new Set(levels.map(a => !!a.resetsOnPrestige)).size).toBe(1);
      for (const id of series.ids) { expect(seen.has(id)).toBe(false); seen.add(id); }
    }
    // Chaque succès apparaît dans exactement une carte.
    expect(ACHIEVEMENT_ENTRIES.flatMap(e => e.levels).length).toBe(ACHIEVEMENTS.length);
  });

  it('chaque catégorie contient au moins un succès', () => {
    for (const c of ACHIEVEMENT_CATEGORIES) {
      expect(ACHIEVEMENTS.some(a => a.category === c.id)).toBe(true);
    }
  });

  it('chaque titre de récompense a un bonus d\'or défini', () => {
    for (const a of ACHIEVEMENTS) {
      if (a.reward?.type === 'title') expect(TITLE_GOLD_BONUS_PCT[a.reward.value as string]).toBeGreaterThan(0);
    }
  });
});

describe('killAchievementPatch', () => {
  it('compte un combat pour chaque personnage équipé, sans toucher aux stats hors boss', () => {
    const patch = killAchievementPatch({ ...bossState(), equippedTeam: [commons[0], commons[1], null, null] }, false);
    expect(patch.charMastery[commons[0]]).toEqual({ k: 1, w: 0, lv: 0, f: 0 });
    expect(patch.charMastery[commons[1]].k).toBe(1);
    expect(patch.achievementStats).toBeUndefined();
  });

  it('sur un boss : +1 victoire, série, et aucun défi non rempli', () => {
    const patch = killAchievementPatch(bossState(), true);
    expect(patch.charMastery[commons[0]].w).toBe(1);
    expect(patch.achievementStats![STAT.bossStreakCur]).toBe(1);
    expect(patch.achievementStats![STAT.bossStreakMax]).toBe(1);
    for (const key of Object.values(CHAL)) expect(patch.achievementStats![key]).toBeUndefined();
  });

  it('valide Victoire Parfaite (≤ 10 s) et Sur le Fil (1 s restante)', () => {
    expect(killAchievementPatch(bossState({ bossTimeLeft: timer(1) - 10 }), true).achievementStats![CHAL.flawless]).toBe(1);
    expect(killAchievementPatch(bossState({ bossTimeLeft: 1 }), true).achievementStats![CHAL.clutch]).toBe(1);
  });

  it('valide les défis d\'équipe (4 Communs, solo) seulement au palier requis', () => {
    const four = killAchievementPatch(bossState({ equippedTeam: commons, palier: 5, bossTimeLeft: timer(5) - 45 }), true);
    expect(four.achievementStats![CHAL.commons]).toBe(1);
    const fourLow = killAchievementPatch(bossState({ equippedTeam: commons, palier: 4, bossTimeLeft: timer(4) - 45 }), true);
    expect(fourLow.achievementStats![CHAL.commons]).toBeUndefined();
    const solo = killAchievementPatch(bossState({ palier: 10, bossTimeLeft: timer(10) - 45 }), true);
    expect(solo.achievementStats![CHAL.solo]).toBe(1);
  });

  it('valide Sans Filet (sans ultime, palier 15+) et Difficulté Maximale (dernier monde)', () => {
    const noUlt = killAchievementPatch(bossState({ palier: 15, bossTimeLeft: timer(15) - 45, ultUsedThisFight: [] }), true);
    expect(noUlt.achievementStats![CHAL.noUlt]).toBe(1);
    const max = killAchievementPatch(bossState({ palier: WORLD_TOTAL, bossTimeLeft: timer(WORLD_TOTAL) - 45 }), true);
    expect(max.achievementStats![CHAL.maxDiff]).toBe(1);
  });

  it('Parcours Immaculé échoue si le palier a déjà connu une défaite', () => {
    const base = bossState({ palier: 20, bossTimeLeft: timer(20) - 25 });
    expect(killAchievementPatch(base, true).achievementStats![CHAL.clean]).toBe(1);
    const failed = { ...base, ...bossFailPatch({ palier: 20 }) };
    expect(killAchievementPatch(failed, true).achievementStats![CHAL.clean]).toBeUndefined();
  });

  it('une défaite remet la série en cours à zéro mais garde le record', () => {
    let stats: Record<string, number> = {};
    for (let i = 0; i < 3; i++) stats = killAchievementPatch({ ...bossState(), achievementStats: stats }, true).achievementStats!;
    stats = bossFailPatch({ palier: 1, achievementStats: stats }).achievementStats;
    expect(stats[STAT.bossStreakCur]).toBe(0);
    expect(stats[STAT.bossStreakMax]).toBe(3);
  });
});

describe('gachaStatsPatch', () => {
  const ssr = CHARACTER_POOL.filter(c => c.rarity === 'L').slice(0, 3).map(c => c.id);
  const top = CHARACTER_POOL.filter(c => c.rarity === 'T').slice(0, 2).map(c => c.id);

  it('compte les séries de SSR d\'affilée, cassées par un tirage inférieur', () => {
    let s = gachaStatsPatch({}, [ssr[0], ssr[1]], 40, false);
    expect(s[STAT.gachaSsrCur]).toBe(2);
    s = gachaStatsPatch(s, [commons[0]], 40, false);
    expect(s[STAT.gachaSsrCur]).toBe(0);
    s = gachaStatsPatch(s, ssr, 40, false);
    expect(s[STAT.gachaSsrMax]).toBe(3);
  });

  it('détecte les tirages < 1 % et le miracle (2 dans un même multi)', () => {
    const single = gachaStatsPatch({}, [top[0]], 40, false);
    expect(single[STAT.gachaLowRate]).toBe(1);
    expect(single[STAT.gachaMiracle]).toBeUndefined();
    const multi = gachaStatsPatch({}, [...top, commons[0]], 40, false);
    expect(multi[STAT.gachaMiracle]).toBe(1);
  });

  it('compte les tirages de la bannière événementielle', () => {
    expect(gachaStatsPatch({}, [commons[0], commons[1]], 1, true)[STAT.pullsVol2]).toBe(2);
    expect(gachaStatsPatch({}, [commons[0]], 1, false)[STAT.pullsVol2]).toBeUndefined();
  });
});

describe('addStats / maxStats', () => {
  it('addStats plafonne les valeurs infinies', () => {
    expect(addStats({}, { a: Infinity }).a).toBe(1e300);
  });
  it('maxStats ne renvoie rien si aucune valeur n\'augmente', () => {
    expect(maxStats({ a: 5 }, { a: 3 })).toBeNull();
    expect(maxStats({ a: 5 }, { a: 7 })).toEqual({ a: 7 });
  });
});

describe('statistiques dérivées et traqueurs', () => {
  beforeEach(() => { useGameStore.getState().resetGame(); });

  it('computeDerivedStats compte pages, secrets et événements parfaits', () => {
    const d = computeDerivedStats({ [pageStatKey('home')]: 1, [pageStatKey('shop')]: 1, [EGG.konami]: 1, [EV_PERFECT.ardeur]: 1 });
    expect(d[STAT.pagesVisited]).toBe(2);
    expect(d[STAT.secretsFound]).toBe(1);
    expect(d[STAT.eventsMastered]).toBe(1);
  });

  it('trackAchievementStats débloque les succès adossés à une stat', () => {
    const all = Object.fromEntries([...EXPLORABLE_PAGES.map(pageStatKey), ...ALL_SECRET_KEYS].map(k => [k, 1]));
    trackAchievementStats({ ...all, [STAT.playtimeSec]: 3600 });
    const s = useGameStore.getState();
    expect(s.isUnlocked('playtime_1h')).toBe(true);
    expect(s.isUnlocked('playtime_100h')).toBe(false);
    expect(s.isUnlocked('explore_pages')).toBe(true);
    expect(s.isUnlocked('explore_all_secrets')).toBe(true);
    expect(s.isUnlocked('secret_konami')).toBe(true);
  });

  it("trackMastery valide la maîtrise 100 % d'un personnage", () => {
    const tpl = getCharacterById(commons[0])!;
    const maxed = { k: 5000, w: 10, lv: 3000, f: 0 };
    expect(getMasteryPct(getMasteryMilestones(maxed))).toBe(100);
    trackMastery({ [tpl.id]: maxed });
    const s = useGameStore.getState();
    expect(s.isUnlocked('mastery_full_1')).toBe(true);
    expect(s.isUnlocked('mastery_lv_100')).toBe(true);
    expect(s.isUnlocked('mastery_full_5')).toBe(false);
  });
});

describe('bonus de DPS de maîtrise', () => {
  it('suit les paliers 25/50/75/100 % → +5/+10/+15/+20 %', () => {
    expect(getMasteryDpsBonus(24)).toBe(0);
    expect(getMasteryDpsBonus(25)).toBe(0.05);
    expect(getMasteryDpsBonus(50)).toBe(0.10);
    expect(getMasteryDpsBonus(99)).toBe(0.15);
    expect(getMasteryDpsBonus(100)).toBe(0.20);
    expect(getMasteryDpsMult(undefined)).toBe(1);
    expect(getMasteryDpsMult({ k: 5000, w: 10, lv: 3000, f: 0 })).toBeCloseTo(1.2);
  });

  it('rend la maîtrise plus dure pour les raretés élevées', () => {
    const common = getMasteryMilestones(undefined, 'C');
    const transc = getMasteryMilestones(undefined, 'T');
    const targets = (ms: typeof common) => ms.map(m => m.target);
    expect(targets(common)).toEqual([500, 1000, 1500, 2000, 2500, 3000, 500, 2000, 5000, 3, 10]);
    expect(targets(transc)).toEqual([500, 1000, 1500, 2000, 2500, 3000, 2250, 9000, 22500, 14, 45]);
    expect(targets(getMasteryMilestones(undefined, 'M'))).toEqual([500, 1000, 1500, 2000, 2500, 3000, 950, 3800, 9500, 6, 19]);
    expect(targets(getMasteryMilestones(undefined, 'P'))).toEqual([500, 1000, 1500, 2000, 2500, 3000, 1750, 7000, 17500, 11, 35]);
    expect(Object.values(MASTERY_RARITY_MULT)).toEqual([1, 1.1, 1.2, 1.4, 1.6, 1.9, 2.3, 2.8, 3.5, 4.5]);
    // Un Transcendant avec les stats d'un Commun maîtrisé n'est pas à 100 %.
    const maxedCommon = { k: 5000, w: 10, lv: 3000, f: 0 };
    expect(getMasteryPct(getMasteryMilestones(maxedCommon, 'C'))).toBe(100);
    expect(getMasteryPct(getMasteryMilestones(maxedCommon, 'T'))).toBeLessThan(100);
    expect(getMasteryDpsMult(maxedCommon, 'T')).toBeLessThan(1.2);
  });

  it("ne s'applique qu'au personnage maîtrisé dans le DPS de l'équipe", () => {
    const [a, b] = commons;
    const owned = (id: string) => ({ templateId: id, rank: 1, copies: 1, level: 1, currentForm: 0, xp: 0 });
    useGameStore.setState({ collection: { [a]: owned(a), [b]: owned(b) }, equippedTeam: [a, null, null, null], charMastery: {} });
    const soloA = bnToNumber(useGameStore.getState().getTotalDps());
    useGameStore.setState({ charMastery: { [a]: { k: 5000, w: 10, lv: 3000, f: 0 } } });
    expect(bnToNumber(useGameStore.getState().getTotalDps()) / soloA).toBeCloseTo(1.2);
    useGameStore.setState({ equippedTeam: [b, null, null, null] });
    const soloB = bnToNumber(useGameStore.getState().getTotalDps());
    useGameStore.setState({ charMastery: {} });
    expect(bnToNumber(useGameStore.getState().getTotalDps())).toBeCloseTo(soloB);
  });
});

describe('mergeMonotonicState — statistiques de succès', () => {
  beforeEach(() => { useGameStore.getState().resetGame(); });

  it('garde le max par clé et par champ de maîtrise', () => {
    useGameStore.setState({ achievementStats: { a: 5, b: 1 }, charMastery: { x: { k: 10, w: 0, lv: 3, f: 0 } } });
    const merged = mergeMonotonicState({
      achievementStats: { a: 2, b: 4, c: 1 },
      charMastery: { x: { k: 4, w: 2, lv: 9, f: 1 }, y: { k: 1, w: 0, lv: 1, f: 0 } },
    }, null);
    expect(merged.achievementStats).toEqual({ a: 5, b: 4, c: 1 });
    expect(merged.charMastery.x).toEqual({ k: 10, w: 2, lv: 9, f: 1 });
    expect(merged.charMastery.y.k).toBe(1);
  });

  it("ne ressuscite pas le niveau d'avant un Prestige", () => {
    useGameStore.setState({ prestigeLevel: 2, charMastery: { x: { k: 10, w: 1, lv: 50, f: 0, lb: 1000 } } });
    const stale = mergeMonotonicState({ prestigeLevel: 1, charMastery: { x: { k: 8, w: 1, lv: 1300, f: 0 } } }, null);
    expect(stale.charMastery.x).toEqual({ k: 10, w: 1, lv: 50, f: 0, lb: 1000 });
    const newer = mergeMonotonicState({ prestigeLevel: 3, charMastery: { x: { k: 12, w: 1, lv: 20, f: 0, lb: 1500 } } }, null);
    expect(newer.charMastery.x).toEqual({ k: 12, w: 1, lv: 20, f: 0, lb: 1500 });
  });
});

describe('bankMasteryLevel', () => {
  it('garde les paliers de niveau validés mais pas l’avancement partiel', () => {
    const banked = bankMasteryLevel({ k: 0, w: 0, lv: 1300, f: 0 });
    expect(banked).toEqual({ k: 0, w: 0, lv: 0, f: 0, lb: 1000 });
    const lv = getMasteryMilestones(banked).filter(m => m.id.startsWith('lv'));
    expect(lv.map(m => m.done)).toEqual([true, true, false, false, false, false]);
    expect(lv[2].value).toBe(0);
    // Un palier banqué n'est jamais perdu, même après un prestige à bas niveau.
    expect(bankMasteryLevel({ ...banked, lv: 200 }).lb).toBe(1000);
    expect(bankMasteryLevel({ k: 0, w: 0, lv: 300, f: 0 })).toEqual({ k: 0, w: 0, lv: 0, f: 0 });
  });
});

describe('getDpsBreakdown', () => {
  beforeEach(() => { useGameStore.getState().resetGame(); });

  it('la somme des contributions égale le DPS total, et la maîtrise apparaît sur le bon perso', () => {
    const [a, b] = commons;
    const owned = (id: string) => ({ templateId: id, rank: 1, copies: 1, level: 5, currentForm: 0, xp: 0 });
    useGameStore.setState({
      collection: { [a]: owned(a), [b]: owned(b) }, equippedTeam: [a, b, null, null],
      charMastery: { [a]: { k: 5000, w: 10, lv: 3000, f: 0 } },
    });
    const bd = useGameStore.getState().getDpsBreakdown();
    const total = bnToNumber(useGameStore.getState().getTotalDps());
    expect(bnToNumber(bd.total)).toBeCloseTo(total);
    expect(bd.chars.reduce((s, c) => s + bnToNumber(c.dps), 0)).toBeCloseTo(total);
    expect(bd.chars.find(c => c.templateId === a)!.masteryMult).toBeCloseTo(1.2);
    expect(bd.chars.find(c => c.templateId === b)!.masteryMult).toBe(1);
  });
});
