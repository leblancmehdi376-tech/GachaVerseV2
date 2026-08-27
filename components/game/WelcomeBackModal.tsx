'use client';
import type { OfflineGain } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { BN_ZERO, bnMulScalar } from '@/lib/game/bignum';

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  if (m > 0) return `${m}min`;
  return `${sec}s`;
}

export function WelcomeBackModal({ gain, onClose }: { gain: OfflineGain; onClose: () => void }) {
  const row = (label: string, value: string, color = 'var(--text)') => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--f-num)', fontSize: 13.4, fontWeight: 700, color }}>{value}</span>
    </div>
  );

  return (
    // Aucune animation, aucun filtre : simple fenêtre centrée.
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(3,2,8,0.88)',
      }}
    >
      <div
        style={{
          width: 'min(360px, 100%)',
          borderRadius: 14,
          border: '1px solid var(--border-lit)',
          background: '#0f0c20',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          padding: '20px 22px',
        }}
      >
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 16.5, fontWeight: 800, letterSpacing: 1.5, color: 'var(--purple-glow)', marginBottom: 4 }}>
          🌙 GAINS HORS-LIGNE
        </div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-sub)', marginBottom: 16 }}>
          Absent pendant {fmtDuration(gain.rawSeconds)}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20.6 }}>🪙</span>
          <span style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 28.8, color: 'var(--gold-hi)', lineHeight: 1 }}>
            +{formatNumber(gain.coins)}
          </span>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-dim)' }}>Pixel-Coins</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16.5 }}>💎</span>
          <span style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 20.6, color: 'var(--cyan-hi)', lineHeight: 1 }}>
            +{formatNumber(gain.gems)}
          </span>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-dim)' }}>Neko-Gemmes</span>
        </div>

        {row('Monstres vaincus', formatNumber(gain.kills))}
        {row('Durée créditée', fmtDuration(gain.seconds))}
        {row('Revenu / heure', formatNumber(gain.seconds > 0 ? bnMulScalar(gain.coins, 3600 / gain.seconds) : BN_ZERO), 'var(--green)')}
        {gain.capped && row('Plafond', 'atteint — améliore-le 👑', 'var(--gold-hi)')}

        <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: 11, fontSize: 14.4, marginTop: 18 }}>
          RÉCUPÉRER
        </button>
      </div>
    </div>
  );
}
