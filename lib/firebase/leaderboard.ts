import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '../logger';
import { logFirestoreOp } from './telemetry';
import { bnCompare, coerceBigNum, type BigNum } from '@/lib/game/bignum';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  palier: number;
  maxPalierReached: number;
  wave: number;
  totalClicks: number;
  pixelCoins: BigNum;
  score: number;
  totalDps: BigNum;
  prestigeLevel: number;
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
    // Une lecture par document retourné, pas 1 par appel — count porte le vrai
    // nombre de documents facturés (voir le commentaire au-dessus sur le coût
    // de cette fonction, ré-appelée toutes les 30-90s tant que la page reste ouverte).
    logFirestoreOp('read', 'leaderboard_view', snapshot.docs.length);
    const entries: LeaderboardEntry[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as Record<string, unknown>;
      const palier      = typeof data.palier      === 'number' ? data.palier      : 0;
      // Compat anciens documents sans maxPalierReached : retombe sur palier.
      const maxPalierReached = typeof data.maxPalierReached === 'number' ? data.maxPalierReached : palier;
      const wave        = typeof data.wave        === 'number' ? data.wave        : 0;
      const totalClicks = typeof data.totalClicks === 'number' ? data.totalClicks : 0;
      const pixelCoins  = coerceBigNum(data.pixelCoins); // number (anciennes saves) ou BigNum — coerceBigNum accepte les deux
      const score       = typeof data.score       === 'number' ? data.score       : palier * 100 + wave;
      const totalDps    = coerceBigNum(data.totalDps);
      const prestigeLevel = typeof data.prestigeLevel === 'number' ? data.prestigeLevel : 0;
      return {
        uid: docSnap.id,
        username: typeof data.username === 'string' && data.username.trim() ? data.username : 'Joueur',
        palier, maxPalierReached, wave, totalClicks, pixelCoins, score, totalDps, prestigeLevel,
      };
    });

    // Déduplique par username — garde le meilleur palier max atteint, puis le plus de coins.
    const seen = new Map<string, typeof entries[0]>();
    for (const entry of entries) {
      const key = entry.username.toLowerCase();
      const existing = seen.get(key);
      if (!existing || entry.maxPalierReached > existing.maxPalierReached || (entry.maxPalierReached === existing.maxPalierReached && bnCompare(entry.pixelCoins, existing.pixelCoins) > 0)) {
        seen.set(key, entry);
      }
    }
    const deduped = Array.from(seen.values());

    // Tri par palier maximum atteint DESC puis Pixel-Coins DESC — le palier max
    // ne redescend jamais après un prestige, contrairement au palier courant.
    return deduped
      .sort((a, b) => b.maxPalierReached - a.maxPalierReached || bnCompare(b.pixelCoins, a.pixelCoins))
      .slice(0, maxEntries);
  } catch (e) {
    logger.error('Leaderboard error:', e);
    return [];
  }
}

export async function updatePlayerScore(userId: string, data: Partial<{
  username: string; palier: number; maxPalierReached: number; wave: number; pixelCoins: BigNum; totalClicks: number; totalDps: BigNum;
}>) {
  if (!db) return;
  try {
    const entry: Record<string, unknown> = { ...data };
    if (typeof data.palier === 'number' && typeof data.wave === 'number') {
      entry.score = data.palier * 100 + data.wave;
    }
    let username: string | undefined;
    if (typeof entry.username === 'string') {
      username = (entry.username as string).trim().slice(0, 20);
      entry.username = username;
    }
    entry.updatedAt = serverTimestamp();
    const writes: Promise<unknown>[] = [setDoc(doc(db, 'saves', userId), entry, { merge: true })];
    // `saves/{uid}.username` (écrit ci-dessus) n'est qu'une copie dénormalisée
    // — `users/{uid}.username` est la source de vérité lue par le panel admin
    // (voir AccessRequest.username dans accessRequests.ts). Sans cette
    // resynchro immédiate, l'admin restait bloqué sur le pseudo de
    // l'inscription dès qu'un joueur se renommait ici.
    // `updateDoc` (pas `setDoc` merge) : échoue proprement — capturé juste en
    // dessous, sans faire échouer l'écriture `saves` ci-dessus — si
    // `users/{uid}` n'existe pas encore (très vieux comptes antérieurs à ce
    // doc, voir le commentaire dans getAllUsers). `setDoc` merge y créerait à
    // la place un doc incomplet (juste `username`, sans email/approved/
    // createdAt), faisant apparaître ce joueur à tort comme "en attente"
    // dans le panel admin.
    if (username) writes.push(updateDoc(doc(db, 'users', userId), { username }).catch(() => {}));
    await Promise.all(writes);
    logFirestoreOp('write', 'leaderboard_score');
  } catch (e) {
    logger.error('Leaderboard update error:', e);
  }
}
