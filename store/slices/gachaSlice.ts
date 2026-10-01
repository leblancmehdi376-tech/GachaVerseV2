// Gacha & collection : tirages, obtention de personnages, filtres de collection.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { defaultEquippedItems } from '@/types/game';
import { rollCharacter, rollMulti, rollMulti100, GACHA_COSTS, DEFAULT_BANNER_ID } from '@/lib/game/gacha';
import { getCharacterById } from '@/lib/game/characters';
import {
  rollCardEdition, parseInstanceKey, getEditionPoints, editionFromPoints,
  EDITION_CONFIG, EDITION_MAX_POINTS,
} from '@/lib/game/editions';
import { RAID_BOSSES, getRaidCharacterCost } from '@/lib/game/raidBoss';
import { calcAnomalyBonuses } from '@/lib/game/anomalies';
import { broadcastLocalState, requestUrgentSave, runPeakPalierOf, getPrestigeBonuses } from '../gameStoreHelpers';
import type { GameStore, GachaActions } from '../gameStore.types';
import { STAT } from '@/lib/game/achievements';

// Jetons d'Anomalie : 1 tous les 100 tirages gacha CUMULÉS (à vie, jamais
// remis à zéro par le Prestige — même compteur que totalGachaPulls). On
// compte les paliers de 100 franchis entre l'ancien et le nouveau total,
// plutôt qu'un simple modulo, pour ne rien perdre sur un pull ×10/×100 qui
// chevauche plusieurs paliers de 100 d'un coup.
function anomalyTokensEarned(before: number, after: number): number {
  return Math.floor(after / 100) - Math.floor(before / 100);
}

export const createGachaSlice: StateCreator<GameStore, [], [], GachaActions> = (set, get) => ({
  setCollectionFilters: (patch) => set((state) => ({
    collectionFilters: { ...state.collectionFilters, ...patch },
  })),

  getGachaCosts: () => {
    const reduction = calcAnomalyBonuses(get().ownedAnomalies).gachaCostReductionPct;
    const mult = 1 - reduction;
    return {
      single: Math.max(1, Math.round(GACHA_COSTS.single * mult)),
      multi10: Math.max(1, Math.round(GACHA_COSTS.multi10 * mult)),
      multi100: Math.max(1, Math.round(GACHA_COSTS.multi100 * mult)),
    };
  },

  // ─── Gacha ────────────────────────────────────────────────────────
  pullSingle: (bannerId = DEFAULT_BANNER_ID) => {
    const cost = get().getGachaCosts().single;
    if (get().nekoGems < cost) return null;
    set(s => ({ nekoGems: s.nekoGems - cost, totalGemsSpent: (s.totalGemsSpent ?? 0) + cost }));
    const id = rollCharacter(runPeakPalierOf(get()), bannerId);
    const edition = get().addToCollection(id);
    get().recordGachaResults([id], bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', 1);
    get().bumpQuestProgress('w_gacha', 1);
    set(s => {
      const total = (s.totalGachaPulls ?? 0) + 1;
      return { totalGachaPulls: total, anomalyTokens: s.anomalyTokens + anomalyTokensEarned(s.totalGachaPulls ?? 0, total) };
    });
    broadcastLocalState();
    requestUrgentSave('gacha_single');
    return { templateId: id, edition };
  },
  pullMulti: (bannerId = DEFAULT_BANNER_ID) => {
    const cost = get().getGachaCosts().multi10;
    if (get().nekoGems < cost) return null;
    set(s => ({ nekoGems: s.nekoGems - cost, totalGemsSpent: (s.totalGemsSpent ?? 0) + cost }));
    const ids = rollMulti(runPeakPalierOf(get()), bannerId);
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().recordGachaResults(ids, bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', ids.length);
    get().bumpQuestProgress('w_gacha', ids.length);
    set(s => {
      const total = (s.totalGachaPulls ?? 0) + ids.length;
      return { totalGachaPulls: total, anomalyTokens: s.anomalyTokens + anomalyTokensEarned(s.totalGachaPulls ?? 0, total) };
    });
    broadcastLocalState();
    requestUrgentSave('gacha_multi10');
    return results;
  },
  pullMulti100: (bannerId = DEFAULT_BANNER_ID) => {
    const cost = get().getGachaCosts().multi100;
    if (get().nekoGems < cost) return null;
    set(s => ({ nekoGems: s.nekoGems - cost, totalGemsSpent: (s.totalGemsSpent ?? 0) + cost }));
    const ids = rollMulti100(runPeakPalierOf(get()), bannerId);
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().recordGachaResults(ids, bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', ids.length);
    get().bumpQuestProgress('w_gacha', ids.length);
    set(s => {
      const total = (s.totalGachaPulls ?? 0) + ids.length;
      return { totalGachaPulls: total, anomalyTokens: s.anomalyTokens + anomalyTokensEarned(s.totalGachaPulls ?? 0, total) };
    });
    broadcastLocalState();
    requestUrgentSave('gacha_multi100');
    return results;
  },
  addToCollection: (rawId) => {
    // UNE seule carte par perso : l'édition tirée à chaque obtention ajoute
    // sa valeur en points à la jauge d'édition de la carte (voir
    // lib/game/editions.ts). parseInstanceKey : une ancienne annonce d'HdV
    // peut encore porter une clé "id::gold".
    const templateId = parseInstanceKey(rawId).templateId;
    const prestigeBonuses = getPrestigeBonuses(get().prestigeBonusLevels, get().prestigeRankRecoveryLevel);
    const edition = rollCardEdition(prestigeBonuses.editionRateBonusPct);
    const gained = EDITION_CONFIG[edition].points;

    const ex = get().collection[templateId];
    if (ex && getEditionPoints(ex) >= EDITION_MAX_POINTS) {
      // Déjà Prismatique (jauge pleine) → va dans l'Inventaire des Champions
      set(state => ({
        championInventory: {
          ...state.championInventory,
          [templateId]: (state.championInventory[templateId] ?? 0) + 1,
        },
      }));
      return edition;
    }
    set(state => {
      const ex2 = state.collection[templateId];
      const equippedItems = ex2?.equippedItems ?? defaultEquippedItems();
      // Bonus de Prestige "Mémoire des Pierres" : à la première obtention
      // d'une carte, lui rend la jauge d'édition atteinte dans une vie
      // précédente (historicalEditionPoints), plafonnée par le niveau du bonus
      // acheté. Jamais consommé : reste disponible pour les obtentions futures.
      const memory = ex2 ? 0 : Math.min(state.historicalEditionPoints[templateId] ?? 0, prestigeBonuses.stoneMemoryCapPoints);
      const editionPoints = Math.min(EDITION_MAX_POINTS, (ex2 ? getEditionPoints(ex2) : memory) + gained);
      return {
        collection: {
          ...state.collection,
          [templateId]: ex2
            ? { ...ex2, copies: ex2.copies+1, equippedItems, editionPoints, edition: editionFromPoints(editionPoints) }
            : { templateId, copies: 1, level:1, currentForm:0, xp:0, equippedItems, editionPoints, edition: editionFromPoints(editionPoints) },
        },
      };
    });
    get().setQuestProgress('e_collection_100', Object.keys(get().collection).length);
    return edition;
  },

  buyRaidCharacter: (bossId) => {
    const boss = RAID_BOSSES.find(b => b.id === bossId);
    if (!boss) return false;
    const purchases = get().raidCharacterPurchases[bossId] ?? 0;
    const cost = getRaidCharacterCost(boss, purchases);
    const owned = get().inventory[boss.coinItemId] ?? 0;
    if (owned < cost) return false;
    set(state => ({
      inventory: { ...state.inventory, [boss.coinItemId]: owned - cost },
      raidCharacterPurchases: { ...state.raidCharacterPurchases, [bossId]: purchases + 1 },
    }));
    get().addStat(STAT.shopPurchases);
    get().addToCollection(boss.characterId);
    return true;
  },

  // Octroi déterministe (codes cadeaux "cheat") : dernière évolution,
  // niveau max de cette forme, édition choisie. Contourne le tirage aléatoire
  // normal d'addToCollection — sert pour des récompenses garanties.
  grantMaxedCharacter: (templateId, edition = 'diamond') => {
    const tpl = getCharacterById(templateId);
    if (!tpl) return;
    const lastForm = Math.max(0, (tpl.forms?.length ?? 1) - 1);
    const level = 1000;
    set(state => {
      const ex = state.collection[templateId];
      // Jamais de régression de jauge si la carte était déjà plus haute.
      const editionPoints = Math.max(ex ? getEditionPoints(ex) : 0, EDITION_CONFIG[edition].points);
      return {
        collection: {
          ...state.collection,
          [templateId]: {
            templateId, copies: Math.max(1, ex?.copies ?? 0), level, currentForm: lastForm, xp: 0,
            editionPoints, edition: editionFromPoints(editionPoints),
            equippedItems: ex?.equippedItems ?? defaultEquippedItems(),
          },
        },
      };
    });
  },
});
