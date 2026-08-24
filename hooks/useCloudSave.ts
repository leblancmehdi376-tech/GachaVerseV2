'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useGameStore } from '@/store/gameStore';
import { useAchievementStore, ensureAchievementInvariants } from '@/store/achievementStore';
import { useExpeditionStore } from '@/store/expeditionStore';
import { usePrestigeStore } from '@/store/prestigeStore';
import { saveGameToFirestore, loadGameFromFirestore, probeClockOffset } from '@/lib/firebase/saveGame';
import { setClockOffset, correctedNow } from '@/lib/firebase/clockOffset';

const FIREBASE_INTERVAL_MS = 600_000; // Firebase toutes les 10min (quota)

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
    // Succès déjà réclamés — stockés dans un store séparé (achievementStore).
    achievementsClaimed: useAchievementStore.getState().claimed,
    // Titres débloqués (succès + drops de boss d'event, voir unlockTitle) et
    // titre actif.
    unlockedTitles: useAchievementStore.getState().unlockedTitles,
    activeTitle:    useAchievementStore.getState().activeTitle,
    // Expéditions et forge — store séparé (expeditionStore).
    expeditionActive:         es.active,
    expeditionDropInventory:  es.dropInventory,
    expeditionCraftedRecipes: es.craftedRecipes,
    expeditionSlotLevel:      es.expeditionSlotLevel ?? 0,
    expeditionDefAffinities:  es.defAffinities ?? {},
    // Prestige — store séparé (prestigeStore).
    prestigeLevel:       ps.level,
    prestigeTokens:      ps.tokens,
    prestigeBonusLevels: ps.bonusLevels,
    prestigeRankRecoveryLevel: ps.rankRecoveryLevel,
    savedAt:            correctedNow(),
  };
}

// Fusionne l'état des succès (achievementStore) chargé du cloud dans l'état
// mémoire courant de cette session :
// - `claimed` et `unlockedTitles` ne font QUE grandir : un claim ou un titre
//   débloqué ne doit jamais pouvoir redisparaître, même face à une correction
//   admin live arrivée entre-temps (voir l'écoute onSnapshot plus bas).
// - `activeTitle` (préférence d'affichage, pas un déblocage) suit le cloud.
function mergeAchievementState(remote: Record<string, unknown> | null): void {
  const current = useAchievementStore.getState();
  const claimed: Record<string, boolean> = { ...current.claimed };
  const unlockedTitles = new Set<string>(current.unlockedTitles);

  const c = remote?.achievementsClaimed as Record<string, boolean> | undefined;
  if (c) for (const id of Object.keys(c)) if (c[id]) claimed[id] = true;
  const t = remote?.unlockedTitles as string[] | undefined;
  if (Array.isArray(t)) for (const title of t) unlockedTitles.add(title);

  const remoteTitle = remote?.activeTitle as string | undefined;
  const activeTitle = typeof remoteTitle === 'string' && unlockedTitles.has(remoteTitle) ? remoteTitle : current.activeTitle;

  useAchievementStore.setState({ claimed, unlockedTitles: Array.from(unlockedTitles), activeTitle });
  ensureAchievementInvariants();
}

// Applique un blob de sauvegarde cloud au store principal + stores séparés
// (expéditions/prestige) — factorisé pour être réutilisable par la
// reconciliation en arrière-plan (scheduleReconciliationRetry) sans dupliquer
// toute cette redistribution de champs.
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
  // ils sont gérés séparément par mergeAchievementState.
  delete data.unlockedTitles;
  delete data.activeTitle;
  delete data.achievementsClaimed;

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
// saveToFirebase refuse d'écrire (pour ne jamais risquer d'écraser une
// sauvegarde cloud qu'on n'a jamais pu lire), et l'UI (GameLayout) bloque le
// jeu avec un écran de retry — il n'existe plus de sauvegarde locale de
// secours sur laquelle laisser le joueur jouer en attendant. Contrairement à
// avant ce correctif, on ne "fail open" JAMAIS : soit le chargement réussit,
// soit on bloque et on continue de retenter (backoff 15s → 10min) jusqu'à
// succès ou action manuelle du joueur (retryLoad).
let cloudSyncConfirmed = true;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const RETRY_MIN_MS = 15_000;
const RETRY_MAX_MS = FIREBASE_INTERVAL_MS;
let retryDelayMs = RETRY_MIN_MS;

// ── État exposé aux composants (badge dans GameLayout + détail dans
// Paramètres, écran de blocage) ─────────────────────────────────────────────
// cloudSyncConfirmed/lastSyncedAt/loadPhase sont des variables module-level
// (lues par du code hors React — voir requestUrgentSave), donc pas nativement
// réactives : ce petit pub-sub permet à useCloudSave() de re-render quand
// elles changent, sans dupliquer l'état dans un store zustand pour si peu.
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

export type CloudSyncStatus = 'loading' | 'syncing' | 'synced';
export type LoadPhase = 'loading' | 'error' | 'ready';

// Couleur + libellé partagés entre le badge (GameLayout) et le détail
// (SettingsPage), pour ne jamais les faire diverger.
export function formatSyncStatus(status: CloudSyncStatus, lastSyncedAtMs: number | null): { color: string; label: string } {
  switch (status) {
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

let loadPhaseListeners: ((phase: LoadPhase) => void) | null = null;

function scheduleReconciliationRetry(userId: string, generation: number) {
  if (retryTimer) return; // déjà planifiée
  retryTimer = setTimeout(() => attemptLoad(userId, generation), retryDelayMs);
}

// ── Chargement au login / retry — source unique : Firestore ────────────────
async function attemptLoad(userId: string, generation: number): Promise<void> {
  retryTimer = null;
  const [{ data: remote, reachable }, offsetMs] = await Promise.all([
    loadGameFromFirestore(userId),
    probeClockOffset(userId),
  ]);
  if (generation !== sessionGeneration) return; // supplanté par un autre login/logout entre-temps

  if (!reachable) {
    retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS);
    setCloudSyncConfirmed(false);
    loadPhaseListeners?.('error');
    scheduleReconciliationRetry(userId, generation);
    return;
  }

  if (offsetMs !== null) setClockOffset(offsetMs);
  if (remote) applyRemoteState(remote as Record<string, unknown>);
  mergeAchievementState(remote as Record<string, unknown> | null);

  clearReconciliationRetry();
  setCloudSyncConfirmed(true);
  loadPhaseListeners?.('ready');
}

// ── Firebase (avec gestion quota + timeout 5s) ────────────────────────────
// Renvoie true seulement si l'écriture a réellement atteint Firestore — un
// appelant (ex. le bouton "Forcer la sauvegarde") ne doit jamais afficher un
// succès si la donnée n'a en fait jamais quitté la machine (quota, timeout,
// réseau d'entreprise qui bloque Firestore, etc.) : sans sauvegarde locale de
// secours, le joueur perdrait purement et simplement cette progression.
async function saveToFirebase(userId: string): Promise<boolean> {
  if (!cloudSyncConfirmed) {
    console.warn('[CloudSave] Écriture cloud suspendue : synchro pas encore confirmée (le premier chargement cloud a échoué), reconciliation en cours.');
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

    // Timeout 5s — si Firebase est bloqué (quota), on n'attend pas indéfiniment
    await Promise.race([
      saveGameToFirestore(userId, payload),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);

    useGameStore.setState({ savedAt: data.savedAt });
    markSynced(Date.now());

    console.log('[CloudSave] Firebase OK —', new Date().toLocaleTimeString());
    return true;
  } catch (e) {
    console.warn('[CloudSave] Firebase indisponible (quota ou timeout):', e);
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
  saveToFirebase(urgentSaveUserId);
}

// Sauvegarde bloquante immédiate (attend la confirmation d'écriture) — pour
// les cas où l'appelant a besoin de savoir si ça a vraiment abouti avant de
// continuer (ex: resetGame() dans gameStore.ts, qui ne doit pas laisser le
// joueur rafraîchir avant que le reset soit durable, faute de secours local).
export function forceSaveNow(): Promise<boolean> {
  if (!urgentSaveUserId) return Promise.resolve(false);
  return saveToFirebase(urgentSaveUserId);
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useCloudSave(userId: string | null) {
  const loadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const lastCorrectionRef = useRef(0);
  // Reflète loadedRef en state pour que les appelants (ex: le calcul des gains
  // AFK) puissent attendre la fin du chargement cloud avant de créditer quoi
  // que ce soit.
  const [loadPhase, setLoadPhase] = useState<LoadPhase>(userId ? 'loading' : 'ready');

  // Re-render quand cloudSyncConfirmed/lastSyncedAt changent (variables
  // module-level, pas nativement réactives — voir le pub-sub plus haut) pour
  // que syncStatus/lastSyncedAt ci-dessous reflètent toujours l'état courant.
  const [, forceSyncRerender] = useState(0);
  useEffect(() => {
    const listener = () => forceSyncRerender(n => n + 1);
    syncListeners.add(listener);
    return () => { syncListeners.delete(listener); };
  }, []);

  // Branche loadPhaseListeners (module-level, voir attemptLoad) sur ce state
  // React tant que ce hook est monté pour CET userId.
  useEffect(() => {
    loadPhaseListeners = setLoadPhase;
    return () => { if (loadPhaseListeners === setLoadPhase) loadPhaseListeners = null; };
  }, []);

  // Chargement au login
  useEffect(() => {
    // Toute génération précédente (login/logout antérieur, éventuellement
    // encore en vol sur un await) devient périmée dès qu'un effet tourne ici —
    // voir le commentaire sur sessionGeneration plus haut dans ce fichier.
    sessionGeneration++;
    const myGeneration = sessionGeneration;

    if (!userId) {
      loadedRef.current = false; userIdRef.current = null; setLoadPhase('ready');
      urgentSaveUserId = null; urgentSaveReady = false;
      clearReconciliationRetry();
      setCloudSyncConfirmed(true);
      return;
    }
    if (userId === userIdRef.current) return;
    userIdRef.current = userId;
    loadedRef.current = false;
    urgentSaveUserId = userId;
    urgentSaveReady = false;
    // Repart d'un état propre : une reconciliation encore en attente pour un
    // PRÉCÉDENT utilisateur (autre session sur cet onglet) ne doit pas
    // interférer avec ce nouveau login.
    clearReconciliationRetry();
    setCloudSyncConfirmed(true);
    setLoadPhase('loading');
    attemptLoad(userId, myGeneration).finally(() => {
      if (myGeneration === sessionGeneration) { loadedRef.current = true; urgentSaveReady = true; }
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
      // chargé par attemptLoad, pas une nouvelle correction en direct).
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

  // Firebase toutes les 10min
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      if (!loadedRef.current) return;
      saveToFirebase(userId);
    }, FIREBASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Save à la mise en arrière-plan / fermeture d'onglet.
  useEffect(() => {
    if (!userId) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && loadedRef.current) {
        saveToFirebase(userId);
      }
    };
    // pagehide : dernier filet avant fermeture/navigation — plus fiable que
    // beforeunload pour du travail async, et non déprécié. Best-effort
    // uniquement : la page peut disparaître avant que la requête n'aboutisse,
    // rien ne peut garantir cette dernière écriture sans sauvegarde locale.
    const onPageHide = () => {
      if (loadedRef.current) saveToFirebase(userId);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [userId]);

  // Sauvegarde manuelle (bouton) — renvoie si l'écriture Firestore a vraiment
  // abouti, pour que le bouton n'affiche jamais "Sauvegardé !" à tort.
  const forceSave = async (): Promise<boolean> => {
    if (!userId || !loadedRef.current) return false;
    return saveToFirebase(userId);
  };

  // Relance immédiate du chargement (bouton "Réessayer" de l'écran de
  // blocage) — annule le backoff en cours et retente tout de suite.
  const retryLoad = () => {
    if (!userId) return;
    clearReconciliationRetry();
    sessionGeneration++;
    const myGeneration = sessionGeneration;
    userIdRef.current = userId;
    loadedRef.current = false;
    setLoadPhase('loading');
    attemptLoad(userId, myGeneration).finally(() => {
      if (myGeneration === sessionGeneration) { loadedRef.current = true; urgentSaveReady = true; }
    });
  };

  // Statut affiché au joueur (badge + Paramètres) — voir CloudSyncStatus :
  // 'loading' = chargement cloud initial en cours ; 'syncing' = synchro pas
  // encore confirmée (reconciliation après une panne réseau) ; 'synced' = OK.
  const syncStatus: CloudSyncStatus =
    loadPhase !== 'ready' ? 'loading' :
    !cloudSyncConfirmed ? 'syncing' :
    'synced';

  return { forceSave, loaded: loadPhase === 'ready', loadPhase, retryLoad, syncStatus, lastSyncedAt };
}
