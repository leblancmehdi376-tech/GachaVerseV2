'use client';
import { memo, useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useProgressiveCount } from '@/hooks/useProgressiveCount';
import { useGameStore } from '@/store/gameStore';
import { CHARACTER_POOL, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef } from '@/lib/game/ultimates';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { Rarity, RARITY_CONFIG, OwnedCharacter } from '@/types/game';
import { calcCharDps } from '@/lib/game/formulas';
import { formatNumber } from '@/lib/game/format';
import { PageScroll, SectionHeader } from '@/components/ui/Page';
import { CollectionFilters } from '@/components/ui/CollectionFilters';
import { COLLECTION_RARITY_ORDER, compareCharacters, matchesCharacterFilters, type CharMasteryMap, type CollectionFilterState } from '@/lib/game/collectionFilters';
import { EditionBadge, EditionGauge, EditionGaugeMini } from '@/components/ui/EditionBadge';
import { getAffinityForId, AFFINITY_CONFIG } from '@/lib/game/affinities';
import { countSeenCharacters, countSeenEquipment } from '@/lib/game/compadex';

const RARITY_ORDER: Rarity[] = COLLECTION_RARITY_ORDER;

// Tous les univers présents dans le pool
const UNIVERSES = Array.from(new Set(CHARACTER_POOL.map(c => c.universe).filter(Boolean))).sort() as string[];

// Une "entrée" de collection = un template (une seule carte par perso, son
// édition n'est qu'un bonus porté par la carte, voir lib/game/editions.ts).
export interface CollectionEntry {
  tpl: typeof CHARACTER_POOL[number];
  key: string;               // clé de collection = templateId
  owned: OwnedCharacter | null; // null = pas ACTUELLEMENT possédé
  seen: boolean;              // Compadex : déjà obtenu au moins une fois, à vie (voir compadexCharactersSeen)
}

// "Possédés"/"Manquants" filtrent sur le Compadex (déjà obtenu à vie, `seen`),
// pas sur la possession ACTUELLE — cohérent avec le sens de cette page depuis
// sa transformation en Compadex.
export function matchesCompadexFilters(entry: CollectionEntry, f: CollectionFilterState): boolean {
  if (f.status === 'owned' && !entry.seen) return false;
  if (f.status === 'missing' && entry.seen) return false;
  return matchesCharacterFilters(entry.tpl, f);
}

export function compareCompadexEntries(a: CollectionEntry, b: CollectionEntry, f: CollectionFilterState, charMastery?: CharMasteryMap): number {
  return compareCharacters(a, b, f.sortKey, f.sortReversed, charMastery);
}

// Composant au scope module (pas défini dans le corps de CollectionPage) :
// sinon chaque rendu de CollectionPage recréerait une nouvelle identité de
// fonction CharCard, forçant React à démonter/remonter toutes les cartes.
// Mémoïsé (entry stable tant que la collection ne change pas, onSelect =
// setState stable) : les ~500 cartes ne se re-rendent plus à chaque rendu.
const CharCard = memo(function CharCard({ entry, onSelect }: { entry: CollectionEntry; onSelect: (key: string) => void }) {
  const onClick = () => onSelect(entry.key);
  const { tpl, owned, seen } = entry;
  const cfg2  = RARITY_CONFIG[tpl.rarity];
  const ult   = getUltimateDef(tpl.id);
  if (!owned) {
    // Compadex : distingue "jamais obtenu" (silhouette + nom masqués) de
    // "déjà obtenu par le passé, mais plus actuellement" (nom/art visibles,
    // pas de cadenas — juste un badge indiquant l'absence en collection).
    return (
      <div className={`collection-card locked${seen ? ' compadex-seen' : ''}`} onClick={onClick} style={{ cursor:'pointer' }}>
        <div className="collection-card__body">
          <div style={{ position:'relative' }}>
            <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={143} height={194} frameOverlay />
            {!seen && <div className="collection-lock">🔒</div>}
          </div>
          <div className="collection-card__name">{tpl.name}</div>
          <RarityBadge rarity={tpl.rarity} />
          {seen
            ? <div className="collection-card__series">🕓 Déjà obtenu</div>
            : tpl.universe && <div className="collection-card__series">{tpl.universe}</div>}
        </div>
      </div>
    );
  }
  const dps = calcCharDps(tpl, owned);
  return (
    <div className="collection-card owned" onClick={onClick} style={{ ['--accent' as string]: cfg2.color, cursor:'pointer' } as CSSProperties}>
      <div className="collection-card__body">
        <CharacterCardThumb templateId={tpl.id} formIndex={owned.currentForm} name={getCharFormName(tpl, owned.currentForm)} rarity={tpl.rarity} edition={owned.edition} width={143} height={194} frameOverlay />
        <div className="collection-card__name">{tpl.name}</div>
        <EditionBadge edition={owned.edition} style={{ marginTop:2 }} />
        <EditionGaugeMini owned={owned} style={{ padding:'0 6px' }} />
        <div className="collection-card__dps">{formatNumber(dps)}/s</div>
        {tpl.universe && <div className="collection-card__series">{tpl.universe}</div>}
        {ult && (
          <div className="collection-card__ult">
            <div className="collection-card__ult-name">{ult.name}</div>
            <div className="collection-card__ult-desc">{ult.description}</div>
          </div>
        )}
      </div>
    </div>
  );
});

// Modale de détail : type (affinité), DPS de base, nb de formes, description —
// tout ce qui n'a pas la place sur la carte compacte de la grille.
const CharDetailModal = ({ entry, onClose }: { entry: CollectionEntry; onClose: () => void }) => {
  const { tpl, owned, seen } = entry;
  const cfg   = RARITY_CONFIG[tpl.rarity];
  const ult   = getUltimateDef(tpl.id);
  const aff   = AFFINITY_CONFIG[getAffinityForId(tpl.id)];
  const forms = tpl.forms ?? [];
  const dps   = owned ? calcCharDps(tpl, owned) : null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ width:'100%', maxWidth:480, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:18.5, color:cfg.color, letterSpacing:1 }}>{tpl.name}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:22.6 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <CharacterCardThumb templateId={tpl.id} formIndex={owned?.currentForm ?? 0} name={owned ? getCharFormName(tpl, owned.currentForm) : tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={200} height={272} frameOverlay />
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            <RarityBadge rarity={tpl.rarity} />
            <span className="chip" style={{ color:aff.color, borderColor:`${aff.color}55`, background:`${aff.color}18` }}>{aff.icon} {aff.label}</span>
            {tpl.universe && <span className="chip">{tpl.universe}</span>}
          </div>

          {tpl.description && (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14.4, color:'var(--text-dim)', lineHeight:1.5, textAlign:'center' }}>{tpl.description}</div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>DPS de base</div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{formatNumber(tpl.baseDps)}/s</div>
            </div>
            <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>Formes</div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{forms.length > 0 ? forms.length : 1}</div>
            </div>
          </div>

          {owned ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>DPS actuel</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--green)' }}>{formatNumber(dps!)}/s</div>
              </div>
              <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>Copies</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{owned.copies}</div>
              </div>
              <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>Niveau</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{owned.level}</div>
              </div>
              <div className="panel" style={{ padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5 }}>Forme</div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:17, color:'var(--text)' }}>{owned.currentForm + 1}/{forms.length > 0 ? forms.length : 1}</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)' }}>
              {seen ? '🕓 Déjà obtenu par le passé — non possédé actuellement' : '🔒 Personnage jamais obtenu'}
            </div>
          )}
          {owned && <EditionGauge owned={owned} />}

          {forms.length > 0 && (
            <div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Formes d&apos;évolution</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {forms.map((f, i) => (
                  <div key={f.formId} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'4px 8px', borderRadius:8,
                    background: owned && owned.currentForm === i ? `${cfg.color}18` : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color: owned && owned.currentForm === i ? cfg.color : 'var(--text-dim)', fontWeight: owned && owned.currentForm === i ? 700 : 400 }}>{i + 1}. {f.name}</span>
                    <span style={{ fontFamily:'var(--f-num)', fontSize:14, color:'var(--text-muted)' }}>×{f.dpsFormMult}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ult && (
            <div className="collection-card__ult">
              <div className="collection-card__ult-name">{ult.name}</div>
              <div className="collection-card__ult-desc">{ult.description}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function CollectionPage() {
  // Sélecteur ciblé : sans lui, la page (et ses ~500 cartes) se re-rendait à
  // chaque tick de combat.
  const { collection, collectionFilters, charMastery, compadexCharactersSeen, compadexEquipmentSeen, equipmentInventory } = useGameStore(useShallow(s => ({
    collection: s.collection,
    collectionFilters: s.collectionFilters,
    charMastery: s.charMastery,
    compadexCharactersSeen: s.compadexCharactersSeen,
    compadexEquipmentSeen: s.compadexEquipmentSeen,
    equipmentInventory: s.equipmentInventory,
  })));
  const [view, setView] = useState<'characters' | 'equipment'>('characters');
  const [detailKey, setDetailKey] = useState<string | null>(null);

  // Une entrée par template ; un template jamais obtenu OU perdu depuis
  // (Prestige...) reste une entrée "verrouillée", avec son statut Compadex
  // (`seen`) à part.
  const allEntries = useMemo<CollectionEntry[]>(() =>
    CHARACTER_POOL.map(tpl => ({ tpl, key: tpl.id, owned: collection[tpl.id] ?? null, seen: !!compadexCharactersSeen[tpl.id] })),
  [collection, compadexCharactersSeen]);

  // Compadex : nombre de templates DÉJÀ obtenus au moins une fois, à vie
  // (jamais remis à zéro par le Prestige — voir compadexCharactersSeen) —
  // contrairement à l'ancien ratio "possédés", basé sur la collection
  // ACTUELLE (vidée au Prestige).
  const compadexCharCount = useMemo(() => countSeenCharacters(compadexCharactersSeen), [compadexCharactersSeen]);

  // ── Filtrage ────────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    allEntries.filter(e => matchesCompadexFilters(e, collectionFilters)),
  [allEntries, collectionFilters]);

  // ── Tri ─────────────────────────────────────────────────────────────────
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => compareCompadexEntries(a, b, collectionFilters, charMastery)),
  [filtered, collectionFilters, charMastery]);

  // Rendu progressif des ~500 cartes (voir useProgressiveCount).
  const cardLimit = useProgressiveCount(sorted.length);

  // ── Groupage par rareté (uniquement en mode rarity) ─────────────────────
  const grouped = useMemo(() => {
    if (collectionFilters.sortKey !== 'rarity') return null;
    const map = new Map<Rarity, CollectionEntry[]>();
    for (const r of RARITY_ORDER) map.set(r, []);
    for (const entry of sorted) map.get(entry.tpl.rarity)!.push(entry);
    return map;
  }, [sorted, collectionFilters.sortKey]);

  const equipmentList = useMemo(() =>
    Object.values(EQUIPMENT_DEFS).sort((a, b) => {
      const order = RARITY_ORDER.slice().reverse();
      return order.indexOf(a.rarity as Rarity) - order.indexOf(b.rarity as Rarity);
    }),
  []);

  // Compadex équipements : nombre d'ids DÉJÀ obtenus au moins une fois, à vie
  // (jamais remis à zéro par le Prestige — voir compadexEquipmentSeen).
  const compadexEquipCount = useMemo(() => countSeenEquipment(compadexEquipmentSeen), [compadexEquipmentSeen]);

  const charPct  = Math.round((compadexCharCount / CHARACTER_POOL.length) * 100);
  const equipPct = Math.round((compadexEquipCount / equipmentList.length) * 100);
  const headerPct = view === 'characters' ? charPct : equipPct;

  return (
    <PageScroll>

        {/* Header */}
        <SectionHeader
          eyebrow={view === 'characters'
            ? `${compadexCharCount} / ${CHARACTER_POOL.length} personnages compadexés · ${filtered.length} affichés`
            : `${compadexEquipCount} / ${equipmentList.length} équipements compadexés`}
          title="COMPADEX"
          accent="#60a5fa"
          right={
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px', minWidth:'160px' }}>
              <div className="prog-track" style={{ width:'100%' }}>
                <div className="prog-fill" style={{ width:`${headerPct}%`, background:'linear-gradient(90deg,#1d4ed8,#60a5fa)', boxShadow:'0 0 8px #60a5fa88' }} />
              </div>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'14.4px', color:'#60a5fa' }}>
                {headerPct}%{headerPct >= 100 && ' 🏆'}
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
              style={{ padding:'8px 16px', borderRadius:'10px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', letterSpacing:'0.5px',
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
            <CollectionFilters universes={UNIVERSES} showStatus />

            {/* ── RÉSULTATS ────────────────────────────────────────────────── */}
            {sorted.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:'15.4px' }}>
                Aucun personnage ne correspond à ces filtres.
              </div>
            )}

            {grouped ? (
              // Vue groupée par rareté (plus rares d'abord, sauf tri inversé)
              (() => { let budget = cardLimit; return (collectionFilters.sortReversed ? RARITY_ORDER : RARITY_ORDER.slice().reverse()).map(r => {
                const list = grouped.get(r) ?? [];
                if (list.length === 0 || budget <= 0) return null;
                const shown = list.slice(0, budget);
                budget -= shown.length;
                const cfg2 = RARITY_CONFIG[r];
                const uniqueOwned = new Set(list.filter(e => e.seen).map(e => e.tpl.id)).size;
                const uniqueTotal = new Set(list.map(e => e.tpl.id)).size;
                return (
                  <div key={r} className="collection-group">
                    <div className="collection-group__header" style={{ ['--accent' as string]: cfg2.color } as CSSProperties}>
                      <span>{cfg2.label.toUpperCase()}</span>
                      <span style={{ color:'var(--text-dim)', fontFamily:'var(--f-num)' }}>({uniqueOwned}/{uniqueTotal})</span>
                    </div>
                    <div className="collection-grid">
                      {shown.map(entry => <CharCard key={entry.key} entry={entry} onSelect={setDetailKey} />)}
                    </div>
                  </div>
                );
              }); })()
            ) : (
              // Vue plate (tri DPS ou nom)
              <div className="collection-grid">
                {sorted.slice(0, cardLimit).map(entry => <CharCard key={entry.key} entry={entry} onSelect={setDetailKey} />)}
              </div>
            )}
          </>
        ) : (
          /* ── ÉQUIPEMENT ──────────────────────────────────────────────────── */
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:'12px' }}>
            {equipmentList.map(item => {
              const stock = equipmentInventory[item.id] ?? 0;
              const seen  = !!compadexEquipmentSeen[item.id];
              const badge = stock > 0
                ? { label:`×${stock}`, color:'#4ade80' }
                : seen
                  ? { label:'🕓 Obtenu', color:'var(--text-muted)' }
                  : { label:'🔒 Jamais obtenu', color:'var(--text-muted)' };
              return (
                <div key={item.id} className="panel" style={{ padding:'14px', borderColor:`${item.color}33`, opacity: seen ? 1 : 0.6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                    <div style={{ width:53, height:53, borderRadius:'12px', background:`${item.color}15`, border:`1px solid ${item.color}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'26.7px', flexShrink:0 }}>{item.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'15.4px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)' }}>{item.slot.toUpperCase()} · <span style={{ color:item.color }}>{item.rarity}</span></div>
                    </div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color: badge.color, background: stock > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${stock > 0 ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`, borderRadius:999, padding:'2px 8px', flexShrink:0, whiteSpace:'nowrap' }}>
                      {badge.label}
                    </div>
                  </div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)', lineHeight:1.5 }}>{item.description}</div>
                </div>
              );
            })}
          </div>
        )}

        {detailKey && (() => {
          const entry = allEntries.find(e => e.key === detailKey);
          return entry ? <CharDetailModal entry={entry} onClose={() => setDetailKey(null)} /> : null;
        })()}

    </PageScroll>
  );
}
