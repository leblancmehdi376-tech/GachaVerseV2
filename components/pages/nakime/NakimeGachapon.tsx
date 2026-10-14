'use client';
import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import type { NakimeGachaResult } from '@/store/slices/nakimeSlice';
import {
  GACHA_TIERS, GACHA_TIER_INFO, NAKIME_GACHA_PRIZES, NAKIME_GACHA_PITY, NAKIME_GACHA_TITLE_DUPLICATE_GEMS,
  describeGachaPrize, gachaTierChance, isHighTier, type GachaTier,
} from '@/lib/game/nakimeGacha';
import { NAKIME_UNLIMITED_ENTRIES } from '@/lib/game/nakime';
import { NakimeCapsuleReveal } from './NakimeCapsuleReveal';

// Séquence : le ticket entre dans la fente, la manivelle tourne (plus longtemps
// si une grosse capsule arrive), la capsule tombe, puis la scène d'ouverture.
type Phase = 'idle' | 'insert' | 'crank' | 'drop' | 'reveal';
const INSERT_MS = 500;
const CRANK_MS = 1300;
const CRANK_LUCKY_MS = 2100;
const DROP_MS = 750;
const BULBS = 12;
// Capsules visibles dans le dôme : [rareté, gauche %, haut %], en tas au fond.
const DOME_CAPSULES: [GachaTier, number, number][] = [
  ['commun', 8, 66], ['rare', 26, 70], ['commun', 44, 72], ['epique', 62, 70], ['rare', 78, 64],
  ['legendaire', 17, 48], ['commun', 35, 52], ['mythique', 53, 50], ['rare', 70, 46], ['epique', 42, 32],
];

// Gachapon de l'Infini : un Ticket de l'Infini = une capsule.
export function NakimeGachapon() {
  const { tickets, pity, total } = useGameStore(useShallow(s => ({
    tickets: s.nakimeTickets ?? 0, pity: s.nakimeGachaPity ?? 0, total: s.nakimeGachaPulls ?? 0,
  })));
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<NakimeGachaResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

  const busy = phase === 'insert' || phase === 'crank' || phase === 'drop';
  const pull = (count: number) => {
    if (busy) return;
    const res = useGameStore.getState().pullNakimeGacha(count);
    if (typeof res === 'string') { setError(res); return; }
    setError(null);
    setResults(res);
    const lucky = res.some(r => isHighTier(r.prize.tier));
    const crank = lucky ? CRANK_LUCKY_MS : CRANK_MS;
    setPhase('insert');
    later(INSERT_MS, () => setPhase('crank'));
    later(INSERT_MS + crank, () => setPhase('drop'));
    later(INSERT_MS + crank + DROP_MS, () => setPhase('reveal'));
  };

  const best = results.reduce<NakimeGachaResult | null>((b, r) =>
    !b || GACHA_TIERS.indexOf(r.prize.tier) > GACHA_TIERS.indexOf(b.prize.tier) ? r : b, null);
  const bestTier = best && phase !== 'idle' ? best.prize.tier : null;
  // Pendant la manivelle, la couleur du dôme trahit la meilleure capsule.
  const glow = bestTier === 'mythique' ? ' is-mythic' : bestTier === 'legendaire' ? ' is-lucky' : '';
  const pityLeft = NAKIME_GACHA_PITY - pity;

  return (
    <section className="panel nk-gacha">
      <div className="nk-builder__head">
        <h2>Gachapon de l&apos;Infini</h2>
        <span className="chip nk-ticket-chip">🎟️ <b>{tickets}</b> Ticket{tickets > 1 ? 's' : ''} de l&apos;Infini</span>
      </div>
      <p className="nk-muted">Chaque acte terminé au château rapporte un <b>Ticket de l&apos;Infini</b>. Glisse-le dans la machine : une capsule, un lot. Gemmes, invocations, Pierres d&apos;Évolution, coffres… et, avec beaucoup de chance, une capsule <b>Mythique</b>.</p>

      <div className="nk-gacha__stage">
        <div className={`nk-machine is-${phase}${phase === 'crank' || phase === 'drop' ? glow : ''}`} aria-hidden>
          <div className="nk-machine__bulbs">
            {Array.from({ length: BULBS }, (_, i) => (
              <span key={i} style={{ transform: `rotate(${(i / BULBS) * 300 - 150}deg) translateY(-112px)`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
          {phase === 'insert' && <span className="nk-machine__ticket">🎟️</span>}
          <div className="nk-machine__dome">
            {DOME_CAPSULES.map(([tier, left, top], i) => (
              <span key={i} className="nk-capsule" style={{
                ['--cap' as string]: GACHA_TIER_INFO[tier].color, left: `${left}%`, top: `${top}%`, animationDelay: `${i * 0.17}s`,
              }} />
            ))}
          </div>
          <div className="nk-machine__body">
            <span className="nk-machine__slot">🎟️</span>
            <span className="nk-machine__crank" />
            <span className="nk-machine__mouth">
              {(phase === 'drop' || phase === 'reveal') && best && <span className="nk-capsule nk-capsule--out" style={{ ['--cap' as string]: GACHA_TIER_INFO[best.prize.tier].color }} />}
            </span>
          </div>
        </div>

        <div className="nk-gacha__side">
          <div className="nk-gacha__pity">
            <span>Garantie <b style={{ color: GACHA_TIER_INFO.legendaire.color }}>Légendaire</b> au plus tard dans <b>{pityLeft}</b> capsule{pityLeft > 1 ? 's' : ''}</span>
            <div className="nk-bar"><div style={{ width: `${(pity / NAKIME_GACHA_PITY) * 100}%`, background: 'linear-gradient(90deg,#b45309,#fbbf24)' }} /></div>
          </div>
          <div className="nk-gacha__buttons">
            <button className="btn-primary nk-btn nk-gacha__btn" disabled={tickets < 1 || busy} onClick={() => pull(1)}>
              Ouvrir 1 capsule <span>🎟️ 1</span>
            </button>
            <button className="btn-primary nk-btn nk-gacha__btn" disabled={tickets < 5 || busy} onClick={() => pull(5)}>
              Ouvrir 5 capsules <span>🎟️ 5</span>
            </button>
          </div>
          {tickets < 1 && <p className="nk-muted">Termine un acte au château pour gagner un ticket.</p>}
          {NAKIME_UNLIMITED_ENTRIES && (
            // Outil de test : uniquement en local (npm run dev), jamais en production.
            <button className="btn-secondary nk-btn nk-dev-btn" onClick={() => useGameStore.setState(st => ({ nakimeTickets: (st.nakimeTickets ?? 0) + 10 }))}>
              🛠️ +10 tickets (test local)
            </button>
          )}
          {error && <p className="nk-error">{error}</p>}
          <span className="nk-muted">{total} capsule{total > 1 ? 's' : ''} ouverte{total > 1 ? 's' : ''} au total</span>
        </div>
      </div>

      {phase === 'reveal' && (
        <NakimeCapsuleReveal key={total} results={results} tickets={tickets}
          onClose={() => setPhase('idle')} onAgain={count => { setPhase('idle'); pull(count); }} />
      )}

      {phase === 'idle' && results.length > 0 && (
        <div className="nk-gacha__recap">
          <span className="nk-muted">Derniers lots :</span>
          {results.map((r, i) => (
            <span key={i} className="chip" style={{ color: GACHA_TIER_INFO[r.prize.tier].color, borderColor: `${GACHA_TIER_INFO[r.prize.tier].color}88` }}>
              {r.prize.icon} {r.prize.name}
            </span>
          ))}
        </div>
      )}

      <button className="nk-relics-panel__head nk-gacha__odds-toggle" onClick={() => setShowOdds(v => !v)} aria-expanded={showOdds}>
        <span>Probabilités et lots</span>
        <span aria-hidden>{showOdds ? '▲' : '▼'}</span>
      </button>
      {showOdds && (
        <div className="nk-gacha__odds">
          {GACHA_TIERS.map(t => (
            <div key={t} className="nk-odds" style={{ ['--cap' as string]: GACHA_TIER_INFO[t].color }}>
              <div className="nk-odds__head">
                <span className="nk-capsule nk-capsule--mini" />
                <b>{GACHA_TIER_INFO[t].label}</b>
                <span>{gachaTierChance(t).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %</span>
              </div>
              <ul>
                {NAKIME_GACHA_PRIZES.filter(p => p.tier === t).map(p => (
                  <li key={p.id}>{p.icon} <b>{p.name}</b> — {describeGachaPrize(p)}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="nk-muted">Au sein d&apos;une rareté, chaque lot a la même chance. Garantie : au plus tard tous les {NAKIME_GACHA_PITY} tickets, une capsule Légendaire ou Mythique. Le titre déjà obtenu est remplacé par {NAKIME_GACHA_TITLE_DUPLICATE_GEMS} gemmes.</p>
        </div>
      )}
    </section>
  );
}
