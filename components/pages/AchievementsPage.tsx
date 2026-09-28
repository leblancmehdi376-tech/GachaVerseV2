'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import {
  ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_ENTRIES, CATEGORY_META, EGG, TIER_META, MAX_SHOWCASED_TROPHIES,
  getAchievementTier, isHiddenAchievement, type AchievCategory, type AchievTier, type AchievementEntry,
} from '@/lib/game/achievements';
import { PageScroll } from '@/components/ui/Page';
import { AchievementCard } from './achievements/AchievementCard';
import { TrophiesPanel } from './achievements/TrophiesPanel';
import { TitlesPanel } from './achievements/TitlesPanel';
import { categoryVars, getEntryState, readRevealed, writeRevealed, type AchStatus } from './achievements/achievementUi';

type View = 'achievements' | 'trophies' | 'titles';
type StatusFilter = 'all' | AchStatus;
type Sort = 'default' | 'progress' | 'reward' | 'tier';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id:'all',       label:'TOUS' },
  { id:'claimable', label:'🎁 À RÉCUPÉRER' },
  { id:'progress',  label:'EN COURS' },
  { id:'done',      label:'✓ TERMINÉS' },
  { id:'locked',    label:'🔒 VERROUILLÉS' },
];

// Les deux familles de succès, affichées en sections séparées.
const SECTIONS = [
  { reset: false, icon: '♾', title: 'SUCCÈS PERMANENTS', hint: 'Conservés pour toujours, même après un Prestige.', accent: '#fde68a' },
  { reset: true,  icon: '🔄', title: 'SUCCÈS DE RUN', hint: 'Remis à zéro à chaque Prestige : progression et récompenses à regagner.', accent: '#93c5fd' },
] as const;

const SORTS: { id: Sort; label: string }[] = [
  { id:'default',  label:'Ordre du jeu' },
  { id:'progress', label:'Plus avancés' },
  { id:'reward',   label:'Meilleure récompense' },
  { id:'tier',     label:'Rang (Platine → Bronze)' },
];

const TIER_ORDER: AchievTier[] = ['bronze', 'silver', 'gold', 'platinum'];
const TITLE_TAPS_FOR_RAIN = 10;
const RAIN_ICONS = ['🏆', '🥇', '⭐', '💎', '👑', '✨'];

function rewardValue(entry: AchievementEntry): number {
  return Math.max(...entry.levels.map(a => a.reward?.type === 'title' ? 5000 : typeof a.reward?.value === 'number' ? a.reward.value : 0));
}

// Anneau de progression global.
function Ring({ pct }: { pct: number }) {
  const r = 46, c = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:112, height:112, flexShrink:0 }}>
      <svg width="112" height="112" className="ach-ring">
        <defs>
          <linearGradient id="achRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="56" cy="56" r={r} fill="none" strokeWidth="9" className="ach-ring__track" />
        <circle cx="56" cy="56" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="ach-ring__fill"
          stroke="url(#achRingGrad)" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24, color:'#fde68a', lineHeight:1 }}>{pct}%</span>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:10.5, color:'var(--text-dim)', letterSpacing:1.5 }}>COMPLÉTION</span>
      </div>
    </div>
  );
}

export function AchievementsPage() {
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

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = ACHIEVEMENT_ENTRIES.map(entry => ({ entry, st: getEntryState(entry, progress, unlocked, claimed) })).filter(({ entry, st }) => {
      if (cat !== 'all' && entry.levels[0].category !== cat) return false;
      if (status !== 'all' && st.status !== status) return false;
      if (q) {
        // Un niveau caché ne se trouve pas par son vrai nom avant d'être débloqué.
        const visible = entry.levels.filter(a => !isHiddenAchievement(a) || unlocked[a.id]);
        const hay = [entry.series && visible.length > 0 ? entry.series.name : '', ...visible.map(a => `${a.name} ${a.description} ${a.title}`)].join(' ');
        if (!(hay || '???').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sort === 'progress') items.sort((x, y) => y.st.ratio - x.st.ratio);
    if (sort === 'reward')   items.sort((x, y) => rewardValue(y.entry) - rewardValue(x.entry));
    if (sort === 'tier')     items.sort((x, y) => TIER_META[getAchievementTier(y.st.current)].score - TIER_META[getAchievementTier(x.st.current)].score);
    // Réclamables toujours en tête (hors tri explicite) : c'est l'action attendue.
    if (sort === 'default')  items.sort((x, y) => Number(y.st.status === 'claimable') - Number(x.st.status === 'claimable'));
    return items.map(i => i.entry);
  }, [cat, status, sort, query, unlocked, claimed, progress]);

  const meta = cat === 'all' ? null : CATEGORY_META[cat];
  const catStats = cat === 'all' ? null : perCategory[cat];
  // Clé de la grille : relance l'animation d'entrée des cartes à chaque
  // changement de filtre (pas à chaque progression).
  const gridKey = `${cat}|${status}|${sort}|${query}`;

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
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:22, color:'#fff' }}>{doneCount}</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:15, color:'var(--text-dim)' }}>/ {total} succès</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:800, fontSize:15, color:'#fbbf24', marginLeft:'auto' }}>{pct}%</span>
            </div>
            <div className="ach-bar"><div className="ach-bar__fill" style={{ width:`${pct}%` }} /></div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {TIER_ORDER.map(t => (
                <div key={t} className="ach-stat" style={{ flexDirection:'row', alignItems:'center', gap:7, padding:'6px 10px' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:TIER_META[t].color, boxShadow:`0 0 8px ${TIER_META[t].glow}` }} />
                  <span className="ach-stat__val" style={{ fontSize:13.5, color:TIER_META[t].color }}>{tierCounts[t]}</span>
                  <span className="ach-stat__lbl">{TIER_META[t].label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, margin:'0 auto' }}>
            <Ring pct={pct} />
            {claimableCount > 0 ? (
              <button className="ach-claim-all" onClick={() => claimAllAchievements()}>🎁 TOUT RÉCUPÉRER ({claimableCount})</button>
            ) : (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)' }}>Aucune récompense en attente</div>
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
                <div style={{ fontFamily:'var(--f-title)', fontWeight:900, fontSize:17, letterSpacing:2, color:meta.accent }}>{meta.label}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-sub)' }}>{meta.blurb}</div>
              </div>
              <div style={{ flex:'0 1 220px', minWidth:160 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--f-num)', fontSize:12, fontWeight:800, marginBottom:5 }}>
                  <span style={{ color:'var(--text-sub)' }}>{catStats.done} / {catStats.total}</span>
                  <span style={{ color:meta.accent }}>{Math.floor((catStats.done / catStats.total) * 100)}%</span>
                </div>
                <div className="ach-prog__track" style={categoryVars(meta.accent)}>
                  <div className="ach-prog__fill" style={{ width:`${(catStats.done / catStats.total) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Filtres ── */}
          <div className="ach-toolbar">
            <label className="ach-search">
              <span>🔎</span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un succès…" />
              {query && <button onClick={() => setQuery('')} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:14 }}>✕</button>}
            </label>
            <select className="ach-select" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Trier">
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="ach-chips">
            {STATUS_FILTERS.map(f => (
              <button key={f.id} className={`ach-chip${status === f.id ? ' is-active' : ''}`} onClick={() => setStatus(f.id)}>{f.label}</button>
            ))}
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
}
