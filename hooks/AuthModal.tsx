'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, user, logout } = useAuth();
  const [mode, setMode]         = useState<'signin'|'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [discord, setDiscord]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Champs requis'); return; }
    if (mode === 'signup' && (!username || !discord)) { setError('Pseudo et Discord requis'); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'signin') { await signIn(email, password); onClose(); }
      else { await signUp(email, password, username, discord); setRequestSent(true); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  };

  // Demande d'inscription envoyée : compte créé mais en attente de validation manuelle.
  if (requestSent) return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-panel)', border: '2px solid #fbbf24', padding: '28px', width: '340px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 0 32px #fbbf2444', textAlign: 'center' }}>
        <div style={{ fontSize: '33px' }}>⏳</div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10.3px', color: '#fbbf24' }}>DEMANDE ENVOYÉE</div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8.2px', color: 'var(--c-muted)', lineHeight: 1.8 }}>
          Ton compte est créé mais doit être validé manuellement avant de pouvoir jouer.
          Ça ne devrait pas prendre longtemps !
        </div>
        <button onClick={onClose} style={{ padding: '10px', background: '#8b5cf622', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '9.3px' }}>FERMER</button>
      </div>
    </div>
  );

  if (user) return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-panel)', border: '2px solid var(--c-cyan)', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 0 32px #06b6d444' }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '10.3px', color: 'var(--c-cyan)' }}>CONNECTÉ</div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8.2px', color: 'var(--c-muted)', wordBreak: 'break-all' }}>{user.email}</div>
        <button onClick={() => { logout(); onClose(); }} style={{ padding: '10px', background: '#7f1d1d', border: '1px solid var(--c-red)', color: 'var(--c-red)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '9.3px' }}>DÉCONNEXION</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '8.2px' }}>FERMER</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-panel)', border: '2px solid #8b5cf6', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 0 32px #8b5cf644' }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '11.3px', color: '#a78bfa', textAlign: 'center', textShadow: '0 0 8px #8b5cf6' }}>
          {mode === 'signin' ? '🔐 CONNEXION' : '📝 DEMANDE D\'ACCÈS'}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['signin','signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex: 1, padding: '8px', background: mode===m ? '#8b5cf622' : 'none', border: `1px solid ${mode===m ? '#8b5cf6' : 'var(--c-border)'}`, color: mode===m ? '#a78bfa' : 'var(--c-muted)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '8.2px' }}>
              {m === 'signin' ? 'CONNEXION' : 'DEMANDER'}
            </button>
          ))}
        </div>
        {mode === 'signup' && (
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '7.2px', color: 'var(--c-muted)', lineHeight: 1.6, padding: '8px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
            Chaque compte est validé manuellement — indique un vrai pseudo Discord pour accélérer la vérification.
          </div>
        )}
        {[{ph:'email@example.com',val:email,set:setEmail,type:'email'},{ph:'Mot de passe',val:password,set:setPassword,type:'password'}].map((f,i) => (
          <input key={i} type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '9.3px', outline: 'none', borderRadius: '2px' }} />
        ))}
        {mode === 'signup' && [
          { ph:'Pseudo en jeu', val:username, set:setUsername },
          { ph:'Pseudo Discord (ex: nom#1234 ou @nom)', val:discord, set:setDiscord },
        ].map((f,i) => (
          <input key={`s${i}`} type="text" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '9.3px', outline: 'none', borderRadius: '2px' }} />
        ))}
        {error && <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '8.2px', color: 'var(--c-red)', textAlign: 'center' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#8b5cf622', border: '2px solid #8b5cf6', color: '#a78bfa', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '9.3px', boxShadow: '0 0 8px #8b5cf644' }}>
          {loading ? '...' : mode==='signin' ? 'SE CONNECTER' : 'ENVOYER LA DEMANDE'}
        </button>
      </div>
    </div>
  );
}
