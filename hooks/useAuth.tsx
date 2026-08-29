'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { claimSession, watchSession, clearLocalSession, releaseSession } from '@/lib/firebase/session';
import { createAccessRequest, ensureUserDoc } from '@/lib/firebase/accessRequests';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, discordHandle: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  kickedOut: boolean;
  dismissKickedOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [loading, setLoading]   = useState(true);
  const [kickedOut, setKickedOut] = useState(false);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Réclame le verrou de session ICI, AVANT setUser — c'est ce qui arme
        // watchSession juste en dessous ([user] en dépendance). Si on laissait
        // signIn/signInGoogle réclamer le verrou de leur côté (en parallèle de
        // ce listener), watchSession pouvait démarrer et voir le doc encore
        // frais de l'ancien appareil AVANT que la transaction de claimSession
        // n'ait fini de l'écraser — kickant à tort l'appareil qui vient
        // pourtant de se connecter légitimement (typiquement en changeant
        // rapidement de PC à téléphone). En attendant la fin du claim ici,
        // watchSession ne démarre qu'une fois le doc à jour.
        const ok = await claimSession(u.uid);
        if (!ok) logger.warn('[Auth] claimSession a échoué (verrou de session non posé), connexion autorisée quand même.');
        // Rattrape aussi les sessions déjà ouvertes (Firebase reconnecte
        // automatiquement l'utilisateur sans repasser par signIn/signInGoogle) :
        // sans ça, les comptes qui n'ont pas de fiche "users" restent bloqués
        // (permissions Firestore) sur tout ce qui vérifie leur statut "approved",
        // comme la lecture du classement — même après le correctif précédent.
        await ensureUserDoc(u.uid, u.email ?? '', u.displayName ?? '');
      }
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Surveille en continu si un AUTRE navigateur prend le relais sur ce
  // compte : si oui, cette session-ci est automatiquement déconnectée.
  useEffect(() => {
    if (!user) return;
    const unsub = watchSession(user.uid, () => {
      setKickedOut(true);
      if (auth) {
        signOut(auth).catch(() => {});
      }
    });
    return unsub;
  }, [user]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase non configuré');
    await signInWithEmailAndPassword(auth, email, password);
    // Le verrou de session et la fiche "users" sont désormais réclamés de
    // façon centralisée dans le listener onAuthStateChanged ci-dessus (avant
    // setUser), pour éviter la course avec watchSession — voir son commentaire.
  };

  const signUp = async (email: string, password: string, username: string, discordHandle: string) => {
    if (!auth) throw new Error('Firebase non configuré');
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // discordHandle est déclaratif (texte libre, pas d'OAuth) — voir le
    // commentaire sur AccessRequest.discordHandle dans accessRequests.ts.
    // Le compte est immédiatement approuvé (createAccessRequest), il n'y a
    // plus de vérification manuelle avant accès malgré ce que ce commentaire
    // suggérait historiquement.
    await createAccessRequest(cred.user.uid, email, username, discordHandle);
  };

  const signInGoogle = async () => {
    if (!auth) throw new Error('Firebase non configuré');
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Idem signIn() ci-dessus : verrou de session + fiche "users" gérés
    // centralement dans le listener onAuthStateChanged.
  };

  const logout = async () => {
    if (!auth) { clearLocalSession(); return; }
    const uid = auth.currentUser?.uid ?? null;
    // Libère le verrou Firestore AVANT signOut (tant qu'on est encore
    // authentifié, sinon les règles Firestore refuseraient l'écriture) —
    // sinon un nouvel appareil doit attendre jusqu'à 150s (TTL) que ce verrou
    // périmé expire avant de pouvoir se connecter sans se faire kicker.
    if (uid) await releaseSession(uid).catch(() => {});
    clearLocalSession();
    await signOut(auth);
  };

  const dismissKickedOut = () => setKickedOut(false);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInGoogle, logout, kickedOut, dismissKickedOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
