// Gacha & collection : tirages, obtention de personnages, filtres de collection.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { defaultEquippedItems } from '@/types/game';
import { rollCharacter, rollMulti, rollMulti100, GACHA_COSTS } from '@/lib/game/gacha';
import { getCharacterById } from '@/lib/game/characters';
import { rollCardEdition, makeInstanceKey } from '@/lib/game/editions';
import { EVENT_BOSSES, getEventCharacterCost } from '@/lib/game/eventBoss';
import { getPrestigeBonuses } from '@/store/prestigeStore';
import { broadcastAndSaveLocal, requestUrgentSave, runPeakPalierOf } from '../gameStoreHelpers';
import type { GameStore, GachaActions } from '../gameStore.types';

export const createGachaSlice: StateCreator<GameStore, [], [], GachaActions> = (set, get) => ({
  setCollectionFilters: (patch) => set((state) => ({
    collectionFilter: patch.filter ?? state.collectionFilter,
    collectionUniverse: patch.universe ?? state.collectionUniverse,
    collectionAffinity: patch.affinity ?? state.collectionAffinity,
    collectionSort: patch.sort ?? state.collectionSort,
  })),

  // ─── Gacha ────────────────────────────────────────────────────────
  pullSingle: () => {
    if (get().nekoGems < GACHA_COSTS.single) return null;
    set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.single, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.single }));
    const id = rollCharacter(runPeakPalierOf(get()));
    const edition = get().addToCollection(id);
    get().bumpQuestProgress('w_gacha_10', 1);
    set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + 1 }));
    broadcastAndSaveLocal();
    requestUrgentSave();
    return { templateId: id, edition };
  },
  pullMulti: () => {
    if (get().nekoGems < GACHA_COSTS.multi10) return null;
    set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi10, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi10 }));
    const ids = rollMulti(runPeakPalierOf(get()));
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().bumpQuestProgress('w_gacha_10', ids.length);
    set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
    broadcastAndSaveLocal();
    requestUrgentSave();
    return results;
  },
  pullMulti100: () => {
    if (get().nekoGems < GACHA_COSTS.multi100) return null;
    set(s => ({ nekoGems: s.nekoGems - GACHA_COSTS.multi100, totalGemsSpent: (s.totalGemsSpent ?? 0) + GACHA_COSTS.multi100 }));
    const ids = rollMulti100(runPeakPalierOf(get()));
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().bumpQuestProgress('w_gacha_10', ids.length);
    set(s => ({ totalGachaPulls: (s.totalGachaPulls ?? 0) + ids.length }));
    broadcastAndSaveLocal();
    requestUrgentSave();
    return results;
  },
  addToCollection: (templateId) => {
    // L'édition (Base/Or/Diamant) est tirée à CHAQUE obtention — pas
    // seulement la première fois. Chaque édition d'un perso est une
    // entrée de collection séparée (progression indépendante), reliée au
    // même templateId pour l'art/nom/ultime.
    const prestigeBonuses = getPrestigeBonuses();
    const edition = rollCardEdition(prestigeBonuses.shinyGoldBonusPct, prestigeBonuses.shinyDiamondBonusPct);
    const instanceKey = makeInstanceKey(templateId, edition);

    const ex = get().collection[instanceKey];
    if (ex && ex.rank >= 7) {
      // Déjà au rang maximum (7★) → va dans l'Inventaire des Champions
      set(state => ({
        championInventory: {
          ...state.championInventory,
          [templateId]: (state.championInventory[templateId] ?? 0) + 1,
        },
      }));
      return edition;
    }
    set(state => {
      const ex2 = state.collection[instanceKey];
      const equippedItems = ex2?.equippedItems ?? defaultEquippedItems();
      // Bonus de Prestige "Mémoire des Rangs" — même traitement pour TOUS
      // les persos (shiny/forge/event compris, plus de banque illimitée
      // spéciale pour eux) : récupère jusqu'au pic historique atteint dans
      // une vie précédente (historicalMaxRank), plafonné par le niveau du
      // bonus acheté. Jamais consommé : reste disponible pour toutes les
      // obtentions futures. `legacyBanked` replie une seule fois l'ancien
      // système de banque illimitée (avant cette unification) dans le pic,
      // pour ne pas perdre le rang des joueurs qui en avaient déjà un en attente.
      const legacyBanked = state.bankedRanks[instanceKey];
      const newBankedRanks = legacyBanked !== undefined
        ? Object.fromEntries(Object.entries(state.bankedRanks).filter(([k]) => k !== instanceKey))
        : state.bankedRanks;
      const recoveryCap = prestigeBonuses.rankRecoveryCap;
      const peak = Math.max(state.historicalMaxRank[instanceKey] ?? 0, legacyBanked ?? 0) || undefined;
      const startRank = (recoveryCap > 0 && peak) ? Math.min(peak, recoveryCap) : 1;
      return {
        collection: {
          ...state.collection,
          [instanceKey]: ex2
            ? { ...ex2, copies: ex2.copies+1, rank: Math.min(ex2.rank+1, 7), equippedItems }
            : { templateId, rank: startRank, copies: startRank, level:1, currentForm:0, xp:0, equippedItems, edition },
        },
        bankedRanks: newBankedRanks,
      };
    });
    // "Obtenir X personnages différents" compte les TEMPLATES uniques
    // possédés (peu importe l'édition), pas le nombre d'instances.
    const uniqueOwned = new Set(
      Object.values(get().collection).map(c => c.templateId)
    ).size;
    get().setQuestProgress('e_collection_20', uniqueOwned);
    return edition;
  },

  buyEventCharacter: (bossId) => {
    const boss = EVENT_BOSSES.find(b => b.id === bossId);
    if (!boss) return false;
    const purchases = get().eventCharacterPurchases[bossId] ?? 0;
    const cost = getEventCharacterCost(boss, purchases);
    const owned = get().inventory[boss.coinItemId] ?? 0;
    if (owned < cost) return false;
    set(state => ({
      inventory: { ...state.inventory, [boss.coinItemId]: owned - cost },
      eventCharacterPurchases: { ...state.eventCharacterPurchases, [bossId]: purchases + 1 },
    }));
    get().addToCollection(boss.characterId);
    return true;
  },

  // Octroi déterministe (codes cadeaux "cheat") : rang 7★, dernière évolution,
  // niveau max de cette forme, édition choisie. Contourne le tirage aléatoire
  // normal d'addToCollection — sert pour des récompenses garanties.
  grantMaxedCharacter: (templateId, edition = 'diamond') => {
    const tpl = getCharacterById(templateId);
    if (!tpl) return;
    const lastForm = Math.max(0, (tpl.forms?.length ?? 1) - 1);
    const level = 1000;
    const key = makeInstanceKey(templateId, edition);
    set(state => ({
      collection: {
        ...state.collection,
        [key]: {
          templateId, rank: 7, copies: 7, level, currentForm: lastForm, xp: 0,
          edition, equippedItems: state.collection[key]?.equippedItems ?? defaultEquippedItems(),
        },
      },
    }));
  },
});
