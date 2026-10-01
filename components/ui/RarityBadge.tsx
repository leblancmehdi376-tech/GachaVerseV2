import { Rarity, RARITY_CONFIG } from '@/types/game';

export function RarityBadge({ rarity, size = 'sm' }: { rarity: Rarity; size?: 'xs' | 'sm' }) {
  const cfg = RARITY_CONFIG[rarity];
  const fs = size === 'xs' ? '9px' : '10px';
  return (
    <span style={{
      fontFamily: 'var(--f-ui)', fontSize: fs, fontWeight: 700,
      padding: size === 'xs' ? '1px 6px' : '2px 8px',
      color: cfg.color, border: `1px solid ${cfg.color}66`,
      boxShadow: `0 0 8px ${cfg.glow}33`,
      background: `${cfg.color}15`,
      borderRadius: '4px', whiteSpace: 'nowrap', letterSpacing: '0.5px',
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}
