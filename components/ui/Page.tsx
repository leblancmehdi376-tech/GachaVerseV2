'use client';
import { ReactNode } from 'react';

/** Conteneur de page standardisé : scroll + padding + largeur max centrée. */
export function PageScroll({ children }: { children: ReactNode }) {
  return (
    <div className="page-scroll">
      <div className="page-inner">{children}</div>
    </div>
  );
}

/** En-tête de section unifié : barre d'accent + sur-titre + titre (+ slot droite). */
export function SectionHeader({
  eyebrow,
  title,
  accent = 'var(--purple-glow)',
  right,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  right?: ReactNode;
}) {
  return (
    // flexWrap : sur téléphone, le slot droit passe sous le titre plutôt que
    // de l'écraser (ou de sortir de l'écran).
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
      <div className="sec-head" style={{ ['--sec-accent' as string]: accent }}>
        <div className="sec-head__bar" />
        <div>
          {eyebrow && <div className="sec-head__eyebrow">{eyebrow}</div>}
          <div className="sec-head__title" style={{ color: accent }}>{title}</div>
        </div>
      </div>
      {right && <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}
