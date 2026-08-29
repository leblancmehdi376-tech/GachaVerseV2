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
  // Codes globaux : une seule clé de suivi, partagée par tout le monde.
  // Codes perUser : la clé de suivi est scopée à l'utilisateur, donc chacun
  // peut consommer le code indépendamment des autres.
  const trackingKey = def.perUser && userId ? `${codeKey}__${userId}` : codeKey;

  if (!userId && isLocal) {
    // Local-only redemption: do not touch Firestore, use localStorage to mark used
    if (getLocalUsedCodes().includes(trackingKey)) return { success: false, reason: 'already_used' };
    markCodeUsedLocally(trackingKey);
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
  if (getLocalUsedCodes().includes(trackingKey)) {
    return { success: false, reason: 'already_used' };
  }

  // ── 2. Vérification + écriture Firestore ─────────────────────────────
  if (db) {
    try {
      const ref = doc(db, 'giftCodes', trackingKey);

      // Codes globaux : vérifie si le code a déjà été utilisé par N'IMPORTE QUI.
      // Codes perUser : vérifie seulement si CET utilisateur l'a déjà utilisé.
      const existing = await Promise.race([
        getDoc(ref),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ]);

      if (existing.exists()) {
        // Déjà utilisé (globalement, ou par cet utilisateur si perUser)
        markCodeUsedLocally(trackingKey); // synchro locale
        return { success: false, reason: 'already_used' };
      }

      // Pas encore utilisé (selon la portée du code) → on le crée
      await Promise.race([
        setDoc(ref, {
          redeemed:   true,
          redeemedBy: userId,
          redeemedAt: serverTimestamp(),
          perUser:    def.perUser ?? false,
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

      markCodeUsedLocally(trackingKey);
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
      markCodeUsedLocally(trackingKey);
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
  markCodeUsedLocally(trackingKey);
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
