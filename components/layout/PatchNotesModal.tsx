'use client';
import { PATCH_NOTES } from '@/lib/game/patchNotes';

export function PatchNotesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(3,2,8,0.88)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', maxHeight: '88vh', overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-lit)', background: '#0f0c20', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', padding: '20px 22px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 16.5, fontWeight: 800, letterSpacing: 1.5, color: 'var(--purple-glow)' }}>
            📋 PATCH NOTES
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PATCH_NOTES.map((entry, i) => (
            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 13.4, color: 'var(--text)' }}>{entry.title}</div>
                <div style={{ fontFamily: 'var(--f-num)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{entry.date}</div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {entry.changes.map((c, ci) => (
                  <li key={ci} style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-sub)', lineHeight: 1.5 }}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
