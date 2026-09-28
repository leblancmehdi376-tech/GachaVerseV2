'use client';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { ACHIEVEMENTS } from '@/lib/game/achievements';
import { TITLE_GOLD_BONUS_PCT, RAID_TITLES } from '@/lib/game/titles';
import { DAILY_REWARD_TITLES } from '@/lib/game/dailyRewards';

function TitleCard({ icon, title, subtitle, unlocked, active, onSelect }: {
  icon: string; title: string; subtitle: string; unlocked: boolean; active: boolean; onSelect: () => void;
}) {
  return (
    <div onClick={() => unlocked && onSelect()}
      className="panel"
      style={{
        padding:'14px 16px',
        cursor: unlocked ? 'pointer' : 'not-allowed',
        opacity: unlocked ? 1 : 0.45,
        borderColor: active ? '#fbbf2466' : unlocked ? 'var(--border-lit)' : 'var(--border)',
        background: active ? 'rgba(251,191,36,0.08)' : undefined,
        boxShadow: active ? '0 0 20px rgba(251,191,36,0.15)' : 'none',
        transition:'all 0.15s',
      }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
        <span style={{ fontSize:'20.6px' }}>{icon}</span>
        {active && <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:700, color:'#fbbf24', letterSpacing:'1px', background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)', padding:'2px 7px', borderRadius:'4px' }}>ACTIF</span>}
        {!unlocked && <span style={{ fontSize:'12.4px' }}>🔒</span>}
      </div>
      <div style={{ fontFamily:'var(--f-title)', fontSize:'15.5px', fontWeight:700, color: active ? '#fbbf24' : unlocked ? 'var(--text)' : 'var(--text-muted)', letterSpacing:'1px', marginBottom:'3px' }}>
        « {title} »
      </div>
      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>{subtitle}</div>
      <div style={{ marginTop:'6px', fontFamily:'var(--f-num)', fontSize:'12px', fontWeight:800, color: unlocked ? 'var(--gold-hi)' : 'var(--text-muted)' }}>
        🪙 +{TITLE_GOLD_BONUS_PCT[title] ?? 0}% d&apos;or
      </div>
    </div>
  );
}

const SECTION_LABEL = { fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:2, marginTop:'8px' } as const;
const GRID = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'10px' } as const;

export function TitlesPanel() {
  const { activeTitle, unlockedTitles, setActiveTitle, unlocked } = useGameStore(useShallow(s => ({
    activeTitle: s.activeTitle, unlockedTitles: s.unlockedTitles, setActiveTitle: s.setActiveTitle, unlocked: s.achievementUnlocked,
  })));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
      <div style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>
        Choisis le titre affiché sur ton profil. Les titres se débloquent en complétant des succès.
      </div>
      <div style={GRID}>
        {ACHIEVEMENTS.filter(a => a.reward?.type === 'title').map(a => {
          const titleStr = a.reward!.value as string;
          const isUnlk = unlockedTitles.includes(titleStr);
          // Un succès secret non débloqué ne dévoile pas son nom ici non plus.
          const hidden = (a.secret || a.category === 'secrets') && !unlocked[a.id];
          return (
            <TitleCard key={a.id} icon={hidden ? '❔' : a.icon} title={titleStr}
              subtitle={isUnlk ? a.name : `Succès : ${hidden ? '???' : a.name}`}
              unlocked={isUnlk} active={activeTitle === titleStr} onSelect={() => setActiveTitle(titleStr)} />
          );
        })}
      </div>

      {/* ── Titres de connexion journalière — calendrier 28 jours, pas de succès associé ── */}
      <div style={SECTION_LABEL}>TITRES DE CONNEXION JOURNALIÈRE</div>
      <div style={GRID}>
        {DAILY_REWARD_TITLES.map(({ day, title: titleStr }) => {
          const isUnlk = unlockedTitles.includes(titleStr);
          return (
            <TitleCard key={titleStr} icon="📅" title={titleStr}
              subtitle={isUnlk ? `Récompense de connexion — jour ${day}` : `Récompense de connexion : jour ${day}`}
              unlocked={isUnlk} active={activeTitle === titleStr} onSelect={() => setActiveTitle(titleStr)} />
          );
        })}
      </div>

      {/* ── Titres de raid — drop rare de boss de raid, pas de succès associé ── */}
      <div style={SECTION_LABEL}>TITRES DE RAID</div>
      <div style={GRID}>
        {Object.values(RAID_TITLES).map(titleStr => (
          <TitleCard key={titleStr} icon="🏆" title={titleStr} subtitle="Drop rare (1%) sur un boss de raid"
            unlocked={unlockedTitles.includes(titleStr)} active={activeTitle === titleStr} onSelect={() => setActiveTitle(titleStr)} />
        ))}
      </div>
    </div>
  );
}
