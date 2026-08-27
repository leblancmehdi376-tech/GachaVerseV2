import type { ReactElement } from 'react';

// NavIcons.tsx — icônes SVG sur-mesure pour la sidebar GachaVerse
// Toutes à viewBox="0 0 20 20", stroke-based, style "game UI"

interface IconProps {
  size?: number;
  color?: string;
}

const base = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconHome({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M3 9.5L10 3l7 6.5" />
      <path d="M5 8.5V17h4v-4h2v4h4V8.5" />
    </svg>
  );
}

export function IconSword({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M14 3l3 3-9 9-3-3z" />
      <path d="M17 3l-3 3" />
      <path d="M3 17l2-5" />
      <path d="M5 12l3 3" />
      <path d="M3 17l3-1" />
    </svg>
  );
}

export function IconPaw({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.5}>
      <ellipse cx="7" cy="5" rx="1.5" ry="2" />
      <ellipse cx="11" cy="4" rx="1.5" ry="2" />
      <ellipse cx="15" cy="6" rx="1.2" ry="1.8" />
      <ellipse cx="4.5" cy="7.5" rx="1.2" ry="1.8" />
      <path d="M10 9c-4 0-6 2.5-5 6 .5 1.5 2 2.5 3 2 .5-.2 1.2-.5 2-.5s1.5.3 2 .5c1 .5 2.5-.5 3-2 1-3.5-1-6-5-6z" />
    </svg>
  );
}

export function IconCollection({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <rect x="3" y="3" width="6" height="7" rx="1" />
      <rect x="11" y="3" width="6" height="7" rx="1" />
      <rect x="3" y="12" width="6" height="5" rx="1" />
      <rect x="11" y="12" width="6" height="5" rx="1" />
    </svg>
  );
}

export function IconDiamond({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M10 3l6 5-6 9-6-9z" />
      <path d="M4 8h12" />
      <path d="M7 3l-3 5" />
      <path d="M13 3l3 5" />
    </svg>
  );
}

export function IconShop({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M3 4h14l-1.5 6H4.5z" />
      <path d="M4.5 10v7h11v-7" />
      <path d="M8 13v4" />
      <path d="M12 13v4" />
      <path d="M3 4l-1-2" />
    </svg>
  );
}

export function IconScroll({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M6 3h9a2 2 0 010 4H5a2 2 0 000 4h9a2 2 0 010 4H6" />
      <path d="M6 3a2 2 0 000 4" />
      <path d="M6 15a2 2 0 000-4" />
    </svg>
  );
}

export function IconStar({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M10 2l2.4 5H18l-4.4 3.3 1.6 5.4L10 13l-5.2 2.7 1.6-5.4L2 7h5.6z" />
    </svg>
  );
}

export function IconPrestige({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      {/* Étoile de prestige couronnée d'un halo (renaissance / New Game+) */}
      <path d="M10 4l1.8 3.8L16 8.3l-3 2.7 0.9 4L10 13l-3.9 2 0.9-4-3-2.7 4.2-0.5z" />
      <path d="M4.5 16.5h11" strokeLinecap="round" />
      <circle cx="10" cy="2.6" r="0.9" />
    </svg>
  );
}

export function IconTrophy({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M6 3h8v6a4 4 0 01-8 0V3z" />
      <path d="M6 6H3a2 2 0 000 4h3" />
      <path d="M14 6h3a2 2 0 010 4h-3" />
      <path d="M10 13v3" />
      <path d="M7 16h6" />
    </svg>
  );
}

export function IconAchievement({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <circle cx="10" cy="8" r="5" />
      <path d="M7 13l-2 5h10l-2-5" />
      <path d="M10 5l1 2h2l-1.5 1.5.5 2L10 9.5 8 10.5l.5-2L7 7h2z" />
    </svg>
  );
}

export function IconProfile({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <circle cx="10" cy="7" r="4" />
      <path d="M3 18c0-4 3.1-7 7-7s7 3 7 7" />
    </svg>
  );
}

export function IconExpedition({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z" />
    </svg>
  );
}

export function IconForge({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M4 16l3-8 3 4 3-6 3 10" />
      <path d="M3 16h14" />
      <path d="M8 8c0-3 4-3 4 0" />
    </svg>
  );
}

export function IconMarket({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M3 17V8l7-5 7 5v9H3z" />
      <path d="M7 17v-5h6v5" />
      <path d="M10 6v2" />
      <path d="M3 8h14" />
    </svg>
  );
}

export function IconMedal({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <circle cx="10" cy="13" r="5" />
      <path d="M7 3l3 5 3-5" />
      <path d="M7 3h6" />
      <path d="M10 11v2l1.5 1" />
    </svg>
  );
}

export function IconShield({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <path d="M10 2l7 3v5c0 4.5-3 7-7 8-4-1-7-3.5-7-8V5l7-3z" />
      <path d="M7 10l2 2 4-4" />
    </svg>
  );
}

export function IconCalendar({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <rect x="3" y="4" width="14" height="13" rx="1.5" />
      <path d="M3 8h14" />
      <path d="M7 2.5v3M13 2.5v3" />
      <path d="M6.5 11h2M11.5 11h2M6.5 14h2M11.5 14h2" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" {...base} stroke={color} strokeWidth={1.6}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
    </svg>
  );
}

// Map from nav id to icon component
export const NAV_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  home:         IconHome,
  upgrades:     IconSword,
  companions:   IconPaw,
  collection:   IconCollection,
  gacha:        IconDiamond,
  shop:         IconShop,
  quests:       IconScroll,
  events:       IconStar,
  achievements: IconAchievement,
  expeditions:  IconExpedition,
  forge:        IconForge,
  equipment:    IconShield,
  prestige:     IconPrestige,
  leaderboard:  IconTrophy,
  marketplace:  IconMarket,
  champions:    IconMedal,
  profile:      IconProfile,
  settings:     IconGear,
  dailyReward:  IconCalendar,
};
