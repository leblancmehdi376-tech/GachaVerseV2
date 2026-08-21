import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  palier: number;
  wave: number;
  totalClicks: number;
  pixelCoins: number;
  score: number;
  totalDps: number;
}

export async function getTopLeaderboard(maxEntries = 50): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  try {
    // Récupère un lot de documents et trie côté client — évite les problèmes
    // d'index manquant ou de champs absents dans les vieilles sauvegardes.
    // Limité à 100 (au lieu de 200) : chaque appel facture 1 lecture Firestore
    // par document, et cette fonction est ré-appelée toutes les 30-90s tant
    // que la page Classement reste ouverte — un fetch trop large ici épuise
    // le quota gratuit très vite.
    const snapshot = await getDocs(query(collection(db, 'saves'), limit(100)));
    const entries: LeaderboardEntry[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as Record<string, unknown>;
      const palier      = typeof data.palier      === 'number' ? data.palier      : 0;
      const wave        = typeof data.wave        === 'number' ? data.wave        : 0;
      const totalClicks = typeof data.totalClicks === 'number' ? data.totalClicks : 0;
      const pixelCoins  = typeof data.pixelCoins  === 'number' ? data.pixelCoins  : 0;
      const score       = typeof data.score       === 'number' ? data.score       : palier * 100 + wave;
      const totalDps    = typeof data.totalDps    === 'number' ? data.totalDps    : 0;
      return {
        uid: docSnap.id,
        username: typeof data.username === 'string' && data.username.trim() ? data.username : 'Joueur',
        palier, wave, totalClicks, pixelCoins, score, totalDps,
      };
    });

    // Déduplique par username — garde le meilleur palier, puis le plus de coins.
    const seen = new Map<string, typeof entries[0]>();
    for (const entry of entries) {
      const key = entry.username.toLowerCase();
      const existing = seen.get(key);
      if (!existing || entry.palier > existing.palier || (entry.palier === existing.palier && entry.pixelCoins > existing.pixelCoins)) {
        seen.set(key, entry);
      }
    }
    const deduped = Array.from(seen.values());

    // Tri par palier maximum atteint DESC puis Pixel-Coins DESC.
    return deduped
      .sort((a, b) => b.palier - a.palier || b.pixelCoins - a.pixelCoins)
      .slice(0, maxEntries);
  } catch (e) {
    console.error('Leaderboard error:', e);
    return [];
  }
}

export async function updatePlayerScore(userId: string, data: Partial<{
  username: string; palier: number; wave: number; pixelCoins: number; totalClicks: number; totalDps: number;
}>) {
  if (!db) return;
  try {
    const entry: Record<string, unknown> = { ...data };
    if (typeof data.palier === 'number' && typeof data.wave === 'number') {
      entry.score = data.palier * 100 + data.wave;
    }
    if (typeof entry.username === 'string') {
      entry.username = (entry.username as string).trim().slice(0, 20);
    }
    entry.updatedAt = serverTimestamp();
    await setDoc(doc(db, 'saves', userId), entry, { merge: true });
  } catch (e) {
    console.error('Leaderboard update error:', e);
  }
}
