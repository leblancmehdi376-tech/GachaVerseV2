import { doc, setDoc, getDocFromServer, serverTimestamp, Timestamp } from 'firebase/firestore';
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

// Charge la sauvegarde cloud ET mesure au passage le décalage d'horloge avec
// Firestore (méthode NTP simplifiée) : on écrit un `serverTimestamp()` sur le
// document du joueur (déjà autorisé en écriture, pas besoin d'un doc/règles
// séparés), on le relit IMMÉDIATEMENT depuis le serveur — jamais le cache,
// sinon le round-trip mesuré serait faux — et on corrige par la moitié de ce
// round-trip pour estimer l'heure serveur au moment de la réponse. Ce même
// appel sert aussi de lecture "remote" (le snapshot relu contient déjà toute
// la sauvegarde) : pas de round-trip Firestore supplémentaire par rapport à
// l'ancien loadGameFromFirestore.
//
// `reachable` distingue "round-trip Firestore réussi" de "il n'y avait rien à
// lire" : les deux cas renvoient `data: null`, mais seul le premier doit
// autoriser la synchro cloud (voir cloudSyncConfirmed dans useCloudSave.ts) —
// un simple compte tout neuf ne doit jamais être traité comme une panne réseau.
export async function loadGameAndClockOffsetFromFirestore(userId: string): Promise<{ data: Partial<GameState> | null; offsetMs: number; reachable: boolean }> {
  if (!db) return { data: null, offsetMs: 0, reachable: false };
  try {
    const ref = doc(db, 'saves', userId);
    // Nonce propre à cet appel : si un AUTRE onglet écrit sa propre sonde
    // entre notre setDoc et notre getDocFromServer, on relirait sa valeur à
    // lui plutôt que la nôtre, faussant le round-trip mesuré. Le nonce permet
    // de détecter ce cas (clockProbeId ne correspond plus) et de simplement
    // ignorer l'offset plutôt que de faire confiance à une mesure polluée.
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const t0 = Date.now();
    const probe = Promise.race([
      (async () => {
        await setDoc(ref, { clockProbe: serverTimestamp(), clockProbeId: nonce }, { merge: true });
        return getDocFromServer(ref);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const snap = await probe;
    const t1 = Date.now();
    if (!snap.exists()) return { data: null, offsetMs: 0, reachable: true }; // round-trip OK, doc vide

    const data = snap.data() as Partial<GameState> & { clockProbe?: Timestamp; clockProbeId?: string };
    const probeMs = data.clockProbeId === nonce ? data.clockProbe?.toMillis?.() : undefined;
    const offsetMs = probeMs ? probeMs + (t1 - t0) / 2 - t1 : 0;
    delete data.clockProbe; // champs techniques de la sonde, ne doivent pas polluer le state du jeu
    delete data.clockProbeId;

    // Tout premier login : le merge ci-dessus vient de CRÉER le doc rien que
    // pour la sonde — une fois les champs de sonde retirés, il ne reste plus
    // aucune vraie donnée de sauvegarde. On renvoie null plutôt qu'un objet
    // vide, pour que loadAndApply le traite exactement comme "pas de save cloud"
    // (mais reachable:true — Firestore a bien répondu, ce n'est pas une panne).
    if (Object.keys(data).length === 0) return { data: null, offsetMs, reachable: true };

    return { data, offsetMs, reachable: true };
  } catch (e) {
    console.warn('[ClockOffset] Sonde/chargement cloud indisponible (quota, timeout ou réseau), repli sur le local:', e);
    return { data: null, offsetMs: 0, reachable: false };
  }
}
