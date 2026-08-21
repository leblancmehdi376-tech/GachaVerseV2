'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getTodayDayKey, getThisWeekKey } from '@/lib/game/shop';
import { formatNumber } from '@/lib/game/format';
import { PageScroll, SectionHeader } from '@/components/ui/Page';

type Tab = 'daily' | 'weekly' | 'event';

type QuestItem = {
  id: string; icon: string; label: string;
  current: number; target: number; reward: number;
  rewardType: 'gems' | 'coins'; done: boolean;
};

function fmtCountdown(targetMs: number): string {
  const rem = Math.max(0, targetMs - Date.now());
  const h = Math.floor(rem / 3600_000);
  const m = Math.floor((rem % 3600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getNextResetMs(type: 'daily' | 'weekly'): number {
  // Prochain reset à 2h du matin Paris
  const now = new Date();
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

  if (type === 'daily') {
    const next = new Date(paris);
    next.setHours(2, 0, 0, 0);
    if (paris.getHours() >= 2) next.setDate(next.getDate() + 1);
    // Reconvertir en UTC
    const diffMs = paris.getTime() - now.getTime();
    return next.getTime() - diffMs;
  } else {
    // Prochain lundi 2h
    const next = new Date(paris);
    const day = paris.getDay(); // 0=dim
    const daysToMonday = day === 1 && paris.getHours() < 2 ? 0 : (8 - day) % 7 || 7;
    next.setDate(next.getDate() + daysToMonday);
    next.setHours(2, 0, 0, 0);
    const diffMs = paris.getTime() - now.getTime();
    return next.getTime() - diffMs;
  }
}

function Countdown({ type }: { type: 'daily' | 'weekly' }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span style={{ fontFamily:'var(--f-num)', fontWeight:700 }}>{fmtCountdown(getNextResetMs(type))}</span>;
}

function QuestCard({ q, onClaim }: { q: QuestItem; onClaim: (id: string) => void }) {
  const pct      = Math.min((q.current / q.target) * 100, 100);
  const canClaim = q.current >= q.target && !q.done;

  return (
    <div className="panel" style={{
      borderColor: q.done ? 'rgba(74,222,128,0.3)' : canClaim ? 'var(--border-glow)' : 'var(--border)',
      padding:'16px 18px', display:'flex', gap:'14px', alignItems:'center',
      boxShadow: canClaim ? '0 0 20px rgba(147,51,234,0.14)' : q.done ? '0 0 12px rgba(74,222,128,0.08)' : 'none',
      transition:'all 0.2s', position:'relative', overflow:'hidden',
    }}>
      {canClaim && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,var(--purple-hi),transparent)' }} />}
      <span style={{ fontSize:'28.8px', flexShrink:0 }}>{q.icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', gap:10 }}>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14.4px', color:'var(--text)' }}>{q.label}</span>
          <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'13.4px', color:'var(--gold)', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', padding:'3px 12px', borderRadius:'6px', flexShrink:0 }}>
            {q.rewardType === 'gems' ? '💎' : '🪙'} {formatNumber(q.reward)}
          </span>
        </div>
        <div className="prog-track" style={{ height:'7px', marginBottom:'6px' }}>
          <div className="prog-fill" style={{
            width:`${pct}%`,
            background: q.done ? 'linear-gradient(90deg,#166534,#4ade80)'
              : canClaim ? 'linear-gradient(90deg,#5b21b6,#9333ea,#c084fc)'
              : 'linear-gradient(90deg,#1e1040,#3d2e6e)',
            boxShadow: q.done ? '0 0 8px #4ade8066' : canClaim ? '0 0 10px #9333ea88' : 'none',
          }} />
        </div>
        <div style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'var(--text-dim)', fontWeight:700 }}>
          {formatNumber(q.current)} / {formatNumber(q.target)}
        </div>
      </div>
      {q.done ? (
        <span style={{ fontSize:'26.8px', flexShrink:0 }}>✅</span>
      ) : canClaim ? (
        <button onClick={() => onClaim(q.id)} className="btn-primary"
          style={{ padding:'10px 18px', fontSize:'13.4px', letterSpacing:'0.5px', flexShrink:0 }}>
          RÉCUPÉRER
        </button>
      ) : (
        <div style={{ width:80, flexShrink:0, textAlign:'center', fontFamily:'var(--f-ui)', fontSize:'11.3px', color:'var(--text-muted)', fontWeight:600 }}>EN COURS</div>
      )}
    </div>
  );
}

export function QuestsPage() {
  const {
    quests, claimQuest,
    weeklyQuests, claimWeeklyQuest,
    eventQuests, claimEventQuest,
  } = useGameStore();

  // Le reset quotidien/hebdomadaire (ensureDailyQuests/ensureWeeklyQuests) est géré une
  // seule fois par GameLayout, une fois la réhydratation locale ET le chargement cloud
  // terminés — pas ici, pour ne pas redéclencher le reset avant que le cloud soit prêt.
  const [tab, setTab] = useState<Tab>('daily');

  const dailyDone   = (quests       ?? []).filter(q => q.done).length;
  const weeklyDone  = (weeklyQuests ?? []).filter(q => q.done).length;
  const eventDone   = (eventQuests  ?? []).filter(q => q.done).length;

  const TAB_DATA: { id: Tab; label: string; color: string; count: string; totalCount: number; doneCount: number }[] = [
    { id:'daily',  label:'JOURNALIÈRES', color:'#34d399', count:`${dailyDone}/${(quests??[]).length}`,       totalCount:(quests??[]).length,       doneCount:dailyDone  },
    { id:'weekly', label:'HEBDOMADAIRES',color:'#60a5fa', count:`${weeklyDone}/${(weeklyQuests??[]).length}`,totalCount:(weeklyQuests??[]).length,  doneCount:weeklyDone },
    { id:'event',  label:'ÉVÉNEMENTS',   color:'#e879f9', count:`${eventDone}/${(eventQuests??[]).length}`,  totalCount:(eventQuests??[]).length,   doneCount:eventDone  },
  ];

  return (
    <PageScroll>

        {/* Header */}
        <SectionHeader
          eyebrow={`${dailyDone + weeklyDone + eventDone} / ${(quests?.length??0) + (weeklyQuests?.length??0) + (eventQuests?.length??0)} complétées`}
          title="QUÊTES"
          accent="#34d399"
          right={
            <div style={{ display:'flex', gap:10 }}>
              {(['daily','weekly'] as const).map(t => (
                <div key={t} style={{ textAlign:'center', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px' }}>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:9.3, fontWeight:700, color:'var(--text-dim)', letterSpacing:1, marginBottom:3 }}>
                    {t === 'daily' ? '📅 JOURNALIER' : '📆 HEBDOMADAIRE'}
                  </div>
                  <Countdown type={t} />
                </div>
              ))}
            </div>
          }
        />

        {/* Onglets */}
        <div style={{ display:'flex', gap:8 }}>
          {TAB_DATA.map(t => {
            const pct = t.totalCount > 0 ? Math.round((t.doneCount / t.totalCount) * 100) : 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex:1, padding:'10px 8px', borderRadius:10, cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:11.3, letterSpacing:0.5, transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  background: tab===t.id ? `${t.color}18` : 'var(--bg-card)',
                  border: `1px solid ${tab===t.id ? t.color+'55' : 'var(--border)'}`,
                  color: tab===t.id ? t.color : 'var(--text-dim)',
                  boxShadow: tab===t.id ? `0 0 16px ${t.color}22` : 'none' }}>
                <span>{t.label}</span>
                <div style={{ width:'100%', height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:t.color, borderRadius:2, transition:'width 0.4s' }} />
                </div>
                <span style={{ fontFamily:'var(--f-num)', fontSize:12.4, color:t.color }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* ── JOURNALIÈRES ── */}
        {tab === 'daily' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:11.3, color:'var(--text-dim)', fontWeight:700, letterSpacing:1 }}>
              Reset quotidien à <strong style={{ color:'#34d399' }}>2h00 (heure de Paris)</strong>
            </div>
            {(quests ?? []).map((q: QuestItem) => (
              <QuestCard key={q.id} q={q} onClaim={claimQuest} />
            ))}
          </div>
        )}

        {/* ── HEBDOMADAIRES ── */}
        {tab === 'weekly' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:11.3, color:'var(--text-dim)', fontWeight:700, letterSpacing:1 }}>
              Reset le <strong style={{ color:'#60a5fa' }}>lundi à 2h00 (heure de Paris)</strong>
            </div>
            {(weeklyQuests ?? []).map((q: QuestItem) => (
              <QuestCard key={q.id} q={q} onClaim={claimWeeklyQuest} />
            ))}
          </div>
        )}

        {/* ── ÉVÉNEMENTS ── */}
        {tab === 'event' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:11.3, color:'var(--text-dim)', fontWeight:700, letterSpacing:1 }}>
              Quêtes permanentes — <strong style={{ color:'#e879f9' }}>disponibles jusqu'à complétion</strong>
            </div>
            {(eventQuests ?? []).map((q: QuestItem) => (
              <QuestCard key={q.id} q={q} onClaim={claimEventQuest} />
            ))}
          </div>
        )}

    </PageScroll>
  );
}
