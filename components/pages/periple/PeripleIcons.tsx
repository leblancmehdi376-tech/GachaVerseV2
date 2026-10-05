'use client';
import { useId, type ReactElement } from 'react';
import type { PeripleRewardKind, Medal } from '@/lib/game/periple';
import { MEDAL_INFO } from '@/lib/game/periple';

// Icônes vectorielles de l'événement (récompenses, médailles, runes…),
// dessinées sur une grille 48×48 avec dégradés et contour sombre, dans le
// style « objets brillants » des jeux mobiles.

const OUTLINE = '#1b1037';

type Draw = (id: string) => ReactElement;

const ICONS: Record<PeripleRewardKind, Draw> = {
  gems: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cffafe" /><stop offset=".5" stopColor="#22d3ee" /><stop offset="1" stopColor="#0e7490" /></linearGradient>
      </defs>
      <path d="M14 8h20l9 11-19 23L5 19z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M5 19h38M14 8l6 11 4 23M34 8l-6 11-4 23M20 19h8" fill="none" stroke="#0e7490" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 11l3 6H9z" fill="#fff" opacity=".75" />
    </>
  ),
  tokens: id => (
    <>
      <defs>
        <radialGradient id={`${id}g`} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff7d6" /><stop offset=".45" stopColor="#fbbf24" /><stop offset="1" stopColor="#b45309" /></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="14" fill="none" stroke="#92400e" strokeWidth="1.8" strokeDasharray="2.4 2.4" />
      {/* Rose des vents : l'emblème du Périple */}
      <path d="M24 12l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#fff8e1" stroke="#92400e" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2.2" fill="#b45309" />
    </>
  ),
  dice: id => (
    <>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#e9e3ff" /></linearGradient>
      </defs>
      <path d="M24 5l17 9v20L24 43 7 34V14z" fill="#c4b5fd" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 5l17 9-17 9-17-9z" fill={`url(#${id}t)`} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M7 14l17 9v20" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 23l17-9v20L24 43z" fill="#a78bfa" />
      <ellipse cx="24" cy="14" rx="3" ry="1.7" fill="#7c3aed" />
      <circle cx="12" cy="21" r="2" fill="#6d28d9" /><circle cx="19" cy="31" r="2" fill="#6d28d9" />
      <circle cx="29" cy="27" r="2" fill="#fff" /><circle cx="36" cy="23" r="2" fill="#fff" /><circle cx="29" cy="36" r="2" fill="#fff" /><circle cx="36" cy="32" r="2" fill="#fff" />
    </>
  ),
  pulls: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#c2410c" /></linearGradient>
      </defs>
      <g transform="rotate(-12 24 24)">
        <path d="M5 14h38v6a4 4 0 0 0 0 8v6H5v-6a4 4 0 0 0 0-8z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M14 15v18" stroke="#92400e" strokeWidth="1.8" strokeDasharray="2.5 2.5" />
        <path d="M29 17l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="#fff" stroke="#b45309" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </>
  ),
  crowns: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef08a" /><stop offset=".6" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" /></linearGradient>
      </defs>
      <path d="M6 16l9 8 9-13 9 13 9-8-4 22H10z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="10" y="35" width="28" height="6" rx="2" fill="#d97706" stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="24" cy="27" r="3.2" fill="#ef4444" stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="15" cy="30" r="2.2" fill="#3b82f6" /><circle cx="33" cy="30" r="2.2" fill="#3b82f6" />
      <circle cx="6" cy="16" r="2.6" fill="#fde68a" stroke={OUTLINE} strokeWidth="1.5" /><circle cx="24" cy="10" r="2.6" fill="#fde68a" stroke={OUTLINE} strokeWidth="1.5" /><circle cx="42" cy="16" r="2.6" fill="#fde68a" stroke={OUTLINE} strokeWidth="1.5" />
    </>
  ),
  orbs: id => (
    <>
      <defs>
        <radialGradient id={`${id}g`} cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#f5d0fe" /><stop offset=".35" stopColor="#7c3aed" /><stop offset="1" stopColor="#1e0b3d" /></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M14 26c3-8 13-10 19-4-6-2-12 1-13 7s6 9 11 6c-6 6-19 1-17-9z" fill="#c084fc" opacity=".8" />
      <ellipse cx="18" cy="15" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-30 18 15)" />
    </>
  ),
  anomaly: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdf4ff" /><stop offset=".4" stopColor="#e879f9" /><stop offset="1" stopColor="#86198f" /></linearGradient>
      </defs>
      <path d="M24 3l9 13-3 11 8 7-14 11-14-11 8-7-3-11z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 3v42M15 16l9 4 9-4M18 27l6 4 6-4" fill="none" stroke="#a21caf" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 9l4-4 2 7z" fill="#fff" opacity=".8" />
      <circle cx="8" cy="12" r="1.8" fill="#f0abfc" /><circle cx="41" cy="20" r="1.5" fill="#f0abfc" /><circle cx="40" cy="40" r="1.8" fill="#f0abfc" />
    </>
  ),
  chestRare: id => <Chest id={id} body="#2563eb" light="#93c5fd" gem="#22d3ee" />,
  chestEpic: id => <Chest id={id} body="#7e22ce" light="#d8b4fe" gem="#f472b6" />,
  boost: id => (
    <>
      <defs>
        <radialGradient id={`${id}g`} cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#fed7aa" /><stop offset=".5" stopColor="#f97316" /><stop offset="1" stopColor="#9a3412" /></radialGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M27 7L14 27h9l-3 14 14-21h-9z" fill="#fef9c3" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
    </>
  ),
  gold: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6a26b" /><stop offset="1" stopColor="#7c4a1e" /></linearGradient>
      </defs>
      <path d="M17 15c-9 6-12 14-10 21 2 6 9 8 17 8s15-2 17-8c2-7-1-15-10-21z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 9h16l-4 6H20z" fill="#b07a45" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17 15h14" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="31" r="7" fill="#fbbf24" stroke="#92400e" strokeWidth="1.8" />
      <path d="M24 26v10M21.5 28.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4" fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  title: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef08a" /><stop offset="1" stopColor="#ca8a04" /></linearGradient>
      </defs>
      <path d="M12 30l-4 14 7-3 4 6 4-13z" fill="#a855f7" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 30l4 14-7-3-4 6-4-13z" fill="#7c3aed" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="24" cy="21" r="16" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="24" cy="21" r="11" fill="#7c3aed" stroke="#fef3c7" strokeWidth="2" />
      <path d="M24 12l2.6 6 6.4.6-4.9 4.2 1.5 6.3-5.6-3.4-5.6 3.4 1.5-6.3-4.9-4.2 6.4-.6z" fill="#fde047" />
    </>
  ),
  points: id => (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7ad" /><stop offset=".55" stopColor="#facc15" /><stop offset="1" stopColor="#ca8a04" /></linearGradient>
      </defs>
      <path d="M24 4l6 13 14 1.6-10.5 9.6 3 14L24 35l-12.5 7.2 3-14L4 18.6 18 17z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M19 15l5-7 2 8z" fill="#fff" opacity=".7" />
    </>
  ),
};

function Chest({ id, body, light, gem }: { id: string; body: string; light: string; gem: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={body} /></linearGradient>
      </defs>
      <path d="M6 20c0-8 6-12 18-12s18 4 18 12z" fill={`url(#${id}g)`} stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="6" y="20" width="36" height="20" rx="3" fill={body} stroke={OUTLINE} strokeWidth="2.5" />
      <path d="M6 26h36" stroke={OUTLINE} strokeWidth="2" />
      <path d="M12 9v31M36 9v31" stroke="#fbbf24" strokeWidth="3.5" />
      <rect x="19" y="21" width="10" height="11" rx="2" fill="#fbbf24" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="24" cy="26" r="2.4" fill={gem} />
      <ellipse cx="17" cy="13" rx="5" ry="2" fill="#fff" opacity=".45" />
    </>
  );
}

export function RewardIcon({ kind, size = 32 }: { kind: PeripleRewardKind; size?: number }) {
  const id = `pri${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0, overflow: 'visible', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.35))' }}>
      {ICONS[kind](id)}
    </svg>
  );
}

export function MedalIcon({ medal, size = 72 }: { medal: Medal; size?: number }) {
  const id = `pm${useId().replace(/:/g, '')}`;
  const m = MEDAL_INFO[medal];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <defs>
        <radialGradient id={id} cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".4" stopColor={m.color} /><stop offset="1" stopColor={m.dark} /></radialGradient>
      </defs>
      {medal > 0 && <>
        <path d="M20 4h10l6 18H26z" fill="#7c3aed" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M44 4H34l-6 18h10z" fill="#3b82f6" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      </>}
      <circle cx="32" cy="38" r="20" fill={`url(#${id})`} stroke={OUTLINE} strokeWidth="3" />
      <circle cx="32" cy="38" r="14" fill="none" stroke={m.dark} strokeWidth="2" />
      {medal === 0
        ? <path d="M25 31l14 14M39 31L25 45" stroke={m.dark} strokeWidth="4" strokeLinecap="round" />
        : <path d="M32 27l3.3 7 7.6.9-5.6 5.2 1.5 7.5L32 43.9l-6.8 3.7 1.5-7.5-5.6-5.2 7.6-.9z" fill="#fff" stroke={m.dark} strokeWidth="1.5" strokeLinejoin="round" />}
    </svg>
  );
}
