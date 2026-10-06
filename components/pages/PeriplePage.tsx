'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import type { PeripleLoot } from '@/store/slices/peripleSlice';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import {
  PERIPLE_EVENT, PERIPLE_BOARD, PERIPLE_TIERS, PERIPLE_MISSIONS, PERIPLE_QUESTS, PERIPLE_SHOP, PERIPLE_MAX_DICE, PERIPLE_DICE_REGEN_MS, PERIPLE_DICE_HARD_CAP, TILE_INFO,
  computePeripleDice, isPeripleActive, emptyPeripleDaily, type TileKind,
} from '@/lib/game/periple';
import { PeripleBoard, type DieState } from './periple/PeripleBoard';
import type { PawnChar } from './periple/ChibiPawn';
import { DiceCard, TokensCard, TiersCard, MissionsCard, EventQuestsCard, LiveCountdown } from './periple/PeripleHud';
import { RewardModal, PeripleShopModal, PeripleRulesModal, TileLegendRow, type RewardPopupData } from './periple/PeripleModals';
import { RewardIcon } from './periple/PeripleIcons';
import { TileBadge } from './periple/TileBadge';
import { MinigameModal, type GameOutcome } from './periple/games/MinigameModal';

const STEP_MS = 260;
const TUMBLE_MS = 750;

// Fonction au référentiel stable qui appelle toujours la dernière version :
// les panneaux mémorisés (React.memo) ne se re-rendent pas à chaque état local.
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}

export function PeriplePage() {
  const s = useGameStore(useShallow(st => ({
    eventId: st.peripleEventId, dice: st.peripleDice, diceAt: st.peripleDiceAt, pos: st.periplePos, laps: st.peripleLaps,
    tokens: st.peripleTokens, points: st.periplePoints, tiersClaimed: st.peripleTiersClaimed, pending: st.periplePending,
    shopBought: st.peripleShopBought, daily: st.peripleDaily, stats: st.peripleStats, questsClaimed: st.peripleQuestsClaimed,
  })));
  // Équipe : une simple chaîne (ids + formes) pour ne pas re-rendre la page à
  // chaque changement de la collection.
  const teamKey = useGameStore(st => (st.equippedTeam ?? []).filter(Boolean).slice(0, 3)
    .map(k => `${k}|${st.collection[k as string]?.currentForm ?? 0}`).join(','));
  const team = useMemo<PawnChar[]>(() => (teamKey ? teamKey.split(',') : []).map(entry => {
    const [k, form] = entry.split('|');
    const tpl = getCharacterById(parseInstanceKey(k).templateId);
    return tpl ? { templateId: tpl.id, formIndex: Number(form) || 0, name: tpl.name, rarity: tpl.rarity } : null;
  }).filter((c): c is PawnChar => !!c), [teamKey]);

  // Horloge « à la demande » : la page ne se re-rend qu'aux instants utiles
  // (prochain dé régénéré, fin de l'événement) ; les comptes à rebours affichés
  // sont de petits composants qui tiquent seuls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { useGameStore.getState().ensurePeriple(); }, []);
  const fresh = s.eventId === PERIPLE_EVENT.id;
  const { dice, at } = fresh ? computePeripleDice(s.dice, s.diceAt, now) : { dice: 0, at: now };
  const nextDieAt = dice < PERIPLE_MAX_DICE ? at + PERIPLE_DICE_REGEN_MS : null;
  const ended = !isPeripleActive(now);
  useEffect(() => {
    const target = Math.min(nextDieAt ?? Infinity, ended ? Infinity : PERIPLE_EVENT.endsAt);
    if (!Number.isFinite(target)) return;
    const t = setTimeout(() => setNow(Date.now()), Math.max(200, target - now + 50));
    return () => clearTimeout(t);
  }, [nextDieAt, ended, now]);
  const stats = useMemo(() => (fresh ? s.stats ?? {} : {}), [fresh, s.stats]);
  const questsClaimed = useMemo(() => (fresh ? s.questsClaimed ?? [] : []), [fresh, s.questsClaimed]);
  const daily = useMemo(() => (fresh ? { ...emptyPeripleDaily(), ...s.daily } : emptyPeripleDaily()), [fresh, s.daily]);

  // ── Animation et enchaînement des popups ──────────────────────────────
  const [animPos, setAnimPos] = useState<number | null>(null);
  const [hopKey, setHopKey] = useState(0);
  const [dieState, setDieState] = useState<DieState>('landed');
  const [dieFace, setDieFace] = useState(6);
  const [busy, setBusy] = useState(false);
  const [game, setGame] = useState<TileKind | null>(null);
  const [gain, setGain] = useState<{ key: number; loot: PeripleLoot } | null>(null);
  const [popup, setPopup] = useState<RewardPopupData | null>(null);
  const [showShop, setShowShop] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  // Fait sauter le pion case par case ; renvoie la durée totale.
  const hop = (path: number[], start: number): number => {
    let t = start;
    for (const step of path) {
      later(t, () => { setAnimPos(step); setHopKey(k => k + 1); });
      t += STEP_MS;
    }
    return t;
  };

  const roll = useStableCallback(() => {
    if (busy) return;
    const result = useGameStore.getState().rollPeriple();
    if (!result) return;
    setBusy(true);
    setSelected(null);
    setAnimPos(result.from);
    setDieState('rolling');
    later(TUMBLE_MS, () => {
      setDieFace(result.roll);
      setDieState('landed');
      const t = hop(result.path, 250);
      later(t + 150, () => {
        setBusy(false);
        setNow(Date.now());
        setGain({ key: Date.now(), loot: result.loot });
        if (result.pending) {
          setGame(result.landed);   // le pion reste affiché sur la case du mini-jeu
        } else {
          setAnimPos(null);
          setPopup({ title: 'Arrêt pile au Départ !', text: 'Un tour complet : grosse prime de tour.', icon: <TileBadge kind="start" size={90} />, accent: TILE_INFO.start.top, loot: result.loot });
        }
      });
    });
  });

  const resume = useStableCallback(() => {
    if (!s.pending) return;
    setAnimPos(s.pending.tile);
    setGame(s.pending.kind);
  });

  const onGameClose = useStableCallback((outcome: GameOutcome | null) => {
    setGame(null);
    const bonus = outcome?.chance?.bonusPath ?? [];
    if (bonus.length === 0) { setAnimPos(null); return; }
    // Carte de déplacement : le pion bondit vers sa nouvelle case.
    setBusy(true);
    const t = hop(bonus, 200);
    later(t + 150, () => { setBusy(false); setAnimPos(null); });
  });

  const claimTier = useStableCallback((i: number) => {
    const loot = useGameStore.getState().claimPeripleTier(i);
    if (loot) setPopup({ title: `Palier ${i + 1} débloqué !`, icon: <RewardIcon kind={PERIPLE_TIERS[i].reward.kind} size={84} />, accent: '#f59e0b', loot });
  });
  const claimMission = useStableCallback((id: string) => {
    const loot = useGameStore.getState().claimPeripleMission(id);
    const m = PERIPLE_MISSIONS.find(x => x.id === id)!;
    if (loot) setPopup({ title: 'Mission accomplie !', text: m.label, icon: <RewardIcon kind={m.reward.kind} size={84} />, accent: '#a855f7', loot });
  });
  const claimQuest = useStableCallback((id: string) => {
    const loot = useGameStore.getState().claimPeripleQuest(id);
    const q = PERIPLE_QUESTS.find(x => x.id === id)!;
    if (loot) setPopup({ title: 'Quête accomplie !', text: q.label, icon: <RewardIcon kind="gems" size={84} />, accent: '#22d3ee', loot });
  });
  const buy = useStableCallback((id: string) => {
    const item = PERIPLE_SHOP.find(x => x.id === id)!;
    const loot = useGameStore.getState().buyPeripleItem(id);
    if (!loot) return;
    // Invocations et coffres : on montre ce qui est sorti.
    if (loot.pulls.length > 0 || loot.equipment.length > 0 || item.reward.kind === 'title') {
      setShowShop(false);
      setPopup({ title: item.name, icon: <RewardIcon kind={item.reward.kind} size={84} />, accent: '#3b82f6', loot });
    }
  });
  const openShop = useStableCallback(() => setShowShop(true));
  // [DEV] Mode téléportation : le prochain clic sur une case y place le pion
  // et ouvre directement son mini-jeu (sans consommer de dé).
  const [devTeleport, setDevTeleport] = useState(false);
  const selectTile = useStableCallback((i: number) => {
    if (devTeleport && !busy) {
      const kind = PERIPLE_BOARD[i].kind;
      useGameStore.getState().ensurePeriple();
      useGameStore.setState({ periplePos: i, periplePending: kind === 'start' ? null : { kind, tile: i } });
      setDevTeleport(false);
      setSelected(null);
      setAnimPos(null);
      setHopKey(k => k + 1);
      if (kind !== 'start') setGame(kind);
      return;
    }
    setSelected(cur => (cur === i ? null : i));
  });

  // [DEV] Boutons « +10 dés » et « téléportation » affichés uniquement en local, jamais en prod
  // (même garde que le bouton « tuer le mob » de BattleZone).
  const isLocalDev = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.')
  );
  const devAddDice = () => {
    useGameStore.getState().ensurePeriple();
    useGameStore.setState(st => ({ peripleDice: Math.min(PERIPLE_DICE_HARD_CAP, st.peripleDice + 10) }));
  };

  const pawnPos = animPos ?? s.pos;
  const canRoll = !busy && !ended && dice > 0 && !s.pending;

  return (
    <div className="pp-page">
      <div className="pp-wrap">
        {/* ── Bannière ── */}
        <div className="pp-banner pp-loop">
          <div className="pp-banner__emblem" aria-hidden>
            <RewardIcon kind="tokens" size={64} />
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div className="pp-subtitle">ÉVÉNEMENT TEMPORAIRE</div>
            <div className="pp-title">Le Grand Périple du Multivers</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <span className="pp-chip" style={{ borderColor: 'rgba(251,146,60,0.6)' }}>⏳ {ended ? 'Terminé' : <>Fin dans <LiveCountdown to={PERIPLE_EVENT.endsAt} long /></>}</span>
              <span className="pp-chip"><RewardIcon kind="dice" size={22} /> {dice}</span>
              <span className="pp-chip" style={{ color: '#fde68a' }}><RewardIcon kind="tokens" size={22} /> {s.tokens}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="pp-btn" onClick={openShop}>BOUTIQUE</button>
            <button className="pp-btn pp-btn--purple" onClick={() => setShowRules(true)}>RÈGLES</button>
          </div>
        </div>

        <div className="pp-main">
          {/* ── Plateau ── */}
          <div className="pp-board-col">
            <div className="pp-board-frame">
              <PeripleBoard pos={pawnPos} hopKey={hopKey} team={team}
                dieFace={dieFace} dieState={dieState} selected={selected} onSelect={selectTile} />
              {gain && (
                <div key={gain.key} className="pp-gain" onAnimationEnd={() => setGain(null)}>
                  {gain.loot.rewards.map((r, i) => (
                    <span key={i} className="pp-gain__item"><RewardIcon kind={r.kind} size={24} />+{r.amount}</span>
                  ))}
                </div>
              )}
            </div>
            {devTeleport ? (
              <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: '#c4b5fd', textAlign: 'center' }}>
                [DEV] Touche la case où aller : son mini-jeu s&apos;ouvre directement.
              </div>
            ) : selected !== null ? (
              <TileLegendRow kind={PERIPLE_BOARD[selected].kind} />
            ) : (
              <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 14, color: 'var(--text-dim)', textAlign: 'center' }}>
                Touche une case pour voir son mini-jeu.
              </div>
            )}
          </div>

          {/* ── HUD ── */}
          <div className="pp-hud">
            {/* Dé + outils de dev groupés : une seule case de la grille sur tablette. */}
            <div className="pp-hud__play">
              <DiceCard dice={dice} nextDieAt={ended ? null : nextDieAt} canRoll={canRoll} busy={busy} ended={ended}
                pending={fresh && s.pending && !game ? s.pending.kind : null} onRoll={roll} onResume={resume} />
              {isLocalDev && (
                <button className="pp-btn pp-btn--green pp-btn--small" onClick={devAddDice} title="Visible uniquement en local">
                  [DEV] +10 dés
                </button>
              )}
              {isLocalDev && (
                <button className={`pp-btn pp-btn--small ${devTeleport ? 'pp-btn--purple' : 'pp-btn--blue'}`} disabled={busy}
                  onClick={() => setDevTeleport(v => !v)} title="Visible uniquement en local">
                  {devTeleport ? '[DEV] Touche une case… (annuler)' : '[DEV] Se téléporter'}
                </button>
              )}
            </div>
            <TokensCard tokens={s.tokens} laps={s.laps} onShop={openShop} />
          </div>
        </div>

        {/* ── Paliers : toute la largeur pour la rangée des 100 paliers ── */}
        <TiersCard points={s.points} claimed={s.tiersClaimed} onClaim={claimTier} />

        {/* ── Missions du jour et quêtes de l'événement côte à côte ── */}
        <div className="pp-bottom">
          <MissionsCard daily={daily} onClaim={claimMission} />
          <EventQuestsCard stats={stats} tiersClaimed={fresh ? s.tiersClaimed.length : 0} claimed={questsClaimed} onClaim={claimQuest} />
        </div>
      </div>

      {game && <MinigameModal kind={game} onClose={onGameClose} />}
      {popup && <RewardModal data={popup} onClose={() => setPopup(null)} />}
      {showShop && <PeripleShopModal tokens={s.tokens} bought={s.shopBought} daily={daily} onBuy={buy} onClose={() => setShowShop(false)} />}
      {showRules && <PeripleRulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
