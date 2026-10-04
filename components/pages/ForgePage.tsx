'use client';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { useDisplaySettingsStore } from '@/store/displaySettingsStore';
import { CRAFT_RECIPES, PALIER_DROPS, CraftRecipe, CraftIngredient, EXPEDITION_DEFS } from '@/lib/game/expeditions';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { EQUIPMENT_SLOTS, RARITY_CONFIG, RARITY_ORDER_ASC, Rarity } from '@/types/game';
import { getEquipmentDef, getSpecialWeaponGroup, SPECIAL_WEAPON_FUSION_COST, SPECIAL_WEAPON_FUSION_RARITIES } from '@/lib/game/items';
import { getSlotStock, countSlotFusions } from '@/lib/game/equipmentFusion';
import { EquipmentWorkbench } from './EquipmentWorkbench';
import { ForgeRevealOverlay } from './ForgeRevealOverlay';

// Recettes et drops triés par rareté du personnage forgé (du plus commun au
// plus rare), puis par palier requis ; un drop sans recette passe en dernier.
const rarityRank = (r?: Rarity) => (r ? RARITY_ORDER_ASC.indexOf(r) : RARITY_ORDER_ASC.length);
const SORTED_RECIPES = [...CRAFT_RECIPES].sort((a, b) =>
  rarityRank(a.reward.rarity) - rarityRank(b.reward.rarity) || a.palierRequired - b.palierRequired);
const dropRank = (dropId: string) => {
  const i = SORTED_RECIPES.findIndex(r => r.ingredients.some(ing => ing.type === 'drop' && ing.id === dropId));
  return i < 0 ? SORTED_RECIPES.length : i;
};
const SORTED_DROPS = [...PALIER_DROPS].sort((a, b) => dropRank(a.id) - dropRank(b.id));

type ForgeTab = 'equipment' | 'weapons' | 'recipes';
type RecipeStatus = 'ready' | 'progress' | 'locked';
type RecipeFilter = 'all' | RecipeStatus;

// getSpecialWeaponGroup parcourt tout le catalogue : calculé une seule fois.
const SPECIAL_WEAPON_POOLS = Object.fromEntries(
  SPECIAL_WEAPON_FUSION_RARITIES.map(r => [r, getSpecialWeaponGroup(r)]),
) as Record<Rarity, ReturnType<typeof getSpecialWeaponGroup>>;
const specialWeaponStock = (inv: Record<string, number>, rarity: Rarity) =>
  (SPECIAL_WEAPON_POOLS[rarity] ?? []).reduce((sum, item) => sum + (inv[item.id] ?? 0), 0);

// ── Recettes ────────────────────────────────────────────────────────────

function IngredientRow({ ing }: { ing: CraftIngredient }) {
  const { dropInventory, collection, championInventory, focusExpedition } = useGameStore(useShallow(s => ({ dropInventory: s.expeditionDropInventory, collection: s.collection, championInventory: s.championInventory, focusExpedition: s.focusExpedition })));

  let have: number;
  let ok: boolean;
  let note: string | null = null;
  if (ing.type === 'drop') {
    have = dropInventory[ing.id] ?? 0;
    ok = have >= ing.quantity;
  } else {
    const maxed = collection[ing.id]?.edition === 'prismatic';
    have = championInventory[ing.id] ?? 0;
    ok = maxed && have >= ing.quantity;
    note = maxed
      ? 'Consommé depuis l’inventaire champions, ton exemplaire Prismatique reste'
      : 'Nécessite le champion en édition Prismatique';
  }

  // Clic → redirige vers l'expédition qui drop cet ingrédient (page Expéditions,
  // bon onglet ouvert, carte surlignée — voir ExpeditionsPage.tsx).
  const expDef = ing.type === 'drop' ? EXPEDITION_DEFS.find(x => x.rewards.dropId === ing.id) : null;
  const pct = Math.min(100, Math.round(have / ing.quantity * 100));
  const icon = ing.type === 'drop' ? (PALIER_DROPS.find(d => d.id === ing.id)?.icon ?? '📦') : '👤';

  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 15 }}>
        <span aria-hidden>{icon}</span>
        <span style={{ flex: 1, minWidth: 0, color: ok ? 'var(--text)' : 'var(--text-sub)', fontWeight: 600 }}>{ing.label}</span>
        <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 14, color: ok ? 'var(--green)' : 'var(--text-sub)', whiteSpace: 'nowrap' }}>
          {have} / {ing.quantity}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: ok ? 'var(--green)' : 'var(--purple-glow)' }} />
      </div>
      {note && <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: ok ? 'var(--text-dim)' : 'var(--red)' }}>{note}</div>}
      {expDef && !ok && <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--purple-glow)' }}>→ {expDef.name}</div>}
    </>
  );

  const style = { display: 'flex', flexDirection: 'column' as const, gap: 4, width: '100%', padding: '6px 8px', borderRadius: 8, background: 'transparent', border: '1px solid transparent', textAlign: 'left' as const };
  return expDef ? (
    <button onClick={() => focusExpedition(expDef.id)} className="forge-ingredient" style={{ ...style, cursor: 'pointer' }}>{body}</button>
  ) : (
    <div style={style}>{body}</div>
  );
}

function RecipeCard({ recipe, status }: { recipe: CraftRecipe; status: RecipeStatus }) {
  const { craftRecipe, collection } = useGameStore(useShallow(s => ({ craftRecipe: s.craftRecipe, collection: s.collection })));
  const [showLore, setShowLore] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const handleCraft = () => {
    if (craftRecipe(recipe.id) && recipe.reward.type === 'character') setRevealing(true);
  };

  const alreadyOwned = recipe.reward.type === 'character' && recipe.reward.characterId
    ? !!collection[recipe.reward.characterId] : false;
  const rewardTpl = recipe.reward.characterId ? CHARACTER_POOL.find(c => c.id === recipe.reward.characterId) : null;
  const rewardCfg = rewardTpl ? RARITY_CONFIG[rewardTpl.rarity] : null;
  const ready = status === 'ready';
  const locked = status === 'locked';

  return (
    <div className="panel" style={{
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden',
      borderColor: ready ? 'rgba(147,51,234,0.6)' : 'var(--border)',
      boxShadow: ready ? '0 0 24px rgba(147,51,234,0.22)' : 'none',
      opacity: locked ? 0.55 : 1,
    }}>
      {ready && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,var(--purple-hi),transparent)' }} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
          background: rewardCfg ? `${rewardCfg.color}18` : 'rgba(255,255,255,0.05)',
          border: `1px solid ${rewardCfg ? rewardCfg.color + '44' : 'var(--border)'}`,
        }}>
          {recipe.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: ready ? 'var(--purple-glow)' : 'var(--text)', letterSpacing: 0.5 }}>{recipe.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {rewardTpl && rewardCfg && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: rewardCfg.color, background: `${rewardCfg.color}15`, border: `1px solid ${rewardCfg.color}33`, borderRadius: 6, padding: '1px 8px' }}>
                {rewardCfg.label}
              </span>
            )}
            {alreadyOwned && (
              <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'var(--green)', background: 'rgba(74,222,128,0.1)', borderRadius: 6, padding: '1px 8px' }}>Possédé</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.45 }}>{recipe.description}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {recipe.ingredients.map((ing, i) => <IngredientRow key={i} ing={ing} />)}
      </div>

      {showLore && (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.6 }}>
          {recipe.lore}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        {locked ? (
          <div style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1px dashed var(--border-lit)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15, color: 'var(--text-muted)' }}>
            🔒 Palier {recipe.palierRequired} requis
          </div>
        ) : (
          <button onClick={handleCraft} disabled={!ready} className={ready ? 'btn-primary' : 'btn-secondary'}
            style={{ flex: 1, minHeight: 44, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            ⚗ FORGER{alreadyOwned ? ' (doublon)' : ''}
          </button>
        )}
        <button onClick={() => setShowLore(v => !v)} className="btn-secondary" aria-expanded={showLore}
          style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }}>
          {showLore ? 'Masquer' : 'Lore'}
        </button>
      </div>

      {revealing && recipe.reward.characterId && (
        <ForgeRevealOverlay characterId={recipe.reward.characterId} recipeIcon={recipe.icon} onClose={() => setRevealing(false)} />
      )}
    </div>
  );
}

// memo : ne se re-rend pas à chaque drop d'équipement (statuts mémoïsés par ForgePage).
const RecipesTab = memo(function RecipesTab({ statuses }: { statuses: Record<string, RecipeStatus> }) {
  const { dropInventory, focusExpedition } = useGameStore(useShallow(s => ({ dropInventory: s.expeditionDropInventory, focusExpedition: s.focusExpedition })));
  const [filter, setFilter] = useState<RecipeFilter>('all');

  const count = (f: RecipeFilter) => f === 'all' ? SORTED_RECIPES.length : SORTED_RECIPES.filter(r => statuses[r.id] === f).length;
  const shown = SORTED_RECIPES.filter(r => filter === 'all' || statuses[r.id] === filter);
  const ownedDrops = SORTED_DROPS.filter(d => (dropInventory[d.id] ?? 0) > 0);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { k: 'all' as const, label: 'Toutes' },
            { k: 'ready' as const, label: 'Prêtes' },
            { k: 'progress' as const, label: 'En cours' },
            { k: 'locked' as const, label: 'Verrouillées' },
          ]).map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} aria-pressed={filter === f.k}
              style={{
                minHeight: 44, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15,
                background: filter === f.k ? 'rgba(232,121,249,0.14)' : 'var(--bg-card)',
                border: `1px solid ${filter === f.k ? '#e879f9' : 'var(--border)'}`,
                color: filter === f.k ? '#f5d0fe' : 'var(--text-sub)',
              }}>
              {f.label} ({count(f.k)})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <div className="companion-empty">Aucune recette dans cette catégorie.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
            {shown.map(r => <RecipeCard key={r.id} recipe={r} status={statuses[r.id]} />)}
          </div>
        )}
      </div>

      {/* Ingrédients récoltés : colonne latérale, sous les recettes sur téléphone */}
      <div className="panel" style={{ flex: '1 1 260px', minWidth: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: 'var(--f-title)', fontSize: 16, letterSpacing: 1, color: 'var(--text-sub)' }}>MES INGRÉDIENTS</div>
        {ownedDrops.length === 0 ? (
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-muted)' }}>
            Aucun drop pour l’instant. Lance des expéditions pour récolter des objets rares !
          </div>
        ) : ownedDrops.map(drop => {
          const expDef = EXPEDITION_DEFS.find(x => x.rewards.dropId === drop.id);
          return (
            <button key={drop.id} onClick={expDef ? () => focusExpedition(expDef.id) : undefined} disabled={!expDef}
              className="forge-ingredient"
              style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid transparent', cursor: expDef ? 'pointer' : 'default', textAlign: 'left', color: 'var(--text)' }}>
              <span aria-hidden style={{ fontSize: 22 }}>{drop.icon}</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15 }}>{drop.name}</span>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)' }}>{drop.universName} · Palier {drop.palier}</span>
              </span>
              <span style={{ fontFamily: 'var(--f-num)', fontWeight: 700, fontSize: 16, color: 'var(--purple-glow)' }}>{dropInventory[drop.id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ── Armes spéciales ─────────────────────────────────────────────────────

function WeaponFusionCard({ rarity }: { rarity: Rarity }) {
  const { equipmentInventory, fuseSpecialWeapons } = useGameStore(useShallow(s => ({ equipmentInventory: s.equipmentInventory, fuseSpecialWeapons: s.fuseSpecialWeapons })));
  const [lastResult, setLastResult] = useState<string | null>(null);

  const cfg = RARITY_CONFIG[rarity];
  const pool = SPECIAL_WEAPON_POOLS[rarity] ?? [];
  const qty = specialWeaponStock(equipmentInventory, rarity);
  const maxFusions = Math.floor(qty / SPECIAL_WEAPON_FUSION_COST);
  const filled = Math.min(qty, SPECIAL_WEAPON_FUSION_COST);

  const doFuse = (times: number) => {
    if (times < 1) return;
    let succeeded = 0;
    let lastId: string | null = null;
    for (let i = 0; i < times; i++) {
      const res = fuseSpecialWeapons(rarity);
      if (!res.ok) break;
      succeeded++;
      lastId = res.resultId ?? lastId;
    }
    if (succeeded > 0 && lastId) {
      const def = getEquipmentDef(lastId);
      setLastResult(`✦ ${succeeded} fusion${succeeded > 1 ? 's' : ''} réussie${succeeded > 1 ? 's' : ''} — dernière arme obtenue : ${def?.name ?? lastId}`);
    }
  };

  if (pool.length === 0) return null;

  return (
    <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderColor: maxFusions > 0 ? cfg.color : `${cfg.color}40` }}>
      <div style={{ fontFamily: 'var(--f-title)', fontSize: 17, color: cfg.color, letterSpacing: 1 }}>Armes {cfg.label}</div>
      <div style={{ display: 'flex', gap: 6 }} aria-label={`${filled} sur ${SPECIAL_WEAPON_FUSION_COST}`}>
        {Array.from({ length: SPECIAL_WEAPON_FUSION_COST }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 10, borderRadius: 999, background: i < filled ? cfg.color : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-sub)' }}>
        {qty} en stock · {pool.length} arme{pool.length !== 1 ? 's' : ''} possible{pool.length !== 1 ? 's' : ''} en sortie
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => doFuse(1)} disabled={maxFusions < 1} className={maxFusions >= 1 ? 'btn-primary' : 'btn-secondary'}
          style={{ flex: 1, minHeight: 44, padding: '0 14px', fontSize: 15 }}>
          {maxFusions >= 1 ? `Fusionner ${SPECIAL_WEAPON_FUSION_COST} → 1` : `Encore ${SPECIAL_WEAPON_FUSION_COST - qty}`}
        </button>
        {maxFusions > 1 && (
          <button onClick={() => doFuse(maxFusions)} className="btn-secondary" style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }}>
            Max ×{maxFusions}
          </button>
        )}
      </div>
      {lastResult && (
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: cfg.color, background: `${cfg.color}10`, border: `1px solid ${cfg.color}30`, borderRadius: 8, padding: '8px 12px' }}>
          {lastResult}
        </div>
      )}
    </div>
  );
}

const WeaponsTab = memo(function WeaponsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="panel" style={{ padding: '14px 16px', fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        Fusionne {SPECIAL_WEAPON_FUSION_COST} armes spéciales (liées à un personnage) d’une même rareté pour obtenir une arme spéciale <strong style={{ color: 'var(--text)' }}>aléatoire de cette même rareté</strong> : pratique pour recycler les doublons. La rareté ne change pas, d’où un coût réduit.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 12 }}>
        {SPECIAL_WEAPON_FUSION_RARITIES.map(r => <WeaponFusionCard key={r} rarity={r} />)}
      </div>
    </div>
  );
});

// ── Page ────────────────────────────────────────────────────────────────

export function ForgePage() {
  const { equipmentInventory, unlockedEquipRarities, canCraft, dropInventory, championInventory, collection } = useGameStore(useShallow(s => ({
    equipmentInventory: s.equipmentInventory, unlockedEquipRarities: s.unlockedEquipRarities, canCraft: s.canCraft,
    // canCraft lit ces inventaires : on s'y abonne pour recalculer les statuts.
    dropInventory: s.expeditionDropInventory, championInventory: s.championInventory, collection: s.collection,
  })));
  const runPeakPalier = useGameStore(s => s.getRunPeakPalier());
  const protectSpecials = useDisplaySettingsStore(s => s.protectSpecialEquipment);
  const [tab, setTab] = useState<ForgeTab>('equipment');

  const equipFusions = useMemo(() => EQUIPMENT_SLOTS.reduce((sum, slot) =>
    sum + countSlotFusions(getSlotStock(equipmentInventory, slot, protectSpecials), unlockedEquipRarities), 0),
  [equipmentInventory, unlockedEquipRarities, protectSpecials]);
  const weaponFusions = SPECIAL_WEAPON_FUSION_RARITIES.reduce((sum, r) =>
    sum + Math.floor(specialWeaponStock(equipmentInventory, r) / SPECIAL_WEAPON_FUSION_COST), 0);

  // Recalculé seulement quand un ingrédient ou le palier change, pas à chaque
  // drop d'équipement : RecipesTab (memo) garde ainsi les mêmes props.
  const statuses = useMemo(() => {
    const out: Record<string, RecipeStatus> = {};
    for (const r of SORTED_RECIPES) {
      out[r.id] = runPeakPalier < r.palierRequired ? 'locked' : canCraft(r.id).ok ? 'ready' : 'progress';
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- canCraft lit ces inventaires dans le store
  }, [canCraft, runPeakPalier, dropInventory, championInventory, collection]);
  const readyRecipes = Object.values(statuses).filter(s => s === 'ready').length;

  const tabs: { k: ForgeTab; label: string; badge: number; badgeLabel: string; color: string }[] = [
    { k: 'equipment', label: 'Équipement',      badge: equipFusions,  badgeLabel: String(equipFusions),  color: 'var(--green)' },
    { k: 'weapons',   label: 'Armes spéciales', badge: weaponFusions, badgeLabel: String(weaponFusions), color: 'var(--green)' },
    { k: 'recipes',   label: 'Recettes',        badge: readyRecipes,  badgeLabel: `${readyRecipes} prête${readyRecipes > 1 ? 's' : ''}`, color: '#e879f9' },
  ];

  return (
    <div className="page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <div style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#e879f9,#c084fc)', borderRadius: 2, boxShadow: '0 0 8px #e879f9' }} />
            <span className="page-title" style={{ color: '#e879f9' }}>FORGE ⚗</span>
          </div>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15, color: 'var(--text-dim)' }}>
            Fusionne ton équipement, recycle tes armes spéciales et forge des personnages uniques
          </div>
        </div>

        <div role="tablist" aria-label="Sections de la forge" style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(t => {
            const active = tab === t.k;
            return (
              <button key={t.k} role="tab" aria-selected={active} onClick={() => setTab(t.k)}
                style={{
                  flexShrink: 0, minHeight: 50, padding: '0 18px', marginBottom: -1, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', border: 'none', borderBottom: `3px solid ${active ? '#e879f9' : 'transparent'}`,
                  color: active ? '#f5d0fe' : 'var(--text-dim)', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 17,
                }}>
                {t.label}
                {t.badge > 0 && (
                  <span style={{ padding: '0 8px', borderRadius: 999, fontSize: 14, lineHeight: '22px', color: t.color, background: 'rgba(255,255,255,0.06)' }}>
                    {t.badgeLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {tab === 'equipment' && <EquipmentWorkbench />}
        {tab === 'weapons' && <WeaponsTab />}
        {tab === 'recipes' && <RecipesTab statuses={statuses} />}
      </div>
    </div>
  );
}
