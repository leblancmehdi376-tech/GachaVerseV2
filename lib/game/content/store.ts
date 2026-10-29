// Brouillon et publication du configurateur (page admin).
//
// En ligne : brouillon dans `content/draft`, version publiée dans
// `content/live` (lue par tous les joueurs au démarrage), et chaque version
// publiée archivée dans `contentHistory/{version}`.
//
// Mode local (Firebase désactivé, sur localhost) : tout reste dans ce
// navigateur. « Publier » écrit la version que le loader lit déjà en repli
// (voir loader.ts), donc le jeu local l'utilise au prochain chargement.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { parseContent, emptyContent, type ContentOverrides } from './schema';

const LOCAL_DRAFT_KEY = 'gv-content-draft-v1';
const LOCAL_LIVE_KEY = 'gv-content-live-v1'; // même clé que loader.ts
const LOCAL_HISTORY_KEY = 'gv-content-history-v1';
const HISTORY_LIMIT = 20;

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
    const history = [published, ...readLocalHistory()].slice(0, HISTORY_LIMIT);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
    return published;
  }
  if (!db) throw new Error('Firebase indisponible');
  await setDoc(doc(db, 'contentHistory', String(published.version)), published);
  await setDoc(doc(db, 'content', 'live'), published);
  await setDoc(doc(db, 'content', 'draft'), published);
  return published;
}

function readLocalHistory(): ContentOverrides[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(x => parseContent(x).content).filter((x): x is ContentOverrides => !!x) : [];
  } catch { return []; }
}

/** Dernières versions publiées, de la plus récente à la plus ancienne. */
export async function listHistory(): Promise<ContentOverrides[]> {
  if (isLocalContentMode()) return readLocalHistory();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, 'contentHistory'), orderBy('version', 'desc'), limit(HISTORY_LIMIT)));
  return snap.docs.map(d => parseContent(d.data()).content).filter((x): x is ContentOverrides => !!x);
}

/**
 * Annule une publication : republie le contenu d'une ancienne version sous un
 * NOUVEAU numéro (l'historique n'est jamais réécrit, et les joueurs voient
 * bien un changement de version).
 */
export function restoreVersion(old: ContentOverrides, liveVersion: number): Promise<ContentOverrides> {
  return publishContent(old, liveVersion);
}

/** Résumé court d'un contenu : « 2 paliers · 10 ennemis · 3 persos · 1 bannière ». */
export function summarizeContent(c: ContentOverrides): string {
  const n = (count: number, one: string, many: string) => (count ? `${count} ${count > 1 ? many : one}` : '');
  const enemies = Object.values(c.enemies).reduce((s, l) => s + l.length, 0);
  return [
    n(Object.keys(c.paliers).length, 'palier', 'paliers'), n(enemies, 'ennemi', 'ennemis'),
    n(Object.keys(c.characters).length, 'perso', 'persos'), n(Object.keys(c.banners).length, 'bannière', 'bannières'),
  ].filter(Boolean).join(' · ') || 'aucune modification (contenu du code)';
}
