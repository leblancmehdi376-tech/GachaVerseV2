// Gacha & collection : tirages, obtention de personnages, filtres de collection.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { defaultEquippedItems } from '@/types/game';
import { rollCharacter, rollMulti, rollMulti100, GACHA_COSTS, DEFAULT_BANNER_ID, type BannerId } from '@/lib/game/gacha';
import { getFeaturedUniverse, canExchangeForCharacter, SPARK_COSTS } from '@/lib/game/featuredBanner';
import { getCharacterById } from '@/lib/game/characters';
import { getVoidOrbsForCharacter } from '@/lib/game/shop';
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

// Bannière vedette : univers mis en avant aujourd'hui (rate-up du tirage).
function rateUpFor(bannerId: BannerId): string | undefined {
  return bannerId === 'featured' ? getFeaturedUniverse() : undefined;
}

// Compteurs communs à tout tirage de `count` invocations (même set() que
// totalGachaPulls) : Jetons d'Anomalie et, sur la bannière vedette, 1
// Étincelle par invocation.
function pullCountersPatch(s: GameStore, bannerId: BannerId, count: number): Partial<GameStore> {
  const total = (s.totalGachaPulls ?? 0) + count;
  return {
    totalGachaPulls: total,
    anomalyTokens: s.anomalyTokens + anomalyTokensEarned(s.totalGachaPulls ?? 0, total),
    ...(bannerId === 'featured' && { gachaSparks: (s.gachaSparks ?? 0) + count }),
  };
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
    const id = rollCharacter(runPeakPalierOf(get()), bannerId, rateUpFor(bannerId));
    const edition = get().addToCollection(id);
    get().recordGachaResults([id], bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', 1);
    get().bumpQuestProgress('w_gacha', 1);
    set(s => pullCountersPatch(s, bannerId, 1));
    if (bannerId === 'featured') get().addStat(STAT.featuredPulls, 1);
    broadcastLocalState();
    requestUrgentSave('gacha_single');
    return { templateId: id, edition };
  },
  pullMulti: (bannerId = DEFAULT_BANNER_ID) => {
    const cost = get().getGachaCosts().multi10;
    if (get().nekoGems < cost) return null;
    set(s => ({ nekoGems: s.nekoGems - cost, totalGemsSpent: (s.totalGemsSpent ?? 0) + cost }));
    const ids = rollMulti(runPeakPalierOf(get()), bannerId, rateUpFor(bannerId));
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().recordGachaResults(ids, bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', ids.length);
    get().bumpQuestProgress('w_gacha', ids.length);
    set(s => pullCountersPatch(s, bannerId, ids.length));
    if (bannerId === 'featured') get().addStat(STAT.featuredPulls, ids.length);
    broadcastLocalState();
    requestUrgentSave('gacha_multi10');
    return results;
  },
  pullMulti100: (bannerId = DEFAULT_BANNER_ID) => {
    const cost = get().getGachaCosts().multi100;
    if (get().nekoGems < cost) return null;
    set(s => ({ nekoGems: s.nekoGems - cost, totalGemsSpent: (s.totalGemsSpent ?? 0) + cost }));
    const ids = rollMulti100(runPeakPalierOf(get()), bannerId, rateUpFor(bannerId));
    const results = ids.map(id => ({ templateId: id, edition: get().addToCollection(id) }));
    get().recordGachaResults(ids, bannerId === 'vol2');
    get().bumpQuestProgress('d_gacha', ids.length);
    get().bumpQuestProgress('w_gacha', ids.length);
    set(s => pullCountersPatch(s, bannerId, ids.length));
    if (bannerId === 'featured') get().addStat(STAT.featuredPulls, ids.length);
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
      // Déjà Prismatique (jauge pleine) → recyclé directement en Orbes du Néant
      const orbs = getVoidOrbsForCharacter(templateId);
      set(state => ({ voidOrbs: state.voidOrbs + orbs, totalVoidOrbsEarned: (state.totalVoidOrbsEarned ?? 0) + orbs }));
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

  exchangeSparks: (templateId) => {
    const s = get();
    const tpl = getCharacterById(templateId);
    if (!tpl || !canExchangeForCharacter(tpl, getFeaturedUniverse(), runPeakPalierOf(s))) return null;
    // Carte déjà Prismatique : l'obtenir de nouveau la recyclerait en Orbes.
    const owned = s.collection[templateId];
    if (owned && getEditionPoints(owned) >= EDITION_MAX_POINTS) return null;
    const cost = SPARK_COSTS[tpl.rarity];
    if ((s.gachaSparks ?? 0) < cost) return null;
    set(st => ({ gachaSparks: (st.gachaSparks ?? 0) - cost }));
    const edition = get().addToCollection(templateId);
    get().addStat(STAT.sparkExchanges);
    broadcastLocalState();
    requestUrgentSave('gacha_sparks');
    return { templateId, edition };
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
