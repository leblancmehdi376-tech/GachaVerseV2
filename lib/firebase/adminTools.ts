import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './config';
import { getCharacterById } from '@/lib/game/characters';
import { makeInstanceKey, CardEdition } from '@/lib/game/editions';

export interface PlayerLookup {
  uid: string;
  email: string;
  username: string;
}

export interface PlayerSaveSummary {
  pixelCoins: number;
  nekoGems: number;
  totalGemsSpent: number;
  totalGachaPulls: number;
  bossCrowns: number;
  palier: number;
  wave: number;
  maxPalierReached: number;
  lastSaved: number | null;
}

// Résumé léger d'un personnage possédé, pour l'affichage dans l'outil admin.
export interface OwnedCharacterSummary {
  instanceKey: string;
  templateId: string;
  name: string;      // nom lisible, résolu via CHARACTER_POOL
  edition: string;
  level: number;
  rank: number;
}

/**
 * Cherche un joueur par pseudo OU email exact (collection "users"). Si rien
 * n'est trouvé, tente de traiter la saisie comme un UID Firebase directement
 * (utile pour les comptes créés AVANT le système de validation d'inscription,
 * qui n'ont jamais eu de fiche dans "users" — seule leur sauvegarde existe).
 */
export async function findPlayer(search: string): Promise<PlayerLookup | null> {
  if (!db) return null;
  const trimmed = search.trim();
  if (!trimmed) return null;
  try {
    // Essai par email exact
    const byEmail = await getDocs(query(collection(db, 'users'), where('email', '==', trimmed), limit(1)));
    if (!byEmail.empty) {
      const d = byEmail.docs[0].data();
      return { uid: d.uid, email: d.email, username: d.username };
    }
    // Essai par pseudo exact (sensible à la casse telle que saisie à l'inscription)
    const byUsername = await getDocs(query(collection(db, 'users'), where('username', '==', trimmed), limit(1)));
    if (!byUsername.empty) {
      const d = byUsername.docs[0].data();
      return { uid: d.uid, email: d.email, username: d.username };
    }
    // Repli : la saisie est peut-être directement un UID (compte antérieur
    // au système de validation, donc absent de "users") — on vérifie si une
    // sauvegarde existe sous cet UID.
    const saveSnap = await getDoc(doc(db, 'saves', trimmed));
    if (saveSnap.exists()) {
      return { uid: trimmed, email: '(compte antérieur au système de validation — email inconnu)', username: '(inconnu)' };
    }
    return null;
  } catch (e) {
    console.error('[AdminTools] findPlayer:', e);
    return null;
  }
}

/** Lit le résumé de la sauvegarde cloud d'un joueur (uniquement les champs pertinents pour la modération). */
export async function getPlayerSave(uid: string): Promise<PlayerSaveSummary | null> {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      pixelCoins:       d.pixelCoins ?? 0,
      nekoGems:         d.nekoGems ?? 0,
      totalGemsSpent:   d.totalGemsSpent ?? 0,
      totalGachaPulls:  d.totalGachaPulls ?? 0,
      bossCrowns:       d.bossCrowns ?? 0,
      palier:           d.palier ?? 1,
      wave:             d.wave ?? 1,
      maxPalierReached: d.maxPalierReached ?? 1,
      lastSaved:        d.lastSaved ?? null,
    };
  } catch (e) {
    console.error('[AdminTools] getPlayerSave:', e);
    return null;
  }
}

/**
 * Corrige le solde d'un joueur sur sa sauvegarde CLOUD, et met à jour
 * lastSaved à MAINTENANT — indispensable pour que la correction ne soit pas
 * écrasée par l'ancienne sauvegarde locale (localStorage) du joueur à sa
 * prochaine connexion (le jeu charge toujours la version la plus récente).
 *
 * `adminCorrectionAt` est un signal séparé écouté EN DIRECT par le client du
 * joueur (voir useCloudSave.ts) : si le joueur est déjà connecté et en train
 * de jouer au moment de la correction, son propre autosave (toutes les 30s
 * en local / 10min sur Firebase) écraserait sinon la correction avant même
 * qu'il ne se reconnecte. Ce signal permet d'appliquer la correction tout de
 * suite dans son état de jeu en cours, sans attendre un rechargement.
 */
export async function correctPlayerBalance(
  uid: string,
  updates: { pixelCoins?: number; nekoGems?: number; bossCrowns?: number }
): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid), {
      ...updates,
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    });
    return true;
  } catch (e) {
    console.error('[AdminTools] correctPlayerBalance:', e);
    return false;
  }
}

/**
 * Corrige la progression d'un joueur (palier, vague, palier max atteint) —
 * utile pour annuler une avancée obtenue via un bug/exploit. Même mécanisme
 * `adminCorrectionAt` que correctPlayerBalance : appliqué en direct si le
 * joueur est déjà connecté, sans attendre qu'il se reconnecte.
 */
export async function correctPlayerProgress(
  uid: string,
  updates: { palier?: number; wave?: number; maxPalierReached?: number }
): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid), {
      ...updates,
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    });
    return true;
  } catch (e) {
    console.error('[AdminTools] correctPlayerProgress:', e);
    return false;
  }
}

// ── Gestion de la collection de personnages ────────────────────────────────

/** Liste tous les personnages possédés par le joueur, avec un nom lisible. */
export async function getPlayerCollection(uid: string): Promise<OwnedCharacterSummary[]> {
  if (!db) return [];
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return [];
    const raw = (snap.data().collection ?? {}) as Record<string, { templateId: string; edition?: string; level: number; rank: number }>;
    return Object.entries(raw).map(([instanceKey, c]) => ({
      instanceKey,
      templateId: c.templateId,
      name: getCharacterById(c.templateId)?.name ?? c.templateId,
      edition: c.edition ?? 'base',
      level: c.level ?? 1,
      rank: c.rank ?? 1,
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error('[AdminTools] getPlayerCollection:', e);
    return [];
  }
}

/** Retire un personnage (une édition précise) de la collection d'un joueur. */
export async function removePlayerCharacter(uid: string, instanceKey: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return false;
    const collectionData = { ...(snap.data().collection ?? {}) };
    delete collectionData[instanceKey];
    // adminCorrectionAt : même mécanisme que pour le solde — permet au client
    // du joueur (s'il est en ligne) d'appliquer le changement en direct au
    // lieu de le laisser écraser par son propre autosave (voir useCloudSave.ts).
    await updateDoc(doc(db, 'saves', uid), { collection: collectionData, lastSaved: Date.now(), adminCorrectionAt: Date.now() });
    return true;
  } catch (e) {
    console.error('[AdminTools] removePlayerCharacter:', e);
    return false;
  }
}

/**
 * Ajoute (ou remplace si déjà possédé) un personnage à la collection d'un
 * joueur, avec le niveau/rang donnés. Le templateId est vérifié contre la
 * vraie liste des personnages du jeu pour éviter de créer une entrée invalide.
 */
export async function addPlayerCharacter(
  uid: string, templateId: string, edition: CardEdition, level: number, rank: number
): Promise<{ ok: boolean; error?: string }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const tpl = getCharacterById(templateId);
  if (!tpl) return { ok: false, error: `Personnage "${templateId}" introuvable — vérifie l'id exact` };
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return { ok: false, error: 'Sauvegarde introuvable pour ce joueur' };
    const instanceKey = makeInstanceKey(templateId, edition);
    const collectionData = { ...(snap.data().collection ?? {}) };
    const existing = collectionData[instanceKey];
    collectionData[instanceKey] = {
      templateId,
      edition,
      level: Math.max(1, Math.min(999, Math.floor(level))),
      rank: Math.max(1, Math.min(7, Math.floor(rank))),
      copies: existing?.copies ?? 1,
      currentForm: existing?.currentForm ?? 0,
      xp: existing?.xp ?? 0,
      ...(existing?.equippedItems ? { equippedItems: existing.equippedItems } : {}),
    };
    await updateDoc(doc(db, 'saves', uid), { collection: collectionData, lastSaved: Date.now(), adminCorrectionAt: Date.now() });
    return { ok: true };
  } catch (e) {
    console.error('[AdminTools] addPlayerCharacter:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}

/** Change juste le niveau d'un personnage déjà possédé (sans toucher au reste). */
export async function setPlayerCharacterLevel(uid: string, instanceKey: string, newLevel: number): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return false;
    const collectionData = { ...(snap.data().collection ?? {}) };
    if (!collectionData[instanceKey]) return false;
    collectionData[instanceKey] = { ...collectionData[instanceKey], level: Math.max(1, Math.min(999, Math.floor(newLevel))) };
    await updateDoc(doc(db, 'saves', uid), { collection: collectionData, lastSaved: Date.now(), adminCorrectionAt: Date.now() });
    return true;
  } catch (e) {
    console.error('[AdminTools] setPlayerCharacterLevel:', e);
    return false;
  }
}