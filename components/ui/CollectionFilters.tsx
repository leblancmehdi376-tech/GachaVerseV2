'use client';

import { AFFINITY_CONFIG, AFFINITY_ORDER, type Affinity } from '@/lib/game/affinities';
import { RARITY_CONFIG, type Rarity } from '@/types/game';

export const COLLECTION_RARITY_ORDER: Rarity[] = ['C', 'U', 'R', 'E', 'L', 'M', 'S', 'CO', 'P', 'T'];

export type CollectionFilterMode = Rarity | 'all' | 'owned' | 'missing';
export type CollectionAffinityMode = Affinity | 'all';
export type CollectionSortMode = 'rarity' | 'dps_desc' | 'dps_asc' | 'name';

export const COLLECTION_SORT_LABELS: Record<CollectionSortMode, string> = {
  rarity: 'RARETÉ',
  dps_desc: 'DPS ↓',
  dps_asc: 'DPS ↑',
  name: 'NOM A→Z',
};

export function CollectionFilters({
  filter,
  onFilterChange,
  universe,
  onUniverseChange,
  affinity,
  onAffinityChange,
  sort,
  onSortChange,
  universes,
}: {
  filter: CollectionFilterMode;
  onFilterChange: (value: CollectionFilterMode) => void;
  universe: string | 'all';
  onUniverseChange: (value: string | 'all') => void;
  affinity: CollectionAffinityMode;
  onAffinityChange: (value: CollectionAffinityMode) => void;
  sort: CollectionSortMode;
  onSortChange: (value: CollectionSortMode) => void;
  universes: string[];
}) {
  const FilterBtn = ({ k, label, accent }: { k: CollectionFilterMode; label: string; accent?: string }) => (
    <button
      key={k}
      onClick={() => onFilterChange(k)}
      style={{
        padding: '3px 10px',
        borderRadius: '7px',
        cursor: 'pointer',
        fontFamily: 'var(--f-ui)',
        fontWeight: 700,
        fontSize: '12px',
        letterSpacing: '0.5px',
        transition: 'all 0.15s',
        background: filter === k ? `${accent ?? '#60a5fa'}18` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${filter === k ? `${accent ?? '#60a5fa'}55` : 'var(--border)'}`,
        color: filter === k ? (accent ?? '#60a5fa') : 'var(--text-dim)',
      }}
    >
      {label}
    </button>
  );

  const filterLabel = filter === 'all' ? 'Tous' : filter === 'owned' ? 'Possédés' : filter === 'missing' ? 'Manquants' : RARITY_CONFIG[filter].label;
  const universeLabel = universe === 'all' ? 'Tous' : universe;
  const affinityLabel = affinity === 'all' ? 'Tous' : AFFINITY_CONFIG[affinity].label;

  return (
    <details style={{ marginBottom: '10px' }}>
      <summary style={{
        cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        padding: '5px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px',
        fontFamily: 'var(--f-ui)', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.5px',
      }}>
        ▾ FILTRES &amp; TRI
        <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
          {filterLabel} · {universeLabel} · {affinityLabel} · {COLLECTION_SORT_LABELS[sort]}
        </span>
      </summary>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginRight: '2px' }}>FILTRE</span>
          <FilterBtn k="all" label="TOUS" />
          <FilterBtn k="owned" label="✓ POSSÉDÉS" accent="#4ade80" />
          <FilterBtn k="missing" label="🔒 MANQUANTS" accent="#f87171" />
          <div style={{ width: '1px', height: '18px', background: 'var(--border)', margin: '0 3px' }} />
          {COLLECTION_RARITY_ORDER.map(r => {
            const c = RARITY_CONFIG[r];
            return <FilterBtn key={r} k={r} label={c.label} accent={c.color} />;
          })}
        </div>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginRight: '2px' }}>UNIVERS</span>
          <button
            onClick={() => onUniverseChange('all')}
            style={{
              padding: '3px 9px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily: 'var(--f-ui)',
              fontWeight: 700,
              fontSize: '12px',
              background: universe === 'all' ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${universe === 'all' ? 'rgba(192,132,252,0.4)' : 'var(--border)'}`,
              color: universe === 'all' ? 'var(--purple-glow)' : 'var(--text-dim)',
            }}
          >
            TOUS
          </button>
          {universes.map(u => (
            <button
              key={u}
              onClick={() => onUniverseChange(u)}
              style={{
                padding: '3px 9px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontFamily: 'var(--f-ui)',
                fontWeight: 700,
                fontSize: '12px',
                background: universe === u ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${universe === u ? 'rgba(192,132,252,0.4)' : 'var(--border)'}`,
                color: universe === u ? 'var(--purple-glow)' : 'var(--text-dim)',
              }}
            >
              {u}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginRight: '2px' }}>TYPE</span>
          <button
            onClick={() => onAffinityChange('all')}
            style={{
              padding: '3px 9px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontFamily: 'var(--f-ui)',
              fontWeight: 700,
              fontSize: '12px',
              background: affinity === 'all' ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${affinity === 'all' ? 'rgba(34,211,238,0.4)' : 'var(--border)'}`,
              color: affinity === 'all' ? '#67e8f9' : 'var(--text-dim)',
            }}
          >
            TOUS
          </button>
          {AFFINITY_ORDER.map(a => {
            const c = AFFINITY_CONFIG[a];
            return (
              <button
                key={a}
                onClick={() => onAffinityChange(a)}
                style={{
                  padding: '3px 9px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  fontFamily: 'var(--f-ui)',
                  fontWeight: 700,
                  fontSize: '12px',
                  background: affinity === a ? `${c.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${affinity === a ? `${c.color}66` : 'var(--border)'}`,
                  color: affinity === a ? c.color : 'var(--text-dim)',
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '1px', marginRight: '2px' }}>TRI</span>
          {(Object.keys(COLLECTION_SORT_LABELS) as CollectionSortMode[]).map(s => (
            <button
              key={s}
              onClick={() => onSortChange(s)}
              style={{
                padding: '3px 9px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontFamily: 'var(--f-ui)',
                fontWeight: 700,
                fontSize: '12px',
                background: sort === s ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${sort === s ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                color: sort === s ? '#fbbf24' : 'var(--text-dim)',
              }}
            >
              {COLLECTION_SORT_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
