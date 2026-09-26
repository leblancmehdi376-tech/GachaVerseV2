import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getUltimateDef } from '@/lib/game/ultimates';
import type { OwnedCharacter } from '@/types/game';

// canarticho / cyborg / slime : ultis simples (×1.2 DPS, 8s, cooldown 110s),
// sans effet sur les cooldowns des alliés — idéal pour tester la file seule.
const A = 'canarticho', B = 'cyborg', C = 'slime';
const DURATION_MS = getUltimateDef(A)!.duration * 1000;
const COOLDOWN    = getUltimateDef(A)!.cooldown;

function owned(templateId: string): OwnedCharacter {
  return { templateId, rank: 1, copies: 1, level: 1, currentForm: 0, xp: 0 };
}

function setupTeam() {
  useGameStore.setState({
    collection: { [A]: owned(A), [B]: owned(B), [C]: owned(C) },
    equippedTeam: [A, B, C, null, null],
  });
}

const ult = (id: string) => useGameStore.getState().activateCharacterUltimate(id, 0);
const state = () => useGameStore.getState();
const activeIds = () => state().ultActiveUlts.map(a => a.templateId);
const queueIds  = () => state().ultQueue.map(q => q.templateId);

describe('ultimateSlice — stack des ultis', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().resetGame();
    setupTeam();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('lance directement un ulti quand aucun autre n\'est actif', () => {
    ult(A);
    expect(activeIds()).toEqual([A]);
    expect(queueIds()).toEqual([]);
    expect(state().ultCooldowns[A]).toBe(COOLDOWN);
  });

  it('met en file un ulti lancé pendant qu\'un autre est actif, SANS démarrer son cooldown', () => {
    ult(A);
    ult(B);
    expect(activeIds()).toEqual([A]);
    expect(queueIds()).toEqual([B]);
    expect(state().ultCooldowns[B] ?? 0).toBe(0);
    expect(state().ultUsedThisFight).not.toContain(B);
  });

  it('enchaîne l\'ulti stacké dès que le précédent se termine, et démarre alors son cooldown', () => {
    ult(A);
    ult(B);
    vi.advanceTimersByTime(DURATION_MS - 1);
    expect(activeIds()).toEqual([A]);
    expect(state().ultCooldowns[B] ?? 0).toBe(0);

    vi.advanceTimersByTime(1);
    expect(activeIds()).toEqual([B]);
    expect(queueIds()).toEqual([]);
    expect(state().ultCooldowns[B]).toBe(COOLDOWN);
    expect(state().ultUsedThisFight).toContain(B);
  });

  it('enchaîne plusieurs ultis stackés dans l\'ordre de clic', () => {
    ult(A);
    ult(C);
    ult(B);
    expect(queueIds()).toEqual([C, B]);

    vi.advanceTimersByTime(DURATION_MS);
    expect(activeIds()).toEqual([C]);
    expect(queueIds()).toEqual([B]);
    expect(state().ultCooldowns[B] ?? 0).toBe(0);

    vi.advanceTimersByTime(DURATION_MS);
    expect(activeIds()).toEqual([B]);
    expect(queueIds()).toEqual([]);
    expect(state().ultCooldowns[B]).toBe(COOLDOWN);

    vi.advanceTimersByTime(DURATION_MS);
    expect(activeIds()).toEqual([]);
  });

  it('re-cliquer un ulti en file l\'en retire (et il reste prêt)', () => {
    ult(A);
    ult(B);
    ult(B);
    expect(queueIds()).toEqual([]);
    vi.advanceTimersByTime(DURATION_MS);
    expect(activeIds()).toEqual([]);
    expect(state().ultCooldowns[B] ?? 0).toBe(0);
  });

  it('ne met pas en file un ulti en cooldown', () => {
    ult(A);
    vi.advanceTimersByTime(DURATION_MS);
    ult(B);
    ult(A); // A en cooldown
    expect(queueIds()).toEqual([]);
  });

  it('ignore un ulti stacké dont le perso a été retiré de l\'équipe', () => {
    ult(A);
    ult(B);
    ult(C);
    useGameStore.setState({ equippedTeam: [A, C, null, null, null] });
    vi.advanceTimersByTime(DURATION_MS);
    expect(activeIds()).toEqual([C]);
    expect(state().ultCooldowns[B] ?? 0).toBe(0);
  });

  it('tickUlt enchaîne aussi la file si l\'ulti a expiré sans que son timer ait tourné', () => {
    ult(A);
    ult(B);
    // Simule un setTimeout retardé : l'ulti est expiré côté horloge.
    useGameStore.setState(s => ({ ultActiveUlts: s.ultActiveUlts.map(a => ({ ...a, endsAt: Date.now() - 1 })) }));
    state().tickUlt();
    expect(activeIds()).toEqual([B]);
    expect(state().ultCooldowns[B]).toBe(COOLDOWN);
  });
});
