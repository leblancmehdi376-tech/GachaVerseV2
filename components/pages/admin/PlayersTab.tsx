'use client';
import { useMemo, useState } from 'react';
import { PlayerRow } from '@/lib/firebase/accessRequests';
import { PlayerSaveSummary } from '@/lib/firebase/adminTools';
import { formatNumber } from '@/lib/game/format';
import { bnToNumber } from '@/lib/game/bignum';
import { PlayerEditor } from './PlayerEditor';

type SortKey = 'createdAt' | 'nekoGems' | 'pixelCoins' | 'palier' | 'totalGemsSpent';

const SORT_LABELS: Record<SortKey, string> = {
  createdAt:      'Inscription',
  nekoGems:       '💎 Gemmes',
  pixelCoins:     '🪙 Coins',
  palier:         '⛰️ Palier',
  totalGemsSpent: 'Gemmes dépensées',
};

function sortValue(row: PlayerRow, key: SortKey): number {
  if (key === 'createdAt') return row.createdAt;
  if (key === 'pixelCoins') return row.save ? bnToNumber(row.save.pixelCoins) : -1;
  return row.save?.[key] ?? -1;
}

interface PlayersTabProps {
  players: PlayerRow[];
  onSaveUpdate: (uid: string, patch: Partial<PlayerSaveSummary>) => void;
}

export function PlayersTab({ players, onSaveUpdate }: PlayersTabProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q ? players : players.filter(u =>
      u.username?.toLowerCase().includes(q)
      || u.email?.toLowerCase().includes(q)
      || u.uid?.toLowerCase().includes(q)
    );
    return [...filtered].sort((a, b) => {
      const diff = sortValue(b, sortKey) - sortValue(a, sortKey);
      return sortDesc ? diff : -diff;
    });
  }, [players, search, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  };

  return (
    <>
      <h2 style={{ color: '#60a5fa', fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>Joueurs ({players.length})</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12.4, marginBottom: 14, lineHeight: 1.5 }}>
        Clique sur un joueur pour voir/modifier son solde, sa progression et sa collection.
      </p>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filtrer par pseudo, email ou id de save…"
        style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, marginBottom: 12, boxSizing: 'border-box' }}
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11.5 }}>Trier :</span>
        {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            style={{
              padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
              background: sortKey === key ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${sortKey === key ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: sortKey === key ? '#60a5fa' : 'rgba(255,255,255,0.5)',
            }}
          >
            {SORT_LABELS[key]}{sortKey === key ? (sortDesc ? ' ↓' : ' ↑') : ''}
          </button>
        ))}
      </div>

      {rows.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.4 }}>Aucun joueur trouvé.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(u => {
          const isOpen = expandedUid === u.uid;
          return (
            <div key={u.uid} style={{ borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isOpen ? 'rgba(251,191,36,0.4)' : 'rgba(96,165,250,0.18)'}` }}>
              <div
                onClick={() => setExpandedUid(isOpen ? null : u.uid)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', cursor: 'pointer' }}
              >
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{isOpen ? '▾' : '▸'}</span>
                <div style={{ minWidth: 160 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{u.username || '(sans pseudo)'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{u.email}</div>
                </div>
                <span style={{ color: u.approved ? '#4ade80' : '#fbbf24', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {u.approved ? '✓ Validé' : '⏳ En attente'}
                </span>
                {u.save ? (
                  <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fbbf24', fontSize: 12.4, whiteSpace: 'nowrap' }}>🪙 {formatNumber(u.save.pixelCoins)}</span>
                    <span style={{ color: '#c084fc', fontSize: 12.4, whiteSpace: 'nowrap' }}>💎 {formatNumber(u.save.nekoGems)}</span>
                    <span style={{ color: '#67e8f9', fontSize: 12.4, whiteSpace: 'nowrap' }}>⛰️ {u.save.palier}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                      {u.save.lastSaved ? new Date(u.save.lastSaved).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </div>
                ) : (
                  <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.25)', fontSize: 11.5 }}>Jamais joué</span>
                )}
              </div>
              {isOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  <PlayerEditor
                    key={u.uid}
                    uid={u.uid}
                    initialSave={u.save ?? null}
                    onSaveUpdate={patch => onSaveUpdate(u.uid, patch)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
