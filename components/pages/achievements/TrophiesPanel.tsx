'use client';
import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import {
  ACHIEVEMENTS, MAX_SHOWCASED_TROPHIES, ACHIEVEMENT_BY_ID, CATEGORY_META, EGG, TIER_META, getAchievementTier, type AchievTier,
} from '@/lib/game/achievements';
import { Medal } from './AchievementCard';
import { tierVars, rewardLabel } from './achievementUi';

const TIER_ORDER: AchievTier[] = ['platinum', 'gold', 'silver', 'bronze'];
const DOOR_KNOCKS = 3;

export function TrophiesPanel() {
  const { unlocked, showcased, toggle, discover, roomFound } = useGameStore(useShallow(s => ({
    unlocked: s.achievementUnlocked,
    showcased: s.showcasedTrophies,
    toggle: s.toggleShowcasedTrophy,
    discover: s.discover,
    roomFound: (s.achievementStats[EGG.room] ?? 0) > 0,
  })));
  const [tierFilter, setTierFilter] = useState<AchievTier | 'all'>('all');
  const [roomOpen, setRoomOpen] = useState(false);
  const [knocked, setKnocked] = useState(false);
  const knocks = useRef(0);

  const earned = useMemo(() => ACHIEVEMENTS
    .filter(a => unlocked[a.id])
    .sort((x, y) => TIER_META[getAchievementTier(y)].score - TIER_META[getAchievementTier(x)].score), [unlocked]);
  const prestige = earned.reduce((sum, a) => sum + TIER_META[getAchievementTier(a)].score, 0);
  const shown = tierFilter === 'all' ? earned : earned.filter(a => getAchievementTier(a) === tierFilter);
  const slots = Array.from({ length: MAX_SHOWCASED_TROPHIES }, (_, i) => showcased[i] ? ACHIEVEMENT_BY_ID.get(showcased[i]) : undefined);

  // Salle secrète : frapper 3 fois à la petite porte cachée de la vitrine.
  const knock = () => {
    setKnocked(true);
    setTimeout(() => setKnocked(false), 380);
    knocks.current += 1;
    if (knocks.current >= DOOR_KNOCKS) {
      knocks.current = 0;
      setRoomOpen(o => !o);
      discover(EGG.room);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="trophy-stage">
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:'var(--f-num)', fontSize:14, fontWeight:900, letterSpacing:2, color:'var(--gold-hi)' }}>VITRINE DU PROFIL</div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:24, fontWeight:900, color:'#fff', letterSpacing:2 }}>TROPHÉES</div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <div className="ach-stat"><span className="ach-stat__val" style={{ color:'#fde68a' }}>{prestige}</span><span className="ach-stat__lbl">PRESTIGE</span></div>
            <div className="ach-stat"><span className="ach-stat__val" style={{ color:'#c084fc' }}>{showcased.length} / {MAX_SHOWCASED_TROPHIES}</span><span className="ach-stat__lbl">EXPOSÉS</span></div>
          </div>
        </div>

        <div className="trophy-shelf">
          {slots.map((a, i) => a ? (
            <button key={a.id} className="trophy-slot" onClick={() => toggle(a.id)} title="Retirer de la vitrine"
              style={{ ...tierVars(a), ['--i' as string]: i } as CSSProperties}>
              <span className="trophy-slot__icon">{a.icon}</span>
              <span className="trophy-slot__name">{a.name}</span>
              <span className="ach-tier">{TIER_META[getAchievementTier(a)].label}</span>
              <span className="trophy-slot__plinth" />
            </button>
          ) : (
            <div key={`empty-${i}`} className="trophy-slot is-empty" style={{ ['--i' as string]: i } as CSSProperties}>
              <span style={{ fontSize:28, opacity:0.25 }}>🏆</span>
              <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)', fontWeight:700 }}>Emplacement libre</span>
              <span className="trophy-slot__plinth" style={{ opacity:0.4 }} />
            </div>
          ))}
        </div>

        <button className={`trophy-door${knocked ? ' is-knocked' : ''}`} onClick={knock} aria-label="Porte" />
      </div>

      {roomOpen && (
        <div className="trophy-room">
          <div style={{ fontFamily:'var(--f-num)', fontSize:14, fontWeight:900, letterSpacing:2, color:'#a78bfa' }}>SALLE SECRÈTE</div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:20, fontWeight:900, color:'#ede9fe', margin:'4px 0 8px' }}>Les Archives Oubliées</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:16, color:'var(--text-sub)', lineHeight:1.6 }}>
            Derrière la vitrine, des étagères couvertes de poussière d&apos;étoile. On y lit, gravé dans le cristal :
            <em style={{ color:'#e9d5ff' }}> « Le multivers garde dix secrets. Le chat errant en connaît certains. Le code des anciens en ouvre un autre. Et certains ne se révèlent qu&apos;à 3h33… »</em>
          </div>
          <div style={{ marginTop:10, fontFamily:'var(--f-ui)', fontSize:14, color:'#a78bfa', fontWeight:700 }}>
            {roomFound ? '✓ Salle secrète découverte' : ''}
          </div>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>
          Choisis jusqu&apos;à {MAX_SHOWCASED_TROPHIES} succès à exposer sur ton profil. Clique à nouveau pour les retirer.
        </div>
        <div className="ach-chips">
          {(['all', ...TIER_ORDER] as const).map(t => (
            <button key={t} className={`ach-chip${tierFilter === t ? ' is-active' : ''}`} onClick={() => setTierFilter(t)}>
              {t === 'all' ? 'TOUS' : TIER_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="ach-empty">Aucun succès débloqué dans ce rang pour l&apos;instant — continue à jouer !</div>
      ) : (
        <div className="ach-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {shown.map((a, i) => {
            const picked = showcased.includes(a.id);
            const full = !picked && showcased.length >= MAX_SHOWCASED_TROPHIES;
            return (
              <button key={a.id} onClick={() => toggle(a.id)} disabled={full}
                className={`ach-card is-done trophy-pick${picked ? ' is-picked' : ''}`}
                style={{ ...tierVars(a), ['--i' as string]: i, textAlign:'left', color:'inherit', opacity: full ? 0.5 : 1, cursor: full ? 'not-allowed' : 'pointer' } as CSSProperties}>
                <div className="ach-medal-wrap"><Medal a={a} /></div>
                <div className="ach-card__body">
                  <div className="ach-card__head">
                    <span className="ach-card__name">{a.name}</span>
                    <span className="ach-tier">{TIER_META[getAchievementTier(a)].label}</span>
                  </div>
                  <div className="ach-card__desc" style={{ fontSize:14 }}>{CATEGORY_META[a.category].icon} {CATEGORY_META[a.category].label} · {rewardLabel(a)}</div>
                  <div className="ach-state" style={{ color: picked ? '#fbbf24' : 'var(--text-dim)' }}>{picked ? '★ EXPOSÉ' : full ? 'VITRINE PLEINE' : '+ EXPOSER'}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
