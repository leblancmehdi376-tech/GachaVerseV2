'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';

// ─── Roue de tirage (façon lootbox) ─────────────────────────────────────────
// Bande horizontale qui défile puis s'arrête sur l'élément gagnant, placé à
// l'index REEL_WIN_INDEX. Le résultat est déjà tiré (et appliqué) par
// l'appelant : la roue n'est qu'une mise en scène. Plusieurs bandes peuvent
// être empilées (tirage multiple) : elles s'arrêtent l'une après l'autre.
export const REEL_LENGTH = 50;
export const REEL_WIN_INDEX = 44;
const REEL_SPIN_MS = 4600;
const REEL_STAGGER_MS = 350;
const REEL_SKIP_MS = 280;
const REEL_EASING = 'cubic-bezier(0.12,0.72,0.18,1)';

const SIZES = {
  normal:  { itemWidth:130, gap:14, height:118, icon:32, pad:'14px 8px', label:10.5 },
  compact: { itemWidth:100, gap:10, height:80,  icon:24, pad:'8px 6px',  label:9.5 },
};

export interface LootReelItem {
  icon: string;
  label: string;
  color: string;
}

// Construit une bande de REEL_LENGTH éléments avec `winner` à REEL_WIN_INDEX
// et des éléments de remplissage fournis par `filler()`.
export function buildReel<T>(winner: T, filler: () => T): T[] {
  const arr: T[] = [];
  for (let i = 0; i < REEL_LENGTH; i++) arr.push(i === REEL_WIN_INDEX ? winner : filler());
  return arr;
}

function ReelStrip({ reel, spinMs, compact, skipSignal, revealed, onDone, onSkip }: {
  reel: LootReelItem[];
  spinMs: number;
  compact: boolean;
  skipSignal: number;
  revealed: boolean;
  onDone: () => void;
  onSkip: () => void;
}) {
  const size = compact ? SIZES.compact : SIZES.normal;
  const slot = size.itemWidth + size.gap;
  const [posX, setPosX] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [stopped, setStopped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const jitter = (Math.random() - 0.5) * (size.itemWidth * 0.5);
    const winnerCenter = REEL_WIN_INDEX * slot + size.itemWidth / 2;
    targetXRef.current = width / 2 - winnerCenter + jitter;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDurationMs(spinMs);
        setPosX(targetXRef.current);
      });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Accélération demandée (clic sur n'importe quelle bande). Fait directement
  // sur le DOM : via deux setState successifs, React pouvait regrouper le
  // "figer à la position courante" et le "relancer vers la cible" en un seul
  // rendu — la valeur de transform ne changeait alors pas et la transition
  // en cours (lente) continuait, rendant le clic sans effet.
  useEffect(() => {
    const el = trackRef.current;
    if (!skipSignal || stopped || skippedRef.current || !el) return;
    skippedRef.current = true;
    const currentX = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
    el.style.transition = 'none';
    el.style.transform = `translateX(${currentX}px)`;
    void el.offsetWidth; // force le recalcul pour que la nouvelle transition parte de currentX
    el.style.transition = `transform ${REEL_SKIP_MS}ms ${REEL_EASING}`;
    el.style.transform = `translateX(${targetXRef.current}px)`;
    // Aligne l'état React sur le DOM pour qu'un re-rendu ne relance pas l'animation lente.
    setDurationMs(REEL_SKIP_MS);
    setPosX(targetXRef.current);
  }, [skipSignal, stopped]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || stopped) return;
    setStopped(true);
    onDone();
  };

  return (
    <div ref={containerRef} style={{ position:'relative', overflow:'hidden', width:'100%', maxWidth:640, height:size.height, flexShrink:0 }}>
      <div style={{ position:'absolute', inset:0, left:'50%', width:2, transform:'translateX(-50%)', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', zIndex:2, boxShadow:'0 0 14px #fbbf24', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:-2, left:'50%', transform:'translateX(-50%)', zIndex:3, width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:'11px solid #fbbf24', filter:'drop-shadow(0 0 6px #fbbf24)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', zIndex:3, width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderBottom:'11px solid #fbbf24', filter:'drop-shadow(0 0 6px #fbbf24)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:0, bottom:0, left:0, width:70, background:'linear-gradient(90deg,var(--panel-bg,#0a0814) 20%,transparent)', zIndex:4, pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:0, bottom:0, right:0, width:70, background:'linear-gradient(270deg,var(--panel-bg,#0a0814) 20%,transparent)', zIndex:4, pointerEvents:'none' }} />

      <div
        ref={trackRef}
        onClick={onSkip}
        onTransitionEnd={handleTransitionEnd}
        style={{
          display:'flex', alignItems:'center', gap:size.gap, height:'100%',
          transform:`translateX(${posX}px)`,
          transition: durationMs ? `transform ${durationMs}ms ${REEL_EASING}` : 'none',
          willChange:'transform', cursor: revealed ? 'default' : 'pointer',
        }}
      >
        {reel.map((item, i) => {
          const highlight = i === REEL_WIN_INDEX && stopped;
          return (
            <div key={i} style={{
              width:size.itemWidth, flexShrink:0, borderRadius:10, textAlign:'center', padding:size.pad,
              border:`2px solid ${highlight ? item.color : item.color + '55'}`,
              background:`linear-gradient(180deg, ${item.color}22, rgba(10,8,20,0.9))`,
              boxShadow: highlight ? `0 0 ${compact ? 16 : 26}px ${item.color}` : 'none',
              transform: highlight ? 'scale(1.08)' : 'scale(1)',
              transition:'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
            }}>
              <div style={{ fontSize:size.icon }}>{item.icon}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:size.label, color:'var(--text-dim)', marginTop:compact ? 3 : 6, lineHeight:1.3 }}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LootReelPopup({ reel, reels, revealedTitle, revealed, onClose }: {
  reel?: LootReelItem[];
  reels?: LootReelItem[][];   // tirage multiple : une bande par résultat
  revealedTitle: string;
  revealed: ReactNode;
  onClose: () => void;
}) {
  const strips = reels ?? (reel ? [reel] : []);
  const compact = strips.length > 1;
  const [doneCount, setDoneCount] = useState(0);
  const [skipSignal, setSkipSignal] = useState(0);
  const isRevealed = doneCount >= strips.length;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9995, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.82)', padding:16 }}>
      <div className="panel panel--glow" style={{ width:'100%', maxWidth:680, maxHeight:'calc(100vh - 32px)', overflowY:'auto', padding:'26px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap: compact ? 8 : 14 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:2 }}>
          {isRevealed ? revealedTitle : 'TIRAGE EN COURS…'}
        </div>

        {strips.map((s, i) => (
          <ReelStrip key={i} reel={s} compact={compact}
            spinMs={REEL_SPIN_MS + i * REEL_STAGGER_MS}
            skipSignal={skipSignal} revealed={isRevealed}
            onDone={() => setDoneCount(n => n + 1)}
            onSkip={() => setSkipSignal(n => n + 1)} />
        ))}

        {!isRevealed && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.35)' }}>
            Cliquez sur {compact ? 'une bande' : 'la bande'} pour accélérer
          </div>
        )}

        {isRevealed && (
          <>
            {revealed}
            <button onClick={onClose} className="btn-primary" style={{ padding:'10px 30px', fontSize:13.4, marginTop:4 }}>FERMER</button>
          </>
        )}
      </div>
    </div>
  );
}
