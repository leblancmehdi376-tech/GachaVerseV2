'use client';
import { useEffect, type CSSProperties } from 'react';
import { useAchievementFxStore } from '@/store/achievementFxStore';
import { ACHIEVEMENT_BY_ID, CATEGORY_META, SERIES_BY_ACHIEVEMENT, TIER_META, getAchievementTier } from '@/lib/game/achievements';
import { Medal } from '@/components/pages/achievements/AchievementCard';
import { tierVars, rewardLabel } from '@/components/pages/achievements/achievementUi';

const DISPLAY_MS = 4100; // doit couvrir achToastIn + délai + achToastOut (voir globals.css)

/**
 * Bannière animée "SUCCÈS DÉBLOQUÉ" — une à la fois, dans l'ordre de
 * déblocage (file alimentée par setProgress, voir achievementFxStore).
 */
export function AchievementUnlockBanner() {
  const current = useAchievementFxStore(s => s.queue[0]);
  const shift = useAchievementFxStore(s => s.shift);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(shift, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [current, shift]);

  const a = current && ACHIEVEMENT_BY_ID.get(current.id);
  if (!current || !a) return null;
  const isSecret = a.category === 'secrets' || a.secret;
  const tier = TIER_META[getAchievementTier(a)];
  const series = SERIES_BY_ACHIEVEMENT.get(a.id);
  const level = series ? [...series.ids].sort((x, y) => ACHIEVEMENT_BY_ID.get(x)!.target - ACHIEVEMENT_BY_ID.get(y)!.target).indexOf(a.id) + 1 : 0;

  return (
    <div key={current.key} className="ach-toast" role="status" onClick={shift} style={tierVars(a) as CSSProperties}>
      <div className="ach-toast__rays" />
      <div style={{ position:'relative' }}><Medal a={a} /></div>
      <div style={{ position:'relative', minWidth:0, display:'flex', flexDirection:'column', gap:2 }}>
        <span className="ach-toast__kicker">{isSecret ? '✦ SECRET DÉCOUVERT ✦' : `SUCCÈS DÉBLOQUÉ · ${tier.label}`}</span>
        <span className="ach-toast__name">{a.name}</span>
        <span className="ach-toast__sub">
          {series ? `${series.icon} ${series.name} · Niv. ${level}/${series.ids.length}` : `${CATEGORY_META[a.category].icon} ${CATEGORY_META[a.category].label}`} · 🎁 {rewardLabel(a)}
        </span>
      </div>
    </div>
  );
}
