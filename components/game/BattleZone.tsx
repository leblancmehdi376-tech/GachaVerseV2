'use client';
import { useState, useEffect, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { ActiveUltsBar } from '@/components/game/UltAnimation';
import { PixelSprite } from '@/components/ui/PixelSprite';
import { formatNumber } from '@/lib/game/format';
import { getPalierConfig } from '@/lib/game/paliers';
import { ENEMY_SPRITES_ASSET_VERSION } from '@/lib/game/enemies';
import { getAffinityForId } from '@/lib/game/affinities';
import { RandomEventOverlay } from '@/components/game/events/RandomEventOverlay';
import { BattleParticles } from '@/components/game/BattleParticles';
import { bnDivRatio, bnIsZero, type BigNum } from '@/lib/game/bignum';
import { PalierBg } from '@/components/game/battle-zone/PalierBg';
import { ActiveBoostsBar } from '@/components/game/battle-zone/ActiveBoostsBar';
import { PalierTravelModal } from '@/components/game/battle-zone/PalierTravelModal';
import { EnemyHud } from '@/components/game/battle-zone/EnemyHud';
import { TeamBar } from '@/components/game/battle-zone/TeamBar';
import { useLowFx } from '@/hooks/useLowFx';

interface Dmg { id: number; x: number; y: number; val: BigNum; }

// Blocs indépendants des PV de l'ennemi : mémoïsés pour ne pas suivre les
// re-renders de la zone à chaque tick.
const MemoPalierBg = memo(PalierBg);
const MemoBattleParticles = memo(BattleParticles);
const MemoRandomEventOverlay = memo(RandomEventOverlay);
const MemoActiveUltsBar = memo(ActiveUltsBar);
const MemoActiveBoostsBar = memo(ActiveBoostsBar);
const MemoTeamBar = memo(TeamBar);

// ─────────────────────────────────────────────────────────────────────────────
// La zone se re-rend à chaque tick (PV de l'ennemi) : on ne s'abonne qu'aux
// champs affichés, et les blocs lourds qui ne dépendent pas des PV (décor,
// sprite, barre d'équipe, chiffres de dégâts) sont mémoïsés à part.
export function BattleZone() {
  const { currentEnemy, equippedTeam, wave, palier, maxPalierReached, runPeakPalier: runPeakPalierRaw, bossActive, bossAvoided, bossTimeLeft } = useGameStore(useShallow(s => ({
    currentEnemy: s.currentEnemy,
    equippedTeam: s.equippedTeam,
    wave: s.wave,
    palier: s.palier,
    maxPalierReached: s.maxPalierReached,
    runPeakPalier: s.runPeakPalier,
    bossActive: s.bossActive,
    bossAvoided: s.bossAvoided,
    bossTimeLeft: s.bossTimeLeft,
  })));
  // Actions : références stables, pas besoin de s'y abonner.
  const { retreatFromBoss, challengeBoss, travelToPalier, debugKillEnemy } = useGameStore.getState();
  // Calculs mis en cache dans le store (voir characterSlice) : même objet tant
  // que leurs entrées ne changent pas, donc pas de re-render à chaque tick.
  const dps = useGameStore(s => s.getTotalDps()); // inclut déjà dpsMultiplier/selfDpsMultiplier
  const goldMult = useGameStore(s => s.getGoldMultiplier()); // TOUS les boosts d'or (coffre, titre, ult, boost, prestige, anomalies)
  const eventDpsMult = useGameStore(s => s.getEventDpsMult());
  // [DEV] Bouton "tuer le mob" affiché uniquement en local, jamais en prod.
  const isLocalDev = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.')
  );
  // Palier max atteint DEPUIS LE DERNIER PRESTIGE (contrairement à
  // maxPalierReached, qui ne redescend jamais et sert au classement) — c'est
  // ce qui doit borner le mode farm / voyage, sinon un joueur qui vient de
  // prestige peut instantanément revoyager vers son ancien palier.
  const runPeakPalier = runPeakPalierRaw ?? maxPalierReached;
  const [showTravel, setShowTravel] = useState(false);
  const lowFx = useLowFx();
  const ultActiveUlts = useGameStore(s => s.ultActiveUlts);
  const dpsUltMult  = ultActiveUlts.reduce((m, a) => m * (a.effect.dpsMultiplier ?? 1), 1);
  const enemyAffinity = getAffinityForId(currentEnemy.name);
  const cfg = getPalierConfig(palier);
  const isFarming = palier < runPeakPalier; // voyage sur un palier déjà validé CETTE run
  const hp  = bnDivRatio(currentEnemy.currentHp, currentEnemy.maxHp) * 100;
  const bossWarn = bossActive && bossTimeLeft <= 10;

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
      <MemoPalierBg palier={palier} gradient={cfg.bgGradient} />
      <MemoBattleParticles accentColor={cfg.accentColor} isBoss={currentEnemy?.isBoss} still={lowFx} />

      {/* Événements aléatoires (mobs normaux uniquement) */}
      <MemoRandomEventOverlay />

      {/* Sélecteur de palier (voyage) */}
      {showTravel && (
        <PalierTravelModal
          current={palier}
          maxReached={runPeakPalier}
          onTravel={travelToPalier}
          onClose={() => setShowTravel(false)}
        />
      )}

      <EnemyHud
        currentEnemy={currentEnemy}
        cfg={cfg}
        wave={wave}
        isFarming={isFarming}
        runPeakPalier={runPeakPalier}
        bossActive={bossActive}
        bossTimeLeft={bossTimeLeft}
        bossWarn={bossWarn}
        enemyAffinity={enemyAffinity}
        eventDpsMult={eventDpsMult}
        hp={hp}
        onOpenTravel={() => setShowTravel(true)}
        onReturnToPeak={() => travelToPalier(runPeakPalier)}
        onDebugKill={isLocalDev ? debugKillEnemy : undefined}
      />

      {/* Barre des effets actifs */}
      <MemoActiveUltsBar />
      <MemoActiveBoostsBar />

      {/* ENNEMI centré */}
      <div onMouseDown={e => e.preventDefault()} style={{ flex:1, position:'relative', zIndex:2, cursor:'default', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none' }}>
        <EnemySprite spritePath={currentEnemy.spritePath} name={currentEnemy.name} isBoss={!!currentEnemy.isBoss} accentColor={cfg.accentColor} />
        <DamageNumbers dps={dps} enemyAlive={!bnIsZero(currentEnemy.currentHp)} />
      </div>

      <MemoTeamBar
        equippedTeam={equippedTeam}
        pixelCoinsReward={currentEnemy.pixelCoinsReward}
        gemsReward={currentEnemy.gemsReward}
        goldMult={goldMult}
        dps={dps}
        dpsUltMult={dpsUltMult}
        bossActive={bossActive}
        bossAvoided={bossAvoided}
        wave={wave}
        retreatFromBoss={retreatFromBoss}
        challengeBoss={challengeBoss}
      />
    </div>
  );
}

// ── Sprite de l'ennemi (ne change qu'avec l'ennemi, pas avec ses PV) ─────────
const EnemySprite = memo(function EnemySprite({ spritePath, name, isBoss, accentColor }: { spritePath: string; name: string; isBoss: boolean; accentColor: string }) {
  return (
    <div style={{ position:'relative' }}>
      {/* Ombre/halo au sol — ancre le sprite dans l'arène au lieu de le laisser "flotter" */}
      <div style={{ position:'absolute', left:'50%', bottom: isBoss?'0%':'3%', transform:'translate(-50%,0)',
        width: isBoss?'242px':'168px', height: isBoss?'44px':'27px', borderRadius:'50%',
        background: isBoss
          ? 'radial-gradient(ellipse,rgba(239,68,68,0.5) 0%,rgba(124,58,237,0.22) 50%,transparent 78%)'
          : `radial-gradient(ellipse,${accentColor}4d 0%,transparent 78%)`,
        filter:'blur(7px)', pointerEvents:'none', zIndex:0 }} />
      {isBoss && (
        <div className="anim-boss" style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:'90%', height:'90%', borderRadius:'50%',
          background:'radial-gradient(circle, rgba(239,68,68,0.45) 0%, rgba(239,68,68,0.15) 45%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      )}
      {/* Flottement (anim-idle) sur le conteneur, ombres portées sur un enfant
          immobile : le flou est rastérisé une fois dans le calque animé au
          lieu d'être recalculé par le GPU à chaque frame de l'animation.
          L'animation remplaçait le scaleX(-1) : seul le boss est retourné. */}
      <div className={isBoss?undefined:'anim-idle'} style={{ position:'relative', zIndex:1, pointerEvents:'none' }}>
        <div style={{ transform: isBoss?'scaleX(-1)':undefined,
            filter:isBoss?'drop-shadow(0 0 28px rgba(239,68,68,0.85)) drop-shadow(0 0 60px rgba(239,68,68,0.3)) drop-shadow(0 12px 24px rgba(0,0,0,0.95))':`drop-shadow(0 0 16px ${accentColor}77) drop-shadow(0 10px 20px rgba(0,0,0,0.9))` }}>
          <PixelSprite src={spritePath} alt={name} assetVersion={ENEMY_SPRITES_ASSET_VERSION} priority
            size={isBoss?294:231} rarity={isBoss?'L':'C'}
            style={ isBoss
              ? { height:'clamp(189px, 42vh, 315px)', width:'auto', maxWidth:'min(89.25vw, 378px)', maxHeight:'clamp(189px, 42vh, 315px)' }
              : { height:'clamp(158px, 33.6vh, 252px)', width:'auto', maxWidth:'min(81.9vw, 315px)', maxHeight:'clamp(158px, 33.6vh, 252px)' }
            } />
        </div>
      </div>
    </div>
  );
});

// ── Idle : dégâts automatiques (feedback visuel du DPS, sans clic) ────────
// État local isolé : l'apparition/disparition des chiffres ne re-rend que ce
// composant, pas toute la zone de combat. Un chiffre par seconde, au rythme
// du tick de dégâts.
const DamageNumbers = memo(function DamageNumbers({ dps, enemyAlive }: { dps: BigNum; enemyAlive: boolean }) {
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  useEffect(() => {
    if (bnIsZero(dps) || !enemyAlive) return;
    const id = setInterval(() => {
      const d: Dmg = {
        id: Date.now() + Math.random(),
        x: 40 + Math.random() * 40,   // % approx dans la zone
        y: 30 + Math.random() * 30,
        val: dps,
      };
      setDmgs(p => [...p, d]);
      setTimeout(() => setDmgs(p => p.filter(x => x.id !== d.id)), 800);
    }, 1000);
    return () => clearInterval(id);
  }, [dps, enemyAlive]);

  return dmgs.map(d => (
    <div key={d.id} style={{ position:'absolute', left:`${d.x}%`, top:`${d.y}%`, pointerEvents:'none', transform:'translate(-50%,-50%)',
      fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'20px', color:'#fbbf24',
      textShadow:'0 0 12px #f59e0b',
      animation:'floatDmg 0.8s ease-out forwards', whiteSpace:'nowrap', zIndex:10 }}>
      {formatNumber(d.val)}
    </div>
  ));
});
