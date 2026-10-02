import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { OwnedCharacter } from '@/types/game';

// Perf : un tick qui ne change rien ne doit réveiller aucun abonné (Zustand
// notifie même pour un patch vide `{}`), et le calcul de DPS doit renvoyer le
// même objet tant que ses entrées ne bougent pas (abonnements stables).
function owned(templateId: string): OwnedCharacter {
  return { templateId, copies: 1, level: 10, currentForm: 0, xp: 0 };
}

describe('ticks sans changement et cache du DPS', () => {
  beforeEach(() => {
    useGameStore.setState({
      collection: { canarticho: owned('canarticho'), cyborg: owned('cyborg') },
      equippedTeam: ['canarticho', 'cyborg', null, null],
      ultCooldowns: {}, ultActiveUlts: [], ultQueue: [],
      bossActive: false, mineOwned: true, mineGems: 1e9, mineCapLevel: 0,
    });
  });

  it("tickUlt, tickBossTimer et tickMine (mine pleine) ne notifient pas", () => {
    let notified = 0;
    const unsub = useGameStore.subscribe(() => { notified++; });
    const s = useGameStore.getState();
    s.tickUlt();
    s.tickBossTimer();
    s.tickMine();
    unsub();
    expect(notified).toBe(0);
  });

  it('getTotalDps renvoie le même objet tant que les entrées ne changent pas', () => {
    const first = useGameStore.getState().getTotalDps();
    useGameStore.setState({ currentEnemy: { ...useGameStore.getState().currentEnemy } }); // PV qui bougent, même ennemi
    expect(useGameStore.getState().getTotalDps()).toBe(first);
    useGameStore.setState(s => ({ collection: { ...s.collection, cyborg: { ...s.collection.cyborg, level: 20 } } }));
    expect(useGameStore.getState().getTotalDps()).not.toBe(first);
  });
});
