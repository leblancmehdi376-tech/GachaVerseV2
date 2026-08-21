'use client';

export function MaintenanceScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'radial-gradient(120% 90% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 55%), linear-gradient(180deg, #060510 0%, #030208 100%)',
    }}>
      <div style={{
        width: 'min(440px, 100%)',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(124,58,237,0.35)',
        background: 'linear-gradient(170deg, #12102a 0%, #0a0818 100%)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.18)',
        textAlign: 'center',
        padding: '40px 28px',
      }}>
        <div style={{ fontSize: 53.6, lineHeight: 1, marginBottom: 18 }}>🛠️</div>

        <div style={{
          fontFamily: 'var(--f-title, serif)', fontSize: 22.7, fontWeight: 900, letterSpacing: 2,
          background: 'linear-gradient(90deg,#e879f9,#c084fc,#9333ea)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 12,
        }}>
          MAINTENANCE EN COURS
        </div>

        <div style={{
          fontFamily: 'var(--f-ui, sans-serif)', fontSize: 13.4, color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6, marginBottom: 20,
        }}>
          GachaVerse est temporairement indisponible pendant qu&apos;on corrige un problème.
          <br />Ta progression est en sécurité — rien n&apos;est perdu.
        </div>

        <div style={{
          fontFamily: 'var(--f-ui, sans-serif)', fontSize: 12, color: 'rgba(255,255,255,0.4)',
          letterSpacing: 0.5,
        }}>
          Reviens dans quelques instants.
        </div>
      </div>
    </div>
  );
}
