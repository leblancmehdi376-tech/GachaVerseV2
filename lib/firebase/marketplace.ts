import {
  collection, doc, addDoc, getDocs, query, where,
  runTransaction, limit,
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '../logger';

export type ListingCurrency = 'gems' | 'coins' | 'crowns';
export type ListingType     = 'item' | 'equipment' | 'character';

export interface MarketplaceListing {
  id:           string;
  sellerId:     string;
  sellerName:   string;
  type:         ListingType;
  itemId:       string;
  quantity:     number;
  price:        number;
  currency:     ListingCurrency;
  createdAt:    number;
  status:       'active' | 'sold' | 'cancelled';
  soldTo?:      string;
  soldToName?:  string;
  soldAt?:      number;
  claimed?:     boolean;
  claimedAt?:   number;
}

export async function createListing(
  data: Omit<MarketplaceListing, 'id' | 'createdAt' | 'status'>
): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'marketplace'), {
      ...data, status: 'active', createdAt: Date.now(),
    });
    return ref.id;
  } catch (e) { logger.error('[Marketplace] createListing:', e); return null; }
}

// Tri côté client pour éviter les index composites Firestore
export async function getActiveListings(max = 100): Promise<MarketplaceListing[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'marketplace'), where('status', '==', 'active'), limit(max)));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as MarketplaceListing))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { logger.error('[Marketplace] getActiveListings:', e); return []; }
}

export async function getMyListings(sellerId: string): Promise<MarketplaceListing[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, 'marketplace'), where('sellerId', '==', sellerId), limit(50)));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as MarketplaceListing))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) { logger.error('[Marketplace] getMyListings:', e); return []; }
}

export async function buyListing(listingId: string, buyerId: string, buyerName: string): Promise<MarketplaceListing | null> {
  if (!db) return null;
  try {
    const listingRef = doc(db, 'marketplace', listingId);
    let listing: MarketplaceListing | null = null;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(listingRef);
      if (!snap.exists()) throw new Error('Annonce introuvable');
      const data = snap.data() as Omit<MarketplaceListing, 'id'>;
      if (data.status !== 'active')       throw new Error('Déjà vendu');
      if (data.sellerId === buyerId)       throw new Error('Propre annonce');
      listing = { id: listingId, ...data };
      tx.update(listingRef, { status: 'sold', soldTo: buyerId, soldToName: buyerName, soldAt: Date.now() });
    });
    return listing;
  } catch (e) { logger.error('[Marketplace] buyListing:', e); return null; }
}

export async function cancelListing(listingId: string, sellerId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const ref = doc(db, 'marketplace', listingId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Introuvable');
      const d = snap.data();
      if (d.sellerId !== sellerId) throw new Error('Non autorisé');
      if (d.status !== 'active')   throw new Error('Déjà fermé');
      tx.update(ref, { status: 'cancelled' });
    });
    return true;
  } catch (e) { logger.error('[Marketplace] cancelListing:', e); return false; }
}

export async function claimSaleReward(listingId: string, sellerId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const ref = doc(db, 'marketplace', listingId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Introuvable');
      const d = snap.data();
      if (d.sellerId !== sellerId) throw new Error('Non autorisé');
      if (d.status !== 'sold')     throw new Error('Pas vendu');
      if (d.claimed)               throw new Error('Déjà encaissé');
      tx.update(ref, { claimed: true, claimedAt: Date.now() });
    });
    return true;
  } catch (e) { logger.error('[Marketplace] claimSaleReward:', e); return false; }
}
