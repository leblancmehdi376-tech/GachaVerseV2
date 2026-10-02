import { Rarity, RARITY_CONFIG } from '@/types/game';

export function RarityBadge({ rarity, size = 'sm' }: { rarity: Rarity; size?: 'xs' | 'sm' }) {
  const cfg = RARITY_CONFIG[rarity];
  return (
    <span style={{
      fontFamily: 'var(--f-ui)', fontSize: '14px', fontWeight: 700, lineHeight: 1.25,
      padding: size === 'xs' ? '1px 6px' : '2px 8px',
      color: cfg.color, border: `1px solid ${cfg.color}66`,
      boxShadow: `0 0 8px ${cfg.glow}33`,
      background: `${cfg.color}15`,
      borderRadius: '4px', whiteSpace: 'nowrap', letterSpacing: '0.3px',
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}
