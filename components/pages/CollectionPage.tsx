'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CHARACTER_POOL, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef } from '@/lib/game/ultimates';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { Rarity, RARITY_CONFIG, calcCharDps, OwnedCharacter, CardEdition } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { PageScroll, SectionHeader } from '@/components/ui/Page';
import { CollectionFilters, COLLECTION_RARITY_ORDER, CollectionFilterMode, CollectionAffinityMode, CollectionSortMode } from '@/components/ui/CollectionFilters';
import { EDITION_CONFIG, makeInstanceKey } from '@/lib/game/editions';
import { getAffinityForId, type Affinity } from '@/lib/game/affinities';

const RARITY_ORDER: Rarity[] = COLLECTION_RARITY_ORDER;

// Tous les univers présents dans le pool
const UNIVERSES = Array.from(new Set(CHARACTER_POOL.map(c => c.universe).filter(Boolean))).sort() as string[];

// Une "entrée" de collection = un template + une édition précise (Base/Or/Diamant).
// Un template possédé en plusieurs éditions produit PLUSIEURS entrées, chacune
// avec sa propre progression (rang/niveau) — chaque édition compte comme un
// personnage à part, tout en partageant l'art/nom/ultime du template.
interface CollectionEntry {
  tpl: typeof CHARACTER_POOL[number];
  key: string;               // clé de collection (instance) : templateId ou templateId::edition
  owned: OwnedCharacter | null; // null = pas encore possédé (aucune édition)
}
const ALL_EDITIONS: CardEdition[] = ['base', 'gold', 'diamond'];

export function CollectionPage() {
  const { collection, collectionFilter, collectionUniverse, collectionAffinity, collectionSort, setCollectionFilters } = useGameStore();
  const [view, setView] = useState<'characters' | 'equipment'>('characters');
  const filter = collectionFilter as CollectionFilterMode;
  const universe = collectionUniverse as string | 'all';
  const affinity = collectionAffinity as CollectionAffinityMode;
  const sort = collectionSort as CollectionSortMode;
  const setFilter = (next: CollectionFilterMode) => setCollectionFilters({ filter: next });
  const setUniverse = (next: string | 'all') => setCollectionFilters({ universe: next });
  const setAffinity = (next: CollectionAffinityMode) => setCollectionFilters({ affinity: next });
  const setSort = (next: CollectionSortMode) => setCollectionFilters({ sort: next });

  // Chaque template possédé se décline en autant d'entrées que d'éditions
  // réellement obtenues ; un template jamais obtenu garde une seule entrée
  // "verrouillée" (on n'affiche pas 3 cadenas pour un seul perso jamais eu).
  const allEntries = useMemo<CollectionEntry[]>(() => {
    const entries: CollectionEntry[] = [];
    for (const tpl of CHARACTER_POOL) {
      const ownedEditions = ALL_EDITIONS
        .map(ed => makeInstanceKey(tpl.id, ed))
        .filter(key => collection[key]);
      if (ownedEditions.length === 0) {
        entries.push({ tpl, key: tpl.id, owned: null });
      } else {
        for (const key of ownedEditions) entries.push({ tpl, key, owned: collection[key] });
      }
    }
    return entries;
  }, [collection]);

  // Le ratio d'en-tête ("X / 192 personnages") compte les TEMPLATES uniques
  // possédés (au moins une édition) — pas le nombre d'instances shiny.
  const ownedCount = useMemo(
    () => CHARACTER_POOL.filter(c => ALL_EDITIONS.some(ed => collection[makeInstanceKey(c.id, ed)])).length,
    [collection]
  );

  // ── Filtrage ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      const isOwned = !!e.owned;
      const matchesAffinity = affinity === 'all' ? true : getAffinityForId(e.tpl.id) === affinity;
      if (filter === 'owned')   return isOwned && matchesAffinity;
      if (filter === 'missing') return !isOwned && matchesAffinity;
      if (filter !== 'all')     return e.tpl.rarity === filter && matchesAffinity;
      return matchesAffinity;
    }).filter(e =>
      universe === 'all' ? true : e.tpl.universe === universe
    );
  }, [allEntries, filter, universe, affinity]);

  // ── Tri ─────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (sort === 'rarity') {
      // Groupe par rareté (T>CO>S>... garde ordre RARITY_ORDER inversé)
      return [...filtered].sort((a, b) => {
        const ri = RARITY_ORDER.slice().reverse();
        const diff = ri.indexOf(a.tpl.rarity) - ri.indexOf(b.tpl.rarity);
        return diff !== 0 ? diff : a.tpl.name.localeCompare(b.tpl.name);
      });
    }
    if (sort === 'dps_desc' || sort === 'dps_asc') {
      return [...filtered].sort((a, b) => {
        const dpsA = a.owned ? calcCharDps(a.tpl, a.owned) : 0;
        const dpsB = b.owned ? calcCharDps(b.tpl, b.owned) : 0;
        return sort === 'dps_desc' ? dpsB - dpsA : dpsA - dpsB;
      });
    }
    return [...filtered].sort((a, b) => a.tpl.name.localeCompare(b.tpl.name));
  }, [filtered, sort]);

  // ── Groupage par rareté (uniquement en mode rarity) ─────────────────────
  const grouped = useMemo(() => {
    if (sort !== 'rarity') return null;
    const map = new Map<Rarity, CollectionEntry[]>();
    for (const r of RARITY_ORDER) map.set(r, []);
    for (const entry of sorted) map.get(entry.tpl.rarity)!.push(entry);
    return map;
  }, [sorted, sort]);

  const equipmentList = useMemo(() =>
    Object.values(EQUIPMENT_DEFS).sort((a, b) => {
      const order = RARITY_ORDER.slice().reverse();
      return order.indexOf(a.rarity as Rarity) - order.indexOf(b.rarity as Rarity);
    }),
  []);

  const CharCard = ({ entry }: { entry: CollectionEntry }) => {
    const { tpl, owned } = entry;
    const cfg2  = RARITY_CONFIG[tpl.rarity];
    const ult   = getUltimateDef(tpl.id);
    if (!owned) {
      return (
        <div className="collection-card locked" style={{ position:'relative' }}>
          <div style={{ position:'relative' }}>
            <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={72} height={98} />
            <div className="collection-lock">🔒</div>
          </div>
          <div className="collection-card__name">{tpl.name}</div>
          <RarityBadge rarity={tpl.rarity} />
          {tpl.universe && <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>{tpl.universe}</div>}
        </div>
      );
    }
    const dps = calcCharDps(tpl, owned);
    const ed  = EDITION_CONFIG[owned.edition ?? 'base'];
    return (
      <div className="collection-card owned" style={{ ['--accent' as string]: cfg2.color } as CSSProperties}>
        <CharacterCardThumb templateId={tpl.id} formIndex={owned.currentForm} name={getCharFormName(tpl, owned.currentForm)} rarity={tpl.rarity} edition={owned.edition} width={72} height={98} />
        <div className="collection-card__name">{tpl.name}</div>
        {owned.edition && owned.edition !== 'base' && (
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'12px', letterSpacing:0.5, color:ed.color, background:`${ed.color}18`, border:`1px solid ${ed.color}55`, borderRadius:999, padding:'1px 8px', marginTop:2 }}>
            {owned.edition === 'diamond' ? '💎 DIAMANT' : '✨ OR'}
          </div>
        )}
        <RankStars rank={owned.rank} />
        <div className="collection-card__dps">{formatNumber(dps)}/s</div>
        {tpl.universe && <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-muted)', marginTop:'1px' }}>{tpl.universe}</div>}
        {ult && (
          <div className="collection-card__ult">
            <div className="collection-card__ult-name">{ult.name}</div>
            <div className="collection-card__ult-desc">{ult.description}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageScroll>

        {/* Header */}
        <SectionHeader
          eyebrow={`${ownedCount} / ${CHARACTER_POOL.length} personnages · ${filtered.length} affichés`}
          title="COLLECTION"
          accent="#60a5fa"
          right={
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px', minWidth:'160px' }}>
              <div className="prog-track" style={{ width:'100%' }}>
                <div className="prog-fill" style={{ width:`${(ownedCount/CHARACTER_POOL.length)*100}%`, background:'linear-gradient(90deg,#1d4ed8,#60a5fa)', boxShadow:'0 0 8px #60a5fa88' }} />
              </div>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'12.4px', color:'#60a5fa' }}>
                {Math.round((ownedCount/CHARACTER_POOL.length)*100)}%
              </span>
            </div>
          }
        />

        {/* Onglets vue */}
        <div style={{ display:'flex', gap:'8px' }}>
          {([
            { key:'characters' as const, label:'PERSONNAGES' },
            { key:'equipment' as const,  label:'ÉQUIPEMENT' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              style={{ padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', letterSpacing:'0.5px',
                background: view===tab.key ? 'rgba(96,165,250,0.18)' : 'var(--bg-card)',
                border: `1px solid ${view===tab.key ? '#60a5fa66' : 'var(--border)'}`,
                color: view===tab.key ? '#60a5fa' : 'var(--text-dim)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'characters' ? (
          <>
            {/* ── FILTRES ─────────────────────────────────────────────────── */}
            <CollectionFilters
              filter={filter}
              onFilterChange={setFilter}
              universe={universe}
              onUniverseChange={setUniverse}
              affinity={affinity}
              onAffinityChange={setAffinity}
              sort={sort}
              onSortChange={setSort}
              universes={UNIVERSES}
            />

            {/* ── RÉSULTATS ────────────────────────────────────────────────── */}
            {sorted.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:'13.4px' }}>
                Aucun personnage ne correspond à ces filtres.
              </div>
            )}

            {sort === 'rarity' && grouped ? (
              // Vue groupée par rareté
              RARITY_ORDER.slice().reverse().map(r => {
                const list = grouped.get(r) ?? [];
                if (list.length === 0) return null;
                const cfg2 = RARITY_CONFIG[r];
                const uniqueOwned = new Set(list.filter(e => e.owned).map(e => e.tpl.id)).size;
                const uniqueTotal = new Set(list.map(e => e.tpl.id)).size;
                return (
                  <div key={r} className="collection-group">
                    <div className="collection-group__header" style={{ ['--accent' as string]: cfg2.color } as CSSProperties}>
                      <span>{cfg2.label.toUpperCase()}</span>
                      <span style={{ color:'var(--text-dim)', fontFamily:'var(--f-num)' }}>({uniqueOwned}/{uniqueTotal})</span>
                    </div>
                    <div className="collection-grid">
                      {list.map(entry => <CharCard key={entry.key} entry={entry} />)}
                    </div>
                  </div>
                );
              })
            ) : (
              // Vue plate (tri DPS ou nom)
              <div className="collection-grid">
                {sorted.map(entry => <CharCard key={entry.key} entry={entry} />)}
              </div>
            )}
          </>
        ) : (
          /* ── ÉQUIPEMENT ──────────────────────────────────────────────────── */
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:'12px' }}>
            {equipmentList.map(item => (
              <div key={item.id} className="panel" style={{ padding:'14px', borderColor:`${item.color}33` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                  <div style={{ width:44, height:44, borderRadius:'12px', background:`${item.color}15`, border:`1px solid ${item.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20.6px', flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>{item.slot.toUpperCase()} · <span style={{ color:item.color }}>{item.rarity}</span></div>
                  </div>
                </div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', lineHeight:1.5, marginBottom:'10px' }}>{item.description}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>Recyclage</span>
                  <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'13.4px', color:'var(--green)' }}>{item.recycleValue} 🪙</span>
                </div>
              </div>
            ))}
          </div>
        )}

    </PageScroll>
  );
}
