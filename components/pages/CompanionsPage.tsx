'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef, type UltimateDef } from '@/lib/game/ultimates';
import { getEquipmentDef, getEquipBonusMult, type EquipmentDef } from '@/lib/game/items';
import { computeActiveSynergies, SYNERGIES_LIST, type ActiveSynergy } from '@/lib/game/synergies';
import { calculateEquippedTeamDps, calculateCharacterEquippedDps, getEquipmentMultiplier } from '@/lib/game/dpsCalculation';
import { calcCharDps } from '@/lib/game/formulas';
import { EQUIPMENT_SLOT_LABELS, EQUIPMENT_SLOTS, RARITY_CONFIG, type CharacterTemplate, type EquipmentSlot, type OwnedCharacter } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { getAffinityForId } from '@/lib/game/affinities';
import { bnCompare, type BigNum } from '@/lib/game/bignum';
import { AffinityBadge } from '@/components/ui/AffinityBadge';
import { AffinityTooltip } from '@/components/ui/AffinityTooltip';
import { EDITION_CONFIG } from '@/lib/game/editions';
import { Tooltip } from '@/components/ui/Tooltip';
import { CollectionFilters, type CollectionAffinityMode, type CollectionFilterMode, type CollectionSortMode } from '@/components/ui/CollectionFilters';
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

export function matchesCollectionFilters(
  tpl: CharacterTemplate,
  filter: CollectionFilterMode,
  universe: string | 'all',
  affinity: CollectionAffinityMode,
): boolean {
  if (filter === 'missing') return false;
  if (universe !== 'all' && tpl.universe !== universe) return false;
  if (affinity !== 'all' && getAffinityForId(tpl.id) !== affinity) return false;
  if (filter !== 'all' && filter !== 'owned' && tpl.rarity !== filter) return false;
  return true;
}

export function compareCollectionEntries(
  [, a]: [string, OwnedCharacter], [, b]: [string, OwnedCharacter], sort: CollectionSortMode,
): number {
  const aTpl = getCharacterById(a.templateId)!;
  const bTpl = getCharacterById(b.templateId)!;
  switch (sort) {
    case 'rarity':
      return (RARITY_PRIORITY[aTpl.rarity] ?? 9) - (RARITY_PRIORITY[bTpl.rarity] ?? 9);
    case 'dps_desc':
      return bnCompare(calcCharDps(bTpl, b), calcCharDps(aTpl, a));
    case 'dps_asc':
      return bnCompare(calcCharDps(aTpl, a), calcCharDps(bTpl, b));
    default:
      return aTpl.name.localeCompare(bTpl.name);
  }
}

// ── Petits blocs réutilisés ────────────────────────────────────────────────

function EquippedBadge({ position }: { position: 'top-right' | 'bottom-left' }) {
  const posStyle = position === 'top-right' ? { top: 8, right: 8 } : { bottom: 8, left: 8 };
  return (
    <Tooltip content={<span style={{ fontWeight: 700 }}>Équipements équipés</span>}>
      <div style={{ position: 'absolute', ...posStyle, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 6px', fontSize: 12.4, zIndex: 6 }}>
        ⚔️
      </div>
    </Tooltip>
  );
}

function UltimateBlurb({ ult }: { ult: UltimateDef }) {
  return (
    <>
      <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 12, color: 'var(--purple-glow)' }}>{ult.name}</span>
      <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-dim)' }}> : {ult.description}</span>
    </>
  );
}

// ── Panel synergies actives ───────────────────────────────────────────────
function SynergiesPanel() {
  const { equippedTeam } = useGameStore();
  const active = computeActiveSynergies(equippedTeam);
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
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-muted)', textAlign:'center', padding:'12px 0' }}>
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
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:18px">${syn.def.icon}</span>`; }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:syn.def.color }}>{syn.def.label}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginTop:1 }}>{syn.threshold.label}</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {syn.members.map(id => (
                  <div key={id} style={{ width:24, height:24, borderRadius:5, overflow:'hidden', border:`1px solid ${syn.def.color}55`, background:`${syn.def.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:12.4 }}>{syn.def.icon}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:14.4, color:syn.def.color, flexShrink:0 }}>
                {syn.count} / {syn.threshold.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toutes les synergies possibles */}
      <details style={{ marginTop:12 }}>
        <summary style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', cursor:'pointer', userSelect:'none', letterSpacing:1 }}>▼ VOIR TOUTES LES SYNERGIES</summary>
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
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML=`<span style="font-size:13px">${syn.icon}</span>`; }} />
                  </div>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:syn.color }}>{syn.label}</span>
                </div>
                {syn.thresholds.map((t,i) => (
                  <div key={i} style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>
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
            width={64}
            height={88}
          />
          {hasEquippedItems(owned) && <EquippedBadge position="top-right" />}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14.4, color: 'var(--text)' }}>{tpl.name}</div>
            <div style={{ marginTop: 6 }}><RarityBadge rarity={tpl.rarity} /></div>
          </div>
          <RankStars rank={owned.rank} />
          <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16.5, color: 'var(--green)' }}>{formatNumber(dps)}/s</div>
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
          <div style={{ width: 52, height: 52, border: `2px dashed ${isSelected ? 'var(--purple-hi)' : 'rgba(255,255,255,0.16)'}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26.8, color: isSelected ? 'var(--purple-glow)' : 'rgba(255,255,255,0.25)' }}>
            {isSelected ? '✓' : '+'}
          </div>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, fontWeight: 700, color: isSelected ? 'var(--purple-glow)' : 'var(--text-muted)' }}>Vide</span>
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
          width={74}
          height={100}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontWeight: 700, fontSize: 18.5, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>{getCharFormName(tpl, owned.currentForm)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <RarityBadge rarity={tpl.rarity} />
            {affinity ? (
              <AffinityTooltip affinity={affinity}>
                <AffinityBadge affinity={affinity} size="sm" />
              </AffinityTooltip>
            ) : null}
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-sub)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px' }}>{tpl.universe}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.22)', boxShadow: '0 0 24px rgba(74,222,128,0.08) inset' }}>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 800, letterSpacing: 2, color: 'var(--text-dim)' }}>🔥 DPS TOTAL</div>
          <div style={{ fontFamily: 'var(--f-num)', fontWeight: 900, fontSize: 28.8, color: 'var(--green)', lineHeight: 1.1, textShadow: '0 0 14px rgba(74,222,128,0.4)' }}>{formatNumber(dpsWithEquip)}<span style={{ fontSize: 13.4, color: 'var(--text-sub)' }}>/s</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>DPS DE BASE</div>
            <div style={{ fontFamily: 'var(--f-num)', fontWeight: 800, fontSize: 15.5, color: 'var(--text)', marginTop: 3 }}>{formatNumber(dps)}</div>
          </div>
          <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>ÉQUIPEMENT</div>
            <div style={{ fontFamily: 'var(--f-num)', fontWeight: 800, fontSize: 15.5, color: equipMult > 1 ? 'var(--green)' : 'var(--text-muted)', marginTop: 3 }}>×{equipMult.toFixed(2)}</div>
          </div>
        </div>

        {ult ? (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(147,51,234,0.09)', border: '1px solid var(--border-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 13.4 }}>⚡</span>
              <span style={{ fontFamily: 'var(--f-title)', fontWeight: 700, fontSize: 13.4, letterSpacing: 1, color: 'var(--purple-glow)' }}>{ult.name}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--f-num)', fontSize: 12, color: 'var(--text-dim)' }}>{ult.cooldown}s CD</span>
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.4 }}>{ult.description}</div>
          </div>
        ) : null}

        {synergy ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.28)' }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>✦ Synergie active</span>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-sub)' }}>{synergy.def.label}</span>
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
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 13.4, fontWeight: 700, color: 'var(--text)' }}>Équipement</div>
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
                {equippedDef ? equippedDef.icon : '—'}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4, color: 'var(--text)' }}>{EQUIPMENT_SLOT_LABELS[slot]}</div>
                <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{equippedDef ? equippedDef.name : 'Aucun équipement'}</div>
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
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 13.4, fontWeight: 700, color: 'var(--text)' }}>Inventaire d’équipement</div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'var(--text-muted)' }}>{totalCount} objets</div>
      </div>
      <div className="companion-item-grid">
        {ownedEquipment.map(([equipmentId, qty]) => {
          const item = getEquipmentDef(equipmentId);
          if (!item) return null;
          return (
            <div key={equipmentId} className="companion-item-card" style={{ borderColor: `${item.color}30`, background: `${item.color}12` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 22.7 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 13.4, color: item.color }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{item.slot}</div>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 900, fontSize: 14.4, color: 'var(--text)' }}>×{qty}</div>
              </div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-muted)', minHeight: 32 }}>{item.description}</div>
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
function CollectionCard({
  tpl, owned, isEquipped, isSelecting, isLocked, onClick,
}: {
  tpl: CharacterTemplate;
  owned: OwnedCharacter;
  isEquipped: boolean;
  isSelecting: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  const cfg = RARITY_CONFIG[tpl.rarity];
  const dps = calcCharDps(tpl, owned);
  const ult = getUltimateDef(tpl.id);

  return (
    <div
      className="companion-item-card"
      onClick={onClick}
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
          width={56}
          height={78}
        />
        {hasEquippedItems(owned) && <EquippedBadge position="bottom-left" />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14.4, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.name}</span>
            {isEquipped && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: cfg.color, fontWeight: 700, background: `${cfg.color}15`, border: `1px solid ${cfg.color}44`, borderRadius: 9999, padding: '3px 8px' }}>
                Équipé
              </span>
            )}
            {isLocked && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: '#f87171', fontWeight: 700, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 9999, padding: '3px 8px' }}>
                🔒 Palier {RARITY_GATES[tpl.rarity].unlockPalier}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <RarityBadge rarity={tpl.rarity} />
            {owned.edition && owned.edition !== 'base' && (
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12, letterSpacing:0.5,
                color: EDITION_CONFIG[owned.edition].color, background:`${EDITION_CONFIG[owned.edition].color}18`,
                border:`1px solid ${EDITION_CONFIG[owned.edition].color}55`, borderRadius:999, padding:'2px 7px' }}>
                {owned.edition === 'diamond' ? '💎 DIAMANT' : '✨ OR'}
              </span>
            )}
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{owned.copies} copies</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <RankStars rank={owned.rank} />
            <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15.5, color: 'var(--green)' }}>{formatNumber(dps)}/s</span>
          </div>
          {ult && (
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 8 }}>
              <UltimateBlurb ult={ult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function CompanionsPage() {
  const {
    collection,
    equippedTeam,
    equipCharacter,
    unequipCharacter,
    getRunPeakPalier,
    equipmentInventory,
    equipItem,
    unequipItem,
    collectionFilter,
    collectionUniverse,
    collectionAffinity,
    collectionSort,
    setCollectionFilters,
  } = useGameStore();

  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const filter = collectionFilter as CollectionFilterMode;
  const universe = collectionUniverse as string | 'all';
  const affinity = collectionAffinity as CollectionAffinityMode;
  const sort = collectionSort as CollectionSortMode;
  const setFilter = (next: CollectionFilterMode) => setCollectionFilters({ filter: next });
  const setUniverse = (next: string | 'all') => setCollectionFilters({ universe: next });
  const setAffinity = (next: CollectionAffinityMode) => setCollectionFilters({ affinity: next });
  const setSort = (next: CollectionSortMode) => setCollectionFilters({ sort: next });

  const owned = Object.entries(collection).sort(([, a], [, b]) => {
    const aRarity = getCharacterById(a.templateId)?.rarity ?? 'C';
    const bRarity = getCharacterById(b.templateId)?.rarity ?? 'C';
    return RARITY_PRIORITY[aRarity] - RARITY_PRIORITY[bRarity];
  });
  const universeOptions = (Array.from(new Set(Object.values(collection).map(c => getCharacterById(c.templateId)?.universe).filter(Boolean))) as string[]).sort();

  const filteredCollection = owned
    .filter(([, ownedChar]) => {
      const tpl = getCharacterById(ownedChar.templateId);
      return !!tpl && matchesCollectionFilters(tpl, filter, universe, affinity);
    })
    .sort((a, b) => compareCollectionEntries(a, b, sort));

  const ownedEquipment = Object.entries(equipmentInventory).filter(([, qty]) => qty > 0);

  const selectedCharacter = selectedCharacterId ? collection[selectedCharacterId] : null;
  const selectedTpl = selectedCharacter ? getCharacterById(selectedCharacter.templateId) : null;
  const activeSynergies = computeActiveSynergies(equippedTeam);
  const selectedSynergy = selectedTpl ? activeSynergies.find(s => s.def.universe === selectedTpl.universe) ?? null : null;

  const totalDps = calculateEquippedTeamDps(equippedTeam, collection);

  const selectedDps = selectedTpl && selectedCharacter ? calcCharDps(selectedTpl, selectedCharacter) : 0;
  const selectedEquipMult = selectedCharacter && selectedTpl ? getEquipmentMultiplier(selectedCharacter, selectedTpl) : 1;
  const selectedDpsWithEquip = selectedCharacter && selectedTpl && selectedCharacterId
    ? calculateCharacterEquippedDps(selectedCharacterId, selectedCharacter, activeSynergies)
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

  const handleCollectionCardClick = (instanceKey: string, isLocked: boolean) => {
    if (selSlot !== null) {
      if (isLocked) return;
      equipCharacter(instanceKey, selSlot);
      setSelSlot(null);
    } else {
      setSelectedCharacterId(instanceKey === selectedCharacterId ? null : instanceKey);
    }
  };

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

          <CollectionFilters
            filter={filter}
            onFilterChange={setFilter}
            universe={universe}
            onUniverseChange={setUniverse}
            affinity={affinity}
            onAffinityChange={setAffinity}
            sort={sort}
            onSortChange={setSort}
            universes={universeOptions}
          />

          {filteredCollection.length === 0 ? (
            <div className="companion-empty">
              <div style={{ fontSize: 49.4, marginBottom: 12 }}>📭</div>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 16.5, color: 'var(--text-dim)', marginBottom: 6 }}>Aucun allié invoqué</div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 13.4, color: 'var(--text-muted)' }}>Va dans l'onglet Gacha pour invoquer !</div>
            </div>
          ) : (
            <div className="companion-item-grid">
              {filteredCollection.map(([instanceKey, ownedChar]) => {
                const tpl = getCharacterById(ownedChar.templateId);
                if (!tpl) return null;
                const isLocked = getRunPeakPalier() < RARITY_GATES[tpl.rarity].unlockPalier;
                return (
                  <CollectionCard
                    key={instanceKey}
                    tpl={tpl}
                    owned={ownedChar}
                    isEquipped={equippedTeam.includes(instanceKey)}
                    isSelecting={selSlot !== null}
                    isLocked={isLocked}
                    onClick={() => handleCollectionCardClick(instanceKey, isLocked)}
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
