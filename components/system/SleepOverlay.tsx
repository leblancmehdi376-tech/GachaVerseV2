'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { RAID_BOSSES } from '@/lib/game/raidBoss';
import { bnDivRatio, bnIsZero } from '@/lib/game/bignum';

// Écran de veille complète (voir hooks/useAutoSleep.ts) : pendant qu'il est
// affiché, le jeu n'est plus dessiné du tout (globals.css, [data-sleep="full"]).
// Volontairement statique : aucune animation, et les compteurs ne sont relus
// que toutes les 5 s (pas d'abonnement au store, qui change chaque seconde).
const REFRESH_MS = 5000;

function readRaid(raidActive: boolean) {
  // Le combat de raid ne progresse que tant que sa page est ouverte
  // (RaidBattle reste monté pendant la veille) : hors de la page, le combat
  // mémorisé (raidBossFight) est en pause, on ne l'affiche donc pas.
  const fight = raidActive ? useGameStore.getState().raidBossFight : null;
  if (!fight) return null;
  const boss = RAID_BOSSES.find(b => b.id === fight.bossId);
  const ratio = fight.dead || bnIsZero(fight.maxHp) ? 0 : Math.min(1, Math.max(0, bnDivRatio(fight.hp, fight.maxHp)));
  return {
    name: boss?.name ?? 'Boss de raid',
    accent: boss?.accentColor ?? '#fbbf24',
    hpPct: Math.round(ratio * 1000) / 10,
    hp: formatNumber(fight.dead ? 0 : fight.hp),
    maxHp: formatNumber(fight.maxHp),
    kills: fight.kills,
  };
}

function readStats(raidActive: boolean) {
  const s = useGameStore.getState();
  return {
    coins: formatNumber(s.pixelCoins), gems: formatNumber(s.nekoGems), dps: formatNumber(s.getTotalDps()),
    palier: s.palier, wave: s.wave, raid: readRaid(raidActive),
  };
}

export function SleepOverlay({ raidActive }: { raidActive: boolean }) {
  const [stats, setStats] = useState(() => readStats(raidActive));
  // Boss de raid vaincus au moment de la mise en veille, pour afficher ceux
  // tombés depuis.
  const [killsAtStart] = useState(() => stats.raid?.kills ?? 0);
  useEffect(() => {
    const id = setInterval(() => setStats(readStats(raidActive)), REFRESH_MS);
    return () => clearInterval(id);
  }, [raidActive]);
  const { raid } = stats;

  return (
    <div className="sleep-overlay" role="dialog" aria-modal="true" aria-label="Jeu en veille">
      <div className="sleep-overlay__card">
        <div style={{ fontSize: 44, lineHeight: 1 }} aria-hidden>💤</div>
        <div style={{ fontFamily: 'var(--f-title)', fontWeight: 900, fontSize: 24, letterSpacing: 3, color: '#c4b5fd' }}>EN VEILLE</div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, color: 'var(--text-sub)', lineHeight: 1.5 }}>
          Le jeu continue de tourner : <strong style={{ color: 'var(--text)' }}>combat, gains et expéditions avancent normalement</strong>.
          Seul l&apos;affichage est suspendu pour ne pas utiliser ta carte graphique.
        </div>
        <div className="sleep-overlay__stats">
          <div><span>Pixel-Coins</span><b style={{ color: 'var(--gold)' }}>{stats.coins} 🪙</b></div>
          <div><span>Neko-Gemmes</span><b style={{ color: 'var(--cyan-hi)' }}>{stats.gems} 💎</b></div>
          <div><span>DPS</span><b style={{ color: 'var(--green)' }}>{stats.dps}/s</b></div>
          <div><span>Progression</span><b>Palier {stats.palier} · Vague {stats.wave}/10</b></div>
        </div>
        {raid && (
          <div className="sleep-overlay__raid" style={{ ['--acc' as string]: raid.accent } as CSSProperties}>
            <div className="sleep-overlay__raid-head">
              <span>⚔️ Raid en cours</span>
              <b>{raid.name}</b>
            </div>
            <div className="sleep-overlay__raid-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={raid.hpPct} aria-label="PV du boss">
              <div className="sleep-overlay__raid-fill" style={{ width: `${raid.hpPct}%` }} />
            </div>
            <div className="sleep-overlay__raid-foot">
              <span>PV {raid.hp} / {raid.maxHp} ({raid.hpPct} %)</span>
              <span>Vaincus : <b>{raid.kills}</b>{raid.kills > killsAtStart && <> (+{raid.kills - killsAtStart} pendant la veille)</>}</span>
            </div>
          </div>
        )}
        {/* Le réveil passe par useAutoSleep (pointerdown / keydown / focus),
            qui remet aussi les attributs de <html> : le bouton n'est qu'un repère. */}
        <button type="button" className="sleep-overlay__resume">▶ Reprendre</button>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.4 }}>
          Clique n&apos;importe où pour reprendre. Délai réglable dans <strong>Options → Veille automatique</strong>.
        </div>
      </div>
    </div>
  );
}
