// Château de Nakime — joueur automatique raisonnable, utilisé par les tests et
// pour l'équilibrage (jamais importé par l'interface). Il soigne quand les PV
// sont bas, achète en boutique, forge, prend la première récompense proposée.
import type { GameStore } from '@/store/gameStore.types';
import type { NakimeRunEnd } from '@/store/slices/nakimeSlice';
import { generateActMap, reachableCols, runMemberStats, isFightNode, offerPrice, type NakimeNodeKind, type NakimeRun } from './nakime';

function hpRatio(run: NakimeRun): number {
  const stats = runMemberStats(run);
  const max = stats.reduce((s, st) => s + st.maxHp, 0);
  return run.members.reduce((s, m) => s + m.hp, 0) / max;
}

export function autoPlay(get: () => GameStore, maxSteps = 20000): NakimeRunEnd {
  for (let step = 0; step < maxSteps; step++) {
    const s = get();
    const run = s.nakimeRun;
    if (!run) break;
    if (run.battle) {
      const res = s.actNakimeBattle(null);
      if (typeof res !== 'string' && res.result?.end) return res.result.end;
      continue;
    }
    if (run.pending) {
      if (run.pending.kind === 'event') {
        const res = s.chooseNakimeEvent(0);
        if (typeof res === 'string') s.chooseNakimeEvent(1);
      } else s.chooseNakimeReward(0);
      continue;
    }
    if (run.room) {
      const low = hpRatio(run) < 0.6;
      const strongest = runMemberStats(run).map((st, i) => ({ i, atk: run.members[i].hp > 0 ? st.atk : -1 })).sort((a, b) => b.atk - a.atk)[0].i;
      run.room.offers.forEach((o, i) => {
        const cur = get().nakimeRun!;
        if (o.kind === 'heal' && !low) return;
        if (o.kind === 'revive' && !cur.members.some(m => m.hp <= 0)) return;
        if (o.kind === 'stone' || o.kind === 'chestRare' || o.kind === 'chestEpic') return;
        if (cur.shards >= offerPrice(cur, o, strongest)) get().buyNakimeOffer(i, strongest);
      });
      get().leaveNakimeRoom();
      continue;
    }
    const map = generateActMap(run.seed, run.act);
    const cols = reachableCols(run);
    const ratio = hpRatio(run);
    const score = (k: NakimeNodeKind) => {
      if (ratio < 0.45) return k === 'rest' ? 5 : k === 'shop' ? 4 : k === 'event' ? 3 : k === 'treasure' ? 3 : isFightNode(k) && k !== 'elite' ? 1 : 0;
      return k === 'treasure' ? 5 : k === 'elite' ? (ratio > 0.8 ? 4 : 1) : k === 'combat' ? 3 : k === 'shop' ? (run.shards > 150 ? 4 : 2) : k === 'forge' ? (run.shards > 120 ? 3 : 1) : k === 'event' ? 2 : 1;
    };
    const col = [...cols].sort((a, b) => score(map[run.row + 1][b].kind) - score(map[run.row + 1][a].kind))[0];
    const res = s.enterNakimeNode(col);
    if (res?.end) return res.end;
  }
  return get().abandonNakimeRun()!;
}
