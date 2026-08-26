import { logger } from '../logger';

// On n'utilise volontairement PAS firebase/analytics ici : son initialisation
// automatique interroge https://firebase.googleapis.com/v1alpha/projects/-/apps/{appId}/webConfig
// (chemin générique, avec un "-" comme joker de projet) pour valider le
// measurementId avant d'appeler gtag('config', ...). Pour cette appli, ce
// chemin précis renvoie un JSON SANS measurementId (vérifié : le même appel
// avec l'ID de projet explicite dans le chemin renvoie bien le champ, donc
// c'est une incohérence côté Firebase, pas notre config) — le SDK initialise
// alors gtag avec `undefined` et tous les événements finissent avec
// `send_to: undefined` ("Cannot parse target"), sans jamais atteindre GA4.
// On appelle gtag directement avec l'ID qu'on sait correct, en contournant
// cette négociation serveur cassée.
const MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let ready: boolean | undefined;

function ensureGtag(): boolean {
  if (ready !== undefined) return ready;
  if (typeof window === 'undefined' || !MEASUREMENT_ID) {
    ready = false;
    return false;
  }
  try {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer!.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    ready = true;
  } catch (e) {
    logger.warn('[Telemetry] gtag indisponible:', e);
    ready = false;
  }
  return ready;
}

// Sert uniquement à répartir la consommation de quota Firestore (lectures/
// écritures) par origine dans Google Analytics, pour savoir où va le quota
// gratuit avant de décider quoi optimiser — jamais utilisé pour la logique de
// jeu elle-même. `count` porte le nombre réel de documents concernés par UN
// appel (ex: getTopLeaderboard peut lire jusqu'à 100 documents d'un coup) —
// sans lui, un tel appel compterait pour 1 lecture au lieu de 100 dans les stats.
export function logFirestoreOp(op: 'read' | 'write', source: string, count = 1) {
  if (typeof window === 'undefined' || count <= 0) return;
  try {
    if (!ensureGtag()) return;
    window.gtag!('event', op === 'read' ? 'firestore_read' : 'firestore_write', { source, count });
  } catch (e) {
    logger.warn('[Telemetry] logEvent failed:', e);
  }
}
