'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getEquipmentGroup, getEquipmentDef, type EquipmentDef } from '@/lib/game/items';
import {
  EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, RARITY_CONFIG, RARITY_ORDER_ASC, getNextRarity,
  type EquipmentSlot, type Rarity,
} from '@/types/game';

const UPGRADE_COST = 10;

// Objet "représentatif" d'un groupe slot+rareté pour l'affichage (icône/nom) :
// le générique s'il existe, sinon le premier objet personnalisé du groupe.
function representativeItem(slot: EquipmentSlot, rarity: Rarity): EquipmentDef | null {
  const group = getEquipmentGroup(slot, rarity);
  return group.find(item => !item.bonusFor) ?? group[0] ?? null;
}

interface GroupInfo { slot: EquipmentSlot; rarity: Rarity; qty: number }

export function EquipmentUpgradePage() {
  const { equipmentInventory, unlockedEquipRarities, upgradeEquipment } = useGameStore();
  const [selected, setSelected] = useState<{ slot: EquipmentSlot; rarity: Rarity } | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const groups: GroupInfo[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    for (const rarity of RARITY_ORDER_ASC) {
      const ids = getEquipmentGroup(slot, rarity).map(item => item.id);
      const qty = ids.reduce((sum, id) => sum + (equipmentInventory[id] ?? 0), 0);
      if (qty > 0) groups.push({ slot, rarity, qty });
    }
  }
  const totalItems = groups.reduce((sum, g) => sum + g.qty, 0);
  const upgradableGroups = groups.filter(g => g.qty >= UPGRADE_COST).length;

  const selectedGroup = selected ? groups.find(g => g.slot === selected.slot && g.rarity === selected.rarity) : null;
  const qty = selectedGroup?.qty ?? 0;
  const maxUpgrades = Math.floor(qty / UPGRADE_COST);
  const currentItem = selected ? representativeItem(selected.slot, selected.rarity) : null;
  const nextRarity = selected ? getNextRarity(selected.rarity) : null;
  const nextItem = selected && nextRarity ? representativeItem(selected.slot, nextRarity) : null;
  const isUnlocked = nextRarity ? unlockedEquipRarities.includes(nextRarity) : false;

  const select = (slot: EquipmentSlot, rarity: Rarity) => {
    setSelected({ slot, rarity });
    setLastResult(null);
  };

  const doUpgrade = (times: number) => {
    if (!selected || times < 1) return;
    let succeeded = 0;
    let lastId: string | null = null;
    let failReason: string | null = null;
    for (let i = 0; i < times; i++) {
      const res = upgradeEquipment(selected.slot, selected.rarity);
      if (!res.ok) { failReason = res.reason ?? 'Échec de la fusion'; break; }
      succeeded++;
      lastId = res.resultId ?? lastId;
    }
    if (succeeded > 0 && lastId) {
      const def = getEquipmentDef(lastId);
      setLastResult(`✦ ${succeeded} fusion${succeeded > 1 ? 's' : ''} réussie${succeeded > 1 ? 's' : ''} — dernier objet obtenu : ${def?.name ?? lastId}`);
    } else if (failReason) {
      setLastResult(failReason);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px' }}>
      <div className="companion-page__stack">
        <div className="companion-stats">
          {[
            { label: 'Objets en stock', value: String(totalItems), color: 'var(--purple-hi)' },
            { label: 'Groupes fusionnables', value: String(upgradableGroups), color: 'var(--green)' },
            { label: 'Raretés débloquées', value: `${unlockedEquipRarities.length}/${RARITY_ORDER_ASC.length}`, color: 'var(--cyan)' },
          ].map(stat => (
            <div key={stat.label} className="companion-stats__card" style={{ borderColor: `${stat.color}22` }}>
              <div className="companion-stats__label">{stat.label}</div>
              <div className="companion-stats__value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <section className="companion-section companion-panel">
          <div className="companion-section__header">
            <div className="companion-section__title companion-section__title--purple">
              <span className="companion-section__decor" />
              Fusion d’équipement
            </div>
            <div className="companion-toast">{UPGRADE_COST} objets d’une rareté → 1 objet de la rareté suivante</div>
          </div>

          <div className="companion-split">
            {/* Colonne gauche : équipement possédé, groupé par slot + rareté */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 620, overflowY: 'auto', paddingRight: 4 }}>
              {groups.map(g => {
                const cfg = RARITY_CONFIG[g.rarity];
                const item = representativeItem(g.slot, g.rarity);
                const isSelected = selected?.slot === g.slot && selected?.rarity === g.rarity;
                return (
                  <button
                    key={`${g.slot}_${g.rarity}`}
                    className="companion-item-card"
                    style={{
                      textAlign: 'left', cursor: 'pointer', width: '100%',
                      borderColor: isSelected ? cfg.color : `${cfg.color}30`,
                      background: isSelected ? `${cfg.color}22` : `${cfg.color}12`,
                    }}
                    onClick={() => select(g.slot, g.rarity)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 22.7 }}>{item?.icon ?? '❔'}</div>
                        <div>
                          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4, color: cfg.color }}>
                            {EQUIPMENT_SLOT_LABELS[g.slot]} — {cfg.label}
                          </div>
                          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
                            {Math.floor(g.qty / UPGRADE_COST)} fusion{Math.floor(g.qty / UPGRADE_COST) !== 1 ? 's' : ''} possible{Math.floor(g.qty / UPGRADE_COST) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 900, fontSize: 14.4, color: 'var(--text)' }}>×{g.qty}</div>
                    </div>
                  </button>
                );
              })}
              {groups.length === 0 && (
                <div className="companion-empty">Tu n’as pas encore d’équipement. Tue des monstres pour en obtenir.</div>
              )}
            </div>

            {/* Colonne droite : panneau de fusion pour le groupe sélectionné */}
            <div>
              {!selected && (
                <div className="companion-empty">Sélectionne un équipement à gauche pour le fusionner.</div>
              )}
              {selected && (
                <div className="companion-card-hero">
                  <div className="companion-slot-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="companion-slot-card__icon" style={{ background: `${RARITY_CONFIG[selected.rarity].color}22` }}>
                        {currentItem?.icon ?? '❔'}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14.4, color: RARITY_CONFIG[selected.rarity].color }}>
                          {EQUIPMENT_SLOT_LABELS[selected.slot]} — {RARITY_CONFIG[selected.rarity].label}
                        </div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-muted)' }}>×{qty} possédé{qty > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 26.8 }}>→</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: nextRarity && isUnlocked ? 1 : 0.45 }}>
                      <div className="companion-slot-card__icon" style={{ background: nextRarity ? `${RARITY_CONFIG[nextRarity].color}22` : 'rgba(255,255,255,0.05)' }}>
                        {nextRarity ? (isUnlocked ? (nextItem?.icon ?? '❔') : '🔒') : '—'}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14.4, color: nextRarity ? RARITY_CONFIG[nextRarity].color : 'var(--text-dim)' }}>
                          {nextRarity ? RARITY_CONFIG[nextRarity].label : 'Rareté maximale'}
                        </div>
                        {nextRarity && <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-muted)' }}>{isUnlocked ? 'Débloqué' : 'Verrouillé'}</div>}
                      </div>
                    </div>
                  </div>

                  {!nextRarity && (
                    <div className="companion-toast">Cet équipement a déjà atteint la rareté maximale.</div>
                  )}
                  {nextRarity && !isUnlocked && (
                    <div className="companion-toast">
                      🔒 Termine l’expédition « Atelier — Rareté {RARITY_CONFIG[nextRarity].label} » (onglet Expéditions) pour débloquer cette fusion.
                    </div>
                  )}
                  {nextRarity && isUnlocked && (
                    <>
                      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-muted)' }}>
                        {UPGRADE_COST} objets par fusion — {maxUpgrades} fusion{maxUpgrades !== 1 ? 's' : ''} possible{maxUpgrades !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="companion-button companion-button--primary"
                          disabled={maxUpgrades < 1}
                          style={maxUpgrades < 1 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          onClick={() => doUpgrade(1)}
                        >
                          Fusionner ×1
                        </button>
                        <button
                          className="companion-button companion-button--soft"
                          disabled={maxUpgrades < 1}
                          style={maxUpgrades < 1 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          onClick={() => doUpgrade(maxUpgrades)}
                        >
                          Fusionner ×{maxUpgrades} (max)
                        </button>
                      </div>
                    </>
                  )}
                  {lastResult && <div className="companion-toast">{lastResult}</div>}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
