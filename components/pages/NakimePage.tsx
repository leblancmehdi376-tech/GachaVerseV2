'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { currentNakimeRun, nakimeDailyEntries, nakimeEntriesLeft, type NakimeNodeOutcome, type NakimeRunEnd } from '@/store/slices/nakimeSlice';
import type { NakimeFight } from '@/lib/game/nakime';
import { getPalierEnemyRoster } from '@/lib/game/enemies';
import { EnemySprite, fmtEntries } from './nakime/NakimeBits';
import { NAKIME_ACT_FLOORS, NAKIME_DAILY_ENTRIES, NAKIME_RELIC_LIST, NAKIME_EVENTS } from '@/lib/game/nakime';
import { NakimeTeamBuilder } from './nakime/NakimeTeamBuilder';
import { NakimeRunView } from './nakime/NakimeRunView';
import { NakimeBattleView } from './nakime/NakimeBattleView';
import { NakimeEndModal } from './nakime/NakimeEndModal';
import { NakimeMemory, NakimeRecords } from './nakime/NakimeMeta';
import { NakimeGachapon } from './nakime/NakimeGachapon';

type LobbyTab = 'team' | 'gacha' | 'memory' | 'records';
const NAKIME_SPRITE = getPalierEnemyRoster(25).find(e => e.name === 'Nakime')?.sprite;
const TABS: { id: LobbyTab; label: string }[] = [
  { id: 'team', label: '⚔️ Expédition' },
  { id: 'gacha', label: '🎰 Gachapon' },
  { id: 'memory', label: '🎵 Mémoire' },
  { id: 'records', label: '🏆 Records' },
];

// Château de Nakime — mode roguelike infini (rubrique Activités). Règles et
// équilibrage : lib/game/nakime*.ts ; actions : store/slices/nakimeSlice.ts.
export function NakimePage() {
  const s = useGameStore(useShallow(st => ({
    run: currentNakimeRun(st), best: st.nakimeBestFloor, day: st.nakimeDay, used: st.nakimeEntriesUsed,
    meta: st.nakimeMeta ?? {}, notes: st.nakimeNotes ?? 0, tickets: st.nakimeTickets ?? 0, stale: !!st.nakimeRun && !currentNakimeRun(st),
  })));
  // Combat terminé, gardé à l'écran (résultat, MVP) jusqu'à « Continuer »,
  // puis bilan de fin de run.
  const [frozen, setFrozen] = useState<{ fight: NakimeFight; seed: number; result: NakimeNodeOutcome } | null>(null);
  const [end, setEnd] = useState<NakimeRunEnd | null>(null);
  const [tab, setTab] = useState<LobbyTab>('team');
  const fight = frozen?.fight ?? s.run?.battle ?? null;
  const fightKey = fight ? `${fight.floor}-${fight.col}` : null;
  // Le combat démarre sous le bandeau : on le fait défiler à l'écran.
  const battleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (fightKey) battleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [fightKey]);
  const entriesLeft = nakimeEntriesLeft({ nakimeDay: s.day, nakimeEntriesUsed: s.used, nakimeMeta: s.meta });
  const entriesMax = nakimeDailyEntries(s.meta);

  const onNode = (res: NakimeNodeOutcome) => {
    if (res.end) setEnd(res.end);
  };
  const onAct = useCallback((ability: string | null, target?: string) => {
    const live = useGameStore.getState().nakimeRun;
    const before = live?.battle;
    const seed = live?.seed ?? 0;
    const res = useGameStore.getState().actNakimeBattle(ability, target);
    if (typeof res !== 'string' && res.result && before) setFrozen({ fight: { ...before, state: res.state }, seed, result: res.result });
    return res;
  }, []);

  return (
    <div className="page-scroll nk-page">
      <div className="page-inner">
        <header className={`nk-banner${fight || s.run ? ' is-compact' : ''}`}>
          <div className="nk-banner__strings" aria-hidden><i /><i /><i /><i /></div>
          <div className="nk-banner__title">
            <span className="nk-banner__eyebrow">Activité · Roguelike infini</span>
            <h1>Château de Nakime</h1>
            <p>Le biwa résonne, les salles se réarrangent et les mondes du multivers défilent. Monte le plus haut possible avec 5 cartes : plus tu montes, plus le butin grossit.</p>
          </div>
          <div className="nk-banner__art" aria-hidden>
            <span className="nk-banner__moon" />
            <EnemySprite src={NAKIME_SPRITE} name="Nakime" size={168} />
          </div>
          <div className="nk-banner__stats">
            <div className="nk-stat"><span>Record</span><b>{s.best} étage{s.best > 1 ? 's' : ''}</b></div>
            <div className="nk-stat"><span>Entrées du jour</span><b>{fmtEntries(entriesLeft)} / {fmtEntries(entriesMax)}</b></div>
            <div className="nk-stat"><span>Notes de Biwa</span><b>🎵 {s.notes}</b></div>
            <button type="button" className="nk-stat nk-stat--ticket" title="Un par acte terminé : à dépenser au Gachapon de l'Infini"
              onClick={() => { if (!fight && !s.run) setTab('gacha'); }}><span>Tickets de l&apos;Infini</span><b>🎟️ {s.tickets}</b></button>
          </div>
        </header>

        {s.stale && (
          <div className="nk-notice" role="status">
            <span className="nk-notice__icon">🪕</span>
            <div><b>Le château a été reconstruit</b><span>Ta run d&apos;une version précédente ne peut pas continuer.</span></div>
            <button className="btn-secondary nk-btn" onClick={() => useGameStore.getState().abandonNakimeRun()}>OK</button>
          </div>
        )}

        {fight ? (
          <div ref={battleRef} style={{ scrollMarginTop: 12 }}>
            <NakimeBattleView key={fightKey} fight={fight} seed={frozen?.seed ?? s.run?.seed ?? 0} result={frozen?.result} onAct={onAct} onExit={() => {
              const finished = frozen?.result.end;
              setFrozen(null);
              if (finished) setEnd(finished);
            }} />
          </div>
        ) : s.run ? (
          <NakimeRunView run={s.run} onNode={onNode} onAbandon={() => {
            const res = useGameStore.getState().abandonNakimeRun();
            if (res) setEnd(res);
          }} />
        ) : (
          <>
            <div className="nk-tabs" role="tablist" aria-label="Château de Nakime">
              {TABS.map(t => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={`nk-tabbtn${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'team' && (
              <>
                <NakimeTeamBuilder entriesLeft={entriesLeft} entriesMax={entriesMax} />
                <section className="panel nk-rules">
                  <h2>Comment ça marche ?</h2>
                  <ul>
                    <li>Compose une équipe de <b>5 cartes</b> différentes. Seuls comptent leur <b>rareté</b>, leur <b>rôle</b> (Assaillant, Gardien, Soigneur, Assassin, Mage), leurs <b>synergies d&apos;univers</b> et leur <b>type</b>. Le niveau et l&apos;équipement ne servent à rien ici.</li>
                    <li>Le château se découpe en <b>actes de {NAKIME_ACT_FLOORS} étages</b>, chacun dans un monde du multivers. Trace ta route sur la <b>carte</b> : combats, élites, rencontres, boutiques, forges, repos et trésors. Un <b>boss</b> clôt chaque acte, et une <b>Lune Supérieure</b> garde le château tous les 5 actes.</li>
                    <li>Les combats sont <b>automatiques</b> : chaque carte joue seule à son tour, avec ses vraies techniques (Kamehameha, Rasengan…). Tu peux accélérer ou passer le combat.</li>
                    <li>Les PV perdus restent perdus d&apos;un étage à l&apos;autre : soigne-toi au Repos ou en Boutique.</li>
                    <li>Après chaque victoire, choisis une <b>bénédiction</b> ou une <b>relique</b> ({NAKIME_RELIC_LIST.length} reliques à découvrir, {NAKIME_EVENTS.length} rencontres). Tes cartes gagnent de l&apos;<b>expérience</b> à chaque étage.</li>
                    <li>La run s&apos;arrête à la première défaite, ou quand tu te retires. Tu gardes <b>tout le butin</b> : gemmes, Pierres d&apos;Évolution, coffres d&apos;équipement et <b>Notes de Biwa</b> pour la Mémoire du Château.</li>
                    <li>L&apos;<b>édition</b> de tes cartes compte : <b>+10 % de PV et d&apos;ATQ par cran</b> (jusqu&apos;à +70 % en Prismatique). Les améliorations <b>Tranchant</b> et <b>Endurance</b> de la Mémoire sont indispensables pour viser très haut.</li>
                    <li>Atteins des <b>paliers de record</b> pour des récompenses uniques et deux <b>titres</b>. {NAKIME_DAILY_ENTRIES} entrée{NAKIME_DAILY_ENTRIES > 1 ? 's' : ''} par jour, plus avec la Mémoire (remise à zéro à 2 h).</li>
                  </ul>
                </section>
              </>
            )}
            {tab === 'memory' && <NakimeMemory />}
            {tab === 'records' && <NakimeRecords />}
            {tab === 'gacha' && <NakimeGachapon />}
          </>
        )}
      </div>
      {end && <NakimeEndModal end={end} onClose={() => setEnd(null)} />}
    </div>
  );
}
