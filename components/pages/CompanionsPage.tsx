'use client';
import { memo, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef, type UltimateDef } from '@/lib/game/ultimates';
import { getEquipmentDef, getEquipBonusMult, type EquipmentDef } from '@/lib/game/items';
import { computeActiveSynergies, SYNERGIES_LIST, type ActiveSynergy } from '@/lib/game/synergies';
import { calculateEquippedTeamDps, calculateCharacterEquippedDps, getEquipmentMultiplier } from '@/lib/game/dpsCalculation';
import { calcCharDps } from '@/lib/game/formulas';
import { EQUIPMENT_SLOT_LABELS, EQUIPMENT_SLOTS, RARITY_CONFIG, type CharacterTemplate, type EquipmentSlot, type OwnedCharacter } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { getAffinityForId } from '@/lib/game/affinities';
import { bnMulScalar, type BigNum } from '@/lib/game/bignum';
import { AffinityBadge } from '@/components/ui/AffinityBadge';
import { AffinityTooltip } from '@/components/ui/AffinityTooltip';
import { CohesionBadge } from '@/components/ui/CohesionBadge';
import { EditionBadge, EditionGauge, EditionGaugeMini } from '@/components/ui/EditionBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import { CollectionFilters } from '@/components/ui/CollectionFilters';
import { EquipmentIcon } from '@/components/ui/EquipmentIcon';
import { compareCharacters, matchesCharacterFilters } from '@/lib/game/collectionFilters';
import { RARITY_GATES } from '@/lib/game/gacha';

export const RARITY_PRIORITY: Record<string, number> = {
  T: 0, P: 1, CO: 2, S: 3, M: 4, L: 5, E: 6, R: 7, U: 8, C: 9,
};

// Reflète exactement getEquipmentMultiplier (dpsCalculation.ts) : le bonus de
// personnage s'applique quel que soit le slot.
export function getEquipScore(def: EquipmentDef, templateId: string): number {
  return def.dpsMultiplier * getEquipBonusMult(def, templateId);
}

export function hasEquippedItems(owned: OwnedCharacter): boolean {
  return Object.values(owned.equippedItems ?? {}).some(id => !!id);
}

// ── Petits blocs réutilisés ────────────────────────────────────────────────

function EquippedBadge({ position }: { position: 'top-right' | 'bottom-left' }) {
  const posStyle = position === 'top-right' ? { top: 8, right: 8 } : { bottom: 8, left: 8 };
  return (
    <Tooltip content={<span style={{ fontWeight: 700 }}>Équipements équipés</span>}>
      <div style={{ position: 'absolute', ...posStyle, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 6px', fontSize: 14, zIndex: 30 }}>
        ⚔️
      </div>
    </Tooltip>
  );
}

function UltimateBlurb({ ult }: { ult: UltimateDef }) {
  return (
    <>
      <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--purple-glow)' }}>{ult.name}</span>
      <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}> : {ult.description}</span>
    </>
  );
}

// ── Panel synergies actives ───────────────────────────────────────────────
function SynergiesPanel() {
  const equippedTeam = useGameStore(s => s.equippedTeam);
  const active = useMemo(() => computeActiveSynergies(equippedTeam), [equippedTeam]);
  const allSynergies = SYNERGIES_LIST;

  return (
    <section className="companion-section">
      <div className="companion-section__header">
        <div className="companion-section__title">
          <span className="companion-section__decor" />
          Synergies d&apos;équipe
        </div>
        <div className="companion-toast">{active.length}/{allSynergies.length} actives</div>
      </div>

      {active.length === 0 ? (
        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)', textAlign:'center', padding:'12px 0' }}>
          Équipe des alliés du même univers pour activer des synergies !
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {active.map(syn => (
            <div key={syn.def.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:`${syn.def.color}10`, border:`1px solid ${syn.def.color}44`, borderRadius:8, boxShadow:`0 0 10px ${syn.def.glow}15` }}>
              <div style={{ width:24, height:24, flexShrink:0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/sprites/synergies/${syn.def.id}.webp`} alt={syn.def.label}
                  style={{ width:'100%', height:'100%', objectFit:'contain' }}
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:20px">${syn.def.icon}</span>`; }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:syn.def.color }}>{syn.def.label}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', marginTop:1 }}>{syn.threshold.label}</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {syn.members.map(id => (
                  <div key={id} style={{ width:24, height:24, borderRadius:5, overflow:'hidden', border:`1px solid ${syn.def.color}55`, background:`${syn.def.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:14 }}>{syn.def.icon}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:16, color:syn.def.color, flexShrink:0 }}>
                {syn.count} / {syn.threshold.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toutes les synergies possibles */}
      <details style={{ marginTop:12 }}>
        <summary style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', cursor:'pointer', userSelect:'none', letterSpacing:1 }}>▼ VOIR TOUTES LES SYNERGIES</summary>
        <div className="synergy-all-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5, marginTop:10 }}>
          {allSynergies.map(syn => {
            const isActive = active.some(a => a.def.id === syn.id);
            return (
              <div key={syn.id} style={{ padding:'6px 8px', background:isActive?`${syn.color}12`:'rgba(255,255,255,0.02)', border:`1px solid ${isActive?syn.color+'44':'var(--border)'}`, borderRadius:6, opacity:isActive?1:0.5 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                  <div style={{ width:16, height:16, flexShrink:0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/sprites/synergies/${syn.id}.webp`} alt={syn.label}
                      style={{ width:'100%', height:'100%', objectFit:'contain' }}
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:16px">${syn.icon}</span>`; }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:syn.color }}>{syn.label}</span>
                </div>
                {syn.thresholds.map((t,i) => (
                  <div key={i} style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', lineHeight:1.5 }}>
                    ×{t.count} → {t.label}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}

// ── Stats en tête de page ──────────────────────────────────────────────────
function StatsSummary({ ownedCount, equippedCount, totalDps }: { ownedCount: number; equippedCount: number; totalDps: ReturnType<typeof calculateEquippedTeamDps> }) {
  const stats = [
    { label: 'Alliés possédés', value: String(ownedCount), color: 'var(--purple-hi)' },
    { label: 'Slots utilisés', value: `${equippedCount}/4`, color: 'var(--cyan)' },
    { label: 'DPS total équipe', value: `${formatNumber(totalDps)}/s`, color: 'var(--green)' },
  ];
  return (
    <div className="companion-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="companion-stats__card" style={{ borderColor: `${stat.color}22` }}>
          <div className="companion-stats__label">{stat.label}</div>
          <div className="companion-stats__value" style={{ color: stat.color }}>{stat.value}</div>
          {stat.label === 'DPS total équipe' && <div style={{ marginTop: 4 }}><CohesionBadge /></div>}
        </div>
      ))}
    </div>
  );
}

// ── Slot d'équipe ───────────────────────────────────────────────────────────
function TeamSlotCard({
  index, tpl, owned, isSelected, onClick, onUnequip,
}: {
  index: number;
  tpl: CharacterTemplate | null;
  owned: OwnedCharacter | null;
  isSelected: boolean;
  onClick: () => void;
  onUnequip: () => void;
}) {
  const cfg = tpl ? RARITY_CONFIG[tpl.rarity] : null;
  const dps = tpl && owned ? calcCharDps(tpl, owned) : 0;
  const ult = tpl ? getUltimateDef(tpl.id) : null;

  return (
    <div
      className={`companion-team-slot ${isSelected ? 'companion-team-slot--selected' : ''}`}
      style={tpl ? { borderColor: isSelected ? 'var(--purple-hi)' : `${cfg!.color}55`, background: isSelected ? 'rgba(168,85,247,0.14)' : `${cfg!.color}10`, position: 'relative' } : { position: 'relative' }}
      onClick={onClick}
    >
      <div className="companion-team-slot__meta">SLOT {index + 1}</div>
      {tpl && owned ? (
        <>
          <CharacterCardThumb
            templateId={tpl.id}
            formIndex={owned.currentForm}
            name={getCharFormName(tpl, owned.currentForm)}
            rarity={tpl.rarity}
            edition={owned.edition}
            width={77}
            height={106}
            frameOverlay
          />
          {hasEquippedItems(owned) && <EquippedBadge position="top-right" />}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{tpl.name}</div>
            <div style={{ marginTop: 6 }}><RarityBadge rarity={tpl.rarity} /></div>
          </div>
          <EditionBadge edition={owned.edition} />
          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>{formatNumber(dps)}/s</div>
          {ult && (
            <div style={{ textAlign: 'center', padding: '0 4px' }}>
              <UltimateBlurb ult={ult} />
            </div>
          )}
          <button
            className="companion-button companion-button--danger"
            onClick={(event) => { event.stopPropagation(); onUnequip(); }}
          >
            Retirer
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 52, height: 52, border: `2px dashed ${isSelected ? 'var(--purple-hi)' : 'rgba(255,255,255,0.16)'}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: isSelected ? 'var(--purple-glow)' : 'rgba(255,255,255,0.25)' }}>
            {isSelected ? '✓' : '+'}
          </div>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: isSelected ? 'var(--purple-glow)' : 'var(--text-muted)' }}>Vide</span>
        </div>
      )}
    </div>
  );
}

// ── Carte héros du personnage sélectionné ──────────────────────────────────
function SelectedCharacterHero({
  tpl, owned, dpsWithEquip, dps, equipMult, ult, affinity, synergy,
}: {
  tpl: CharacterTemplate;
  owned: OwnedCharacter;
  dpsWithEquip: number | BigNum;
  dps: number | BigNum;
  equipMult: number;
  ult: UltimateDef | null;
  affinity: ReturnType<typeof getAffinityForId> | undefined;
  synergy: ActiveSynergy | null;
}) {
  const rarityColor = RARITY_CONFIG[tpl.rarity]?.color ?? '#6d3fd6';
  return (
    <div className="companion-card-hero companion-item-card" style={{ padding: 0, overflow: 'hidden', border: `1px solid ${rarityColor}44` }}>
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: `linear-gradient(160deg, ${rarityColor}1f 0%, transparent 70%)`, borderBottom: '1px solid var(--border)' }}>
        <CharacterCardThumb
          templateId={tpl.id}
          formIndex={owned.currentForm}
          name={getCharFormName(tpl, owned.currentForm)}
          rarity={tpl.rarity}
          edition={owned.edition}
          width={89}
          height={120}
          frameOverlay
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontWeight: 700, fontSize: 20, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>{getCharFormName(tpl, owned.currentForm)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <RarityBadge rarity={tpl.rarity} />
            <EditionBadge edition={owned.edition} />
            {affinity ? (
              <AffinityTooltip affinity={affinity}>
                <AffinityBadge affinity={affinity} size="sm" />
              </AffinityTooltip>
            ) : null}
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-sub)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px' }}>{tpl.universe}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.22)', boxShadow: '0 0 24px rgba(74,222,128,0.08) inset' }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--text-dim)' }}>🔥 DPS TOTAL</div>
          <div style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 32, color: 'var(--green)', lineHeight: 1.1, textShadow: '0 0 14px rgba(74,222,128,0.4)' }}>{formatNumber(dpsWithEquip)}<span style={{ fontSize: 16, color: 'var(--text-sub)' }}>/s</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>DPS DE BASE</div>
            <div style={{ fontFamily: 'var(--f-num)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginTop: 3 }}>{formatNumber(dps)}</div>
          </div>
          <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>ÉQUIPEMENT</div>
            <div style={{ fontFamily: 'var(--f-num)', fontWeight: 800, fontSize: 18, color: equipMult > 1 ? 'var(--green)' : 'var(--text-muted)', marginTop: 3 }}>×{equipMult.toFixed(2)}</div>
          </div>
        </div>

        <EditionGauge owned={owned} />

        {ult ? (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(147,51,234,0.09)', border: '1px solid var(--border-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <span style={{ fontFamily: 'var(--f-title)', fontWeight: 700, fontSize: 16, letterSpacing: 1, color: 'var(--purple-glow)' }}>{ult.name}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-num)', fontSize: 14, color: 'var(--text-dim)' }}>{ult.cooldown}s CD</span>
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.4 }}>{ult.description}</div>
          </div>
        ) : null}

        {synergy ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.28)' }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>✦ Synergie active</span>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)' }}>{synergy.def.label}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Slots d'équipement du personnage sélectionné ───────────────────────────
function EquipmentSlotsCard({
  equippedItems, onEquipBest, onUnequip,
}: {
  equippedItems: OwnedCharacter['equippedItems'];
  onEquipBest: () => void;
  onUnequip: (slot: EquipmentSlot) => void;
}) {
  return (
    <div className="companion-card-hero">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Équipement</div>
        <button className="companion-button companion-button--primary" onClick={onEquipBest}>
          Équiper le meilleur
        </button>
      </div>
      {EQUIPMENT_SLOTS.map((slot) => {
        const equippedId = equippedItems?.[slot] ?? null;
        const equippedDef = equippedId ? getEquipmentDef(equippedId) : null;
        return (
          <div key={slot} className="companion-slot-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="companion-slot-card__icon" style={{ background: equippedDef ? `${equippedDef.color}15` : 'rgba(255,255,255,0.04)' }}>
                {equippedDef ? <EquipmentIcon item={equippedDef} size={34} /> : '—'}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{EQUIPMENT_SLOT_LABELS[slot]}</div>
                <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>{equippedDef ? equippedDef.name : 'Aucun équipement'}</div>
              </div>
            </div>
            {equippedDef ? (
              <button className="companion-button companion-button--danger" onClick={() => onUnequip(slot)}>
                Retirer
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ── Inventaire d'équipement ─────────────────────────────────────────────────
function EquipmentInventoryCard({
  ownedEquipment, onEquip,
}: {
  ownedEquipment: [string, number][];
  onEquip: (item: EquipmentDef) => void;
}) {
  const totalCount = ownedEquipment.reduce((sum, [, qty]) => sum + qty, 0);
  return (
    <div className="companion-card-hero">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Inventaire d’équipement</div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>{totalCount} objets</div>
      </div>
      <div className="companion-item-grid">
        {ownedEquipment.map(([equipmentId, qty]) => {
          const item = getEquipmentDef(equipmentId);
          if (!item) return null;
          return (
            <div key={equipmentId} className="companion-item-card" style={{ borderColor: `${item.color}30`, background: `${item.color}12` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <EquipmentIcon item={item} size={32} />
                  <div>
                    <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: item.color }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>{EQUIPMENT_SLOT_LABELS[item.slot]}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>×{qty}</div>
              </div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)', minHeight: 32 }}>{item.description}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="companion-button companion-button--primary" onClick={() => onEquip(item)}>
                  Équiper
                </button>
              </div>
            </div>
          );
        })}
        {ownedEquipment.length === 0 && (
          <div className="companion-empty" style={{ gridColumn: '1 / -1' }}>
            Tu n’as pas encore d’équipement. Tue des monstres pour obtenir des objets.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte de la collection ──────────────────────────────────────────────────
// memo + onClick stable : un clic ne re-rend que les cartes dont l'état change.
const CollectionCard = memo(function CollectionCard({
  instanceKey, tpl, owned, isEquipped, isSelecting, isLocked, onClick,
}: {
  instanceKey: string;
  tpl: CharacterTemplate;
  owned: OwnedCharacter;
  isEquipped: boolean;
  isSelecting: boolean;
  isLocked: boolean;
  onClick: (instanceKey: string, isLocked: boolean) => void;
}) {
  const cfg = RARITY_CONFIG[tpl.rarity];
  const dps = calcCharDps(tpl, owned);
  const ult = getUltimateDef(tpl.id);

  return (
    <div
      className="companion-item-card"
      onClick={() => onClick(instanceKey, isLocked)}
      style={{
        cursor: 'pointer',
        position: 'relative',
        opacity: isLocked ? 0.45 : 1,
        background: isEquipped ? `${cfg.color}12` : 'rgba(255,255,255,0.03)',
        borderColor: isSelecting ? 'var(--purple-dim)' : isEquipped ? `${cfg.color}55` : 'rgba(255,255,255,0.08)',
        boxShadow: isEquipped ? `0 0 16px ${cfg.glow}15` : undefined,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <CharacterCardThumb
          templateId={tpl.id}
          formIndex={owned.currentForm}
          name={getCharFormName(tpl, owned.currentForm)}
          rarity={tpl.rarity}
          edition={owned.edition}
          width={67}
          height={94}
          frameOverlay
        />
        {hasEquippedItems(owned) && <EquippedBadge position="bottom-left" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</span>
            {isEquipped && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: cfg.color, fontWeight: 700, background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 9999, padding: '3px 8px' }}>
                Équipé
              </span>
            )}
            {isLocked && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: '#f87171', fontWeight: 700, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 9999, padding: '3px 8px' }}>
                🔒 Palier {RARITY_GATES[tpl.rarity].unlockPalier}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <RarityBadge rarity={tpl.rarity} />
            <EditionBadge edition={owned.edition} />
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>{owned.copies} copies</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>{formatNumber(dps)}/s</span>
          </div>
          <EditionGaugeMini owned={owned} style={{ marginTop: 6 }} />
          {ult && (
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 8 }}>
              <UltimateBlurb ult={ult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Page ─────────────────────────────────────────────────────────────────────
export function CompanionsPage() {
  const {
    collection,
    equippedTeam,
    equipCharacter,
    unequipCharacter,
    equipmentInventory,
    equipItem,
    unequipItem,
    collectionFilters,
    charMastery,
  } = useGameStore(useShallow(s => ({
    collection: s.collection,
    equippedTeam: s.equippedTeam,
    equipCharacter: s.equipCharacter,
    unequipCharacter: s.unequipCharacter,
    equipmentInventory: s.equipmentInventory,
    equipItem: s.equipItem,
    unequipItem: s.unequipItem,
    collectionFilters: s.collectionFilters,
    charMastery: s.charMastery,
  })));
  // Valeurs dérivées sélectionnées directement : la page ne se re-rend plus
  // à chaque tick du combat, seulement quand elles changent.
  const runPeakPalier = useGameStore(s => s.getRunPeakPalier());
  const cohesionMult = useGameStore(s => s.getTeamCohesion().mult);

  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const owned = useMemo(() => Object.entries(collection).sort(([, a], [, b]) => {
    const aRarity = getCharacterById(a.templateId)?.rarity ?? 'C';
    const bRarity = getCharacterById(b.templateId)?.rarity ?? 'C';
    return RARITY_PRIORITY[aRarity] - RARITY_PRIORITY[bRarity];
  }), [collection]);
  const universeOptions = useMemo(
    () => (Array.from(new Set(Object.values(collection).map(c => getCharacterById(c.templateId)?.universe).filter(Boolean))) as string[]).sort(),
    [collection],
  );

  const filteredCollection = useMemo(() => owned
    .filter(([, ownedChar]) => {
      const tpl = getCharacterById(ownedChar.templateId);
      return !!tpl && matchesCharacterFilters(tpl, collectionFilters);
    })
    .sort(([, a], [, b]) => compareCharacters(
      { tpl: getCharacterById(a.templateId)!, owned: a },
      { tpl: getCharacterById(b.templateId)!, owned: b },
      collectionFilters.sortKey, collectionFilters.sortReversed, charMastery,
    )), [owned, collectionFilters, charMastery]);

  const ownedEquipment = useMemo(() => Object.entries(equipmentInventory).filter(([, qty]) => qty > 0), [equipmentInventory]);

  const selectedCharacter = selectedCharacterId ? collection[selectedCharacterId] : null;
  const selectedTpl = selectedCharacter ? getCharacterById(selectedCharacter.templateId) : null;
  const activeSynergies = useMemo(() => computeActiveSynergies(equippedTeam), [equippedTeam]);
  const selectedSynergy = selectedTpl ? activeSynergies.find(s => s.def.universe === selectedTpl.universe) ?? null : null;

  // DPS affiché = DPS de l'accueil hors bonus globaux : on y applique la cohésion d'équipe.
  const totalDps = useMemo(
    () => bnMulScalar(calculateEquippedTeamDps(equippedTeam, collection, charMastery), cohesionMult),
    [equippedTeam, collection, charMastery, cohesionMult],
  );

  const selectedDps = selectedTpl && selectedCharacter ? calcCharDps(selectedTpl, selectedCharacter) : 0;
  const selectedEquipMult = selectedCharacter && selectedTpl ? getEquipmentMultiplier(selectedCharacter, selectedTpl) : 1;
  const selectedDpsWithEquip = selectedCharacter && selectedTpl && selectedCharacterId
    ? calculateCharacterEquippedDps(selectedCharacterId, selectedCharacter, activeSynergies, charMastery)
    : 0;
  const selectedUlt = selectedTpl ? getUltimateDef(selectedTpl.id) ?? null : null;
  const selectedAffinity = selectedTpl ? getAffinityForId(selectedTpl.id) : undefined;

  const handleEquipBest = () => {
    if (!selectedCharacterId || !selectedTpl || !selectedCharacter) return;
    for (const slot of EQUIPMENT_SLOTS) {
      const equippedId = selectedCharacter.equippedItems?.[slot] ?? null;
      const equippedDef = equippedId ? getEquipmentDef(equippedId) : null;
      let bestId: string | null = null;
      let bestScore = equippedDef ? getEquipScore(equippedDef, selectedTpl.id) : 0;
      for (const [equipmentId, qty] of ownedEquipment) {
        if (qty <= 0) continue;
        const def = getEquipmentDef(equipmentId);
        if (!def || def.slot !== slot) continue;
        const score = getEquipScore(def, selectedTpl.id);
        if (score > bestScore) {
          bestScore = score;
          bestId = equipmentId;
        }
      }
      if (bestId) equipItem(selectedCharacterId, slot, bestId);
    }
  };

  const handleTeamSlotClick = (index: number, characterId: string | null) => {
    if (characterId) {
      setSelSlot(null);
      setSelectedCharacterId(characterId === selectedCharacterId ? null : characterId);
    } else {
      setSelSlot(selSlot === index ? null : index);
    }
  };

  const handleCollectionCardClick = useCallback((instanceKey: string, isLocked: boolean) => {
    if (selSlot !== null) {
      if (isLocked) return;
      equipCharacter(instanceKey, selSlot);
      setSelSlot(null);
    } else {
      setSelectedCharacterId(prev => (instanceKey === prev ? null : instanceKey));
    }
  }, [selSlot, equipCharacter]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px 28px' }}>
      <div className="companion-page__stack">
        <StatsSummary
          ownedCount={owned.length}
          equippedCount={equippedTeam.filter(Boolean).length}
          totalDps={totalDps}
        />

        <section className="companion-section companion-panel">
          <div className="companion-section__header">
            <div className="companion-section__title companion-section__title--purple">
              <span className="companion-section__decor" />
              Équipe active
            </div>
            <div className="companion-toast">
              {selSlot !== null ? `Sélectionne un allié pour le slot ${selSlot + 1}` : 'Clique pour choisir ou retirer un allié'}
            </div>
          </div>

          <div className="companion-grid--4">
            {equippedTeam.map((tid, index) => {
              const own = tid ? collection[tid] : null;
              const tpl = own ? getCharacterById(own.templateId) : null;
              return (
                <TeamSlotCard
                  key={index}
                  index={index}
                  tpl={tpl ?? null}
                  owned={own ?? null}
                  isSelected={selSlot === index}
                  onClick={() => handleTeamSlotClick(index, tid)}
                  onUnequip={() => unequipCharacter(index)}
                />
              );
            })}
          </div>
        </section>

        <SynergiesPanel />

        <section className="companion-section companion-panel">
          <div className="companion-section__header">
            <div className="companion-section__title companion-section__title--purple">
              <span className="companion-section__decor" />
              Personnage sélectionné
            </div>
            <div className="companion-toast">{ownedEquipment.reduce((sum, [, qty]) => sum + qty, 0)} objets possédés</div>
          </div>

          {selectedCharacter && selectedTpl ? (
            <div className="companion-split">
              <SelectedCharacterHero
                tpl={selectedTpl}
                owned={selectedCharacter}
                dpsWithEquip={selectedDpsWithEquip}
                dps={selectedDps}
                equipMult={selectedEquipMult}
                ult={selectedUlt}
                affinity={selectedAffinity}
                synergy={selectedSynergy}
              />

              <div className="companion-equip-grid">
                <EquipmentSlotsCard
                  equippedItems={selectedCharacter.equippedItems}
                  onEquipBest={handleEquipBest}
                  onUnequip={(slot) => unequipItem(selectedCharacterId!, slot)}
                />
                <EquipmentInventoryCard
                  ownedEquipment={ownedEquipment}
                  onEquip={(item) => equipItem(selectedCharacterId!, item.slot, item.id)}
                />
              </div>
            </div>
          ) : (
            <div className="companion-empty">
              Sélectionne un allié dans ta collection pour gérer son équipement.
            </div>
          )}
        </section>

        <section className="companion-section">
          <div className="companion-section__header">
            <div className="companion-section__title" style={{ color: 'var(--cyan)' }}>
              <span className="companion-section__decor" style={{ background: 'linear-gradient(180deg,var(--cyan),#0ea5e9)' }} />
              Collection ({filteredCollection.length})
            </div>
          </div>

          <CollectionFilters universes={universeOptions} />

          {filteredCollection.length === 0 ? (
            <div className="companion-empty">
              <div style={{ fontSize: 56, marginBottom: 12 }}>📭</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, color: 'var(--text-dim)', marginBottom: 6 }}>Aucun allié invoqué</div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, color: 'var(--text-muted)' }}>Va dans l'onglet Gacha pour invoquer !</div>
            </div>
          ) : (
            <div className="upgrades-ally-grid">
              {filteredCollection.map(([instanceKey, ownedChar]) => {
                const tpl = getCharacterById(ownedChar.templateId);
                if (!tpl) return null;
                const isLocked = runPeakPalier < RARITY_GATES[tpl.rarity].unlockPalier;
                return (
                  <CollectionCard
                    key={instanceKey}
                    instanceKey={instanceKey}
                    tpl={tpl}
                    owned={ownedChar}
                    isEquipped={equippedTeam.includes(instanceKey)}
                    isSelecting={selSlot !== null}
                    isLocked={isLocked}
                    onClick={handleCollectionCardClick}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
