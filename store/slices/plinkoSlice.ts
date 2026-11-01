// Plinko Multiversel — événement mensuel (voir lib/game/plinko.ts). Tout
// l'état est rattaché à PLINKO_EVENT.id : freshPatch() le remet à zéro à
// l'arrivée d'une nouvelle édition. Rien ici n'est remis à zéro au Prestige
// (voir doPrestige, qui ne liste pas ces champs).
//
// Un lancer est décidé et crédité EN UNE FOIS dans dropPlinko (bille retirée,
// case tirée, récompense donnée, historique écrit, sauvegarde demandée) ;
// l'interface ne fait ensuite que rejouer le trajet renvoyé. Recharger la
// page pendant l'animation ne permet donc ni de rejouer ni de changer la case.
import type { StateCreator } from 'zustand';
import { rollCharacter, rollCharacterAtLeast, DEFAULT_BANNER_ID } from '@/lib/game/gacha';
import { getTodayDayKey } from '@/lib/game/shop';
import {
  PLINKO_EVENT, PLINKO_BOOSTERS, PLINKO_HISTORY_LIMIT, PLINKO_SLOTS, PLINKO_QUESTS, PLINKO_TITLE, formatPlinkoQuestBonus, emptyPlinkoDaily, isPlinkoActive, plinkoBallsLeft,
  plinkoDailyBalls, rollPlinkoSlot, plinkoPath, plinkoSlotReward, plinkoBoosterSize, plinkoUpgradeLevel, nextPlinkoUpgradeCost,
  getPlinkoUpgrade, getPlinkoQuestProgress, type PlinkoReward, type PlinkoStats, type PlinkoUpgradeId,
} from '@/lib/game/plinko';
import { toast } from '@/hooks/useToast';
import { broadcastLocalState, requestUrgentSave, runPeakPalierOf } from '../gameStoreHelpers';
import { creditEventPulls, creditEventChests, type EventPull } from './eventRewards';
import type { GameStore, PlinkoActions } from '../gameStore.types';

export interface PlinkoDropResult {
  slot: number;
  path: boolean[];          // une direction par rangée (true = droite)
  reward: PlinkoReward;
  pulls: EventPull[];       // cartes des boosters
  equipment: string[];      // équipements des coffres
  ballsLeft: number;
}

// Changement d'édition et de jour.
function freshPatch(s: GameStore): Partial<GameStore> {
  const today = getTodayDayKey();
  if (s.plinkoEventId !== PLINKO_EVENT.id) {
    return {
      plinkoEventId: PLINKO_EVENT.id, plinkoDaily: emptyPlinkoDaily(today), plinkoTokens: 0,
      plinkoUpgrades: {}, plinkoHistory: [], plinkoDrops: 0, plinkoStats: {}, plinkoQuestsClaimed: [],
    };
  }
  return s.plinkoDaily?.day === today ? {} : { plinkoDaily: emptyPlinkoDaily(today) };
}

export const createPlinkoSlice: StateCreator<GameStore, [], [], PlinkoActions> = (set, get) => {
  // Booster : tirages normaux de la Vol.1 + une carte garantie (dernière du booster).
  const openBooster = (kind: 'booster' | 'goldBooster', count: number): EventPull[] => {
    const palier = runPeakPalierOf(get());
    const size = plinkoBoosterSize(kind, get().plinkoUpgrades);
    const ids: string[] = [];
    for (let b = 0; b < count; b++) {
      for (let i = 0; i < size - 1; i++) ids.push(rollCharacter(palier, DEFAULT_BANNER_ID));
      ids.push(rollCharacterAtLeast(palier, PLINKO_BOOSTERS[kind].minRarity, DEFAULT_BANNER_ID));
    }
    return creditEventPulls(set, get, ids);
  };

  const grant = ({ kind, amount }: PlinkoReward): { pulls: EventPull[]; equipment: string[] } => {
    switch (kind) {
      case 'gems':        set(s => ({ nekoGems: s.nekoGems + amount })); break;
      case 'crowns':      get().grantEventRewards(undefined, 0, amount); break;
      case 'tokens':      set(s => ({ plinkoTokens: s.plinkoTokens + amount })); break;
      case 'chestRare':   return { pulls: [], equipment: creditEventChests(set, 'rare', amount) };
      case 'chestEpic':   return { pulls: [], equipment: creditEventChests(set, 'epic', amount) };
      case 'booster':
      case 'goldBooster': return { pulls: openBooster(kind, amount), equipment: [] };
    }
    return { pulls: [], equipment: [] };
  };

  const bumpStats = (patch: PlinkoStats) =>
    set(s => {
      const st = { ...(s.plinkoStats ?? {}) };
      for (const [k, v] of Object.entries(patch) as [keyof PlinkoStats, number][]) if (v) st[k] = (st[k] ?? 0) + v;
      return { plinkoStats: st };
    });

  return {
    ensurePlinko: () => set(s => freshPatch(s)),

    dropPlinko: () => {
      if (!isPlinkoActive()) return null;
      set(s => freshPatch(s));
      const s = get();
      const today = getTodayDayKey();
      if (plinkoBallsLeft(s.plinkoDaily, today, s.plinkoUpgrades) <= 0) return null;

      const slot = rollPlinkoSlot(s.plinkoUpgrades);
      const reward = plinkoSlotReward(slot, s.plinkoUpgrades);
      const n = (s.plinkoDrops ?? 0) + 1;
      // La bille est consommée AVANT le crédit : même si la suite échouait,
      // elle ne pourrait pas être rejouée.
      set({
        plinkoDaily: { day: today, used: Math.min(plinkoDailyBalls(s.plinkoUpgrades), s.plinkoDaily.used + 1) },
        plinkoDrops: n,
        plinkoHistory: [{ n, at: Date.now(), slot, reward }, ...(s.plinkoHistory ?? [])].slice(0, PLINKO_HISTORY_LIMIT),
      });
      const { kind, amount } = reward;
      bumpStats({
        days: s.plinkoDaily.used === 0 ? 1 : 0,
        rare: PLINKO_SLOTS[slot].rare ? 1 : 0,
        chests: kind === 'chestRare' || kind === 'chestEpic' ? amount : 0,
        boosters: kind === 'booster' || kind === 'goldBooster' ? amount : 0,
        tokens: kind === 'tokens' ? amount : 0,
      });
      const loot = grant(reward);
      broadcastLocalState();
      requestUrgentSave('plinko_drop');
      return { slot, path: plinkoPath(slot), reward, ...loot, ballsLeft: plinkoBallsLeft(get().plinkoDaily, today, get().plinkoUpgrades) };
    },

    buyPlinkoUpgrade: (id: PlinkoUpgradeId) => {
      if (!isPlinkoActive()) return false;
      set(s => freshPatch(s));
      const s = get();
      const cost = nextPlinkoUpgradeCost(s.plinkoUpgrades, id);
      if (!getPlinkoUpgrade(id) || cost === null || s.plinkoTokens < cost) return false;
      set({
        plinkoTokens: s.plinkoTokens - cost,
        plinkoUpgrades: { ...s.plinkoUpgrades, [id]: plinkoUpgradeLevel(s.plinkoUpgrades, id) + 1 },
      });
      bumpStats({ upgrades: 1 });
      requestUrgentSave('plinko_upgrade');
      return true;
    },

    claimPlinkoQuest: (id) => {
      set(s => freshPatch(s));
      const s = get();
      const q = PLINKO_QUESTS.find(x => x.id === id);
      const claimed = s.plinkoQuestsClaimed ?? [];
      if (!q || claimed.includes(id)) return null;
      if (getPlinkoQuestProgress(q, { stats: s.plinkoStats ?? {}, drops: s.plinkoDrops ?? 0, levels: s.plinkoUpgrades }) < q.target) return null;
      // Quête marquée réclamée dans le même set() que les gemmes et le bonus donnés.
      const b = q.bonus;
      set(st => ({
        plinkoQuestsClaimed: [...claimed, id],
        nekoGems: st.nekoGems + q.gems,
        ...(b?.kind === 'orbs' && { voidOrbs: st.voidOrbs + b.amount, totalVoidOrbsEarned: (st.totalVoidOrbsEarned ?? 0) + b.amount }),
        ...(b?.kind === 'notes' && { nakimeNotes: (st.nakimeNotes ?? 0) + b.amount }),
        ...(b?.kind === 'title' && !st.unlockedTitles.includes(PLINKO_TITLE) && { unlockedTitles: [...st.unlockedTitles, PLINKO_TITLE] }),
      }));
      broadcastLocalState();
      requestUrgentSave('plinko_quest');
      if (!get().suppressToasts) toast.quest('🏆 Quête du Plinko', `${q.label} : +${q.gems} 💎${b ? ` · ${formatPlinkoQuestBonus(b)}` : ''}`);
      return q.gems;
    },
  };
};
