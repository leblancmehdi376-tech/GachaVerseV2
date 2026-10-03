'use client';
import { useEffect, useState, useRef } from 'react';
import { GAME_VERSION } from '@/lib/game/version';

interface Props {
  onComplete: () => void;
}

const LOGO_CHARS = 'GACHAVERSE'.split('');
const DURATION_MS = 2800;
const LOADING_STEPS = [
  { label: 'Initialisation des univers',       threshold: 20 },
  { label: 'Chargement des champions',          threshold: 45 },
  { label: 'Synchronisation du multivers',      threshold: 70 },
  { label: 'Connexion aux serveurs',            threshold: 88 },
  { label: 'Prêt',                              threshold: 100 },
];

export function SplashScreen({ onComplete }: Props) {
  const [step, setStep]               = useState(0);
  const [phase, setPhase]             = useState<'loading' | 'done'>('loading');
  const [fadeOut, setFadeOut]         = useState(false);
  const pctRef = useRef<HTMLSpanElement>(null);

  // Apparition des lettres du logo et du sous-titre : animations CSS
  // (splashLetterIn / splashSubIn dans globals.css) plutôt que des setTimeout,
  // pour qu'elles démarrent dès le premier affichage du HTML pré-rendu au lieu
  // d'attendre le chargement et l'hydratation du JS.

  // Progression : la barre est une animation CSS (splashBar, composée par le
  // GPU) ; le pourcentage est écrit directement dans le DOM 10 fois par
  // seconde, et l'état React ne change qu'au passage d'une étape — au lieu
  // d'un re-rendu à chaque frame pendant le chargement et l'hydratation.
  useEffect(() => {
    const start = performance.now();
    const iv = setInterval(() => {
      const pct = Math.min((performance.now() - start) / DURATION_MS, 1);
      const eased = Math.round((1 - Math.pow(1 - pct, 3)) * 100);
      if (pctRef.current) pctRef.current.textContent = `${eased}%`;
      setStep(LOADING_STEPS.filter(s => eased >= s.threshold).length);
    }, 100);
    const done = setTimeout(() => {
      clearInterval(iv);
      if (pctRef.current) pctRef.current.textContent = '100%';
      setStep(LOADING_STEPS.length);
      setPhase('done');
    }, DURATION_MS);
    return () => { clearInterval(iv); clearTimeout(done); };
  }, []);

  // Fade out then call onComplete
  useEffect(() => {
    if (phase !== 'done') return;
    const t1 = setTimeout(() => setFadeOut(true),   120);
    const t2 = setTimeout(() => onComplete(),        620);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, onComplete]);

  const currentStep = LOADING_STEPS[Math.max(0, step - 1)].label;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#030208',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? 'opacity 0.5s ease' : 'none',
      overflow: 'hidden',
    }}>

      {/* Background radial */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, rgba(109,40,217,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Corner particles (CSS only) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 15% 85%, rgba(109,40,217,0.06) 0%, transparent 40%),
          radial-gradient(circle at 85% 15%, rgba(34,211,238,0.04) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(109,40,217,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(109,40,217,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0,
        marginBottom: 18,
        filter: 'drop-shadow(0 0 32px rgba(147,51,234,0.4))',
      }}>
        {LOGO_CHARS.map((ch, i) => (
          <span key={i} style={{
            fontFamily: 'var(--f-num)',
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: 4,
            background: 'linear-gradient(135deg, #e879f9 0%, #c084fc 35%, #9333ea 65%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            animation: `splashLetterIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275) ${200 + i * 85}ms both`,
          }}>{ch}</span>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: 'var(--f-ui)',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: 4,
        color: 'rgba(192,132,252,0.45)',
        marginBottom: 64,
        animation: `splashSubIn 0.5s ease ${200 + LOGO_CHARS.length * 85 + 100}ms both`,
      }}>
        IDLE · GACHA · MULTIVERS
      </div>

      {/* Progress zone */}
      <div style={{ width: 'min(340px, calc(100vw - 32px))', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Bar track */}
        <div style={{
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{
            height: '100%',
            width: '100%',
            transformOrigin: 'left',
            background: 'linear-gradient(90deg, #5b21b6, #9333ea, #c084fc)',
            boxShadow: '0 0 12px rgba(147,51,234,0.8)',
            borderRadius: 4,
            animation: `splashBar ${DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1) both`,
          }} />
        </div>

        {/* Step label + percentage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--f-ui)',
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: 1,
          }}>
            {currentStep}
          </span>
          <span ref={pctRef} style={{
            fontFamily: 'var(--f-num)',
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(192,132,252,0.6)',
          }}>
            0%
          </span>
        </div>
      </div>

      {/* Version tag */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        fontFamily: 'var(--f-num)',
        fontSize: 14,
        fontWeight: 400,
        color: 'rgba(255,255,255,0.55)',
        letterSpacing: 2,
      }}>
        v{GAME_VERSION} · GACHAVERSE
      </div>

    </div>
  );
}
