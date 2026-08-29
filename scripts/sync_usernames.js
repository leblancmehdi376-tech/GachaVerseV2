/* Usage:
 *   node scripts/sync_usernames.js            (dry-run : liste ce qui serait changé, n'écrit rien)
 *   node scripts/sync_usernames.js --apply    (applique réellement les corrections)
 *
 * Rattrapage PONCTUEL pour les comptes renommés AVANT le correctif qui fait
 * écrire updatePlayerScore() dans users/{uid} ET saves/{uid} en même temps
 * (voir lib/firebase/leaderboard.ts) : ce script aligne une bonne fois pour
 * toutes users/{uid}.username (source de vérité, lue par le panel admin) sur
 * saves/{uid}.username (le pseudo réellement affiché en jeu/classement/
 * marché), pour tous les comptes où ils ont divergé. Après ce rattrapage,
 * chaque nouveau renommage reste synchronisé automatiquement — inutile de
 * relancer ce script, sauf si des comptes plus anciens que ce correctif
 * réapparaissent (ex: restauration d'une sauvegarde Firestore).
 *
 * Nécessite serviceAccount.json à la racine du repo (voir
 * scripts/create_admin_by_email.js, même mécanisme d'authentification).
 */

const admin = require('firebase-admin');

function normalizeUsername(raw) {
  // Même normalisation que updatePlayerScore (lib/firebase/leaderboard.ts) —
  // pour ne jamais signaler un "mismatch" qui ne serait dû qu'à un espace ou
  // une troncature que le jeu aurait de toute façon appliqués au prochain
  // renommage.
  return typeof raw === 'string' ? raw.trim().slice(0, 20) : '';
}

async function main() {
  const apply = process.argv.includes('--apply');

  if (!admin.apps.length) {
    try {
      const serviceAccount = require('../serviceAccount.json');
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
      console.error('Failed to initialize firebase-admin:', e.message || e);
      process.exit(1);
    }
  }

  const db = admin.firestore();

  const [usersSnap, savesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('saves').get(),
  ]);

  const usersByUid = new Map(usersSnap.docs.map(d => [d.id, d.data()]));

  const mismatches = [];
  for (const saveDoc of savesSnap.docs) {
    const uid = saveDoc.id;
    const userData = usersByUid.get(uid);
    // Pas de fiche users/{uid} : hors périmètre de ce script — ces comptes
    // (antérieurs au système de fiches) sont déjà gérés séparément par
    // getAllUsers() côté app (lib/firebase/accessRequests.ts), rien à
    // synchroniser ici puisqu'il n'y a pas de document cible.
    if (!userData) continue;

    const saveUsername = normalizeUsername(saveDoc.data().username);
    const userUsername = normalizeUsername(userData.username);
    if (!saveUsername || saveUsername === userUsername) continue;

    mismatches.push({ uid, from: userUsername || '(vide)', to: saveUsername });
  }

  if (mismatches.length === 0) {
    console.log('Rien à corriger — tous les pseudos users/{uid} sont déjà alignés sur saves/{uid}.');
    return;
  }

  console.log(`${mismatches.length} compte(s) désynchronisé(s) :`);
  for (const m of mismatches) console.log(`  ${m.uid} : "${m.from}" -> "${m.to}"`);

  if (!apply) {
    console.log('\nDry-run — rien n\'a été écrit. Relance avec --apply pour appliquer ces changements.');
    return;
  }

  // Écritures groupées par lots de 500 (limite d'un batch Firestore).
  const BATCH_SIZE = 500;
  for (let i = 0; i < mismatches.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const m of mismatches.slice(i, i + BATCH_SIZE)) {
      batch.update(db.collection('users').doc(m.uid), { username: m.to });
    }
    await batch.commit();
  }
  console.log(`\n${mismatches.length} compte(s) corrigé(s).`);
}

main();
