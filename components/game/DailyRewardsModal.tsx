'use client';
import { useGameStore } from '@/store/gameStore';
import { DAILY_REWARDS, DAILY_REWARD_CYCLE_LENGTH, formatDailyRewardLabel } from '@/lib/game/dailyRewards';

export function DailyRewardsModal({ onClose }: { onClose: () => void }) {
  const { dailyRewardCurrentDay, dailyRewardClaimedToday, dailyRewardClaimedDays, claimDailyReward } = useGameStore();

  const isClaimed = (day: number) =>
    dailyRewardClaimedDays.includes(day) || (day === dailyRewardCurrentDay && dailyRewardClaimedToday);
  const isToday = (day: number) => day === dailyRewardCurrentDay;

  const weeks = [0, 1, 2, 3].map(w => DAILY_REWARDS.slice(w * 7, w * 7 + 7));

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(3,2,8,0.88)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 'min(720px, 100%)', maxHeight: '88vh', overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-lit)', background: '#0f0c20', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', padding: '20px 22px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 16.5, fontWeight: 800, letterSpacing: 1.5, color: 'var(--purple-glow)' }}>
            📅 RÉCOMPENSES JOURNALIÈRES
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-sub)', marginBottom: 16 }}>
          Jour {dailyRewardCurrentDay} / {DAILY_REWARD_CYCLE_LENGTH} — connecte-toi chaque jour pour avancer dans le cycle
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Semaine {wi + 1}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {week.map(def => {
                const claimed = isClaimed(def.day);
                const today = isToday(def.day);
                const clickable = today && !dailyRewardClaimedToday;
                return (
                  <div
                    key={def.day}
                    onClick={() => { if (clickable) claimDailyReward(); }}
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      padding: '8px 5px',
                      textAlign: 'center',
                      cursor: clickable ? 'pointer' : 'default',
                      border: claimed ? '2px solid var(--green)' : today ? '1px solid var(--purple-glow)' : '1px solid var(--border)',
                      background: claimed ? 'rgba(74,222,128,0.08)' : today ? 'rgba(192,132,252,0.12)' : 'rgba(255,255,255,0.02)',
                      boxShadow: today && !claimed ? '0 0 14px rgba(192,132,252,0.35)' : 'none',
                      opacity: !today && !claimed ? 0.55 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--f-ui)', fontSize: 10, fontWeight: 700, color: today ? 'var(--purple-glow)' : 'var(--text-dim)', marginBottom: 4 }}>
                      JOUR {def.day}
                    </div>
                    {def.items.map((item, ii) => (
                      <div key={ii} style={{ marginTop: ii > 0 ? 6 : 0 }}>
                        <div style={{ fontSize: item.kind === 'title' ? 14 : 17, lineHeight: 1.3 }}>{item.icon}</div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 9.3, color: 'var(--text-sub)', lineHeight: 1.25, marginTop: 1 }}>
                          {formatDailyRewardLabel(item)}
                        </div>
                      </div>
                    ))}
                    {claimed && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#0f2417', fontWeight: 900, boxShadow: '0 0 8px rgba(74,222,128,0.6)' }}>
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {dailyRewardClaimedToday ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>
            ✓ Récompense du jour déjà réclamée — reviens demain !
          </div>
        ) : (
          <button onClick={claimDailyReward} className="btn-primary" style={{ width: '100%', padding: 11, fontSize: 14.4, marginTop: 10 }}>
            RÉCLAMER LE JOUR {dailyRewardCurrentDay}
          </button>
        )}
      </div>
    </div>
  );
}
