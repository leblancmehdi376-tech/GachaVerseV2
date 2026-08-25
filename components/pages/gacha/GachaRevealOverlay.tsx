'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getCharacterById } from '@/lib/game/characters';
import { REVEAL_TEASER_MS } from '@/lib/game/gachaReveal';
import { InvocationPortal } from './InvocationPortal';
import { PrimordialRevealScreen } from './PrimordialRevealScreen';
import { FlipCard } from './FlipCard';
import { PullSummary } from './PullSummary';
import { TEASED_RARITY, type Res } from './gachaTypes';

// Gacha reveal overlay — main orchestrator
export function GachaRevealOverlay({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const [phase, setPhase]         = useState<'portal' | 'cards' | 'summary'>('portal');
  const [autoFlip, setAutoFlip]   = useState(false);
  const [allFlipped, setAllFlipped] = useState(false);

  // File d'attente des écrans "brouillard" Primordial/Transcendant : une seule
  // instance à l'écran à la fois, les cartes en attente patientent leur tour.
  const [activeTeaser, setActiveTeaser] = useState<{ index: number; res: Res } | null>(null);
  const teaserQueueRef  = useRef<{ index: number; res: Res; resolve: () => void }[]>([]);
  const teasedRef       = useRef<Set<number>>(new Set());
  const activeTeaserRef = useRef<{ index: number; res: Res; resolve: () => void } | null>(null);

  const processTeaserQueue = useCallback(() => {
    if (activeTeaserRef.current) return;
    const next = teaserQueueRef.current.shift();
    if (!next) return;
    activeTeaserRef.current = next;
    setActiveTeaser(next);
  }, []);

  const requestReveal = useCallback((index: number, res: Res) => {
    if (teasedRef.current.has(index)) return Promise.resolve();
    return new Promise<void>(resolve => {
      teaserQueueRef.current.push({ index, res, resolve });
      processTeaserQueue();
    });
  }, [processTeaserQueue]);

  const handleTeaserDone = useCallback(() => {
    const current = activeTeaserRef.current;
    if (current) {
      teasedRef.current.add(current.index);
      activeTeaserRef.current = null;
      current.resolve();
    }
    setActiveTeaser(null);
    processTeaserQueue();
  }, [processTeaserQueue]);

  const handlePortalDone = useCallback(() => {
    setPhase('cards');
    // Début du flip auto séquentiel après 300ms
    setTimeout(() => setAutoFlip(true), 300);
  }, []);

  // Quand toutes les cartes sont retournées → montrer résumé
  const totalCards = results.length;
  const teasedCount = results.filter(r => {
    const tpl = getCharacterById(r.templateId);
    return tpl && TEASED_RARITY.includes(tpl.rarity);
  }).length;
  useEffect(() => {
    if (!autoFlip) return;
    // Délai total = dernière carte + animation flip + écrans brouillard éventuels
    const lastDelay = (totalCards - 1) * 120 + 900 + teasedCount * REVEAL_TEASER_MS;
    const t = setTimeout(() => setAllFlipped(true), lastDelay);
    return () => clearTimeout(t);
  }, [autoFlip, totalCards, teasedCount]);

  return (
    <div
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(2,1,10,0.96)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:32,
      }}
    >
      {/* Fond animé */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 50% 50%, rgba(109,40,217,0.08) 0%, transparent 65%)',
      }} />

      {/* ── PHASE : PORTAIL ── */}
      {phase === 'portal' && (
        <InvocationPortal onDone={handlePortalDone} />
      )}

      {/* ── ÉCRAN BROUILLARD (Primordial/Transcendant) ── */}
      {activeTeaser && (
        <PrimordialRevealScreen res={activeTeaser.res} onDone={handleTeaserDone} />
      )}

      {/* ── PHASE : CARTES ── */}
      {phase === 'cards' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28, padding:'0 24px', width:'100%', maxWidth:1100 }}>

          {/* Titre */}
          <div style={{
            fontFamily:'var(--f-title)', fontSize:13.4, color:'var(--purple-glow)',
            letterSpacing:4, fontWeight:700, opacity:0.7,
            animation:'gvFadeUp 0.4s ease',
          }}>
            {results.length === 1 ? '✦ TIRAGE UNIQUE' : `✦ INVOCATION ×${results.length}`}
          </div>

          {/* Cartes (scrollable for large pulls) */}
          <div style={{ width:'100%', maxWidth:1100 }}>
            <div style={{
              maxHeight: results.length > 30 ? '62vh' : '48vh',
              overflowY: results.length > 5 ? 'auto' : 'visible',
              padding: results.length > 5 ? '12px' : 0,
              display: 'flex', justifyContent: 'center',
            }}>
              <div style={{
                display:'flex', flexWrap:'wrap', gap:results.length > 5 ? 10 : 14,
                justifyContent:'center', alignItems:'flex-start',
              }}>
                {results.map((res, i) => {
                  const tpl = getCharacterById(res.templateId);
                  const isTeased = tpl ? TEASED_RARITY.includes(tpl.rarity) : false;
                  return (
                    <FlipCard
                      key={i}
                      res={res}
                      index={i}
                      total={results.length}
                      autoFlip={autoFlip}
                      delay={i * 120}
                      preReveal={isTeased ? () => requestReveal(i, res) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display:'flex', gap:12, animation:'gvFadeUp 0.4s ease 0.3s both' }}>
            {!autoFlip && (
              <button onClick={() => setAutoFlip(true)}
                style={{
                  fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4, letterSpacing:1,
                  color:'#c084fc', background:'rgba(168,85,247,0.12)',
                  border:'1px solid rgba(168,85,247,0.4)', borderRadius:8,
                  padding:'11px 28px', cursor:'pointer',
                }}>✦ RÉVÉLER TOUT</button>
            )}
            {allFlipped && (
              <button onClick={() => setPhase('summary')}
                className="btn-primary"
                style={{ padding:'11px 28px', fontSize:13.4, letterSpacing:1 }}>
                VOIR LE RÉSUMÉ →
              </button>
            )}
            <button onClick={onClose}
              style={{
                fontFamily:'var(--f-ui)', fontWeight:700, fontSize:13.4,
                color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)', borderRadius:8,
                padding:'11px 24px', cursor:'pointer',
              }}>FERMER ✕</button>
          </div>
        </div>
      )}

      {/* ── PHASE : RÉSUMÉ ── */}
      {phase === 'summary' && (
        <PullSummary results={results} onClose={onClose} />
      )}

      <style>{`
        @keyframes gvCardIn {
          from { opacity:0; transform:translateY(60px) scale(0.85) rotate(-3deg); }
          to   { opacity:1; transform:translateY(0)    scale(1)    rotate(0deg);  }
        }
        @keyframes gvFadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes gvGlowPulse {
          0%,100% { opacity:0.6; }
          50%     { opacity:1; }
        }
        @keyframes gvUltraPulse {
          0%,100% { box-shadow: 0 0 0 2px var(--c), 0 0 50px var(--g), 0 0 100px var(--g44); }
          50%     { box-shadow: 0 0 0 3px var(--c), 0 0 80px var(--g), 0 0 160px var(--g44); }
        }
      `}</style>
    </div>
  );
}
