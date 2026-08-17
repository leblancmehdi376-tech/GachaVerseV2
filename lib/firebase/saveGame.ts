import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { GameState } from '@/types/game';

export async function saveGameToFirestore(userId: string, state: Partial<GameState>) {
  if (!db) return;
  try {
    const ref = doc(db, 'saves', userId);
    await setDoc(ref, { ...state, lastSaved: Date.now() }, { merge: true });
  } catch (e) {
    console.error('Save error:', e);
  }
}

export async function loadGameFromFirestore(userId: string): Promise<Partial<GameState> | null> {
  if (!db) return null;
  try {
    const ref  = doc(db, 'saves', userId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Partial<GameState>) : null;
  } catch (e) {
    console.error('Load error:', e);
    return null;
  }
}
