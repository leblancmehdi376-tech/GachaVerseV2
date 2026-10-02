'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getCharacterById } from '@/lib/game/characters';
import { InvocationPortal } from './InvocationPortal';
import { PrimordialRevealScreen } from './PrimordialRevealScreen';
import { FlipCard } from './FlipCard';
import { PullSummary } from './PullSummary';
import { TEASED_RARITY, type Res } from './gachaTypes';

// Gacha reveal overlay — main orchestrator
export function GachaRevealOverlay({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const [phase, setPhase]         = useState<'portal' | 'cards' | 'summary'>('portal');
  const [autoFlip, setAutoFlip]   = useState(false);
  // Résumé demandé par le joueur : accélère le flip des cartes, puis joue un
  // par un les écrans brouillard Primordial/Transcendant restants avant
  // d'afficher le résumé.
  const [skipRequested, setSkipRequested] = useState(false);

  // File d'attente des écrans "brouillard" Primordial/Transcendant : une seule
  // instance à l'écran à la fois, les cartes en attente patientent leur tour.
  // Chaque index n'est joué qu'une fois : les demandes suivantes récupèrent
  // la même promesse (résolue à la fin de l'écran).
  const [activeTeaser, setActiveTeaser] = useState<{ index: number; res: Res } | null>(null);
  const teaserQueueRef  = useRef<{ index: number; res: Res; resolve: () => void }[]>([]);
  const teaserPromisesRef = useRef<Map<number, Promise<void>>>(new Map());
  const activeTeaserRef = useRef<{ index: number; res: Res; resolve: () => void } | null>(null);

  const processTeaserQueue = useCallback(() => {
    if (activeTeaserRef.current) return;
    const next = teaserQueueRef.current.shift();
    if (!next) return;
    activeTeaserRef.current = next;
    setActiveTeaser(next);
  }, []);

  const requestReveal = useCallback((index: number, res: Res) => {
    const existing = teaserPromisesRef.current.get(index);
    if (existing) return existing;
    const promise = new Promise<void>(resolve => {
      teaserQueueRef.current.push({ index, res, resolve });
    });
    teaserPromisesRef.current.set(index, promise);
    processTeaserQueue();
    return promise;
  }, [processTeaserQueue]);

  const handleTeaserDone = useCallback(() => {
    const current = activeTeaserRef.current;
    if (current) {
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

  // Remis à true dans l'effet : en mode strict (dev), React démonte puis
  // remonte les effets, le cleanup ne doit pas laisser le ref à false.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Le résumé n'apparaît qu'une fois TOUS les écrans brouillard joués (à la
  // suite, jamais en même temps), même si le joueur le demande avant.
  const handleSkipToSummary = useCallback(() => {
    if (skipRequested) return;
    setSkipRequested(true);
    setAutoFlip(true);
    const pending = results.flatMap((res, i) => {
      const tpl = getCharacterById(res.templateId);
      return tpl && TEASED_RARITY.includes(tpl.rarity) ? [requestReveal(i, res)] : [];
    });
    Promise.all(pending).then(() => { if (mountedRef.current) setPhase('summary'); });
  }, [skipRequested, results, requestReveal]);

  return (
    <div
      onClick={(e) => { if (phase === 'summary' && e.currentTarget === e.target) onClose(); }}
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
        <PrimordialRevealScreen key={activeTeaser.index} res={activeTeaser.res} onDone={handleTeaserDone} />
      )}

      {/* ── PHASE : CARTES ── */}
      {phase === 'cards' && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28, padding:'0 24px', width:'100%', maxWidth:1100 }}>

          {/* Titre */}
          <div style={{
            fontFamily:'var(--f-title)', fontSize:16, color:'var(--purple-glow)',
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
                      delay={skipRequested ? 0 : i * 120}
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
                  fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16, letterSpacing:1,
                  color:'#c084fc', background:'rgba(168,85,247,0.12)',
                  border:'1px solid rgba(168,85,247,0.4)', borderRadius:8,
                  padding:'11px 28px', cursor:'pointer',
                }}>✦ RÉVÉLER TOUT</button>
            )}
            <button onClick={handleSkipToSummary}
              disabled={skipRequested}
              className="btn-primary"
              style={{
                padding:'11px 28px', fontSize:16, letterSpacing:1,
                opacity: skipRequested ? 0.6 : 1,
                cursor: skipRequested ? 'default' : 'pointer',
              }}>
              {skipRequested ? 'RÉSUMÉ EN PRÉPARATION…' : 'VOIR LE RÉSUMÉ →'}
            </button>
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
