import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import type { OwnedCharacter } from '@/types/game';

const A = 'canarticho';
const owned = (templateId: string): OwnedCharacter => ({ templateId, copies: 1, level: 1, currentForm: 0, xp: 0 });
const state = () => useGameStore.getState();

// Ennemi à PV élevés (pas de mort pendant le test), boss en cours et un
// cooldown d'ulti : les quatre tâches du tick ont quelque chose à faire.
function setup() {
  useGameStore.getState().resetGame();
  useGameStore.setState({
    collection: { [A]: owned(A) },
    equippedTeam: [A, null, null, null, null],
    bossActive: true,
    bossTimeLeft: 20,
    ultCooldowns: { [A]: 5 },
    currentEnemy: { ...state().currentEnemy, maxHp: bnFromNumber(1e12), currentHp: bnFromNumber(1e12) },
  });
}

describe('combatSlice — tick()', () => {
  beforeEach(() => { vi.useFakeTimers(); setup(); });
  afterEach(() => { vi.useRealTimers(); });

  it('donne le même état que les quatre ticks séparés', () => {
    const s = state();
    s.tickDps(); s.tickBossTimer(); s.tickUlt(); s.tickMine();
    const separate = state();
    const expected = {
      hp: bnToNumber(separate.currentEnemy.currentHp),
      bossTimeLeft: separate.bossTimeLeft,
      ultCooldowns: separate.ultCooldowns,
    };

    setup();
    state().tick();
    expect(bnToNumber(state().currentEnemy.currentHp)).toBe(expected.hp);
    expect(state().bossTimeLeft).toBe(expected.bossTimeLeft);
    expect(state().ultCooldowns).toEqual(expected.ultCooldowns);
    expect(expected.bossTimeLeft).toBe(19);
    expect(expected.ultCooldowns[A]).toBe(4);
  });

  it('ne notifie les abonnés qu\'une seule fois par tick', () => {
    let calls = 0;
    const unsub = useGameStore.subscribe(() => { calls++; });
    state().tick();
    unsub();
    expect(calls).toBe(1);
  });
});
