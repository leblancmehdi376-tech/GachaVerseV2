import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from './config';

export interface AccessRequest {
  uid:             string;
  email:           string;
  username:        string; // pseudo en jeu
  discordUsername: string;
  approved:        boolean;
  createdAt:       number;
}

/** Crée la fiche utilisateur juste après la création du compte Firebase Auth.
 *  Le compte est immédiatement validé : il n'y a plus de demande d'accès à
 *  approuver manuellement, l'inscription donne un accès direct au jeu. */
export async function createAccessRequest(
  uid: string, email: string, username: string, discordUsername: string
): Promise<void> {
  if (!db) return;
  await setDoc(doc(db, 'users', uid), {
    uid, email, username, discordUsername,
    approved: true,
    createdAt: Date.now(),
  });
}

/**
 * S'assure qu'une fiche existe dans "users" pour ce compte — sans l'écraser
 * si elle existe déjà. Nécessaire pour la connexion Google (et tout autre
 * flux qui ne passe pas par signUp/createAccessRequest) : sans ça, ces
 * comptes n'ont jamais de fiche et n'apparaissent jamais dans le panel admin
 * ("Tous les comptes"). Appelée à chaque connexion, elle rattrape aussi les
 * comptes existants qui n'auraient pas encore de fiche.
 */
export async function ensureUserDoc(
  uid: string, email: string, username: string
): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);

    const resolveUsername = async (fallback: string): Promise<string> => {
      let resolved = fallback.trim();
      if (!resolved) {
        try {
          const saveSnap = await getDoc(doc(db!, 'saves', uid));
          const saveUsername = saveSnap.exists() ? (saveSnap.data().username as string | undefined) : undefined;
          if (saveUsername && saveUsername.trim()) resolved = saveUsername.trim();
        } catch { /* ignore, on retombe sur les valeurs par défaut ci-dessous */ }
      }
      if (!resolved) resolved = email ? email.split('@')[0] : '(pseudo inconnu)';
      return resolved;
    };

    if (snap.exists()) {
      // Répare les fiches déjà créées avec un pseudo manquant/placeholder
      // (ex: comptes email/mdp rattrapés avant ce correctif, qui n'avaient
      // pas encore accès au pseudo stocké dans la sauvegarde de jeu).
      const current = snap.data().username as string | undefined;
      if (!current || !current.trim() || current === '(pseudo inconnu)') {
        const fixed = await resolveUsername(username);
        if (fixed !== '(pseudo inconnu)') await updateDoc(ref, { username: fixed });
      }
      return;
    }

    // Firebase Auth ne fournit jamais de displayName pour les comptes
    // email/mot de passe (seulement pour Google) : `username` arrive donc
    // vide ici pour la plupart des anciens comptes. Le vrai pseudo choisi
    // par le joueur existe déjà dans sa sauvegarde de jeu (saves/{uid}) —
    // on va le chercher là avant de se rabattre sur l'email ou "inconnu".
    const resolvedUsername = await resolveUsername(username);

    await setDoc(ref, {
      uid,
      email: email || '',
      username: resolvedUsername,
      discordUsername: '',
      approved: true,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error('[Access] ensureUserDoc:', e);
  }
}

/** Liste toutes les demandes en attente (page d'admin). */
export async function getPendingRequests(): Promise<AccessRequest[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('approved', '==', false)));
    return snap.docs.map(d => d.data() as AccessRequest).sort((a, b) => a.createdAt - b.createdAt);
  } catch (e) { console.error('[Access] getPendingRequests:', e); return []; }
}

/** Liste tous les comptes déjà validés (pour information dans la page d'admin). */
export async function getApprovedUsers(): Promise<AccessRequest[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('approved', '==', true)));
    return snap.docs.map(d => d.data() as AccessRequest).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { console.error('[Access] getApprovedUsers:', e); return []; }
}

/**
 * Liste TOUS les comptes existants, quel que soit leur statut de validation
 * ET même s'ils n'ont jamais de fiche dans "users" (comptes créés avant ce
 * système, ou connexions Google pas encore rattrapées par ensureUserDoc).
 * On fusionne donc "users" (email + pseudo + discord) avec "saves" (source
 * de vérité pour l'existence d'un compte, via son uid = id du document).
 * Le uid sert directement d'"id de save" affichable dans le panel admin.
 */
export async function getAllUsers(): Promise<AccessRequest[]> {
  if (!db) return [];
  try {
    const [usersSnap, savesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'saves')),
    ]);

    const byUid = new Map<string, AccessRequest>();
    for (const d of usersSnap.docs) {
      byUid.set(d.id, d.data() as AccessRequest);
    }
    // Complète avec les comptes qui n'ont une trace que dans "saves"
    // (jamais de fiche "users" créée) — email inconnu dans ce cas.
    for (const d of savesSnap.docs) {
      if (byUid.has(d.id)) continue;
      const save = d.data() as { username?: string; lastSaved?: number };
      byUid.set(d.id, {
        uid: d.id,
        email: '(compte antérieur au système de fiches — email inconnu)',
        username: save.username || '(pseudo inconnu)',
        discordUsername: '',
        approved: true,
        createdAt: save.lastSaved ?? 0,
      });
    }

    return Array.from(byUid.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { console.error('[Access] getAllUsers:', e); return []; }
}

/** Valide un compte en attente. */
export async function approveUser(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'users', uid), { approved: true, approvedAt: Date.now() });
    return true;
  } catch (e) { console.error('[Access] approveUser:', e); return false; }
}