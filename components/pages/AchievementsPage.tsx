'use client';
import { useState, useMemo } from 'react';
import { useAchievementStore } from '@/store/achievementStore';
import { ACHIEVEMENTS, CATEGORY_LABELS, AchievCategory } from '@/lib/game/achievements';
import { formatNumber } from '@/lib/game/format';
import { PageScroll, SectionHeader } from '@/components/ui/Page';
import { TITLE_GOLD_BONUS_PCT, EVENT_TITLES } from '@/lib/game/titles';

const CATEGORIES: (AchievCategory | 'all')[] = ['all', 'combat', 'progression', 'collection', 'gacha', 'social'];

export function AchievementsPage() {
  const { unlocked, progress, activeTitle, unlockedTitles, setActiveTitle, unlockedCount, isClaimed, claimAchievement } = useAchievementStore();
  const [cat, setCat]   = useState<AchievCategory | 'all'>('all');
  const [tab, setTab]   = useState<'achievements' | 'prestige' | 'titles'>('achievements');

  const filtered = useMemo(() =>
    cat === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter(a => a.category === cat),
  [cat]);

  // Succès qui survivent au Prestige (resetsOnPrestige absent/false) — voir
  // le commentaire sur ce champ dans lib/game/achievements.ts.
  const prestigeAchievements = useMemo(() =>
    ACHIEVEMENTS.filter(a => !a.resetsOnPrestige),
  []);

  const total    = ACHIEVEMENTS.length;
  const unlockd  = unlockedCount();
  const pct      = Math.round((unlockd / total) * 100);

  const renderAchievementCard = (a: typeof ACHIEVEMENTS[number]) => {
    const done = !!unlocked[a.id];
    const prog = progress[a.id] ?? 0;
    const pct2 = Math.min((prog / a.target) * 100, 100);
    const isSecret = a.secret && !done;

    return (
      <div key={a.id} className="panel" style={{
        padding:'14px 16px',
        borderColor: done ? 'rgba(251,191,36,0.35)' : 'var(--border)',
        boxShadow: done ? '0 0 20px rgba(251,191,36,0.1)' : 'none',
        opacity: isSecret ? 0.5 : 1,
        transition:'all 0.2s',
        position:'relative',
        overflow:'hidden',
      }}>
        {/* Bande dorée en haut si terminé */}
        {done && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,#fbbf24,transparent)' }} />}

        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px' }}>
          {/* Icône */}
          <div style={{
            width:40, height:40, flexShrink:0,
            background: done ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${done ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
            borderRadius:'10px',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'18.5px',
            filter: done ? 'none' : 'grayscale(0.7)',
          }}>
            {isSecret ? '❓' : a.icon}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'3px' }}>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'13.4px', color: done ? '#fbbf24' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {isSecret ? '???' : a.name}
              </span>
              {done && <span style={{ fontSize:'14.4px', flexShrink:0 }}>✅</span>}
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', marginBottom:'8px', lineHeight:1.4 }}>
              {isSecret ? 'Succès secret — continue à jouer pour le découvrir' : a.description}
            </div>

            {!done && !isSecret && (
              <>
                <div className="prog-track" style={{ marginBottom:'4px' }}>
                  <div className="prog-fill" style={{ width:`${pct2}%`, background:'linear-gradient(90deg,#78350f,#d97706,#fbbf24)', boxShadow:'0 0 6px rgba(251,191,36,0.4)' }} />
                </div>
                <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', color:'var(--text-dim)' }}>
                  {formatNumber(prog)} / {formatNumber(a.target)}
                </div>
              </>
            )}

            {a.reward && !isSecret && (() => {
              const alreadyClaimed = isClaimed(a.id);
              const rewardLabel = a.reward.type === 'title'
                ? `Titre « ${a.reward.value} »`
                : a.reward.type === 'gems'
                  ? `+${a.reward.value} 💎`
                  : `+${formatNumber(a.reward.value as number)} 🪙`;

              // Débloqué mais pas encore réclamé : gros bouton RÉCUP cliquable.
              if (done && !alreadyClaimed) {
                return (
                  <button onClick={() => claimAchievement(a.id)}
                    style={{ marginTop:'6px', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', width:'100%',
                      background:'linear-gradient(135deg,#f59e0b,#fbbf24)', border:'1px solid #fbbf24', borderRadius:'8px', padding:'6px 10px',
                      cursor:'pointer', animation:'pulseGlow 1.6s ease-in-out infinite' }}>
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:900, fontSize:'12px', color:'#1a1305', letterSpacing:'0.5px' }}>
                      🎁 RÉCUP — {rewardLabel}
                    </span>
                  </button>
                );
              }

              // Déjà réclamé, ou pas encore débloqué : badge statique normal.
              return (
                <div style={{ marginTop:'6px', display:'inline-flex', alignItems:'center', gap:'5px', background: alreadyClaimed ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${alreadyClaimed ? 'rgba(74,222,128,0.3)' : 'var(--border)'}`, borderRadius:'6px', padding:'3px 8px' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color: alreadyClaimed ? '#4ade80' : 'var(--text-dim)', fontWeight:700 }}>
                    {alreadyClaimed ? '✓ Reçu :' : '🔒 Récompense :'}
                  </span>
                  <span style={{ fontFamily:'var(--f-num)', fontSize:'12px', color: alreadyClaimed ? '#4ade80' : 'var(--text-dim)', fontWeight:700 }}>
                    {rewardLabel}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageScroll>

        {/* Header */}
        <SectionHeader
          eyebrow={`${unlockd} / ${total} débloqués — ${unlockedTitles.length} titre${unlockedTitles.length > 1 ? 's' : ''}`}
          title="SUCCÈS"
          accent="#fbbf24"
          right={
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', minWidth:'180px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', fontWeight:700 }}>PROGRESSION</span>
                <span style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'#fbbf24', fontWeight:700 }}>{pct}%</span>
              </div>
              <div className="prog-track" style={{ width:'100%' }}>
                <div className="prog-fill" style={{ width:`${pct}%`, background:'linear-gradient(90deg,#78350f,#fbbf24)', boxShadow:'0 0 8px rgba(251,191,36,0.5)' }} />
              </div>
            </div>
          }
        />

        {/* Onglets */}
        <div style={{ display:'flex', gap:'8px' }}>
          {(['achievements','prestige','titles'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'8px 18px', borderRadius:'8px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', letterSpacing:'0.5px', transition:'all 0.15s',
                background: tab===t ? 'rgba(251,191,36,0.15)' : 'var(--bg-card)',
                border: `1px solid ${tab===t ? '#fbbf2466' : 'var(--border)'}`,
                color: tab===t ? '#fbbf24' : 'var(--text-dim)' }}>
              {t === 'achievements' ? '🏆 SUCCÈS' : t === 'prestige' ? '🏆 SUCCÈS PRESTIGIEUX' : '👑 TITRES'}
            </button>
          ))}
        </div>

        {tab === 'achievements' ? (
          <>
            {/* Filtres catégorie */}
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  style={{ padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', letterSpacing:'0.5px', transition:'all 0.15s',
                    background: cat===c ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${cat===c ? 'rgba(251,191,36,0.4)' : 'var(--border)'}`,
                    color: cat===c ? '#fbbf24' : 'var(--text-dim)' }}>
                  {c === 'all' ? '✦ TOUS' : CATEGORY_LABELS[c as AchievCategory]}
                </button>
              ))}
            </div>

            {/* Grille succès */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:'10px' }}>
              {filtered.map(renderAchievementCard)}
            </div>
          </>
        ) : tab === 'prestige' ? (
          <>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
              Ces succès sont acquis pour toujours : contrairement aux autres, ils ne sont jamais remis à zéro par un Prestige.
            </div>

            {/* Grille succès prestigieux */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:'10px' }}>
              {prestigeAchievements.map(renderAchievementCard)}
            </div>
          </>
        ) : (
          /* ── ONGLET TITRES ── */
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
              Choisis le titre affiché sur ton profil. Les titres se débloquent en complétant des succès.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'10px' }}>
              {ACHIEVEMENTS.filter(a => a.reward?.type === 'title').map(a => {
                const titleStr = a.reward!.value as string;
                const isUnlk   = unlockedTitles.includes(titleStr);
                const isActive = activeTitle === titleStr;
                return (
                  <div key={a.id} onClick={() => isUnlk && setActiveTitle(titleStr)}
                    className="panel"
                    style={{
                      padding:'14px 16px',
                      cursor: isUnlk ? 'pointer' : 'not-allowed',
                      opacity: isUnlk ? 1 : 0.45,
                      borderColor: isActive ? '#fbbf2466' : isUnlk ? 'var(--border-lit)' : 'var(--border)',
                      background: isActive ? 'rgba(251,191,36,0.08)' : undefined,
                      boxShadow: isActive ? '0 0 20px rgba(251,191,36,0.15)' : 'none',
                      transition:'all 0.15s',
                    }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                      <span style={{ fontSize:'20.6px' }}>{a.icon}</span>
                      {isActive && <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:700, color:'#fbbf24', letterSpacing:'1px', background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)', padding:'2px 7px', borderRadius:'4px' }}>ACTIF</span>}
                      {!isUnlk && <span style={{ fontSize:'12.4px' }}>🔒</span>}
                    </div>
                    <div style={{ fontFamily:'var(--f-title)', fontSize:'15.5px', fontWeight:700, color: isActive ? '#fbbf24' : isUnlk ? 'var(--text)' : 'var(--text-muted)', letterSpacing:'1px', marginBottom:'3px' }}>
                      « {titleStr} »
                    </div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>
                      {isUnlk ? a.name : `Succès : ${a.name}`}
                    </div>
                    <div style={{ marginTop:'6px', fontFamily:'var(--f-num)', fontSize:'12px', fontWeight:800, color: isUnlk ? 'var(--gold-hi)' : 'var(--text-muted)' }}>
                      🪙 +{TITLE_GOLD_BONUS_PCT[titleStr] ?? 0}% d'or
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Titres d'événement — drop rare de boss d'event, pas de succès associé ── */}
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:2, marginTop:'8px' }}>TITRES D&apos;ÉVÉNEMENT</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'10px' }}>
              {Object.values(EVENT_TITLES).map(titleStr => {
                const isUnlk   = unlockedTitles.includes(titleStr);
                const isActive = activeTitle === titleStr;
                return (
                  <div key={titleStr} onClick={() => isUnlk && setActiveTitle(titleStr)}
                    className="panel"
                    style={{
                      padding:'14px 16px',
                      cursor: isUnlk ? 'pointer' : 'not-allowed',
                      opacity: isUnlk ? 1 : 0.45,
                      borderColor: isActive ? '#fbbf2466' : isUnlk ? 'var(--border-lit)' : 'var(--border)',
                      background: isActive ? 'rgba(251,191,36,0.08)' : undefined,
                      boxShadow: isActive ? '0 0 20px rgba(251,191,36,0.15)' : 'none',
                      transition:'all 0.15s',
                    }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                      <span style={{ fontSize:'20.6px' }}>🏆</span>
                      {isActive && <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:700, color:'#fbbf24', letterSpacing:'1px', background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)', padding:'2px 7px', borderRadius:'4px' }}>ACTIF</span>}
                      {!isUnlk && <span style={{ fontSize:'12.4px' }}>🔒</span>}
                    </div>
                    <div style={{ fontFamily:'var(--f-title)', fontSize:'15.5px', fontWeight:700, color: isActive ? '#fbbf24' : isUnlk ? 'var(--text)' : 'var(--text-muted)', letterSpacing:'1px', marginBottom:'3px' }}>
                      « {titleStr} »
                    </div>
                    <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>
                      Drop rare (1%) sur un boss d&apos;événement
                    </div>
                    <div style={{ marginTop:'6px', fontFamily:'var(--f-num)', fontSize:'12px', fontWeight:800, color: isUnlk ? 'var(--gold-hi)' : 'var(--text-muted)' }}>
                      🪙 +{TITLE_GOLD_BONUS_PCT[titleStr] ?? 0}% d&apos;or
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </PageScroll>
  );
}
