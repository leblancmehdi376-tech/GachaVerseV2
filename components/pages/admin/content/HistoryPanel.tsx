'use client';
import { useEffect, useState } from 'react';
import { emptyContent, type ContentOverrides } from '@/lib/game/content/schema';
import { listHistory, summarizeContent } from '@/lib/game/content/store';
import { Button, Empty } from '../ui';

const formatDate = (t: number) => new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

// Versions publiées, avec la possibilité d'en republier une ancienne (ou de
// revenir au contenu du code) : c'est le moyen d'annuler une publication.
export function HistoryPanel({ liveVersion, busy, onRestore }: {
  liveVersion: number;
  busy: boolean;
  onRestore: (c: ContentOverrides, label: string) => void;
}) {
  const [history, setHistory] = useState<ContentOverrides[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listHistory()
      .then(h => { if (!cancelled) setHistory(h); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [liveVersion]);

  if (error) return <p className="text-sm text-red-300">❌ Historique illisible : {error}</p>;
  if (!history) return <p className="text-sm text-white/75">Chargement de l&apos;historique…</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-white/75">
        Restaurer une version la republie sous un nouveau numéro : les joueurs la reçoivent à leur prochain lancement.
        L&apos;historique, lui, n&apos;est jamais effacé.
      </p>
      {history.length === 0 && <Empty>Aucune version publiée pour l&apos;instant.</Empty>}
      <div className="overflow-hidden rounded-xl border border-white/15">
        {history.map(v => (
          <div key={v.version} className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2.5 last:border-b-0 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-white">
                Version {v.version}
                {v.version === liveVersion && <span className="ml-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-sm font-bold text-emerald-300">En ligne</span>}
              </div>
              <div className="text-sm text-white/70">{formatDate(v.publishedAt)} · {summarizeContent(v)}</div>
            </div>
            {v.version !== liveVersion && (
              <Button size="sm" tone="amber" disabled={busy} onClick={() => onRestore(v, `version ${v.version}`)}>Restaurer</Button>
            )}
          </div>
        ))}
        {liveVersion > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-white">Contenu du code</div>
              <div className="text-sm text-white/70">Annule toutes les modifications du configurateur</div>
            </div>
            <Button size="sm" tone="red" disabled={busy} onClick={() => onRestore(emptyContent(), 'contenu du code, sans aucune modification')}>Restaurer</Button>
          </div>
        )}
      </div>
    </div>
  );
}
