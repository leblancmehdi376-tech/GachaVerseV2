/* Usage:
 * 1) Install deps: npm install --save-dev firebase-admin
 * 2) Set env var GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 * 3) Run: npm run create-admin -- <UID>
 *
 * The script will create a document at /admins/{UID} with role: 'owner'.
 */

const admin = require('firebase-admin');

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error('Usage: node scripts/create_admin.js <UID>');
    process.exit(1);
  }

  // Initialize Admin SDK. It will use GOOGLE_APPLICATION_CREDENTIALS env var.
  if (!admin.apps.length) {
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('Failed to initialize firebase-admin. Make sure GOOGLE_APPLICATION_CREDENTIALS is set to your service account JSON path.');
      console.error(e.message || e);
      process.exit(1);
    }
  }

  const db = admin.firestore();
  try {
    await db.collection('admins').doc(uid).set({ role: 'owner', createdAt: Date.now() });
    console.log('Created admins/' + uid);
  } catch (e) {
    console.error('Failed to create admin doc:', e);
    process.exit(1);
  }
}

main();
