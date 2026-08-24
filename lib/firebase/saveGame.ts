import { doc, setDoc, getDoc, getDocFromServer, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { GameState } from '@/types/game';
import { correctedNow } from './clockOffset';

export async function saveGameToFirestore(userId: string, state: Partial<GameState>) {
  if (!db) return;
  try {
    const ref = doc(db, 'saves', userId);
    await setDoc(ref, { ...state, lastSaved: correctedNow() }, { merge: true });
  } catch (e) {
    console.error('Save error:', e);
  }
}

// Lecture simple de la sauvegarde cloud — UN SEUL aller-retour (getDoc, pas
// getDocFromServer : tolère le cache si le réseau est capricieux), c'est la
// fonction la plus robuste possible pour déterminer si Firestore est joignable.
// Volontairement séparée de probeClockOffset() ci-dessous (qui elle a besoin
// d'un aller-retour serveur garanti) : combiner les deux dans un seul appel
// faisait dépendre TOUTE la synchro cloud (cloudSyncConfirmed) de la réussite
// simultanée des deux opérations dans un même budget de 5s — bien trop fragile.
//
// `reachable` distingue "round-trip Firestore réussi" de "il n'y avait rien à
// lire" : les deux cas renvoient `data: null`, mais seul le premier doit
// autoriser la synchro cloud (voir cloudSyncConfirmed dans useCloudSave.ts) —
// un simple compte tout neuf ne doit jamais être traité comme une panne réseau.
export async function loadGameFromFirestore(userId: string): Promise<{ data: Partial<GameState> | null; reachable: boolean }> {
  if (!db) return { data: null, reachable: false };
  try {
    const ref = doc(db, 'saves', userId);
    const snap = await Promise.race([
      getDoc(ref),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    return { data: snap.exists() ? (snap.data() as Partial<GameState>) : null, reachable: true };
  } catch (e) {
    console.warn('[CloudSave] Lecture cloud indisponible (quota, timeout ou réseau), repli sur le local:', e);
    return { data: null, reachable: false };
  }
}

// Mesure best-effort le décalage d'horloge avec Firestore (méthode NTP
// simplifiée) : écrit un `serverTimestamp()` sur le document du joueur (déjà
// autorisé en écriture, pas besoin d'un doc/règles séparés), le relit
// IMMÉDIATEMENT depuis le serveur — jamais le cache, sinon le round-trip
// mesuré serait faux — et corrige par la moitié de ce round-trip. NE DOIT
// JAMAIS bloquer quoi que ce soit : toute erreur retombe silencieusement sur
// un offset de 0 (= horloge locale brute, le comportement d'avant l'ajout de
// cette sonde). Ne détermine PAS `reachable` — voir loadGameFromFirestore.
// Renvoie `null` (et non 0) quand la sonde échoue ou n'a rien pu mesurer :
// 0 est une mesure valide (horloge locale déjà alignée), pas une valeur de
// repli. Voir setClockOffset côté appelant — un échec ne doit JAMAIS écraser
// un offset déjà appris lors d'un probe précédent de la même session par un
// 0 qui serait faux si l'horloge de cet appareil est réellement décalée.
export async function probeClockOffset(userId: string): Promise<number | null> {
  if (!db) return null;
  try {
    const ref = doc(db, 'saves', userId);
    // Nonce propre à cet appel : si un AUTRE onglet écrit sa propre sonde
    // entre notre setDoc et notre getDocFromServer, on relirait sa valeur à
    // lui plutôt que la nôtre, faussant le round-trip mesuré. Le nonce permet
    // de détecter ce cas (clockProbeId ne correspond plus) et de simplement
    // ignorer l'offset plutôt que de faire confiance à une mesure polluée.
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const t0 = Date.now();
    const snap = await Promise.race([
      (async () => {
        await setDoc(ref, { clockProbe: serverTimestamp(), clockProbeId: nonce }, { merge: true });
        return getDocFromServer(ref);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const t1 = Date.now();
    if (!snap.exists()) return null;

    const data = snap.data() as { clockProbe?: Timestamp; clockProbeId?: string };
    const probeMs = data.clockProbeId === nonce ? data.clockProbe?.toMillis?.() : undefined;
    if (!probeMs) return null;

    const roundTrip = t1 - t0;
    return probeMs + roundTrip / 2 - t1;
  } catch (e) {
    console.warn('[ClockOffset] Sonde indisponible, offset de session conservé:', e);
    return null;
  }
}
