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
import { formatNumber } from '@/lib/game/format';
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
// Quêtes journalières/hebdo : chaque catégorie a plusieurs variantes de
// difficulté (target+reward) ; une variante est tirée au hasard à chaque
// refresh de quête (voir rollQuestDefs, appelé depuis
// ensureDailyQuests/ensureWeeklyQuests dans questSlice.ts) et reste FIXE
// jusqu'au prochain reset (pas de recalcul en cours de journée/semaine).
export interface QuestVariant { target: number; reward: number }
export interface QuestDef {
  id: string; icon: string; rewardType: 'gems' | 'coins';
  type: 'daily' | 'weekly';
  label: (target: number) => string;
  variants: QuestVariant[];
}

// ── Quêtes journalières (reset 2h Paris) ─────────────────────────────────
export const DAILY_QUEST_DEFS: QuestDef[] = [
  { id:'d_kills', icon:'⚔', rewardType:'gems', type:'daily',
    label: n => `Vaincre ${n} monstres`,
    variants: [{ target:250, reward:12 }, { target:500, reward:18 }, { target:1000, reward:28 }] },
  { id:'d_upgrade', icon:'⬆', rewardType:'gems', type:'daily',
    label: n => `Améliorer tes personnages ${n} fois`,
    variants: [{ target:100, reward:15 }] },
  { id:'d_boss_event', icon:'👹', rewardType:'gems', type:'daily',
    label: n => `Vaincre ${n} boss d'événement`,
    variants: [{ target:5, reward:20 }, { target:10, reward:35 }] },
  { id:'d_boss_palier', icon:'👑', rewardType:'gems', type:'daily',
    label: n => `Vaincre ${n} boss de palier`,
    variants: [{ target:1, reward:20 }, { target:2, reward:35 }] },
  { id:'d_gacha', icon:'💎', rewardType:'gems', type:'daily',
    label: n => `Effectuer ${n} tirages gacha`,
    variants: [{ target:50, reward:20 }, { target:100, reward:35 }] },
];

// Quête spéciale "accumuler l'équivalent de X heures de gains hors ligne" :
// le nombre d'heures est tiré au hasard comme les autres variantes, mais la
// cible en coins qui en découle dépend du taux de gain hors-ligne du joueur
// (getOfflineCoinsPerHour) — calculée UNE SEULE FOIS au reset et figée pour
// le reste de la journée (voir ensureDailyQuests, seul appelant). Pas
// d'équivalent hebdomadaire (absent du barème fourni).
export const DAILY_COIN_HOURS_VARIANTS: { hours: number; reward: number }[] = [
  { hours:0.5, reward:12 }, { hours:1, reward:18 }, { hours:1.5, reward:25 }, { hours:2, reward:32 },
];
// Tire une variante d'heures au hasard et fige la cible en golds d'après le
// taux de gain hors-ligne du joueur AU MOMENT DE L'APPEL (coinsPerHour, déjà
// converti en number par l'appelant via bnToNumber — voir ensureDailyQuests).
// Le label affiche directement la cible en golds (pas les heures) : les
// heures ne servent qu'en interne à calibrer la difficulté de la variante.
export function rollCoinHoursQuest(coinsPerHour: number): Omit<Quest,'current'|'done'> {
  const v = DAILY_COIN_HOURS_VARIANTS[Math.floor(Math.random() * DAILY_COIN_HOURS_VARIANTS.length)];
  // Plancher à 1M : un compte neuf (DPS quasi nul) ne doit pas se retrouver
  // avec une cible ridicule (voire 0) qui rendrait la quête instantanée.
  const target = Math.max(1_000_000, Math.round(coinsPerHour * v.hours));
  return {
    id:'d_coins_hours', icon:'🪙',
    label:`Accumuler ${formatNumber(target)} golds`,
    target, reward:v.reward, rewardType:'gems', type:'daily',
  };
}

// ── Quêtes hebdomadaires (reset lundi 2h Paris) ───────────────────────────
export const WEEKLY_QUEST_DEFS: QuestDef[] = [
  { id:'w_kills', icon:'⚔', rewardType:'gems', type:'weekly',
    label: n => `Vaincre ${n} monstres`,
    variants: [{ target:5000, reward:70 }, { target:7500, reward:100 }, { target:10000, reward:140 }] },
  { id:'w_upgrade', icon:'⬆', rewardType:'gems', type:'weekly',
    label: n => `Améliorer tes personnages ${n} fois`,
    variants: [{ target:1000, reward:60 }, { target:1500, reward:85 }, { target:2000, reward:110 }] },
  { id:'w_boss_event', icon:'👹', rewardType:'gems', type:'weekly',
    label: n => `Vaincre ${n} boss d'événement`,
    variants: [{ target:30, reward:90 }, { target:40, reward:120 }, { target:50, reward:150 }] },
  { id:'w_boss_palier', icon:'👑', rewardType:'gems', type:'weekly',
    label: n => `Vaincre ${n} boss de palier`,
    variants: [{ target:5, reward:90 }, { target:8, reward:130 }, { target:10, reward:160 }] },
  { id:'w_expedition', icon:'🧭', rewardType:'gems', type:'weekly',
    label: n => `Terminer ${n} expéditions`,
    variants: [{ target:1, reward:60 }, { target:2, reward:100 }, { target:3, reward:140 }] },
  { id:'w_gacha', icon:'💎', rewardType:'gems', type:'weekly',
    label: n => `Effectuer ${n} tirages gacha`,
    variants: [{ target:750, reward:100 }, { target:1000, reward:130 }, { target:1250, reward:160 }, { target:1500, reward:190 }] },
];

// Tire une variante aléatoire par définition — appelé au reset journalier/hebdo.
export function rollQuestDef(def: QuestDef): Omit<Quest,'current'|'done'> {
  const v = def.variants[Math.floor(Math.random() * def.variants.length)];
  return { id:def.id, icon:def.icon, label:def.label(v.target), target:v.target, reward:v.reward, rewardType:def.rewardType, type:def.type };
}
export function rollQuestDefs(defs: QuestDef[]): Omit<Quest,'current'|'done'>[] {
  return defs.map(rollQuestDef);
}

// ── Quêtes d'événement (permanentes jusqu'à complétion, valeurs fixes) ────
export const EVENT_QUESTS: Omit<Quest,'current'|'done'>[] = [
  { id:'e_forge_1',        label:'Forger ton premier personnage',        icon:'⚗',  target:1,   reward:200, rewardType:'gems', type:'event' },
  { id:'e_expedition_10',  label:'Terminer 10 expéditions',              icon:'🧭', target:10,  reward:200, rewardType:'gems', type:'event' },
  { id:'e_palier_20',      label:'Atteindre le palier 20',               icon:'🌌', target:20,  reward:300, rewardType:'gems', type:'event' },
  { id:'e_prestige_1',     label:'Prestiger 1 fois',                     icon:'⭐', target:1,   reward:400, rewardType:'gems', type:'event' },
  { id:'e_collection_100', label:'Obtenir 100 personnages différents',   icon:'📚', target:100, reward:350, rewardType:'gems', type:'event' },
  { id:'e_boss_event_200', label:"Vaincre 200 boss d'événement",         icon:'💀', target:200, reward:400, rewardType:'gems', type:'event' },
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

// Incrémente les quêtes "vaincre X boss DE PALIER" (jour/semaine) à chaque
// mort de boss de palier, progression ou re-farm. Ne concerne PAS les boss
// d'événement, comptés à part par bumpEventBossQuests ci-dessous.
export function bumpPalierBossQuests(
  quests: Quest[],
  weeklyQuests: Quest[]
): { quests: Quest[]; weeklyQuests: Quest[] } {
  return {
    quests: quests.map(q => q.id === 'd_boss_palier' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_boss_palier' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
  };
}

// Incrémente les quêtes "vaincre X boss D'ÉVÉNEMENT" (jour/semaine/événement)
// à chaque mort d'un boss d'event (voir EventBattle.tsx, seul appelant).
export function bumpEventBossQuests(
  quests: Quest[],
  weeklyQuests: Quest[],
  eventQuests: Quest[]
): { quests: Quest[]; weeklyQuests: Quest[]; eventQuests: Quest[] } {
  return {
    quests: quests.map(q => q.id === 'd_boss_event' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    weeklyQuests: weeklyQuests.map(q => q.id === 'w_boss_event' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
    eventQuests: eventQuests.map(q => q.id === 'e_boss_event_200' && !q.done ? { ...q, current: Math.min(q.current + 1, q.target) } : q),
  };
}

// Incrémente la progression de la quête journalière "accumuler l'équivalent de
// X heures de coins", quelle que soit la source du gain (kill, offline,
// jackpot...). Sans ce helper, cette quête resterait bloquée à 0 puisqu'aucune
// autre logique ne la met à jour ailleurs dans le store. Pas d'équivalent
// hebdomadaire (voir DAILY_COIN_HOURS_VARIANTS).
export function bumpCoinQuests(quests: Quest[], amount: number): Quest[] {
  if (amount <= 0) return quests;
  return quests.map(q => q.id === 'd_coins_hours' && !q.done ? { ...q, current: Math.min(q.current + amount, q.target) } : q);
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
    q.id === 'd_kills' && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  const weeklyQuests = (state.weeklyQuests ?? []).map(q =>
    q.id === 'w_kills' && !q.done
      ? { ...q, current: Math.min(q.current+1, q.target) } : q
  );
  // bnToNumber peut saturer à Infinity à très haut palier, mais bumpCoinQuests
  // ne s'en sert que pour comparer à un plafond de quête fixe (Math.min) — le
  // résultat reste correct même saturé (voir bnToNumber dans lib/game/bignum.ts).
  const questsAfterCoins = bumpCoinQuests(quests, bnToNumber(baseCoins));
  const eventQuests = state.eventQuests ?? [];
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
    const bossQuestUpdate = bumpPalierBossQuests(questsAfterCoins, weeklyQuests);
    // "Atteindre le palier X" : on fixe la progression au palier réellement
    // atteint (pas un simple +1), et seulement lors d'une vraie progression.
    const finalEventQuests = isNewProgress
      ? eventQuests.map(q =>
          q.id === 'e_palier_20' && !q.done
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
      return { pixelCoins:coins, nekoGems:gems, quests:questsAfterCoins, weeklyQuests, eventQuests, wave:1, ultUsedThisFight:[], currentEnemy:generateEnemy(1, state.palier, runPeak), totalKills: (state.totalKills ?? 0) + 1 };
    }
    return { pixelCoins:coins, nekoGems:gems, quests:questsAfterCoins, weeklyQuests, eventQuests, wave:10, bossActive:true, bossTimeLeft:getPalierConfig(state.palier).bossTimerSeconds, ultUsedThisFight:[], currentEnemy:generateEnemy(10,state.palier,runPeak), totalKills: (state.totalKills ?? 0) + 1 };
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
    quests:questsAfterCoins,
    weeklyQuests,
    eventQuests,
    wave:nw,
    ultUsedThisFight:[], currentEnemy:generateEnemy(nw,state.palier,runPeak),
    equipmentInventory:newEquipmentInventory,
    lastEquipmentDrop: equipDrop ?? null,
    totalKills: (state.totalKills ?? 0) + 1,
  };
}
