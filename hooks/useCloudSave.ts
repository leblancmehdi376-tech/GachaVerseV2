'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useGameStore } from '@/store/gameStore';
import { useAchievementStore } from '@/store/achievementStore';
import { useExpeditionStore } from '@/store/expeditionStore';
import { usePrestigeStore } from '@/store/prestigeStore';
import { saveGameToFirestore, loadGameFromFirestore, probeClockOffset } from '@/lib/firebase/saveGame';
import { setClockOffset, correctedNow } from '@/lib/firebase/clockOffset';
import { logger } from '@/lib/logger';

const FIREBASE_INTERVAL_MS = 600_000; // Firebase toutes les 10min (quota)
const LOCAL_INTERVAL_MS    =  30_000; // localStorage toutes les 30s (gratuit, illimité)
const LOCAL_STORAGE_KEY    = 'gachaverse_save_v2'; // bump v2.5 : force un reset local pour tous les joueurs — doit rester identique à LOCAL_STORAGE_KEY dans store/gameStore.ts (même entrée localStorage partagée)

// ── Sérialisation ──────────────────────────────────────────────────────────
function getSerializableState() {
  const s  = useGameStore.getState();
  const es = useExpeditionStore.getState();
  const ps = usePrestigeStore.getState();
  return {
    pixelCoins:         s.pixelCoins,
    nekoGems:           s.nekoGems,
    totalGemsSpent:     s.totalGemsSpent ?? 0,
    totalGachaPulls:    s.totalGachaPulls ?? 0,
    totalClicks:        s.totalClicks,
    totalKills:             s.totalKills ?? 0,
    totalBossKills:         s.totalBossKills ?? 0,
    totalQuestsCompleted:   s.totalQuestsCompleted ?? 0,
    totalUpgradesPerformed: s.totalUpgradesPerformed ?? 0,
    wave:               s.wave,
    palier:             s.palier,
    maxPalierReached:   s.maxPalierReached,
    runPeakPalier:      s.runPeakPalier ?? null,
    currentEnemy:       s.currentEnemy,
    goldUpgradeLevel:   s.goldUpgradeLevel ?? 0,
    equippedTeam:       s.equippedTeam,
    collection:         s.collection,
    hero:               s.hero,
    bossActive:         s.bossActive,
    bossTimeLeft:       s.bossTimeLeft,
    quests:             s.quests,
    questsDayKey:       s.questsDayKey,
    weeklyQuests:       s.weeklyQuests,
    weeklyQuestsDayKey: s.weeklyQuestsDayKey,
    eventQuests:        s.eventQuests,
    bossCrowns:         s.bossCrowns,
    voidOrbs:           s.voidOrbs,
    totalBossCrownsEarned: s.totalBossCrownsEarned ?? 0,
    totalVoidOrbsEarned:   s.totalVoidOrbsEarned ?? 0,
    inventory:          s.inventory,
    equipmentInventory: s.equipmentInventory,
    championInventory:  s.championInventory ?? {},
    bankedRanks:         s.bankedRanks ?? {},
    historicalMaxRank:   s.historicalMaxRank ?? {},
    // Fusion/drop d'équipement débloqués par rareté (via expéditions) — vraie
    // progression, jamais synchronisée avant ce correctif : revenait à ['C']
    // sur tout nouvel appareil, rebloquant équipement et expéditions déjà acquis.
    unlockedEquipRarities:     s.unlockedEquipRarities ?? ['C'],
    unlockedEquipDropRarities: s.unlockedEquipDropRarities ?? ['C'],
    dpsBoostEndsAt:     s.dpsBoostEndsAt,
    goldBoostEndsAt:    s.goldBoostEndsAt,
    dailyShop:          s.dailyShop,
    starterPackClaimed: s.starterPackClaimed,
    username:           s.username,
    offlineMultLevel:   s.offlineMultLevel,
    offlineCapLevel:    s.offlineCapLevel,
    lastOfflineGain:    s.lastOfflineGain,
    // Succès déjà réclamés — stockés dans un store séparé (achievementStore),
    // qui a son propre localStorage jamais synchronisé avec Firestore. Sans
    // ça, un succès déjà débloqué redevient "réclamable" sur tout nouvel
    // appareil (ses conditions sont recalculées depuis les stats, elles,
    // bien synchronisées) et redonne ses gemmes une deuxième fois.
    achievementsClaimed: useAchievementStore.getState().claimed,
    // Titres débloqués (succès + drops de boss d'event, voir unlockTitle) et
    // titre actif — jamais synchronisés avant ce correctif : un titre gagné
    // par drop d'event (non dérivable des stats, contrairement aux succès)
    // disparaissait sur tout nouvel appareil, avec son bonus d'or actif.
    unlockedTitles: useAchievementStore.getState().unlockedTitles,
    activeTitle:    useAchievementStore.getState().activeTitle,
    // Expéditions et forge — store séparé (expeditionStore), jamais synchronisé
    // avant ce correctif : les drops et expéditions en cours disparaissaient
    // sur tout nouvel appareil.
    expeditionActive:         es.active,
    expeditionDropInventory:  es.dropInventory,
    expeditionCraftedRecipes: es.craftedRecipes,
    expeditionSlotLevel:      es.expeditionSlotLevel ?? 0,
    expeditionDefAffinities:  es.defAffinities ?? {},
    // Prestige — store séparé (prestigeStore), même problème.
    prestigeLevel:       ps.level,
    prestigeTokens:      ps.tokens,
    prestigeBonusLevels: ps.bonusLevels,
    prestigeRankRecoveryLevel: ps.rankRecoveryLevel,
    savedAt:            correctedNow(),
  };
}

// Fusionne l'état des succès (achievementStore, jamais synchro par simple
// "dernier gagne" comme le reste de l'état — voir plus bas) vu sur cet
// appareil et sur Firebase (le localStorage n'est plus une source à la
// connexion — voir loadAndApply) :
// - `claimed` et `unlockedTitles` ne font QUE grandir : un claim ou un titre
//   débloqué (ex: drop de boss d'event, non dérivable des stats) ne doit
//   JAMAIS pouvoir redisparaître, même si la source qui le connaît n'est pas
//   la plus récente des deux.
// - `activeTitle` (préférence d'affichage, pas un déblocage) suit lui la
//   source la plus fraîche (`freshest`), comme le reste de l'état.
function mergeAchievementState(
  remote: Record<string, unknown> | null,
  freshest: Record<string, unknown> | null
): { claimed: Record<string, boolean>; unlockedTitles: string[]; activeTitle: string } {
  const current = useAchievementStore.getState();
  const claimed: Record<string, boolean> = { ...current.claimed };
  const unlockedTitles = new Set<string>(current.unlockedTitles);
  const c = remote?.achievementsClaimed as Record<string, boolean> | undefined;
  if (c) for (const id of Object.keys(c)) if (c[id]) claimed[id] = true;
  const t = remote?.unlockedTitles as string[] | undefined;
  if (Array.isArray(t)) for (const title of t) unlockedTitles.add(title);
  const freshTitle = freshest?.activeTitle as string | undefined;
  const activeTitle = typeof freshTitle === 'string' && unlockedTitles.has(freshTitle) ? freshTitle : current.activeTitle;
  return { claimed, unlockedTitles: Array.from(unlockedTitles), activeTitle };
}

// ── localStorage (backup local, aucun quota) ───────────────────────────────
function saveToLocal() {
  try {
    const data = getSerializableState();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    useGameStore.setState({ savedAt: data.savedAt });
  } catch (e) {
    logger.warn('[CloudSave] localStorage write failed:', e);
  }
}

// Applique un blob de sauvegarde (cloud ou local) au store principal +
// stores séparés (expéditions/prestige) — factorisé pour être réutilisable
// par la reconciliation en arrière-plan (scheduleReconciliationRetry) sans
// dupliquer toute cette redistribution de champs.
function applyRemoteState(rawData: Record<string, unknown>) {
  // Suppress toasts/notifications while applying remote state to avoid
  // duplicate achievement/quest toasts when the player logs in on another device.
  try { useGameStore.setState({ suppressToasts: true }); } catch {}

  // Les champs expedition*/prestige* n'appartiennent pas à gameStore —
  // on les extrait avant de fusionner le reste, et on les applique à
  // leurs stores respectifs (sinon ils n'y arriveraient jamais).
  const data = { ...rawData };
  const expeditionPatch: Record<string, unknown> = {};
  if ('expeditionActive' in data)         { expeditionPatch.active         = data.expeditionActive;         delete data.expeditionActive; }
  if ('expeditionDropInventory' in data)  { expeditionPatch.dropInventory  = data.expeditionDropInventory;  delete data.expeditionDropInventory; }
  if ('expeditionCraftedRecipes' in data) { expeditionPatch.craftedRecipes = data.expeditionCraftedRecipes; delete data.expeditionCraftedRecipes; }
  if ('expeditionSlotLevel' in data)      { expeditionPatch.expeditionSlotLevel = data.expeditionSlotLevel; delete data.expeditionSlotLevel; }
  if ('expeditionDefAffinities' in data)  { expeditionPatch.defAffinities  = data.expeditionDefAffinities;  delete data.expeditionDefAffinities; }
  if (Object.keys(expeditionPatch).length) {
    useExpeditionStore.setState(expeditionPatch as unknown as Parameters<typeof useExpeditionStore.setState>[0]);
  }

  const prestigePatch: Record<string, unknown> = {};
  if ('prestigeLevel' in data)       { prestigePatch.level       = data.prestigeLevel;       delete data.prestigeLevel; }
  if ('prestigeTokens' in data)      { prestigePatch.tokens      = data.prestigeTokens;      delete data.prestigeTokens; }
  if ('prestigeBonusLevels' in data) { prestigePatch.bonusLevels = data.prestigeBonusLevels; delete data.prestigeBonusLevels; }
  if ('prestigeRankRecoveryLevel' in data) { prestigePatch.rankRecoveryLevel = data.prestigeRankRecoveryLevel; delete data.prestigeRankRecoveryLevel; }
  // Compat anciennes sauvegardes cloud (avant ce rework) : on ignore juste
  // ces champs obsolètes plutôt que de les laisser polluer le merge plus bas.
  delete data.prestigePoints;
  delete data.prestigePurchased;
  if (Object.keys(prestigePatch).length) {
    usePrestigeStore.setState(prestigePatch as unknown as Parameters<typeof usePrestigeStore.setState>[0]);
  }

  // unlockedTitles/activeTitle n'appartiennent pas à gameStore non plus —
  // ils sont gérés séparément par mergeAchievementState (règles de fusion
  // différentes du reste : voir son commentaire).
  delete data.unlockedTitles;
  delete data.activeTitle;

  useGameStore.setState(data as unknown as Parameters<typeof useGameStore.setState>[0]);
  // Allow effects to settle, then re-enable toasts.
  setTimeout(() => { try { useGameStore.setState({ suppressToasts: false }); } catch {} }, 200);
}

// ── Génération de session ──────────────────────────────────────────────────
// Incrémentée à chaque login/logout (voir le hook principal). Toute opération
// async module-level (loadAndApply, le callback de scheduleReconciliationRetry)
// capture la génération en cours au démarrage et la revérifie après CHAQUE
// await avant de toucher au state partagé — sans ça, un retry ou un chargement
// encore en vol pour un utilisateur A peut résoudre après qu'on soit passé à
// un utilisateur B (déconnexion/reconnexion rapide dans le même onglet) et
// appliquer les données de A dans la session de B, ou confirmer à tort la
// synchro de B avant que son propre chargement n'ait réussi.
let sessionGeneration = 0;

// ── Confirmation de synchro cloud ──────────────────────────────────────────
// Tant que le tout premier chargement cloud d'une session n'a pas réussi à
// JOINDRE Firestore (reachable:false — panne réseau, pas juste "rien à lire"),
// on ne sait pas si le cloud contient une sauvegarde plus récente que celle
// chargée en repli (locale). Dans ce cas :
//  1. cloudSyncConfirmed passe à false → saveToFirebase refuse d'écrire, pour
//     ne jamais risquer d'écraser une sauvegarde cloud qu'on n'a jamais pu lire.
//  2. pendingLocalSnapshotTs fige le timestamp du meilleur candidat LOCAL au
//     moment de cet échec — pas la valeur courante, qui avancerait avec la
//     partie en cours et fausserait la comparaison faite à la reconnexion.
//  3. Une reconciliation est replanifiée en arrière-plan (backoff 15s→10min)
//     jusqu'à ce que Firestore réponde : si sa sauvegarde s'avère plus récente
//     que l'instantané figé, elle est réappliquée ; sinon la synchro est
//     simplement déclarée confirmée et les écritures reprennent normalement.
//  4. MAIS ce blocage ne doit jamais durer la session entière sur un simple
//     aléa réseau : après MAX_BLOCKING_RECONCILIATION_ATTEMPTS échecs, on
//     "fail open" (cloudSyncConfirmed repasse à true quand même) tout en
//     continuant la reconciliation en arrière-plan pour rattraper une éventuelle
//     sauvegarde cloud plus récente dès que Firestore redevient joignable.
let cloudSyncConfirmed = true;
let pendingLocalSnapshotTs: number | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const RETRY_MIN_MS = 15_000;
const RETRY_MAX_MS = FIREBASE_INTERVAL_MS;
let retryDelayMs = RETRY_MIN_MS;
let reconciliationAttempts = 0;
const MAX_BLOCKING_RECONCILIATION_ATTEMPTS = 2; // ~45s de blocage max (15s + 30s)

// ── État de synchro exposé aux composants (badge dans GameLayout + détail
// dans Paramètres) ─────────────────────────────────────────────────────────
// cloudSyncConfirmed/lastSyncedAt sont des variables module-level (lues par du
// code hors React — voir requestUrgentSave), donc pas nativement réactives :
// ce petit pub-sub permet à useCloudSave() de re-render quand elles changent,
// sans dupliquer l'état dans un store zustand pour si peu.
let lastSyncedAt: number | null = null;
type SyncListener = () => void;
const syncListeners = new Set<SyncListener>();
function notifySyncListeners() { syncListeners.forEach(l => l()); }
function setCloudSyncConfirmed(value: boolean) {
  if (cloudSyncConfirmed === value) return;
  cloudSyncConfirmed = value;
  notifySyncListeners();
}
function markSynced(atMs: number) {
  lastSyncedAt = atMs;
  notifySyncListeners();
}

export type CloudSyncStatus = 'offline' | 'loading' | 'syncing' | 'synced';

// Couleur + libellé partagés entre le badge (GameLayout) et le détail
// (SettingsPage), pour ne jamais les faire diverger.
export function formatSyncStatus(status: CloudSyncStatus, lastSyncedAtMs: number | null): { color: string; label: string } {
  switch (status) {
    case 'offline': return { color: '#6b7280', label: 'Hors ligne — sauvegarde locale uniquement' };
    case 'loading': return { color: '#eab308', label: 'Chargement de la sauvegarde cloud...' };
    case 'syncing': return { color: '#eab308', label: 'Synchronisation en cours...' };
    case 'synced': {
      if (!lastSyncedAtMs) return { color: '#4ade80', label: 'Synchronisé' };
      const secs = Math.max(0, Math.floor((Date.now() - lastSyncedAtMs) / 1000));
      const rel = secs < 60 ? `${secs}s` : secs < 3600 ? `${Math.floor(secs / 60)}min` : `${Math.floor(secs / 3600)}h`;
      return { color: '#4ade80', label: `Synchronisé — il y a ${rel}` };
    }
  }
}

function clearReconciliationRetry() {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  retryDelayMs = RETRY_MIN_MS;
}

function scheduleReconciliationRetry(userId: string, generation: number) {
  if (retryTimer) return; // déjà planifiée
  retryTimer = setTimeout(async () => {
    retryTimer = null;
    // Séquentiel, PAS Promise.all : probeClockOffset() écrit (merge) sur ce
    // MÊME document saves/{uid} (clockProbe/clockProbeId) — lancé en parallèle,
    // son setDoc optimiste pollue le cache local que getDoc() (dans
    // loadGameFromFirestore, tolérant le cache) peut lire en même temps,
    // renvoyant alors UNIQUEMENT ces deux champs de probe au lieu de la vraie
    // sauvegarde (vu en prod : premier login récupère {clockProbeId, clockProbe:
    // null} et rien d'autre, un second login juste après récupère tout).
    const { data: remote, reachable } = await loadGameFromFirestore(userId);
    const offsetMs = await probeClockOffset(userId);
    logger.log('[CloudSave] ⇠ Reçu de Firestore (reconciliation):', { reachable, remote });
    if (generation !== sessionGeneration) return; // supplanté par un autre login/logout entre-temps

    if (!reachable) {
      reconciliationAttempts++;
      if (reconciliationAttempts > MAX_BLOCKING_RECONCILIATION_ATTEMPTS) {
        logger.warn('[CloudSave] Cloud injoignable après plusieurs tentatives — écritures réautorisées par défaut, reconciliation continue en arrière-plan.');
        setCloudSyncConfirmed(true); // fail-open : ne bloque pas indéfiniment le jeu
        // pendingLocalSnapshotTs n'est PAS effacé : une reconciliation réussie
        // plus tard doit encore pouvoir détecter et appliquer un cloud plus récent.
      }
      retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS);
      scheduleReconciliationRetry(userId, generation);
      return;
    }

    if (offsetMs !== null) setClockOffset(offsetMs);
    const remoteTs = (remote as Record<string, unknown> | null)?.lastSaved as number | undefined;
    if (typeof remoteTs === 'number' && Number.isFinite(remoteTs) && pendingLocalSnapshotTs !== null && remoteTs > pendingLocalSnapshotTs) {
      // Le cloud avait bel et bien une sauvegarde plus récente que celle
      // chargée pendant la panne réseau : on l'applique maintenant — quitte à
      // remplacer la progression faite localement pendant la fenêtre d'incertitude
      // — plutôt que de risquer de l'écraser silencieusement au prochain autosave.
      logger.warn('[CloudSave] Sauvegarde cloud plus récente détectée après reconnexion — réapplication.');
      applyRemoteState(remote as Record<string, unknown>);
    }
    setCloudSyncConfirmed(true);
    pendingLocalSnapshotTs = null;
    clearReconciliationRetry();
    reconciliationAttempts = 0;
    logger.log('[CloudSave] Synchro cloud reconfirmée, écritures réautorisées.');
  }, retryDelayMs);
}

// ── Chargement au login — compare Firebase et l'état déjà en mémoire ───────
async function loadAndApply(userId: string, generation: number) {
  try {
    logger.log('[CloudSave] ⇢ Chargement au login pour', userId);
    // Séquentiel, PAS Promise.all : voir le commentaire dans
    // scheduleReconciliationRetry — probeClockOffset() écrit sur le MÊME
    // document que celui lu ici, et lancé en parallèle son écriture pollue le
    // cache local que lit loadGameFromFirestore(), renvoyant alors seulement
    // {clockProbeId, clockProbe} au lieu de la vraie sauvegarde.
    const { data: remote, reachable } = await loadGameFromFirestore(userId);
    const offsetMs = await probeClockOffset(userId);
    logger.log('[CloudSave] ⇠ Reçu de Firestore:', { reachable, remote });
    if (generation !== sessionGeneration) return; // supplanté par un autre login/logout entre-temps
    // Doit être posé AVANT de comparer les timestamps ci-dessous : current.savedAt
    // a été écrit par CET appareil avec son propre décalage (stable d'une
    // session à l'autre), donc directement comparable une fois l'offset de
    // cette session appliqué au calcul ci-dessous.
    // `offsetMs === null` = sonde échouée (timeout/réseau), pas "horloge déjà
    // alignée" : on NE TOUCHE PAS à clockOffsetMs plutôt que de l'écraser par
    // un 0 qui serait faux si cet appareil a une horloge réellement décalée —
    // voir le commentaire sur probeClockOffset dans saveGame.ts.
    if (offsetMs !== null) setClockOffset(offsetMs);

    const current = useGameStore.getState();

    // "Plus récent gagne" entre Firestore et l'état déjà en mémoire (pas
    // localStorage : le disque n'est plus une source à la connexion — une
    // déconnexion repasse toujours en invité vierge, voir useCloudSave ci-
    // dessous). Number.isFinite() plutôt que ?? -1 seul : une valeur corrompue
    // (NaN) ne doit jamais pouvoir "gagner" la comparaison — elle est ramenée
    // à -1 comme une source absente, au lieu de fausser le reduce ci-dessous.
    const safeTs = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : -1);
    const candidates = [
      { label: 'firebase',      data: remote as Record<string, unknown> | null, ts: safeTs((remote as Record<string,unknown> | null)?.lastSaved) },
      { label: 'local (store)', data: null as Record<string, unknown> | null,   ts: safeTs(current.savedAt) },
    ];
    const best = candidates.reduce((a, b) => (b.ts > a.ts ? b : a));

    logger.log('[CloudSave] Source appliquée:', best.label, best.ts >= 0 ? `— ${new Date(best.ts).toLocaleTimeString()}` : '(aucune sauvegarde)');

    if (best.data) applyRemoteState(best.data as Record<string, unknown>);

    // Fusion des succès/titres — TOUJOURS, indépendamment de la source "la
    // plus récente" choisie ci-dessus (un claim ou un titre débloqué ne doit
    // jamais dépendre d'un timestamp : voir mergeAchievementState).
    const merged = mergeAchievementState(
      remote as Record<string, unknown> | null,
      best.data as Record<string, unknown> | null
    );
    useAchievementStore.setState(merged);

    // Voir le bloc de commentaire au-dessus de cloudSyncConfirmed : sans
    // confirmation que le cloud a bien été JOINT (pas juste absent), on
    // interdit toute écriture vers Firebase tant qu'une reconciliation en
    // arrière-plan n'a pas tranché.
    if (reachable) {
      setCloudSyncConfirmed(true);
      pendingLocalSnapshotTs = null;
      reconciliationAttempts = 0;
      clearReconciliationRetry();
    } else {
      setCloudSyncConfirmed(false);
      pendingLocalSnapshotTs = best.ts;
      scheduleReconciliationRetry(userId, generation);
    }
  } catch (e) {
    logger.error('[CloudSave] Erreur loadAndApply:', e);
  }
}

// ── Firebase (avec gestion quota + timeout 5s) ────────────────────────────
// Renvoie true seulement si l'écriture a réellement atteint Firestore — un
// appelant (ex. le bouton "Forcer la sauvegarde") ne doit jamais afficher un
// succès si la donnée n'a en fait jamais quitté la machine (quota, timeout,
// réseau d'entreprise qui bloque Firestore, etc.) : sinon le joueur pense
// être sauvegardé dans le cloud alors que seul le localStorage local l'a,
// et il perd sa progression en se reconnectant depuis un autre appareil.
async function saveToFirebase(userId: string): Promise<boolean> {
  if (!cloudSyncConfirmed) {
    logger.warn('[CloudSave] Écriture cloud suspendue : synchro pas encore confirmée (le premier chargement cloud a échoué), reconciliation en cours.');
    return false;
  }
  try {
    const s    = useGameStore.getState();
    const data = getSerializableState();

    let totalDps = 0;
    try { totalDps = s.getTotalDps?.() ?? 0; } catch { /* ignore */ }

    // Un seul setDoc (fusionné avec les champs du classement) au lieu de deux
    // écritures séparées sur le MÊME document 'saves/{uid}' — saveGameToFirestore
    // puis updatePlayerScore doublaient inutilement le coût en écritures Firestore
    // à chaque autosave (toutes les 10min pour chaque joueur connecté).
    const payload = {
      ...data,
      username: s.username || 'Joueur',
      totalDps,
      score: s.palier * 100 + s.wave,
    };

    logger.log('[CloudSave] ⇢ Envoyé à Firestore:', payload);

    // Timeout 5s — si Firebase est bloqué (quota), on n'attend pas indéfiniment
    await Promise.race([
      saveGameToFirestore(userId, payload),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);

    useGameStore.setState({ savedAt: data.savedAt });
    markSynced(Date.now());

    logger.log('[CloudSave] Firebase OK —', new Date().toLocaleTimeString());
    return true;
  } catch (e) {
    logger.warn('[CloudSave] Firebase indisponible (quota ou timeout), données conservées en localStorage:', e);
    return false;
  }
}

// ── Sauvegarde immédiate après un événement majeur ─────────────────────────
// Miroir module-level de userIdRef/loadedRef (mis à jour par useCloudSave()
// ci-dessous) — permet aux actions des stores (gameStore, expeditionStore...)
// de déclencher une sauvegarde sans avoir accès au hook React ni à l'userId
// (voir les imports différés dans gameStore.ts/expeditionStore.ts, qui évitent
// un cycle d'import avec ce fichier).
let urgentSaveUserId: string | null = null;
let urgentSaveReady   = false;
let lastUrgentSaveAt  = 0;
let pendingUrgentSaveTimer: ReturnType<typeof setTimeout> | null = null;
const URGENT_SAVE_MIN_GAP_MS = 15_000; // évite une rafale d'écritures Firestore (ex: pulls gacha en boucle)

// Avant ce correctif, un appel trop rapproché (throttle) ou trop précoce
// (chargement initial pas encore terminé — ex: lancer une expédition juste
// après avoir ouvert le jeu) était simplement IGNORÉ, sans aucun rattrapage :
// l'événement ne finissait par se synchroniser qu'au prochain cycle périodique
// (jusqu'à 10min plus tard), ce qui pouvait ressembler à une désync entre
// appareils. Chaque demande ignorée reprogramme maintenant un unique rattrapage.
export function requestUrgentSave() {
  if (!urgentSaveUserId) return; // pas connecté, rien à synchroniser

  if (!urgentSaveReady) {
    if (!pendingUrgentSaveTimer) {
      pendingUrgentSaveTimer = setTimeout(() => { pendingUrgentSaveTimer = null; requestUrgentSave(); }, 2000);
    }
    return;
  }

  const now = Date.now();
  const elapsed = now - lastUrgentSaveAt;
  if (elapsed < URGENT_SAVE_MIN_GAP_MS) {
    if (!pendingUrgentSaveTimer) {
      pendingUrgentSaveTimer = setTimeout(() => { pendingUrgentSaveTimer = null; requestUrgentSave(); }, URGENT_SAVE_MIN_GAP_MS - elapsed);
    }
    return;
  }

  lastUrgentSaveAt = now;
  saveToLocal();
  saveToFirebase(urgentSaveUserId);
}

// ── Attente de la réhydratation locale (zustand persist) ──────────────────
// loadAndApply ne doit JAMAIS démarrer avant que les 4 stores persistés aient
// fini de relire leur localStorage : sinon une réhydratation qui termine
// APRÈS que loadAndApply ait appliqué une donnée cloud plus fraîche écraserait
// silencieusement ce state correct avec l'ancien state local (aucune erreur,
// aucun log — juste la progression qui "disparaît" après un login).
type PersistCapable = { persist?: { hasHydrated?: () => boolean; onFinishHydration?: (cb: () => void) => () => void } };
function waitForHydration(store: PersistCapable): Promise<void> {
  return new Promise((resolve) => {
    if (!store.persist?.hasHydrated) { resolve(); return; } // pas de persist (SSR/fallback) : ne bloque rien
    if (store.persist.hasHydrated()) { resolve(); return; }
    const unsub = store.persist.onFinishHydration!(() => { unsub(); resolve(); });
    // Sécurité : si la réhydratation s'est terminée entre le check ci-dessus
    // et l'abonnement, on ne resterait pas bloqué indéfiniment.
    if (store.persist.hasHydrated()) { unsub(); resolve(); }
  });
}
function waitForAllHydrated(): Promise<void> {
  const stores: PersistCapable[] = [useGameStore, useExpeditionStore, usePrestigeStore, useAchievementStore];
  return Promise.race([
    Promise.all(stores.map(waitForHydration)).then(() => {}),
    new Promise<void>((resolve) => setTimeout(() => {
      logger.warn('[CloudSave] Réhydratation locale incomplète après 3s — chargement cloud lancé quand même.');
      resolve();
    }, 3000)), // filet de sécurité seulement ; la réhydratation locale est normalement quasi instantanée
  ]);
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useCloudSave(userId: string | null) {
  const loadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const lastCorrectionRef = useRef(0);
  // Reflète loadedRef en state pour que les appelants (ex: le calcul des gains
  // AFK) puissent attendre la fin du chargement cloud avant de créditer quoi
  // que ce soit — sans ça, un chargement cloud lent peut écraser un gain déjà
  // crédité localement (voir claimOfflineEarnings).
  const [loaded, setLoaded] = useState(!userId);

  // Re-render quand cloudSyncConfirmed/lastSyncedAt changent (variables
  // module-level, pas nativement réactives — voir le pub-sub plus haut) pour
  // que syncStatus/lastSyncedAt ci-dessous reflètent toujours l'état courant.
  const [, forceSyncRerender] = useState(0);
  useEffect(() => {
    const listener = () => forceSyncRerender(n => n + 1);
    syncListeners.add(listener);
    return () => { syncListeners.delete(listener); };
  }, []);

  // Chargement au login
  useEffect(() => {
    // Toute génération précédente (login/logout antérieur, éventuellement
    // encore en vol sur un await) devient périmée dès qu'un effet tourne ici —
    // voir le commentaire sur sessionGeneration plus haut dans ce fichier.
    sessionGeneration++;
    const myGeneration = sessionGeneration;

    if (!userId) {
      // Ne réinitialise que sur une VRAIE déconnexion (userIdRef.current
      // passait d'un compte à null) — pas au tout premier rendu d'un invité
      // qui n'a jamais été connecté, sinon sa progression locale serait
      // effacée dès l'ouverture du jeu.
      const wasLoggedIn = userIdRef.current !== null;
      loadedRef.current = false; userIdRef.current = null; setLoaded(true);
      urgentSaveUserId = null; urgentSaveReady = false;
      // Pas de reconciliation à poursuivre pour un utilisateur déconnecté.
      clearReconciliationRetry();
      setCloudSyncConfirmed(true); pendingLocalSnapshotTs = null; reconciliationAttempts = 0;
      // Repasse en mode invité (palier 1, run vierge) : la progression du
      // compte reste sur Firestore et sera rechargée à la reconnexion via
      // loadAndApply ci-dessous — elle ne doit pas rester affichée/éditable
      // localement une fois déconnecté.
      if (wasLoggedIn) useGameStore.getState().resetGame();
      return;
    }
    if (userId === userIdRef.current) return;
    userIdRef.current = userId;
    loadedRef.current = false;
    urgentSaveUserId = userId;
    urgentSaveReady = false;
    // Repart d'un état propre : une reconciliation encore en attente pour un
    // PRÉCÉDENT utilisateur (autre session sur cet onglet) ne doit pas
    // interférer avec ce nouveau login — loadAndApply ci-dessous redécide.
    clearReconciliationRetry();
    setCloudSyncConfirmed(true); pendingLocalSnapshotTs = null; reconciliationAttempts = 0;
    setLoaded(false);
    (async () => {
      await waitForAllHydrated();
      if (myGeneration !== sessionGeneration) return; // supplanté pendant l'attente
      await loadAndApply(userId, myGeneration);
    })().finally(() => {
      if (myGeneration === sessionGeneration) { loadedRef.current = true; urgentSaveReady = true; setLoaded(true); }
    });
  }, [userId]);

  // Écoute EN DIRECT les corrections admin (solde rééquilibré) pendant que
  // le joueur est connecté — sans ça, une correction faite pendant que le
  // joueur est en train de jouer serait écrasée par son propre autosave
  // avant même qu'il ne se reconnecte (voir correctPlayerBalance).
  useEffect(() => {
    if (!userId || !db) return;
    const ref = doc(db, 'saves', userId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const correctionAt = (data.adminCorrectionAt as number) ?? 0;
      if (!correctionAt || correctionAt <= lastCorrectionRef.current) return;
      lastCorrectionRef.current = correctionAt;
      // Ignore la toute première lecture au montage (c'est juste l'état déjà
      // chargé par loadAndApply, pas une nouvelle correction en direct).
      if (!loadedRef.current) return;
      const patch: Record<string, unknown> = { savedAt: correctedNow() };
      if (typeof data.pixelCoins === 'number') patch.pixelCoins = data.pixelCoins;
      if (typeof data.nekoGems   === 'number') patch.nekoGems   = data.nekoGems;
      if (typeof data.bossCrowns === 'number') patch.bossCrowns = data.bossCrowns;
      if (typeof data.palier     === 'number') patch.palier     = data.palier;
      if (typeof data.wave       === 'number') patch.wave       = data.wave;
      if (typeof data.maxPalierReached === 'number') patch.maxPalierReached = data.maxPalierReached;
      if (data.collection && typeof data.collection === 'object') patch.collection = data.collection;
      useGameStore.setState(patch as unknown as Parameters<typeof useGameStore.setState>[0]);
    });
    return unsub;
  }, [userId]);

  // localStorage toutes les 30s — indépendant du quota Firebase
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      if (!loadedRef.current) return;
      saveToLocal();
    }, LOCAL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Firebase toutes les 10min
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      if (!loadedRef.current) return;
      saveToFirebase(userId);
    }, FIREBASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Save à la fermeture / mise en arrière-plan
  useEffect(() => {
    if (!userId) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && loadedRef.current) {
        saveToLocal();           // immédiat, pas de quota
        saveToFirebase(userId);  // tentative Firebase (peut échouer si quota)
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [userId]);

  // Sauvegarde manuelle (bouton) — renvoie si l'écriture Firestore a vraiment
  // abouti, pour que le bouton n'affiche jamais "Sauvegardé !" à tort.
  const forceSave = async (): Promise<boolean> => {
    if (!userId || !loadedRef.current) return false;
    saveToLocal();
    return saveToFirebase(userId);
  };

  // Statut affiché au joueur (badge + Paramètres) — voir CloudSyncStatus :
  // 'offline' = pas connecté (progression locale uniquement, pas de risque de
  // désync puisqu'il n'y a rien à synchroniser) ; 'loading' = chargement cloud
  // initial en cours ; 'syncing' = synchro pas encore confirmée (reconciliation
  // après une panne réseau au login, voir cloudSyncConfirmed) ; 'synced' = OK.
  const syncStatus: CloudSyncStatus =
    !userId ? 'offline' :
    !loaded ? 'loading' :
    !cloudSyncConfirmed ? 'syncing' :
    'synced';

  return { forceSave, loaded, syncStatus, lastSyncedAt };
}