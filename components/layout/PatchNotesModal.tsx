'use client';
import { PATCH_NOTES } from '@/lib/game/patchNotes';

// Ré-exporté pour que GameLayout lise la dernière entrée via CE module
// (chargé à part) : un import séparé de lib/game/patchNotes dupliquerait les
// données dans un second chunk.
export { PATCH_NOTES };

// Rend **mot** en gras.
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function ChangeList({ changes }: { changes: string[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {changes.map((c, ci) => (
        <li key={ci} style={{ display: 'flex', gap: 9, fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, width: 5, height: 5, marginTop: 7, borderRadius: '50%', background: 'var(--purple-glow)', opacity: 0.8 }} />
          <span><RichText text={c} /></span>
        </li>
      ))}
    </ul>
  );
}

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
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, fontWeight: 800, letterSpacing: 2, color: 'var(--purple-glow)' }}>
            📋 PATCH NOTES
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PATCH_NOTES.map((entry, i) => (
            <div key={i} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{entry.title}</div>
                <div style={{ fontFamily: 'var(--f-num)', fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>{entry.date}</div>
              </div>
              {entry.changes && <ChangeList changes={entry.changes} />}
              {entry.sections && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {entry.sections.map((s, si) => (
                    <div key={si} style={{ borderRadius: 8, background: 'rgba(255,255,255,0.025)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, fontFamily: 'var(--f-title)', fontSize: 14, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--purple-glow)' }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>{s.title}
                      </div>
                      <ChangeList changes={s.changes} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
