'use client';
import { useEffect, useRef } from 'react';
import { formatNumber } from '@/lib/game/format';
import { bnIsZero } from '@/lib/game/bignum';
import { getEquipmentDef, getItemDef } from '@/lib/game/items';
import { RAID_BOSSES } from '@/lib/game/raidBoss';
import type { SleepRecap } from '@/lib/ui/sleepRecap';
import { fmtDuration } from '@/components/game/WelcomeBackModal';

// Le clic qui réveille le jeu (useAutoSleep) ne doit pas fermer le récap
// aussitôt affiché, s'il tombe par hasard sur le bouton.
const CLOSE_GUARD_MS = 500;

export function SleepRecapModal({ recap, onClose }: { recap: SleepRecap; onClose: () => void }) {
  const openedAt = useRef(0);
  useEffect(() => { openedAt.current = Date.now(); }, []);
  const close = () => { if (Date.now() - openedAt.current >= CLOSE_GUARD_MS) onClose(); };

  const row = (label: string, value: string, color = 'var(--text)') => (
    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', minWidth: 0 }}>{label}</span>
      <span style={{ fontFamily: 'var(--f-num)', fontSize: 16, fontWeight: 700, color, textAlign: 'right', overflowWrap: 'anywhere' }}>{value}</span>
    </div>
  );
  const drop = (key: string, icon: string, name: string, color: string, qty: number) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: 18 }} aria-hidden>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--f-ui)', fontSize: 14, color }}>{name}</span>
      <span style={{ fontFamily: 'var(--f-num)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>×{formatNumber(qty)}</span>
    </div>
  );

  const raidBoss = recap.raid ? RAID_BOSSES.find(b => b.id === recap.raid!.bossId) : undefined;
  const drops = [
    ...recap.items.map(e => {
      const def = getItemDef(e.id);
      return drop(`i:${e.id}`, def?.icon ?? '📦', def?.name ?? e.id, def?.color ?? 'var(--text)', e.qty);
    }),
    ...recap.equipment.map(e => {
      const def = getEquipmentDef(e.id);
      return drop(`e:${e.id}`, def?.icon ?? '🛡️', def?.name ?? e.id, def?.color ?? 'var(--text)', e.qty);
    }),
  ];

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Récap de la veille"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(3,2,8,0.88)',
      }}
    >
      <div
        style={{
          width: 'min(400px, 100%)', maxHeight: '100%',
          display: 'flex', flexDirection: 'column',
          borderRadius: 14,
          border: '1px solid var(--border-lit)',
          background: '#0f0c20',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          padding: '20px 20px 16px',
        }}
      >
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, fontWeight: 800, letterSpacing: 2, color: '#c4b5fd', marginBottom: 4 }}>
          💤 PENDANT TA VEILLE
        </div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', marginBottom: 14 }}>
          En veille pendant {fmtDuration(recap.seconds)}
        </div>

        <div style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
          {!bnIsZero(recap.coins) && (
            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }} aria-hidden>🪙</span>
              <span style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 30, color: 'var(--gold-hi)', lineHeight: 1 }}>+{formatNumber(recap.coins)}</span>
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>Pixel-Coins</span>
            </div>
          )}
          {recap.gems > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }} aria-hidden>💎</span>
              <span style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 22, color: 'var(--cyan-hi)', lineHeight: 1 }}>+{formatNumber(recap.gems)}</span>
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>Neko-Gemmes</span>
            </div>
          )}

          {recap.kills > 0 && row('Monstres vaincus', formatNumber(recap.kills))}
          {recap.bossKills > 0 && row('Boss vaincus', formatNumber(recap.bossKills), 'var(--red, #f87171)')}
          {recap.palierTo !== recap.palierFrom && row('Palier', `${recap.palierFrom} → ${recap.palierTo}`)}
          {recap.newMaxPalier && row('Nouveau record', `Palier ${recap.newMaxPalier} 🏆`, 'var(--gold-hi)')}
          {recap.crowns > 0 && row('Couronnes de boss', `+${formatNumber(recap.crowns)} 👑`, 'var(--gold-hi)')}
          {recap.orbs > 0 && row('Orbes du Néant', `+${formatNumber(recap.orbs)} 🔮`, '#c4b5fd')}
          {recap.raid && row(`Raid : ${raidBoss?.name ?? 'boss'}`, `${formatNumber(recap.raid.kills)} vaincu${recap.raid.kills > 1 ? 's' : ''}`, raidBoss?.accentColor ?? 'var(--text)')}

          {drops.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'var(--text-sub)', padding: '10px 0 8px', borderTop: '1px solid var(--border)' }}>
                Objets obtenus
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{drops}</div>
            </>
          )}
        </div>

        <button onClick={close} className="btn-primary" style={{ width: '100%', minHeight: 44, padding: 11, fontSize: 16, marginTop: 16 }}>
          SUPER !
        </button>
      </div>
    </div>
  );
}
