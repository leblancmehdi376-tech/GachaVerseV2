'use client';
import { memo } from 'react';
import { useNow } from '@/hooks/useNow';
import {
  PERIPLE_MAX_DICE, PERIPLE_TIERS, PERIPLE_MISSIONS, PERIPLE_MAX_POINTS, TILE_INFO,
  getPeripleTierProgress, formatPeripleReward, shortPeripleReward, type PeripleDaily, type TileKind,
  PERIPLE_QUESTS, PERIPLE_QUESTS_TOTAL_GEMS, getPeripleQuestProgress, type PeripleQuest, type PeripleStats,
} from '@/lib/game/periple';
import { Countdown } from '@/components/pages/QuestsPage';
import { RewardIcon, MedalIcon } from './PeripleIcons';
import { TileBadge } from './TileBadge';

function fmtShort(ms: number): string {
  const m = Math.ceil(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function fmtLong(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}j ${String(h).padStart(2, '0')}h` : `${h}h ${String(m).padStart(2, '0')}min`;
}

/** Compte à rebours autonome : seul ce texte se re-rend (toutes les 30 s). */
export function LiveCountdown({ to, long }: { to: number; long?: boolean }) {
  const now = useNow(30_000);
  const rem = Math.max(0, to - now);
  return <>{long ? fmtLong(rem) : fmtShort(rem)}</>;
}

// ─── Dés ─────────────────────────────────────────────────────────────────────
export const DiceCard = memo(function DiceCard({ dice, nextDieAt, canRoll, busy, ended, pending, onRoll, onResume }: {
  dice: number; nextDieAt: number | null; canRoll: boolean; busy: boolean; ended: boolean;
  pending: TileKind | null; onRoll: () => void; onResume: () => void;
}) {
  const slots = Math.max(PERIPLE_MAX_DICE, dice);
  return (
    <div className="pp-card pp-card--dice">
      <div className="pp-card__head">
        <RewardIcon kind="dice" size={30} /> Dés
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-game)', fontSize: 30, color: dice > 0 ? '#fdba74' : 'var(--text-dim)' }}>
          {dice}<span style={{ fontSize: 20, color: 'var(--text-sub)' }}>/{PERIPLE_MAX_DICE}</span>
        </span>
      </div>
      <div className="pp-dice-slots">
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} className={`pp-dice-slot${i < dice ? ' is-full' : ''}`}>{i < dice && <RewardIcon kind="dice" size={28} />}</div>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--text-sub)', margin: '8px 0 12px', minHeight: 18 }}>
        {ended ? 'L’événement est terminé.' : nextDieAt === null ? 'Réserve pleine : lance-les !' : <>+1 dé dans <LiveCountdown to={nextDieAt} /></>}
      </div>
      {pending ? (
        <button className="pp-btn pp-btn--big pp-btn--purple pp-loop" style={{ width: '100%' }} disabled={busy} onClick={onResume}>
          ▶ {TILE_INFO[pending].game.toUpperCase()}
        </button>
      ) : (
        <button className="pp-btn pp-btn--big pp-loop" style={{ width: '100%' }} disabled={!canRoll} onClick={onRoll}>
          {busy ? '…' : 'LANCER LE DÉ'}
        </button>
      )}
      {pending && <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: '#e9d5ff', marginTop: 8, textAlign: 'center' }}>Termine le mini-jeu de la case pour relancer.</div>}
    </div>
  );
});

// ─── Jetons + accès boutique ─────────────────────────────────────────────────
export const TokensCard = memo(function TokensCard({ tokens, laps, onShop }: { tokens: number; laps: number; onShop: () => void }) {
  return (
    <div className="pp-card" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div className="pp-coin-glow"><RewardIcon kind="tokens" size={56} /></div>
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--text-sub)', letterSpacing: 1 }}>JETONS DU PÉRIPLE</div>
        <div style={{ fontFamily: 'var(--f-game)', fontSize: 32, color: '#fde68a', lineHeight: 1.05, textShadow: '0 2px 0 rgba(0,0,0,0.4)' }}>{tokens}</div>
        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 14, color: 'var(--text-dim)' }}>{laps} tour{laps > 1 ? 's' : ''} bouclé{laps > 1 ? 's' : ''}</div>
      </div>
      <button className="pp-btn pp-btn--blue pp-loop" onClick={onShop}>BOUTIQUE</button>
    </div>
  );
});

// ─── Paliers de récompenses ──────────────────────────────────────────────────
export const TiersCard = memo(function TiersCard({ points, claimed, onClaim }: { points: number; claimed: number[]; onClaim: (i: number) => void }) {
  const { next, pct, overallPct } = getPeripleTierProgress(points);
  const reached = PERIPLE_TIERS.filter(t => points >= t.points).length;
  const ready = PERIPLE_TIERS.filter((t, i) => points >= t.points && !claimed.includes(i)).length;
  return (
    <div className="pp-card">
      <div className="pp-card__head">
        <RewardIcon kind="points" size={28} /> Paliers
        <small>{reached}/{PERIPLE_TIERS.length}{ready > 0 ? ` · ${ready} à réclamer` : ''}</small>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--f-game)', fontSize: 22, color: '#fff' }}>{points} <span style={{ fontSize: 16, color: 'var(--text-sub)' }}>/ {PERIPLE_MAX_POINTS} pts</span></span>
        <span style={{ fontFamily: 'var(--f-game)', fontSize: 20, color: '#93c5fd' }}>{Math.floor(overallPct)}%</span>
      </div>
      <div className="pp-bar" style={{ marginBottom: 8 }}><div className="pp-bar__fill" style={{ width: `${overallPct}%` }} /></div>
      {next !== -1 && (
        <div className="pp-next-tier">
          <RewardIcon kind={PERIPLE_TIERS[next].reward.kind} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--text-sub)' }}>Prochain palier · {PERIPLE_TIERS[next].points - points} pts</div>
            <div style={{ fontFamily: 'var(--f-game)', fontSize: 16, color: '#fde68a', lineHeight: 1.15 }}>{formatPeripleReward(PERIPLE_TIERS[next].reward)}</div>
            <div className="pp-bar pp-bar--orange" style={{ height: 10, marginTop: 4 }}><div className="pp-bar__fill" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
      )}
      <div className="pp-tiers">
        {PERIPLE_TIERS.map((t, i) => {
          const done = claimed.includes(i);
          const isReady = !done && points >= t.points;
          const cls = done ? 'is-done' : isReady ? 'is-ready pp-loop' : 'is-locked';
          return (
            <button key={i} type="button" className={`pp-tier ${cls}${t.big ? ' is-big' : ''}`} disabled={!isReady} onClick={() => onClaim(i)}
              aria-label={`Palier ${i + 1} : ${formatPeripleReward(t.reward)}`} title={formatPeripleReward(t.reward)}>
              <span className="pp-tier__n">{i + 1}</span>
              <span className="pp-tier__icon"><RewardIcon kind={t.reward.kind} size={t.big ? 40 : 32} />{done && <span className="pp-tier__check">✓</span>}</span>
              <span className="pp-tier__amt">{shortPeripleReward(t.reward)}</span>
              <span className="pp-tier__pts">{isReady ? 'RÉCLAMER' : `${t.points}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ─── Missions quotidiennes ───────────────────────────────────────────────────
// Icône de l'activité demandée par la mission.
function MissionIcon({ id }: { id: string }) {
  if (id === 'm_rolls' || id === 'm_orbs') return <span className="pp-mission__icon"><RewardIcon kind="dice" size={34} /></span>;
  if (id === 'm_gold') return <span className="pp-mission__icon"><MedalIcon medal={3} size={38} /></span>;
  const tile: TileKind = id === 'm_combat' ? 'combat' : id === 'm_lap' ? 'start' : 'chance';
  return <span className="pp-mission__icon"><TileBadge kind={tile} size={40} /></span>;
}

export const MissionsCard = memo(function MissionsCard({ daily, onClaim }: { daily: PeripleDaily; onClaim: (id: string) => void }) {
  return (
    <div className="pp-card">
      <div className="pp-card__head">
        Missions du jour
        <small>⏳ <Countdown type="daily" /></small>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PERIPLE_MISSIONS.map(m => {
          const cur = Math.min(daily[m.counter] ?? 0, m.target);
          const done = daily.claimed.includes(m.id);
          const isReady = !done && cur >= m.target;
          return (
            <div key={m.id} className={`pp-mission${done ? ' is-done' : isReady ? ' is-ready' : ''}`}>
              <MissionIcon id={m.id} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)', lineHeight: 1.2 }}>{m.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div className="pp-bar pp-bar--green" style={{ flex: 1, height: 12 }}><div className="pp-bar__fill" style={{ width: `${(cur / m.target) * 100}%` }} /></div>
                  <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 14, color: 'var(--text-sub)', flexShrink: 0 }}>{cur}/{m.target}</span>
                </div>
              </div>
              {done ? (
                <span className="pp-mission__done" aria-label="Réclamée">✓</span>
              ) : (
                <button className="pp-btn pp-btn--small pp-btn--purple pp-loop" disabled={!isReady} onClick={() => onClaim(m.id)}
                  style={{ flexShrink: 0, minWidth: 82, padding: '6px 10px' }} aria-label={`Réclamer ${formatPeripleReward(m.reward)}`}>
                  <RewardIcon kind={m.reward.kind} size={24} /> {shortPeripleReward(m.reward).replace('×', '')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ─── Quêtes de l'événement (sur toute sa durée) ─────────────────────────────
function QuestIcon({ stat }: { stat: PeripleQuest['stat'] }) {
  const tile: Partial<Record<PeripleQuest['stat'], TileKind>> = {
    laps: 'start', games: 'chance', combat: 'combat', chance: 'chance', wheel: 'gacha', huntBest: 'hunt',
  };
  const t = tile[stat];
  if (t) return <span className="pp-mission__icon"><TileBadge kind={t} size={40} /></span>;
  if (stat === 'gold' || stat === 'goldAll') return <span className="pp-mission__icon"><MedalIcon medal={3} size={38} /></span>;
  const kind = stat === 'rolls' ? 'dice' : stat === 'spent' ? 'tokens' : stat === 'tiers' ? 'title' : 'points';
  return <span className="pp-mission__icon"><RewardIcon kind={kind} size={34} /></span>;
}

const fmtNum = (n: number) => n.toLocaleString('fr-FR');

export const EventQuestsCard = memo(function EventQuestsCard({ stats, tiersClaimed, claimed, onClaim }: {
  stats: PeripleStats; tiersClaimed: number; claimed: string[]; onClaim: (id: string) => void;
}) {
  const rows = PERIPLE_QUESTS.map(q => {
    const cur = getPeripleQuestProgress(q, stats, tiersClaimed);
    const done = claimed.includes(q.id);
    return { q, cur, done, ready: !done && cur >= q.target };
  });
  // Réclamables d'abord, puis les plus avancées, les réclamées en dernier.
  const order = (r: typeof rows[number]) => (r.ready ? 0 : r.done ? 2 : 1);
  rows.sort((a, b) => order(a) - order(b) || b.cur / b.q.target - a.cur / a.q.target);
  const earned = rows.filter(r => r.done).reduce((s, r) => s + r.q.gems, 0);
  const ready = rows.filter(r => r.ready).length;
  return (
    <div className="pp-card pp-card--quests">
      <div className="pp-card__head">
        Quêtes de l&apos;événement
        <small>{rows.filter(r => r.done).length}/{rows.length}{ready > 0 ? ` · ${ready} à réclamer` : ''}</small>
      </div>
      <div className="pp-quest-pot">
        <RewardIcon kind="gems" size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pp-quest-pot__total">{fmtNum(PERIPLE_QUESTS_TOTAL_GEMS)} gemmes à gagner</div>
          <div className="pp-bar" style={{ height: 12, marginTop: 4 }}><div className="pp-bar__fill" style={{ width: `${(earned / PERIPLE_QUESTS_TOTAL_GEMS) * 100}%` }} /></div>
          <div className="pp-quest-pot__sub">{fmtNum(earned)} gagnées · valables jusqu&apos;à la fin de l&apos;événement</div>
        </div>
      </div>
      <div className="pp-quest-list">
        {rows.map(({ q, cur, done, ready: isReady }) => (
          <div key={q.id} className={`pp-mission${done ? ' is-done' : isReady ? ' is-ready' : ''}`}>
            <QuestIcon stat={q.stat} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div className="pp-bar pp-bar--green" style={{ flex: 1, height: 12 }}><div className="pp-bar__fill" style={{ width: `${(cur / q.target) * 100}%` }} /></div>
                <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 14, color: 'var(--text-sub)', flexShrink: 0 }}>{fmtNum(cur)}/{fmtNum(q.target)}</span>
              </div>
            </div>
            {done ? (
              <span className="pp-mission__done" aria-label="Réclamée">✓</span>
            ) : (
              <button className={`pp-btn pp-btn--small ${isReady ? 'pp-btn--green' : 'pp-btn--blue'}`} disabled={!isReady} onClick={() => onClaim(q.id)}
                style={{ flexShrink: 0, minWidth: 96, padding: '6px 10px' }} aria-label={`Réclamer ${q.gems} gemmes`}>
                <RewardIcon kind="gems" size={22} /> {fmtNum(q.gems)}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
