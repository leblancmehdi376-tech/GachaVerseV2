// Lecture du contenu en ligne publié (`content/live`) au démarrage : une seule
// lecture Firestore par lancement. La dernière version reçue est gardée dans
// le navigateur : si Firestore ne répond pas à temps (hors ligne, lenteur),
// le jeu démarre avec elle plutôt que d'attendre ou de perdre le contenu.
// Aucune donnée de jeu importée ici.
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { parseContent, type ContentOverrides } from './schema';

const LOCAL_KEY = 'gv-content-live-v1';
export const CONTENT_LOAD_TIMEOUT_MS = 3500;

function readLocal(): ContentOverrides | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? parseContent(JSON.parse(raw)).content : null;
  } catch { return null; }
}

function writeLocal(raw: unknown) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(raw)); } catch { /* stockage plein ou bloqué */ }
}

export async function loadLiveContent(timeoutMs = CONTENT_LOAD_TIMEOUT_MS): Promise<ContentOverrides | null> {
  const local = readLocal();
  if (!db) return local;
  try {
    const snap = await Promise.race([
      getDoc(doc(db, 'content', 'live')),
      new Promise<null>(res => setTimeout(() => res(null), timeoutMs)),
    ]);
    if (!snap) return local;               // délai dépassé : dernière version connue
    if (!snap.exists()) { writeLocal(null); return null; } // rien de publié
    const raw = snap.data();
    const { content, errors } = parseContent(raw);
    if (errors.length) console.warn('[Contenu]', errors);
    if (content) writeLocal(raw);
    return content ?? local;
  } catch (e) {
    console.warn('[Contenu] lecture impossible, version locale utilisée', e);
    return local;
  }
}
