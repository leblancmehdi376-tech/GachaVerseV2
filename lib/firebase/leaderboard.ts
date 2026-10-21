import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './config';
import { logger } from '../logger';
import { logFirestoreOp } from './telemetry';
import { bnCompare, coerceBigNum, type BigNum } from '@/lib/game/bignum';
import { parseInstanceKey, type CardEdition } from '@/lib/game/editions';
import { ACHIEVEMENT_BY_ID } from '@/lib/game/achievements';
import { getCompadexProgress } from '@/lib/game/compadex';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  palier: number;
  maxPalierReached: number;
  wave: number;
  pixelCoins: BigNum;
  score: number;
  totalDps: BigNum;
  prestigeLevel: number;
  activeTitle: string;
  // Avatar (voir components/layout/AvatarVisual.tsx) — déjà présents dans le
  // même document `saves/{uid}` que le reste de cette liste (selectedAvatarChampionId
  // via getSerializableState, collection déjà lue plus bas) : aucune lecture
  // Firestore supplémentaire, juste des champs en plus extraits du même doc.
  selectedAvatarChampionId: string | null;
  avatarFormIndex: number;
  // Profil public (popup au clic dans le classement) — même principe : tout
  // est extrait du doc `saves/{uid}` déjà lu, zéro lecture en plus.
  profile: LeaderboardProfile;
  // Défi GachaDle — mêmes champs `saves/{uid}` que la sauvegarde cloud
  // (dleRecentWins, + dleDailyDate/dleDailyGuesses/dleLastWinDate pour les
  // saves plus anciennes) : zéro lecture en plus. Jour ('2026-09-29') →
  // nombre d'essais pour chaque défi réussi encore connu (aujourd'hui, hier).
  dleWins: Record<string, number>;
  // Château de Nakime — mêmes champs `saves/{uid}` (nakimeBestFloor,
  // nakimeHistory, nakimeTotals) : zéro lecture en plus.
  nakime: NakimeRecord;
}

export interface NakimeRecord {
  best: number;     // record d'étages franchis
  runs: number;     // runs jouées à vie
  team: string[];   // équipe du record si la run est encore dans l'historique
}

export interface LeaderboardTeamMember {
  templateId: string;
  formIndex: number;
  edition: CardEdition;
  level: number;
}

export interface LeaderboardProfile {
  palier: number;
  team: LeaderboardTeamMember[];
  showcasedTrophies: string[];
  achievementsCount: number;
  titlesCount: number;
  // Progression du Compadex (persos + équipements déjà obtenus, à vie) — même
  // compteur que la barre latérale du joueur (getCompadexProgress), et non la
  // collection actuelle, vidée à chaque Prestige.
  compadexCount: number;
  totalKills: number;
  totalBossKills: number;
  totalGachaPulls: number;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? v as Record<string, unknown> : {};
}

// Entrées du Compadex d'une sauvegarde. Union avec la collection, l'inventaire
// et l'équipement porté actuels, comme useCompadexTracker : une sauvegarde
// pas rouverte depuis l'arrivée du Compadex n'a pas encore ces deux maps.
function extractCompadexCount(data: Record<string, unknown>, collection: Record<string, { equippedItems?: Record<string, unknown> }>, ownedTemplates: Set<string>): number {
  const chars: Record<string, true> = {};
  for (const id of Object.keys(record(data.compadexCharactersSeen))) chars[id] = true;
  for (const id of ownedTemplates) chars[id] = true;
  const equip: Record<string, true> = {};
  for (const id of Object.keys(record(data.compadexEquipmentSeen))) equip[id] = true;
  for (const [id, qty] of Object.entries(record(data.equipmentInventory))) if (num(qty) > 0) equip[id] = true;
  for (const owned of Object.values(collection)) {
    for (const id of Object.values(record(owned?.equippedItems))) if (typeof id === 'string') equip[id] = true;
  }
  return getCompadexProgress(chars, equip).count;
}

// Extrait le profil public d'un doc `saves/{uid}` (voir getSerializableState).
export function extractProfile(data: Record<string, unknown>): LeaderboardProfile {
  const collection = (data.collection && typeof data.collection === 'object')
    ? data.collection as Record<string, { currentForm?: number; level?: number; edition?: CardEdition; equippedItems?: Record<string, unknown> }>
    : {};
  const team: LeaderboardTeamMember[] = [];
  if (Array.isArray(data.equippedTeam)) {
    for (const key of data.equippedTeam) {
      if (typeof key !== 'string') continue;
      // Clé "id::gold" possible sur une save pas encore migrée (ancien format).
      const parsed = parseInstanceKey(key);
      const owned = collection[key];
      team.push({ templateId: parsed.templateId, edition: owned?.edition ?? parsed.edition, formIndex: owned?.currentForm ?? 0, level: owned?.level ?? 0 });
    }
  }
  const ownedTemplates = new Set(Object.keys(collection).map(k => parseInstanceKey(k).templateId));
  const claimed = (data.achievementsClaimed && typeof data.achievementsClaimed === 'object')
    ? data.achievementsClaimed as Record<string, unknown>
    : {};
  return {
    palier: num(data.palier),
    team,
    showcasedTrophies: Array.isArray(data.showcasedTrophies)
      ? data.showcasedTrophies.filter((id): id is string => typeof id === 'string')
      : [],
    achievementsCount: Object.entries(claimed).filter(([id, v]) => v && ACHIEVEMENT_BY_ID.has(id)).length,
    titlesCount: Array.isArray(data.unlockedTitles) ? data.unlockedTitles.length : 0,
    compadexCount: extractCompadexCount(data, collection, ownedTemplates),
    totalKills: num(data.totalKills),
    totalBossKills: num(data.totalBossKills),
    totalGachaPulls: num(data.totalGachaPulls),
  };
}

// Défis réussis encore connus dans le doc, par jour. `dleRecentWins` garde
// les 2 dernières victoires ; les saves antérieures à ce champ n'ont que les
// essais de `dleDailyDate`, exploitables seulement si ce jour a été gagné.
export function extractDleWins(data: Record<string, unknown>): { dleWins: Record<string, number> } {
  const dleWins: Record<string, number> = {};
  const date = typeof data.dleDailyDate === 'string' ? data.dleDailyDate : '';
  const guesses = Array.isArray(data.dleDailyGuesses) ? data.dleDailyGuesses.length : 0;
  if (date && data.dleLastWinDate === date && guesses > 0) dleWins[date] = guesses;
  if (Array.isArray(data.dleRecentWins)) {
    for (const w of data.dleRecentWins as { date?: unknown; guesses?: unknown }[]) {
      if (typeof w?.date === 'string' && typeof w.guesses === 'number' && w.guesses > 0) dleWins[w.date] = w.guesses;
    }
  }
  return { dleWins };
}

// Record du Château de Nakime. L'historique ne garde que les dernières runs :
// l'équipe du record n'est connue que si cette run y figure encore.
export function extractNakime(data: Record<string, unknown>): { nakime: NakimeRecord } {
  const best = num(data.nakimeBestFloor);
  const totals = (data.nakimeTotals && typeof data.nakimeTotals === 'object') ? data.nakimeTotals as Record<string, unknown> : {};
  const history = Array.isArray(data.nakimeHistory) ? data.nakimeHistory as { floors?: unknown; team?: unknown }[] : [];
  const bestRun = best > 0 ? history.find(h => h?.floors === best && Array.isArray(h.team)) : undefined;
  const team = bestRun ? (bestRun.team as unknown[]).filter((id): id is string => typeof id === 'string') : [];
  return { nakime: { best, runs: num(totals.runs) || num(data.nakimeRunsPlayed), team } };
}

// Cache mémoire partagé par tous les classements (palier, GachaDle) : revenir
// sur la page Classement ou changer d'onglet dans le TTL ne relit rien. Le
// bouton "Actualiser" (déjà limité à 1 appel / 15s) le contourne via `force`.
const CACHE_TTL_MS = 120_000;
let cache: { at: number; entries: Promise<LeaderboardEntry[]> } | null = null;

/**
 * Tous les joueurs lus (dédupliqués par pseudo), non triés. Un seul appel
 * alimente les deux classements — ~100 lectures au plus, 0 si le cache est frais.
 */
export function getLeaderboardEntries(force = false): Promise<LeaderboardEntry[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.entries;
  const entries = fetchLeaderboardEntries();
  cache = { at: Date.now(), entries };
  // Échec réseau (liste vide) : ne pas le garder en cache pendant 2 min.
  entries.then(list => { if (list.length === 0 && cache?.entries === entries) cache = null; });
  return entries;
}

/** Tri par palier maximum atteint DESC puis Pixel-Coins DESC. */
export function rankByPalier(entries: LeaderboardEntry[], maxEntries = 50): LeaderboardEntry[] {
  // Le palier max ne redescend jamais après un prestige, contrairement au palier courant.
  return [...entries]
    .sort((a, b) => b.maxPalierReached - a.maxPalierReached || bnCompare(b.pixelCoins, a.pixelCoins))
    .slice(0, maxEntries);
}

export interface DleRankingRow { entry: LeaderboardEntry; guesses: number; rank: number }

/**
 * Classement du défi GachaDle d'un jour : joueurs l'ayant réussi, par nombre
 * d'essais croissant. Les ex æquo partagent le même rang (1, 1, 3...).
 */
export function rankByDleGuesses(entries: LeaderboardEntry[], dateKey: string): DleRankingRow[] {
  const sorted = entries
    .filter(e => (e.dleWins?.[dateKey] ?? 0) > 0)
    .map(entry => ({ entry, guesses: entry.dleWins[dateKey] }))
    .sort((a, b) => a.guesses - b.guesses || a.entry.username.localeCompare(b.entry.username, 'fr'));
  const rows: DleRankingRow[] = [];
  sorted.forEach(({ entry, guesses }, i) => {
    const prev = rows[i - 1];
    rows.push({ entry, guesses, rank: prev && prev.guesses === guesses ? prev.rank : i + 1 });
  });
  return rows;
}

export interface NakimeRankingRow { entry: LeaderboardEntry; rank: number }

/**
 * Classement du Château de Nakime : record d'étages DESC, joueurs sans run
 * exclus. Les ex æquo partagent le même rang (1, 1, 3...).
 */
export function rankByNakime(entries: LeaderboardEntry[]): NakimeRankingRow[] {
  const sorted = entries
    .filter(e => (e.nakime?.best ?? 0) > 0)
    .sort((a, b) => b.nakime.best - a.nakime.best || a.username.localeCompare(b.username, 'fr'));
  const rows: NakimeRankingRow[] = [];
  sorted.forEach((entry, i) => {
    const prev = rows[i - 1];
    rows.push({ entry, rank: prev && prev.entry.nakime.best === entry.nakime.best ? prev.rank : i + 1 });
  });
  return rows;
}

export async function getTopLeaderboard(maxEntries = 50, force = false): Promise<LeaderboardEntry[]> {
  return rankByPalier(await getLeaderboardEntries(force), maxEntries);
}

async function fetchLeaderboardEntries(): Promise<LeaderboardEntry[]> {
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
      const pixelCoins  = coerceBigNum(data.pixelCoins); // number (anciennes saves) ou BigNum — coerceBigNum accepte les deux
      const score       = typeof data.score       === 'number' ? data.score       : palier * 100 + wave;
      const totalDps    = coerceBigNum(data.totalDps);
      const prestigeLevel = typeof data.prestigeLevel === 'number' ? data.prestigeLevel : 0;
      // Déjà présent dans le doc `saves/{uid}` lu ci-dessus (synchronisé par
      // getSerializableState toutes les 10min) — aucune lecture supplémentaire.
      const activeTitle = typeof data.activeTitle === 'string' ? data.activeTitle : '';
      const selectedAvatarChampionId = typeof data.selectedAvatarChampionId === 'string' ? data.selectedAvatarChampionId : null;
      // Forme/évolution actuelle du champion avatar — dérivée de `collection`
      // (déjà rapatriée dans le même doc, jamais lue séparément) pour afficher
      // la bonne illustration de carte.
      let avatarFormIndex = 0;
      if (selectedAvatarChampionId && data.collection && typeof data.collection === 'object') {
        const ownedEntry = Object.entries(data.collection as Record<string, { currentForm?: number }>)
          .find(([k]) => parseInstanceKey(k).templateId === selectedAvatarChampionId);
        avatarFormIndex = ownedEntry?.[1]?.currentForm ?? 0;
      }
      return {
        uid: docSnap.id,
        username: typeof data.username === 'string' && data.username.trim() ? data.username : 'Joueur',
        palier, maxPalierReached, wave, pixelCoins, score, totalDps, prestigeLevel, activeTitle,
        selectedAvatarChampionId, avatarFormIndex,
        profile: extractProfile(data),
        ...extractDleWins(data),
        ...extractNakime(data),
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
    return Array.from(seen.values());
  } catch (e) {
    logger.error('Leaderboard error:', e);
    return [];
  }
}

export async function updatePlayerScore(userId: string, data: Partial<{
  username: string; palier: number; maxPalierReached: number; wave: number; pixelCoins: BigNum; totalDps: BigNum;
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
