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
  const cascadeCount = cascadePreview.reduce((n, st) => n + st.count, 0);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Compteurs : une ligne de texte discrète */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-dim)' }}>
        <span><b className="forge-num">{totalItems}</b> objets en stock</span>
        <span><b className="forge-num" style={{ color: 'var(--green)' }}>{totalFusions}</b> fusion{totalFusions > 1 ? 's' : ''} possible{totalFusions > 1 ? 's' : ''}</span>
        <span><b className="forge-num" style={{ color: 'var(--cyan)' }}>{unlockedEquipRarities.length}/{RARITY_ORDER_ASC.length}</b> raretés débloquées</span>
      </div>

      {/* Emplacements en tuiles : le liseré donne la meilleure rareté en stock,
          le badge le nombre de fusions possibles. */}
      <div role="tablist" aria-label="Emplacements" className="forge-slots">
        {EQUIPMENT_SLOTS.map(s => {
          const active = s === slot;
          const icon = representativeItem(s, 'C');
          const n = fusionsBySlot[s];
          const best = [...stocks[s]].reverse().find(r => r.qty > 0);
          return (
            <button key={s} role="tab" aria-selected={active} onClick={() => pickSlot(s)}
              className={`forge-slot${active ? ' forge-slot--on' : ''}`}
              title={best ? `Meilleur objet : ${RARITY_CONFIG[best.rarity].label}` : 'Aucun objet'}>
              {n > 0 && <span className="forge-slot__badge">{n}</span>}
              {icon && <EquipmentIcon item={icon} size={26} />}
              <span className="forge-slot__name">{EQUIPMENT_SLOT_LABELS[s]}</span>
              <span className="forge-slot__best" style={{ background: best ? RARITY_CONFIG[best.rarity].color : 'transparent' }} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* Colonne principale : cascade + échelle de rareté */}
        <div style={{ flex: '999 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {target && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 16px', padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(90deg, rgba(74,222,128,0.10), rgba(74,222,128,0.02))', border: '1px solid rgba(74,222,128,0.35)' }}>
              <div style={{ flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
                  {EQUIPMENT_SLOT_LABELS[slot]} · {cascadeCount === 0 ? 'rien à fusionner' : `${plural(cascadeCount, 'fusion')} prête${cascadeCount > 1 ? 's' : ''}`}
                </div>
                {cascadePreview.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cascadePreview.map(st => (
                      <span key={`${st.from}-${st.to}`} title={`${st.count * getEquipmentUpgradeCost(st.from)} ${RARITY_CONFIG[st.from].label} consommés`}
                        style={{ padding: '2px 10px', borderRadius: 999, border: '1px solid currentColor', background: 'rgba(255,255,255,0.05)', color: RARITY_CONFIG[st.to].color, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                        +{st.count} {RARITY_CONFIG[st.to].label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <select value={target} onChange={e => setCascadeTarget(e.target.value as Rarity)} aria-label="Rareté visée par la cascade"
                  style={{ minHeight: 44, padding: '0 10px', borderRadius: 8, background: 'var(--bg-card)', color: RARITY_CONFIG[target].color, border: '1px solid var(--border-lit)', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16 }}>
                  {targets.map(r => <option key={r} value={r}>Jusqu’à {RARITY_CONFIG[r].label}</option>)}
                </select>
                <button onClick={doCascade} disabled={cascadeCount === 0}
                  style={{ flex: '1 0 auto', minHeight: 46, padding: '0 18px', borderRadius: 10, border: 'none', cursor: cascadeCount ? 'pointer' : 'not-allowed', opacity: cascadeCount ? 1 : 0.4, background: 'var(--green)', color: '#052e16', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16 }}>
                  Tout fusionner
                </button>
              </div>
            </div>
          )}

          {lastResult && <div className="companion-toast">✦ {lastResult}</div>}

          <div className="forge-ladder">
            <div style={{ padding: '0 4px 6px', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, letterSpacing: 1.5, color: 'var(--text-dim)' }}>DÉTAIL PAR RARETÉ</div>
            {visibleRows.map(s => (
              <RarityRow key={s.rarity} stock={s} unlocked={unlockedEquipRarities} protectSpecials={protectSpecials}
                onFuse={times => doUpgrade(s.rarity, times)} onUnlock={id => focusExpedition(id)} />
            ))}
          </div>

          {hiddenCount > 0 && (
            <button onClick={() => setShowLocked(v => !v)}
              style={{ minHeight: 44, borderRadius: 10, border: '1px dashed var(--border-lit)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15 }}>
              {showLocked ? 'Masquer les raretés verrouillées' : `${plural(hiddenCount, 'rareté')} verrouillée${hiddenCount > 1 ? 's' : ''} · Afficher`}
            </button>
          )}
        </div>

        {/* Colonne latérale (objets spéciaux) : passe sous la principale sur téléphone */}
        <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

// Ligne compacte de l'échelle : rareté, progression vers la prochaine fusion,
// et boutons seulement quand une fusion est possible.
function RarityRow({ stock, unlocked, protectSpecials, onFuse, onUnlock }: {
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
  const showBar = !!next && targetOpen && !selfLocked;
  const pct = canFuse ? 100 : Math.round(Math.min(stock.usable, cost) / cost * 100);

  let status: string;
  let statusColor = 'var(--text-dim)';
  if (selfLocked) { status = 'Verrouillé'; statusColor = 'var(--text-muted)'; }
  else if (!next) { status = 'Rareté maximale'; statusColor = 'var(--text-muted)'; }
  else if (!targetOpen) { status = `${RARITY_CONFIG[next].label} verrouillé`; statusColor = 'var(--gold-hi)'; }
  else if (canFuse) { status = `${plural(fusions, 'fusion')} → ${RARITY_CONFIG[next].label}`; statusColor = 'var(--green)'; }
  else { status = `encore ${cost - stock.usable}`; }

  return (
    <div className="forge-rung" style={{ opacity: selfLocked ? 0.45 : 1 }}>
      <div className="forge-rung__who" style={{ color: cfg.color }}>
        <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
        {cfg.label}
      </div>

      <div className="forge-rung__bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px 8px', fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>
          <span>
            {showBar
              ? <><b className="forge-num" style={{ color: 'var(--text)' }}>{stock.usable}</b> / {cost}</>
              : <><b className="forge-num" style={{ color: 'var(--text)' }}>{stock.qty}</b> en stock</>}
            {stock.specialQty > 0 && (
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                {' '}· {stock.specialQty} {specialLabel(stock.specialQty)}{protectSpecials ? ' protégé' + (stock.specialQty > 1 ? 's' : '') : ''}
              </span>
            )}
          </span>
          <span style={{ fontWeight: 700, color: statusColor }}>{status}</span>
        </div>
        {showBar && (
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: canFuse ? 'var(--green)' : cfg.color, transition: 'width 0.25s' }} />
          </div>
        )}
      </div>

      <div className="forge-rung__end">
        {canFuse && (
          <>
            <button className="companion-button companion-button--soft" style={{ minHeight: 44, minWidth: 44 }} onClick={() => onFuse(1)}>×1</button>
            {fusions > 1 && (
              <button className="companion-button companion-button--soft" style={{ minHeight: 44 }} onClick={() => onFuse(fusions)}>Max ×{fusions}</button>
            )}
          </>
        )}
        {unlockExp && (
          <button onClick={() => onUnlock(unlockExp.id)}
            style={{ minHeight: 44, padding: '0 6px', border: 'none', background: 'transparent', color: 'var(--gold-hi)', cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Débloquer
          </button>
        )}
      </div>
    </div>
  );
}
