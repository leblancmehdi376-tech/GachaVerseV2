import { useGameStore } from '@/store/gameStore';
import { saveGameToFirestore, loadGameFromFirestore, probeClockOffset } from '@/lib/firebase/saveGame';
import { setClockOffset, correctedNow } from '@/lib/firebase/clockOffset';
import { logger } from '@/lib/logger';
import { BN_ZERO, coerceBigNum, type BigNum } from '@/lib/game/bignum';
import { migrateAnomalies, type Anomaly } from '@/lib/game/anomalies';

// Logique pure/orchestration de la synchro cloud (indépendante de React) —
// voir hooks/useCloudSave.ts, qui ne garde que le wiring useEffect/useState
// et appelle les fonctions exportées d'ici.

export const FIREBASE_INTERVAL_MS = 600_000; // Firebase toutes les 10min (quota)
export const LOCAL_INTERVAL_MS    =  30_000; // rafraîchissement de savedAt toutes les 30s (gratuit, illimité)

// ── Sérialisation ──────────────────────────────────────────────────────────
// Exportée uniquement pour le test d'exhaustivité (useCloudSave.test.ts)
// qui vérifie qu'aucun champ persistant de gameStore n'est oublié ici — voir
// ce fichier de test pour le contexte (bugs historiques de champs oubliés).
export function getSerializableState() {
  const s  = useGameStore.getState();
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
    prestigeStatBaselines: s.prestigeStatBaselines ?? { totalKills: 0, totalGachaPulls: 0, totalQuestsCompleted: 0, totalUpgradesPerformed: 0 },
    inventory:          s.inventory,
    equipmentInventory: s.equipmentInventory,
    championInventory:  s.championInventory ?? {},
    bankedRanks:         s.bankedRanks ?? {},
    historicalMaxRank:   s.historicalMaxRank ?? {},
    // Nombre d'achats déjà effectués par boss d'événement (prix +10% par
    // achat, voir getEventCharacterCost) — jamais synchronisé avant ce
    // correctif : un refresh/reconnexion faisait revenir le prix à son
    // tarif de départ (bug mineur, favorable au joueur).
    eventCharacterPurchases: s.eventCharacterPurchases ?? {},
    // Fusion/drop d'équipement débloqués par rareté (via expéditions) — vraie
    // progression, jamais synchronisée avant ce correctif : revenait à ['C']
    // sur tout nouvel appareil, rebloquant équipement et expéditions déjà acquis.
    unlockedEquipRarities:     s.unlockedEquipRarities ?? ['C'],
    unlockedEquipDropRarities: s.unlockedEquipDropRarities ?? ['C'],
    dpsBoostEndsAt:     s.dpsBoostEndsAt,
    goldBoostEndsAt:    s.goldBoostEndsAt,
    dailyShop:          s.dailyShop,
    starterPackClaimed: s.starterPackClaimed,
    dailyRewardDayKey:       s.dailyRewardDayKey,
    dailyRewardCurrentDay:   s.dailyRewardCurrentDay,
    dailyRewardClaimedToday: s.dailyRewardClaimedToday,
    dailyRewardClaimedDays:  s.dailyRewardClaimedDays ?? [],
    username:           s.username,
    offlineMultLevel:   s.offlineMultLevel,
    offlineCapLevel:    s.offlineCapLevel,
    lastOfflineGain:    s.lastOfflineGain,
    // Succès déjà réclamés — sans ça, un succès déjà débloqué redevient
    // "réclamable" sur tout nouvel appareil (ses conditions sont recalculées
    // depuis les stats, elles, bien synchronisées) et redonne ses gemmes une
    // deuxième fois.
    achievementsClaimed: s.achievementsClaimed,
    // Titres débloqués (succès + drops de boss d'event, voir unlockTitle) et
    // titre actif — un titre gagné par drop d'event (non dérivable des stats,
    // contrairement aux succès) disparaîtrait sinon sur tout nouvel appareil,
    // avec son bonus d'or actif.
    unlockedTitles: s.unlockedTitles,
    activeTitle:    s.activeTitle,
    // Expéditions et forge.
    expeditionActive:         s.expeditionActive,
    expeditionDropInventory:  s.expeditionDropInventory,
    expeditionCraftedRecipes: s.expeditionCraftedRecipes,
    expeditionSlotLevel:      s.expeditionSlotLevel ?? 0,
    expeditionDefAffinities:  s.expeditionDefAffinities ?? {},
    // Prestige.
    prestigeLevel:       s.prestigeLevel,
    prestigeTokens:      s.prestigeTokens,
    prestigeBonusLevels: s.prestigeBonusLevels,
    prestigeRankRecoveryLevel: s.prestigeRankRecoveryLevel,
    // Mine de gemmes.
    mineOwned:      s.mineOwned,
    mineCapLevel:   s.mineCapLevel,
    mineSpeedLevel: s.mineSpeedLevel,
    mineGems:       s.mineGems,
    mineLastTickAt: s.mineLastTickAt,
    // Anomalies — bonus passifs permanents, jamais reset au Prestige (voir
    // doPrestige) : doivent être synchronisées comme bossCrowns/voidOrbs.
    anomalyTokens:   s.anomalyTokens ?? 0,
    ownedAnomalies:  s.ownedAnomalies ?? [],
    anomalySlots:    s.anomalySlots ?? 1,
    // Compadex — jamais reset au Prestige (comme historicalMaxRank/anomalies),
    // doit donc être synchronisé pour survivre à un changement d'appareil.
    compadexCharactersSeen: s.compadexCharactersSeen ?? {},
    compadexEquipmentSeen:  s.compadexEquipmentSeen ?? {},
    savedAt:            correctedNow(),
  };
}

// Fusionne les champs qui ne font QUE grandir (jamais synchro par simple
// "dernier gagne" comme le reste de l'état — voir plus bas), vus sur cet
// appareil et sur Firebase (le localStorage n'est plus une source à la
// connexion — voir loadAndApply) :
// - `claimed`, `unlockedTitles`, `compadexCharactersSeen`/`compadexEquipmentSeen`
//   ne font QUE grandir : un claim, un titre débloqué (ex: drop de boss
//   d'event, non dérivable des stats) ou une entrée de Compadex ne doit
//   JAMAIS pouvoir redisparaître, même si la source qui la connaît n'est pas
//   la plus récente des deux (sinon un device qui synchronise en retard
//   "gagnerait" et effacerait silencieusement la progression Compadex faite
//   entre-temps sur l'autre appareil).
// - `activeTitle` (préférence d'affichage, pas un déblocage) suit lui la
//   source la plus fraîche (`freshest`), comme le reste de l'état.
function mergeMonotonicState(
  remote: Record<string, unknown> | null,
  freshest: Record<string, unknown> | null
): {
  achievementsClaimed: Record<string, boolean>; unlockedTitles: string[]; activeTitle: string;
  compadexCharactersSeen: Record<string, true>; compadexEquipmentSeen: Record<string, true>;
} {
  const current = useGameStore.getState();
  const achievementsClaimed: Record<string, boolean> = { ...current.achievementsClaimed };
  const unlockedTitles = new Set<string>(current.unlockedTitles);
  const c = remote?.achievementsClaimed as Record<string, boolean> | undefined;
  if (c) for (const id of Object.keys(c)) if (c[id]) achievementsClaimed[id] = true;
  const t = remote?.unlockedTitles as string[] | undefined;
  if (Array.isArray(t)) for (const title of t) unlockedTitles.add(title);
  const freshTitle = freshest?.activeTitle as string | undefined;
  const activeTitle = typeof freshTitle === 'string' && unlockedTitles.has(freshTitle) ? freshTitle : current.activeTitle;

  const compadexCharactersSeen: Record<string, true> = { ...current.compadexCharactersSeen };
  const remoteChars = remote?.compadexCharactersSeen as Record<string, unknown> | undefined;
  if (remoteChars) for (const id of Object.keys(remoteChars)) compadexCharactersSeen[id] = true;
  const compadexEquipmentSeen: Record<string, true> = { ...current.compadexEquipmentSeen };
  const remoteEquip = remote?.compadexEquipmentSeen as Record<string, unknown> | undefined;
  if (remoteEquip) for (const id of Object.keys(remoteEquip)) compadexEquipmentSeen[id] = true;

  return { achievementsClaimed, unlockedTitles: Array.from(unlockedTitles), activeTitle, compadexCharactersSeen, compadexEquipmentSeen };
}

// ── Rafraîchissement local de savedAt ──────────────────────────────────────
// La vraie persistance locale est déjà assurée par le middleware `persist` de
// Zustand (voir store/gameStore.ts, clé 'nekoz-world-v8'), qui réécrit le
// disque à CHAQUE set() pertinent — pas besoin de dupliquer l'état ici.
// Cette fonction ne fait donc que rafraîchir `savedAt` sur le store en
// mémoire (le prochain set() le fera persister via ce même middleware), pour
// que loadAndApply puisse détecter une session locale "récemment active"
// même sans gain de monnaie entre-temps (ex: joueur inactif mais connecté).
export function refreshLocalSavedAt() {
  try {
    useGameStore.setState({ savedAt: correctedNow() });
  } catch (e) {
    logger.warn('[CloudSave] Rafraîchissement local de savedAt échoué:', e);
  }
}

// Applique un blob de sauvegarde (cloud ou local) au store — factorisé pour
// être réutilisable par la reconciliation en arrière-plan
// (scheduleReconciliationRetry) sans dupliquer cette logique.
function applyRemoteState(rawData: Record<string, unknown>) {
  // Suppress toasts/notifications while applying remote state to avoid
  // duplicate achievement/quest toasts when the player logs in on another device.
  try { useGameStore.setState({ suppressToasts: true }); } catch {}

  const data = { ...rawData };
  // Compat anciennes sauvegardes cloud (avant le rework Prestige) : on ignore
  // juste ces champs obsolètes plutôt que de les laisser polluer le patch.
  delete data.prestigePoints;
  delete data.prestigePurchased;

  // unlockedTitles/activeTitle/compadex* sont gérés séparément par
  // mergeMonotonicState (règles de fusion différentes du reste — "ne fait
  // que grandir", voir son commentaire) : on ne les laisse pas ici écraser
  // ce merge en "dernier gagne".
  delete data.unlockedTitles;
  delete data.activeTitle;
  delete data.compadexCharactersSeen;
  delete data.compadexEquipmentSeen;

  // Migration BigNum : une sauvegarde cloud écrite par une version antérieure
  // (ou par un client qui n'a pas encore rechargé ce code) stocke encore ces
  // champs en `number` brut — coerceBigNum les remet en forme. Contrairement à
  // localStorage, Firestore ne corrompt pas ces valeurs (pas de JSON.stringify
  // qui transformerait Infinity en null), mais le TYPE attendu par le store a
  // changé et doit être normalisé avant setState.
  if ('pixelCoins' in data) data.pixelCoins = coerceBigNum(data.pixelCoins);
  if (data.currentEnemy && typeof data.currentEnemy === 'object') {
    const enemy = data.currentEnemy as Record<string, unknown>;
    data.currentEnemy = {
      ...enemy,
      maxHp: coerceBigNum(enemy.maxHp),
      currentHp: coerceBigNum(enemy.currentHp),
      pixelCoinsReward: coerceBigNum(enemy.pixelCoinsReward),
    };
  }
  if (data.lastOfflineGain && typeof data.lastOfflineGain === 'object') {
    const gain = data.lastOfflineGain as Record<string, unknown>;
    data.lastOfflineGain = { ...gain, coins: coerceBigNum(gain.coins) };
  }
  if (data.lastBossVictory && typeof data.lastBossVictory === 'object') {
    const victory = data.lastBossVictory as Record<string, unknown>;
    data.lastBossVictory = { ...victory, coins: coerceBigNum(victory.coins) };
  }

  // Même migration d'anomalies que côté local (voir gameStore.ts::merge) —
  // ce chemin cloud n'y passe pas (setState direct ci-dessous, pas le `merge`
  // du middleware persist), donc une save cloud écrite par une version
  // antérieure au rework d'échelle doit être migrée ici aussi.
  if (Array.isArray(data.ownedAnomalies)) {
    data.ownedAnomalies = migrateAnomalies(data.ownedAnomalies as Anomaly[]);
  }

  useGameStore.setState(data as unknown as Parameters<typeof useGameStore.setState>[0]);
  // Allow effects to settle, then re-enable toasts.
  setTimeout(() => { try { useGameStore.setState({ suppressToasts: false }); } catch {} }, 200);
}

// ── Génération de session ──────────────────────────────────────────────────
// Incrémentée à chaque login/logout (voir hooks/useCloudSave.ts). Toute
// opération async (loadAndApply, le callback de scheduleReconciliationRetry)
// capture la génération en cours au démarrage et la revérifie après CHAQUE
// await avant de toucher au state partagé — sans ça, un retry ou un chargement
// encore en vol pour un utilisateur A peut résoudre après qu'on soit passé à
// un utilisateur B (déconnexion/reconnexion rapide dans le même onglet) et
// appliquer les données de A dans la session de B, ou confirmer à tort la
// synchro de B avant que son propre chargement n'ait réussi.
let sessionGeneration = 0;

// Incrémentée par hooks/useCloudSave.ts à chaque (re)montage de l'effet de
// login — voir le commentaire ci-dessus.
export function bumpSessionGeneration(): number {
  sessionGeneration++;
  return sessionGeneration;
}
export function getSessionGeneration(): number {
  return sessionGeneration;
}

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

export function getCloudSyncConfirmed(): boolean { return cloudSyncConfirmed; }
export function getLastSyncedAt(): number | null { return lastSyncedAt; }
export function subscribeSyncStatus(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => { syncListeners.delete(listener); };
}

// Remet à zéro tout l'état de confirmation/reconciliation — appelé par
// hooks/useCloudSave.ts à chaque transition login/logout, pour qu'une
// reconciliation encore en attente pour un PRÉCÉDENT utilisateur (ou pour un
// utilisateur qui vient de se déconnecter) n'interfère pas avec la nouvelle
// session (loadAndApply redécide de tout).
export function resetSyncState() {
  clearReconciliationRetry();
  setCloudSyncConfirmed(true);
  pendingLocalSnapshotTs = null;
  reconciliationAttempts = 0;
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
    const { data: remote, reachable } = await loadGameFromFirestore(userId, 'reconciliation');
    const offsetMs = await probeClockOffset(userId);
    logger.log('[CloudSave] ⇠ Reçu de Firestore (reconciliation):', { reachable, remote });
    if (generation !== sessionGeneration) return; // supplanté par un autre login/logout entre-temps

    if (!reachable) {
      reconciliationAttempts++;
      if (reconciliationAttempts >= MAX_BLOCKING_RECONCILIATION_ATTEMPTS) {
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
export async function loadAndApply(userId: string, generation: number) {
  try {
    logger.log('[CloudSave] ⇢ Chargement au login pour', userId);
    // Séquentiel, PAS Promise.all : voir le commentaire dans
    // scheduleReconciliationRetry — probeClockOffset() écrit sur le MÊME
    // document que celui lu ici, et lancé en parallèle son écriture pollue le
    // cache local que lit loadGameFromFirestore(), renvoyant alors seulement
    // {clockProbeId, clockProbe} au lieu de la vraie sauvegarde.
    const { data: remote, reachable } = await loadGameFromFirestore(userId, 'login');
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

    // Fusion des succès/titres/Compadex — TOUJOURS, indépendamment de la
    // source "la plus récente" choisie ci-dessus (un claim, un titre débloqué
    // ou une entrée de Compadex ne doit jamais dépendre d'un timestamp : voir
    // mergeMonotonicState).
    const merged = mergeMonotonicState(
      remote as Record<string, unknown> | null,
      best.data as Record<string, unknown> | null
    );
    useGameStore.setState(merged);

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
export async function saveToFirebase(userId: string, reason = 'unknown'): Promise<boolean> {
  if (!cloudSyncConfirmed) {
    logger.warn('[CloudSave] Écriture cloud suspendue : synchro pas encore confirmée (le premier chargement cloud a échoué), reconciliation en cours.');
    return false;
  }
  try {
    const s    = useGameStore.getState();
    const data = getSerializableState();

    let totalDps: BigNum = BN_ZERO;
    try { totalDps = s.getTotalDps?.() ?? BN_ZERO; } catch { /* ignore */ }

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
      saveGameToFirestore(userId, payload, reason),
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
// Miroir module-level de l'userId/l'état "prêt" du hook (mis à jour par
// hooks/useCloudSave.ts via setUrgentSaveUserId/setUrgentSaveReady) — permet
// aux actions des stores (gameStore, expeditionStore...) de déclencher une
// sauvegarde sans avoir accès au hook React (voir les imports différés dans
// gameStoreHelpers.ts, qui évitent un cycle d'import avec ce fichier).
let urgentSaveUserId: string | null = null;
let urgentSaveReady   = false;
let lastUrgentSaveAt  = 0;
let pendingUrgentSaveTimer: ReturnType<typeof setTimeout> | null = null;
const URGENT_SAVE_MIN_GAP_MS = 15_000; // évite une rafale d'écritures Firestore (ex: pulls gacha en boucle)

export function setUrgentSaveUserId(userId: string | null) { urgentSaveUserId = userId; }
export function setUrgentSaveReady(ready: boolean) { urgentSaveReady = ready; }

// Avant ce correctif, un appel trop rapproché (throttle) ou trop précoce
// (chargement initial pas encore terminé — ex: lancer une expédition juste
// après avoir ouvert le jeu) était simplement IGNORÉ, sans aucun rattrapage :
// l'événement ne finissait par se synchroniser qu'au prochain cycle périodique
// (jusqu'à 10min plus tard), ce qui pouvait ressembler à une désync entre
// appareils. Chaque demande ignorée reprogramme maintenant un unique rattrapage.
export function requestUrgentSave(reason = 'urgent') {
  if (!urgentSaveUserId) return; // pas connecté, rien à synchroniser

  if (!urgentSaveReady) {
    if (!pendingUrgentSaveTimer) {
      pendingUrgentSaveTimer = setTimeout(() => { pendingUrgentSaveTimer = null; requestUrgentSave(reason); }, 2000);
    }
    return;
  }

  const now = Date.now();
  const elapsed = now - lastUrgentSaveAt;
  if (elapsed < URGENT_SAVE_MIN_GAP_MS) {
    if (!pendingUrgentSaveTimer) {
      pendingUrgentSaveTimer = setTimeout(() => { pendingUrgentSaveTimer = null; requestUrgentSave(reason); }, URGENT_SAVE_MIN_GAP_MS - elapsed);
    }
    return;
  }

  lastUrgentSaveAt = now;
  refreshLocalSavedAt();
  saveToFirebase(urgentSaveUserId, reason);
}

// Variante ATTENDUE (contourne le throttle 15s ci-dessus) — pour un événement
// si critique que l'UI doit rester bloquée jusqu'à confirmation réelle que
// Firestore a reçu l'écriture, avant de rendre la main au joueur (ex: prestige,
// où un changement d'appareil dans les secondes qui suivent doit voir le reset
// déjà en base, pas l'ancienne collection). Renvoie false sans rien tenter si
// pas connecté ou chargement initial pas terminé (mêmes gardes que forceSave).
export async function saveUrgentNow(reason: string): Promise<boolean> {
  if (!urgentSaveUserId || !urgentSaveReady) return false;
  lastUrgentSaveAt = Date.now();
  refreshLocalSavedAt();
  return saveToFirebase(urgentSaveUserId, reason);
}

// ── Attente de la réhydratation locale (zustand persist) ──────────────────
// loadAndApply ne doit JAMAIS démarrer avant que les stores persistés aient
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
export function waitForAllHydrated(): Promise<void> {
  const stores: PersistCapable[] = [useGameStore];
  return Promise.race([
    Promise.all(stores.map(waitForHydration)).then(() => {}),
    new Promise<void>((resolve) => setTimeout(() => {
      logger.warn('[CloudSave] Réhydratation locale incomplète après 3s — chargement cloud lancé quand même.');
      resolve();
    }, 3000)), // filet de sécurité seulement ; la réhydratation locale est normalement quasi instantanée
  ]);
}

// ── Corrections admin en direct ────────────────────────────────────────────
// Calcule le patch à appliquer suite à un snapshot Firestore temps réel
// (voir hooks/useCloudSave.ts, qui écoute onSnapshot pendant que le joueur
// est connecté) — sans ça, une correction faite pendant que le joueur est en
// train de jouer serait écrasée par son propre autosave avant même qu'il ne
// se reconnecte (voir correctPlayerBalance). Logique pure, testable
// indépendamment de l'abonnement onSnapshot lui-même.
export function buildAdminCorrectionPatch(
  data: Record<string, unknown>,
  lastCorrectionAt: number
): { patch: Record<string, unknown>; correctionAt: number } | null {
  const correctionAt = (data.adminCorrectionAt as number) ?? 0;
  if (!correctionAt || correctionAt <= lastCorrectionAt) return null;

  const patch: Record<string, unknown> = { savedAt: correctedNow() };
  if (typeof data.pixelCoins === 'number' || (data.pixelCoins && typeof data.pixelCoins === 'object')) patch.pixelCoins = coerceBigNum(data.pixelCoins);
  if (typeof data.nekoGems   === 'number') patch.nekoGems   = data.nekoGems;
  if (typeof data.bossCrowns === 'number') patch.bossCrowns = data.bossCrowns;
  if (typeof data.palier     === 'number') patch.palier     = data.palier;
  if (typeof data.wave       === 'number') patch.wave       = data.wave;
  if (typeof data.maxPalierReached === 'number') patch.maxPalierReached = data.maxPalierReached;
  if (data.collection && typeof data.collection === 'object') patch.collection = data.collection;

  return { patch, correctionAt };
}
