'use client';
import { AccessRequest } from '@/lib/firebase/accessRequests';

interface RequestsTabProps {
  pending: AccessRequest[];
  approvedList: AccessRequest[];
  busy: string | null;
  onApprove: (uid: string) => void;
}

export function RequestsTab({ pending, approvedList, busy, onApprove }: RequestsTabProps) {
  return (
    <>
      <h2 style={{ color: '#fbbf24', fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>En attente</h2>
      {pending.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.4, marginBottom: 24 }}>Aucune demande en attente.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {pending.map(r => (
          <div key={r.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14.4 }}>{r.username}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.4, marginTop: 2 }}>{r.email}</div>
              <div style={{ color: '#7289da', fontSize: 12.4, marginTop: 2 }}>Discord : {r.discordUsername}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                Demandé le {new Date(r.createdAt).toLocaleString('fr-FR')}
              </div>
            </div>
            <button onClick={() => onApprove(r.uid)} disabled={busy === r.uid} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)', color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: 12.4, whiteSpace: 'nowrap' }}>
              {busy === r.uid ? '...' : '✓ Valider'}
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ color: '#4ade80', fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>Déjà validés ({approvedList.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {approvedList.map(r => (
          <div key={r.uid} style={{ display: 'flex', gap: 12, padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', fontSize: 12.4 }}>
            <span style={{ color: '#fff', fontWeight: 700, minWidth: 140 }}>{r.username}</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.email}</span>
            <span style={{ color: '#7289da' }}>{r.discordUsername}</span>
          </div>
        ))}
      </div>
    </>
  );
}
