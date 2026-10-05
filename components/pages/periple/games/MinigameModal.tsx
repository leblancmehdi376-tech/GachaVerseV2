'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { PeripleLoot, PeripleChanceResult } from '@/store/slices/peripleSlice';
import { TILE_INFO, MEDAL_INFO, HUNT_MEDAL_SCORES, getSkillRewards, getHuntRewards, huntMedal, isSkillTile, type Medal, type TileKind, type SkillTileKind } from '@/lib/game/periple';
import { Modal, LootView, RewardPill } from '../PeripleModals';
import { MedalIcon } from '../PeripleIcons';
import { TileBadge } from '../TileBadge';
import { CombatDuel } from './CombatDuel';
import { ComboRush } from './ComboRush';
import { RuneMemory } from './RuneMemory';
import { HackPairs } from './HackPairs';
import { DestinyCards } from './DestinyCards';
import { GachaWheel } from './GachaWheel';
import { RarityHunt } from './RarityHunt';

const HOW_TO: Record<SkillTileKind, string[]> = {
  combat: ['Une jauge défile : appuie sur FRAPPER quand le curseur est dans la zone.', 'Le centre de la zone inflige un coup critique (×2).', '3 coups : vide la barre de vie pour l\'Or.'],
  action: ['Des flèches apparaissent : appuie sur la bonne direction.', 'Une erreur coûte du temps.', 'Enchaîne les 12 flèches avant la fin du chrono pour l\'Or.'],
  isekai: ['Les runes s\'illuminent dans un ordre précis : mémorise-le.', 'Reproduis la séquence en touchant les runes.', '3 portails de plus en plus longs : franchis-les tous pour l\'Or.'],
  scifi: ['Retourne les modules deux par deux pour former des paires.', 'Trouve les 6 paires avant la coupure du système.', 'Finis vite pour l\'Or (et un dé en prime).'],
};

const HUNT_HOW_TO = [
  'Une rareté est tirée au sort : repère-la au cadre des cartes.',
  'Touche un maximum de personnages de cette rareté en 20 secondes.',
  'Bonne carte : +1. Mauvaise carte : -1.',
  'Chaque point rapporte des jetons et des points, et chaque médaille ajoute un bonus.',
];

export interface GameOutcome {
  loot: PeripleLoot;
  chance?: PeripleChanceResult;
}

/**
 * Popup du mini-jeu de la case en attente. On peut la fermer avant de jouer
 * (le mini-jeu reste en attente), jamais pendant la partie.
 */
export function MinigameModal({ kind, onClose }: { kind: TileKind; onClose: (outcome: GameOutcome | null) => void }) {
  const info = TILE_INFO[kind];
  const hunt = kind === 'hunt';
  const skill = isSkillTile(kind) || hunt;   // jeux d'adresse : intro, partie, résultat
  const [phase, setPhase] = useState<'intro' | 'play' | 'result'>(skill ? 'intro' : 'play');
  const [medal, setMedal] = useState<Medal>(0);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [score, setScore] = useState<number | null>(null);
  // Cartes / roue : verrouillé dès que le joueur a choisi (récompense déjà créditée).
  const [locked, setLocked] = useState(false);

  const finishSkill = (m: Medal) => {
    const loot = useGameStore.getState().finishPeripleGame(m);
    setMedal(m);
    setOutcome(loot ? { loot } : null);
    setPhase('result');
  };

  const finishHunt = (sc: number) => {
    const loot = useGameStore.getState().finishPeripleHunt(sc);
    setScore(sc);
    setMedal(huntMedal(sc));
    setOutcome(loot ? { loot } : null);
    setPhase('result');
  };

  const closable = skill ? phase === 'intro' : !locked;
  return (
    <Modal onClose={() => onClose(outcome)} closable={closable} wide={kind === 'scifi' || kind === 'chance'}>
      <div className="pp-game-head" style={{ ['--accent' as string]: info.top }}>
        <TileBadge kind={kind} size={58} />
        <div style={{ minWidth: 0 }}>
          <div className="pp-game-head__tile">{info.label}</div>
          <div className="pp-game-head__name">{info.game}</div>
        </div>
      </div>

      {phase === 'intro' && skill && (
        <div className="pp-game-intro">
          <ul className="pp-rules">{(hunt ? HUNT_HOW_TO : HOW_TO[kind as SkillTileKind]).map((l, i) => <li key={i}>{l}</li>)}</ul>
          <div className="pp-medal-table">
            {([3, 2, 1] as Medal[]).map(m => (
              <div key={m} className="pp-medal-row">
                <MedalIcon medal={m} size={40} />
                <span style={{ color: MEDAL_INFO[m].color }}>{MEDAL_INFO[m].label}{hunt && <span className="pp-medal-row__req"> · {HUNT_MEDAL_SCORES[m]}+ persos</span>}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto', justifyContent: 'flex-end' }}>
                  {(hunt ? getHuntRewards(HUNT_MEDAL_SCORES[m]) : getSkillRewards(kind as SkillTileKind, m)).map((r, i) => <RewardPill key={i} reward={r} />)}
                </div>
              </div>
            ))}
          </div>
          <button className="pp-btn pp-btn--big pp-loop" style={{ width: '100%', marginTop: 14 }} onClick={() => setPhase('play')}>▶ JOUER</button>
        </div>
      )}

      {phase === 'play' && kind === 'combat' && <CombatDuel onFinish={finishSkill} />}
      {phase === 'play' && kind === 'action' && <ComboRush onFinish={finishSkill} />}
      {phase === 'play' && kind === 'isekai' && <RuneMemory onFinish={finishSkill} />}
      {phase === 'play' && kind === 'scifi' && <HackPairs onFinish={finishSkill} />}
      {phase === 'play' && kind === 'chance' && <DestinyCards onLock={() => setLocked(true)} onDone={o => onClose(o)} />}
      {phase === 'play' && hunt && <RarityHunt onFinish={finishHunt} />}
      {phase === 'play' && kind === 'gacha' && <GachaWheel onLock={() => setLocked(true)} onDone={o => onClose(o)} />}

      {phase === 'result' && (
        <div style={{ textAlign: 'center' }}>
          <div className={`pp-medal-big${medal === 3 ? ' is-gold pp-loop' : ''}`}><MedalIcon medal={medal} size={110} /></div>
          <div className="pp-modal-title" style={{ color: MEDAL_INFO[medal].color }}>
            {medal === 0 ? 'Raté… lot de consolation' : `Médaille ${MEDAL_INFO[medal].label} !`}
          </div>
          {score !== null && <div className="pp-modal-text">Score : <b style={{ color: '#fff' }}>{score}</b> personnage{score > 1 ? 's' : ''}</div>}
          {outcome && <div style={{ marginTop: 12 }}><LootView loot={outcome.loot} /></div>}
          <button className="pp-btn pp-btn--green pp-loop" style={{ marginTop: 18, minWidth: 180 }} onClick={() => onClose(outcome)}>CONTINUER</button>
        </div>
      )}
    </Modal>
  );
}
