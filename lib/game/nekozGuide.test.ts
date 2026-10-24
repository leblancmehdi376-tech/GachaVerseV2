import { describe, it, expect } from 'vitest';
import {
  GUIDE_QUESTS, initialGuideState, currentGuideQuest, questBaselineFor, pendingGuideLine, nextGuideLine,
  mergeGuideState, raidKillsStat, ACT_3_FIRST_QUEST, GUIDE_CLUES, isClueVisible, nakimeChoiceMark, type GuideView, type GuideState,
} from './nekozGuide';
import { STAT } from './achievements';
import { BONDS } from './bonds';

const view = (over: Partial<GuideView> = {}, guide: Partial<GuideState> = {}): GuideView => ({
  nekozGuide: { ...initialGuideState(), ...guide },
  prestigeLevel: 0, maxPalierReached: 1, runPeakPalier: 1,
  equippedTeam: [null, null, null, null],
  compadexCharactersSeen: {}, achievementStats: {}, totalUpgradesPerformed: 0, nakimeTotals: { floors: 0 },
  collection: {}, charMastery: {}, discoveredBonds: {}, prestigeRankRecoveryLevel: 0,
  ...over,
});

describe('pendingGuideLine', () => {
  it("adapte la réplique d'arrivée au Prestige du joueur", () => {
    expect(pendingGuideLine(view())?.parts[0]).toBe('… Tiens. Encore un.');
    expect(pendingGuideLine(view({ prestigeLevel: 48 }))?.parts[0]).toBe("… J'arrive tard.");
  });

  it('réagit à un nouveau Prestige avant tout le reste', () => {
    const v = view({ prestigeLevel: 18 }, { arrivalPrestige: 17, lastPrestige: 17 });
    expect(pendingGuideLine(v)?.id).toBe('post_prestige');
  });

  it("présente la quête en cours, puis les Chill&Cool découverts, une seule fois chacun", () => {
    const base = { arrivalPrestige: 0, lastPrestige: 0 };
    const seen = { compadexCharactersSeen: { ouchuu: true as const } };
    expect(pendingGuideLine(view(seen, base))?.id).toBe(GUIDE_QUESTS[0].intro.id);
    expect(pendingGuideLine(view(seen, { ...base, seen: [GUIDE_QUESTS[0].intro.id] }))?.id).toBe('meet:ouchuu');
    expect(pendingGuideLine(view(seen, { ...base, seen: [GUIDE_QUESTS[0].intro.id, 'meet:ouchuu'] }))).toBeNull();
  });
});

describe('nextGuideLine', () => {
  it('ne répète jamais deux fois de suite la même réplique', () => {
    const v = view({}, { arrivalPrestige: 0, questIndex: GUIDE_QUESTS.length, seen: ['end:chain'] });
    const first = nextGuideLine(v, null, () => 0.5);
    for (const r of [0.1, 0.3, 0.5, 0.7, 0.99]) expect(nextGuideLine(v, first.id, () => r).id).not.toBe(first.id);
  });
});

describe('quêtes du guide', () => {
  it("compte la progression à partir de l'activation, pas depuis le début du jeu", () => {
    const s = view({ achievementStats: { [STAT.expeditionsDone]: 40 } });
    const baseline = questBaselineFor(s, 0);
    const v = view({ achievementStats: { [STAT.expeditionsDone]: 41 } }, { arrivalPrestige: 48, questBaseline: baseline });
    expect(currentGuideQuest(v)).toMatchObject({ current: 1, claimable: false });
  });

  it('suit les victoires contre Rokoul & Ayro uniquement', () => {
    const v = view({ achievementStats: { [STAT.raidBossKills]: 9, [raidKillsStat('rokoul_ayro')]: 1 } }, { arrivalPrestige: 0, questIndex: 1 });
    expect(currentGuideQuest(v)?.claimable).toBe(true);
  });

  it("valide la quête Chill&Cool dès qu'un des leurs est dans l'équipe", () => {
    const idx = GUIDE_QUESTS.findIndex(q => q.metric === 'chillTeam');
    const guide = { arrivalPrestige: 0, questIndex: idx };
    expect(currentGuideQuest(view({}, guide))?.claimable).toBe(false);
    expect(currentGuideQuest(view({ equippedTeam: ['goku', 'ouchuu', null, null] }, guide))?.claimable).toBe(true);
  });

  it("n'affiche aucune quête avant l'arrivée ni après la fin de la chaîne", () => {
    expect(currentGuideQuest(view())).toBeNull();
    expect(currentGuideQuest(view({}, { arrivalPrestige: 0, questIndex: GUIDE_QUESTS.length }))).toBeNull();
  });
});

describe('mergeGuideState', () => {
  it('ne fait jamais reculer la chaîne de quêtes et unit les répliques vues', () => {
    const local: GuideState = { arrivalPrestige: 5, lastPrestige: 9, questIndex: 3, questBaseline: 100, seen: ['quest:g1'] };
    const merged = mergeGuideState(local, { arrivalPrestige: 4, lastPrestige: 7, questIndex: 1, questBaseline: 2, seen: ['meet:nekoz'] });
    expect(merged).toEqual({ arrivalPrestige: 4, lastPrestige: 9, questIndex: 3, questBaseline: 100, seen: ['quest:g1', 'meet:nekoz'] });
  });

  it("adopte la quête et sa référence d'un appareil plus avancé", () => {
    const merged = mergeGuideState(initialGuideState(), { arrivalPrestige: 2, lastPrestige: 2, questIndex: 2, questBaseline: 30, seen: [] });
    expect(merged).toMatchObject({ arrivalPrestige: 2, questIndex: 2, questBaseline: 30 });
  });
});

describe('acte 2', () => {
  const at = (metric: string, guide: Partial<GuideState> = {}) =>
    ({ arrivalPrestige: 0, questIndex: GUIDE_QUESTS.findIndex(q => q.metric === metric), ...guide });

  it('valide le Mode Divin dès que NekoZ est en forme 1 ou plus', () => {
    expect(currentGuideQuest(view({ collection: { nekoz: { currentForm: 0 } } }, at('nekozDivine')))?.claimable).toBe(false);
    expect(currentGuideQuest(view({ collection: { nekoz: { currentForm: 1 } } }, at('nekozDivine')))?.claimable).toBe(true);
  });

  it('offre la quête des liens si tous étaient déjà découverts', () => {
    const all = Object.fromEntries(BONDS.map(b => [b.id, true as const]));
    const v = view({ discoveredBonds: all }, at('bonds', { questBaseline: BONDS.length }));
    expect(currentGuideQuest(v)?.claimable).toBe(true);
  });

  it("compte le temps de jeu en minutes depuis l'activation", () => {
    const v = view({ achievementStats: { [STAT.playtimeSec]: 100 * 60 + 59 } }, at('playMinutes', { questBaseline: 80 }));
    expect(currentGuideQuest(v)?.current).toBe(20);
  });

  it('compte un nouveau Prestige, et la Mémoire des Pierres comme un état', () => {
    expect(currentGuideQuest(view({ prestigeLevel: 18 }, at('prestige', { questBaseline: 17, lastPrestige: 18 })))?.claimable).toBe(true);
    expect(currentGuideQuest(view({ prestigeRankRecoveryLevel: 3 }, at('stoneMemory')))?.claimable).toBe(true);
  });

  it('annonce une seule fois la fin de la chaîne', () => {
    const done = { arrivalPrestige: 0, questIndex: GUIDE_QUESTS.length };
    expect(pendingGuideLine(view({}, done))?.id).toBe('end:chain');
    expect(pendingGuideLine(view({}, { ...done, seen: ['end:chain'] }))).toBeNull();
  });
});

describe('acte 3', () => {
  const at = (metric: string) => ({ arrivalPrestige: 0, questIndex: GUIDE_QUESTS.findIndex(q => q.metric === metric) });

  it('demande Ouchuu et NekoZ ensemble, puis 3 Chill&Cool différents', () => {
    expect(currentGuideQuest(view({ equippedTeam: ['ouchuu', null, null, null] }, at('ouchuuNekozTeam')))?.claimable).toBe(false);
    expect(currentGuideQuest(view({ equippedTeam: ['ouchuu', 'nekoz', null, null] }, at('ouchuuNekozTeam')))?.claimable).toBe(true);
    expect(currentGuideQuest(view({ equippedTeam: ['ouchuu', 'nekoz', 'goku', null] }, at('chill3Team')))?.claimable).toBe(false);
    expect(currentGuideQuest(view({ equippedTeam: ['ouchuu', 'nekoz', 'elfuzzion', null] }, at('chill3Team')))?.claimable).toBe(true);
  });

  it('compte les boss vaincus avec Rokoul & Ayro depuis l’activation', () => {
    const idx = GUIDE_QUESTS.findIndex(q => q.metric === 'rokoulBossWins');
    const v = view({ charMastery: { rokoul_ayro: { k: 900, w: 12, lv: 0 } } }, { arrivalPrestige: 0, questIndex: idx, questBaseline: 9 });
    expect(currentGuideQuest(v)?.current).toBe(3);
  });

  it("ne fait parler les Chill&Cool de l'équipe qu'à partir de l'acte 3", () => {
    const team = { equippedTeam: ['elfuzzion', null, null, null] };
    const seenAll = GUIDE_QUESTS.map(q => q.intro.id).concat('end:chain');
    const spoken = (questIndex: number) => {
      const ids = new Set<string>();
      for (let i = 0; i < 200; i++) ids.add(nextGuideLine(view(team, { arrivalPrestige: 0, questIndex, seen: seenAll }), null, () => (i % 100) / 100).id);
      return [...ids].filter(id => id.startsWith('e_'));
    };
    expect(spoken(ACT_3_FIRST_QUEST - 1)).toEqual([]);
    expect(spoken(ACT_3_FIRST_QUEST).sort()).toEqual(['e_elfuzzion1', 'e_elfuzzion2']);
  });
});

describe('indices discrets', () => {
  it("n'affiche rien avant l'arrivée du guide, puis débloque chaque indice après sa quête", () => {
    expect(isClueVisible(initialGuideState(), 'prestigeConfirm')).toBe(false);
    expect(isClueVisible({ ...initialGuideState(), arrivalPrestige: 0 }, 'prestigeConfirm')).toBe(true);
    const anomalyIdx = GUIDE_QUESTS.findIndex(q => q.id === 'g7_anomaly');
    expect(isClueVisible({ ...initialGuideState(), arrivalPrestige: 0, questIndex: anomalyIdx }, 'anomalies')).toBe(false);
    expect(isClueVisible({ ...initialGuideState(), arrivalPrestige: 0, questIndex: anomalyIdx + 1 }, 'anomalies')).toBe(true);
  });

  it('chaque indice pointe vers une quête qui existe', () => {
    for (const clue of Object.values(GUIDE_CLUES)) {
      if (clue.after) expect(GUIDE_QUESTS.some(q => q.id === clue.after)).toBe(true);
    }
  });

  it('réagit une seule fois à la rencontre du Château, selon le choix fait', () => {
    const g = { arrivalPrestige: 0, questIndex: GUIDE_QUESTS.length, seen: ['end:chain', nakimeChoiceMark(0)] };
    expect(pendingGuideLine(view({}, g))?.parts[0]).toContain('assis à côté de moi');
    expect(pendingGuideLine(view({}, { ...g, seen: [...g.seen, 'react:nakime'] }))).toBeNull();
  });

  it('ne parle de sommeil que la nuit, et à partir de l’acte 2', () => {
    const g = { arrivalPrestige: 0, questIndex: GUIDE_QUESTS.length, seen: ['end:chain'] };
    const ids = (hour: number, guide = g) => new Set(Array.from({ length: 100 }, (_, i) =>
      nextGuideLine(view({}, guide), null, () => i / 100, new Date(2026, 9, 24, hour)).id));
    expect(ids(2).has('night')).toBe(true);
    expect(ids(14).has('night')).toBe(false);
    expect(ids(2, { ...g, questIndex: 1, seen: [GUIDE_QUESTS[1].intro.id] }).has('night')).toBe(false);
  });
});
