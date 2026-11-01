'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import type { PlinkoDropResult } from '@/store/slices/plinkoSlice';
import { getTodayDayKey } from '@/lib/game/shop';
import {
  PLINKO_EVENT, PLINKO_UPGRADES, PLINKO_REWARD_ICON, PLINKO_QUESTS, PLINKO_QUESTS_TOTAL_GEMS, formatPlinkoReward, formatPlinkoQuestBonus, isPlinkoActive,
  isPlinkoUpcoming, plinkoBallsLeft, plinkoDailyBalls, plinkoOdds, plinkoSlotReward, plinkoUpgradeLevel, getPlinkoQuestProgress,
  type PlinkoUpgradeId,
} from '@/lib/game/plinko';
import { Countdown } from './QuestsPage';
import { LiveCountdown, QuestListCard } from './periple/PeripleHud';
import { PlinkoBoard, type PlinkoDrop } from './plinko/PlinkoBoard';
import { PlinkoShopModal, PlinkoRewardModal, UpgradeLevelBar, upgradeEffect, formatOdds } from './plinko/PlinkoModals';
import { toast } from '@/hooks/useToast';

// Plinko Multiversel (voir lib/game/plinko.ts). Lancer une bille appelle
// dropPlinko, qui tire la case ET crédite la récompense tout de suite ; la
// page anime ensuite le trajet et ne dévoile le gain qu'à l'arrivée.

const POPUP_KINDS = new Set(['booster', 'goldBooster', 'chestRare', 'chestEpic']);

export function PlinkoPage() {
  const s = useGameStore(useShallow(st => ({
    eventId: st.plinkoEventId, daily: st.plinkoDaily, tokens: st.plinkoTokens, upgrades: st.plinkoUpgrades, history: st.plinkoHistory,
    drops: st.plinkoDrops, stats: st.plinkoStats, questsClaimed: st.plinkoQuestsClaimed,
  })));
  useEffect(() => { useGameStore.getState().ensurePlinko(); }, []);

  // Horloge rafraîchie au début / à la fin de l'événement et au reset de 2 h.
  const [now, setNow] = useState(() => Date.now());
  const upcoming = isPlinkoUpcoming(now);
  const active = isPlinkoActive(now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const [drop, setDrop] = useState<PlinkoDrop | null>(null);
  const [pending, setPending] = useState<PlinkoDropResult | null>(null);   // en train de tomber
  const pendingRef = useRef<PlinkoDropResult | null>(null);
  const [last, setLast] = useState<PlinkoDropResult | null>(null);
  const [popup, setPopup] = useState<PlinkoDropResult | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showShop, setShowShop] = useState(false);

  const fresh = s.eventId === PLINKO_EVENT.id;
  const today = getTodayDayKey();
  const levels = fresh ? s.upgrades : {};
  const maxBalls = plinkoDailyBalls(levels);
  const balls = active ? plinkoBallsLeft(fresh ? s.daily : undefined, today, levels) : 0;
  const busy = !!pending;
  // Le gain est déjà crédité : on ne l'affiche qu'une fois la bille arrivée.
  const tokens = (fresh ? s.tokens : 0) - (pending?.reward.kind === 'tokens' ? pending.reward.amount : 0);

  const launch = () => {
    if (busy) return;
    const res = useGameStore.getState().dropPlinko();
    if (!res) { toast.error('Plinko', 'Plus de billes pour aujourd’hui.'); return; }
    setLanded(null);
    setSelected(null);
    pendingRef.current = res;
    setPending(res);
    setDrop(d => ({ key: (d?.key ?? 0) + 1, path: res.path, slot: res.slot }));
  };

  const onLanded = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!p) return;
    setLast(p);
    setLanded(p.slot);
    if (POPUP_KINDS.has(p.reward.kind)) setPopup(p);
  }, []);

  const buy = (id: PlinkoUpgradeId) => {
    if (useGameStore.getState().buyPlinkoUpgrade(id)) {
      const u = PLINKO_UPGRADES.find(x => x.id === id)!;
      toast.info('Boutique Plinko', `${u.name} niveau ${plinkoUpgradeLevel(useGameStore.getState().plinkoUpgrades, id)}`);
    }
  };

  const claimQuest = useCallback((id: string) => { useGameStore.getState().claimPlinkoQuest(id); }, []);
  // Pendant la chute, la progression des quêtes n'inclut pas encore la bille en cours.
  const quests = PLINKO_QUESTS.map(q => ({
    ...q,
    cur: getPlinkoQuestProgress(q, { stats: fresh ? s.stats ?? {} : {}, drops: (fresh ? s.drops ?? 0 : 0) - (pending ? 1 : 0), levels }),
    icon: <span className="pp-mission__icon" style={{ fontSize: 28 }} aria-hidden>{q.icon}</span>,
    extra: q.bonus && formatPlinkoQuestBonus(q.bonus),
  }));

  const odds = plinkoOdds(levels);
  const history = fresh ? (s.history ?? []) : [];
  // Pendant la chute, l'historique ne montre pas encore le lancer en cours.
  const shownHistory = (pending ? history.slice(1) : history).slice(0, 5);

  return (
    <div className="pp-page">
      <div className="pp-wrap">
        {/* ── Bannière ── */}
        <div className="pp-banner pp-loop plk-banner">
          <div className="pp-banner__emblem" aria-hidden><span style={{ fontSize: 44 }}>🎯</span></div>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div className="pp-subtitle">ÉVÉNEMENT DU MOIS</div>
            <div className="pp-title">Plinko Multiversel</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span className="pp-chip" style={{ borderColor: 'rgba(251,146,60,0.6)' }}>
                ⏳ {upcoming ? <>Commence dans <LiveCountdown to={PLINKO_EVENT.startsAt} long /></>
                  : active ? <>Fin dans <LiveCountdown to={PLINKO_EVENT.endsAt} long /></> : 'Terminé'}
              </span>
              <span className="pp-chip">⚪ {balls}/{maxBalls}</span>
              <span className="pp-chip" style={{ color: '#fde68a' }}>🪙 {tokens}</span>
            </div>
          </div>
          <button className="pp-btn" onClick={() => setShowShop(true)}>BOUTIQUE</button>
        </div>

        <div className="pp-main">
          {/* ── Plateau ── */}
          <div className="pp-board-col">
            <div className="plk-frame">
              <PlinkoBoard drop={drop} levels={levels} landed={landed} selected={selected} onLanded={onLanded} onSelect={setSelected} />
            </div>
            <div className="plk-detail">
              {selected !== null ? (
                <>
                  <span style={{ fontSize: 22 }}>{PLINKO_REWARD_ICON[plinkoSlotReward(selected, levels).kind]}</span>
                  Case {selected + 1} : <b>{formatPlinkoReward(plinkoSlotReward(selected, levels))}</b> · chance {formatOdds(odds[selected])}
                </>
              ) : 'Touche une case pour voir sa récompense et sa probabilité.'}
            </div>
          </div>

          {/* ── HUD ── */}
          <div className="pp-hud">
            <div className="pp-card pp-card--dice">
              <div className="pp-card__head">⚪ Billes du jour <small>{balls}/{maxBalls}</small></div>
              <div className="plk-balls">
                {Array.from({ length: maxBalls }, (_, i) => <span key={i} className={i < balls ? 'is-full' : ''} />)}
              </div>
              <button className="pp-btn pp-btn--big" style={{ width: '100%', marginTop: 12 }} disabled={busy || balls <= 0 || !active} onClick={launch}>
                {busy ? 'EN CHUTE…' : upcoming ? 'BIENTÔT' : !active ? 'TERMINÉ' : balls > 0 ? 'LANCER UNE BILLE' : 'À DEMAIN !'}
              </button>
              {active && (
                <div className="plk-note">
                  {balls > 0 ? `${maxBalls} billes offertes chaque jour, non reportées.` : <>Nouvelles billes dans <Countdown type="daily" /></>}
                </div>
              )}
            </div>

            <div className="pp-card">
              <div className="pp-card__head">🎁 Dernier gain</div>
              {last ? (
                <div className={`plk-last${last.reward.kind === 'goldBooster' ? ' is-gold' : ''}`}>
                  <span style={{ fontSize: 30 }}>{PLINKO_REWARD_ICON[last.reward.kind]}</span>
                  <b>{formatPlinkoReward(last.reward)}</b>
                </div>
              ) : <div className="plk-note">Lance une bille pour tenter ta chance.</div>}
              {shownHistory.length > 0 && (
                <div className="plk-history">
                  {shownHistory.map(h => (
                    <span key={h.n} title={formatPlinkoReward(h.reward)}>{PLINKO_REWARD_ICON[h.reward.kind]} {h.reward.amount > 1 ? h.reward.amount : ''}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="pp-card">
              <div className="pp-card__head">🪙 Améliorations <small>{tokens} jetons</small></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PLINKO_UPGRADES.map(u => {
                  const level = plinkoUpgradeLevel(levels, u.id);
                  return (
                    <div key={u.id}>
                      <div className="plk-upgrade__name">{u.icon} {u.name} <span>Niv. {level}/{u.costs.length}</span></div>
                      <UpgradeLevelBar level={level} max={u.costs.length} />
                      <div className="plk-upgrade__desc">{upgradeEffect(u, level)}</div>
                    </div>
                  );
                })}
              </div>
              <button className="pp-btn pp-btn--purple" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowShop(true)}>BOUTIQUE</button>
            </div>
          </div>
        </div>

        {/* ── Quêtes de l'événement ── */}
        <div className="plk-quests">
          <QuestListCard quests={quests} totalGems={PLINKO_QUESTS_TOTAL_GEMS} claimed={fresh ? s.questsClaimed ?? [] : []} onClaim={claimQuest} />
        </div>
      </div>

      {popup && <PlinkoRewardModal result={popup} onClose={() => setPopup(null)} />}
      {showShop && <PlinkoShopModal tokens={tokens} levels={levels} active={active} onBuy={buy} onClose={() => setShowShop(false)} />}
    </div>
  );
}
