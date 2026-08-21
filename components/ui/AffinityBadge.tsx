'use client';
import { Affinity, AFFINITY_CONFIG } from '@/lib/game/affinities';

/** Badge de type (affinité) : icône + libellé, teinté à la couleur du type. */
export function AffinityBadge({ affinity, size = 'md' }: { affinity: Affinity; size?: 'sm' | 'md' }) {
  const c = AFFINITY_CONFIG[affinity];
  const sm = size === 'sm';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: sm ? 4 : 5,
        padding: sm ? '2px 8px' : '3px 10px',
        borderRadius: 999,
        fontFamily: 'var(--f-ui)', fontWeight: 800,
        fontSize: sm ? 9.3 : 10.3, letterSpacing: 0.5,
        color: c.color,
        background: `${c.color}18`,
        border: `1px solid ${c.color}55`,
        boxShadow: `0 0 10px ${c.color}33`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: sm ? 10.3 : 12.4, lineHeight: 1 }}>{c.icon}</span>
      {c.label.toUpperCase()}
    </span>
  );
}
