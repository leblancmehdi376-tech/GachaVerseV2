// Helpers et constantes partagés entre plusieurs slices du store de jeu.
// Fichier "feuille" : ne dépend JAMAIS de gameStore.ts ni d'aucun slice, pour
// éviter tout cycle d'import statique (voir le commentaire sur
// requestUrgentSave ci-dessous — même souci que useCloudSave/expeditionStore).
import { GameState } from '@/types/game';
import { generateEnemy, COIN_BASE, COIN_GROWTH } from '@/lib/game/enemies';
import { getPalierConfig } from '@/lib/game/paliers';
import { getEquipmentDrop } from '@/lib/game/items';
import { getTitleGoldMultiplier } from '@/lib/game/titles';
import { BOOST_MULTIPLIER } from '@/lib/game/shop';
import {
  PrestigeBonusLevels, ActivePrestigeBonuses, calcPrestigeBonuses, rankRecoveryCap,
} from '@/lib/game/prestige';
import type { Quest, ActiveUlt } from './gameStore.types';
import { type BigNum, bnAdd, bnIsZero, bnMul, bnMulScalar, bnPow, bnToNumber } from '@/lib/game/bignum';

// ── Anti-exploit multi-onglets ─────────────────────────────────────────────
// Diffuse un instantané aux autres onglets ouverts du même navigateur via
// BroadcastChannel, pour qu'un pull gacha (ou autre dépense) dans un onglet
// se répercute immédiatement dans les autres — sans ça, un joueur pourrait
// dépenser les mêmes gemmes deux fois en jonglant entre onglets avant que la
// synchro périodique (30s/10min, voir useCloudSave.ts) ne les recale.
// N'écrit PAS en localStorage : ça a existé (clé 'gachaverse_save_v2',
// partagée avec useCloudSave.ts) mais rien ne relisait jamais cette clé —
// seul le message BroadcastChannel ci-dessous est réellement consommé (par
// le listener juste en dessous, dans les autres onglets).
const BROADCAST_CHANNEL = typeof window !== 'undefined' ? new BroadcastChannel('gachaverse_state') : null;

// Import différé de useGameStore : gameStore.ts importe déjà ce fichier, un
// import statique créerait un cycle (même pattern que requestUrgentSave
// ci-dessous).
export function broadcastLocalState() {
  if (typeof window === 'undefined') return;
  try {
    const { useGameStore } = require('@/store/gameStore');
    const s = useGameStore.getState();
    const snapshot = { nekoGems: s.nekoGems, collection: s.collection, equipmentInventory: s.equipmentInventory };
    BROADCAST_CHANNEL?.postMessage({ type: 'PULL_SYNC', data: snapshot });
  } catch { /* ignore */ }
}

// Écoute les mises à jour des autres onglets
if (BROADCAST_CHANNEL) {
  BROADCAST_CHANNEL.onmessage = (event) => {
    if (event.data?.type === 'PULL_SYNC') {
      const { nekoGems, collection, equipmentInventory } = event.data.data;
      try {
        const { useGameStore } = require('@/store/gameStore');
        useGameStore.setState({ nekoGems, collection, equipmentInventory });
      } catch { /* ignore */ }
    }
  };
}

// ── Quêtes : définitions statiques ──────────────────────────────────────
// ── Quêtes journalières (reset 2h Paris) ─────────────────────────────────
export const DAILY_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'d_kills_500',    label:'Vaincre 500 monstres',          icon:'⚔',  target:500,   reward:15, rewardType:'gems',  type:'daily' },
  { id:'d_kills_1000',   label:'Vaincre 1 000 monstres',        icon:'💀',  target:1000,  reward:25, rewardType:'gems',  type:'daily' },
  { id:'d_kills_250',    label:'Vaincre 250 monstres',          icon:'⚔',  target:250,   reward:12, rewardType:'gems',  type:'daily' },
  { id:'d_upgrade_10',   label:'Améliorer 10 fois',             icon:'⬆',  target:10,    reward:10, rewardType:'gems',  type:'daily' },
  { id:'d_boss_kill',    label:'Vaincre 1 boss de palier',      icon:'👑',  target:1,     reward:20, rewardType:'gems',  type:'daily' },
  { id:'d_coins_1m',     label:'Accumuler 1 000 000 coins',     icon:'🪙',  target:1_000_000, reward:15, rewardType:'gems', type:'daily' },
];

// ── Quêtes hebdomadaires (reset lundi 2h Paris) ───────────────────────────
export const WEEKLY_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'w_kills_5000',   label:'Vaincre 5 000 monstres',        icon:'⚔',  target:5000,  reward:80,  rewardType:'gems',  type:'weekly' },
  { id:'w_boss_5',       label:'Vaincre 5 boss de palier',      icon:'👑',  target:5,     reward:100, rewardType:'gems',  type:'weekly' },
  { id:'w_upgrade_50',   label:'Améliorer 50 fois',             icon:'⬆',  target:50,    reward:60,  rewardType:'gems',  type:'weekly' },
  { id:'w_gacha_10',     label:'Effectuer 10 tirages gacha',    icon:'💎',  target:10,    reward:120, rewardType:'gems',  type:'weekly' },
  { id:'w_coins_10m',    label:'Accumuler 10 000 000 coins',    icon:'🪙',  target:10_000_000, reward:70, rewardType:'gems', type:'weekly' },
  { id:'w_expedition_1', label:'Terminer 1 expédition',         icon:'🧭',  target:1,     reward:90,  rewardType:'gems',  type:'weekly' },
];

// ── Quêtes d'événement (permanentes jusqu'à complétion) ───────────────────
export const EVENT_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'e_forge_1',      label:'Forger ton premier personnage',         icon:'⚗',  target:1,   reward:200, rewardType:'gems',  type:'event' },
  { id:'e_expedition_5', label:'Terminer 5 expéditions',               icon:'🧭',  target:5,   reward:150, rewardType:'gems',  type:'event' },
  { id:'e_palier_10',    label:'Atteindre le palier 10',               icon:'🌌',  target:10,  reward:180, rewardType:'gems',  type:'event' },
  { id:'e_palier_20',    label:'Atteindre le palier 20',               icon:'👑',  target:20,  reward:300, rewardType:'gems',  type:'event' },
  { id:'e_collection_20',label:'Obtenir 20 personnages différents',    icon:'📚',  target:20,  reward:120, rewardType:'gems',  type:'event' },
  { id:'e_boss_20',      label:'Vaincre 20 boss au total',             icon:'💀',  target:20,  reward:250, rewardType:'gems',  type:'event' },
];

// Coût et multiplicateur du Coffre d'Or — partagés entre upgradeGold() et resolveEnemyDeath()
// Chaque palier atteint débloque un niveau de coffre achetable (niveau max
// achetable = maxPalierReached) ; le multiplicateur et le coût sont désormais
// des formules fixes, plus des paliers manuels plafonnés.
//base=COIN_BASE*50 COIN_BASE retrouvable dans ennemies.ts
export const GOLD_CHEST_COST_BASE   = COIN_BASE * 50;  // coût du coffre d'or niveau 0
//growth=COIN_GROWTH+0.02 COIN_GROWTH retrouvable dans ennemies.ts
export const GOLD_CHEST_COST_GROWTH = COIN_GROWTH + 0.02; // coût du coffre d'or croît plus vite que le butin de base
export const GOLD_CHEST_MULT_GROWTH = 1.2;  // boost golds ×1.2^niveau_du_coffre

// base*pow^level_du_palier
// `level` suit maxPalierReached (niveau max achetable), donc non-plafonné —
// coût ET multiplicateur doivent rester en BigNum pour ne jamais déborder
// (Math.pow(1.2, level) déborde déjà vers Infinity dès level ≈ 3900).
export function getGoldChestCost(level: number): BigNum {
  return bnMul(bnMulScalar(bnPow(GOLD_CHEST_COST_GROWTH, level*10-1), GOLD_CHEST_COST_BASE), bnPow(GOLD_CHEST_MULT_GROWTH, level));
}
export function getGoldChestMultiplier(level: number): BigNum {
  return bnPow(GOLD_CHEST_MULT_GROWTH, level);
}

// Récompenses de progression
// Gemmes données à chaque palier franchi (mort du boss) — récompense de fin
// de palier, distincte du butin par ennemi (gemsReward dans enemies.ts).
export function getPalierPassGems(palier: number): number {
  return palier * 10;
}
export const MOB_GEM_DROP_CHANCE = 0.005;  // 0.5% de chance de looter 1 gemme bonus sur N'IMPORTE QUEL ennemi tué
// Taux de drop d'équipement en mode farm (palier < runPeakPalier) : ×0.5 = 2× plus lent.
export const FARM_EQUIP_DROP_RATE = 0.5;

// ─── Gains hors-ligne (idle) ────────────────────────────────────────────
// Multiplicateur appliqué au revenu passif (DPS) accumulé hors-ligne.
export const OFFLINE_MULT_TIERS  = [0.5, 0.55, 0.6, 0.65, 0.7];
// Échelle du gain réel hors-ligne : 0.30 au niveau 1, jusqu'à 0.90 au niveau max.
export const OFFLINE_REWARD_SCALE_TIERS = [0.30, 0.42, 0.55, 0.72, 0.90];
// Durée max créditée hors-ligne, en heures : 2h au niveau 1, 12h au niveau max.
export const OFFLINE_CAP_TIERS_H = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// Coûts en couronnes (👑) pour passer au niveau suivant (index = niveau actuel).
export const OFFLINE_MULT_COSTS  = [20, 45, 80, 130];                              // 5 paliers → 4 upgrades
export const OFFLINE_CAP_COSTS   = [10, 18, 28, 42, 60, 82, 108, 140, 178, 220];   // 11 paliers → 10 upgrades
export const OFFLINE_MIN_SECONDS = 60; // en dessous, on n'affiche pas de récap

// ─── Mine de gemmes (débloquée au premier Prestige, voir mineSlice.ts) ─────
export const MINE_PURCHASE_COST_CROWNS = 10; // coût d'achat initial en 👑
// Repère d'équilibrage : 3,75 gemmes/h ≈ 1% du taux de pulls d'un joueur.
export const MINE_BASE_RATE_PER_HOUR = 10; // gemmes/h à l'achat (niveau de vitesse 0)
export const MINE_CAP_TIERS = [50, 80, 120, 170, 230, 300]; // plafond de stockage (gemmes), index = mineCapLevel
export const MINE_SPEED_MULT_TIERS = [1, 1.25, 1.5, 1.8, 2.2, 2.7]; // multiplicateur du taux de base, index = mineSpeedLevel
export const MINE_CAP_UPGRADE_COSTS   = [15, 30, 50, 80, 120]; // coûts en 👑, index = niveau actuel
export const MINE_SPEED_UPGRADE_COSTS = [15, 30, 50, 80, 120]; // coûts en 👑, index = niveau actuel

// Palier max atteint DEPUIS LE DERNIER PRESTIGE — détermine le mode farm
// (palier déjà validé CETTE run), la portée du voyage, et l'éligibilité/le
// gain de jetons du prochain prestige. Contrairement à maxPalierReached (qui
// ne redescend jamais, gardé pour le classement), ce compteur repart à 1 à
// chaque prestige. `null` = jamais divergé de maxPalierReached (sauvegarde
// jamais prestige, ou antérieure à l'ajout de ce champ) → on retombe alors
// sur maxPalierReached, ce qui est le comportement correct dans ce cas précis.
export function runPeakPalierOf(state: { runPeakPalier: number | null; maxPalierReached: number }): number {
  return state.runPeakPalier ?? state.maxPalierReached;
}

// Mémo : recalculer calcPrestigeBonuses() à chaque appel serait gaspillé — cette
// fonction est appelée plusieurs fois par rendu de combat (DPS total + DPS de
// chaque allié) et chaque seconde. On ne recalcule que si bonusLevels a changé.
let _pbLevels: PrestigeBonusLevels | null = null;
let _pbValue: ActivePrestigeBonuses | null = null;

export function getPrestigeBonuses(bonusLevels: PrestigeBonusLevels, rankRecoveryLevel: number): ActivePrestigeBonuses & { rankRecoveryCap: number } {
  if (!_pbValue || _pbLevels !== bonusLevels) {
    _pbValue = calcPrestigeBonuses(bonusLevels);
    _pbLevels = bonusLevels;
  }
  return { ..._pbValue, rankRecoveryCap: rankRecoveryCap(rankRecoveryLevel) };
}

export function getActiveCoinMultiplier(ultActiveUlts: ActiveUlt[]): number {
  return ultActiveUlts.reduce((m, a) => m * (a.effect.coinMultiplier ?? 1), 1);
}

// Force une sauvegarde immédiate en base (localStorage + Firestore) après un
// événement majeur (palier franchi, pull gacha, achat de coffre d'équipement,
// boss vaincu, expédition récupérée) — sans ça, ces gains ne seraient garantis
// en base qu'au prochain cycle périodique (jusqu'à 10min plus tard) et
// pourraient être perdus en cas de fermeture/crash avant cette échéance.
// Import différé : useCloudSave importe déjà gameStore (qui importe ce
// fichier), un import statique créerait un cycle.
export function requestUrgentSave(reason = 'urgent') {
  if (typeof window === 'undefined') return;
  try { require('@/hooks/useCloudSave').requestUrgentSave(reason); } catch { /* ignore */ }
}

// Variante ATTENDUE de ci-dessus, réservée au prestige : l'appelant (UI) reste
// bloqué jusqu'à confirmation que le reset a bien atteint Firestore, pour ne
// jamais laisser une fenêtre où changer d'appareil ferait réapparaître la
// collection d'avant-prestige (voir doPrestige, seul appelant).
export async function requestUrgentSaveAndWait(reason: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try { return await require('@/hooks/useCloudSave').saveUrgentNow(reason); } catch { return false; }
}

// Incrémente les quêtes "vaincre X boss" (palier / semaine / événement) à chaque
// mort de boss, progression ou re-farm. Les boss d'événement doivent passer par
// ce helper pour être comptés comme des boss dans les quêtes et succés.
export function bumpBossQuests(
  quests: Quest[],
  weeklyQuests: Quest[],
  eventQuests: Quest[] = []
): { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] } {
  return {
    quests: quests.map(q => q.id === 'd_boss_kill' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_boss_5' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    eventQuests: eventQuests.map(q => q.id === 'e_boss_20' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
  };
}

// Incrémente la progression des quêtes "accumuler X coins" (jour/semaine),
// quelle que soit la source du gain (kill, offline, jackpot...). Sans ce
// helper, ces quêtes restent bloquées à 0 puisqu'aucune autre logique ne les
// met à jour ailleurs dans le store.
export function bumpCoinQuests(quests: Quest[], weeklyQuests: Quest[], amount: number): { quests: Quest[]; weeklyQuests: Quest[] } {
  if (amount <= 0) return { quests, weeklyQuests };
  return {
    quests: quests.map(q => q.id === 'd_coins_1m' && !q.done ? { ...q, current: Math.min(q.current + amount, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_coins_10m' && !q.done ? { ...q, current: Math.min(q.current + amount, q.target) } : q),
  };
}

type QuestState = { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] };
type PrestigeReadState = { prestigeBonusLevels: PrestigeBonusLevels; prestigeRankRecoveryLevel: number };
type ResolveEnemyDeathState = GameState & QuestState & PrestigeReadState & { activeTitle: string; ultActiveUlts: ActiveUlt[] };

export function resolveEnemyDeath(state: ResolveEnemyDeathState): Partial<GameState & QuestState> {
  // Garde-fou : ne résout la mort que si currentEnemy.currentHp <= 0 a bien été
  // appliqué par l'appelant (voir tickDps/activateCharacterUltimate,
  // qui fusionnent { currentHp: newHp } avant d'appeler cette fonction).
  if (!bnIsZero(state.currentEnemy.currentHp)) return {};

  // Multiplicateurs de coins (or + ult + boost BossCrown)
  const chestMult    = getGoldChestMultiplier((state as {goldUpgradeLevel?:number}).goldUpgradeLevel ?? 0); // BigNum (non-plafonné, suit maxPalierReached)
  const titleMult    = getTitleGoldMultiplier(state.activeTitle);
  const ultCoinMult  = getActiveCoinMultiplier(state.ultActiveUlts);
  const goldBoostEndsAt = (state as {goldBoostEndsAt?:number}).goldBoostEndsAt ?? 0;
  const boostGoldMult   = Date.now() < goldBoostEndsAt ? BOOST_MULTIPLIER : 1;
  const prestigeCoinMult = getPrestigeBonuses(state.prestigeBonusLevels, state.prestigeRankRecoveryLevel).coinsMult; // passif +20%/niveau × shop "Fortune Ancestrale"
  const goldMult = bnMulScalar(chestMult, titleMult * ultCoinMult * boostGoldMult * prestigeCoinMult);
  const baseCoins   = bnMul(state.currentEnemy.pixelCoinsReward, goldMult);
  const coins = bnAdd(state.pixelCoins, baseCoins);

  // 0.5% de chance de looter 1 gemme bonus sur n'importe quel ennemi (boss inclus)
  const mobGemDrop = Math.random() < MOB_GEM_DROP_CHANCE ? 1 : 0;
  const gems  = state.nekoGems + state.currentEnemy.gemsReward + mobGemDrop;

  const quests = state.quests.map(q =>
    (q.id === 'd_kills_250' || q.id === 'd_kills_500' || q.id === 'd_kills_1000') && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const weeklyQuests = (state.weeklyQuests ?? []).map(q =>
    q.id === 'w_kills_5000' && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  // bnToNumber peut saturer à Infinity à très haut palier, mais bumpCoinQuests
  // ne s'en sert que pour comparer à un plafond de quête fixe (Math.min) — le
  // résultat reste correct même saturé (voir bnToNumber dans lib/game/bignum.ts).
  const coinQuestUpdate = bumpCoinQuests(quests, weeklyQuests, bnToNumber(baseCoins));
  const eventQuests = (state.eventQuests ?? []).map(q =>
    q.id === 'e_boss_20' && state.currentEnemy.isBoss && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const bossCrownsBefore = (state as {bossCrowns?:number}).bossCrowns ?? 0;
  if (state.currentEnemy.isBoss) {
    const next = state.palier + 1;
    // On ne pousse au classement QUE lors d'une vraie progression : re-farmer un
    // palier déjà validé (voyage) ne doit pas écraser le score avec une valeur plus basse.
    const isNewProgress = next > state.maxPalierReached;
    // Passage à un palier jamais atteint : événement majeur, sauvegarde immédiate
    // (pas d'attente du prochain cycle périodique) pour ne jamais perdre cette progression.
    // IMPORTANT : resolveEnemyDeath() est appelée DEPUIS l'intérieur d'un set()
    // — à cet instant précis, le nouveau palier n'a PAS ENCORE été commité dans
    // le store (on est en train de le calculer, pas encore de le retourner à
    // set()). Un requestUrgentSave() synchrone ici lirait donc l'ANCIEN palier
    // via getSerializableState() → useGameStore.getState(). queueMicrotask()
    // reporte l'appel à juste après que set() ait commité — la sauvegarde lit
    // alors le palier réellement à jour. saveToFirebase (voir useCloudSave.ts)
    // inclut déjà username/palier/maxPalierReached/wave/pixelCoins/totalDps/score
    // dans ce même setDoc : pas besoin d'un updatePlayerScore() séparé ici, ça
    // doublerait l'écriture sur le même document 'saves/{uid}' pour rien.
    if (isNewProgress) queueMicrotask(() => requestUrgentSave('palier'));
    // Gemmes (palier×10) et +1 couronne de boss : réservées à une vraie
    // progression (sinon re-farmer un boss trivial = robinet infini).
    const passGems     = isNewProgress ? getPalierPassGems(state.palier) : 0;
    const crownGain    = isNewProgress ? 1 : 0;
    // Événement de victoire (source de vérité pour l'écran de victoire).
    const bossVictory = { palier: next, gems: passGems, coins: baseCoins, crowns: crownGain, at: Date.now() };
    const bossQuestUpdate = bumpBossQuests(coinQuestUpdate.quests, coinQuestUpdate.weeklyQuests, eventQuests);
    // "Atteindre le palier X" : on fixe la progression au palier réellement
    // atteint (pas un simple +1), et seulement lors d'une vraie progression.
    const finalEventQuests = isNewProgress
      ? eventQuests.map(q =>
          (q.id === 'e_palier_10' || q.id === 'e_palier_20') && !q.done
            ? { ...q, current: Math.min(Math.max(q.current, next), q.target) } : q
        )
      : eventQuests;
    const newRunPeak = Math.max(runPeakPalierOf(state), next);
    return { pixelCoins:coins, nekoGems:gems + passGems, quests:bossQuestUpdate.quests, weeklyQuests:bossQuestUpdate.weeklyQuests, eventQuests:finalEventQuests, wave:1, palier:next, maxPalierReached:Math.max(state.maxPalierReached,next), runPeakPalier:newRunPeak, bossActive:false, bossTimeLeft:0, bossAvoided:false, ultUsedThisFight:[], currentEnemy:generateEnemy(1,next,newRunPeak), bossCrowns: bossCrownsBefore + crownGain, totalBossCrownsEarned: ((state as {totalBossCrownsEarned?:number}).totalBossCrownsEarned ?? 0) + crownGain, lastBossVictory: bossVictory, totalKills: (state.totalKills ?? 0) + 1, totalBossKills: (state.totalBossKills ?? 0) + 1 } as Partial<GameState & { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] }>;
  }
  const nw = state.wave + 1;
  const runPeak = runPeakPalierOf(state);
  if (nw === 10) {
    // Mode farm (palier < runPeakPalier, càd déjà validé CETTE run) OU boss
    // évité → boucle sur vague 1, le boss ne se déclenche jamais.
    const isFarming = state.palier < runPeak;
    if (isFarming || state.bossAvoided) {
      return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:1, ultUsedThisFight:[], currentEnemy:generateEnemy(1, state.palier, runPeak), totalKills: (state.totalKills ?? 0) + 1 };
    }
    return { pixelCoins:coins, nekoGems:gems, quests:coinQuestUpdate.quests, weeklyQuests:coinQuestUpdate.weeklyQuests, eventQuests, wave:10, bossActive:true, bossTimeLeft:getPalierConfig(state.palier).bossTimerSeconds, ultUsedThisFight:[], currentEnemy:generateEnemy(10,state.palier,runPeak), totalKills: (state.totalKills ?? 0) + 1 };
  }
  const equipDrop = getEquipmentDrop(
    state.unlockedEquipDropRarities ?? ['C'],
    (state.palier < runPeak ? FARM_EQUIP_DROP_RATE : 1) * getPrestigeBonuses(state.prestigeBonusLevels, state.prestigeRankRecoveryLevel).equipDropRateMult,
  );
  const newEquipmentInventory = equipDrop
    ? { ...state.equipmentInventory, [equipDrop]: (state.equipmentInventory[equipDrop] ?? 0) + 1 }
    : state.equipmentInventory;
  return {
    pixelCoins:coins,
    nekoGems:gems,
    quests:coinQuestUpdate.quests,
    weeklyQuests:coinQuestUpdate.weeklyQuests,
    eventQuests,
    wave:nw,
    ultUsedThisFight:[], currentEnemy:generateEnemy(nw,state.palier,runPeak),
    equipmentInventory:newEquipmentInventory,
    lastEquipmentDrop: equipDrop ?? null,
    totalKills: (state.totalKills ?? 0) + 1,
  };
}
