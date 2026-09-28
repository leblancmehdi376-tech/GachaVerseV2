'use client';
import { useEffect, useState, useRef } from 'react';

interface Props {
  pageKey: string;       // change triggers transition
  children: React.ReactNode;
}

type Phase = 'idle' | 'out' | 'in';

export function PageTransition({ pageKey, children }: Props) {
  const [displayKey, setDisplayKey]       = useState(pageKey);
  // Snapshot de l'ancienne page, affiché pendant le fondu sortant.
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase]                 = useState<Phase>('idle');
  const prevKeyRef                        = useRef(pageKey);

  useEffect(() => {
    if (pageKey === prevKeyRef.current) return;
    prevKeyRef.current = pageKey;

    // 1. Fade out current content
    setPhase('out');

    const t1 = setTimeout(() => {
      // 2. Swap content while invisible
      setDisplayKey(pageKey);
      setDisplayChildren(children);
      setPhase('in');
    }, 160);

    const t2 = setTimeout(() => {
      setPhase('idle');
    }, 340);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  // Tant que la page affichée est la page courante, on rend les children à
  // jour ; pendant le fondu sortant (clé pas encore basculée), l'ancienne page.
  const shownChildren = displayKey === pageKey ? children : displayChildren;

  return (
    <div
      key={displayKey}
      style={{
        width: '100%',
        height: '100%',
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out'
          ? 'translateY(6px) scale(0.995)'
          : phase === 'in'
            ? 'translateY(-4px) scale(0.997)'
            : 'translateY(0) scale(1)',
        transition: phase === 'out'
          ? 'opacity 0.15s ease, transform 0.15s ease'
          : phase === 'in'
            ? 'opacity 0.22s ease, transform 0.22s cubic-bezier(0.175,0.885,0.32,1.275)'
            : 'none',
        willChange: 'opacity, transform',
      }}
    >
      {shownChildren}
    </div>
  );
}
