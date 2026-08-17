'use client';
import { useEffect, useRef, useState } from 'react';

// Extensions essayées dans l'ordre quand un visuel ne charge pas — utile
// quand un fichier a été renommé en .png mais reste en réalité un .webp/.jpg
// (changer juste l'extension dans l'explorateur ne convertit pas le fichier).
export const IMAGE_FALLBACK_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const;

// À partir d'un chemin de base SANS extension (ex: "/sprites/enemies/palier2/gaara"),
// génère la liste ordonnée de candidats à essayer.
export function buildImageCandidates(basePathNoExt: string): string[] {
  return IMAGE_FALLBACK_EXTENSIONS.map(ext => `${basePathNoExt}.${ext}`);
}

// Retire une extension connue d'un chemin existant pour en faire une base réutilisable.
export function stripKnownExtension(path: string): string {
  return path.replace(/\.(png|webp|jpe?g|gif|svg)$/i, '');
}

interface UseFallbackImageResult {
  src: string | null;   // candidat actuellement tenté, ou null si tous ont échoué
  failed: boolean;      // true quand plus aucun candidat ne fonctionne
  onError: () => void;  // à brancher sur <img onError={...}>
}

// Mémorise, pour chaque liste de candidats déjà rencontrée, l'index par
// lequel repartir directement (le premier qui a marché, ou candidates.length
// si aucun n'existe) — SANS ce cache partagé (persisté en localStorage), un
// visuel manquant (ex: art d'évolution jamais dessiné) redemandait TOUTES ses
// extensions au serveur à chaque montage du composant (changement de page,
// carte affichée dans une autre liste, etc.), en boucle, pour un résultat
// toujours identique. Un seul cache pour toute la session (et au-delà, via
// localStorage) suffit : ce qui est absent aujourd'hui ne réapparaît pas
// tant qu'un vrai déploiement n'ajoute pas le fichier.
const RESOLUTION_CACHE_KEY = 'gachaverse_image_fallback_cache_v1';
const resolutionCache = new Map<string, number>();
let cacheLoaded = false;

function loadCacheFromStorage() {
  if (cacheLoaded || typeof window === 'undefined') return;
  cacheLoaded = true;
  try {
    const raw = localStorage.getItem(RESOLUTION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number>;
    for (const [k, v] of Object.entries(parsed)) resolutionCache.set(k, v);
  } catch {}
}

function persistCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RESOLUTION_CACHE_KEY, JSON.stringify(Object.fromEntries(resolutionCache)));
  } catch {}
}

// Essaie chaque URL de `candidates` dans l'ordre jusqu'à ce qu'une charge.
// Se réinitialise automatiquement si la liste de candidats change (ex: changement de perso).
export function useFallbackImage(candidates: string[]): UseFallbackImageResult {
  loadCacheFromStorage();
  const key = candidates.join('|');
  const [index, setIndex] = useState(() => resolutionCache.get(key) ?? 0);
  const prevKeyRef = useRef(key);

  useEffect(() => {
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      setIndex(resolutionCache.get(key) ?? 0);
    }
  }, [key]);

  const failed = index >= candidates.length;
  return {
    src: failed ? null : candidates[index],
    failed,
    onError: () => setIndex(i => {
      const next = i + 1;
      resolutionCache.set(key, next);
      persistCache();
      return next;
    }),
  };
}
