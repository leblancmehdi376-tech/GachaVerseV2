'use client';
import { memo, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useDisplaySettingsStore } from '@/store/displaySettingsStore';
import { getEquipmentGroup, getEquipmentDef, EQUIPMENT_DEFS, type EquipmentDef } from '@/lib/game/items';
import { EXPEDITION_DEFS } from '@/lib/game/expeditions';
import {
  getSlotStock, countSlotFusions, canFuseInto, simulateCascade, cascadeTargets, type RarityStock,
} from '@/lib/game/equipmentFusion';
import { EquipmentIcon } from '@/components/ui/EquipmentIcon';
import {
  EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, RARITY_CONFIG, RARITY_ORDER_ASC, getNextRarity, getEquipmentUpgradeCost,
  type EquipmentSlot, type Rarity,
} from '@/types/game';

// Objet "représentatif" d'un groupe slot+rareté pour l'affichage (icône/nom) :
// le générique s'il existe, sinon le premier objet personnalisé du groupe.
export function representativeItem(slot: EquipmentSlot, rarity: Rarity): EquipmentDef | null {
  const group = getEquipmentGroup(slot, rarity);
  return group.find(item => !item.bonusFor) ?? group[0] ?? null;
}

// Accord de "spécial" : singulier si 1 seul, "spéciaux" au pluriel.
function specialLabel(n: number): string {
  return n > 1 ? 'spéciaux' : 'spécial';
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
const formatMult = (m: number) => `×${m.toFixed(2).replace('.', ',')}`;

// Expédition « Atelier » qui débloque la fusion vers une rareté donnée.
function unlockExpeditionFor(rarity: Rarity) {
  return EXPEDITION_DEFS.find(d => d.unlocksEquipRarity === rarity) ?? null;
}

const SPECIAL_ITEMS = Object.values(EQUIPMENT_DEFS).filter(item => !!item.bonusFor);

// memo : ForgePage se re-rend aussi quand les recettes changent, l'établi n'a
// besoin de se re-rendre que pour ses propres sélecteurs.
export const EquipmentWorkbench = memo(function EquipmentWorkbench() {
  // Sélecteurs ciblés : sans eux, la page se re-rendait à chaque tick de combat.
  const equipmentInventory    = useGameStore(s => s.equipmentInventory);
  const unlockedEquipRarities = useGameStore(s => s.unlockedEquipRarities);
  const upgradeEquipment      = useGameStore(s => s.upgradeEquipment);
  const cascadeEquipment      = useGameStore(s => s.cascadeEquipment);
  const focusExpedition       = useGameStore(s => s.focusExpedition);
  const protectSpecials       = useDisplaySettingsStore(s => s.protectSpecialEquipment);
  const setProtectSpecials    = useDisplaySettingsStore(s => s.setProtectSpecialEquipment);

  const stocks = useMemo(() => {
    const out = {} as Record<EquipmentSlot, RarityStock[]>;
    for (const slot of EQUIPMENT_SLOTS) out[slot] = getSlotStock(equipmentInventory, slot, protectSpecials);
    return out;
  }, [equipmentInventory, protectSpecials]);
  const fusionsBySlot = useMemo(() => {
    const out = {} as Record<EquipmentSlot, number>;
    for (const slot of EQUIPMENT_SLOTS) out[slot] = countSlotFusions(stocks[slot], unlockedEquipRarities);
    return out;
  }, [stocks, unlockedEquipRarities]);

  // Ouvre d'emblée le premier emplacement où une fusion est possible.
  const [slot, setSlot] = useState<EquipmentSlot>(() => EQUIPMENT_SLOTS.find(s => fusionsBySlot[s] > 0) ?? EQUIPMENT_SLOTS[0]);
  const [showLocked, setShowLocked] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const targets = cascadeTargets(unlockedEquipRarities);
  const [cascadeTarget, setCascadeTarget] = useState<Rarity | null>(null);
  const target = cascadeTarget && targets.includes(cascadeTarget) ? cascadeTarget : targets[targets.length - 1] ?? null;

  const stock = stocks[slot];
  const cascadePreview = target ? simulateCascade(stock, unlockedEquipRarities, target) : [];

  const totalItems = EQUIPMENT_SLOTS.reduce((sum, s) => sum + stocks[s].reduce((n, r) => n + r.qty, 0), 0);
  const totalFusions = EQUIPMENT_SLOTS.reduce((sum, s) => sum + fusionsBySlot[s], 0);

  const pickSlot = (s: EquipmentSlot) => { setSlot(s); setLastResult(null); };

  const doUpgrade = (rarity: Rarity, times: number) => {
    const res = upgradeEquipment(slot, rarity, times, protectSpecials);
    const succeeded = res.count ?? 0;
    if (res.ok && succeeded > 0 && res.resultId) {
      const def = getEquipmentDef(res.resultId);
      setLastResult(`${plural(succeeded, 'fusion')} réussie${succeeded > 1 ? 's' : ''} — dernier objet obtenu : ${def?.name ?? res.resultId}`);
    } else {
      setLastResult(res.reason ?? 'Échec de la fusion');
    }
  };

  const doCascade = () => {
    if (!target) return;
    const steps = cascadeEquipment(slot, target, protectSpecials);
    setLastResult(steps.length === 0
      ? 'Rien à fusionner pour l’instant.'
      : `Cascade terminée : ${steps.map(s => `+${s.count} ${RARITY_CONFIG[s.to].label}`).join(' · ')}`);
  };

  // Raretés verrouillées sans aucun objet : repliées par défaut.
  const isHiddenRow = (s: RarityStock) => s.qty === 0 && !unlockedEquipRarities.includes(s.rarity);
  const hiddenCount = stock.filter(isHiddenRow).length;
  const visibleRows = showLocked ? stock : stock.filter(s => !isHiddenRow(s));

  const specialsInStock = SPECIAL_ITEMS
    .map(item => ({ item, qty: equipmentInventory[item.id] ?? 0 }))
    .filter(x => x.qty > 0)
    .sort((a, b) => RARITY_ORDER_ASC.indexOf(b.item.rarity as Rarity) - RARITY_ORDER_ASC.indexOf(a.item.rarity as Rarity));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="companion-stats">
        {[
          { label: 'Objets en stock', value: String(totalItems), color: 'var(--purple-hi)' },
          { label: 'Fusions possibles', value: String(totalFusions), color: 'var(--green)' },
          { label: 'Raretés débloquées', value: `${unlockedEquipRarities.length}/${RARITY_ORDER_ASC.length}`, color: 'var(--cyan)' },
        ].map(stat => (
          <div key={stat.label} className="companion-stats__card" style={{ borderColor: `${stat.color}22` }}>
            <div className="companion-stats__label">{stat.label}</div>
            <div className="companion-stats__value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Emplacements : défilent horizontalement sur téléphone */}
      <div role="tablist" aria-label="Emplacements" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {EQUIPMENT_SLOTS.map(s => {
          const active = s === slot;
          const icon = representativeItem(s, 'C');
          const n = fusionsBySlot[s];
          return (
            <button key={s} role="tab" aria-selected={active} onClick={() => pickSlot(s)}
              style={{
                flexShrink: 0, minHeight: 46, padding: '0 14px', borderRadius: 10, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16,
                background: active ? 'rgba(147,197,253,0.14)' : 'var(--bg-card)',
                border: `1px solid ${active ? '#93c5fd' : 'var(--border)'}`,
                color: active ? '#dbeafe' : 'var(--text-sub)',
              }}>
              {icon && <EquipmentIcon item={icon} size={22} />}
              {EQUIPMENT_SLOT_LABELS[s]}
              {n > 0 && (
                <span style={{ minWidth: 24, padding: '0 7px', borderRadius: 999, background: 'var(--green-dim)', color: '#dcfce7', fontSize: 14, lineHeight: '22px', textAlign: 'center' }}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Colonne principale : cascade + échelle de rareté */}
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {target && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(90deg, rgba(74,222,128,0.10), rgba(74,222,128,0.02))', border: '1px solid rgba(74,222,128,0.35)' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>
                  Fusion en cascade — {EQUIPMENT_SLOT_LABELS[slot]}
                </div>
                <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-sub)' }}>
                  {cascadePreview.length === 0
                    ? 'Rien à fusionner pour l’instant.'
                    : cascadePreview.map(st => `${st.count * getEquipmentUpgradeCost(st.from)} ${RARITY_CONFIG[st.from].label} → ${st.count} ${RARITY_CONFIG[st.to].label}`).join(' · ')}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-dim)' }}>
                Jusqu’à
                <select value={target} onChange={e => setCascadeTarget(e.target.value as Rarity)}
                  style={{ minHeight: 44, padding: '0 10px', borderRadius: 8, background: 'var(--bg-card)', color: RARITY_CONFIG[target].color, border: '1px solid var(--border-lit)', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16 }}>
                  {targets.map(r => <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>)}
                </select>
              </label>
              <button onClick={doCascade} disabled={cascadePreview.length === 0}
                style={{ minHeight: 46, padding: '0 18px', borderRadius: 10, border: 'none', cursor: cascadePreview.length ? 'pointer' : 'not-allowed', opacity: cascadePreview.length ? 1 : 0.4, background: 'var(--green)', color: '#052e16', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16 }}>
                Tout fusionner
              </button>
            </div>
          )}

          {lastResult && <div className="companion-toast">✦ {lastResult}</div>}

          {visibleRows.map(s => (
            <RarityRow key={s.rarity} slot={slot} stock={s} unlocked={unlockedEquipRarities} protectSpecials={protectSpecials}
              onFuse={times => doUpgrade(s.rarity, times)} onUnlock={id => focusExpedition(id)} />
          ))}

          {hiddenCount > 0 && (
            <button onClick={() => setShowLocked(v => !v)}
              style={{ minHeight: 46, borderRadius: 10, border: '1px dashed var(--border-lit)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15 }}>
              {showLocked ? 'Masquer les raretés verrouillées' : `${plural(hiddenCount, 'rareté')} verrouillée${hiddenCount > 1 ? 's' : ''} · Afficher`}
            </button>
          )}
        </div>

        {/* Colonne latérale : passe sous la principale sur téléphone */}
        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, letterSpacing: 1, color: 'var(--text-sub)' }}>MEILLEUR OBJET EN STOCK</div>
            {EQUIPMENT_SLOTS.map(s => {
              const best = [...stocks[s]].reverse().find(r => r.qty > 0);
              const item = best ? representativeItem(s, best.rarity) : null;
              return (
                <button key={s} onClick={() => pickSlot(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 10px', borderRadius: 8, background: s === slot ? 'var(--bg-hover)' : 'var(--bg-card)', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text)' }}>
                  <span style={{ flex: 1 }}>{EQUIPMENT_SLOT_LABELS[s]}</span>
                  {best && item ? (
                    <>
                      <span style={{ fontWeight: 700, color: RARITY_CONFIG[best.rarity].color }}>{RARITY_CONFIG[best.rarity].label}</span>
                      <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, color: 'var(--green)', minWidth: 52, textAlign: 'right' }}>{formatMult(item.dpsMultiplier)}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Aucun</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'rgba(251,191,36,0.35)' }}>
            <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, letterSpacing: 1, color: 'var(--gold-hi)' }}>OBJETS SPÉCIAUX</div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-sub)', lineHeight: 1.4 }}>
              Liés à un personnage : bonus de DPS supplémentaire quand il les porte.
            </div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              Ne jamais les fusionner
              <input type="checkbox" checked={protectSpecials} onChange={e => setProtectSpecials(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: '#fbbf24', cursor: 'pointer' }} />
            </label>
            {specialsInStock.length === 0 ? (
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-muted)' }}>Aucun objet spécial en stock.</div>
            ) : specialsInStock.map(({ item, qty }) => {
              const cfg = RARITY_CONFIG[item.rarity as Rarity];
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 15 }}>
                  <EquipmentIcon item={item} size={22} />
                  <span style={{ flex: 1, minWidth: 0, color: 'var(--text)' }}>{item.name}</span>
                  <span style={{ fontWeight: 700, color: cfg?.color, whiteSpace: 'nowrap' }}>{cfg?.label} ×{qty}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

function RarityRow({ slot, stock, unlocked, protectSpecials, onFuse, onUnlock }: {
  slot: EquipmentSlot;
  stock: RarityStock;
  unlocked: Rarity[];
  protectSpecials: boolean;
  onFuse: (times: number) => void;
  onUnlock: (expeditionId: string) => void;
}) {
  const cfg = RARITY_CONFIG[stock.rarity];
  const next = getNextRarity(stock.rarity);
  const cost = getEquipmentUpgradeCost(stock.rarity);
  const fusions = Math.floor(stock.usable / cost);
  const targetOpen = canFuseInto(stock.rarity, unlocked);
  const canFuse = targetOpen && fusions > 0;
  const selfLocked = !unlocked.includes(stock.rarity) && stock.qty === 0;
  const unlockExp = next && !targetOpen && stock.qty > 0 ? unlockExpeditionFor(next) : null;
  const item = representativeItem(slot, stock.rarity);
  const pct = canFuse ? 100 : Math.round(Math.min(stock.usable, cost) / cost * 100);

  let status: string;
  let statusColor = 'var(--text-dim)';
  if (selfLocked) { status = 'Verrouillé'; statusColor = 'var(--text-muted)'; }
  else if (!next) { status = 'Rareté maximale'; statusColor = 'var(--text-muted)'; }
  else if (!targetOpen) { status = `${RARITY_CONFIG[next].label} verrouillé`; statusColor = 'var(--gold-hi)'; }
  else if (canFuse) { status = `${plural(fusions, 'fusion')} → ${RARITY_CONFIG[next].label}`; statusColor = 'var(--green)'; }
  else { status = `Encore ${cost - stock.usable} pour 1 ${RARITY_CONFIG[next].label}`; }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', padding: '10px 14px', borderRadius: 10,
      background: canFuse ? `${cfg.color}14` : 'var(--bg-panel)',
      border: `1px solid ${canFuse ? `${cfg.color}66` : 'var(--border)'}`,
      opacity: selfLocked ? 0.45 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 200px', minWidth: 0 }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${cfg.color}1f`, border: `1px solid ${cfg.color}55` }}>
          {item ? <EquipmentIcon item={item} size={28} /> : '❔'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 17, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>
            ×{stock.qty} en stock
            {stock.specialQty > 0 && (
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                {' '}· {stock.specialQty} {specialLabel(stock.specialQty)}{protectSpecials ? ' protégé' + (stock.specialQty > 1 ? 's' : '') : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: '2 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)' }}>
          {next && !selfLocked ? (
            <span>
              <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{stock.usable}</span> / {cost} par fusion
            </span>
          ) : <span />}
          <span style={{ fontWeight: 700, color: statusColor }}>{status}</span>
        </div>
        {next && !selfLocked && (
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: canFuse ? 'var(--green)' : cfg.color, transition: 'width 0.25s' }} />
          </div>
        )}
      </div>

      {canFuse && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="companion-button companion-button--primary" style={{ minHeight: 44 }} onClick={() => onFuse(1)}>×1</button>
          {fusions > 1 && (
            <button className="companion-button companion-button--soft" style={{ minHeight: 44 }} onClick={() => onFuse(fusions)}>Max ×{fusions}</button>
          )}
        </div>
      )}
      {unlockExp && (
        <button onClick={() => onUnlock(unlockExp.id)}
          style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, border: '1px dashed var(--gold-dim)', background: 'transparent', color: 'var(--gold-hi)', cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          🔒 Débloquer en expédition
        </button>
      )}
    </div>
  );
}
