'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useGameStore } from '@/store/gameStore';
import { logFirestoreOp } from '@/lib/firebase/telemetry';
import {
  FIREBASE_INTERVAL_MS,
  LOCAL_INTERVAL_MS,
  bumpSessionGeneration,
  getSessionGeneration,
  resetSyncState,
  setUrgentSaveUserId,
  setUrgentSaveReady,
  loadAndApply,
  saveToFirebase,
  refreshLocalSavedAt,
  waitForAllHydrated,
  subscribeSyncStatus,
  getCloudSyncConfirmed,
  getLastSyncedAt,
  buildAdminCorrectionPatch,
  type CloudSyncStatus,
} from '@/lib/firebase/cloudSaveSync';

// ── Hook principal ─────────────────────────────────────────────────────────
// Ce fichier ne contient plus que le wiring React (useEffect/useState) — la
// logique pure et l'orchestration de la synchro (sérialisation, merge d'état,
// retry de reconciliation, sauvegarde Firebase...) vit dans
// lib/firebase/cloudSaveSync.ts, réutilisable et testable indépendamment de
// React.
export function useCloudSave(userId: string | null) {
  const loadedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const lastCorrectionRef = useRef(0);
  // Reflète loadedRef en state pour que les appelants (ex: le calcul des gains
  // AFK) puissent attendre la fin du chargement cloud avant de créditer quoi
  // que ce soit — sans ça, un chargement cloud lent peut écraser un gain déjà
  // crédité localement (voir claimOfflineEarnings).
  const [loaded, setLoaded] = useState(!userId);

  // Re-render quand cloudSyncConfirmed/lastSyncedAt changent (état
  // module-level dans cloudSaveSync.ts, pas nativement réactif) pour que
  // syncStatus/lastSyncedAt ci-dessous reflètent toujours l'état courant.
  const [, forceSyncRerender] = useState(0);
  useEffect(() => {
    return subscribeSyncStatus(() => forceSyncRerender(n => n + 1));
  }, []);

  // Chargement au login
  useEffect(() => {
    // Toute génération précédente (login/logout antérieur, éventuellement
    // encore en vol sur un await) devient périmée dès qu'un effet tourne ici —
    // voir le commentaire sur sessionGeneration dans cloudSaveSync.ts.
    const myGeneration = bumpSessionGeneration();

    if (!userId) {
      // Ne réinitialise que sur une VRAIE déconnexion (userIdRef.current
      // passait d'un compte à null) — pas au tout premier rendu d'un invité
      // qui n'a jamais été connecté, sinon sa progression locale serait
      // effacée dès l'ouverture du jeu.
      const wasLoggedIn = userIdRef.current !== null;
      loadedRef.current = false; userIdRef.current = null; setLoaded(true);
      setUrgentSaveUserId(null); setUrgentSaveReady(false);
      // Pas de reconciliation à poursuivre pour un utilisateur déconnecté.
      resetSyncState();
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
    setUrgentSaveUserId(userId);
    setUrgentSaveReady(false);
    // Repart d'un état propre : une reconciliation encore en attente pour un
    // PRÉCÉDENT utilisateur (autre session sur cet onglet) ne doit pas
    // interférer avec ce nouveau login — loadAndApply ci-dessous redécide.
    resetSyncState();
    setLoaded(false);
    (async () => {
      await waitForAllHydrated();
      if (myGeneration !== getSessionGeneration()) return; // supplanté pendant l'attente
      await loadAndApply(userId, myGeneration);
    })().finally(() => {
      if (myGeneration === getSessionGeneration()) { loadedRef.current = true; setUrgentSaveReady(true); setLoaded(true); }
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
      // Chaque snapshot livré par un listener temps réel (initial + chaque
      // changement du document) facture 1 lecture, qu'il déclenche ou non une
      // vraie correction admin ci-dessous.
      logFirestoreOp('read', 'admin_correction_watch');
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const result = buildAdminCorrectionPatch(data, lastCorrectionRef.current);
      if (!result) return;
      lastCorrectionRef.current = result.correctionAt;
      // Ignore la toute première lecture au montage (c'est juste l'état déjà
      // chargé par loadAndApply, pas une nouvelle correction en direct).
      if (!loadedRef.current) return;
      useGameStore.setState(result.patch as unknown as Parameters<typeof useGameStore.setState>[0]);
    });
    return unsub;
  }, [userId]);

  // localStorage toutes les 30s — indépendant du quota Firebase
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      if (!loadedRef.current) return;
      refreshLocalSavedAt();
    }, LOCAL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Firebase toutes les 10min
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(() => {
      if (!loadedRef.current) return;
      saveToFirebase(userId, 'periodic');
    }, FIREBASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // Save à la fermeture / mise en arrière-plan
  useEffect(() => {
    if (!userId) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden' && loadedRef.current) {
        refreshLocalSavedAt();                       // immédiat, pas de quota
        saveToFirebase(userId, 'visibility'); // tentative Firebase (peut échouer si quota)
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [userId]);

  // Sauvegarde manuelle (bouton) — renvoie si l'écriture Firestore a vraiment
  // abouti, pour que le bouton n'affiche jamais "Sauvegardé !" à tort.
  const forceSave = async (): Promise<boolean> => {
    if (!userId || !loadedRef.current) return false;
    refreshLocalSavedAt();
    return saveToFirebase(userId, 'manual');
  };

  // Statut affiché au joueur (badge + Paramètres) — voir CloudSyncStatus :
  // 'offline' = pas connecté (progression locale uniquement, pas de risque de
  // désync puisqu'il n'y a rien à synchroniser) ; 'loading' = chargement cloud
  // initial en cours ; 'syncing' = synchro pas encore confirmée (reconciliation
  // après une panne réseau au login, voir cloudSyncConfirmed dans
  // cloudSaveSync.ts) ; 'synced' = OK.
  const syncStatus: CloudSyncStatus =
    !userId ? 'offline' :
    !loaded ? 'loading' :
    !getCloudSyncConfirmed() ? 'syncing' :
    'synced';

  return { forceSave, loaded, syncStatus, lastSyncedAt: getLastSyncedAt() };
}
