import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';

// ── Statut administrateur ────────────────────────────────────────────────
// Source de vérité : le champ `isAdmin` du document Firestore `users/{uid}`.
// Ce champ ne peut être posé que manuellement depuis la console Firebase —
// les règles de sécurité interdisent à un client de se l'attribuer lui-même.
// Ce check côté client ne sert qu'à l'affichage (masquer/afficher l'UI admin) ;
// la vraie protection contre les écritures non autorisées vit dans
// firestore.rules (fonction isAdmin()), pas ici.
export async function checkIsAdmin(uid: string | null | undefined): Promise<boolean> {
  if (!uid || !db) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() && snap.data().isAdmin === true;
  } catch (e) {
    console.error('[Admin] checkIsAdmin:', e);
    return false;
  }
}
