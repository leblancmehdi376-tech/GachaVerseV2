'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PageScroll } from '@/components/ui/Page';
import { RARITY_CONFIG, RARITY_ORDER_ASC } from '@/types/game';
import {
  Anomaly, ANOMALY_BONUS_DEFS, ANOMALY_RARITY_TABLE, ANOMALY_RARITY_ORDER_DESC,
  ANOMALY_MAX_SLOTS, AnomalyBonusType,
} from '@/lib/game/anomalies';
import { AFFINITY_CONFIG, Affinity } from '@/lib/game/affinities';
import { SYNERGIES_LIST } from '@/lib/game/synergies';
import { formatNumber } from '@/lib/game/format';

export function targetLabel(a: Anomaly): string | null {
  if (!a.target) return null;
  if (a.bonusType === 'typeDamage') {
    const cfg = AFFINITY_CONFIG[a.target as Affinity];
    return cfg ? `${cfg.icon} ${cfg.label}` : a.target;
  }
  if (a.bonusType === 'synergyBoost') {
    const syn = SYNERGIES_LIST.find(s => s.universe === a.target);
    return syn ? `${syn.icon} ${syn.universe}` : a.target;
  }
  return null;
}

export function formatBonusRange(type: AnomalyBonusType, [min, max]: [number, number]): string {
  const decimals = type === 'globalDps' ? 2 : type === 'gachaCostReduction' || type === 'upgradeCostReduction' ? 1 : 0;
  if (min === max) return `+${min.toFixed(decimals)}%`;
  return `+${min.toFixed(decimals)}% – +${max.toFixed(decimals)}%`;
}

function AnomalyCard({ anomaly, onToggleLock }: { anomaly: Anomaly; onToggleLock: () => void }) {
  const cfg = RARITY_CONFIG[anomaly.rarity];
  const def = ANOMALY_BONUS_DEFS[anomaly.bonusType];
  const target = targetLabel(anomaly);
  const decimals = anomaly.bonusType === 'globalDps' ? 2 : 1;
  return (
    <div style={{
      position: 'relative', borderRadius: 12, padding: '16px 16px 14px',
      background: `${cfg.color}0d`, border: `1px solid ${cfg.color}66`,
      boxShadow: `0 0 18px ${cfg.glow}22, inset 0 1px 0 rgba(255,255,255,0.04)`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--f-ui)', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
        <button onClick={onToggleLock}
          title={anomaly.locked ? 'Déverrouiller' : 'Verrouiller (protège du prochain reroll)'}
          style={{ background: anomaly.locked ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${anomaly.locked ? '#fbbf24' : 'var(--border)'}`, borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
          {anomaly.locked ? '🔒' : '🔓'}
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20.6 }}>{def.icon}</span>
        <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12.4, color: 'var(--text)' }}>{def.label}</span>
      </div>
      {target && <div style={{ fontFamily: 'var(--f-ui)', fontSize: 11.5, color: 'var(--text-dim)' }}>Cible : {target}</div>}
      <div style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 20.6, color: cfg.color }}>
        +{anomaly.value.toFixed(decimals)}%
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div style={{ borderRadius: 12, padding: '16px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 118, color: 'var(--text-muted)', fontFamily: 'var(--f-ui)', fontSize: 12.4 }}>
      Emplacement vide
    </div>
  );
}

function RarityTable() {
  const bonusTypes = Object.keys(ANOMALY_BONUS_DEFS) as AnomalyBonusType[];
  return (
    <div style={{ overflowX: 'auto', minWidth: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontFamily: 'var(--f-ui)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>RARETÉ</th>
            <th style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--f-ui)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1 }}>TAUX</th>
            {bonusTypes.map(t => (
              <th key={t} style={{ textAlign: 'right', padding: '8px 10px', fontFamily: 'var(--f-ui)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                {ANOMALY_BONUS_DEFS[t].icon} {ANOMALY_BONUS_DEFS[t].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ANOMALY_RARITY_ORDER_DESC.map(r => {
            const row = ANOMALY_RARITY_TABLE[r];
            const cfg = RARITY_CONFIG[r];
            return (
              <tr key={r} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: cfg.color }}>{cfg.label}</span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--f-num)', fontSize: 12, color: 'var(--text-sub)' }}>
                  {row.dropRate}%
                </td>
                {bonusTypes.map(t => (
                  <td key={t} style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--f-num)', fontSize: 12, color: cfg.color, whiteSpace: 'nowrap' }}>
                    {formatBonusRange(t, row.ranges[t])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AnomaliePage() {
  const {
    anomalyTokens, ownedAnomalies, anomalySlots, prestigeLevel, bossCrowns,
    getAnomalyRerollCost, rerollAnomalies, toggleAnomalyLock, getAnomalySlotCost, buyAnomalySlot,
  } = useGameStore();
  const [showTable, setShowTable] = useState(false);

  const lockedCount = ownedAnomalies.filter(a => a.locked).length;
  const rerollCost = getAnomalyRerollCost();
  const canReroll = anomalyTokens >= rerollCost;
  const slotCost = getAnomalySlotCost();
  const slotsMaxed = anomalySlots >= ANOMALY_MAX_SLOTS;

  const slots = Array.from({ length: anomalySlots }, (_, i) => ownedAnomalies[i] ?? null);

  return (
    <>
      <style>{`
        .anomaly-page {
          width: min(100%, 1200px);
          box-sizing: border-box;
        }

        .anomaly-page *,
        .anomaly-page *::before,
        .anomaly-page *::after {
          box-sizing: border-box;
        }

        .anomaly-header > div:first-child {
          min-width: 0;
        }

        .anomaly-header button,
        .anomaly-slots-header button,
        .anomaly-extension button {
          min-height: 40px;
        }

        .anomaly-grid {
          width: 100%;
        }

        .anomaly-table-panel {
          width: 100%;
          min-width: 0;
        }

        @media (max-width: 700px) {
          .anomaly-page {
            gap: 16px !important;
          }

          .anomaly-header {
            padding: 16px !important;
            align-items: flex-start !important;
            gap: 14px !important;
          }

          .anomaly-header > div:first-child {
            width: 100%;
          }

          .anomaly-header > div:last-child {
            width: 100%;
            text-align: left;
          }

          .anomaly-slots-header {
            align-items: stretch !important;
            flex-direction: column;
            gap: 10px;
          }

          .anomaly-slots-header button {
            width: 100%;
            padding: 10px 12px !important;
            line-height: 1.35;
          }

          .anomaly-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .anomaly-grid > * {
            min-width: 0;
          }

          .anomaly-grid > div {
            padding: 12px !important;
          }

          .anomaly-extension {
            padding: 14px !important;
          }

          .anomaly-extension > div:last-child {
            align-items: stretch !important;
          }

          .anomaly-extension button {
            width: 100%;
          }

          .anomaly-table-panel > button {
            padding: 13px 14px !important;
            gap: 10px;
            text-align: left;
          }

          .anomaly-table-panel > button > span:first-child {
            min-width: 0;
            line-height: 1.35;
          }

          .anomaly-table-panel > button > span:last-child {
            flex: 0 0 auto;
          }

          .anomaly-table-panel > div {
            padding: 0 10px 12px !important;
          }

          .anomaly-table-panel table {
            min-width: 760px !important;
          }
        }

        @media (max-width: 430px) {
          .anomaly-grid {
            grid-template-columns: 1fr !important;
          }

          .anomaly-header {
            padding: 14px !important;
          }

          .anomaly-header span {
            letter-spacing: 2px !important;
          }

          .anomaly-table-panel > button {
            align-items: flex-start !important;
          }

          .anomaly-table-panel > button > span:last-child {
            font-size: 11px !important;
          }
        }
      `}</style>
      <PageScroll>
      {/* maxWidth élargi à 1200 (plutôt que 980) pour que le tableau des raretés
          déplié (8 colonnes, ~1100px de contenu) tienne directement dedans —
          sans ça, le déplier forçait ponctuellement toute la page à s'élargir
          (voir minWidth:0 ci-dessous et sur RarityTable pour le filet de
          sécurité si un écran plus étroit ne suffit toujours pas : le tableau
          scrolle alors dans SA PROPRE boîte au lieu d'élargir la page). */}
      <div className="anomaly-page" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>

        {/* Header */}
        <div className="panel panel--glow anomaly-header" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#e879f9,#9333ea)', borderRadius: 2, boxShadow: '0 0 8px #c084fc' }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 18.5, fontWeight: 700, color: '#e879f9', letterSpacing: 3 }}>🌀 ANOMALIES</span>
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-dim)', maxWidth: 520, lineHeight: 1.6 }}>
              Bonus passifs PERMANENTS — jamais réinitialisés par le Prestige. Gagne 1 Jeton d&apos;Anomalie tous les 100 tirages gacha. Verrouille une anomalie pour la protéger du prochain tirage (chaque verrou double le coût du reroll).
            </div>
          </div>
          <div style={{ fontFamily: 'var(--f-num)', fontSize: 14.4, fontWeight: 700, color: '#e879f9', flexShrink: 0 }}>🌀 {formatNumber(anomalyTokens)}</div>
        </div>

        {/* Emplacements */}
        <div>
          <div className="anomaly-slots-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: 'var(--text-dim)', letterSpacing: 2 }}>
              EMPLACEMENTS ({anomalySlots}/{ANOMALY_MAX_SLOTS})
            </div>
            <button onClick={rerollAnomalies} disabled={!canReroll} className={canReroll ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '10px 18px', fontSize: 12.4, cursor: canReroll ? 'pointer' : 'not-allowed', opacity: canReroll ? 1 : 0.5 }}>
              🌀 TIRER — {rerollCost} jeton{rerollCost > 1 ? 's' : ''} {lockedCount > 0 ? `(${lockedCount} verrouillée${lockedCount > 1 ? 's' : ''})` : ''}
            </button>
          </div>
          <div className="anomaly-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {slots.map((a, i) => a
              ? <AnomalyCard key={a.id} anomaly={a} onToggleLock={() => toggleAnomalyLock(a.id)} />
              : <EmptySlot key={`empty_${i}`} />
            )}
          </div>
        </div>

        {/* Extension d'emplacements (Boss Crowns, post-Prestige) */}
        <div className="panel anomaly-extension" style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: 'var(--text-dim)', letterSpacing: 2, marginBottom: 10 }}>EXTENSION D&apos;EMPLACEMENTS</div>
          {prestigeLevel < 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontFamily: 'var(--f-ui)', fontSize: 12.4 }}>
              <span style={{ fontSize: 20.6 }}>🔒</span> Débloqué après ton premier Prestige.
            </div>
          ) : slotsMaxed ? (
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--green)' }}>✓ Nombre maximum d&apos;emplacements atteint.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-sub)' }}>
                Emplacement suivant ({anomalySlots + 1}/{ANOMALY_MAX_SLOTS})
              </div>
              <button onClick={buyAnomalySlot} disabled={slotCost === null || bossCrowns < slotCost}
                className={slotCost !== null && bossCrowns >= slotCost ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '10px 18px', fontSize: 12.4, cursor: slotCost !== null && bossCrowns >= slotCost ? 'pointer' : 'not-allowed', opacity: slotCost !== null && bossCrowns >= slotCost ? 1 : 0.5 }}>
                👑 {slotCost !== null ? formatNumber(slotCost) : '—'}
              </button>
            </div>
          )}
        </div>

        {/* Tableau récapitulatif */}
        <div className="panel anomaly-table-panel" style={{ overflow: 'hidden' }}>
          <button onClick={() => setShowTable(!showTable)}
            style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4, color: 'var(--text-sub)', letterSpacing: 1 }}>
            <span>{showTable ? '▲' : '▼'} TABLEAU DES RARETÉS & BONUS</span>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: '#c084fc', fontWeight: 700 }}>{RARITY_ORDER_ASC.length} paliers</span>
          </button>
          {showTable && (
            <div style={{ padding: '0 18px 18px' }}>
              <RarityTable />
            </div>
          )}
        </div>

      </div>
      </PageScroll>
    </>
  );
}
