'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { NakimeNodeOutcome } from '@/store/slices/nakimeSlice';
import { getCharacterById } from '@/lib/game/characters';
import { getAffinityMultiplier } from '@/lib/game/affinities';
import { formatNumber } from '@/lib/game/format';
import {
  NAKIME_NODE_INFO, NAKIME_OFFER_INFO, NAKIME_FORGE_MAX_TIER, NAKIME_EVENT_BY_ID, NAKIME_RELICS, BOON_INFO,
  generateActMap, buildEnemies, isFightNode, nakimeXpToNext, runMemberStats, shardReward,
  currentFloor, floorsCleared, actWorld, eventScale, boonShards, offerPrice, rerollPrice,
  type NakimeRun, type NakimeOffer,
} from '@/lib/game/nakime';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { NakimeMap } from './NakimeMap';
import { EnemySprite, RelicCard, RoleTag, TypeTag, WorldBackdrop } from './NakimeBits';

export function NakimeRunView({ run, onNode, onAbandon }: {
  run: NakimeRun;
  onNode: (res: NakimeNodeOutcome) => void;
  onAbandon: () => void;
}) {
  const [notice, setNotice] = useState<{ icon: string; title: string; lines: string[] } | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showRelics, setShowRelics] = useState(false);
  const world = actWorld(run.seed, run.act);
  const floor = currentFloor(run);
  // Sur téléphone/tablette, l'aperçu est au-dessus de la carte : on le ramène à l'écran.
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected === null || window.innerWidth > 1100) return;
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selected]);

  const enter = (col: number) => {
    const res = useGameStore.getState().enterNakimeNode(col);
    setSelected(null);
    if (!res) return;
    if (res.kind === 'rest') setNotice({ icon: '🍵', title: 'Repos', lines: ['Ton équipe reprend des forces.', 'Les alliés KO se relèvent.'] });
    else if (res.kind === 'treasure') {
      const relic = res.relic ? NAKIME_RELICS[res.relic] : null;
      setNotice({ icon: '🎁', title: 'Trésor', lines: [`+${res.shards} Éclats`, ...(relic ? [`Relique obtenue : ${relic.icon} ${relic.name}`] : [])] });
    } else setNotice(null);
    onNode(res);
  };

  return (
    <div className="nk-run">
      <div className="panel nk-hud" style={{ ['--world' as string]: world.accent }}>
        <div className="nk-hud__floor">
          <span className="nk-hud__act">Acte {run.act} · {world.name}</span>
          <div><b>Étage {run.pending || run.room ? floorsCleared(run) : floor}</b></div>
          <span className="nk-hud__world">{world.universe}</span>
        </div>
        <div className="nk-hud__res">
          <span className="chip" title="Éclats : monnaie de la run">🪕 <b>{formatNumber(run.shards)}</b></span>
          <span className="chip" title="Gemmes gardées à la fin">💎 {run.loot.gems}</span>
          {run.loot.stones > 0 && <span className="chip" title="Pierres d'Évolution gardées à la fin">💠 {run.loot.stones}</span>}
          {(run.loot.tickets ?? 0) > 0 && <span className="chip nk-ticket-chip" title="Tickets de l'Infini gagnés (un par acte terminé)">🎟️ {run.loot.tickets}</span>}
          {run.loot.chestRare + run.loot.chestEpic > 0 && <span className="chip" title="Coffres d'équipement gardés à la fin">🧰 {run.loot.chestRare + run.loot.chestEpic}</span>}
          {run.bonus.atkPct > 0 && <span className="chip" title="Bonus d'ATQ de la run">🗡️ +{run.bonus.atkPct}% ATQ</span>}
          {run.bonus.hpPct > 0 && <span className="chip" title="Bonus de PV de la run">🫀 +{run.bonus.hpPct}% PV</span>}
          {run.bonus.energy > 0 && <span className="chip" title="Énergie de départ en combat">⚡ +{run.bonus.energy}</span>}
          {run.secondWind && <span className="chip" title="Seconde chance disponible">🪶</span>}
        </div>
        <div className="nk-hud__quit">
          {confirmQuit ? (
            <>
              <span className="nk-muted">Encaisser le butin et quitter ?</span>
              <button className="btn-primary nk-btn" onClick={onAbandon}>Oui, se retirer</button>
              <button className="btn-secondary nk-btn" onClick={() => setConfirmQuit(false)}>Non</button>
            </>
          ) : (
            <button className="btn-secondary nk-btn" onClick={() => setConfirmQuit(true)}>Se retirer</button>
          )}
        </div>
      </div>

      <div className="nk-run__grid">
        <div className="nk-run__main">
          {notice && (
            <div className="nk-notice" role="status">
              <span className="nk-notice__icon">{notice.icon}</span>
              <div><b>{notice.title}</b>{notice.lines.map((l, i) => <span key={i}>{l}</span>)}</div>
              <button className="nk-notice__close" onClick={() => setNotice(null)} aria-label="Fermer">✕</button>
            </div>
          )}

          {run.pending?.kind === 'event' ? (
            <NakimeEventView run={run} onDone={(lines, title, icon) => setNotice({ icon, title, lines })} />
          ) : run.pending ? (
            <NakimeRewardPicker run={run} />
          ) : run.room ? (
            <NakimeRoomView run={run} />
          ) : (
            <WorldBackdrop palier={world.palier} className="panel nk-map-panel">
              <div className="nk-map-panel__head">
                <div className="nk-map-panel__title">
                  <span className="nk-map-panel__act">Acte {run.act}</span>
                  <h2 className="nk-h2">{world.name}</h2>
                  <span className="nk-muted">{world.universe}</span>
                </div>
                <div className="nk-map-panel__boss">
                  <EnemySprite src={world.boss.sprite} name={world.boss.name} size={52} />
                  <span><small>{world.bossTitle}</small><b>{world.boss.name}</b></span>
                </div>
              </div>
              <NakimeMap run={run} selected={selected} onSelect={setSelected} />
              <div className="nk-legend">
                {(Object.keys(NAKIME_NODE_INFO) as (keyof typeof NAKIME_NODE_INFO)[]).map(k => (
                  <span key={k} className="nk-legend__item" style={{ ['--node' as string]: NAKIME_NODE_INFO[k].color }}>
                    <i aria-hidden>{NAKIME_NODE_INFO[k].icon}</i>{NAKIME_NODE_INFO[k].label}
                  </span>
                ))}
              </div>
            </WorldBackdrop>
          )}
        </div>

        <aside className="nk-run__side">
          {!run.pending && !run.room && (
            <div ref={previewRef}><NakimeNodePreview run={run} col={selected} onEnter={enter} /></div>
          )}
          <NakimeTeamStrip run={run} />
          <section className="panel nk-relics-panel">
            <button className="nk-relics-panel__head" onClick={() => setShowRelics(v => !v)} aria-expanded={showRelics}>
              <span>Reliques ({run.relics.length})</span>
              <span className="nk-relics-panel__icons">{run.relics.map(id => NAKIME_RELICS[id]?.icon).join(' ') || '—'}</span>
              <span aria-hidden>{showRelics ? '▲' : '▼'}</span>
            </button>
            {showRelics && run.relics.length > 0 && (
              <div className="nk-relic-list">{run.relics.map(id => <RelicCard key={id} id={id} compact />)}</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── Aperçu du nœud sélectionné ───────────────────────────────────────────
function NakimeNodePreview({ run, col, onEnter }: { run: NakimeRun; col: number | null; onEnter: (col: number) => void }) {
  if (col === null) {
    return (
      <section className="panel nk-preview nk-preview--empty">
        <p className="nk-muted">Touche une salle allumée sur la carte pour voir ce qui t&apos;y attend.</p>
      </section>
    );
  }
  const map = generateActMap(run.seed, run.act);
  const kind = map[run.row + 1]?.[col]?.kind;
  if (!kind) return null;
  const info = NAKIME_NODE_INFO[kind];
  const floor = currentFloor(run);
  const enemies = isFightNode(kind) ? buildEnemies(run.seed, run.act, floor, col, kind, run.enemyScale ?? 1) : [];
  const allies = runMemberStats(run).filter((_, i) => run.members[i].hp > 0);
  const shards = shardReward(kind, floor, run.relics);
  return (
    <section className="panel nk-preview" style={{ ['--node' as string]: info.color }}>
      <div className="nk-preview__head">
        <span className="nk-preview__icon">{info.icon}</span>
        <div>
          <b>{info.label}</b>
          <span className="nk-muted">Étage {floor}</span>
        </div>
      </div>
      <p className="nk-preview__text">{info.text}</p>
      {enemies.length > 0 && (
        <ul className="nk-foes">
          {enemies.map(e => {
            const strong = allies.filter(a => getAffinityMultiplier(a.affinity, e.affinity) > 1).length;
            const weak = allies.filter(a => getAffinityMultiplier(a.affinity, e.affinity) < 1).length;
            return (
              <li key={e.id} className={`nk-foe nk-foe--${e.kind}`}>
                <EnemySprite src={e.sprite} name={e.name} size={e.kind === 'boss' ? 56 : 44} />
                <div className="nk-foe__info">
                  <b>{e.name}</b>
                  <span>❤️ {formatNumber(e.maxHp)} · ⚔️ {formatNumber(e.atk)}</span>
                  <span className="nk-foe__tags">
                    <TypeTag affinity={e.affinity} />
                    {strong > 0 && <span className="nk-good">▲ {strong} avantagé{strong > 1 ? 's' : ''}</span>}
                    {weak > 0 && <span className="nk-bad">▼ {weak} désavantagé{weak > 1 ? 's' : ''}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {shards > 0 && <p className="nk-preview__reward">+{shards} Éclats</p>}
      <button className="btn-primary nk-btn nk-btn--wide" onClick={() => onEnter(col)}>
        {isFightNode(kind) ? 'COMBATTRE' : 'ENTRER'}
      </button>
    </section>
  );
}

// ── Équipe ───────────────────────────────────────────────────────────────
export function NakimeTeamStrip({ run, selected, onSelect }: { run: NakimeRun; selected?: number; onSelect?: (i: number) => void }) {
  const stats = runMemberStats(run);
  return (
    <div className="nk-team">
      {run.members.map((m, i) => {
        const tpl = getCharacterById(m.templateId);
        if (!tpl) return null;
        const st = stats[i];
        const ko = m.hp <= 0;
        const hpPct = Math.max(0, Math.min(100, (m.hp / st.maxHp) * 100));
        const content = (
          <>
            <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={52} height={72} />
            <div className="nk-member__info">
              <span className="nk-member__name">{tpl.name}</span>
              <span className="nk-member__meta">
                Nv {m.level} <RoleTag role={st.role} short /> <TypeTag affinity={st.affinity} short /> ⚔️ {formatNumber(st.atk)}
              </span>
              <div className={`nk-bar nk-bar--hp${hpPct < 35 ? ' is-low' : ''}`}><div style={{ width: `${hpPct}%` }} /></div>
              <span className="nk-member__hp">
                {ko ? 'KO' : `${formatNumber(m.hp)} / ${formatNumber(st.maxHp)} PV`}
                {(m.weapon > 0 || m.armor > 0) && <> · {m.weapon > 0 && `⚔️+${m.weapon} `}{m.armor > 0 && `🛡️+${m.armor}`}</>}
              </span>
              <div className="nk-bar nk-bar--xp" title="Expérience"><div style={{ width: `${(m.xp / nakimeXpToNext(m.level)) * 100}%` }} /></div>
            </div>
          </>
        );
        const cls = `nk-member${ko ? ' is-ko' : ''}${selected === i ? ' is-selected' : ''}`;
        return onSelect
          ? <button key={m.key} className={cls} onClick={() => onSelect(i)} disabled={ko}>{content}</button>
          : <div key={m.key} className={cls}>{content}</div>;
      })}
    </div>
  );
}

// ── Récompense à choisir ─────────────────────────────────────────────────
function NakimeRewardPicker({ run }: { run: NakimeRun }) {
  const p = run.pending!;
  if (p.kind === 'event') return null;
  const floor = floorsCleared(run);
  const choose = (i: number | null) => useGameStore.getState().chooseNakimeReward(i);
  const title = p.kind === 'boon' ? 'Choisis une bénédiction' : p.tier === 'boss' ? 'Relique de boss !' : 'Choisis une relique';
  return (
    <section className="panel nk-reward">
      <h2 className="nk-h2">{p.kind === 'relic' && p.tier === 'boss' ? '👑' : '✨'} {title}</h2>
      {run.row === -1 && run.act > 1 && (
        <p className="nk-act-banner">Le biwa résonne… <b>Acte {run.act}</b> : {actWorld(run.seed, run.act).name}. Ton équipe récupère 30 % de ses PV.</p>
      )}
      <div className="nk-reward__options">
        {p.kind === 'relic'
          ? p.options.map((id, i) => (
            <button key={id} className="nk-choice" onClick={() => choose(i)}><RelicCard id={id} /></button>
          ))
          : p.options.map((b, i) => (
            <button key={b} className="nk-choice nk-boon" onClick={() => choose(i)}>
              <span className="nk-boon__icon">{BOON_INFO[b].icon}</span>
              <b>{BOON_INFO[b].name}</b>
              <span>{BOON_INFO[b].text(floor)}</span>
            </button>
          ))}
      </div>
      <button className="btn-secondary nk-btn" onClick={() => choose(null)}>Passer (+{Math.round(boonShards(floor) / 2)} Éclats)</button>
    </section>
  );
}

// ── Rencontre ────────────────────────────────────────────────────────────
function NakimeEventView({ run, onDone }: { run: NakimeRun; onDone: (lines: string[], title: string, icon: string) => void }) {
  const p = run.pending;
  const [error, setError] = useState<string | null>(null);
  if (!p || p.kind !== 'event') return null;
  const ev = NAKIME_EVENT_BY_ID[p.id];
  if (!ev) return null;
  const scale = eventScale(floorsCleared(run));
  const pickOpt = (i: number) => {
    const res = useGameStore.getState().chooseNakimeEvent(i);
    if (typeof res === 'string') setError(res);
    else onDone(res, ev.title, ev.icon);
  };
  return (
    <section className="panel nk-event">
      <span className="nk-event__icon">{ev.icon}</span>
      <h2 className="nk-h2">{ev.title}</h2>
      <p className="nk-event__text">{ev.text}</p>
      <div className="nk-event__options">
        {ev.options.map((o, i) => {
          const cost = o.cost ? Math.round(o.cost * scale) : 0;
          return (
            <button key={i} className="nk-choice nk-event__opt" disabled={cost > run.shards} onClick={() => pickOpt(i)}>
              <b>{o.label}{cost > 0 && <span className="nk-cost"> · 🪕 {cost}</span>}</b>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="nk-error">{error}</p>}
    </section>
  );
}

// ── Boutique / Forge ─────────────────────────────────────────────────────
function offerLabel(o: NakimeOffer) {
  if (o.kind === 'relic' && o.relic) return null;
  return NAKIME_OFFER_INFO[o.kind as Exclude<NakimeOffer['kind'], 'relic'>];
}

function NakimeRoomView({ run }: { run: NakimeRun }) {
  const room = run.room!;
  const [target, setTarget] = useState<number | undefined>(() => {
    const i = run.members.findIndex(m => m.hp > 0);
    return i >= 0 ? i : undefined;
  });
  const [msg, setMsg] = useState<string | null>(null);
  const isForge = room.kind === 'forge';
  const info = NAKIME_NODE_INFO[room.kind];
  const floor = floorsCleared(run);
  const buy = (i: number) => {
    const err = useGameStore.getState().buyNakimeOffer(i, target);
    setMsg(err ?? '✔ Acheté !');
  };
  const reroll = () => {
    const err = useGameStore.getState().rerollNakimeShop();
    setMsg(err ?? '✔ Nouvelles reliques !');
  };
  const rerollCost = rerollPrice(run, floor, room.rerolls);

  return (
    <section className="panel nk-room" style={{ ['--node' as string]: info.color }}>
      <div className="nk-room__head">
        <h2 className="nk-h2">{info.icon} {isForge ? 'La Forge des Pourfendeurs' : 'La Boutique du Château'}</h2>
        <span className="chip">🪕 <b>{formatNumber(run.shards)}</b> Éclats</span>
      </div>
      {isForge && (
        <>
          <p className="nk-muted">Carte qui reçoit l&apos;arme ou l&apos;armure :</p>
          <div className="nk-targets">
            {run.members.map((m, i) => {
              const tpl = getCharacterById(m.templateId);
              if (!tpl) return null;
              return (
                <button key={m.key} className={`nk-target${target === i ? ' is-selected' : ''}`} disabled={m.hp <= 0} onClick={() => setTarget(i)}>
                  <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={36} height={50} />
                  <span className="nk-target__info">
                    <b>{tpl.name}</b>
                    <span>⚔️ {m.weapon}/{NAKIME_FORGE_MAX_TIER} · 🛡️ {m.armor}/{NAKIME_FORGE_MAX_TIER}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="nk-offers">
        {room.offers.map((o, i) => {
          const sold = room.bought.includes(i);
          const tm = target !== undefined ? run.members[target] : undefined;
          const maxed = !!tm && ((o.kind === 'weapon' && tm.weapon >= NAKIME_FORGE_MAX_TIER) || (o.kind === 'armor' && tm.armor >= NAKIME_FORGE_MAX_TIER));
          const cost = offerPrice(run, o, target);
          const poor = run.shards < cost;
          const label = offerLabel(o);
          const button = (
            <button className="btn-primary nk-btn nk-offer__buy" disabled={sold || poor || maxed || (o.needsTarget && target === undefined)} onClick={() => buy(i)}>
              {sold ? 'Acheté' : maxed ? 'Max' : `🪕 ${cost}`}
            </button>
          );
          if (o.kind === 'relic' && o.relic) {
            return <div key={i} className={`nk-offer${sold ? ' is-sold' : ''}`}><RelicCard id={o.relic}>{button}</RelicCard></div>;
          }
          return (
            <div key={i} className={`nk-offer${sold ? ' is-sold' : ''}`}>
              <div className="nk-offer__plain">
                <span className="nk-offer__icon">{label?.icon}</span>
                <div className="nk-offer__body"><b>{label?.name}</b><span>{label?.text}</span></div>
                {button}
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className={msg.startsWith('✔') ? 'nk-ok' : 'nk-error'}>{msg}</p>}
      <div className="nk-room__foot">
        {!isForge && <button className="btn-secondary nk-btn" disabled={run.shards < rerollCost} onClick={reroll}>🔄 Relancer les reliques (🪕 {rerollCost})</button>}
        <button className="btn-primary nk-btn" onClick={() => useGameStore.getState().leaveNakimeRoom()}>Continuer ➜</button>
      </div>
    </section>
  );
}
