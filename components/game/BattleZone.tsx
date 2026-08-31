'use client';
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ActiveUltsBar } from '@/components/game/UltAnimation';
import { PixelSprite } from '@/components/ui/PixelSprite';
import { formatNumber } from '@/lib/game/format';
import { getPalierConfig } from '@/lib/game/paliers';
import { getAffinityForId } from '@/lib/game/affinities';
import { RandomEventOverlay } from '@/components/game/events/RandomEventOverlay';
import { BattleParticles } from '@/components/game/BattleParticles';
import { bnDivRatio, bnIsZero, type BigNum } from '@/lib/game/bignum';
import { PalierBg } from '@/components/game/battle-zone/PalierBg';
import { ActiveBoostsBar } from '@/components/game/battle-zone/ActiveBoostsBar';
import { PalierTravelModal } from '@/components/game/battle-zone/PalierTravelModal';
import { EnemyHud } from '@/components/game/battle-zone/EnemyHud';
import { TeamBar } from '@/components/game/battle-zone/TeamBar';

interface Dmg { id: number; x: number; y: number; val: BigNum; }

// ─────────────────────────────────────────────────────────────────────────────
export function BattleZone() {
  const { currentEnemy, equippedTeam, getTotalDps, retreatFromBoss, challengeBoss, travelToPalier, wave, palier, maxPalierReached, runPeakPalier: runPeakPalierRaw, bossActive, bossAvoided, bossTimeLeft, getEventDpsMult, goldUpgradeLevel } = useGameStore();
  // Palier max atteint DEPUIS LE DERNIER PRESTIGE (contrairement à
  // maxPalierReached, qui ne redescend jamais et sert au classement) — c'est
  // ce qui doit borner le mode farm / voyage, sinon un joueur qui vient de
  // prestige peut instantanément revoyager vers son ancien palier.
  const runPeakPalier = runPeakPalierRaw ?? maxPalierReached;
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [showTravel, setShowTravel] = useState(false);
  const ultActiveUlts = useGameStore(s => s.ultActiveUlts);
  const dpsUltMult  = ultActiveUlts.reduce((m, a) => m * (a.effect.dpsMultiplier ?? 1), 1);
  const dps = getTotalDps(); // inclut déjà dpsMultiplier/selfDpsMultiplier (calculé dans gameStore)
  const enemyAffinity = getAffinityForId(currentEnemy.name);
  const cfg = getPalierConfig(palier);
  const isFarming = palier < runPeakPalier; // voyage sur un palier déjà validé CETTE run
  const hp  = bnDivRatio(currentEnemy.currentHp, currentEnemy.maxHp) * 100;
  const bossWarn = bossActive && bossTimeLeft <= 10;

  // ── Idle : dégâts automatiques (feedback visuel du DPS, sans clic) ────────
  useEffect(() => {
    if (bnIsZero(dps) || bnIsZero(currentEnemy.currentHp)) return;
    const id = setInterval(() => {
      const d: Dmg = {
        id: Date.now() + Math.random(),
        x: 40 + Math.random() * 40,   // % approx dans la zone
        y: 30 + Math.random() * 30,
        val: dps,
      };
      setDmgs(p => [...p, d]);
      setTimeout(() => setDmgs(p => p.filter(x => x.id !== d.id)), 800);
    }, 750);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dps/currentHp sont des BigNum (objets) : on dépend de leurs composantes primitives pour éviter de relancer l'intervalle à chaque render sans changement de valeur.
  }, [dps.mantissa, dps.exponent, currentEnemy.currentHp.mantissa, currentEnemy.currentHp.exponent]);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
      <PalierBg palier={palier} gradient={cfg.bgGradient} />
      <BattleParticles accentColor={cfg.accentColor} isBoss={currentEnemy?.isBoss} />

      {/* Événements aléatoires (mobs normaux uniquement) */}
      <RandomEventOverlay />

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
        eventDpsMult={getEventDpsMult()}
        hp={hp}
        onOpenTravel={() => setShowTravel(true)}
        onReturnToPeak={() => travelToPalier(runPeakPalier)}
      />

      {/* Barre des effets actifs */}
      <ActiveUltsBar />
      <ActiveBoostsBar />

      {/* ENNEMI centré */}
      <div onMouseDown={e => e.preventDefault()} style={{ flex:1, position:'relative', zIndex:2, cursor:'default', display:'flex', alignItems:'center', justifyContent:'center', userSelect:'none', WebkitUserSelect:'none' }}>
        <div style={{ position:'relative' }}>
          {/* Ombre/halo au sol — ancre le sprite dans l'arène au lieu de le laisser "flotter" */}
          <div style={{ position:'absolute', left:'50%', bottom: currentEnemy.isBoss?'0%':'3%', transform:'translate(-50%,0)',
            width: currentEnemy.isBoss?'230px':'160px', height: currentEnemy.isBoss?'42px':'26px', borderRadius:'50%',
            background: currentEnemy.isBoss
              ? 'radial-gradient(ellipse,rgba(239,68,68,0.5) 0%,rgba(124,58,237,0.22) 50%,transparent 78%)'
              : `radial-gradient(ellipse,${cfg.accentColor}4d 0%,transparent 78%)`,
            filter:'blur(7px)', pointerEvents:'none', zIndex:0 }} />
          <div className={currentEnemy.isBoss?'anim-boss':'anim-idle'}
            style={{ position:'relative', zIndex:1, transform:'scaleX(-1)', pointerEvents:'none',
              filter:currentEnemy.isBoss?'drop-shadow(0 0 28px rgba(239,68,68,0.85)) drop-shadow(0 0 60px rgba(239,68,68,0.3)) drop-shadow(0 12px 24px rgba(0,0,0,0.95))':`drop-shadow(0 0 16px ${cfg.accentColor}77) drop-shadow(0 10px 20px rgba(0,0,0,0.9))` }}>
            <PixelSprite src={currentEnemy.spritePath} alt={currentEnemy.name}
              size={currentEnemy.isBoss?280:220} rarity={currentEnemy.isBoss?'L':'C'}
              style={ currentEnemy.isBoss
                ? { height:'clamp(180px, 40vh, 300px)', width:'auto', maxWidth:'min(85vw, 360px)', maxHeight:'clamp(180px, 40vh, 300px)' }
                : { height:'clamp(150px, 32vh, 240px)', width:'auto', maxWidth:'min(78vw, 300px)', maxHeight:'clamp(150px, 32vh, 240px)' }
              } />
          </div>
        </div>
        {dmgs.map(d=>(
          <div key={d.id} style={{ position:'absolute', left:`${d.x}%`, top:`${d.y}%`, pointerEvents:'none', transform:'translate(-50%,-50%)',
            fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'18px', color:'#fbbf24',
            textShadow:'0 0 12px #f59e0b',
            animation:'floatDmg 0.8s ease-out forwards', whiteSpace:'nowrap', zIndex:10 }}>
            {formatNumber(d.val)}
          </div>
        ))}
      </div>

      <TeamBar
        equippedTeam={equippedTeam}
        currentEnemy={currentEnemy}
        goldUpgradeLevel={goldUpgradeLevel}
        dps={dps}
        dpsUltMult={dpsUltMult}
        bossActive={bossActive}
        bossAvoided={bossAvoided}
        wave={wave}
        retreatFromBoss={retreatFromBoss}
        challengeBoss={challengeBoss}
      />

      <style>{`
        @keyframes rainbowShift { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes floatDmg { 0%{opacity:1;transform:translate(-50%,-50%) translateY(0) scale(1)} 100%{opacity:0;transform:translate(-50%,-50%) translateY(-64px) scale(0.75)} }
        @keyframes shimmerSlide { 0%{left:-60%} 100%{left:110%} }
      `}</style>
    </div>
  );
}
