'use client';
import { ReactNode, useEffect, useRef, useState } from 'react';

// ─── Roue de tirage (façon lootbox) ─────────────────────────────────────────
// Bande horizontale qui défile puis s'arrête sur l'élément gagnant, placé à
// l'index REEL_WIN_INDEX. Le résultat est déjà tiré (et appliqué) par
// l'appelant : la roue n'est qu'une mise en scène.
const REEL_ITEM_WIDTH = 130;
const REEL_ITEM_GAP = 14;
const REEL_SLOT = REEL_ITEM_WIDTH + REEL_ITEM_GAP;
export const REEL_LENGTH = 50;
export const REEL_WIN_INDEX = 44;
const REEL_SPIN_MS = 4600;
const REEL_SKIP_MS = 280;

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

export function LootReelPopup({ reel, revealedTitle, revealed, onClose }: {
  reel: LootReelItem[];
  revealedTitle: string;
  revealed: ReactNode;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'spinning' | 'revealed'>('spinning');
  const [posX, setPosX] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const skippedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const jitter = (Math.random() - 0.5) * (REEL_ITEM_WIDTH * 0.5);
    const winnerCenter = REEL_WIN_INDEX * REEL_SLOT + REEL_ITEM_WIDTH / 2;
    targetXRef.current = width / 2 - winnerCenter + jitter;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDurationMs(REEL_SPIN_MS);
        setPosX(targetXRef.current);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform' || phase !== 'spinning') return;
    setPhase('revealed');
  };

  const handleSkip = () => {
    if (phase !== 'spinning' || skippedRef.current || !trackRef.current) return;
    skippedRef.current = true;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(trackRef.current).transform);
    setDurationMs(0);
    setPosX(matrix.m41);
    requestAnimationFrame(() => {
      setDurationMs(REEL_SKIP_MS);
      setPosX(targetXRef.current);
    });
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9995, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.82)', padding:16 }}>
      <div className="panel panel--glow" style={{ width:'100%', maxWidth:680, padding:'26px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:2 }}>
          {phase === 'spinning' ? 'TIRAGE EN COURS…' : revealedTitle}
        </div>

        <div ref={containerRef} style={{ position:'relative', overflow:'hidden', width:'100%', maxWidth:640, height:118 }}>
          <div style={{ position:'absolute', inset:0, left:'50%', width:2, transform:'translateX(-50%)', background:'linear-gradient(180deg,#fbbf24,#f59e0b)', zIndex:2, boxShadow:'0 0 14px #fbbf24', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:-2, left:'50%', transform:'translateX(-50%)', zIndex:3, width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:'11px solid #fbbf24', filter:'drop-shadow(0 0 6px #fbbf24)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-2, left:'50%', transform:'translateX(-50%)', zIndex:3, width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderBottom:'11px solid #fbbf24', filter:'drop-shadow(0 0 6px #fbbf24)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:0, width:70, background:'linear-gradient(90deg,var(--panel-bg,#0a0814) 20%,transparent)', zIndex:4, pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:0, bottom:0, right:0, width:70, background:'linear-gradient(270deg,var(--panel-bg,#0a0814) 20%,transparent)', zIndex:4, pointerEvents:'none' }} />

          <div
            ref={trackRef}
            onClick={handleSkip}
            onTransitionEnd={handleTransitionEnd}
            style={{
              display:'flex', alignItems:'center', gap:REEL_ITEM_GAP, height:'100%',
              transform:`translateX(${posX}px)`,
              transition: durationMs ? `transform ${durationMs}ms cubic-bezier(0.12,0.72,0.18,1)` : 'none',
              willChange:'transform', cursor: phase === 'spinning' ? 'pointer' : 'default',
            }}
          >
            {reel.map((item, i) => {
              const highlight = i === REEL_WIN_INDEX && phase === 'revealed';
              return (
                <div key={i} style={{
                  width:REEL_ITEM_WIDTH, flexShrink:0, borderRadius:10, textAlign:'center', padding:'14px 8px',
                  border:`2px solid ${highlight ? item.color : item.color + '55'}`,
                  background:`linear-gradient(180deg, ${item.color}22, rgba(10,8,20,0.9))`,
                  boxShadow: highlight ? `0 0 26px ${item.color}` : 'none',
                  transform: highlight ? 'scale(1.08)' : 'scale(1)',
                  transition:'transform 0.3s, box-shadow 0.3s, border-color 0.3s',
                }}>
                  <div style={{ fontSize:32 }}>{item.icon}</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:10.5, color:'var(--text-dim)', marginTop:6, lineHeight:1.3 }}>{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {phase === 'spinning' && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:11, color:'rgba(255,255,255,0.35)' }}>Cliquez sur la bande pour accélérer</div>
        )}

        {phase === 'revealed' && (
          <>
            {revealed}
            <button onClick={onClose} className="btn-primary" style={{ padding:'10px 30px', fontSize:13.4, marginTop:4 }}>FERMER</button>
          </>
        )}
      </div>
    </div>
  );
}
