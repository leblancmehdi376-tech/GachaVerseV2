// Progression long-terme : gains hors-ligne (idle) et Prestige (New Game+).
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { Rarity } from '@/types/game';
import { generateEnemy } from '@/lib/game/enemies';
import { makeInstanceKey } from '@/lib/game/editions';
import { correctedNow } from '@/lib/firebase/clockOffset';
import { calcTokensAwarded } from '@/lib/game/prestige';
import { toast } from '@/hooks/useToast';
import {
  OFFLINE_MULT_TIERS, OFFLINE_REWARD_SCALE_TIERS, OFFLINE_CAP_TIERS_H,
  OFFLINE_MULT_COSTS, OFFLINE_CAP_COSTS, OFFLINE_MIN_SECONDS, MOB_GEM_DROP_CHANCE,
  broadcastLocalState, bumpCoinQuests, runPeakPalierOf, getPrestigeBonuses,
  requestUrgentSaveAndWait,
} from '../gameStoreHelpers';
import type { GameStore, MetaProgressionActions, OfflineGain } from '../gameStore.types';
import { BN_ZERO, bnAdd, bnDivRatio, bnIsZero, bnMul, bnMulScalar, bnToNumber } from '@/lib/game/bignum';

export const createMetaProgressionSlice: StateCreator<GameStore, [], [], MetaProgressionActions> = (set, get) => ({
  // ─── Gains hors-ligne (idle) ──────────────────────────────────────
  getOfflineMult: () => OFFLINE_MULT_TIERS[Math.min(get().offlineMultLevel ?? 0, OFFLINE_MULT_TIERS.length - 1)],
  getOfflineCapHours: () => OFFLINE_CAP_TIERS_H[Math.min(get().offlineCapLevel ?? 0, OFFLINE_CAP_TIERS_H.length - 1)],
  getOfflineRewardScale: () => OFFLINE_REWARD_SCALE_TIERS[Math.min(get().offlineMultLevel ?? 0, OFFLINE_REWARD_SCALE_TIERS.length - 1)],

  // Nombre de mobs NORMAUX tués par heure (aucun boss n'est simulé hors-ligne).
  getOfflineKillsPerHour: () => {
    const s = get();
    const enemy = s.currentEnemy;
    if (!enemy || bnIsZero(enemy.maxHp)) return 0;
    const dps = s.getTotalDps();
    if (bnIsZero(dps)) return 0;
    return bnDivRatio(dps, enemy.maxHp) * 3600 * s.getOfflineMult();
  },

  // Revenu passif estimé (coins/heure) = mobs/h × butin d'un mob × multiplicateurs.
  getOfflineCoinsPerHour: () => {
    const s = get();
    const enemy = s.currentEnemy;
    if (!enemy) return BN_ZERO;
    const goldMult = s.getGoldMultiplier();
    const coinMult = getPrestigeBonuses(s.prestigeBonusLevels, s.prestigeRankRecoveryLevel).coinsMult;
    const coinsPerKill = bnMulScalar(bnMul(enemy.pixelCoinsReward, goldMult), coinMult);
    return bnMulScalar(coinsPerKill, s.getOfflineKillsPerHour());
  },

  // Gemmes/heure = mobs/h × taux de drop de gemme sur un mob normal.
  // (Aucune gemme de passage de palier : on ne simule pas de boss.)
  getOfflineGemsPerHour: () => get().getOfflineKillsPerHour() * MOB_GEM_DROP_CHANCE,

  getOfflineMultCost: () => {
    const lvl = get().offlineMultLevel ?? 0;
    return lvl >= OFFLINE_MULT_COSTS.length ? null : OFFLINE_MULT_COSTS[lvl];
  },
  getOfflineCapCost: () => {
    const lvl = get().offlineCapLevel ?? 0;
    return lvl >= OFFLINE_CAP_COSTS.length ? null : OFFLINE_CAP_COSTS[lvl];
  },

  upgradeOfflineMult: () => {
    const cost = get().getOfflineMultCost();
    if (cost === null || get().bossCrowns < cost) return;
    set(state => ({ bossCrowns: state.bossCrowns - cost, offlineMultLevel: (state.offlineMultLevel ?? 0) + 1 }));
    broadcastLocalState();
  },
  upgradeOfflineCap: () => {
    const cost = get().getOfflineCapCost();
    if (cost === null || get().bossCrowns < cost) return;
    set(state => ({ bossCrowns: state.bossCrowns - cost, offlineCapLevel: (state.offlineCapLevel ?? 0) + 1 }));
    broadcastLocalState();
  },

  // Calcule (SANS RIEN CRÉDITER) le gain depuis la dernière sauvegarde connue
  // (`savedAt` — la même valeur, quel que soit l'appareil, que celle lue/écrite
  // en base par useCloudSave). Comparer "maintenant" à ce timestamp unique est
  // ce qui rend le calcul identique sur PC, téléphone ou ailleurs : on ne
  // dépend plus d'un compteur local mis à jour pendant qu'on joue. Retourne
  // le récap à afficher (ou null si rien à réclamer) ; ne modifie aucun état.
  checkOfflineGain: () => {
    const s = get();
    const now  = correctedNow();
    const last = s.savedAt;
    if (!last) return null; // jamais sauvegardé (tout nouveau compte) : rien à calculer
    const rawSeconds = Math.max(0, Math.floor((now - last) / 1000));
    if (rawSeconds < OFFLINE_MIN_SECONDS) return null;

    const capSeconds = s.getOfflineCapHours() * 3600;
    const seconds    = Math.min(rawSeconds, capSeconds);
    const hours      = seconds / 3600;

    // Simulation de mobs NORMAUX uniquement : aucun boss → aucune couronne,
    // aucun passage de palier, et les gemmes viennent du drop des mobs.
    const rewardScale = s.getOfflineRewardScale();
    const kills = Math.floor(s.getOfflineKillsPerHour() * hours);
    const coins = bnMulScalar(s.getOfflineCoinsPerHour(), hours * rewardScale);
    const gems  = Math.floor(s.getOfflineGemsPerHour()   * hours * rewardScale);

    const gain: OfflineGain = { coins, gems, kills, seconds, rawSeconds, capped: rawSeconds > capSeconds, at: now };
    return (!bnIsZero(coins) || gems > 0) ? gain : null;
  },

  // Crédite un gain précédemment calculé par checkOfflineGain — appelé
  // uniquement quand le joueur clique sur "RÉCUPÉRER" dans la popup.
  claimOfflineEarnings: (gain) => {
    set(state => {
      // bnToNumber peut saturer à Infinity à très haut palier, mais
      // bumpCoinQuests ne s'en sert que pour comparer à un plafond de quête
      // fixe (Math.min) — reste correct même saturé.
      const cq = bumpCoinQuests(state.quests, state.weeklyQuests ?? [], bnToNumber(gain.coins));
      return {
        pixelCoins: bnAdd(state.pixelCoins, gain.coins),
        nekoGems:   state.nekoGems + gain.gems,
        savedAt: gain.at,
        lastOfflineGain: gain,
        quests: cq.quests, weeklyQuests: cq.weeklyQuests,
      };
    });
    broadcastLocalState();
  },

  // ─── Prestige (New Game+) ─────────────────────────────────────────
  // Débloqué au palier 41 CETTE run (runPeakPalier, pas le lifetime
  // maxPalierReached), non obligatoire, repétable à volonté au-delà —
  // il faut regrinder jusqu'à 41 à chaque fois, runPeakPalier étant remis
  // à 1 par ce reset (voir runPeakPalierOf()).
  // Reset : équipements, coins, collection (rang/forme/niveau des cartes),
  //         pièces perso d'event, items de forge, héros, combat en cours,
  //         expéditions en cours (annulées : leurs persos n'existeront
  //         plus dans la collection vidée).
  // Conserve : gemmes, maxPalierReached (classement), succès/titres
  //            (store dédié), quêtes, monnaies premium (BossCrowns,
  //            Orbes du Néant). TOUTES les cartes (shiny/forge/event
  //            compris — même traitement que les persos normaux depuis
  //            l'unification) ont leur rang max banqué (historicalMaxRank),
  //            récupérable à la re-obtention seulement via le bonus de
  //            Prestige "Mémoire des Rangs" (voir addToCollection).
  doPrestige: async () => {
    const state = get();
    const runPeak = runPeakPalierOf(state);
    if (!state.canPrestige(runPeak)) return;

    // Rang MAX jamais atteint, TOUTES les cartes (voir bonus "Mémoire des
    // Rangs") — Math.max pour ne jamais écraser un pic antérieur par un
    // rang plus bas (le bonus plafonne volontairement la récup en-dessous
    // du pic tant que son niveau n'est pas suffisant).
    const newHistoricalMaxRank = { ...state.historicalMaxRank };
    for (const owned of Object.values(state.collection)) {
      const edition = owned.edition ?? 'base';
      const key = makeInstanceKey(owned.templateId, edition);
      newHistoricalMaxRank[key] = Math.max(newHistoricalMaxRank[key] ?? 0, owned.rank);
    }

    // Incrémente le niveau de prestige et crédite les jetons + toast (le
    // nombre de jetons dépend du palier atteint CETTE run, pas du lifetime —
    // sinon represtiger juste après en donnerait déjà plein). Inliné ici
    // (au lieu d'un PrestigeActions.doPrestige séparé) pour éviter une
    // collision de nom avec cette action elle-même, exposée à l'UI.
    const newPrestigeLevel = state.prestigeLevel + 1;
    const tokensAwarded = calcTokensAwarded(runPeak, state.prestigeBonusLevels.tokenGain);
    toast.palier(
      `⭐ PRESTIGE ${newPrestigeLevel} ATTEINT !`,
      `+${tokensAwarded} jeton${tokensAwarded > 1 ? 's' : ''} de Prestige`
    );

    // Succès "de run" (kills, dps, coins, pulls, amélios, collection,
    // quêtes, rang 7★) remis à zéro — voir lib/game/achievements.ts.
    get().resetPrestigeAchievements();

    set({
      // ── Reset ──
      equipmentInventory: {},
      unlockedEquipRarities: ['C'] as Rarity[],
      unlockedEquipDropRarities: ['C'] as Rarity[],
      pixelCoins: BN_ZERO,
      collection: {},
      championInventory: {},
      historicalMaxRank: newHistoricalMaxRank,
      equippedTeam: [null, null, null, null],
      inventory: {},
      goldUpgradeLevel: 0,
      hero: { level: 1, currentForm: 0, xp: 0 },
      wave: 1,
      palier: 1,
      runPeakPalier: 1,
      currentEnemy: generateEnemy(1, 1, 1),
      bossActive: false,
      bossTimeLeft: 0,
      bossAvoided: false,
      ultUsedThisFight: [],
      prestigeLevel: newPrestigeLevel,
      prestigeTokens: state.prestigeTokens + tokensAwarded,
      // Annule les expéditions en cours (leurs persos n'existent plus dans
      // la collection qu'on vient de vider) et vide les drops de forge.
      expeditionDropInventory: {},
      expeditionActive: [],
      // ── Conservé : maxPalierReached, nekoGems, bossCrowns, voidOrbs ──
    });

    broadcastLocalState();

    // Pousse le reset en base IMMÉDIATEMENT et attend la confirmation
    // Firestore, plutôt que de compter sur le prochain cycle périodique
    // (jusqu'à 10min) — sans ça, changer d'appareil juste après un prestige
    // peut recharger l'ancienne collection alors que prestigeLevel, lui, a
    // déjà été incrémenté (voir requestUrgentSaveAndWait).
    await requestUrgentSaveAndWait('prestige');
  },
});
