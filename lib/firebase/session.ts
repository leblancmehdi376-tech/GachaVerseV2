import { doc, getDoc, onSnapshot, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '../logger';
import { logFirestoreOp } from './telemetry';

const LOCAL_SESSION_KEY = 'nekoz_session_claim';
const SESSION_TTL_MS = 420_000;        // 7min de marge (large, car le battement est désormais plus espacé + suspendu en arrière-plan)
const SESSION_HEARTBEAT_MS = 185_000;  // 15s -> 60s -> 3min : le battement restait le plus gros poste d'écriture Firestore, largement devant la sauvegarde cloud elle-même

export interface SessionClaim {
  uid: string;
  browserId: string;
  sessionToken: string;
  claimedAt: number;
  lastSeenAt: number;
  expiresAt: number;
  active: boolean;
}

function getBrowserId(): string {
  if (typeof window === 'undefined') return 'server';

  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { browserId?: string };
      if (parsed.browserId) return parsed.browserId;
    } catch {}
  }

  const generated = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ browserId: generated }));
  return generated;
}

function getSessionToken(): string {
  if (typeof window === 'undefined') return 'server-token';

  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { sessionToken?: string };
      if (parsed.sessionToken) return parsed.sessionToken;
    } catch {}
  }

  const generated = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const current = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) ?? '{}') as { browserId?: string };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ ...current, sessionToken: generated }));
  return generated;
}

export async function claimSession(uid: string): Promise<boolean> {
  if (!db) {
    logger.warn('[Session] Firestore non disponible — contournement en développement activé.');
    return true;
  }
  if (!uid) return false;

  const browserId = getBrowserId();
  const sessionToken = getSessionToken();
  const now = Date.now();
  const sessionRef = doc(db, 'sessions', uid);

  try {
    await runTransaction(db, async (tx) => {
      const current = await tx.get(sessionRef);
      const data = current.data() as Partial<SessionClaim> | undefined;
      const isFresh = !!data?.active && typeof data.expiresAt === 'number' && data.expiresAt > now;

      if (isFresh && data?.browserId && data.browserId !== browserId) {
        logger.warn('[Session] takeover: another active session exists — replacing it now.');
      }

      const nextClaim: SessionClaim = {
        uid,
        browserId,
        sessionToken,
        active: true,
        claimedAt: now,
        lastSeenAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };

      tx.set(sessionRef, nextClaim, { merge: true });
    });
    logFirestoreOp('read', 'session_claim');
    logFirestoreOp('write', 'session_claim');

    localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({ uid, browserId, sessionToken, claimedAt: now })
    );
    return true;
  } catch (error) {
    if (String(error).includes('SESSION_CONFLICT')) {
      logger.warn('[Session] account already active on another browser/device');
      return false;
    }
    logger.error('[Session] claimSession failed:', error);
    return false;
  }
}

export async function heartbeatSession(uid: string): Promise<boolean> {
  if (!db) {
    logger.warn('[Session] Firestore non disponible — heartbeat contourné en développement.');
    return true;
  }
  if (!uid || typeof window === 'undefined') return false;

  const browserId = getBrowserId();
  const sessionToken = getSessionToken();
  const ref = doc(db, 'sessions', uid);

  try {
    const current = await getDoc(ref);
    logFirestoreOp('read', 'session_heartbeat');
    const data = current.data() as Partial<SessionClaim> | undefined;
    if (!data?.active) return false;
    if (data.browserId && data.browserId !== browserId) return false;
    if (data.sessionToken && data.sessionToken !== sessionToken) return false;

    const now = Date.now();
    await updateDoc(ref, {
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
      sessionToken,
      browserId,
      active: true,
    });
    logFirestoreOp('write', 'session_heartbeat');
    return true;
  } catch (error) {
    logger.error('[Session] heartbeatSession failed:', error);
    return false;
  }
}

export function watchSession(uid: string, onConflict: () => void): () => void {
  if (!db || !uid || typeof window === 'undefined') {
    return () => {};
  }

  const browserId = getBrowserId();
  const sessionToken = getSessionToken();
  const ref = doc(db, 'sessions', uid);

  const unsub = onSnapshot(ref, (snap) => {
    logFirestoreOp('read', 'session_watch');
    const data = snap.data() as Partial<SessionClaim> | undefined;
    if (!data || !data.active) return;

    const isExpired = typeof data.expiresAt === 'number' && data.expiresAt <= Date.now();
    if (isExpired) return;

    const otherBrowser = !!data.browserId && data.browserId !== browserId;
    const otherSession = !!data.sessionToken && data.sessionToken !== sessionToken;

    if (otherBrowser || otherSession) {
      onConflict();
    }
  });

  // Le battement ne tourne QUE quand l'onglet est visible/actif — beaucoup de
  // joueurs laissent le jeu ouvert en arrière-plan pendant des heures sans y
  // jouer ; ça évite d'écrire pour rien tout ce temps-là, gros poste d'économie.
  let interval: number | null = null;
  const startHeartbeat = () => {
    if (interval) return;
    heartbeatSession(uid).catch(() => {}); // battement immédiat au retour au premier plan
    interval = window.setInterval(() => {
      heartbeatSession(uid).catch(() => {});
    }, SESSION_HEARTBEAT_MS);
  };
  const stopHeartbeat = () => {
    if (interval) { window.clearInterval(interval); interval = null; }
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') startHeartbeat();
    else stopHeartbeat();
  };
  document.addEventListener('visibilitychange', handleVisibility);
  if (document.visibilityState === 'visible') startHeartbeat();

  return () => {
    unsub();
    stopHeartbeat();
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

export function clearLocalSession(): void {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {}
}

// Libère le verrou Firestore à la déconnexion (à appeler AVANT clearLocalSession
// et AVANT signOut, tant que ce navigateur est encore authentifié). Sans ça,
// une déconnexion propre laisse le doc "active:true" pointer sur cet appareil
// jusqu'à expiration du TTL (150s) — le nouvel appareil peut alors se faire
// kicker par sa propre écoute watchSession avant que son claimSession n'ait
// eu le temps d'écraser ce verrou périmé.
export async function releaseSession(uid: string): Promise<void> {
  if (!db || !uid || typeof window === 'undefined') return;

  const browserId = getBrowserId();
  const sessionToken = getSessionToken();
  const ref = doc(db, 'sessions', uid);

  try {
    const current = await getDoc(ref);
    logFirestoreOp('read', 'session_release');
    const data = current.data() as Partial<SessionClaim> | undefined;
    // Ne libère que si ce navigateur est bien le détenteur actuel du verrou —
    // sinon on risquerait de désactiver la session d'un autre appareil qui
    // aurait déjà repris la main entre-temps (ex: après un kick).
    if (!data || data.browserId !== browserId || data.sessionToken !== sessionToken) return;
    await updateDoc(ref, { active: false });
    logFirestoreOp('write', 'session_release');
  } catch (error) {
    logger.error('[Session] releaseSession failed:', error);
  }
}
