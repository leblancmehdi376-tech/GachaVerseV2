'use client';

// Barre de filtres repliable partagée par Compadex / Compagnons / Améliorations / Maîtrise.
// Fermée : recherche, pastilles des filtres actifs et tri. Le bouton FILTRES
// déplie le panneau complet. Recliquer un choix actif le retire ; aucun choix
// = « tous ». La sélection vit dans le store (collectionFilters), donc elle est
// commune à toutes ces pages et survit aux changements de page.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useGameStore } from '@/store/gameStore';
import { AFFINITY_CONFIG, AFFINITY_ORDER, type Affinity } from '@/lib/game/affinities';
import { SYNERGIES } from '@/lib/game/synergies';
import { RARITY_CONFIG, type Rarity } from '@/types/game';
import {
  COLLECTION_RARITY_ORDER, countActiveFilters, normalizeSearch,
  type CollectionSortKey, type CollectionStatus,
} from '@/lib/game/collectionFilters';

const SORTS: { key: CollectionSortKey; label: string; natural: string; reversed: string }[] = [
  { key: 'rarity', label: 'RARETÉ', natural: 'Plus rares d’abord',  reversed: 'Plus communs d’abord' },
  { key: 'dps',    label: 'DPS',    natural: 'Plus forts d’abord',  reversed: 'Plus faibles d’abord' },
  { key: 'mastery', label: 'MAÎTRISE', natural: 'Plus maîtrisés d’abord', reversed: 'Moins maîtrisés d’abord' },
  { key: 'name',   label: 'NOM',    natural: 'A → Z',               reversed: 'Z → A' },
];
const SORT_W = 68;

const STATUSES: { key: Exclude<CollectionStatus, 'all'>; label: string; color: string; glow: string }[] = [
  { key: 'owned',   label: '✓ POSSÉDÉS',  color: '#4ade80', glow: '#16a34a' },
  { key: 'missing', label: '❌ MANQUANTS', color: '#f87171', glow: '#dc2626' },
];

const SECTION_LABEL: CSSProperties = { fontFamily: 'var(--f-ui)', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '7px' };

// ─── Briques ──────────────────────────────────────────────────────────────

/** Icône de synergie de l'univers (sprite, repli sur l'emoji), ou 🌐 sans synergie. */
export function UniverseIcon({ universe, size = 16 }: { universe: string | 'all'; size?: number }) {
  const def = universe === 'all' ? undefined : SYNERGIES.find(s => s.universe === universe);
  const [broken, setBroken] = useState(false);
  const box: CSSProperties = { width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.75 };
  if (!def) return <span style={box}>🌐</span>;
  if (broken) return <span style={box}>{def.icon}</span>;
  return (
    <span style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/sprites/synergies/${def.id}.webp`} alt="" onError={() => setBroken(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 2 }} />
    </span>
  );
}

function Gem({ r, size = 9 }: { r: Rarity; size?: number }) {
  const c = RARITY_CONFIG[r];
  return <span style={{ width: size, height: size, flexShrink: 0, transform: 'rotate(45deg)', borderRadius: '2px', background: `linear-gradient(135deg, ${c.color}, ${c.glow})`, boxShadow: `0 0 6px ${c.glow}` }} />;
}

/** Pastille d'un filtre actif, le ✕ le retire. */
function Pill({ color, onRemove, children }: { color: string; onRemove: () => void; children: ReactNode }) {
  return (
    <span className="cf-pill" style={{ background: `${color}1a`, border: `1px solid ${color}66`, color }}>
      {children}
      <button type="button" onClick={onRemove} aria-label="Retirer ce filtre" style={{ background: `${color}33`, color }}>✕</button>
    </span>
  );
}

function SortSegment({ sortKey, reversed, onChange }: { sortKey: CollectionSortKey; reversed: boolean; onChange: (key: CollectionSortKey, reversed: boolean) => void }) {
  const idx = Math.max(0, SORTS.findIndex(s => s.key === sortKey));
  const cur = SORTS[idx];
  return (
    // Colonnes de SORT_W px sur desktop, qui rétrécissent (minmax(0, …)) sur
    // téléphone au lieu de pousser le bouton ↓ hors de l'écran ; la pastille
    // est positionnée en % pour rester alignée quelle que soit la largeur.
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 1 auto', minWidth: 0 }}>
      <div className="cf-segment" style={{ display: 'grid', gridTemplateColumns: `repeat(${SORTS.length}, minmax(0, ${SORT_W}px))`, minWidth: 0 }}>
        <div className="cf-segment__thumb" style={{ left: `calc(3px + ${idx} * (100% - 6px) / ${SORTS.length})`, width: `calc((100% - 6px) / ${SORTS.length})` }} />
        {SORTS.map(s => (
          <button key={s.key} type="button" onClick={() => onChange(s.key, s.key === sortKey ? reversed : false)}
            style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: s.key === sortKey ? '#fbbf24' : 'var(--text-dim)' }}>
            {s.label}
          </button>
        ))}
      </div>
      <button type="button" className="cf-sort-dir" onClick={() => onChange(sortKey, !reversed)}
        title={reversed ? cur.reversed : cur.natural} aria-label={`Inverser le tri (${reversed ? cur.reversed : cur.natural})`}
        style={{ flexShrink: 0, transform: reversed ? 'rotate(180deg)' : 'none' }}>
        ↓
      </button>
    </div>
  );
}

function UniverseDropdown({ universes, value, onChange }: { universes: string[]; value: string | 'all'; onChange: (u: string | 'all') => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const q = normalizeSearch(query);
  const list = q ? universes.filter(u => normalizeSearch(u).includes(q)) : universes;
  const active = value !== 'all';
  const pick = (u: string | 'all') => { onChange(u === value ? 'all' : u); setOpen(false); };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="cf-press cf-drop" onClick={() => setOpen(!open)} style={{
        background: open || active ? 'linear-gradient(135deg, rgba(192,132,252,0.18), transparent)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${open ? 'rgba(192,132,252,0.7)' : active ? 'rgba(192,132,252,0.45)' : 'var(--border-lit)'}`,
        boxShadow: open ? '0 0 12px rgba(147,51,234,0.3)' : 'none',
      }}>
        <UniverseIcon universe={value} size={18} />
        <span style={{ color: active ? 'var(--purple-glow)' : 'var(--text-sub)' }}>{active ? value : 'Tous les univers'}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div className="cf-pop cf-frame" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, width: '260px' }}>
          <div className="cf-frame__inner" style={{ padding: '8px' }}>
            <div className="cf-search" style={{ marginBottom: '6px' }}>
              <SearchIcon />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher un univers…" />
            </div>
            <div className="cf-scroll" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              <UniverseRow universe="all" label="Tous les univers" on={!active} onClick={() => pick('all')} />
              {list.map(u => <UniverseRow key={u} universe={u} label={u} on={value === u} onClick={() => pick(u)} />)}
              {list.length === 0 && <div style={{ padding: '8px', fontFamily: 'var(--f-ui)', fontSize: '14px', color: 'var(--text-muted)' }}>Aucun univers</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UniverseRow({ universe, label, on, onClick }: { universe: string | 'all'; label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="cf-universe-row" onClick={onClick} style={{
      background: on ? 'rgba(192,132,252,0.14)' : undefined, color: on ? 'var(--purple-glow)' : 'var(--text-sub)',
    }}>
      <UniverseIcon universe={universe} size={18} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {on && <span>✓</span>}
    </button>
  );
}

export function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--purple-glow)" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
    </svg>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────

export function CollectionFilters({ universes, showStatus = false }: {
  universes: string[];
  /** Filtre Possédés / Manquants — utile seulement dans le Compadex. */
  showStatus?: boolean;
}) {
  const f = useGameStore(s => s.collectionFilters);
  const set = useGameStore(s => s.setCollectionFilters);
  const [expanded, setExpanded] = useState(false);
  // overflow visible une fois le dépliage terminé, sinon le menu des univers serait rogné.
  const [settled, setSettled] = useState(false);

  const sortedUniverses = useMemo(() => [...universes].sort((a, b) => a.localeCompare(b)), [universes]);
  const activeCount = countActiveFilters(f, showStatus);

  const toggleStatus = (s: Exclude<CollectionStatus, 'all'>) => set({ status: f.status === s ? 'all' : s });
  const toggleRarity = (r: Rarity) => set({ rarity: f.rarity === r ? 'all' : r });
  const toggleAffinity = (a: Affinity) => set({ affinity: f.affinity === a ? 'all' : a });

  const toggleExpanded = () => { setSettled(false); setExpanded(!expanded); };

  const status = showStatus && f.status !== 'all' ? STATUSES.find(s => s.key === f.status) : undefined;

  return (
    <div className="cf-frame" style={{ marginBottom: '10px' }}>
      <div className="cf-frame__inner" style={{ padding: '8px' }}>
        {/* ── Barre compacte ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="cf-search" style={{ flex: '1 1 180px', maxWidth: '280px' }}>
            <SearchIcon />
            <input value={f.search} onChange={e => set({ search: e.target.value })} placeholder="Rechercher un personnage…" />
            {f.search && <button type="button" className="cf-search__clear" onClick={() => set({ search: '' })} aria-label="Effacer la recherche">✕</button>}
          </div>

          {status && <Pill color={status.color} onRemove={() => set({ status: 'all' })}>{status.label}</Pill>}
          {f.rarity !== 'all' && (
            <Pill color={RARITY_CONFIG[f.rarity].color} onRemove={() => set({ rarity: 'all' })}>
              <Gem r={f.rarity} /> {RARITY_CONFIG[f.rarity].label}
            </Pill>
          )}
          {f.affinity !== 'all' && (
            <Pill color={AFFINITY_CONFIG[f.affinity].color} onRemove={() => set({ affinity: 'all' })}>
              {AFFINITY_CONFIG[f.affinity].icon} {AFFINITY_CONFIG[f.affinity].label}
            </Pill>
          )}
          {f.universe !== 'all' && (
            <Pill color="#c084fc" onRemove={() => set({ universe: 'all' })}>
              <UniverseIcon universe={f.universe} size={14} /> {f.universe}
            </Pill>
          )}

          <div style={{ flex: 1 }} />
          <SortSegment sortKey={f.sortKey} reversed={f.sortReversed} onChange={(sortKey, sortReversed) => set({ sortKey, sortReversed })} />
          <button type="button" className="cf-press cf-toggle" onClick={toggleExpanded} aria-expanded={expanded}
            style={{ background: expanded ? 'rgba(147,51,234,0.25)' : 'rgba(147,51,234,0.1)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3 4h18l-7 8v6l-4 2v-8z" /></svg>
            FILTRES
            {activeCount > 0 && <span className="cf-toggle__badge">{activeCount}</span>}
          </button>
        </div>

        {/* ── Panneau dépliable ── */}
        <div
          style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: 'grid-template-rows .25s ease' }}
          onTransitionEnd={e => { if (e.target === e.currentTarget && expanded) setSettled(true); }}
        >
          <div style={{ overflow: expanded && settled ? 'visible' : 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 4px 6px' }}>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.5), transparent)' }} />

              {showStatus && (
                <div>
                  <div style={SECTION_LABEL}>STATUT</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {STATUSES.map(s => {
                      const on = f.status === s.key;
                      return (
                        <button key={s.key} type="button" className="cf-press cf-bevel" onClick={() => toggleStatus(s.key)} style={{
                          background: on ? `linear-gradient(135deg, ${s.color}, ${s.glow})` : `${s.color}14`,
                          color: on ? '#0a0818' : s.color, boxShadow: on ? `0 0 16px ${s.glow}` : 'none',
                        }}>{s.label}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div style={SECTION_LABEL}>RARETÉ</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLLECTION_RARITY_ORDER.map(r => {
                    const c = RARITY_CONFIG[r];
                    const on = f.rarity === r;
                    return (
                      <button key={r} type="button" className="cf-press cf-bevel" onClick={() => toggleRarity(r)} style={{
                        background: on ? `linear-gradient(135deg, ${c.color}, ${c.glow})` : `${c.color}14`,
                        color: on ? '#0a0818' : c.color, boxShadow: on ? `0 0 16px ${c.glow}` : 'none',
                      }}>{c.label.toUpperCase()}</button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={SECTION_LABEL}>TYPE</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {AFFINITY_ORDER.map(a => {
                    const c = AFFINITY_CONFIG[a];
                    const on = f.affinity === a;
                    return (
                      <button key={a} type="button" className="cf-press cf-bevel cf-bevel--icon" onClick={() => toggleAffinity(a)} style={{
                        background: on ? `linear-gradient(135deg, ${c.color}, ${c.glow})` : `${c.color}14`,
                        color: on ? '#0a0818' : c.color, boxShadow: on ? `0 0 16px ${c.glow}` : 'none',
                      }}>
                        <span aria-hidden>{c.icon}</span>
                        {c.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={SECTION_LABEL}>UNIVERS</div>
                <UniverseDropdown universes={sortedUniverses} value={f.universe} onChange={u => set({ universe: u })} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
