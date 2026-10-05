// Le Grand Périple du Multivers — événement plateau temporaire (voir
// lib/game/periple.ts). Tout l'état est rattaché à PERIPLE_EVENT.id :
// ensurePeriple() le remet à zéro à l'arrivée d'une nouvelle édition. Rien ici
// n'est remis à zéro au Prestige (voir doPrestige, qui ne liste pas ces champs).
//
// Déroulé d'un tour : rollPeriple() déplace le pion et, sauf sur le Départ,
// laisse un mini-jeu en attente (periplePending, sauvegardé : recharger la
// page ne permet ni de le sauter ni de le rejouer). Le mini-jeu se termine
// par finishPeripleGame (adresse), playPeripleChance (cartes) ou
// spinPeripleWheel (roue), qui créditent la récompense et libèrent le dé suivant.
import type { StateCreator } from 'zustand';
import type { CardEdition } from '@/types/game';
import { rollCharacter, DEFAULT_BANNER_ID } from '@/lib/game/gacha';
import { getTodayDayKey, getGoldPackCoins } from '@/lib/game/shop';
import { rollEquipmentChest } from '@/lib/game/items';
import { bnAdd } from '@/lib/game/bignum';
import {
  PERIPLE_EVENT, PERIPLE_MAX_DICE, PERIPLE_DICE_HARD_CAP, PERIPLE_PASS_START_TOKENS, PERIPLE_POINTS_PER_PIP,
  PERIPLE_START_REWARDS, PERIPLE_TIERS, PERIPLE_MISSIONS, PERIPLE_SHOP, PERIPLE_BOARD, PERIPLE_TITLE,
  GACHA_WHEEL, computePeripleDice, boardPath, countStartPasses, emptyPeripleDaily, isPeripleActive, isSkillTile,
  getSkillRewards, getHuntRewards, huntMedal, drawChanceCards, spinGachaWheel, PERIPLE_QUESTS, getPeripleQuestProgress,
  type PeripleDaily, type PeripleReward, type TileKind, type Medal, type ChanceCard, type PeripleStat,
} from '@/lib/game/periple';
import { toast } from '@/hooks/useToast';
import { broadcastLocalState, requestUrgentSave, runPeakPalierOf, getGoldChestMultiplier } from '../gameStoreHelpers';
import type { GameStore, PeripleActions } from '../gameStore.types';

export interface PeriplePull { templateId: string; edition: CardEdition }

/** Ce qu'une récompense a concrètement donné (pour l'affichage). */
export interface PeripleLoot {
  rewards: PeripleReward[];
  pulls: PeriplePull[];
  equipment: string[];     // ids d'équipement sortis des coffres
}

export interface PeriplePending { kind: TileKind; tile: number }

export interface PeripleRollResult {
  roll: number;
  from: number;
  path: number[];          // cases traversées (arrivée incluse)
  startPasses: number;
  landed: TileKind;
  pending: boolean;        // un mini-jeu attend sur la case d'arrivée
  loot: PeripleLoot;       // gains immédiats (points du dé, passage/arrêt au Départ)
}

export interface PeripleChanceResult {
  cards: ChanceCard[];
  picked: number;
  loot: PeripleLoot;
  bonusPath: number[];
  startPasses: number;
}

export interface PeripleWheelResult { segment: number; loot: PeripleLoot }

export const NO_LOOT: PeripleLoot = { rewards: [], pulls: [], equipment: [] };

// Applique la régénération des dés, le changement d'édition et le changement de jour.
function freshPatch(s: GameStore, now = Date.now()): Partial<GameStore> {
  const today = getTodayDayKey();
  if (s.peripleEventId !== PERIPLE_EVENT.id) {
    return {
      peripleEventId: PERIPLE_EVENT.id, peripleDice: PERIPLE_MAX_DICE, peripleDiceAt: now, periplePos: 0,
      peripleLaps: 0, peripleTokens: 0, periplePoints: 0, peripleTiersClaimed: [], peripleShopBought: {},
      peripleDaily: emptyPeripleDaily(today), periplePending: null, peripleStats: {}, peripleQuestsClaimed: [],
    };
  }
  const regen = computePeripleDice(s.peripleDice, s.peripleDiceAt, now);
  return {
    peripleDice: regen.dice, peripleDiceAt: regen.at,
    // Sauvegarde antérieure aux compteurs actuels : on complète les champs manquants.
    ...(s.peripleDaily?.day !== today ? { peripleDaily: emptyPeripleDaily(today) } : { peripleDaily: { ...emptyPeripleDaily(today), ...s.peripleDaily } }),
  };
}

function mergeLoot(a: PeripleLoot, b: PeripleLoot): PeripleLoot {
  return { rewards: [...a.rewards, ...b.rewards], pulls: [...a.pulls, ...b.pulls], equipment: [...a.equipment, ...b.equipment] };
}

export const createPeripleSlice: StateCreator<GameStore, [], [], PeripleActions> = (set, get) => {
  // Invocations offertes : même tirage que pullSingle, sans coût en gemmes.
  const freePulls = (count: number): PeriplePull[] => {
    if (count <= 0) return [];
    const ids = Array.from({ length: count }, () => rollCharacter(runPeakPalierOf(get()), DEFAULT_BANNER_ID));
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().recordGachaResults(ids, false);
    get().bumpQuestProgress('d_gacha', ids.length);
    get().bumpQuestProgress('w_gacha', ids.length);
    // Même Jeton d'Anomalie tous les 100 tirages cumulés que pullSingle.
    set(s => {
      const before = s.totalGachaPulls ?? 0;
      const total = before + ids.length;
      return { totalGachaPulls: total, anomalyTokens: s.anomalyTokens + Math.floor(total / 100) - Math.floor(before / 100) };
    });
    return results;
  };

  // Crédite une liste de récompenses et renvoie ce qu'elles ont donné.
  const grant = (rewards: PeripleReward[]): PeripleLoot => {
    const loot: PeripleLoot = { rewards, pulls: [], equipment: [] };
    for (const { kind, amount } of rewards) {
      switch (kind) {
        case 'gems':    set(s => ({ nekoGems: s.nekoGems + amount })); break;
        case 'tokens':  set(s => ({ peripleTokens: s.peripleTokens + amount })); break;
        case 'points':  set(s => ({ periplePoints: s.periplePoints + amount })); break;
        case 'dice':    set(s => ({ peripleDice: Math.min(PERIPLE_DICE_HARD_CAP, s.peripleDice + amount) })); break;
        case 'crowns':  get().grantEventRewards(undefined, 0, amount); break;
        case 'orbs':    set(s => ({ voidOrbs: s.voidOrbs + amount, totalVoidOrbsEarned: (s.totalVoidOrbsEarned ?? 0) + amount })); break;
        case 'anomaly': set(s => ({ anomalyTokens: s.anomalyTokens + amount })); break;
        case 'pulls':   loot.pulls.push(...freePulls(amount)); break;
        case 'chestRare':
        case 'chestEpic':
          for (let i = 0; i < amount; i++) {
            const itemId = rollEquipmentChest(kind === 'chestRare' ? 'rare' : 'epic');
            loot.equipment.push(itemId);
            set(s => ({ equipmentInventory: { ...s.equipmentInventory, [itemId]: (s.equipmentInventory[itemId] ?? 0) + 1 } }));
          }
          break;
        case 'boost': {
          const ms = amount * 60_000;
          set(s => ({
            dpsBoostEndsAt: Math.max(Date.now(), s.dpsBoostEndsAt) + ms,
            goldBoostEndsAt: Math.max(Date.now(), s.goldBoostEndsAt) + ms,
          }));
          break;
        }
        case 'gold': {
          const s = get();
          const coins = getGoldPackCoins({ id: 'periple', killsEquivalent: amount, gems: 0 }, s.palier, getGoldChestMultiplier(s.goldUpgradeLevel ?? 0));
          set(st => ({ pixelCoins: bnAdd(st.pixelCoins, coins) }));
          break;
        }
        case 'title': get().unlockTitle(PERIPLE_TITLE); break;
      }
    }
    return loot;
  };

  // Compteurs cumulés de l'édition (quêtes de l'événement).
  const bumpStats = (patch: Partial<Record<PeripleStat, number>>) =>
    set(s => {
      const st = { ...(s.peripleStats ?? {}) };
      for (const [k, v] of Object.entries(patch) as [PeripleStat, number][]) if (v) st[k] = (st[k] ?? 0) + v;
      return { peripleStats: st };
    });

  // Compteurs du jour (missions) + cumulés de l'édition (quêtes).
  const bumpDaily = (patch: Partial<Record<'games' | 'gold' | 'combat' | 'laps', number>>) => {
    set(s => {
      const d: PeripleDaily = { ...s.peripleDaily };
      for (const [k, v] of Object.entries(patch) as [keyof typeof patch, number][]) d[k] += v;
      return { peripleDaily: d };
    });
    bumpStats(patch);
  };

  // Fin de mini-jeu : libère la case et sauvegarde au plus tôt.
  const resolvePending = (loot: PeripleLoot) => {
    set({ periplePending: null });
    broadcastLocalState();
    if (loot.pulls.length > 0 || loot.equipment.length > 0) requestUrgentSave('periple_game');
  };

  return {
    ensurePeriple: () => set(s => freshPatch(s)),

    rollPeriple: () => {
      if (!isPeripleActive()) return null;
      set(s => freshPatch(s));
      const s = get();
      if (s.peripleDice <= 0 || s.periplePending) return null;

      const roll = 1 + Math.floor(Math.random() * 6);
      const from = s.periplePos;
      const path = boardPath(from, roll);
      const pos = path[path.length - 1];
      const startPasses = countStartPasses(from, roll);
      const landed = PERIPLE_BOARD[pos].kind;

      set({
        peripleDice: s.peripleDice - 1,
        // Repart le minuteur de régénération quand on repasse sous le plafond.
        peripleDiceAt: s.peripleDice >= PERIPLE_MAX_DICE ? Date.now() : s.peripleDiceAt,
        periplePos: pos,
        peripleLaps: s.peripleLaps + startPasses,
        peripleDaily: { ...s.peripleDaily, rolls: s.peripleDaily.rolls + 1, laps: s.peripleDaily.laps + startPasses },
        periplePending: landed === 'start' ? null : { kind: landed, tile: pos },
      });
      bumpStats({ rolls: 1, laps: startPasses });

      const immediate: PeripleReward[] = [{ kind: 'points', amount: roll * PERIPLE_POINTS_PER_PIP }];
      // S'arrêter pile sur le Départ remplace la prime de passage.
      if (landed === 'start') immediate.push(...PERIPLE_START_REWARDS);
      else if (startPasses > 0) immediate.push({ kind: 'tokens', amount: startPasses * PERIPLE_PASS_START_TOKENS });
      const loot = grant(immediate);
      broadcastLocalState();
      return { roll, from, path, startPasses, landed, pending: landed !== 'start', loot };
    },

    finishPeripleGame: (medal: Medal) => {
      const pending = get().periplePending;
      if (!pending || !isSkillTile(pending.kind)) return null;
      const m = Math.max(0, Math.min(3, Math.round(medal))) as Medal;
      const loot = grant(getSkillRewards(pending.kind, m));
      bumpDaily({ games: 1, gold: m === 3 ? 1 : 0, combat: pending.kind === 'combat' && m >= 2 ? 1 : 0 });
      if (m === 3) bumpStats({ [`gold_${pending.kind}`]: 1 });
      resolvePending(loot);
      return loot;
    },

    finishPeripleHunt: (score: number) => {
      const pending = get().periplePending;
      if (!pending || pending.kind !== 'hunt') return null;
      const medal = huntMedal(score);
      const loot = grant(getHuntRewards(score));
      set(s => ({ peripleStats: { ...(s.peripleStats ?? {}), huntBest: Math.max(s.peripleStats?.huntBest ?? 0, Math.floor(score)) } }));
      bumpDaily({ games: 1, gold: medal === 3 ? 1 : 0 });
      if (medal === 3) bumpStats({ gold_hunt: 1 });
      resolvePending(loot);
      return loot;
    },

    playPeripleChance: (picked) => {
      const pending = get().periplePending;
      if (!pending || pending.kind !== 'chance') return null;
      const cards = drawChanceCards();
      const index = Math.max(0, Math.min(cards.length - 1, picked));
      const card = cards[index];
      let loot = grant(card.rewards);

      let bonusPath: number[] = [];
      let startPasses = 0;
      if (card.move !== 0) {
        const from = get().periplePos;
        bonusPath = boardPath(from, card.move);
        startPasses = countStartPasses(from, card.move);
        set(s => ({
          periplePos: bonusPath[bonusPath.length - 1],
          peripleLaps: s.peripleLaps + startPasses,
          peripleDaily: { ...s.peripleDaily, laps: s.peripleDaily.laps + startPasses },
        }));
        bumpStats({ laps: startPasses });
        if (startPasses > 0) loot = mergeLoot(loot, grant([{ kind: 'tokens', amount: startPasses * PERIPLE_PASS_START_TOKENS }]));
      }
      bumpDaily({ games: 1 });
      bumpStats({ chance: 1 });
      resolvePending(loot);
      return { cards, picked: index, loot, bonusPath, startPasses };
    },

    spinPeripleWheel: () => {
      const pending = get().periplePending;
      if (!pending || pending.kind !== 'gacha') return null;
      const segment = spinGachaWheel();
      const loot = grant([GACHA_WHEEL[segment].reward]);
      bumpDaily({ games: 1 });
      bumpStats({ wheel: 1 });
      resolvePending(loot);
      return { segment, loot };
    },

    claimPeripleTier: (index) => {
      const s = get();
      const tier = PERIPLE_TIERS[index];
      if (!tier || s.periplePoints < tier.points || s.peripleTiersClaimed.includes(index)) return null;
      set({ peripleTiersClaimed: [...s.peripleTiersClaimed, index] });
      const loot = grant([tier.reward]);
      requestUrgentSave('periple_tier');
      return loot;
    },

    claimPeripleQuest: (id) => {
      set(s => freshPatch(s));
      const s = get();
      const q = PERIPLE_QUESTS.find(x => x.id === id);
      const claimed = s.peripleQuestsClaimed ?? [];
      if (!q || claimed.includes(id) || getPeripleQuestProgress(q, s.peripleStats ?? {}, s.peripleTiersClaimed.length) < q.target) return null;
      set({ peripleQuestsClaimed: [...claimed, id] });
      const loot = grant([{ kind: 'gems', amount: q.gems }]);
      requestUrgentSave('periple_quest');
      if (!get().suppressToasts) toast.quest('🏆 Quête du Périple', `${q.label} : +${q.gems} 💎`);
      return loot;
    },

    claimPeripleMission: (id) => {
      set(s => freshPatch(s));
      const s = get();
      const m = PERIPLE_MISSIONS.find(x => x.id === id);
      if (!m || s.peripleDaily.claimed.includes(id) || s.peripleDaily[m.counter] < m.target) return null;
      set({ peripleDaily: { ...s.peripleDaily, claimed: [...s.peripleDaily.claimed, id] } });
      bumpStats({ missions: 1 });
      const loot = grant([m.reward]);
      if (!get().suppressToasts) toast.quest('🎯 Mission du Périple', m.label);
      return loot;
    },

    buyPeripleItem: (id) => {
      set(s => freshPatch(s));
      const s = get();
      const item = PERIPLE_SHOP.find(x => x.id === id);
      if (!item) return null;
      const bought = item.daily ? (s.peripleDaily.shop[id] ?? 0) : (s.peripleShopBought[id] ?? 0);
      if (bought >= item.stock || s.peripleTokens < item.cost) return null;
      set(item.daily
        ? { peripleTokens: s.peripleTokens - item.cost, peripleDaily: { ...s.peripleDaily, shop: { ...s.peripleDaily.shop, [id]: bought + 1 } } }
        : { peripleTokens: s.peripleTokens - item.cost, peripleShopBought: { ...s.peripleShopBought, [id]: bought + 1 } });
      bumpStats({ spent: item.cost });
      const loot = grant([item.reward]);
      requestUrgentSave('periple_shop');
      return loot;
    },
  };
};

