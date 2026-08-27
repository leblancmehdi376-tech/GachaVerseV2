'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRandomEventStore, JACKPOT_BUTTON_MS } from '@/store/randomEventStore';
import { formatNumber } from '@/lib/game/format';
import { BN_ZERO, bnFromNumber, bnMax, bnMul, bnMulScalar, type BigNum } from '@/lib/game/bignum';

// Symboles de la machine. `weight` = fréquence sur un rouleau.
// L'OR est exprimé en MULTIPLE du butin d'un mob du palier courant (`coinMult`),
// donc il grimpe automatiquement avec la progression. Gemmes/couronnes restent fixes.
type Symbol = {
  key: string; icon: string; label: string; weight: number;
  coinMult?: number; gems?: number; crowns?: number; malusDivide?: number; bankrupt?: boolean;
};

const SYMBOLS: Symbol[] = [
  { key:'seven',  icon:'7️⃣', label:'JACKPOT 777', weight: 1,  coinMult: 40, gems: 150, crowns: 5 },
  { key:'gem',    icon:'💎', label:'Gemmes',       weight: 4,  gems: 100 },
  { key:'crown',  icon:'👑', label:'Couronne',     weight: 3,  crowns: 10 },
  { key:'coin',   icon:'🪙', label:'Pièces',       weight: 6,  coinMult: 10 },
  { key:'clover', icon:'🍀', label:'Trèfle',       weight: 5,  coinMult: 8, gems: 10 },
  { key:'bomb',   icon:'💀', label:'Malus',        weight: 3,  malusDivide: 3 },
  // Très rare (~5% des triples, ~2,25% de tous les tirages) — vide TOUS les
  // Pixel-Coins du joueur. Poids calculé pour tomber pile sur 5% du pool.
  { key:'bankrupt',  icon:'🪦', label:'BANQUEROUTE',   weight: 1.158, bankrupt: true },
];

const MALUS_DURATION_MS = 600000; // ÷3 DPS pendant 10 min

function pickSymbol(): Symbol {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s; }
  return SYMBOLS[SYMBOLS.length - 1];
}

function buildNonTripleReels(): Symbol[] {
  let reels: Symbol[] = [pickSymbol(), pickSymbol(), pickSymbol()];
  while (reels[0].key === reels[1].key && reels[1].key === reels[2].key) {
    reels = [pickSymbol(), pickSymbol(), pickSymbol()];
  }
  return reels;
}

export function JackpotEvent() {
  const end               = useRandomEventStore(s => s.end);
  const grant             = useGameStore(s => s.grantEventRewards);
  const setEventDpsMult   = useGameStore(s => s.setEventDpsMult);

  // Or de référence = butin d'un mob du palier courant × bonus Coffre d'Or.
  const goldPerUnit = (): BigNum => {
    const g = useGameStore.getState();
    return bnMax(bnFromNumber(1000), bnMul(g.currentEnemy.pixelCoinsReward, g.getGoldMultiplier()));
  };
  const coinsFor = (s: Symbol): BigNum => (s.coinMult ? bnMulScalar(goldPerUnit(), s.coinMult) : BN_ZERO);

  const [phase, setPhase] = useState<'button' | 'slots'>('button');
  const [timeLeft, setTimeLeft] = useState(JACKPOT_BUTTON_MS);
  const [reels, setReels] = useState<Symbol[]>([SYMBOLS[3], SYMBOLS[3], SYMBOLS[3]]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Symbol | null>(null);
  const [done, setDone] = useState(false);
  // Montant VERROUILLÉ au moment exact du tirage (pas recalculé à chaque
  // rendu) : sinon, laisser la fenêtre ouverte pendant que la partie
  // progresse faisait grimper le chiffre affiché avec le palier/vague
  // atteint depuis, même si ce n'est pas ce qui a été réellement accordé.
  const [lockedCoins, setLockedCoins] = useState<BigNum>(BN_ZERO);

  // Fenêtre du bouton clignotant : si non cliqué, l'event se termine.
  useEffect(() => {
    if (phase !== 'button') return;
    const start = Date.now();
    const iv = setInterval(() => {
      const left = JACKPOT_BUTTON_MS - (Date.now() - start);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) { clearInterval(iv); end(); }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, end]);

  const spinIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Empêche de clore l'event deux fois (fermeture manuelle + auto-close) et
  // sert de garde pour le nettoyage au démontage ci-dessous.
  const closedRef = useRef(false);
  const closeEvent = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    end();
  };

  const spin = () => {
    if (spinning || done) return;
    setSpinning(true);
    // Résultat : triple d'un symbole tiré au poids (sinon pas de gain).
    const isTriple = Math.random() < 0.45;         // ~45% de chance d'aligner
    const target = pickSymbol();
    spinIv.current = setInterval(() => {
      setReels([pickSymbol(), pickSymbol(), pickSymbol()]);
    }, 80);
    setTimeout(() => {
      if (spinIv.current) clearInterval(spinIv.current);
      const final = isTriple ? [target, target, target] : buildNonTripleReels();
      setReels(final);
      setSpinning(false);
      setDone(true);
      if (isTriple) {
        setResult(target);
        if (target.malusDivide) {
          setEventDpsMult(1 / target.malusDivide, MALUS_DURATION_MS);
        } else if (target.bankrupt) {
          useGameStore.setState({ pixelCoins: BN_ZERO });
        } else {
          // Montant calculé UNE SEULE FOIS ici, verrouillé, puis accordé
          // immédiatement — impossible d'attendre pour le faire grimper.
          const coins = coinsFor(target);
          setLockedCoins(coins);
          grant(coins, target.gems ?? 0, target.crowns ?? 0);
        }
      } else {
        setResult(null);
      }
      // Fermeture automatique 3s après l'affichage du résultat — la
      // récompense est déjà accordée à ce stade, ça ne fait qu'empêcher de
      // laisser la fenêtre ouverte indéfiniment.
      autoCloseTimeout.current = setTimeout(closeEvent, 3000);
    }, 1600);
  };

  const handleManualClose = () => {
    if (autoCloseTimeout.current) clearTimeout(autoCloseTimeout.current);
    closeEvent();
  };

  // Si le composant est démonté avant la fermeture (ex: changement de page)
  // alors que l'event est encore en cours, on le termine quand même dans le
  // store — sinon `active` reste bloqué sur 'jackpot' et revenir sur la page
  // remonte un JackpotEvent totalement neuf (phase bouton, done=false),
  // permettant de rejouer le jackpot et de récupérer la récompense à l'infini.
  useEffect(() => () => {
    if (spinIv.current) clearInterval(spinIv.current);
    if (autoCloseTimeout.current) clearTimeout(autoCloseTimeout.current);
    closeEvent();
  }, []);


  // ── Phase 1 : bouton clignotant ──────────────────────────────────────
  if (phase === 'button') {
    return (
      <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(3,2,10,0.35)' }}>
        <button onClick={() => setPhase('slots')}
          style={{ padding:'18px 30px', borderRadius:14, cursor:'pointer', border:'2px solid #fbbf24',
            background:'linear-gradient(135deg,#b45309,#f59e0b)', color:'#fff',
            fontFamily:'var(--f-title)', fontWeight:900, fontSize:20.6, letterSpacing:2,
            boxShadow:'0 0 40px rgba(245,158,11,0.7)', animation:'jackpotBlink 0.6s infinite' }}>
          🎰 GAIN MULTIPLIÉ !
          <div style={{ fontFamily:'var(--f-num)', fontSize:12, fontWeight:700, opacity:0.85, marginTop:4 }}>{(timeLeft/1000).toFixed(0)}s pour tenter</div>
        </button>
        <style>{`@keyframes jackpotBlink { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5)} }`}</style>
      </div>
    );
  }

  // ── Phase 2 : machine à sous ─────────────────────────────────────────
  return (
    <div style={{ position:'absolute', inset:0, zIndex:20, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(3,2,10,0.6)' }}>
      <div style={{ width:'min(360px,92%)', borderRadius:16, border:'1px solid var(--border-glow)', background:'linear-gradient(170deg,#1a1230,#0a0818)', boxShadow:'0 20px 60px rgba(0,0,0,0.7)', padding:22, textAlign:'center' }}>
        <div style={{ fontFamily:'var(--f-title)', fontSize:18.5, fontWeight:900, color:'var(--gold-hi)', letterSpacing:2, marginBottom:14 }}>🎰 MACHINE À SOUS</div>

        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:16 }}>
          {reels.map((s, i) => (
            <div key={i} style={{ width:78, height:78, borderRadius:12, background:'#050310', border:'2px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:41.2 }}>
              {s.icon}
            </div>
          ))}
        </div>

        {!done ? (
          <button onClick={spin} disabled={spinning} className="btn-primary" style={{ width:'100%', padding:12, fontSize:15.5, opacity: spinning ? 0.6 : 1 }}>
            {spinning ? 'ROTATION…' : 'LANCER'}
          </button>
        ) : (
          <>
            <div style={{ minHeight:44, marginBottom:12 }}>
              {result ? (
                result.malusDivide ? (
                  <div style={{ color:'#f87171', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14.4 }}>
                    💀💀💀 {result.label} : DPS ÷{result.malusDivide} pendant 10 min !
                  </div>
                ) : result.bankrupt ? (
                  <div style={{ color:'#f87171', fontFamily:'var(--f-ui)', fontWeight:900, fontSize:15.5 }}>
                    🪦🪦🪦 {result.label} !<br />
                    <span style={{ fontSize:12.4, fontWeight:700, opacity:0.85 }}>Tous tes Pixel-Coins sont partis en fumée…</span>
                  </div>
                ) : (
                  <div style={{ color:'var(--green)', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14.4 }}>
                    {result.icon} {result.label} !{' '}
                    {result.coinMult ? `+${formatNumber(lockedCoins)}🪙 ` : ''}
                    {result.gems ? `+${result.gems}💎 ` : ''}
                    {result.crowns ? `+${result.crowns}👑` : ''}
                  </div>
                )
              ) : (
                <div style={{ color:'var(--text-dim)', fontFamily:'var(--f-ui)', fontSize:13.4 }}>Pas d’alignement… pas de chance !</div>
              )}
            </div>
            <button onClick={handleManualClose} className="btn-secondary" style={{ width:'100%', padding:11, fontSize:14.4 }}>FERMER</button>
          </>
        )}
      </div>
    </div>
  );
}
