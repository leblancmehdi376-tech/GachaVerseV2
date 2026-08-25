import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { findGiftCode, normalizeGiftCode } from '@/lib/game/giftCodes';
import { logger } from '../logger';

export type RedeemResult =
  | { success: true;  gems: number; pixelCoins: number; characters: string[]; maxCharacters: string[]; items: string[]; equipment: string[]; drops: Record<string, number> }
  | { success: false; reason: 'invalid' | 'already_used' | 'not_logged_in' | 'error' };

const LOCAL_USED_CODES_KEY = 'gachaverse_used_codes';

function getLocalUsedCodes(): string[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_USED_CODES_KEY) ?? '[]'); }
  catch { return []; }
}

function markCodeUsedLocally(codeKey: string) {
  try {
    const used = getLocalUsedCodes();
    if (!used.includes(codeKey))
      localStorage.setItem(LOCAL_USED_CODES_KEY, JSON.stringify([...used, codeKey]));
  } catch { /* ignore */ }
}

export async function redeemGiftCode(userId: string | null, rawCode: string): Promise<RedeemResult> {
  const isLocal = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.')
  );

  // Allow local redemption when developing or running on localhost without a user
  if (!userId && !isLocal) return { success: false, reason: 'not_logged_in' };

  const def = findGiftCode(rawCode);
  if (!def) return { success: false, reason: 'invalid' };

  const codeKey = normalizeGiftCode(rawCode);

  if (!userId && isLocal) {
    // Local-only redemption: do not touch Firestore, use localStorage to mark used
    if (getLocalUsedCodes().includes(codeKey)) return { success: false, reason: 'already_used' };
    markCodeUsedLocally(codeKey);
    return {
      success:    true,
      gems:       def.gems       ?? 0,
      pixelCoins: def.pixelCoins ?? 0,
      characters: def.characters ?? [],
      maxCharacters: def.maxCharacters ?? [],
      items:      def.items      ?? [],
      equipment:  def.equipment  ?? [],
      drops:      def.drops      ?? {},
    };
  }

  // ── 1. Vérification locale (rapide, hors-ligne) ──────────────────────
  if (getLocalUsedCodes().includes(codeKey)) {
    return { success: false, reason: 'already_used' };
  }

  // ── 2. Vérification + écriture Firestore ─────────────────────────────
  if (db) {
    try {
      const ref = doc(db, 'giftCodes', codeKey);

      // Vérifie si le code a déjà été utilisé par N'IMPORTE QUI
      const existing = await Promise.race([
        getDoc(ref),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      if (existing.exists()) {
        // Le code est déjà dans Firestore → quelqu'un l'a déjà utilisé
        markCodeUsedLocally(codeKey); // synchro locale
        return { success: false, reason: 'already_used' };
      }

      // Personne ne l'a utilisé → on le crée (usage unique garanti)
      await Promise.race([
        setDoc(ref, {
          redeemed:   true,
          redeemedBy: userId,
          redeemedAt: serverTimestamp(),
          gems:       def.gems       ?? 0,
          pixelCoins: def.pixelCoins ?? 0,
          characters: def.characters ?? [],
          maxCharacters: def.maxCharacters ?? [],
          items:      def.items      ?? [],
          equipment:  def.equipment  ?? [],
          drops:      def.drops      ?? {},
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      markCodeUsedLocally(codeKey);
      return {
        success:    true,
        gems:       def.gems       ?? 0,
        pixelCoins: def.pixelCoins ?? 0,
        characters: def.characters ?? [],
        maxCharacters: def.maxCharacters ?? [],
        items:      def.items      ?? [],
        equipment:  def.equipment  ?? [],
        drops:      def.drops      ?? {},
      };

    } catch (e) {
      logger.warn('[GiftCode] Firebase indisponible, fallback localStorage:', e);
      // Fallback si Firebase est down (ex: quota dépassé)
      markCodeUsedLocally(codeKey);
      return {
        success:    true,
        gems:       def.gems       ?? 0,
        pixelCoins: def.pixelCoins ?? 0,
        characters: def.characters ?? [],
        maxCharacters: def.maxCharacters ?? [],
        items:      def.items      ?? [],
        equipment:  def.equipment  ?? [],
        drops:      def.drops      ?? {},
      };
    }
  }

  // ── 3. Pas de Firebase du tout — localStorage uniquement ─────────────
  markCodeUsedLocally(codeKey);
  return {
    success:    true,
    gems:       def.gems       ?? 0,
    pixelCoins: def.pixelCoins ?? 0,
    characters: def.characters ?? [],
    maxCharacters: def.maxCharacters ?? [],
    items:      def.items      ?? [],
    equipment:  def.equipment  ?? [],
    drops:      def.drops      ?? {},
  };
}
