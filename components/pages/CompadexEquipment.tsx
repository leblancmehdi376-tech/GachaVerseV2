'use client';
// Onglet « Équipement » du Compadex (rendu dans CollectionPage). Composant à
// part avec son propre sélecteur de store : l'onglet Personnages ne se
// re-rend plus à chaque drop d'équipement (equipmentInventory).
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { EQUIPMENT_DEFS, type EquipmentDef } from '@/lib/game/items';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { EquipmentIcon } from '@/components/ui/EquipmentIcon';
import { SearchIcon } from '@/components/ui/CollectionFilters';
import { COLLECTION_RARITY_ORDER, normalizeSearch, type CollectionStatus } from '@/lib/game/collectionFilters';
import { EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, RARITY_CONFIG, type EquipmentSlot, type Rarity } from '@/types/game';

// ─── Données statiques (calculées une seule fois, EQUIPMENT_DEFS ne change pas) ──

const TPL_NAMES = new Map(CHARACTER_POOL.map(c => [c.id, c.name]));

/** Rareté de l'objet, typée (repli sur Commun si une def a une rareté inconnue). */
export function equipRarity(item: EquipmentDef): Rarity {
  return item.rarity in RARITY_CONFIG ? item.rarity as Rarity : 'C';
}

/** Noms des personnages qui profitent du bonus perso de l'objet. */
export function equipBonusTargets(item: EquipmentDef): string[] {
  if (!item.bonusFor) return [];
  const ids = Array.isArray(item.bonusFor.templateId) ? item.bonusFor.templateId : [item.bonusFor.templateId];
  return ids.map(id => TPL_NAMES.get(id) ?? id);
}

// Tri fixe : plus rares d'abord, puis par emplacement, objets génériques avant
// les objets personnalisés (tri stable sur l'ordre de déclaration sinon).
const RARITY_DESC = COLLECTION_RARITY_ORDER.slice().reverse();
export const EQUIPMENT_LIST: EquipmentDef[] = Object.values(EQUIPMENT_DEFS).sort((a, b) =>
  RARITY_DESC.indexOf(equipRarity(a)) - RARITY_DESC.indexOf(equipRarity(b))
  || EQUIPMENT_SLOTS.indexOf(a.slot) - EQUIPMENT_SLOTS.indexOf(b.slot)
  || Number(!!a.bonusFor) - Number(!!b.bonusFor));

const SEARCH_KEYS = new Map(EQUIPMENT_LIST.map(item => [
  item.id, normalizeSearch([item.name, ...equipBonusTargets(item)].join(' ')),
]));

const fmtMult = (m: number) => `×${Number(m.toFixed(2))}`;

// ─── Filtres ──────────────────────────────────────────────────────────────

export interface EquipFilterState {
  search: string;
  status: CollectionStatus;
  slot: EquipmentSlot | 'all';
  rarity: Rarity | 'all';
  persoOnly: boolean;
}

export const DEFAULT_EQUIP_FILTERS: EquipFilterState = { search: '', status: 'all', slot: 'all', rarity: 'all', persoOnly: false };

/** `q` = recherche déjà normalisée (calculée une fois par rendu, pas par objet). */
export function matchesEquipmentFilters(item: EquipmentDef, seen: boolean, f: EquipFilterState, q = normalizeSearch(f.search)): boolean {
  if (f.status === 'owned' && !seen) return false;
  if (f.status === 'missing' && seen) return false;
  if (f.slot !== 'all' && item.slot !== f.slot) return false;
  if (f.rarity !== 'all' && equipRarity(item) !== f.rarity) return false;
  if (f.persoOnly && !item.bonusFor) return false;
  if (q && !(SEARCH_KEYS.get(item.id) ?? normalizeSearch(item.name)).includes(q)) return false;
  return true;
}

const STATUSES: { key: Exclude<CollectionStatus, 'all'>; label: string; color: string; glow: string }[] = [
  { key: 'owned',   label: '✓ OBTENUS',   color: '#4ade80', glow: '#16a34a' },
  { key: 'missing', label: '❌ MANQUANTS', color: '#f87171', glow: '#dc2626' },
];
const PERSO_COLOR = '#fbbf24';
const SLOT_COLOR = '#22d3ee';
const SECTION_LABEL: CSSProperties = { fontFamily: 'var(--f-ui)', fontSize: '14px', fontWeight: 700, letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '7px' };

function bevelStyle(on: boolean, color: string, glow: string): CSSProperties {
  return {
    background: on ? `linear-gradient(135deg, ${color}, ${glow})` : `${color}14`,
    color: on ? '#0a0818' : color, boxShadow: on ? `0 0 16px ${glow}` : 'none',
  };
}

function Pill({ color, onRemove, children }: { color: string; onRemove: () => void; children: ReactNode }) {
  return (
    <span className="cf-pill" style={{ background: `${color}1a`, border: `1px solid ${color}66`, color }}>
      {children}
      <button type="button" onClick={onRemove} aria-label="Retirer ce filtre" style={{ background: `${color}33`, color }}>✕</button>
    </span>
  );
}

// Même grammaire visuelle que CollectionFilters (barre compacte + panneau
// dépliable), mais avec les critères propres à l'équipement.
function EquipFilters({ f, set }: { f: EquipFilterState; set: (patch: Partial<EquipFilterState>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = f.status !== 'all' ? STATUSES.find(s => s.key === f.status) : undefined;
  const activeCount = (f.status !== 'all' ? 1 : 0) + (f.slot !== 'all' ? 1 : 0) + (f.rarity !== 'all' ? 1 : 0) + (f.persoOnly ? 1 : 0);

  return (
    <div className="cf-frame eq-filters" style={{ marginBottom: '10px' }}>
      <div className="cf-frame__inner" style={{ padding: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="cf-search" style={{ flex: '1 1 180px', maxWidth: '320px' }}>
            <SearchIcon />
            <input value={f.search} onChange={e => set({ search: e.target.value })} placeholder="Objet ou personnage…" aria-label="Rechercher un équipement" />
            {f.search && <button type="button" className="cf-search__clear" onClick={() => set({ search: '' })} aria-label="Effacer la recherche">✕</button>}
          </div>

          {status && <Pill color={status.color} onRemove={() => set({ status: 'all' })}>{status.label}</Pill>}
          {f.slot !== 'all' && <Pill color={SLOT_COLOR} onRemove={() => set({ slot: 'all' })}>{EQUIPMENT_SLOT_LABELS[f.slot]}</Pill>}
          {f.rarity !== 'all' && <Pill color={RARITY_CONFIG[f.rarity].color} onRemove={() => set({ rarity: 'all' })}>{RARITY_CONFIG[f.rarity].label}</Pill>}
          {f.persoOnly && <Pill color={PERSO_COLOR} onRemove={() => set({ persoOnly: false })}>⭐ Personnalisés</Pill>}

          <div style={{ flex: 1 }} />
          <button type="button" className="cf-press cf-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
            style={{ background: expanded ? 'rgba(147,51,234,0.25)' : 'rgba(147,51,234,0.1)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M3 4h18l-7 8v6l-4 2v-8z" /></svg>
            FILTRES
            {activeCount > 0 && <span className="cf-toggle__badge">{activeCount}</span>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateRows: expanded ? '1fr' : '0fr', transition: 'grid-template-rows .25s ease' }}>
          <div style={{ overflow: 'hidden', minHeight: 0 }} inert={!expanded}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px 4px 6px' }}>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(192,132,252,0.5), transparent)' }} />

              <div>
                <div style={SECTION_LABEL}>STATUT</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button key={s.key} type="button" className="cf-press cf-bevel" aria-pressed={f.status === s.key}
                      onClick={() => set({ status: f.status === s.key ? 'all' : s.key })} style={bevelStyle(f.status === s.key, s.color, s.glow)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={SECTION_LABEL}>TYPE</div>
                <button type="button" className="cf-press cf-bevel" aria-pressed={f.persoOnly}
                  onClick={() => set({ persoOnly: !f.persoOnly })} style={bevelStyle(f.persoOnly, PERSO_COLOR, '#f59e0b')}>
                  ⭐ PERSONNALISÉS
                </button>
              </div>

              <div>
                <div style={SECTION_LABEL}>EMPLACEMENT</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {EQUIPMENT_SLOTS.map(slot => (
                    <button key={slot} type="button" className="cf-press cf-bevel" aria-pressed={f.slot === slot}
                      onClick={() => set({ slot: f.slot === slot ? 'all' : slot })} style={bevelStyle(f.slot === slot, SLOT_COLOR, '#0891b2')}>
                      {EQUIPMENT_SLOT_LABELS[slot].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={SECTION_LABEL}>RARETÉ</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {COLLECTION_RARITY_ORDER.map(r => {
                    const c = RARITY_CONFIG[r];
                    return (
                      <button key={r} type="button" className="cf-press cf-bevel" aria-pressed={f.rarity === r}
                        onClick={() => set({ rarity: f.rarity === r ? 'all' : r })} style={bevelStyle(f.rarity === r, c.color, c.glow)}>
                        {c.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Carte ────────────────────────────────────────────────────────────────

// Au scope module et mémoïsée : props primitives/stables, seule la carte dont
// le stock change se re-rend lors d'un drop.
const EquipCard = memo(function EquipCard({ item, stock, seen, onSelect }: {
  item: EquipmentDef; stock: number; seen: boolean; onSelect: (id: string) => void;
}) {
  const rarity = equipRarity(item);
  const targets = equipBonusTargets(item);
  const state = stock > 0 ? 'is-owned' : seen ? 'is-seen' : 'is-locked';
  return (
    <button type="button" className={`equip-card ${state}`} onClick={() => onSelect(item.id)}
      style={{ ['--accent' as string]: RARITY_CONFIG[rarity].color } as CSSProperties}>
      <span className="equip-card__body">
        <span className="equip-card__head">
          <span className="equip-card__icon">
            <EquipmentIcon item={item} size={40} className="equip-card__glyph" />
            {!seen && <span className="equip-card__lock" aria-hidden>🔒</span>}
          </span>
          <span className="equip-card__info">
            <span className="equip-card__name">{item.name}</span>
            <span className="equip-card__meta">
              <RarityBadge rarity={rarity} />
              <span className="equip-chip">{EQUIPMENT_SLOT_LABELS[item.slot]}</span>
            </span>
          </span>
        </span>
        {/* Ligne DPS + statut identique sur toutes les cartes ; le bonus perso
            (longueur variable) passe toujours sur sa propre ligne en dessous. */}
        <span className="equip-card__foot">
          <span className="equip-stat">DPS {fmtMult(item.dpsMultiplier)}</span>
          <span className={`equip-status equip-status--${stock > 0 ? 'owned' : seen ? 'seen' : 'locked'}`}>
            {stock > 0 ? `×${stock}` : seen ? '🕓 Déjà obtenu' : '🔒 Jamais obtenu'}
          </span>
        </span>
        {item.bonusFor && (
          <span className="equip-stat equip-stat--perso">⭐ {fmtMult(item.bonusFor.multiplier)} avec {targets.join(', ')}</span>
        )}
      </span>
    </button>
  );
});

// ─── Modale de détail ─────────────────────────────────────────────────────

function EquipDetailModal({ item, stock, seen, onClose }: { item: EquipmentDef; stock: number; seen: boolean; onClose: () => void }) {
  const rarity = equipRarity(item);
  const cfg = RARITY_CONFIG[rarity];
  const targets = equipBonusTargets(item);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const statBox = (label: string, value: string, color = 'var(--text)') => (
    <div className="panel" style={{ padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 18, color }}>{value}</div>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={item.name}
      style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ width: '100%', maxWidth: 440, maxHeight: '85dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderColor: `${cfg.color}44` }}>
        <div style={{ padding: '8px 8px 8px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: cfg.color, letterSpacing: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{item.name}</div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            style={{ width: 44, height: 44, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 22 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className={`equip-card__icon equip-card__icon--lg${seen ? '' : ' is-locked'}`} style={{ ['--accent' as string]: cfg.color } as CSSProperties}>
              <EquipmentIcon item={item} size={68} className="equip-card__glyph" />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <RarityBadge rarity={rarity} />
            <span className="equip-chip">{EQUIPMENT_SLOT_LABELS[item.slot]}</span>
            {item.bonusFor && <span className="equip-chip" style={{ color: PERSO_COLOR, borderColor: `${PERSO_COLOR}55` }}>⭐ Personnalisé</span>}
          </div>

          {/* Certaines descriptions ne font que répéter le bonus perso, déjà détaillé plus bas. */}
          {item.description.replace(/\.$/, '') !== item.bonusFor?.description && (
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, textAlign: 'center' }}>{item.description}</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {statBox('Bonus DPS', fmtMult(item.dpsMultiplier), 'var(--green)')}
            {statBox('En stock', String(stock), stock > 0 ? 'var(--green)' : 'var(--text-muted)')}
          </div>

          {item.bonusFor && (
            <div style={{ padding: '10px 12px', borderRadius: 12, background: `${PERSO_COLOR}12`, border: `1px solid ${PERSO_COLOR}40`, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: PERSO_COLOR, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Bonus perso {fmtMult(item.bonusFor.multiplier)}
              </div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                Multiplie encore le DPS si équipé par <strong>{targets.join(' ou ')}</strong>.
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', fontFamily: 'var(--f-ui)', fontSize: 14, color: stock > 0 ? '#4ade80' : 'var(--text-muted)' }}>
            {stock > 0 ? `✓ ${stock} en inventaire` : seen ? '🕓 Déjà obtenu par le passé — aucun en inventaire' : '🔒 Équipement jamais obtenu'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vue principale ───────────────────────────────────────────────────────

export function CompadexEquipment() {
  const { seenMap, inventory } = useGameStore(useShallow(s => ({
    seenMap: s.compadexEquipmentSeen,
    inventory: s.equipmentInventory,
  })));
  const [f, setF] = useState<EquipFilterState>(DEFAULT_EQUIP_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(null);
  const set = (patch: Partial<EquipFilterState>) => setF(prev => ({ ...prev, ...patch }));

  // Ne dépend pas du stock : un drop ne relance pas le filtrage/groupage.
  const groups = useMemo(() => {
    const q = normalizeSearch(f.search);
    const map = new Map<Rarity, { items: EquipmentDef[]; seen: number; total: number }>();
    for (const item of EQUIPMENT_LIST) {
      const r = equipRarity(item);
      let g = map.get(r);
      if (!g) map.set(r, g = { items: [], seen: 0, total: 0 });
      const seen = !!seenMap[item.id];
      g.total++;
      if (seen) g.seen++;
      if (matchesEquipmentFilters(item, seen, f, q)) g.items.push(item);
    }
    return RARITY_DESC.flatMap(r => {
      const g = map.get(r);
      return g && g.items.length > 0 ? [{ rarity: r, ...g }] : [];
    });
  }, [seenMap, f]);

  const detail = detailId ? EQUIPMENT_DEFS[detailId] : undefined;
  // Stable : la modale s'abonne à Échap dans un effet dépendant de onClose.
  const closeDetail = useCallback(() => setDetailId(null), []);

  return (
    <>
      <EquipFilters f={f} set={set} />

      {groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontFamily: 'var(--f-ui)', fontSize: '16px' }}>
          Aucun équipement ne correspond à ces filtres.
        </div>
      )}

      {groups.map(g => {
        const cfg = RARITY_CONFIG[g.rarity];
        return (
          <div key={g.rarity} className="collection-group">
            <div className="collection-group__header" style={{ ['--accent' as string]: cfg.color } as CSSProperties}>
              <span>{cfg.label.toUpperCase()}</span>
              <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--f-num)' }}>({g.seen}/{g.total})</span>
            </div>
            <div className="equip-grid">
              {g.items.map(item => (
                <EquipCard key={item.id} item={item} stock={inventory[item.id] ?? 0} seen={!!seenMap[item.id]} onSelect={setDetailId} />
              ))}
            </div>
          </div>
        );
      })}

      {detail && (
        <EquipDetailModal item={detail} stock={inventory[detail.id] ?? 0} seen={!!seenMap[detail.id]} onClose={closeDetail} />
      )}
    </>
  );
}
