import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import app from './config';
import { logger } from '../logger';

// Lazy — évite d'initialiser Analytics avant que `app` existe (SSR, config
// manquante en local, voir lib/firebase/config.ts) et tolère un environnement
// où Analytics est indisponible (ex: navigateur bloquant le SDK) sans jamais
// faire planter l'appelant.
let analytics: Analytics | null | undefined;

function getAnalyticsInstance(): Analytics | null {
  if (analytics !== undefined) return analytics;
  try {
    analytics = app ? getAnalytics(app) : null;
  } catch (e) {
    logger.warn('[Telemetry] Analytics indisponible:', e);
    analytics = null;
  }
  return analytics;
}

// Sert uniquement à répartir la consommation de quota Firestore (lectures/
// écritures) par origine dans Firebase Analytics, pour savoir où va le quota
// gratuit avant de décider quoi optimiser — jamais utilisé pour la logique de
// jeu elle-même. `count` porte le nombre réel de documents concernés par UN
// appel (ex: getTopLeaderboard peut lire jusqu'à 100 documents d'un coup) —
// sans lui, un tel appel compterait pour 1 lecture au lieu de 100 dans les stats.
export function logFirestoreOp(op: 'read' | 'write', source: string, count = 1) {
  if (typeof window === 'undefined' || count <= 0) return;
  try {
    const a = getAnalyticsInstance();
    if (!a) return;
    logEvent(a, op === 'read' ? 'firestore_read' : 'firestore_write', { source, count });
  } catch (e) {
    logger.warn('[Telemetry] logEvent failed:', e);
  }
}
