'use client';
import { memo, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { MASTERY_DPS_TIERS, getMasteryDpsBonus, getMasteryMilestones, getMasteryPct } from '@/lib/game/achievements';
import { formatNumber } from '@/lib/game/format';
import { RARITY_CONFIG, type CharacterTemplate, type OwnedCharacter } from '@/types/game';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { CollectionFilters } from '@/components/ui/CollectionFilters';
import { compareCharacters, matchesCharacterFilters } from '@/lib/game/collectionFilters';

const PAGE_SIZE = 40;

/**
 * Maîtrise par personnage : chaque personnage déjà joué (ou possédé) a sa
 * propre progression — niveau, combats livrés, boss vaincus — résumée en un
 * pourcentage de maîtrise qui lui donne un bonus de DPS personnel.
 * Recherche, filtres et tri partagés avec Compadex / Compagnons / Améliorations ;
 * les compagnons équipés passent toujours en tête.
 */
export function MasteryPanel() {
  const { charMastery, collection, equippedTeam, filters } = useGameStore(useShallow(s => ({
    charMastery: s.charMastery, collection: s.collection, equippedTeam: s.equippedTeam, filters: s.collectionFilters,
  })));
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Nouvelle recherche / nouveau filtre : on repart de la première page.
  const [limitFilters, setLimitFilters] = useState(filters);
  if (limitFilters !== filters) { setLimitFilters(filters); setLimit(PAGE_SIZE); }

  // Meilleure carte possédée par perso (tri par DPS), en une seule passe :
  // ne dépend que de la collection, pas de la maîtrise (mise à jour à chaque kill).
  const bestOwned = useMemo(() => {
    const map = new Map<string, OwnedCharacter>();
    for (const c of Object.values(collection)) {
      const cur = map.get(c.templateId);
      if (!cur || c.level > cur.level) map.set(c.templateId, c);
    }
    return map;
  }, [collection]);

  const rows = useMemo(() => {
    const ids = new Set<string>(Object.keys(charMastery));
    for (const id of bestOwned.keys()) ids.add(id);
    return [...ids].flatMap(id => {
      const tpl = getCharacterById(id);
      if (!tpl || tpl.isHero) return [];
      const pct = getMasteryPct(getMasteryMilestones(charMastery[id], tpl.rarity));
      return [{ tpl, owned: bestOwned.get(id) ?? null, pct }];
    });
  }, [charMastery, bestOwned]);

  const universes = useMemo(() =>
    [...new Set(rows.map(r => r.tpl.universe).filter((u): u is string => !!u))],
  [rows]);

  const equippedIds = useMemo(() =>
    new Set(equippedTeam.filter((k): k is string => !!k).map(k => parseInstanceKey(k).templateId)),
  [equippedTeam]);

  const filtered = useMemo(() =>
    rows.filter(r => matchesCharacterFilters(r.tpl, filters)).sort((a, b) => {
      // Compagnons équipés en priorité, avant tout autre critère de tri.
      const aEq = equippedIds.has(a.tpl.id);
      const bEq = equippedIds.has(b.tpl.id);
      if (aEq !== bEq) return aEq ? -1 : 1;
      return compareCharacters(a, b, filters.sortKey, filters.sortReversed, charMastery);
    }),
  [rows, filters, equippedIds, charMastery]);

  const byTier = useMemo(() => MASTERY_DPS_TIERS.map(t => rows.filter(r => r.pct >= t.pct).length), [rows]);
  const toggle = useCallback((id: string) => setOpen(o => (o === id ? null : id)), []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Paliers de bonus */}
      <div className="mastery-tiers">
        {MASTERY_DPS_TIERS.map((t, i) => (
          <div key={t.pct} className="mastery-tier" style={{ ['--i' as string]: i } as CSSProperties}>
            <div className="mastery-tier__pct">{t.pct}%</div>
            <div className="mastery-tier__bonus">+{Math.round(t.bonus * 100)}% DPS</div>
            <div className="mastery-tier__count">{byTier[i]} perso{byTier[i] > 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      <CollectionFilters universes={universes} />

      {filtered.length === 0 && <div className="ach-empty">Aucun personnage trouvé. Recrute des alliés et fais-les combattre pour développer leur maîtrise.</div>}

      {filtered.slice(0, limit).map(({ tpl }, i) => (
        <MasteryRow key={tpl.id} tpl={tpl} mastery={charMastery[tpl.id]} index={i}
          isOpen={open === tpl.id} isEquipped={equippedIds.has(tpl.id)} onToggle={toggle} />
      ))}

      {filtered.length > limit && (
        <button className="ach-chip" style={{ alignSelf:'center' }} onClick={() => setLimit(l => l + PAGE_SIZE)}>
          AFFICHER PLUS ({filtered.length - limit})
        </button>
      )}
    </div>
  );
}

// Ligne mémoïsée : la maîtrise change à chaque kill, mais `mastery` garde la
// même référence pour les persos non concernés (voir achievementSlice), donc
// seules les lignes des persos qui progressent se re-rendent.
const MasteryRow = memo(function MasteryRow({ tpl, mastery, index, isOpen, isEquipped, onToggle }: {
  tpl: CharacterTemplate;
  mastery: Parameters<typeof getMasteryMilestones>[0];
  index: number;
  isOpen: boolean;
  isEquipped: boolean;
  onToggle: (id: string) => void;
}) {
  const milestones = getMasteryMilestones(mastery, tpl.rarity);
  const pct = getMasteryPct(milestones);
  const bonus = getMasteryDpsBonus(pct);
  const acc = RARITY_CONFIG[tpl.rarity].color;
  const next = MASTERY_DPS_TIERS.find(t => pct < t.pct);
  return (
    <div>
      <button className={`mastery-row${isOpen ? ' is-open' : ''}${pct >= 100 ? ' is-max' : ''}`}
        onClick={() => onToggle(tpl.id)}
        style={{ ['--acc' as string]: acc, ['--i' as string]: index } as CSSProperties}>
        <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={40} height={54} />
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16, color:'var(--text)' }}>{tpl.name}</span>
            <RarityBadge rarity={tpl.rarity} size="xs" />
            {isEquipped && <span className="ach-tier" style={{ ['--acc' as string]: '#4ade80' } as CSSProperties}>ÉQUIPÉ</span>}
            {pct >= 100 && <span className="ach-tier" style={{ ['--acc' as string]: '#fbbf24' } as CSSProperties}>MAÎTRISÉ</span>}
          </div>
          <div className="mastery-bar"><div className="mastery-bar__fill" style={{ width:`${pct}%` }} /></div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>
            {next ? `Prochain bonus à ${next.pct}% : +${Math.round(next.bonus * 100)}% DPS` : 'Bonus maximal atteint'}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:20, color: pct >= 100 ? '#fbbf24' : acc }}>{pct}%</div>
          <div className={`mastery-dps${bonus > 0 ? ' is-on' : ''}`}>+{Math.round(bonus * 100)}% DPS</div>
        </div>
      </button>
      {isOpen && (
        <div className="mastery-detail">
          {milestones.map(ms => (
            <div key={ms.id} className={`mastery-ms${ms.done ? ' is-done' : ''}`}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:6, marginBottom:6 }}>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color: ms.done ? '#4ade80' : 'var(--text-sub)' }}>{ms.icon} {ms.label}</span>
                {ms.done && <span style={{ color:'#4ade80', fontWeight:900 }}>✓</span>}
              </div>
              <div className="ach-prog__track" style={{ ['--acc' as string]: acc } as CSSProperties}>
                <div className="ach-prog__fill" style={{ width:`${Math.min(100, (ms.value / ms.target) * 100)}%`, background: ms.done ? 'linear-gradient(90deg,#15803d,#4ade80)' : acc }} />
              </div>
              <div className="ach-prog__num" style={{ marginTop:4 }}>{formatNumber(Math.min(ms.value, ms.target))} / {formatNumber(ms.target)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
