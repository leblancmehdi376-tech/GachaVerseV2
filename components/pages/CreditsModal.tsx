'use client';

// Popup des crédits, ouverte depuis le bas de l'onglet Options
// (components/pages/SettingsPage.tsx). Même habillage que PatchNotesModal.
const CREDITS: { name: string; icon: string; roles: string[] }[] = [
  { name: 'NekoZ',     icon: '🐱', roles: ['Product Owner', 'Game Designer'] },
  { name: 'Kiloudu14', icon: '🛠️', roles: ['Game Designer', 'Level Designer', 'Programmeur', 'UX/UI Designer', 'Data Analyst'] },
];

export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(3,2,8,0.88)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(420px, 100%)', maxHeight: '88vh', overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-lit)', background: '#0f0c20', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', padding: '20px 22px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, fontWeight: 800, letterSpacing: 2, color: 'var(--purple-glow)' }}>
            ✨ CRÉDITS
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CREDITS.map(c => (
            <div key={c.name} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{c.name}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {c.roles.map(r => (
                  <span key={r} style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--purple-glow)', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 999, padding: '4px 10px' }}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>
          Merci de jouer à GachaVerse ! 💜
        </div>
      </div>
    </div>
  );
}
