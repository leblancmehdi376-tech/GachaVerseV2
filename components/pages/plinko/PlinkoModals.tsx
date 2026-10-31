'use client';
import { Modal, LootView } from '@/components/pages/periple/PeripleModals';
import {
  PLINKO_UPGRADES, PLINKO_SLOTS, PLINKO_BOOSTERS, PLINKO_REWARD_ICON, formatPlinkoReward, plinkoOdds, plinkoBoosterSize, plinkoDailyBalls,
  plinkoUpgradeLevel, nextPlinkoUpgradeCost, type PlinkoUpgrade, type PlinkoUpgradeId, type PlinkoUpgradeLevels,
} from '@/lib/game/plinko';
import type { PlinkoDropResult } from '@/store/slices/plinkoSlice';

const GOLD_SLOT = PLINKO_SLOTS.findIndex(s => s.reward.kind === 'goldBooster');
const BOOSTER_SLOT = PLINKO_SLOTS.findIndex(s => s.reward.kind === 'booster');

export const formatOdds = (p: number) => `${(p * 100).toLocaleString('fr-FR', { maximumFractionDigits: p < 0.01 ? 2 : 1 })} %`;

/** Effet d'une amélioration à un niveau donné, en clair. */
export function upgradeEffect(u: PlinkoUpgrade, level: number): string {
  const levels: PlinkoUpgradeLevels = { [u.id]: level };
  if (u.id === 'luck') {
    const odds = plinkoOdds(levels);
    return `Booster doré ${formatOdds(odds[GOLD_SLOT])} · classique ${formatOdds(odds[BOOSTER_SLOT])}`;
  }
  if (u.id === 'balls') return `${plinkoDailyBalls(levels)} billes par jour`;
  if (u.id === 'gain') return `+${Math.round(level * u.perLevel * 100)} % de gemmes, couronnes et jetons`;
  return `${plinkoBoosterSize('booster', levels)} cartes par booster`;
}

export function UpgradeLevelBar({ level, max }: { level: number; max: number }) {
  return (
    <div className="plk-pips" aria-label={`Niveau ${level} sur ${max}`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < level ? 'is-on' : ''} />)}
    </div>
  );
}

export function PlinkoShopModal({ tokens, levels, active, onBuy, onClose }: {
  tokens: number;
  levels: PlinkoUpgradeLevels;
  active: boolean;
  onBuy: (id: PlinkoUpgradeId) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="pp-modal-title">Boutique Plinko</div>
      <div className="pp-modal-text" style={{ textAlign: 'center' }}>
        Solde : <b style={{ color: '#fde68a' }}>🪙 {tokens}</b> · améliorations actives jusqu&apos;à la fin de l&apos;événement
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {PLINKO_UPGRADES.map(u => {
          const level = plinkoUpgradeLevel(levels, u.id);
          const cost = nextPlinkoUpgradeCost(levels, u.id);
          return (
            <div key={u.id} className="plk-upgrade">
              <div className="plk-upgrade__icon" aria-hidden>{u.icon}</div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="plk-upgrade__name">{u.name} <span>Niv. {level}/{u.costs.length}</span></div>
                <UpgradeLevelBar level={level} max={u.costs.length} />
                <div className="plk-upgrade__desc">Actuel : {upgradeEffect(u, level)}</div>
                {cost !== null && <div className="plk-upgrade__desc" style={{ color: '#86efac' }}>Suivant : {upgradeEffect(u, level + 1)}</div>}
              </div>
              <button className="pp-btn pp-btn--green pp-btn--small" disabled={!active || cost === null || tokens < cost} onClick={() => onBuy(u.id)}>
                {cost === null ? 'MAX' : <>🪙 {cost}</>}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function PlinkoRewardModal({ result, onClose }: { result: PlinkoDropResult; onClose: () => void }) {
  const kind = result.reward.kind;
  const gold = kind === 'goldBooster';
  const title = kind === 'booster' || gold ? PLINKO_BOOSTERS[kind].name : formatPlinkoReward(result.reward);
  return (
    <Modal onClose={onClose} wide={result.pulls.length > 3}>
      <div style={{ textAlign: 'center', paddingTop: 6 }}>
        <div className={`pp-burst pp-loop${gold ? ' plk-burst--gold' : ''}`} style={{ ['--accent' as string]: gold ? '#fbbf24' : '#a855f7' }}>
          <span style={{ fontSize: 56, lineHeight: 1 }}>{PLINKO_REWARD_ICON[kind]}</span>
        </div>
        <div className="pp-modal-title">{gold ? '✨ JACKPOT ✨' : title}</div>
        {gold && <div className="pp-modal-text">{title} : une carte Primordiale ou mieux garantie !</div>}
        {kind === 'booster' && <div className="pp-modal-text">Une carte Stellaire ou mieux garantie.</div>}
        <div style={{ marginTop: 14 }}><LootView loot={{ rewards: [], pulls: result.pulls, equipment: result.equipment }} /></div>
        <button className="pp-btn pp-btn--green pp-loop" style={{ marginTop: 18, minWidth: 180 }} onClick={onClose}>CONTINUER</button>
      </div>
    </Modal>
  );
}
