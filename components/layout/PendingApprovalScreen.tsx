'use client';

export function PendingApprovalScreen({ email, onLogout }: { email: string | null; onLogout: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'radial-gradient(120% 90% at 50% -10%, rgba(251,191,36,0.12) 0%, transparent 55%), linear-gradient(180deg, #060510 0%, #030208 100%)',
    }}>
      <div style={{
        width: 'min(420px, 100%)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(251,191,36,0.3)',
        background: 'linear-gradient(170deg, #12102a 0%, #0a0818 100%)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 60px rgba(251,191,36,0.12)',
        textAlign: 'center',
        padding: '40px 28px',
      }}>
        <div style={{ fontSize: 49.4, lineHeight: 1, marginBottom: 16 }}>⏳</div>

        <div style={{
          fontFamily: 'var(--f-title, serif)', fontSize: 20.6, fontWeight: 900, letterSpacing: 1.5,
          color: '#fbbf24', marginBottom: 12,
        }}>
          COMPTE EN ATTENTE DE VALIDATION
        </div>

        <div style={{
          fontFamily: 'var(--f-ui, sans-serif)', fontSize: 13.4, color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6, marginBottom: 8,
        }}>
          Ta demande d&apos;accès a bien été reçue{email ? ` pour ${email}` : ''}.
          Chaque compte est vérifié manuellement — ça ne devrait pas prendre longtemps.
        </div>

        <div style={{
          fontFamily: 'var(--f-ui, sans-serif)', fontSize: 11.3, color: 'rgba(255,255,255,0.4)',
          marginBottom: 22,
        }}>
          Reviens un peu plus tard, ou reconnecte-toi.
        </div>

        <button onClick={onLogout} style={{
          padding: '11px 24px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.8)', fontFamily: 'var(--f-ui, sans-serif)', fontSize: 12.4, fontWeight: 700,
        }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
