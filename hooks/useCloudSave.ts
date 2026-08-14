'use client';
import { useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useGameStore } from '@/store/gameStore';
import { useAchievementStore } from '@/store/achievementStore';
import { saveGameToFirestore, loadGameFromFirestore } from '@/lib/firebase/saveGame';
import { updatePlayerScore } from '@/lib/firebase/leaderboard';

const FIREBASE_INTERVAL_MS = 600_000; // Firebase toutes les 10min (quota)
const LOCAL_INTERVAL_MS    =  30_000; // localStorage toutes les 30s (gratuit, illimité)
const LOCAL_STORAGE_KEY    = 'gachaverse_save';

// ── Sérialisation ──────────────────────────────────────────────────────────
function getSerializableState() {
  const s = useGameStore.getState();
  return {
    pixelCoins:         s.pixelCoins,
    nekoGems:           s.nekoGems,
    totalGemsSpent:     s.totalGemsSpent ?? 0,
    totalGachaPulls:    s.totalGachaPulls ?? 0,
    totalClicks:        s.totalClicks,
    wave:               s.wave,
    palier:             s.palier,
    maxPalierReached:   s.maxPalierReached,
    currentEnemy:       s.currentEnemy,
    baseDpc:            s.baseDpc,
    clickUpgradeLevel:  s.clickUpgradeLevel,
    goldUpgradeLevel:   s.goldUpgradeLevel ?? 0,
    equippedTeam:       s.equippedTeam,
    collection:         s.collection,
    hero:               s.hero,
    bossActive:         s.bossActive,
    bossTimeLeft:       s.bossTimeLeft,
    quests:             s.quests,
    questsDayKey:       s.questsDayKey,
    musicVolume:        s.musicVolume,
    musicMuted:         s.musicMuted,
    bossCrowns:         s.bossCrowns,
    voidOrbs:           s.voidOrbs,
    inventory:          s.inventory,
    equipmentInventory: s.equipmentInventory,
    championInventory:  s.championInventory ?? {},
    dpsBoostEndsAt:     s.dpsBoostEndsAt,
    goldBoostEndsAt:    s.goldBoostEndsAt,
    dailyShop:          s.dailyShop,
    starterPackClaimed: s.starterPackClaimed,
    username:           s.username,
    // Succès déjà réclamés — stockés dans un store séparé (achievementStore),
    // qui a son propre localStorage jamais synchronisé avec Firestore. Sans
    // ça, un succès déjà débloqué redevient "réclamable" sur tout nouvel
    // appareil (ses conditions sont recalculées depuis les stats, elles,
    // bien synchronisées) et redonne ses gemmes une deuxième fois.
    achievementsClaimed: useAchievementStore.getState().claimed,
    savedAt:            Date.now(),
  };
}

// Fusionne les succès réclamés vus sur cet appareil, en localStorage et sur
// Firebase — jamais un simple "dernier gagne", car un claim ne doit JAMAIS
// pouvoir redisparaître (sinon la fenêtre de double-claim rouvre) ni être
// perdu si la source la plus récente vient d'un appareil qui ignore encore
// un claim fait ailleurs.
function mergeClaimedAchievements(
  remote: Record<string, unknown> | null,
  local: Record<string, unknown> | null
): Record<string, boolean> {
  const merged: Record<string, boolean> = { ...useAchievementStore.getState().claimed };
  for (const source of [remote, local]) {
    const claimed = source?.achievementsClaimed as Record<string, boolean> | undefined;
    if (!claimed) continue;
    for (const id of Object.keys(claimed)) if (claimed[id]) merged[id] = true;
  }
  return merged;
}

// ── localStorage (backup local, aucun quota) ───────────────────────────────
function saveToLocal() {
  try {
    const data = getSerializableState();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    useGameStore.setState({ savedAt: data.savedAt });
  } catch (e) {
    console.warn('[CloudSave] localStorage write failed:', e);
  }
}

function loadFromLocal(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Chargement au login — compare Firebase, localStorage et état local ─────
async function loadAndApply(userId: string) {
  try {
    const [remote, local] = await Promise.all([
      loadGameFromFirestore(userId),
      Promise.resolve(loadFromLocal()),
    ]);

    const current = useGameStore.getState();

    // Cherche la sauvegarde la plus récente parmi les 3 sources
    const sources = [
      { label: 'firebase',      data: remote,  ts: (remote  as Record<string,unknown>)?.lastSaved as number ?? 0 },
      { label: 'localStorage',  data: local,   ts: (local   as Record<string,unknown>)?.savedAt   as number ?? 0 },
      { label: 'local (store)', data: null,    ts: current.savedAt ?? 0 },
    ];

    const best = sources.reduce((a, b) => (b.ts > a.ts ? b : a));
    console.log('[CloudSave] Sources:', sources.map(s => `${s.label}=${new Date(s.ts).toLocaleTimeString()}`).join(' | '));
    console.log('[CloudSave] Meilleure source:', best.label, '—', new Date(best.ts).toLocaleTimeString());

    if (best.data && best.ts > (current.savedAt ?? 0)) {
      // Suppress toasts/notifications while applying remote state to avoid
      // duplicate achievement/quest toasts when the player logs in on another device.
      try { useGameStore.setState({ suppressToasts: true }); } catch {}
      useGameStore.setState(best.data as Parameters<typeof useGameStore.setState>[0]);
      // Allow effects to settle, then re-enable toasts.
      setTimeout(() => { try { useGameStore.setState({ suppressToasts: false }); } catch {} }, 200);
    }

    // Fusion des succès réclamés — TOUJOURS, indépendamment de la source
    // "la plus récente" choisie ci-dessus (un claim ne doit jamais dépendre
    // d'un timestamp : voir mergeClaimedAchievements).
    const mergedClaimed = mergeClaimedAchievements(
      remote as Record<string, unknown> | null,
      local as Record<string, unknown> | null
    );
    useAchievementStore.setState({ claimed: mergedClaimed });
  } catch (e) {
    console.error('[CloudSave] Erreur loadAndApply:', e);
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
  try {
    const s    = useGameStore.getState();
    const data = getSerializableState();

    // Timeout 5s — si Firebase est bloqué (quota), on n'attend pas indéfiniment
    await Promise.race([
      saveGameToFirestore(userId, data),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);

    useGameStore.setState({ savedAt: data.savedAt });

    let totalDps = 0;
    try { totalDps = s.getTotalDps?.() ?? 0; } catch { /* ignore */ }

    await Promise.race([
      updatePlayerScore(userId, {
        username:    s.username    || 'Joueur',
        palier:      s.palier,
        wave:        s.wave,
        pixelCoins:  s.pixelCoins,
        totalClicks: s.totalClicks,
        totalDps,
      }),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);

    console.log('[CloudSave] Firebase OK —', new Date().toLocaleTimeString());
    return true;
  } catch (e) {
    console.warn('[CloudSave] Firebase indisponible (quota ou timeout), données conservées en localStorage:', e);
    return false;
  }
}

// ── Hook principal ─────────────────────────────────────────────────────────
export function useCloudSave(userId: string | null) {
  const loadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const lastCorrectionRef = useRef(0);

  // Chargement au login
  useEffect(() => {
    if (!userId) { loadedRef.current = false; userIdRef.current = null; return; }
    if (userId === userIdRef.current) return;
    userIdRef.current = userId;
    loadedRef.current = false;
    loadAndApply(userId).finally(() => { loadedRef.current = true; });
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
      const patch: Record<string, unknown> = { savedAt: Date.now() };
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

  return { forceSave };
}