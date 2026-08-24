'use client';
import { useEffect, useState, useRef } from 'react';

interface Props {
  onComplete: () => void;
  // Si false, l'écran termine son animation normalement mais reste affiché
  // (bloqué à 100%/"Prêt") au lieu d'enchaîner sur le fade-out + onComplete —
  // utile pour attendre une condition externe (ex: chargement cloud) qui peut
  // dépasser la durée de l'animation, sans laisser un écran invisible monté
  // (React réconcilie la même instance plutôt que de la démonter).
  ready?: boolean;
}

const LOGO_CHARS = 'GACHAVERSE'.split('');
const DURATION_MS = 2800;

export function SplashScreen({ onComplete, ready = true }: Props) {
  const [progress, setProgress]       = useState(0);
  const [phase, setPhase]             = useState<'loading' | 'done'>('loading');
  const [charVisible, setCharVisible] = useState<boolean[]>(Array(LOGO_CHARS.length).fill(false));
  const [subtitleIn, setSubtitleIn]   = useState(false);
  const [fadeOut, setFadeOut]         = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef   = useRef<number>(0);

  // Reveal logo letters one by one
  useEffect(() => {
    LOGO_CHARS.forEach((_, i) => {
      setTimeout(() => {
        setCharVisible(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 200 + i * 85);
    });
    setTimeout(() => setSubtitleIn(true), 200 + LOGO_CHARS.length * 85 + 100);
  }, []);

  // Progress bar
  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min(elapsed / DURATION_MS, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(Math.round(eased * 100));
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('done');
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Fade out then call onComplete — attend `ready` si l'animation se termine
  // avant que la condition externe ne soit remplie (reste affiché à 100%).
  useEffect(() => {
    if (phase !== 'done' || !ready) return;
    const t1 = setTimeout(() => setFadeOut(true),   120);
    const t2 = setTimeout(() => onComplete(),        620);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, ready, onComplete]);

  const LOADING_STEPS = [
    { label: 'Initialisation des univers',       threshold: 20 },
    { label: 'Chargement des champions',          threshold: 45 },
    { label: 'Synchronisation du multivers',      threshold: 70 },
    { label: 'Connexion aux serveurs',            threshold: 88 },
    { label: 'Prêt',                              threshold: 100 },
  ];
  const currentStep = LOADING_STEPS.slice().reverse().find(s => progress >= s.threshold)?.label ?? LOADING_STEPS[0].label;

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
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 49.4,
            fontWeight: 900,
            letterSpacing: 6,
            background: 'linear-gradient(135deg, #e879f9 0%, #c084fc 35%, #9333ea 65%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            opacity: charVisible[i] ? 1 : 0,
            transform: charVisible[i] ? 'translateY(0) scale(1)' : 'translateY(18px) scale(0.85)',
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
          }}>{ch}</span>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 13.4,
        fontWeight: 700,
        letterSpacing: 6,
        color: 'rgba(192,132,252,0.45)',
        marginBottom: 64,
        opacity: subtitleIn ? 1 : 0,
        transform: subtitleIn ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        IDLE · GACHA · MULTIVERS
      </div>

      {/* Progress zone */}
      <div style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>

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
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #5b21b6, #9333ea, #c084fc)',
            boxShadow: '0 0 12px rgba(147,51,234,0.8)',
            borderRadius: 4,
            transition: 'width 0.08s linear',
          }} />
        </div>

        {/* Step label + percentage */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
          }}>
            {currentStep}
          </span>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(192,132,252,0.6)',
          }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Version tag */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 12,
        fontWeight: 400,
        color: 'rgba(255,255,255,0.1)',
        letterSpacing: 2,
      }}>
        v1.0.0 · GACHAVERSE
      </div>

    </div>
  );
}
