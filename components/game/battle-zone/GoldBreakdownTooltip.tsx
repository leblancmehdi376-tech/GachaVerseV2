'use client';
import type { ReactNode } from 'react';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { bnMul, type BigNum } from '@/lib/game/bignum';
import type { GoldGainBreakdown } from '@/store/gameStoreHelpers';
import { BreakdownPopup, Row, mul } from './DpsBreakdownTooltip';

interface GoldTipData { b: GoldGainBreakdown; baseReward: BigNum }

function GoldContent({ b, baseReward }: GoldTipData) {
  const bonus = (mult: number) => (mult >= 1 ? '#4ade80' : '#f87171');
  // Tout en multiplicateurs (×), comme la carte du coffre d'or : les bonus
  // se multiplient entre eux, le total se lit donc directement.
  const sources: { key: string; label: string; mult: number }[] = [
    { key: 'tit', label: 'Titres débloqués', mult: b.titleMult },
    { key: 'pre', label: 'Prestige', mult: b.prestigeMult },
    { key: 'ano', label: 'Anomalies', mult: b.anomalyMult },
    { key: 'ult', label: 'Ultimes actifs', mult: b.ultMult },
    { key: 'bst', label: 'Boost Or (boutique)', mult: b.boostMult },
  ].filter(x => x.mult !== 1);
  const hasBonus = b.chestLevel > 0 || sources.length > 0;

  return (
    <div className="dps-tip dps-tip--gold">
      <div className="dps-tip__title">🪙 D&apos;OÙ VIENNENT TES GOLDS</div>

      <div className="dps-tip__section">
        <Row label="Butin de base de l'ennemi" value={`${formatNumber(baseReward)} 🪙`} color="var(--gold)" />
      </div>

      {hasBonus ? (
        <div className="dps-tip__section">
          {b.chestLevel > 0 && (
            <Row sub label={`Coffre d'or (niv. ${b.chestLevel})`} value={`×${formatNumber(b.chestMult)}`} color="#4ade80" />
          )}
          {sources.map(x => <Row key={x.key} sub label={x.label} value={mul(x.mult)} color={bonus(x.mult)} />)}
        </div>
      ) : (
        <div className="dps-tip__empty">Aucun bonus d&apos;or actif : améliore le coffre d&apos;or !</div>
      )}

      <div className="dps-tip__subtotal">
        <span>Multiplicateur total</span>
        <span>×{formatNumber(b.total)}</span>
      </div>

      <div className="dps-tip__total">
        <span>PAR ENNEMI</span>
        <span>{formatNumber(bnMul(baseReward, b.total))} 🪙</span>
      </div>
    </div>
  );
}

const readGold = (): GoldTipData => {
  const s = useGameStore.getState();
  return { b: s.getGoldBreakdown(), baseReward: s.currentEnemy.pixelCoinsReward };
};
const renderGold = (d: GoldTipData) => <GoldContent {...d} />;

/**
 * Enveloppe le butin de l'ennemi : au survol, détaille chaque source de bonus
 * d'or (voir getGoldGainBreakdown, même calcul que l'or réellement crédité).
 */
export function GoldBreakdownTooltip({ children }: { children: ReactNode }) {
  return <BreakdownPopup read={readGold} render={renderGold}>{children}</BreakdownPopup>;
}
