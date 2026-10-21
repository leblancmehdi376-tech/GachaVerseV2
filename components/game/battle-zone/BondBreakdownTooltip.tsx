'use client';
import type { ReactNode } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById } from '@/lib/game/characters';
import { computeActiveBonds, type BondDef } from '@/lib/game/bonds';
import { BreakdownPopup } from './DpsBreakdownTooltip';

function BondContent({ bonds }: { bonds: BondDef[] }) {
  return (
    <div className="dps-tip dps-tip--bond">
      <div className="dps-tip__title">🔗 LIENS LÉGENDAIRES ACTIFS</div>
      <div className="dps-tip__section">
        {bonds.map(b => (
          <div key={b.id} className="dps-tip__char">
            <div className="dps-tip__row">
              <span className="dps-tip__label" style={{ color: '#f9a8d4' }}><span>{b.icon}</span>{b.name}</span>
              <span className="dps-tip__value" style={{ color: '#4ade80' }}>+{b.dpsBonus} %</span>
            </div>
            <div className="syn-tip__members">{b.members.map(id => getCharacterById(id)?.name ?? id).join(', ')}</div>
          </div>
        ))}
      </div>
      <div className="dps-tip__note syn-tip__note">
        Chaque membre d&apos;un lien gagne ce bonus de DPS tant qu&apos;ils sont tous dans l&apos;équipe. Retrouve tous les liens dans l&apos;onglet <b>Liens</b> du Compadex.
      </div>
    </div>
  );
}

const readBonds = () => computeActiveBonds(useGameStore.getState().equippedTeam);
const renderBonds = (bonds: BondDef[]) => <BondContent bonds={bonds} />;

/** Enveloppe les badges de liens : au survol (ou à l'appui), détail des liens actifs. */
export function BondBreakdownTooltip({ children }: { children: ReactNode }) {
  return <BreakdownPopup read={readBonds} render={renderBonds}>{children}</BreakdownPopup>;
}
