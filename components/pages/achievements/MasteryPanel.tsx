'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { MASTERY_DPS_TIERS, getMasteryDpsBonus, getMasteryMilestones, getMasteryPct } from '@/lib/game/achievements';
import { formatNumber } from '@/lib/game/format';
import { RARITY_CONFIG } from '@/types/game';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';

const PAGE_SIZE = 40;
type Sort = 'mastery' | 'name' | 'rarity';

/**
 * Maîtrise par personnage : chaque personnage déjà joué (ou possédé) a sa
 * propre progression — niveau, combats livrés, boss vaincus — résumée en un
 * pourcentage de maîtrise qui lui donne un bonus de DPS personnel.
 */
export function MasteryPanel() {
  const { charMastery, collection } = useGameStore(useShallow(s => ({ charMastery: s.charMastery, collection: s.collection })));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('mastery');
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const ids = new Set<string>(Object.keys(charMastery));
    for (const key of Object.keys(collection)) ids.add(parseInstanceKey(key).templateId);
    return [...ids].flatMap(id => {
      const tpl = getCharacterById(id);
      if (!tpl || tpl.isHero) return [];
      const milestones = getMasteryMilestones(charMastery[id], tpl.rarity);
      const pct = getMasteryPct(milestones);
      return [{ tpl, milestones, pct, bonus: getMasteryDpsBonus(pct) }];
    });
  }, [charMastery, collection]);

  const sorted = useMemo(() => {
    const out = [...rows];
    const rarityRank = Object.keys(RARITY_CONFIG);
    if (sort === 'mastery') out.sort((a, b) => b.pct - a.pct || a.tpl.name.localeCompare(b.tpl.name));
    if (sort === 'name')    out.sort((a, b) => a.tpl.name.localeCompare(b.tpl.name));
    if (sort === 'rarity')  out.sort((a, b) => rarityRank.indexOf(b.tpl.rarity) - rarityRank.indexOf(a.tpl.rarity) || b.pct - a.pct);
    return out;
  }, [rows, sort]);

  const q = query.trim().toLowerCase();
  const filtered = q ? sorted.filter(r => r.tpl.name.toLowerCase().includes(q) || (r.tpl.universe ?? '').toLowerCase().includes(q)) : sorted;
  const byTier = MASTERY_DPS_TIERS.map(t => rows.filter(r => r.pct >= t.pct).length);

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

      <div className="ach-toolbar">
        <label className="ach-search">
          <span>🔎</span>
          <input value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE_SIZE); }} placeholder="Personnage ou licence…" />
        </label>
        <select className="ach-select" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Trier">
          <option value="mastery">Maîtrise</option>
          <option value="rarity">Rareté</option>
          <option value="name">Nom</option>
        </select>
      </div>

      {filtered.length === 0 && <div className="ach-empty">Aucun personnage trouvé. Recrute des alliés et fais-les combattre pour développer leur maîtrise.</div>}

      {filtered.slice(0, limit).map(({ tpl, milestones, pct, bonus }, i) => {
        const acc = RARITY_CONFIG[tpl.rarity].color;
        const isOpen = open === tpl.id;
        const next = MASTERY_DPS_TIERS.find(t => pct < t.pct);
        return (
          <div key={tpl.id}>
            <button className={`mastery-row${isOpen ? ' is-open' : ''}${pct >= 100 ? ' is-max' : ''}`}
              onClick={() => setOpen(isOpen ? null : tpl.id)}
              style={{ ['--acc' as string]: acc, ['--i' as string]: i } as CSSProperties}>
              <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={40} height={54} />
              <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14, color:'var(--text)' }}>{tpl.name}</span>
                  <RarityBadge rarity={tpl.rarity} size="xs" />
                  {pct >= 100 && <span className="ach-tier" style={{ ['--acc' as string]: '#fbbf24' } as CSSProperties}>MAÎTRISÉ</span>}
                </div>
                <div className="mastery-bar"><div className="mastery-bar__fill" style={{ width:`${pct}%` }} /></div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:11.5, color:'var(--text-dim)' }}>
                  {next ? `Prochain bonus à ${next.pct}% : +${Math.round(next.bonus * 100)}% DPS` : 'Bonus maximal atteint'}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18, color: pct >= 100 ? '#fbbf24' : acc }}>{pct}%</div>
                <div className={`mastery-dps${bonus > 0 ? ' is-on' : ''}`}>+{Math.round(bonus * 100)}% DPS</div>
              </div>
            </button>
            {isOpen && (
              <div className="mastery-detail">
                {milestones.map(ms => (
                  <div key={ms.id} className={`mastery-ms${ms.done ? ' is-done' : ''}`}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:6, marginBottom:6 }}>
                      <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12.4, color: ms.done ? '#4ade80' : 'var(--text-sub)' }}>{ms.icon} {ms.label}</span>
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
      })}

      {filtered.length > limit && (
        <button className="ach-chip" style={{ alignSelf:'center' }} onClick={() => setLimit(l => l + PAGE_SIZE)}>
          AFFICHER PLUS ({filtered.length - limit})
        </button>
      )}
    </div>
  );
}
