'use client';
import { AccessRequest } from '@/lib/firebase/accessRequests';
import { Button, Card, Empty, SectionHeader } from './ui';

interface RequestsTabProps {
  pending: AccessRequest[];
  approvedList: AccessRequest[];
  busy: string | null;
  onApprove: (uid: string) => void;
}

export function RequestsTab({ pending, approvedList, busy, onApprove }: RequestsTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <Card tone={pending.length > 0 ? 'amber' : undefined}>
        <SectionHeader icon="⏳" title={`En attente (${pending.length})`} subtitle="Du plus ancien au plus récent." />
        {pending.length === 0 ? (
          <Empty>Aucune demande en attente.</Empty>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map(r => (
              <div key={r.uid} className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-bold text-white">{r.username}</div>
                  <div className="truncate text-sm text-white/75">{r.email}</div>
                  <div className="truncate text-sm text-[#b4c0ff]">Discord : {r.discordHandle}</div>
                  <div className="mt-1 text-sm text-white/65">Demandé le {new Date(r.createdAt).toLocaleString('fr-FR')}</div>
                </div>
                <Button tone="green" onClick={() => onApprove(r.uid)} disabled={busy === r.uid} className="w-full sm:w-auto">
                  {busy === r.uid ? '…' : '✓ Valider'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader icon="✅" title={`Déjà validés (${approvedList.length})`} />
        {approvedList.length === 0 ? (
          <Empty>Aucun compte validé.</Empty>
        ) : (
          <div className="flex flex-col divide-y divide-white/15">
            {approvedList.map(r => (
              <div key={r.uid} className="grid grid-cols-1 gap-x-4 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
                <span className="truncate font-bold text-white">{r.username}</span>
                <span className="truncate text-white/75">{r.email}</span>
                <span className="truncate text-[#b4c0ff]">{r.discordHandle}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
