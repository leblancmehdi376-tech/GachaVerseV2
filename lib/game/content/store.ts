// Brouillon et publication du configurateur (page admin).
//
// En ligne : brouillon dans `content/draft`, version publiée dans
// `content/live` (lue par tous les joueurs au démarrage), et chaque version
// publiée archivée dans `contentHistory/{version}`.
//
// Mode local (Firebase désactivé, sur localhost) : tout reste dans ce
// navigateur. « Publier » écrit la version que le loader lit déjà en repli
// (voir loader.ts), donc le jeu local l'utilise au prochain chargement.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { parseContent, emptyContent, type ContentOverrides } from './schema';

const LOCAL_DRAFT_KEY = 'gv-content-draft-v1';
const LOCAL_LIVE_KEY = 'gv-content-live-v1'; // même clé que loader.ts

export function isLocalContentMode(): boolean {
  if (db || typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h.startsWith('127.');
}

function readLocal(key: string): ContentOverrides | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseContent(JSON.parse(raw)).content : null;
  } catch { return null; }
}

async function readRemote(id: 'draft' | 'live'): Promise<ContentOverrides | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'content', id));
  return snap.exists() ? parseContent(snap.data()).content : null;
}

/** Version publiée et brouillon (repart de la version publiée s'il n'y a pas de brouillon). */
export async function loadContentForEditing(): Promise<{ live: ContentOverrides | null; draft: ContentOverrides }> {
  const live = isLocalContentMode() ? readLocal(LOCAL_LIVE_KEY) : await readRemote('live');
  const draft = isLocalContentMode() ? readLocal(LOCAL_DRAFT_KEY) : await readRemote('draft');
  return { live, draft: draft ?? structuredClone(live ?? emptyContent()) };
}

export async function saveDraft(draft: ContentOverrides): Promise<void> {
  if (isLocalContentMode()) { localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft)); return; }
  if (!db) throw new Error('Firebase indisponible');
  await setDoc(doc(db, 'content', 'draft'), draft);
}

/** Publie le brouillon : nouvelle version, archivée. Renvoie la version publiée. */
export async function publishContent(draft: ContentOverrides, liveVersion: number): Promise<ContentOverrides> {
  const published: ContentOverrides = { ...structuredClone(draft), version: liveVersion + 1, publishedAt: Date.now() };
  if (isLocalContentMode()) {
    localStorage.setItem(LOCAL_LIVE_KEY, JSON.stringify(published));
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(published));
    return published;
  }
  if (!db) throw new Error('Firebase indisponible');
  await setDoc(doc(db, 'contentHistory', String(published.version)), published);
  await setDoc(doc(db, 'content', 'live'), published);
  await setDoc(doc(db, 'content', 'draft'), published);
  return published;
}
