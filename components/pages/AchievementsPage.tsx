'use client';
import { memo, useCallback, useDeferredValue, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import {
  ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_ENTRIES, CATEGORY_META, EGG, TIER_META, MAX_SHOWCASED_TROPHIES,
  getAchievementTier, isHiddenAchievement, type AchievCategory, type AchievTier,
} from '@/lib/game/achievements';
import { PageScroll } from '@/components/ui/Page';
import { SearchIcon } from '@/components/ui/CollectionFilters';
import { normalizeSearch } from '@/lib/game/collectionFilters';
import { AchievementCard } from './achievements/AchievementCard';
import { TrophiesPanel } from './achievements/TrophiesPanel';
import { TitlesPanel } from './achievements/TitlesPanel';
import { categoryVars, getEntryState, readRevealed, writeRevealed, type AchStatus } from './achievements/achievementUi';

type View = 'achievements' | 'trophies' | 'titles';
type StatusFilter = 'all' | AchStatus;
type Sort = 'default' | 'progress' | 'tier';

const STATUS_FILTERS: { id: StatusFilter; label: string; color: string; glow: string }[] = [
  { id:'all',       label:'✦ TOUS',         color:'#c084fc', glow:'#9333ea' },
  { id:'claimable', label:'🎁 À RÉCUPÉRER', color:'#fbbf24', glow:'#d97706' },
  { id:'progress',  label:'⏳ EN COURS',     color:'#22d3ee', glow:'#0891b2' },
  { id:'done',      label:'✓ TERMINÉS',     color:'#4ade80', glow:'#16a34a' },
];

// Les deux familles de succès, affichées en sections séparées.
const SECTIONS = [
  { reset: false, icon: '♾', title: 'SUCCÈS PERMANENTS', hint: 'Conservés pour toujours, même après un Prestige.', accent: '#fde68a' },
  { reset: true,  icon: '🔄', title: 'SUCCÈS DE RUN', hint: 'Remis à zéro à chaque Prestige : progression et récompenses à regagner.', accent: '#93c5fd' },
] as const;

// Segment de tri façon Compadex (voir CollectionFilters) — libellés courts,
// détail au survol.
const SORTS: { id: Sort; label: string; hint: string; reversed: string }[] = [
  { id:'default',  label:'DÉFAUT',     hint:'Ordre par défaut (à récupérer en tête)', reversed:'Ordre par défaut inversé' },
  { id:'progress', label:'AVANCEMENT', hint:'Plus avancés d’abord',                   reversed:'Moins avancés d’abord' },
  { id:'tier',     label:'RANG',       hint:'Rang (Platine → Bronze)',                reversed:'Rang (Bronze → Platine)' },
];

const TIER_ORDER: AchievTier[] = ['bronze', 'silver', 'gold', 'platinum'];
const TITLE_TAPS_FOR_RAIN = 10;
const RAIN_ICONS = ['🏆', '🥇', '⭐', '💎', '👑', '✨'];

// Anneau de progression global.
function Ring({ pct }: { pct: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:126, height:126, flexShrink:0 }}>
      <svg width="126" height="126" className="ach-ring">
        <defs>
          <linearGradient id="achRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="63" cy="63" r={r} fill="none" strokeWidth="9" className="ach-ring__track" />
        <circle cx="63" cy="63" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="ach-ring__fill"
          stroke="url(#achRingGrad)" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24, color:'#fde68a', lineHeight:1 }}>{pct}%</span>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'var(--text-dim)', letterSpacing:0.5 }}>COMPLÉTION</span>
      </div>
    </div>
  );
}

// memo : GameLayout se re-rend à chaque tick de combat (pièces, kills…) ;
// sans props, la page n'a alors aucune raison de se re-rendre avec lui.
export const AchievementsPage = memo(function AchievementsPage() {
  const { unlocked, progress, claimed, showcasedCount, claimAchievements, claimAllAchievements, discover } = useGameStore(useShallow(s => ({
    unlocked: s.achievementUnlocked,
    progress: s.achievementProgress,
    claimed: s.achievementsClaimed,
    showcasedCount: s.showcasedTrophies.length,
    claimAchievements: s.claimAchievements,
    claimAllAchievements: s.claimAllAchievements,
    discover: s.discover,
  })));

  const [view, setView]     = useState<View>('achievements');
  const [cat, setCat]       = useState<AchievCategory | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort]     = useState<Sort>('default');
  const [sortReversed, setSortReversed] = useState(false);
  const [query, setQuery]   = useState('');

  // ── Secrets "découverts" : animation de révélation une seule fois ────────
  const [revealed, setRevealed] = useState<Set<string>>(readRevealed);
  const markRevealed = useCallback((ids: string[]) => {
    setRevealed(prev => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      writeRevealed(next);
      return next;
    });
  }, []);

  // ── Easter egg : tapoter le grand titre fait pleuvoir des trophées ───────
  const taps = useRef<number[]>([]);
  const [rain, setRain] = useState<{ id: number; left: number; delay: number; dur: number; icon: string }[] | null>(null);
  const tapTitle = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter(t => now - t < 4000), now];
    if (taps.current.length < TITLE_TAPS_FOR_RAIN) return;
    taps.current = [];
    discover(EGG.trophyRain);
    setRain(Array.from({ length: 36 }, (_, i) => ({
      id: now + i, left: Math.random() * 100, delay: Math.random() * 1.4, dur: 2.2 + Math.random() * 1.8,
      icon: RAIN_ICONS[i % RAIN_ICONS.length],
    })));
    setTimeout(() => setRain(null), 4600);
  };

  // ── Agrégats ─────────────────────────────────────────────────────────────
  const total = ACHIEVEMENTS.length;
  const doneCount = ACHIEVEMENTS.filter(a => unlocked[a.id]).length;
  const pct = Math.floor((doneCount / total) * 100);
  const claimableCount = ACHIEVEMENTS.filter(a => unlocked[a.id] && !claimed[a.id]).length;

  const perCategory = useMemo(() => {
    const out = {} as Record<AchievCategory, { done: number; total: number; claimable: number }>;
    for (const c of ACHIEVEMENT_CATEGORIES) out[c.id] = { done: 0, total: 0, claimable: 0 };
    for (const a of ACHIEVEMENTS) {
      const e = out[a.category];
      e.total++;
      if (unlocked[a.id]) { e.done++; if (!claimed[a.id]) e.claimable++; }
    }
    return out;
  }, [unlocked, claimed]);

  const tierCounts = useMemo(() => {
    const out: Record<AchievTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    for (const a of ACHIEVEMENTS) if (unlocked[a.id]) out[getAchievementTier(a)]++;
    return out;
  }, [unlocked]);

  // Recherche différée : la saisie reste fluide, la grille suit juste après.
  const deferredQuery = useDeferredValue(query);
  const list = useMemo(() => {
    // Insensible aux accents et à la casse, comme la recherche du Compadex.
    const q = normalizeSearch(deferredQuery);
    const items = ACHIEVEMENT_ENTRIES.map(entry => ({ entry, st: getEntryState(entry, progress, unlocked, claimed) })).filter(({ entry, st }) => {
      if (cat !== 'all' && entry.levels[0].category !== cat) return false;
      if (status !== 'all' && st.status !== status) return false;
      if (q) {
        // Un niveau caché ne se trouve pas par son vrai nom avant d'être débloqué.
        const visible = entry.levels.filter(a => !isHiddenAchievement(a) || unlocked[a.id]);
        const hay = [entry.series && visible.length > 0 ? entry.series.name : '', ...visible.map(a => `${a.name} ${a.description} ${a.title}`)].join(' ');
        if (!normalizeSearch(hay || '???').includes(q)) return false;
      }
      return true;
    });
    if (sort === 'progress') items.sort((x, y) => y.st.ratio - x.st.ratio);
    if (sort === 'tier')     items.sort((x, y) => TIER_META[getAchievementTier(y.st.current)].score - TIER_META[getAchievementTier(x.st.current)].score);
    // Réclamables toujours en tête (hors tri explicite) : c'est l'action attendue.
    if (sort === 'default')  items.sort((x, y) => Number(y.st.status === 'claimable') - Number(x.st.status === 'claimable'));
    if (sortReversed) items.reverse();
    return items.map(i => i.entry);
  }, [cat, status, sort, sortReversed, deferredQuery, unlocked, claimed, progress]);

  const meta = cat === 'all' ? null : CATEGORY_META[cat];
  const catStats = cat === 'all' ? null : perCategory[cat];
  // Clé de la grille : relance l'animation d'entrée des cartes à chaque
  // changement de filtre (pas à chaque progression, ni à chaque lettre tapée
  // dans la recherche — qui recréait sinon toutes les cartes).
  const gridKey = `${cat}|${status}|${sort}|${sortReversed}`;
  const sortIdx = Math.max(0, SORTS.findIndex(s => s.id === sort));
  const curSort = SORTS[sortIdx];

  return (
    <PageScroll>
      {rain && (
        <div className="gv-rain" aria-hidden>
          {rain.map(d => (
            <span key={d.id} style={{ left:`${d.left}%`, animationDelay:`${d.delay}s`, animationDuration:`${d.dur}s` }}>{d.icon}</span>
          ))}
        </div>
      )}

      {/* ══ EN-TÊTE ══════════════════════════════════════════════════════ */}
      <div className="ach-hero">
        <div style={{ position:'relative', display:'flex', gap:22, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 320px', minWidth:0, display:'flex', flexDirection:'column', gap:10 }}>
            <div className="ach-hero__brand">GACHAVERSE</div>
            <div className="ach-hero__title" onClick={tapTitle}>SUCCÈS</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24, color:'#fff' }}>{doneCount}</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:18, color:'var(--text-dim)' }}>/ {total} succès</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:18, color:'#fbbf24', marginLeft:'auto' }}>{pct}%</span>
            </div>
            <div className="ach-bar"><div className="ach-bar__fill" style={{ width:`${pct}%` }} /></div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {TIER_ORDER.map(t => (
                <div key={t} className="ach-stat" style={{ flexDirection:'row', alignItems:'center', gap:7, padding:'6px 10px' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:TIER_META[t].color, boxShadow:`0 0 8px ${TIER_META[t].glow}` }} />
                  <span className="ach-stat__val" style={{ fontSize:16, color:TIER_META[t].color }}>{tierCounts[t]}</span>
                  <span className="ach-stat__lbl">{TIER_META[t].label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, margin:'0 auto' }}>
            <Ring pct={pct} />
            {claimableCount > 0 ? (
              <button className="ach-claim-all" onClick={() => claimAllAchievements()}><span className="ach-claim-all__shine" aria-hidden />🎁 TOUT RÉCUPÉRER ({claimableCount})</button>
            ) : (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'var(--text-dim)' }}>Aucune récompense en attente</div>
            )}
          </div>
        </div>
      </div>

      {/* ══ VUES ═════════════════════════════════════════════════════════ */}
      <div className="ach-views">
        {([
          ['achievements', '🏆 SUCCÈS'],
          ['trophies', `🏛 TROPHÉES (${showcasedCount}/${MAX_SHOWCASED_TROPHIES})`],
          ['titles', '👑 TITRES'],
        ] as const).map(([id, label]) => (
          <button key={id} className={`ach-view${view === id ? ' is-active' : ''}`} onClick={() => setView(id)}>{label}</button>
        ))}
      </div>

      {view === 'trophies' && <TrophiesPanel />}
      {view === 'titles' && <TitlesPanel />}

      {view === 'achievements' && (
        <>
          {/* ── Onglets de catégorie ── */}
          <div className="ach-tabs">
            <button className={`ach-tab${cat === 'all' ? ' is-active' : ''}`} onClick={() => setCat('all')} style={categoryVars('#fde68a')}>
              <div className="ach-tab__top"><span className="ach-tab__icon">✦</span><span className="ach-tab__label">TOUS</span></div>
              <div className="ach-tab__count">{doneCount} / {total}</div>
              <div className="ach-tab__bar" style={{ width:`${pct}%` }} />
              {claimableCount > 0 && <span className="ach-tab__dot">{claimableCount}</span>}
            </button>
            {ACHIEVEMENT_CATEGORIES.map(c => {
              const st = perCategory[c.id];
              return (
                <button key={c.id} className={`ach-tab${cat === c.id ? ' is-active' : ''}`} onClick={() => setCat(c.id)} style={categoryVars(c.accent)}>
                  <div className="ach-tab__top"><span className="ach-tab__icon">{c.icon}</span><span className="ach-tab__label">{c.label}</span></div>
                  <div className="ach-tab__count">{st.done} / {st.total}</div>
                  <div className="ach-tab__bar" style={{ width:`${st.total ? (st.done / st.total) * 100 : 0}%` }} />
                  {st.claimable > 0 && <span className="ach-tab__dot">{st.claimable}</span>}
                </button>
              );
            })}
          </div>

          {/* ── Bandeau de la catégorie choisie ── */}
          {meta && catStats && (
            <div key={meta.id} className="ach-catbar" style={categoryVars(meta.accent)}>
              <span style={{ fontSize:28, filter:`drop-shadow(0 0 10px ${meta.accent})` }}>{meta.icon}</span>
              <div style={{ flex:'1 1 240px', minWidth:0 }}>
                <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:20, letterSpacing:2, color:meta.accent }}>{meta.label}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-sub)' }}>{meta.blurb}</div>
              </div>
              <div style={{ flex:'0 1 220px', minWidth:160 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--f-num)', fontSize:14, fontWeight:800, marginBottom:5 }}>
                  <span style={{ color:'var(--text-sub)' }}>{catStats.done} / {catStats.total}</span>
                  <span style={{ color:meta.accent }}>{Math.floor((catStats.done / catStats.total) * 100)}%</span>
                </div>
                <div className="ach-prog__track" style={categoryVars(meta.accent)}>
                  <div className="ach-prog__fill" style={{ width:`${(catStats.done / catStats.total) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Filtres ── une seule ligne sur PC ; sur mobile, les blocs
              passent à la ligne selon la largeur (voir .ach-toolbar2). */}
          <div className="cf-frame">
            <div className="cf-frame__inner ach-toolbar2">
              <div className="cf-search ach-toolbar2__search">
                <SearchIcon />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un succès, un titre…" />
                {query && <button type="button" className="cf-search__clear" onClick={() => setQuery('')} aria-label="Effacer la recherche">✕</button>}
              </div>
              <div className="ach-toolbar2__status">
                {STATUS_FILTERS.map(f => {
                  const on = status === f.id;
                  return (
                    <button key={f.id} type="button" className="cf-press cf-bevel" onClick={() => setStatus(on && f.id !== 'all' ? 'all' : f.id)} style={{
                      background: on ? `linear-gradient(135deg, ${f.color}, ${f.glow})` : `${f.color}14`,
                      color: on ? '#0a0818' : f.color, boxShadow: on ? `0 0 16px ${f.glow}` : 'none',
                    }}>{f.label}</button>
                  );
                })}
              </div>
              {/* Nombre de résultats + tri, collés et poussés à droite. */}
              <div className="ach-sortbar">
                <span className="ach-sortbar__count">{list.length} résultat{list.length > 1 ? 's' : ''}</span>
                <div className="ach-sort">
                  <div className="cf-segment" role="radiogroup" aria-label="Trier" style={{ ['--n' as string]: SORTS.length } as CSSProperties}>
                    <div className="cf-segment__thumb" style={{
                      left:`calc(3px + ${sortIdx} * (100% - 6px) / ${SORTS.length})`,
                      width:`calc((100% - 6px) / ${SORTS.length})`,
                    }} />
                    {SORTS.map(s => (
                      <button key={s.id} type="button" role="radio" aria-checked={sort === s.id} title={s.hint}
                        onClick={() => { if (s.id !== sort) { setSort(s.id); setSortReversed(false); } }}
                        style={{ color: sort === s.id ? '#fbbf24' : 'var(--text-dim)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="cf-sort-dir" onClick={() => setSortReversed(r => !r)}
                    title={sortReversed ? curSort.reversed : curSort.hint}
                    aria-label={`Inverser le tri (${sortReversed ? curSort.reversed : curSort.hint})`}
                    style={{ transform: sortReversed ? 'rotate(180deg)' : 'none' }}>
                    ↓
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Grilles : permanents puis succès de run ── */}
          {list.length === 0 ? (
            <div className="ach-empty">Aucun succès ne correspond à ces filtres.</div>
          ) : SECTIONS.map(sec => {
            const entries = list.filter(e => !!e.levels[0].resetsOnPrestige === sec.reset);
            if (entries.length === 0) return null;
            const levels = entries.flatMap(e => e.levels);
            const done = levels.filter(a => unlocked[a.id]).length;
            return (
              <section key={`${sec.title}|${gridKey}`} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div className="ach-section" style={categoryVars(sec.accent)}>
                  <span className="ach-section__icon">{sec.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="ach-section__title">{sec.title}</div>
                    <div className="ach-section__hint">{sec.hint}</div>
                  </div>
                  <span className="ach-section__count">{done} / {levels.length}</span>
                </div>
                <div className="ach-grid">
                  {entries.map((entry, i) => (
                    <AchievementCard key={entry.key} entry={entry} index={i}
                      progress={progress} unlocked={unlocked} claimed={claimed} revealed={revealed}
                      onClaim={claimAchievements} onRevealed={markRevealed} />
                  ))}
                </div>
              </section>
            );
          })}

          {cat === 'mastery' && (
            <div className="ach-empty" style={{ padding:'16px' }}>
              🎖️ La maîtrise détaillée de chaque personnage (et son bonus de DPS) se trouve dans la page <strong style={{ color:'#f9a8d4' }}>MAÎTRISE</strong> de la barre latérale.
            </div>
          )}
        </>
      )}
    </PageScroll>
  );
});
