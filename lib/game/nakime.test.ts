import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { CHARACTER_POOL } from './characters';
import { EVOLUTION_STONE_ITEM_ID, type Rarity } from '@/types/game';
import {
  NAKIME_DAILY_ENTRIES, NAKIME_TEAM_SIZE, NAKIME_ACT_FLOORS, NAKIME_EVENTS, NAKIME_MILESTONES, NAKIME_RELIC_LIST, NAKIME_TITLE_BIWA,
  generateActMap, createRun, reachableCols, enterNode, chooseReward, chooseEventOption, buyOffer, rerollShop, validateTeam,
  teamPower, actWorld, buildAllies, buildEnemies, createBattle, autoAction, playerAction, battleSeed, floorsCleared, runMemberStats, getNakimeRole,
  memberAbilities, abilityCount, BASIC_ATTACK, ABILITIES, describeAbility, battleAct,
  type NakimeRun,
} from './nakime';
import { autoPlay } from './nakimeAutoplay';
import { TITLE_GOLD_BONUS_PCT } from './titles';
import { AFFINITY_ORDER, getAffinityForId } from './affinities';
import { TIDE_UP_MULT, TIDE_DOWN_MULT } from './tides';
import { memberStats, NO_BONUS } from './nakimeCombat';

const pick = (rarity: Rarity, n = NAKIME_TEAM_SIZE) => CHARACTER_POOL.filter(c => c.rarity === rarity && !c.isHero).slice(0, n).map(c => c.id);
const owned = (ids: string[]) => Object.fromEntries(ids.map(id => [id, { templateId: id, copies: 1, level: 1, currentForm: 0, xp: 0 }]));

describe('Château de Nakime — carte', () => {
  it('déterministe, 10 rangées, boss en dernier, repos/boutique avant le boss', () => {
    for (let act = 1; act <= 6; act++) {
      const map = generateActMap(77, act);
      expect(map).toEqual(generateActMap(77, act));
      expect(map).toHaveLength(NAKIME_ACT_FLOORS);
      expect(map[9].map(n => n.kind)).toEqual(['boss']);
      expect(map[8].every(n => ['rest', 'shop', 'forge'].includes(n.kind))).toBe(true);
      expect(map[0].every(n => n.kind === 'combat')).toBe(true);
    }
  });

  it('chaque nœud a au moins un lien entrant et sortant, sans croisement', () => {
    for (let seed = 1; seed < 40; seed++) {
      const map = generateActMap(seed, 2);
      for (let r = 0; r < map.length - 1; r++) {
        const row = map[r], next = map[r + 1];
        for (let i = 0; i < row.length; i++) {
          expect(row[i].lo).toBeLessThanOrEqual(row[i].hi);
          expect(row[i].hi).toBeLessThan(next.length);
          if (i > 0) expect(row[i].lo).toBeGreaterThanOrEqual(row[i - 1].hi);
        }
        for (let j = 0; j < next.length; j++) expect(row.some(n => n.lo <= j && j <= n.hi)).toBe(true);
      }
    }
  });

  it('acte 1 dans l\'Infinite Castle face à Nakime ; Lune Supérieure à l\'acte 5', () => {
    expect(actWorld(5, 1).boss.name).toBe('Nakime');
    expect(actWorld(5, 5).boss.name).toBe('Akaza');
    expect(actWorld(5, 10).boss.name).toBe('Doma');
    expect(actWorld(5, 3).mobs.length).toBeGreaterThan(0);
  });
});

describe('Château de Nakime — règles', () => {
  it("refuse une équipe incomplète, en double ou non possédée", () => {
    const ids = pick('C');
    expect(validateTeam(ids, owned(ids))).toBeNull();
    expect(validateTeam(ids.slice(0, 4), owned(ids))).not.toBeNull();
    expect(validateTeam([...ids.slice(0, 4), ids[0]], owned(ids))).not.toBeNull();
    expect(validateTeam(ids, owned(ids.slice(1)))).not.toBeNull();
  });

  it('la rareté compte : une équipe Transcendante est bien plus forte', () => {
    expect(teamPower(pick('T'))).toBeGreaterThan(teamPower(pick('C')) * 8);
  });

  it('chaque carte a un rôle fixe', () => {
    expect(getNakimeRole('tanjiro')).toBe('assaillant');
    expect(getNakimeRole('murata')).toBe(getNakimeRole('murata'));
  });

  it("1 à 3 capacités selon la rareté (plus l'Attaque), toutes décrites", () => {
    expect(abilityCount('C')).toBe(1);
    expect(abilityCount('E')).toBe(2);
    expect(abilityCount('T')).toBe(3);
    for (const r of ['C', 'L', 'T'] as Rarity[]) {
      for (const id of pick(r)) {
        const ab = memberAbilities(id);
        expect(ab[0]).toBe(BASIC_ATTACK);
        expect(ab).toHaveLength(1 + abilityCount(r));
        expect(new Set(ab).size).toBe(ab.length);
        for (const a of ab) expect(describeAbility(a).length).toBeGreaterThan(5);
      }
    }
    expect(Object.values(ABILITIES).length).toBeGreaterThan(30);
  });

  it('combat au tour par tour : attend un ordre, refuse une capacité en recharge, reproductible', () => {
    const run = createRun(pick('T'), 99);
    const start = () => createBattle(battleSeed(99, 10, 0), buildAllies(run.members, []), buildEnemies(99, 1, 10, 0, 'boss'), []).state;
    const st = start();
    expect(st).toEqual(start());
    expect(st.active).toMatch(/^a/);
    const me = st.units.find(u => u.id === st.active)!;
    const skill = me.abilities[1];
    const enemy = st.units.find(u => u.side === 'enemy')!.id;
    const ally = st.units.find(u => u.side === 'ally')!.id;
    const first = playerAction(st, skill, ABILITIES[skill].target === 'ally' ? ally : enemy);
    expect(typeof first).not.toBe('string');
    // Joue jusqu'à la fin avec l'IA : le combat se termine toujours.
    let cur = typeof first === 'string' ? st : first.state;
    for (let i = 0; i < 2000 && !cur.over; i++) {
      const r = autoAction(cur);
      if (typeof r === 'string') break;
      cur = r.state;
    }
    expect(cur.over).not.toBeNull();
  });

  it('on ne peut aller que sur un nœud relié', () => {
    let run = createRun(pick('T'), 3);
    expect(reachableCols(run)).toEqual(generateActMap(3, 1)[0].map((_, i) => i));
    run = enterNode(run, 0)!.run;
    expect(run.battle).not.toBeNull();
    for (let i = 0; i < 500 && run.battle; i++) {
      const step = battleAct(run, null);
      if (typeof step === 'string') throw new Error(step);
      run = step.run;
    }
    run = chooseReward(run, 0)!;
    const node = generateActMap(3, 1)[0][0];
    expect(reachableCols(run)).toEqual(Array.from({ length: node.hi - node.lo + 1 }, (_, i) => node.lo + i));
    const forbidden = generateActMap(3, 1)[1].map((_, i) => i).find(i => !reachableCols(run).includes(i));
    if (forbidden !== undefined) expect(enterNode(run, forbidden)).toBeNull();
  });

  it('les relique augmentent les stats et les événements s\'appliquent', () => {
    const run = createRun(pick('E'), 8);
    const withRelic: NakimeRun = { ...run, relics: ['muzan'] };
    expect(runMemberStats(withRelic)[0].atk).toBeGreaterThan(runMemberStats(run)[0].atk);
    for (const ev of NAKIME_EVENTS) {
      for (let i = 0; i < ev.options.length; i++) {
        const res = chooseEventOption({ ...run, shards: 9999, pending: { kind: 'event', id: ev.id } }, i);
        expect(typeof res).not.toBe('string');
      }
    }
  });

  it('boutique : achat, relance et refus faute d\'Éclats', () => {
    const run: NakimeRun = { ...createRun(pick('U'), 4), room: null };
    const shop: NakimeRun = { ...run, shards: 5000, room: { kind: 'shop', offers: [{ kind: 'train', price: 100 }], bought: [], rerolls: 0 } };
    const after = buyOffer(shop, 0) as NakimeRun;
    expect(after.shards).toBe(4900);
    expect(after.members[0].level).toBe(2);
    expect(typeof buyOffer(after, 0)).toBe('string');
    expect(typeof buyOffer({ ...shop, shards: 0 }, 0)).toBe('string');
    expect(typeof rerollShop(shop)).not.toBe('string');
  });

  it('26 reliques, titres avec bonus d\'or', () => {
    expect(NAKIME_RELIC_LIST.length).toBeGreaterThanOrEqual(26);
    for (const m of NAKIME_MILESTONES) if (m.title) expect(TITLE_GOLD_BONUS_PCT[m.title]).toBeGreaterThan(0);
  });
});

describe('Château de Nakime — run complète', () => {
  beforeEach(() => useGameStore.setState({
    nekoGems: 0, expeditionDropInventory: {}, nakimeBestFloor: 0, nakimeRunsPlayed: 0, nakimeMilestones: [],
    nakimeNotes: 0, nakimeMeta: {}, nakimeHistory: [], unlockedTitles: [],
  }));

  const play = (ids: string[], seed: number) => {
    useGameStore.setState({ collection: owned(ids), nakimeRun: null, nakimeDay: '', nakimeEntriesUsed: 0 });
    expect(useGameStore.getState().startNakimeRun(ids)).toBeNull();
    useGameStore.setState(s => ({ nakimeRun: { ...(s.nakimeRun as NakimeRun), seed } }));
    return autoPlay(useGameStore.getState, 400);
  };

  it('une run finit (infini mais de plus en plus dur) et crédite butin, Notes et historique', () => {
    const end = play(pick('C'), 7);
    expect(end.floorsCleared).toBeGreaterThanOrEqual(1);
    const s = useGameStore.getState();
    expect(s.nakimeRun).toBeNull();
    expect(s.nakimeBestFloor).toBe(end.floorsCleared);
    expect(s.nekoGems).toBe(end.loot.gems);
    expect(s.nakimeNotes).toBe(end.notes);
    expect(s.nakimeNotes).toBeGreaterThan(0);
    expect(s.nakimeHistory).toHaveLength(1);
  });

  it("les meilleures raretés montent plus haut ; fin d'acte : Pierre d'Évolution et Ticket de l'Infini", () => {
    const low = play(pick('C'), 11).floorsCleared;
    useGameStore.setState({ nakimeTickets: 0 });
    const high = play(pick('T'), 11);
    expect(high.floorsCleared).toBeGreaterThan(low);
    expect(high.floorsCleared).toBeGreaterThanOrEqual(10);
    const s = useGameStore.getState();
    expect(s.expeditionDropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0).toBeGreaterThan(0);
    expect(high.loot.tickets).toBe(high.bosses);
    expect(s.nakimeTickets).toBe(high.bosses);
    expect(s.nakimeMilestones).toContain(10);
    if (high.floorsCleared >= 30) expect(s.unlockedTitles).toContain(NAKIME_TITLE_BIWA);
  });

  it('un palier de record n\'est payé qu\'une fois', () => {
    play(pick('T'), 21);
    const gems = useGameStore.getState().nekoGems;
    const again = play(pick('T'), 21);
    expect(again.milestones).toHaveLength(0);
    expect(useGameStore.getState().nekoGems - gems).toBe(again.loot.gems);
  });

  it(`limite à ${NAKIME_DAILY_ENTRIES} entrées par jour (+ Clé supplémentaire)`, () => {
    const ids = pick('U');
    useGameStore.setState({ collection: owned(ids), nakimeRun: null, nakimeDay: '', nakimeEntriesUsed: 0 });
    for (let i = 0; i < NAKIME_DAILY_ENTRIES; i++) {
      expect(useGameStore.getState().startNakimeRun(ids)).toBeNull();
      useGameStore.getState().abandonNakimeRun();
    }
    expect(useGameStore.getState().startNakimeRun(ids)).not.toBeNull();
    useGameStore.setState({ nakimeMeta: { entries: 1 } });
    expect(useGameStore.getState().startNakimeRun(ids)).toBeNull();
  });

  it('Mémoire du Château : achat avec les Notes et effet en début de run', () => {
    useGameStore.setState({ nakimeNotes: 1000 });
    expect(useGameStore.getState().buyNakimeMeta('start_shards')).toBeNull();
    expect(useGameStore.getState().buyNakimeMeta('start_relic')).toBeNull();
    expect(useGameStore.getState().buyNakimeMeta('start_relic')).not.toBeNull();
    const run = createRun(pick('C'), 1, useGameStore.getState().nakimeMeta);
    expect(run.shards).toBe(25);
    expect(run.relics).toHaveLength(1);
    expect(floorsCleared(run)).toBe(0);
  });
});

describe('Château de Nakime — Marée cosmique', () => {
  const id = pick('R', 1)[0];
  const type = getAffinityForId(id);
  const opposite = AFFINITY_ORDER[(AFFINITY_ORDER.indexOf(type) + 4) % AFFINITY_ORDER.length];
  const member = { templateId: id, level: 1, weapon: 0, armor: 0 };

  it("multiplie l'ATQ des cartes du type en marée haute, réduit celle du type en marée basse", () => {
    const base = memberStats(member, []).atk;
    const up = memberStats(member, [], 0, { ...NO_BONUS, tideUp: type, tideDown: opposite }).atk;
    const down = memberStats(member, [], 0, { ...NO_BONUS, tideUp: opposite, tideDown: type }).atk;
    expect(Math.abs(up - base * TIDE_UP_MULT)).toBeLessThanOrEqual(1);
    expect(Math.abs(down - base * TIDE_DOWN_MULT)).toBeLessThanOrEqual(1);
    // Marée sur deux autres types : aucun effet.
    const i = AFFINITY_ORDER.indexOf(type);
    const neutral = { ...NO_BONUS, tideUp: AFFINITY_ORDER[(i + 1) % 8], tideDown: AFFINITY_ORDER[(i + 5) % 8] };
    expect(memberStats(member, [], 0, neutral).atk).toBe(base);
  });

  it("garde la marée d'entrée dans le bonus de la run", () => {
    const run = createRun(pick('C'), 1, {}, {}, { up: type, down: opposite });
    expect(run.bonus.tideUp).toBe(type);
    expect(run.bonus.tideDown).toBe(opposite);
    expect(createRun(pick('C'), 1).bonus.tideUp).toBeUndefined();
  });
});
