'use client';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, signInGoogle, user, logout } = useAuth();
  const [mode, setMode]                 = useState<'signin'|'signup'>('signin');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [username, setUsername]         = useState('');
  const [discordHandle, setDiscordHandle] = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Champs requis'); return; }
    if (mode === 'signup' && (!username || !discordHandle)) {
      setError('Pseudo jeu et Discord requis');
      return;
    }
    setLoading(true); setError('');
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password, username, discordHandle);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Erreur'); }
    finally { setLoading(false); }
  };

  if (user) return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-panel)', border: '2px solid var(--c-cyan)', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 0 32px #06b6d444' }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: 'var(--c-cyan)' }}>CONNECTÉ</div>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: 'var(--c-muted)', wordBreak: 'break-all' }}>{user.email}</div>
        <button onClick={() => { logout(); onClose(); }} style={{ padding: '10px', background: '#7f1d1d', border: '1px solid var(--c-red)', color: 'var(--c-red)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '12px' }}>DÉCONNEXION</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '12px' }}>FERMER</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--c-panel)', border: '2px solid #8b5cf6', padding: '24px', width: '340px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 0 32px #8b5cf644' }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: '#a78bfa', textAlign: 'center', textShadow: '0 0 8px #8b5cf6' }}>
          {mode === 'signin' ? '🔐 CONNEXION' : '📝 INSCRIPTION'}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['signin','signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', background: mode===m ? '#8b5cf622' : 'none', border: `1px solid ${mode===m ? '#8b5cf6' : 'var(--c-border)'}`, color: mode===m ? '#a78bfa' : 'var(--c-muted)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '12px' }}>
              {m === 'signin' ? 'CONNEXION' : 'CRÉER'}
            </button>
          ))}
        </div>
        {mode === 'signin' ? (
          <>
            {[{ph:'email@example.com',val:email,set:setEmail,type:'email'},{ph:'Mot de passe',val:password,set:setPassword,type:'password'}].map((f,i) => (
              <input key={i} type={f.type} placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSubmit()}
                style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '12px', outline: 'none', borderRadius: '2px' }} />
            ))}
          </>
        ) : (
          <>
            <input type="text" placeholder="Pseudo en jeu" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '12px', outline: 'none', borderRadius: '2px' }} />
            <input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '12px', outline: 'none', borderRadius: '2px' }} />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '12px', outline: 'none', borderRadius: '2px' }} />
            <input type="text" placeholder="Discord (@nom ou nom#1234)" value={discordHandle} onChange={e => setDiscordHandle(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSubmit()} style={{ background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', padding: '10px 12px', fontFamily: 'var(--font-pixel)', fontSize: '12px', outline: 'none', borderRadius: '2px' }} />
          </>
        )}
        {error && <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: 'var(--c-red)', textAlign: 'center' }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px', background: '#8b5cf622', border: '2px solid #8b5cf6', color: '#a78bfa', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '12px', boxShadow: '0 0 8px #8b5cf644' }}>
          {loading ? '...' : mode==='signin' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--c-border)' }} />
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '12px', color: 'var(--c-muted)' }}>OU</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--c-border)' }} />
        </div>
        <button onClick={async () => { setLoading(true); try { await signInGoogle(); onClose(); } catch(e:unknown){setError(e instanceof Error?e.message:'Erreur');} finally{setLoading(false);} }}
          disabled={loading} style={{ padding: '10px', background: '#08090f', border: '1px solid var(--c-border)', color: 'var(--c-text)', cursor: 'pointer', fontFamily: 'var(--font-pixel)', fontSize: '12px' }}>
          G  CONTINUER AVEC GOOGLE
        </button>
      </div>
    </div>
  );
}
