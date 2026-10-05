'use client';
import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PeripleChanceResult } from '@/store/slices/peripleSlice';
import type { ChanceCard } from '@/lib/game/periple';
import { RewardIcon } from '../PeripleIcons';
import { LootView, RewardPill } from '../PeripleModals';
import type { GameOutcome } from './MinigameModal';

// Cartes du Destin : 3 cartes face cachée, mélangées sous les yeux du joueur.
// L'effet est tiré au moment du choix (côté store) ; les deux autres cartes
// sont ensuite révélées pour montrer ce qu'on a manqué.

function MoveIcon({ forward, size }: { forward: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>
      <circle cx="24" cy="24" r="19" fill={forward ? '#7c3aed' : '#475569'} stroke="#1b1037" strokeWidth="2.5" />
      <path d={forward ? 'M14 24h16 M24 16l8 8-8 8' : 'M34 24H18 M24 16l-8 8 8 8'} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {forward && <path d="M10 16l3 3M10 32l3-3" stroke="#f0abfc" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

function CardFront({ card, picked }: { card: ChanceCard; picked: boolean }) {
  return (
    <div className={`pp-dcard__front${card.bad ? ' is-bad' : ''}${picked ? ' is-picked' : ''}`}>
      {card.move !== 0 ? <MoveIcon forward={card.move > 0} size={56} /> : <RewardIcon kind={card.rewards[0].kind} size={56} />}
      <div className="pp-dcard__title">{card.title}</div>
      <div className="pp-dcard__text">{card.text}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
        {card.rewards.map((r, i) => <RewardPill key={i} reward={r} />)}
      </div>
    </div>
  );
}

export function DestinyCards({ onLock, onDone }: { onLock: () => void; onDone: (o: GameOutcome | null) => void }) {
  const [phase, setPhase] = useState<'shuffle' | 'pick' | 'reveal'>('shuffle');
  const [result, setResult] = useState<PeripleChanceResult | null>(null);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase('pick'), 1500);
    return () => clearTimeout(t);
  }, []);

  const pick = (i: number) => {
    if (phase !== 'pick') return;
    onLock();
    const r = useGameStore.getState().playPeripleChance(i);
    if (!r) { onDone(null); return; }
    setResult(r);
    setPhase('reveal');
    setTimeout(() => setShowOthers(true), 900);
  };

  return (
    <div className="pp-game">
      <div className="pp-rune-msg">{phase === 'shuffle' ? 'Les cartes se mélangent…' : phase === 'pick' ? 'Choisis ta carte !' : result?.cards[result.picked].bad ? 'Pas de chance…' : 'Le destin te sourit !'}</div>
      <div className={`pp-dcards${phase === 'shuffle' ? ' is-shuffling' : ''}`}>
        {[0, 1, 2].map(i => {
          const flipped = phase === 'reveal' && result && (i === result.picked || showOthers);
          return (
            <button key={i} className={`pp-dcard${flipped ? ' is-flipped' : ''}${phase === 'reveal' && result && i !== result.picked ? ' is-other' : ''}`}
              style={{ ['--i' as string]: i }} onClick={() => pick(i)} disabled={phase !== 'pick'} aria-label={`Carte ${i + 1}`}>
              <span className="pp-dcard__inner">
                <span className="pp-dcard__back" aria-hidden>
                  <svg viewBox="0 0 60 60" width="64%" height="64%">
                    <circle cx="30" cy="30" r="24" fill="none" stroke="#fde68a" strokeWidth="2" strokeDasharray="3 4" />
                    <path d="M30 8l5 17 17 5-17 5-5 17-5-17-17-5 17-5z" fill="#fde68a" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="30" cy="30" r="4" fill="#7c3aed" />
                  </svg>
                </span>
                {result && <span className="pp-dcard__face"><CardFront card={result.cards[i]} picked={i === result.picked} /></span>}
              </span>
            </button>
          );
        })}
      </div>
      {phase === 'reveal' && result && (
        <div style={{ textAlign: 'center', animation: 'ppPop .35s .5s both' }}>
          {result.loot.pulls.length > 0 || result.loot.equipment.length > 0 ? <LootView loot={{ ...result.loot, rewards: [] }} /> : null}
          <button className="pp-btn pp-btn--green pp-loop" style={{ marginTop: 14, minWidth: 180 }} onClick={() => onDone({ loot: result.loot, chance: result })}>CONTINUER</button>
        </div>
      )}
    </div>
  );
}
