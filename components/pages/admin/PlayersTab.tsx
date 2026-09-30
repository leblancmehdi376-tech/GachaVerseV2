'use client';
import { useMemo, useState } from 'react';
import { PlayerRow } from '@/lib/firebase/accessRequests';
import { PlayerSaveSummary } from '@/lib/firebase/adminTools';
import { formatNumber } from '@/lib/game/format';
import { bnToNumber } from '@/lib/game/bignum';
import { PlayerEditor } from './PlayerEditor';
import { Empty, TextInput, cx } from './ui';

type SortKey = 'createdAt' | 'nekoGems' | 'pixelCoins' | 'palier' | 'prestigeLevel' | 'totalGemsSpent';

const SORT_LABELS: Record<SortKey, string> = {
  createdAt:      'Inscription',
  nekoGems:       '💎 Gemmes',
  pixelCoins:     '🪙 Coins',
  palier:         '⛰️ Palier',
  prestigeLevel:  '✨ Prestige',
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-white/65">🔎</span>
          <TextInput
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par pseudo, email ou id de save…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <span className="shrink-0 text-sm font-semibold uppercase tracking-wide text-white/70">Trier</span>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {(Object.keys(SORT_LABELS) as SortKey[]).map(key => {
                const active = sortKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSort(key)}
                    aria-pressed={active}
                    className={cx(
                      'min-h-10 shrink-0 cursor-pointer rounded-lg border px-3 text-sm font-bold whitespace-nowrap transition-colors',
                      active ? 'border-sky-400/50 bg-sky-400/15 text-sky-300' : 'border-white/20 bg-white/[0.02] text-white/75 hover:text-white/90',
                    )}
                  >
                    {SORT_LABELS[key]}{active ? (sortDesc ? ' ↓' : ' ↑') : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-sm text-white/70">{rows.length} / {players.length} joueur(s) · clique pour ouvrir la fiche</span>
        </div>
      </div>

      {rows.length === 0 && <Empty>Aucun joueur trouvé.</Empty>}

      <div className="flex flex-col gap-2">
        {rows.map(u => {
          const isOpen = expandedUid === u.uid;
          return (
            <div key={u.uid} className={cx(
              'overflow-hidden rounded-2xl border transition-colors',
              isOpen ? 'border-amber-400/40 bg-white/[0.035]' : 'border-white/15 bg-white/[0.02] hover:border-sky-400/30',
            )}>
              <button
                type="button"
                onClick={() => setExpandedUid(isOpen ? null : u.uid)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer flex-col gap-3 px-3 py-3 text-left sm:flex-row sm:items-center sm:gap-4 sm:px-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span aria-hidden className={cx(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-base font-black',
                    u.approved ? 'bg-sky-400/15 text-sky-300' : 'bg-amber-400/15 text-amber-300',
                  )}>
                    {(u.username || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-bold text-white">{u.username || '(sans pseudo)'}</span>
                      <span className={cx(
                        'shrink-0 rounded-full px-2 py-0.5 text-sm font-bold',
                        u.approved ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300',
                      )}>
                        {u.approved ? '✓ Validé' : '⏳ En attente'}
                      </span>
                    </div>
                    <div className="truncate text-sm text-white/75">{u.email}</div>
                  </div>
                  <span aria-hidden className={cx('shrink-0 text-white/70 transition-transform sm:order-last', isOpen && 'rotate-90')}>▸</span>
                </div>
                {u.save ? (
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm tabular-nums sm:flex sm:shrink-0 sm:items-center sm:gap-4">
                    <span className="whitespace-nowrap text-amber-300" title="Pixel-Coins">🪙 {formatNumber(u.save.pixelCoins)}</span>
                    <span className="whitespace-nowrap text-violet-300" title="Neko-Gemmes">💎 {formatNumber(u.save.nekoGems)}</span>
                    <span className="whitespace-nowrap text-cyan-300" title="Palier">⛰️ {u.save.palier}</span>
                    <span className="whitespace-nowrap text-fuchsia-300" title="Prestiges effectués">✨ {u.save.prestigeLevel}</span>
                    <span className="whitespace-nowrap text-amber-200" title="Jetons de prestige disponibles">🎫 {formatNumber(u.save.prestigeTokens)}</span>
                    <span className="whitespace-nowrap text-white/65" title="Dernière sauvegarde">
                      🕒 {u.save.lastSaved ? new Date(u.save.lastSaved).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-white/60 sm:shrink-0">Jamais joué</span>
                )}
              </button>
              {isOpen && (
                <div className="border-t border-white/15 p-2 sm:p-3">
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
    </div>
  );
}
