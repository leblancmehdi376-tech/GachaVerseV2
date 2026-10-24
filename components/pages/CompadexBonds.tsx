'use client';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getCharacterById } from '@/lib/game/characters';
import { BONDS, BOND_DUO_BONUS, BOND_TRIO_BONUS, computeActiveBonds, countDiscoveredBonds, type BondDef } from '@/lib/game/bonds';
import type { OwnedCharacter } from '@/types/game';

// Onglet Liens du Compadex : liens légendaires découverts (membres, bonus,
// texte). Ceux qui restent cachés ne montrent que leur taille (duo ou trio) :
// aucun indice sur leurs membres — voir lib/game/bonds.ts.
function BondCard({ bond, discovered, active, collection }: {
  bond: BondDef; discovered: boolean; active: boolean; collection: Record<string, OwnedCharacter>;
}) {
  return (
    <div className={`bond-card${discovered ? '' : ' is-locked'}${active ? ' is-active' : ''}`}>
      <div className="bond-card__head">
        <span className="bond-card__icon" aria-hidden>{discovered ? bond.icon : '❔'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bond-card__name">{discovered ? bond.name : 'Lien inconnu'}</div>
          <div className="bond-card__meta">{bond.members.length === 2 ? 'Duo' : 'Trio'} · +{bond.dpsBonus} % de DPS par membre</div>
        </div>
        {active && <span className="bond-card__badge">ACTIF</span>}
      </div>
      {discovered ? (
        <>
          <div className="bond-card__members">
            {bond.members.map(id => {
              const tpl = getCharacterById(id);
              if (!tpl) return null;
              const owned = collection[id];
              return (
                <div key={id} className="bond-card__member">
                  <CharacterCardThumb templateId={id} formIndex={owned?.currentForm ?? 0} name={tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={64} height={88} frameOverlay />
                  <span>{tpl.name}</span>
                </div>
              );
            })}
          </div>
          <div className="bond-card__lore">« {bond.lore} »</div>
        </>
      ) : (
        <div className="bond-card__members" aria-label={`${bond.members.length} personnages à trouver`}>
          {bond.members.map((_, i) => <div key={i} className="bond-card__unknown" aria-hidden>?</div>)}
        </div>
      )}
    </div>
  );
}

export function CompadexBonds() {
  const { discoveredBonds, equippedTeam, collection } = useGameStore(useShallow(s => ({
    discoveredBonds: s.discoveredBonds,
    equippedTeam: s.equippedTeam,
    collection: s.collection,
  })));
  const discovered = discoveredBonds ?? {};
  const activeIds = new Set(computeActiveBonds(equippedTeam).map(b => b.id));
  const count = countDiscoveredBonds(discovered);

  return (
    <>
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderColor: 'rgba(244,114,182,0.35)' }}>
        <span style={{ fontSize: 28, flexShrink: 0 }} aria-hidden>🔗</span>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: '#f9a8d4', letterSpacing: 1 }}>
            {count} / {BONDS.length} LIENS DÉCOUVERTS
          </div>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 2 }}>
            Réunis tous les membres d&apos;un lien dans ton équipe pour le découvrir. Tant qu&apos;ils combattent ensemble,
            chacun gagne un bonus de DPS : <b>+{BOND_DUO_BONUS} %</b> pour un duo, <b>+{BOND_TRIO_BONUS} %</b> pour un trio.
          </div>
        </div>
      </div>

      <div className="bond-grid">
        {BONDS.map(b => (
          <BondCard key={b.id} bond={b} discovered={!!discovered[b.id]} active={activeIds.has(b.id)} collection={collection} />
        ))}
      </div>
    </>
  );
}
