'use client';
import { memo, useEffect, useState, type CSSProperties } from 'react';
import { type Achievement, type AchievementEntry, TIER_META, getAchievementTier, isHiddenAchievement } from '@/lib/game/achievements';
import { tierVars, rewardLabel, formatAchValue, getEntryState } from './achievementUi';

const BURST_COLORS = ['#fbbf24', '#fde68a', '#c084fc', '#e879f9', '#4ade80', '#ffffff'];

// Particules pré-calculées (positions déterministes : pas de Math.random au
// rendu, qui donnerait un résultat différent à chaque re-render).
const BURST = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const dist = 38 + (i % 3) * 16;
  return { dx: `${Math.cos(angle) * dist}px`, dy: `${Math.sin(angle) * dist}px`, c: BURST_COLORS[i % BURST_COLORS.length] };
});

export function Medal({ a, icon, concealed = false }: { a: Achievement; icon?: string; concealed?: boolean }) {
  return (
    <div className="ach-medal">
      <span className="ach-medal__icon">{concealed ? '❔' : (icon ?? a.icon)}</span>
    </div>
  );
}

/** Libellé cumulé des récompenses de plusieurs niveaux (ex: "+75 💎 + Titre « X »"). */
function combinedReward(levels: Achievement[]): string {
  const gems = levels.reduce((s, a) => s + (a.reward?.type === 'gems' ? Number(a.reward.value) : 0), 0);
  const parts = gems > 0 ? [`+${gems} 💎`] : [];
  for (const a of levels) if (a.reward && a.reward.type !== 'gems') parts.push(rewardLabel(a));
  return parts.join(' + ') || '—';
}

export interface AchievementCardProps {
  entry: AchievementEntry;
  progress: Record<string, number>;
  unlocked: Record<string, boolean>;
  claimed: Record<string, boolean>;
  revealed: Set<string>;
  index: number;
  onClaim: (ids: string[]) => void;
  onRevealed: (ids: string[]) => void;
}

/**
 * Comparateur du memo : les maps progress/unlocked/claimed sont réallouées à
 * chaque progression de N'IMPORTE QUEL succès (plusieurs fois par seconde en
 * combat) — on ne re-rend la carte que si les valeurs de SES niveaux changent.
 */
export function sameCardProps(prev: AchievementCardProps, next: AchievementCardProps): boolean {
  if (prev.entry !== next.entry || prev.index !== next.index || prev.revealed !== next.revealed
    || prev.onClaim !== next.onClaim || prev.onRevealed !== next.onRevealed) return false;
  for (const { id } of next.entry.levels) {
    if (prev.progress[id] !== next.progress[id] || prev.unlocked[id] !== next.unlocked[id]
      || prev.claimed[id] !== next.claimed[id]) return false;
  }
  return true;
}

export const AchievementCard = memo(function AchievementCard({ entry, progress, unlocked, claimed, revealed, index, onClaim, onRevealed }: AchievementCardProps) {
  const [bursting, setBursting] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const { levels, series } = entry;
  const st = getEntryState(entry, progress, unlocked, claimed);
  const cur = st.current;
  const multi = levels.length > 1;
  // Carte entièrement masquée tant qu'aucun niveau n'est débloqué et que le
  // prochain est secret ; sinon seul le niveau suivant reste mystérieux.
  const curHidden = isHiddenAchievement(cur) && !unlocked[cur.id];
  const concealed = curHidden && st.doneCount === 0;
  const tier = TIER_META[getAchievementTier(cur)];
  const pct = st.allDone ? 100 : Math.min(100, ((progress[cur.id] ?? 0) / cur.target) * 100);

  // Niveaux secrets tout juste découverts : animation de révélation (une fois).
  const revealIds = levels.filter(a => isHiddenAchievement(a) && unlocked[a.id] && !revealed.has(a.id)).map(a => a.id);
  const revealing = revealIds.length > 0;
  const revealKey = revealIds.join(',');
  useEffect(() => {
    if (!revealKey) return;
    const t = setTimeout(() => onRevealed(revealKey.split(',')), 1400);
    return () => clearTimeout(t);
  }, [revealKey, onRevealed]);

  const claim = () => {
    if (bursting) return;
    setBursting(true);
    // Laisse la gerbe de particules démarrer avant que la carte ne change
    // d'état (ou ne disparaisse, avec le filtre "À récupérer").
    const ids = st.claimable.map(a => a.id);
    setTimeout(() => onClaim(ids), 380);
    setTimeout(() => setBursting(false), 950);
  };

  const cls = [
    'ach-card',
    st.allDone ? 'is-done' : st.doneCount > 0 ? 'is-partial' : 'is-todo',
    st.claimable.length > 0 && 'is-claimable',
    concealed && 'is-hidden',
    revealing && 'is-revealing',
  ].filter(Boolean).join(' ');

  const name = concealed ? '???' : series ? series.name : cur.name;
  const levelName = multi && !st.allDone ? (curHidden ? '???' : cur.name) : null;
  const desc = st.allDone && multi ? 'Tous les niveaux sont terminés !' : curHidden ? 'Condition inconnue' : cur.description;

  return (
    <div className={cls} style={{ ...tierVars(cur), ['--i' as string]: index } as CSSProperties}>
      {st.claimable.length > 0 && <span className="ach-card__pulse" aria-hidden="true" />}
      {revealing && <><div className="ach-reveal-flash" /><div className="ach-reveal-tag">SECRET DÉCOUVERT</div></>}
      {bursting && (
        <>
          <div className="ach-claimed-flash" />
          <div className="ach-burst">
            {BURST.map((p, i) => (
              <span key={i} style={{ ['--dx' as string]: p.dx, ['--dy' as string]: p.dy, ['--c' as string]: p.c } as CSSProperties} />
            ))}
          </div>
        </>
      )}

      <div className="ach-medal-wrap">
        <Medal a={cur} icon={series?.icon} concealed={concealed} />
        {multi && !concealed ? (
          <div className={`ach-lvl-badge${st.allDone ? ' is-done' : ''}`} aria-label={st.allDone ? 'Terminé' : undefined}>
            {st.allDone && '✓ '}{st.doneCount}/{levels.length}
          </div>
        ) : st.allDone && <div className="ach-check" aria-label="Terminé">✓</div>}
      </div>

      <div className="ach-card__body">
        <div className="ach-card__head">
          <span className="ach-card__name">{name}</span>
          {!concealed && <span className="ach-tier">{multi ? `NIV. ${Math.min(st.currentIdx + 1, levels.length)}` : tier.label}</span>}
        </div>

        {multi && !concealed && (
          <button className="ach-levels" onClick={() => setShowLevels(v => !v)} title="Voir les niveaux">
            {levels.map((a, i) => (
              <span key={a.id} className={`ach-level-pip${unlocked[a.id] ? ' is-on' : ''}${i === st.currentIdx && !st.allDone ? ' is-current' : ''}`} />
            ))}
            {levelName && <span className="ach-levels__name">{levelName}</span>}
            <span className="ach-levels__caret">{showLevels ? '▴' : '▾'}</span>
          </button>
        )}

        <div className="ach-card__desc">{desc}</div>

        {showLevels && multi && !concealed && (
          <div className="ach-level-list">
            {levels.map((a, i) => {
              const hidden = isHiddenAchievement(a) && !unlocked[a.id];
              return (
                <div key={a.id} className={`ach-level-row${unlocked[a.id] ? ' is-done' : ''}`}>
                  <span className="ach-level-row__n">{i + 1}</span>
                  <span className="ach-level-row__goal">{hidden ? '???' : `${a.name} · ${formatAchValue(a, a.target)}`}</span>
                  <span className="ach-level-row__rw">
                    {claimed[a.id] ? '✓' : unlocked[a.id] ? '🎁' : ''} {hidden ? '???' : rewardLabel(a)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="ach-prog">
          <div className="ach-prog__track">
            <div className={`ach-prog__fill${curHidden || pct <= 0 ? ' is-empty' : ''}`} style={{ width: `${curHidden ? 0 : pct}%` }} />
          </div>
          <span className="ach-prog__num">
            {curHidden ? '? / ?' : `${formatAchValue(cur, st.allDone ? cur.target : (progress[cur.id] ?? 0))} / ${formatAchValue(cur, cur.target)}`}
          </span>
        </div>

        <div className="ach-card__foot">
          {st.claimable.length > 0 ? (
            <button className="ach-claim" onClick={claim} disabled={bursting}>
              🎁 RÉCUPÉRER{st.claimable.length > 1 ? ` ×${st.claimable.length}` : ''} · {combinedReward(st.claimable)}
            </button>
          ) : (
            <span className={`ach-reward${st.allDone ? ' is-claimed' : ''}`}>
              {st.allDone ? '✓ Validé' : `🎁 ${curHidden ? '???' : rewardLabel(cur)}`}
            </span>
          )}
          {!st.allDone && (
            <span className="ach-state" style={{ color: pct > 0 ? 'var(--purple-glow)' : 'var(--text-muted)' }}>
              {Math.floor(pct)} %
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, sameCardProps);
