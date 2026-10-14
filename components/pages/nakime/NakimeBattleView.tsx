'use client';
import { useEffect, useMemo, useState } from 'react';
import type { NakimeBattleOutcome, NakimeNodeOutcome } from '@/store/slices/nakimeSlice';
import { getCharacterById } from '@/lib/game/characters';
import { formatNumber } from '@/lib/game/format';
import {
  NAKIME_NODE_INFO, NAKIME_ENERGY_MAX, NAKIME_ACT_FLOORS, STATUS_INFO, BASIC_ATTACK, ROLE_INFO,
  actWorld, abilityIcon, turnOrder,
  type BattleState, type BUnit, type NakimeEvent, type NakimeFight, type UnitSnap,
} from '@/lib/game/nakime';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RARITY_CONFIG } from '@/types/game';
import { EnemySprite, RoleTag, TypeTag, WorldBackdrop } from './NakimeBits';

// Vitesse de lecture mémorisée sur cet appareil.
const SPEED_KEY = 'gv_nakime_speed';
const SPEEDS = [1, 2, 4] as const;
function loadSpeed(): number {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    if (SPEEDS.includes(v as 1)) return v;
  } catch { /* stockage indisponible */ }
  return 1;
}

interface Anim { events: NakimeEvent[]; i: number; final: BattleState }

// Combat automatique : chaque carte joue seule (IA) avec ses techniques, le
// combat est joué tour par tour par le store et rejoué ici en animation.
export function NakimeBattleView({ fight, seed, result, onAct, onExit }: {
  fight: NakimeFight;
  seed: number;
  result?: NakimeNodeOutcome;           // combat terminé (gelé par la page)
  onAct: (ability: string | null) => NakimeBattleOutcome | string;
  onExit: () => void;
}) {
  const act = Math.floor((fight.floor - 1) / NAKIME_ACT_FLOORS) + 1;
  const world = useMemo(() => actWorld(seed, act), [seed, act]);
  const [shown, setShown] = useState<BattleState>(fight.state);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [speed, setSpeed] = useState(loadSpeed);

  const event = anim ? anim.events[anim.i] : null;
  const busy = !!anim;
  const snaps: UnitSnap[] | null = event ? event.snap : null;

  // Lecture des événements, un par un.
  useEffect(() => {
    if (!anim) return;
    const ev = anim.events[anim.i];
    const base = ev.kind === 'rage' ? 1000 : ev.ability && ev.ability !== BASIC_ATTACK ? 850 : ev.kind === 'tick' ? 500 : 550;
    const t = setTimeout(() => {
      if (anim.i + 1 >= anim.events.length) { setShown(anim.final); setAnim(null); }
      else setAnim({ ...anim, i: anim.i + 1 });
    }, base / speed);
    return () => clearTimeout(t);
  }, [anim, speed]);

  // Tour suivant de ton équipe : joué automatiquement.
  useEffect(() => {
    if (busy || shown.over || !shown.active) return;
    const t = setTimeout(() => {
      const res = onAct(null);
      if (typeof res === 'string') return;
      if (res.events.length) setAnim({ events: res.events, i: 0, final: res.state });
      else setShown(res.state);
    }, 250 / speed);
    return () => clearTimeout(t);
  }, [busy, shown, speed, onAct]);

  // Passer : joue tout le reste du combat d'un coup.
  const skip = () => {
    let st = anim ? anim.final : shown;
    for (let guard = 0; guard < 2000 && !st.over; guard++) {
      const res = onAct(null);
      if (typeof res === 'string') break;
      st = res.state;
    }
    setAnim(null);
    setShown(st);
  };

  const unitState = (u: BUnit, idx: number) => (snaps ? snaps[idx] : { hp: u.hp, shield: u.shield, energy: Math.round(u.energy), st: u.statuses });
  const order = useMemo(() => turnOrder(shown, 8), [shown]);
  const byId = useMemo(() => Object.fromEntries(shown.units.map(u => [u.id, u])), [shown]);
  const info = NAKIME_NODE_INFO[fight.kind];

  const renderUnit = (u: BUnit) => {
    const idx = shown.units.indexOf(u);
    const s = unitState(u, idx);
    const pct = Math.max(0, Math.min(100, (s.hp / u.maxHp) * 100));
    const shieldPct = Math.min(100, (s.shield / u.maxHp) * 100);
    const fx = event ? event.effects.filter(e => e.tgt === u.id) : [];
    const acting = event?.src === u.id;
    const hit = fx.some(e => (e.dmg ?? 0) > 0);
    const tpl = u.templateId ? getCharacterById(u.templateId) : undefined;
    return (
      <button key={u.id} type="button" onClick={() => setInspect(inspect === u.id ? null : u.id)}
        className={['nk-unit', `nk-unit--${u.side}`, s.hp <= 0 && 'is-ko', acting && 'is-acting', hit && 'is-hit', u.kind === 'boss' && 'is-boss',
          u.kind === 'elite' && 'is-elite', inspect === u.id && 'is-inspected'].filter(Boolean).join(' ')}
        style={tpl ? { ['--rar' as string]: RARITY_CONFIG[tpl.rarity].color } : undefined}
        aria-label={`${u.name}, ${formatNumber(s.hp)} PV`}>
        <div className="nk-unit__portrait">
          {tpl ? <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={58} height={80} />
            : <EnemySprite src={u.sprite} name={u.name} size={u.kind === 'boss' ? 92 : 70} />}
          {s.shield > 0 && <span className="nk-unit__shield" aria-hidden />}
          {s.hp <= 0 && <span className="nk-ko" aria-hidden>KO</span>}
          <div className="nk-floats" key={anim ? anim.i : -1}>
            {fx.map((e, i) => (
              <span key={i} className={['nk-float', e.heal !== undefined ? 'is-heal' : e.shield ? 'is-shield' : e.dodged ? 'is-dodge' : '',
                e.status && !e.dot ? 'is-status' : '', e.cleanse && 'is-status', e.crit && 'is-crit', e.matchup === 'strong' && 'is-strong', e.matchup === 'weak' && 'is-weak'].filter(Boolean).join(' ')}
                style={{ animationDelay: `${i * 90}ms` }}>
                {e.dodged ? 'Esquive' : e.cleanse ? '✨ Purifié' : e.status && !e.dot ? STATUS_INFO[e.status].icon
                  : e.heal !== undefined ? `+${formatNumber(e.heal)}` : e.shield ? `🛡️${formatNumber(e.shield)}` : `-${formatNumber(e.dmg ?? 0)}${e.crit ? '!' : ''}`}
              </span>
            ))}
            {fx.some(e => e.guarded) && <span className="nk-float is-guard">🦊</span>}
          </div>
        </div>
        <span className="nk-unit__name">{u.name}</span>
        <span className="nk-unit__tags">
          {u.role && <RoleTag role={u.role} short />}
          <TypeTag affinity={u.affinity} short />
        </span>
        <div className={`nk-bar nk-bar--hp${pct < 35 ? ' is-low' : ''}`}>
          <span className="nk-bar__ghost" style={{ width: `${pct}%` }} />
          <div style={{ width: `${pct}%` }} />
          {shieldPct > 0 && <i className="nk-bar__shield" style={{ width: `${shieldPct}%` }} />}
        </div>
        <span className="nk-unit__hp">{formatNumber(s.hp)}{s.shield > 0 && <em> +{formatNumber(s.shield)}</em>}</span>
        {u.side === 'ally' && (
          <div className={`nk-bar nk-bar--energy${s.energy >= NAKIME_ENERGY_MAX ? ' is-full' : ''}`} title="Énergie"><div style={{ width: `${(s.energy / NAKIME_ENERGY_MAX) * 100}%` }} /></div>
        )}
        {s.st.length > 0 && (
          <span className="nk-statuses">
            {s.st.map(x => <span key={x.id} className="nk-status" style={{ color: STATUS_INFO[x.id].color }} title={STATUS_INFO[x.id].label}>{STATUS_INFO[x.id].icon}{x.id !== 'stun' && <b>{x.turns}</b>}</span>)}
          </span>
        )}
      </button>
    );
  };

  const enemies = shown.units.filter(u => u.side === 'enemy');
  const allies = shown.units.filter(u => u.side === 'ally');
  const inspected = inspect ? byId[inspect] : null;
  const finished = !busy && !!shown.over;
  const mvp = finished ? (() => {
    const top = (k: Record<string, number>) => allies.map(a => ({ a, v: k[a.id] ?? 0 })).sort((x, y) => y.v - x.v)[0];
    return { dmg: top(shown.dmg), heal: top(shown.heal) };
  })() : null;
  const won = shown.over === 'won';

  return (
    <WorldBackdrop palier={world.palier} className={`panel nk-battle${fight.kind === 'boss' ? ' is-boss-fight' : ''}`}>
      <div className="nk-room__head">
        <h2 className="nk-h2">{info.icon} {info.label} — étage {fight.floor}</h2>
        {!finished && (
          <div className="nk-battle__ctrl">
            <button className="btn-secondary nk-btn" onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed as 1) + 1) % SPEEDS.length];
              setSpeed(next);
              try { localStorage.setItem(SPEED_KEY, String(next)); } catch { /* stockage indisponible */ }
            }}>Vitesse ×{speed}</button>
            <button className="btn-secondary nk-btn" onClick={skip}>Passer ⏭</button>
          </div>
        )}
      </div>

      {!finished && (
        <div className="nk-turnbar" aria-label="Ordre des tours">
          <span className="nk-turnbar__label">Tours</span>
          {order.map((id, i) => {
            const u = byId[id];
            if (!u) return null;
            const tpl = u.templateId ? getCharacterById(u.templateId) : undefined;
            return (
              <span key={`${id}-${i}`} className={`nk-turnbar__item nk-turnbar__item--${u.side}${i === 0 ? ' is-now' : ''}`} title={u.name}>
                {tpl ? <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={30} height={41} />
                  : <EnemySprite src={u.sprite} name={u.name} size={34} />}
              </span>
            );
          })}
        </div>
      )}

      <div className={`nk-arena${event?.kind === 'rage' || (event?.ability && byId[event.src]?.kind === 'boss' && event.ability !== BASIC_ATTACK) ? ' is-shaking' : ''}`}
        key={event?.kind === 'rage' ? anim?.i : undefined}>
        <div className="nk-arena__ground" aria-hidden />
        <div className="nk-side nk-side--enemy">{enemies.map(renderUnit)}</div>
        {event && (event.kind === 'rage' || (event.ability && event.ability !== BASIC_ATTACK)) && (
          <div className={`nk-banner-skill${byId[event.src]?.side === 'enemy' ? ' is-enemy' : ''}`} key={anim?.i}>
            <span>{byId[event.src]?.name}</span>
            <b>{event.kind === 'rage' ? '💢 RAGE !' : `${abilityIcon(event.ability!, byId[event.src]?.templateId)} ${event.name}`}</b>
          </div>
        )}
        <div className="nk-side nk-side--ally">{allies.map(renderUnit)}</div>
      </div>

      {inspected && <UnitInfo u={inspected} onClose={() => setInspect(null)} />}

      {!finished && (
        <ul className="nk-log">
          {event && <li className="is-now">{event.text}</li>}
          {[...(anim ? anim.events.slice(0, anim.i).map(e => e.text).reverse() : []), ...shown.log].slice(0, event ? 4 : 5).map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}

      {finished && (
        <div className={`nk-result ${won ? 'is-win' : result?.revived ? 'is-revive' : 'is-loss'}`}>
          <b>{won ? 'Victoire !' : result?.revived ? 'Seconde chance !' : 'Défaite…'}</b>
          <span>
            {won
              ? `+${result?.shards ?? 0} Éclats · ton équipe gagne de l'expérience.`
              : result?.revived ? 'La plume de résurrection brille : ton équipe se relève à 30 % PV et poursuit l\'ascension.'
              : 'Ton équipe est tombée. Le butin accumulé est conservé.'}
          </span>
          {mvp && (mvp.dmg?.v > 0 || mvp.heal?.v > 0) && (
            <div className="nk-mvp">
              {mvp.dmg?.v > 0 && <span>⚔️ MVP : <b>{mvp.dmg.a.name}</b> ({formatNumber(mvp.dmg.v)} dégâts)</span>}
              {mvp.heal?.v > 0 && <span>💚 Soins : <b>{mvp.heal.a.name}</b> ({formatNumber(mvp.heal.v)})</span>}
            </div>
          )}
          {result?.newAct && won && <p className="nk-act-banner nk-act-banner--ticket">🎟️ <b>+1 Ticket de l&apos;Infini</b> pour avoir terminé l&apos;acte {result.newAct - 1} !</p>}
          {result?.newAct && <p className="nk-act-banner">🪕 Le biwa résonne… direction l&apos;<b>acte {result.newAct}</b> !</p>}
          <button className="btn-primary nk-btn" onClick={onExit}>{result?.end ? 'Voir le bilan' : 'Continuer ➜'}</button>
        </div>
      )}
    </WorldBackdrop>
  );
}

/** Fiche d'une unité : stats et statuts. */
function UnitInfo({ u, onClose }: { u: BUnit; onClose: () => void }) {
  return (
    <div className="nk-info">
      <div className="nk-info__head">
        <b>{u.name}</b>
        {u.role && <RoleTag role={u.role} />}
        <TypeTag affinity={u.affinity} />
        <button className="nk-notice__close" onClick={onClose} aria-label="Fermer la fiche">✕</button>
      </div>
      <span className="nk-muted">❤️ {formatNumber(u.hp)} / {formatNumber(u.maxHp)} · ⚔️ {formatNumber(u.atk)} · 💨 {u.speed}{u.role ? ` · ${ROLE_INFO[u.role].text}` : ''}</span>
      {u.statuses.length > 0 && (
        <ul className="nk-info__list">
          {u.statuses.map(s => <li key={s.id}><b style={{ color: STATUS_INFO[s.id].color }}>{STATUS_INFO[s.id].icon} {STATUS_INFO[s.id].label}</b>{s.id !== 'stun' && ` (${s.turns} t.)`} — {STATUS_INFO[s.id].text}</li>)}
        </ul>
      )}
    </div>
  );
}
