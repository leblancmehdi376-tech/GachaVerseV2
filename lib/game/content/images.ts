// Images du configurateur, stockées dans Firestore (pas de Firebase Storage
// sur ce projet) : une image = un document `contentImages/{id}` contenant le
// .webp en base64. L'id est une empreinte du contenu, donc une image ne change
// jamais : chaque joueur la télécharge UNE fois, puis elle est gardée dans le
// cache du navigateur (Cache Storage).
//
// Avant le démarrage du jeu, ContentGate prépare toutes les images du contenu
// en ligne (prepareContentImages) ; le rendu les lit ensuite de façon
// synchrone (resolveContentImage). Aucune donnée de jeu importée ici.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { CONTENT_IMAGE_PREFIX, isContentImageRef } from './schema';

const CACHE_NAME = 'gv-content-images-v1';
const cacheKey = (id: string) => `/__content-img/${id}`;
// Une image doit tenir dans un document Firestore (1 Mo, base64 compris).
export const MAX_IMAGE_BASE64 = 900_000;

const objectUrls = new Map<string, string>();

const idOf = (ref: string) => ref.slice(CONTENT_IMAGE_PREFIX.length);

/** URL affichable d'une image du configurateur, ou null si elle n'est pas (encore) chargée. */
export function resolveContentImage(ref: string): string | null {
  return objectUrls.get(ref) ?? null;
}

async function openCache(): Promise<Cache | null> {
  try { return typeof caches !== 'undefined' ? await caches.open(CACHE_NAME) : null; } catch { return null; }
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

function register(ref: string, blob: Blob) {
  if (!objectUrls.has(ref)) objectUrls.set(ref, URL.createObjectURL(blob));
}

async function loadOne(ref: string, cache: Cache | null): Promise<void> {
  if (objectUrls.has(ref)) return;
  const id = idOf(ref);
  const cached = await cache?.match(cacheKey(id)).catch(() => undefined);
  if (cached) { register(ref, await cached.blob()); return; }
  if (!db) return;
  const snap = await getDoc(doc(db, 'contentImages', id));
  const data = snap.exists() ? snap.data() : null;
  if (!data || typeof data.data !== 'string') return;
  const blob = base64ToBlob(data.data, typeof data.mime === 'string' ? data.mime : 'image/webp');
  register(ref, blob);
  await cache?.put(cacheKey(id), new Response(blob, { headers: { 'Content-Type': blob.type } })).catch(() => {});
}

/** Charge (cache du navigateur, sinon Firestore) les images données, 6 à la fois. */
export async function prepareContentImages(refs: string[]): Promise<void> {
  const todo = refs.filter(r => isContentImageRef(r) && !objectUrls.has(r));
  if (todo.length === 0) return;
  const cache = await openCache();
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const ref = todo[next++];
      try { await loadOne(ref, cache); } catch { /* image manquante : le jeu affichera son repli */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, todo.length) }, worker));
}

// ── Envoi (configurateur) ───────────────────────────────────────────────────

async function sha256Hex(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function toWebp(file: Blob, maxW: number, maxH: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', quality));
  if (!blob) throw new Error('Conversion en .webp impossible');
  return blob;
}

/**
 * Convertit l'image en .webp (redimensionnée à maxW × maxH, qualité réduite si
 * besoin pour tenir dans un document), l'enregistre dans Firestore si elle n'y
 * est pas déjà, et renvoie sa référence content-img.
 */
export async function uploadContentImage(file: Blob, maxW: number, maxH: number): Promise<string> {
  if (!db) throw new Error('Firebase indisponible');
  let blob: Blob | null = null;
  let b64 = '';
  for (const q of [0.88, 0.78, 0.66, 0.52, 0.4]) {
    blob = await toWebp(file, maxW, maxH, q);
    b64 = await blobToBase64(blob);
    if (b64.length <= MAX_IMAGE_BASE64) break;
  }
  if (!blob || b64.length > MAX_IMAGE_BASE64) throw new Error('Image trop lourde, même compressée : réduis-la avant de l’envoyer.');
  const id = await sha256Hex(blob);
  const ref = `${CONTENT_IMAGE_PREFIX}${id}`;
  const target = doc(db, 'contentImages', id);
  if (!(await getDoc(target)).exists()) {
    await setDoc(target, { data: b64, mime: 'image/webp', bytes: blob.size, createdAt: Date.now() });
  }
  register(ref, blob);
  const cache = await openCache();
  await cache?.put(cacheKey(id), new Response(blob, { headers: { 'Content-Type': 'image/webp' } })).catch(() => {});
  return ref;
}
