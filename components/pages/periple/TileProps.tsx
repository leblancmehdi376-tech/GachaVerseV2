'use client';
import type { ReactElement } from 'react';
import type { TileKind } from '@/lib/game/periple';

// Objets posés sur les cases du plateau. Repère local : (0, 0) = point de
// contact au sol, y négatif vers le haut ; ~40 unités de haut. Les dégradés
// référencés (#pp-prop-*) sont déclarés une seule fois dans PropDefs.

const O = '#1b1037';   // contour

export function PropDefs() {
  return (
    <>
      <linearGradient id="pp-prop-metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f8fafc" /><stop offset=".5" stopColor="#cbd5e1" /><stop offset="1" stopColor="#64748b" /></linearGradient>
      <linearGradient id="pp-prop-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef08a" /><stop offset="1" stopColor="#b45309" /></linearGradient>
      <linearGradient id="pp-prop-qtop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5d0fe" /><stop offset="1" stopColor="#c084fc" /></linearGradient>
      <radialGradient id="pp-prop-glass" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset=".5" stopColor="#a5f3fc" stopOpacity=".55" /><stop offset="1" stopColor="#0e7490" stopOpacity=".7" /></radialGradient>
      <radialGradient id="pp-prop-swirl" cx=".5" cy=".5" r=".55"><stop offset="0" stopColor="#ecfdf5" /><stop offset=".45" stopColor="#34d399" /><stop offset="1" stopColor="#065f46" /></radialGradient>
      <linearGradient id="pp-prop-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#dc2626" /><stop offset=".45" stopColor="#f97316" /><stop offset=".8" stopColor="#fde047" /><stop offset="1" stopColor="#fffbeb" /></linearGradient>
      <linearGradient id="pp-prop-prism" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef08a" /><stop offset=".3" stopColor="#f472b6" /><stop offset=".6" stopColor="#a78bfa" /><stop offset="1" stopColor="#22d3ee" /></linearGradient>
      <radialGradient id="pp-prop-holo" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#e0f2fe" stopOpacity=".9" /><stop offset="1" stopColor="#38bdf8" stopOpacity="0" /></radialGradient>
    </>
  );
}

const shadow = (rx = 14) => <ellipse cx="0" cy="0" rx={rx} ry={rx * 0.42} fill="#000" opacity=".3" />;

const PROPS: Record<TileKind, () => ReactElement> = {
  // Arche de départ avec bannière à damier
  start: () => (
    <g>
      {shadow(18)}
      <rect x="-17" y="-34" width="5" height="34" rx="2" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.6" />
      <rect x="12" y="-34" width="5" height="34" rx="2" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.6" />
      <path d="M-19 -40 Q0 -50 19 -40 V-30 Q0 -40 -19 -30 Z" fill="#fff" stroke={O} strokeWidth="1.6" />
      {[-15, -7, 1, 9].map((x, i) => (
        <path key={x} d={`M${x} ${-42 - (i === 1 || i === 2 ? 2.5 : 0)}h4v5h-4z M${x + 4} ${-37 - (i === 1 || i === 2 ? 2.5 : 0)}h4v5h-4z`} fill="#1e1b4b" />
      ))}
      <circle cx="-14.5" cy="-36" r="3" fill="#fde047" stroke={O} strokeWidth="1.2" />
      <circle cx="14.5" cy="-36" r="3" fill="#fde047" stroke={O} strokeWidth="1.2" />
    </g>
  ),
  // Deux épées plantées en croix
  combat: () => (
    <g>
      {shadow(13)}
      {[-1, 1].map(d => (
        <g key={d} transform={`rotate(${d * 22} 0 -4)`}>
          <path d="M-2.6 -40 L0 -45 L2.6 -40 V-12 H-2.6 Z" fill="url(#pp-prop-metal)" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="-8" y="-13" width="16" height="3.6" rx="1.6" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.4" />
          <rect x="-2" y="-9.5" width="4" height="8" rx="1.5" fill="#7f1d1d" stroke={O} strokeWidth="1.3" />
          <circle cx="0" cy="-1" r="2.4" fill="#fde047" stroke={O} strokeWidth="1.2" />
        </g>
      ))}
    </g>
  ),
  // Bloc « ? » isométrique flottant
  chance: () => (
    <g>
      {shadow(11)}
      <g>
        <path d="M0 -44 L14 -37 L0 -30 L-14 -37 Z" fill="url(#pp-prop-qtop)" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M-14 -37 L0 -30 V-14 L-14 -21 Z" fill="#a855f7" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M14 -37 L0 -30 V-14 L14 -21 Z" fill="#7e22ce" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <text x="-7" y="-19" fontSize="13" fontWeight="900" fill="#fff" textAnchor="middle" transform="translate(-7 -21) skewY(27) translate(7 21)" style={{ fontFamily: 'var(--f-game)' }}>?</text>
        <text x="7" y="-19" fontSize="13" fontWeight="900" fill="#f5d0fe" textAnchor="middle" transform="translate(7 -21) skewY(-27) translate(-7 21)" style={{ fontFamily: 'var(--f-game)' }}>?</text>
        <circle cx="-11" cy="-35.5" r="1.3" fill="#fff" /><circle cx="11" cy="-35.5" r="1.3" fill="#fff" />
      </g>
    </g>
  ),
  // Machine à capsules
  gacha: () => (
    <g>
      {shadow(14)}
      <path d="M-11 0 L-13 -16 H13 L11 0 Z" fill="#e11d48" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="-4" y="-11" width="8" height="5" rx="1.5" fill="#1e1b4b" />
      <circle cx="8" cy="-8" r="2.4" fill="#fde047" stroke={O} strokeWidth="1.2" />
      <rect x="-14" y="-19" width="28" height="4" rx="2" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.4" />
      <circle cx="0" cy="-31" r="13" fill="url(#pp-prop-glass)" stroke={O} strokeWidth="1.6" />
      <circle cx="-5" cy="-25" r="3.6" fill="#f472b6" stroke={O} strokeWidth="1" />
      <circle cx="3" cy="-24" r="3.6" fill="#facc15" stroke={O} strokeWidth="1" />
      <circle cx="-1" cy="-31" r="3.6" fill="#60a5fa" stroke={O} strokeWidth="1" />
      <circle cx="6" cy="-31" r="3.2" fill="#4ade80" stroke={O} strokeWidth="1" />
      <ellipse cx="-5" cy="-37" rx="4" ry="2.4" fill="#fff" opacity=".8" transform="rotate(-30 -5 -37)" />
      <rect x="-3" y="-47" width="6" height="4" rx="1.5" fill="#e11d48" stroke={O} strokeWidth="1.3" />
    </g>
  ),
  // Portail runique vers un autre monde
  isekai: () => (
    <g>
      {shadow(15)}
      <ellipse cx="0" cy="-22" rx="11" ry="17" fill="url(#pp-prop-swirl)" />
      <path d="M-15 0 V-22 A15 21 0 0 1 15 -22 V0 H10 V-22 A10 15 0 0 0 -10 -22 V0 Z" fill="#78716c" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-13 -30 l3 2 M13 -30 l-3 2 M0 -42 v3" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="0" cy="-41" r="2.6" fill="#34d399" stroke={O} strokeWidth="1.2" />
      <path d="M-3 -24 q3 -6 6 0 q-3 5 -6 0" fill="none" stroke="#ecfdf5" strokeWidth="1.4" />
    </g>
  ),
  // Brasier de l'arène
  action: () => (
    <g>
      {shadow(12)}
      <path d="M-5 0 L-3 -14 H3 L5 0 Z" fill="#57534e" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-13 -16 Q0 -10 13 -16 L10 -10 Q0 -6 -10 -10 Z" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <g>
        <path d="M0 -46 C6 -38 13 -32 10 -23 C8 -17 3 -15 0 -15 C-3 -15 -9 -17 -10 -23 C-12 -30 -6 -33 -5 -40 C-2 -35 -1 -33 0 -30 C1 -36 -1 -40 0 -46 Z" fill="url(#pp-prop-flame)" stroke="#9a3412" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M0 -30 C3 -26 5 -23 3 -19 C2 -17 -2 -17 -3 -19 C-4 -22 -2 -25 0 -30 Z" fill="#fffbeb" />
      </g>
    </g>
  ),
  // Antenne holographique
  scifi: () => (
    <g>
      {shadow(12)}
      <path d="M-9 0 L-6 -8 H6 L9 0 Z" fill="#334155" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="-2" y="-30" width="4" height="23" fill="url(#pp-prop-metal)" stroke={O} strokeWidth="1.3" />
      <path d="M-12 -37 Q0 -28 12 -37 Q0 -32 -12 -37 Z" fill="#e2e8f0" stroke={O} strokeWidth="1.4" />
      <path d="M0 -33 V-44" stroke={O} strokeWidth="1.5" />
      <circle cx="0" cy="-45" r="2.6" fill="#38bdf8" stroke={O} strokeWidth="1.2" />
      <ellipse cx="0" cy="-20" rx="14" ry="5" fill="none" stroke="#7dd3fc" strokeWidth="1.6" />
      <circle cx="0" cy="-45" r="7" fill="url(#pp-prop-holo)" />
    </g>
  ),
  // Case spéciale : étoile prismatique sur un piédestal doré
  hunt: () => (
    <g>
      {shadow(17)}
      <path d="M-13 0 L-10 -9 H10 L13 0 Z" fill="url(#pp-prop-gold)" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="-7" y="-15" width="14" height="7" rx="1.5" fill="#7e22ce" stroke={O} strokeWidth="1.4" />
      <circle cx="0" cy="-36" r="17" fill="#f9a8d4" opacity=".28" />
      <path d="M0 -55 L5.3 -42.3 L19 -41.5 L8.5 -32.7 L11.8 -19.4 L0 -26.8 L-11.8 -19.4 L-8.5 -32.7 L-19 -41.5 L-5.3 -42.3 Z"
        fill="url(#pp-prop-prism)" stroke={O} strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M0 -55 L5.3 -42.3 L0 -34 Z M-19 -41.5 L-5.3 -42.3 L0 -34 Z" fill="#fff" opacity=".45" />
      <path d="M-20 -50 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" fill="#fff" />
      <path d="M17 -55 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 z" fill="#fde68a" />
    </g>
  ),
};

export function TileProp({ kind }: { kind: TileKind }) {
  return PROPS[kind]();
}
