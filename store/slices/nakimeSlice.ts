// Château de Nakime — mode roguelike infini (voir lib/game/nakime.ts pour les
// règles). La run en cours est sauvegardée telle quelle (nakimeRun) : comme
// tout son aléatoire dérive de run.seed, recharger la page ne permet ni de
// rejouer un combat perdu, ni de retirer d'autres cartes, offres ou
// récompenses. Rien ici n'est remis à zéro au Prestige (voir doPrestige, qui
// ne liste pas ces champs).
//
// Le butin de run (gemmes, Pierres d'Évolution, coffres) s'accumule dans
// run.loot et n'est crédité qu'à la fin de la run (défaite ou retraite), avec
// les Notes de Biwa (Mémoire du Château) et les paliers de record franchis.
import type { StateCreator } from 'zustand';
import { EVOLUTION_STONE_ITEM_ID, type CardEdition } from '@/types/game';
import { rollCharacter, DEFAULT_BANNER_ID } from '@/lib/game/gacha';
import { rollGachaPrize, isHighTier, NAKIME_GACHA_PITY, NAKIME_GACHA_TITLE, NAKIME_GACHA_TITLE_DUPLICATE_GEMS, type GachaPrize } from '@/lib/game/nakimeGacha';
import { rollEquipmentChest } from '@/lib/game/items';
import { getTodayDayKey } from '@/lib/game/shop';
import {
  NAKIME_DAILY_ENTRIES, NAKIME_UNLIMITED_ENTRIES, NAKIME_MILESTONES, NAKIME_META_BY_ID,
  battleAct, buyOffer, chooseEventOption, chooseReward, createRun, enterNode, floorsCleared, isValidRun, notesEarned, rerollShop, validateTeam,
  type NakimeLoot, type NakimeMilestone, type NakimeRun, type NodeResult, type MetaUpgradeId, type NakimeMetaLevels, type NakimeEvent, type BattleState,
} from '@/lib/game/nakime';
import { broadcastLocalState, requestUrgentSave, runPeakPalierOf } from '../gameStoreHelpers';
import type { GameStore, NakimeActions } from '../gameStore.types';

/** Bilan d'une run terminée (pour l'écran de fin). */
export interface NakimeRunEnd {
  floorsCleared: number;
  loot: NakimeLoot;          // gemmes déjà majorées par la Mémoire (Pillard)
  equipment: string[];       // ids d'équipement sortis des coffres
  newRecord: boolean;
  defeated: boolean;
  notes: number;             // Notes de Biwa gagnées
  milestones: NakimeMilestone[];  // paliers de record franchis pour la première fois
  bosses: number;
  elites: number;
}

/** Ce qui s'est passé sur un nœud de la carte. */
export interface NakimeNodeOutcome extends NodeResult { end?: NakimeRunEnd }

/** Résultat d'un ordre donné en combat : événements à animer, état final, issue éventuelle. */
export interface NakimeBattleOutcome { events: NakimeEvent[]; state: BattleState; result?: NakimeNodeOutcome }

/** Une capsule ouverte au Gachapon de l'Infini et ce qu'elle a donné. */
export interface NakimeGachaResult {
  prize: GachaPrize;
  pulls: { templateId: string; edition: CardEdition }[];  // invocations gratuites
  equipment: string[];                                       // ids d'équipement sortis des coffres
  pity: boolean;                                             // capsule obtenue grâce à la garantie
  titleDuplicate?: boolean;                                  // titre déjà possédé, remplacé par des gemmes
}

/** Une run passée (historique, 10 dernières). */
export interface NakimeHistoryEntry { at: number; floors: number; team: string[]; defeated: boolean; act: number }

export interface NakimeTotals { runs: number; floors: number; fights: number; elites: number; bosses: number }
export const emptyNakimeTotals = (): NakimeTotals => ({ runs: 0, floors: 0, fights: 0, elites: 0, bosses: 0 });

export const NAKIME_HISTORY_MAX = 10;

export function nakimeDailyEntries(meta: NakimeMetaLevels): number {
  if (NAKIME_UNLIMITED_ENTRIES) return Infinity;
  return NAKIME_DAILY_ENTRIES + (meta.entries ?? 0);
}

export function nakimeEntriesLeft(s: Pick<GameStore, 'nakimeDay' | 'nakimeEntriesUsed' | 'nakimeMeta'>): number {
  const used = s.nakimeDay === getTodayDayKey() ? s.nakimeEntriesUsed : 0;
  return Math.max(0, nakimeDailyEntries(s.nakimeMeta ?? {}) - used);
}

/** La run sauvegardée, si elle est au format actuel. */
export const currentNakimeRun = (s: Pick<GameStore, 'nakimeRun'>): NakimeRun | null => (isValidRun(s.nakimeRun) ? s.nakimeRun : null);

export const createNakimeSlice: StateCreator<GameStore, [], [], NakimeActions> = (set, get) => {
  // Crédite le butin, les Notes, les paliers de record, et ferme la run.
  const endRun = (run: NakimeRun, defeated: boolean): NakimeRunEnd => {
    const floors = floorsCleared(run);
    const s0 = get();
    const loot: NakimeLoot = { ...run.loot, gems: Math.round(run.loot.gems * (1 + run.meta.lootPct / 100)) };
    const claimed = new Set(s0.nakimeMilestones ?? []);
    const milestones = NAKIME_MILESTONES.filter(m => floors >= m.floor && !claimed.has(m.floor));
    let gems = loot.gems, stones = loot.stones, chestEpic = loot.chestEpic;
    for (const m of milestones) { gems += m.gems; stones += m.stones ?? 0; chestEpic += m.chestEpic ?? 0; }
    const equipment: string[] = [];
    for (let i = 0; i < loot.chestRare; i++) equipment.push(rollEquipmentChest('rare'));
    for (let i = 0; i < chestEpic; i++) equipment.push(rollEquipmentChest('epic'));
    const notes = notesEarned(run);
    const newRecord = floors > s0.nakimeBestFloor;
    set(s => {
      const equipmentInventory = { ...s.equipmentInventory };
      for (const id of equipment) equipmentInventory[id] = (equipmentInventory[id] ?? 0) + 1;
      const totals = { ...emptyNakimeTotals(), ...s.nakimeTotals };
      const entry: NakimeHistoryEntry = { at: Date.now(), floors, team: run.members.map(m => m.templateId), defeated, act: run.act };
      return {
        nakimeRun: null,
        nakimeBestFloor: Math.max(s.nakimeBestFloor, floors),
        nakimeRunsPlayed: s.nakimeRunsPlayed + 1,
        nakimeNotes: (s.nakimeNotes ?? 0) + notes,
        nakimeTickets: (s.nakimeTickets ?? 0) + (loot.tickets ?? 0),
        nakimeMilestones: [...(s.nakimeMilestones ?? []), ...milestones.map(m => m.floor)].sort((a, b) => a - b),
        nakimeHistory: [entry, ...(s.nakimeHistory ?? [])].slice(0, NAKIME_HISTORY_MAX),
        nakimeTotals: {
          runs: totals.runs + 1, floors: totals.floors + floors, fights: totals.fights + run.stats.fights,
          elites: totals.elites + run.stats.elites, bosses: totals.bosses + run.stats.bosses,
        },
        nekoGems: s.nekoGems + gems,
        expeditionDropInventory: stones > 0
          ? { ...s.expeditionDropInventory, [EVOLUTION_STONE_ITEM_ID]: (s.expeditionDropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0) + stones }
          : s.expeditionDropInventory,
        equipmentInventory,
      };
    });
    for (const m of milestones) if (m.title) get().unlockTitle(m.title);
    broadcastLocalState();
    requestUrgentSave('nakime_end');
    return {
      floorsCleared: floors, loot: { ...loot, gems, stones, chestEpic }, equipment, newRecord, defeated, notes, milestones,
      bosses: run.stats.bosses, elites: run.stats.elites,
    };
  };

  const getRun = () => currentNakimeRun(get());
  const setRun = (run: NakimeRun) => set({ nakimeRun: run });

  return {
    startNakimeRun: (keys) => {
      const s = get();
      if (getRun()) return 'Une run est déjà en cours.';
      if (nakimeEntriesLeft(s) <= 0) return 'Plus d\'entrée disponible aujourd\'hui.';
      const err = validateTeam(keys, s.collection);
      if (err) return err;
      const today = getTodayDayKey();
      const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
      set(st => ({
        nakimeRun: createRun(keys, seed, st.nakimeMeta ?? {}, Object.fromEntries(keys.map(k => [k, st.collection[k]?.edition]))),
        nakimeDay: today,
        nakimeEntriesUsed: (st.nakimeDay === today ? st.nakimeEntriesUsed : 0) + 1,
      }));
      requestUrgentSave('nakime_start');
      return null;
    },

    enterNakimeNode: (col) => {
      const run = getRun();
      if (!run) return null;
      const res = enterNode(run, col);
      if (!res) return null;
      if (res.result.defeated) return { ...res.result, end: endRun(res.run, true) };
      setRun(res.run);
      if (res.result.newAct) requestUrgentSave('nakime_act');
      return res.result;
    },

    actNakimeBattle: (ability, target) => {
      const run = getRun();
      if (!run) return 'Aucune run en cours.';
      const res = battleAct(run, ability, target);
      if (typeof res === 'string') return res;
      if (res.result?.defeated) return { events: res.events, state: res.state, result: { ...res.result, end: endRun(res.run, true) } };
      setRun(res.run);
      if (res.result) requestUrgentSave(res.result.newAct ? 'nakime_act' : 'nakime_fight');
      return { events: res.events, state: res.state, ...(res.result ? { result: res.result } : {}) };
    },

    chooseNakimeReward: (index) => {
      const run = getRun();
      if (!run) return 'Aucune run en cours.';
      const next = chooseReward(run, index);
      if (!next) return 'Choix invalide.';
      setRun(next);
      return null;
    },

    chooseNakimeEvent: (index) => {
      const run = getRun();
      if (!run) return 'Aucune run en cours.';
      const res = chooseEventOption(run, index);
      if (typeof res === 'string') return res;
      setRun(res.run);
      return res.lines;
    },

    buyNakimeOffer: (offerIndex, memberIndex) => {
      const run = getRun();
      if (!run) return 'Aucune run en cours.';
      const res = buyOffer(run, offerIndex, memberIndex);
      if (typeof res === 'string') return res;
      setRun(res);
      return null;
    },

    rerollNakimeShop: () => {
      const run = getRun();
      if (!run) return 'Aucune run en cours.';
      const res = rerollShop(run);
      if (typeof res === 'string') return res;
      setRun(res);
      return null;
    },

    leaveNakimeRoom: () => {
      const run = getRun();
      if (run?.room) setRun({ ...run, room: null });
    },

    abandonNakimeRun: () => {
      const run = getRun();
      if (!run) {
        // Run d'un format périmé : on la retire simplement.
        if (get().nakimeRun) set({ nakimeRun: null });
        return null;
      }
      return endRun(run, false);
    },

    pullNakimeGacha: (count) => {
      const s = get();
      const n = Math.max(1, Math.floor(count));
      if ((s.nakimeTickets ?? 0) < n) return "Pas assez de Tickets de l'Infini.";
      let pity = s.nakimeGachaPity ?? 0;
      const results: NakimeGachaResult[] = [];
      let gems = 0, stones = 0, notes = 0, anomaly = 0;
      let titleOwned = (s.unlockedTitles ?? []).includes(NAKIME_GACHA_TITLE);
      let newTitle = false;
      const pullIds: string[] = [];
      const equipment: string[] = [];
      for (let i = 0; i < n; i++) {
        const forced = pity + 1 >= NAKIME_GACHA_PITY;
        const prize = rollGachaPrize(pity);
        pity = isHighTier(prize.tier) ? 0 : pity + 1;
        const res: NakimeGachaResult = { prize, pulls: [], equipment: [], pity: forced };
        for (const r of prize.rewards) {
          switch (r.kind) {
            case 'gems': gems += r.amount; break;
            case 'stones': stones += r.amount; break;
            case 'notes': notes += r.amount; break;
            case 'anomaly': anomaly += r.amount; break;
            case 'title':
              // Titre déjà obtenu : remplacé par des gemmes.
              if (titleOwned) { gems += NAKIME_GACHA_TITLE_DUPLICATE_GEMS; res.titleDuplicate = true; }
              else { titleOwned = true; newTitle = true; }
              break;
            case 'pulls':
              for (let k = 0; k < r.amount; k++) {
                const id = rollCharacter(runPeakPalierOf(get()), DEFAULT_BANNER_ID);
                pullIds.push(id);
                res.pulls.push({ templateId: id, edition: get().addToCollection(id) });
              }
              break;
            case 'chestRare':
            case 'chestEpic':
              for (let k = 0; k < r.amount; k++) {
                const id = rollEquipmentChest(r.kind === 'chestRare' ? 'rare' : 'epic');
                equipment.push(id);
                res.equipment.push(id);
              }
              break;
          }
        }
        results.push(res);
      }
      if (pullIds.length) {
        // Mêmes effets qu'une invocation normale (voir freePulls du Grand Périple).
        get().recordGachaResults(pullIds, false);
        get().bumpQuestProgress('d_gacha', pullIds.length);
        get().bumpQuestProgress('w_gacha', pullIds.length);
      }
      set(st => {
        const equipmentInventory = { ...st.equipmentInventory };
        for (const id of equipment) equipmentInventory[id] = (equipmentInventory[id] ?? 0) + 1;
        const before = st.totalGachaPulls ?? 0;
        const totalPulls = before + pullIds.length;
        return {
          nakimeTickets: (st.nakimeTickets ?? 0) - n,
          nakimeGachaPity: pity,
          nakimeGachaPulls: (st.nakimeGachaPulls ?? 0) + n,
          nekoGems: st.nekoGems + gems,
          nakimeNotes: (st.nakimeNotes ?? 0) + notes,
          anomalyTokens: st.anomalyTokens + anomaly + (pullIds.length ? Math.floor(((st.totalGachaPulls ?? 0) + pullIds.length) / 100) - Math.floor((st.totalGachaPulls ?? 0) / 100) : 0),
          expeditionDropInventory: stones > 0
            ? { ...st.expeditionDropInventory, [EVOLUTION_STONE_ITEM_ID]: (st.expeditionDropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0) + stones }
            : st.expeditionDropInventory,
          equipmentInventory,
          ...(pullIds.length ? { totalGachaPulls: totalPulls } : {}),
        };
      });
      if (newTitle) get().unlockTitle(NAKIME_GACHA_TITLE);
      broadcastLocalState();
      requestUrgentSave('nakime_gacha');
      return results;
    },

    buyNakimeMeta: (id: MetaUpgradeId) => {
      const def = NAKIME_META_BY_ID[id];
      if (!def) return 'Amélioration inconnue.';
      const s = get();
      const lv = s.nakimeMeta?.[id] ?? 0;
      if (lv >= def.max) return 'Niveau maximum atteint.';
      const cost = def.cost(lv);
      if ((s.nakimeNotes ?? 0) < cost) return 'Pas assez de Notes de Biwa.';
      set(st => ({ nakimeNotes: (st.nakimeNotes ?? 0) - cost, nakimeMeta: { ...st.nakimeMeta, [id]: lv + 1 } }));
      requestUrgentSave('nakime_meta');
      return null;
    },
  };
};
