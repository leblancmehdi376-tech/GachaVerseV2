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

export function RankStars({ rank }: { rank: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} style={{
          fontSize: '10.3px', lineHeight: 1,
          color: i < rank ? '#fbbf24' : 'rgba(255,255,255,0.08)',
          textShadow: i < rank ? '0 0 4px #f59e0b' : 'none',
        }}>★</span>
      ))}
    </div>
  );
}
