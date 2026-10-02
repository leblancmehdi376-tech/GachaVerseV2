'use client';
import { getPalierConfig } from '@/lib/game/paliers';
import { formatNumber } from '@/lib/game/format';
import { bnIsZero, type BigNum } from '@/lib/game/bignum';

interface Props {
  palier: number;         // le NOUVEAU palier débloqué
  gemsEarned: number;
  coinsEarned: BigNum;
  onClose: () => void;
}

export function BossVictoryScreen({ palier, gemsEarned, coinsEarned, onClose }: Props) {
  const cfg  = getPalierConfig(palier);
  const prev = getPalierConfig(palier - 1);

  // On n'affiche que les récompenses réellement gagnées (pas de "+0").
  const rewards = [
    { icon: '💎', label: 'Neko-Gemmes', value: `+${gemsEarned}`, color: 'var(--cyan-hi)', show: gemsEarned > 0 },
    { icon: '🪙', label: 'Pixel-Coins', value: `+${formatNumber(coinsEarned)}`, color: 'var(--gold)', show: !bnIsZero(coinsEarned) },
    { icon: '👑', label: 'Couronne',    value: '+1', color: '#fbbf24', show: true },
  ].filter(r => r.show);

  return (
    // Fenêtre simple et statique : aucune phase, aucun timer, aucune animation.
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(3,2,8,0.88)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(380px, 100%)',
          borderRadius: 14,
          border: '1px solid var(--border-lit)',
          background: '#0f0c20',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          padding: '22px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 2, color: cfg.accentColor, marginBottom: 8 }}>
          ✦ BOSS VAINCU ✦
        </div>

        <div style={{ fontFamily: 'var(--f-title)', fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1.1 }}>
          PALIER {palier - 1}
        </div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', marginTop: 4, marginBottom: 18 }}>
          {prev.name} — terminé
        </div>

        {/* Récompenses */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          {rewards.map(r => (
            <div key={r.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px' }}>
              <div style={{ fontSize: 20, lineHeight: 1, marginBottom: 5 }}>{r.icon}</div>
              <div style={{ fontFamily: 'var(--f-num)', fontWeight: 800, fontSize: 18, color: r.color, lineHeight: 1 }}>{r.value}</div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', marginTop: 3 }}>{r.label}</div>
            </div>
          ))}
        </div>

        {/* Prochain monde */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, background: `${cfg.accentColor}12`, border: `1px solid ${cfg.accentColor}44`, marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>Prochain monde :</span>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: cfg.accentColor, letterSpacing: 0.5 }}>{cfg.name}</span>
        </div>

        <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: 11, fontSize: 16 }}>
          CONTINUER
        </button>
      </div>
    </div>
  );
}
