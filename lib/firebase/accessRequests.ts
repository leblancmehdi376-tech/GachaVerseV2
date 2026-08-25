import { doc, setDoc, getDoc, getDocs, collection, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '../logger';
import type { PlayerSaveSummary } from './adminTools';

export interface AccessRequest {
  uid:             string;
  email:           string;
  username:        string; // pseudo en jeu
  discordUsername: string;
  approved:        boolean;
  createdAt:       number;
}

/**
 * Fiche complète d'un joueur pour le panel admin : identité (comme
 * AccessRequest) + résumé de sa sauvegarde cloud (`save`), fusionnés par
 * `getAllUsers` SANS lecture Firestore supplémentaire — le doc `saves/{uid}`
 * est de toute façon déjà entièrement téléchargé pour construire la liste
 * (voir le commentaire dans getAllUsers). `save` est absent si le joueur n'a
 * jamais eu de sauvegarde cloud (compte validé mais jamais encore joué).
 */
export interface PlayerRow extends AccessRequest {
  save?: PlayerSaveSummary;
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
    logger.error('[Access] ensureUserDoc:', e);
  }
}

/** Construit le résumé de sauvegarde (même forme que celui utilisé par
 *  l'éditeur admin — voir adminTools.getPlayerSaveAndCollection) à partir des
 *  données brutes d'un doc `saves/{uid}` déjà en mémoire. */
function summarizePlayerSave(d: Record<string, unknown>): PlayerSaveSummary {
  return {
    pixelCoins:       (d.pixelCoins as number) ?? 0,
    nekoGems:         (d.nekoGems as number) ?? 0,
    totalGemsSpent:   (d.totalGemsSpent as number) ?? 0,
    totalGachaPulls:  (d.totalGachaPulls as number) ?? 0,
    bossCrowns:       (d.bossCrowns as number) ?? 0,
    palier:           (d.palier as number) ?? 1,
    wave:             (d.wave as number) ?? 1,
    maxPalierReached: (d.maxPalierReached as number) ?? 1,
    lastSaved:        (d.lastSaved as number) ?? null,
  };
}

/**
 * Liste TOUS les comptes existants, quel que soit leur statut de validation
 * ET même s'ils n'ont jamais de fiche dans "users" (comptes créés avant ce
 * système, ou connexions Google pas encore rattrapées par ensureUserDoc).
 * On fusionne donc "users" (email + pseudo + discord) avec "saves" (source
 * de vérité pour l'existence d'un compte, via son uid = id du document).
 * Le uid sert directement d'"id de save" affichable dans le panel admin.
 *
 * Le doc "saves" de CHAQUE joueur est déjà entièrement téléchargé ici (les
 * deux lectures de collection ci-dessous sont incompressibles pour obtenir
 * une liste complète) — on en profite donc pour garder aussi le résumé de
 * solde/progression (`save`) au lieu de ne garder que pseudo/lastSaved comme
 * avant. Ça donne un aperçu complet de l'état de chaque joueur dans le panel
 * admin SANS la moindre requête Firestore supplémentaire, et ça évite au
 * panel de devoir relire ce même doc quand l'admin veut juste consulter le
 * solde d'un joueur déjà dans la liste (voir PlayerEditor, qui ne relit plus
 * que la collection de personnages à l'ouverture d'une ligne).
 */
export async function getAllUsers(): Promise<PlayerRow[]> {
  if (!db) return [];
  try {
    const [usersSnap, savesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'saves')),
    ]);

    const saveDocsByUid = new Map<string, Record<string, unknown>>();
    for (const d of savesSnap.docs) saveDocsByUid.set(d.id, d.data());

    const byUid = new Map<string, PlayerRow>();
    for (const d of usersSnap.docs) {
      const u = d.data() as AccessRequest;
      const saveDoc = saveDocsByUid.get(d.id);
      byUid.set(d.id, { ...u, save: saveDoc ? summarizePlayerSave(saveDoc) : undefined });
    }
    // Complète avec les comptes qui n'ont une trace que dans "saves"
    // (jamais de fiche "users" créée) — email inconnu dans ce cas.
    for (const [uid, saveDoc] of saveDocsByUid) {
      if (byUid.has(uid)) continue;
      const username = saveDoc.username as string | undefined;
      byUid.set(uid, {
        uid,
        email: '(compte antérieur au système de fiches — email inconnu)',
        username: username || '(pseudo inconnu)',
        discordUsername: '',
        approved: true,
        createdAt: (saveDoc.lastSaved as number) ?? 0,
        save: summarizePlayerSave(saveDoc),
      });
    }

    return Array.from(byUid.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { logger.error('[Access] getAllUsers:', e); return []; }
}

/** Valide un compte en attente. */
export async function approveUser(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'users', uid), { approved: true, approvedAt: Date.now() });
    return true;
  } catch (e) { logger.error('[Access] approveUser:', e); return false; }
}
