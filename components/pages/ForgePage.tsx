'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CRAFT_RECIPES, PALIER_DROPS, CraftRecipe, EXPEDITION_DEFS } from '@/lib/game/expeditions';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG, Rarity } from '@/types/game';
import { getEquipmentDef, getSpecialWeaponGroup, SPECIAL_WEAPON_FUSION_COST, SPECIAL_WEAPON_FUSION_RARITIES } from '@/lib/game/items';

function IngredientRow({ type, id, quantity, label }: { type: string; id: string; quantity: number; label: string }) {
  const { expeditionDropInventory: dropInventory, collection, championInventory, focusExpedition } = useGameStore();

  let have = 0;
  let ok = false;
  let maxed = true;
  if (type === 'drop') {
    have = dropInventory[id] ?? 0;
    ok = have >= quantity;
  } else {
    const owned = collection[id];
    maxed = !!owned && owned.rank >= 7;
    have = championInventory[id] ?? 0;
    ok = maxed && have >= quantity;
  }

  // Clic → redirige vers l'expédition qui drop cet ingrédient (page Expéditions,
  // bon onglet ouvert, carte surlignée — voir ExpeditionsPage.tsx).
  const expDef = type === 'drop' ? EXPEDITION_DEFS.find(x => x.rewards.dropId === id) : null;
  const clickable = !!expDef;

  return (
    <div
      onClick={clickable ? () => focusExpedition(expDef!.id) : undefined}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', background: ok ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)', borderRadius:8, border:`1px solid ${ok ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`, cursor: clickable ? 'pointer' : 'default', transition:'background 0.15s, border-color 0.15s' }}
      onMouseEnter={clickable ? e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple-glow)'; (e.currentTarget as HTMLElement).style.background = 'rgba(192,132,252,0.06)'; } : undefined}
      onMouseLeave={clickable ? e => { (e.currentTarget as HTMLElement).style.borderColor = ok ? 'rgba(74,222,128,0.25)' : 'var(--border)'; (e.currentTarget as HTMLElement).style.background = ok ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.02)'; } : undefined}
    >
      <span style={{ fontSize:18.5 }}>{type === 'drop' ? (PALIER_DROPS.find(d => d.id === id)?.icon ?? '📦') : '👤'}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color: ok ? 'var(--text)' : 'var(--text-dim)' }}>{label}</div>
        {type === 'drop' && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>
            {PALIER_DROPS.find(d => d.id === id)?.description}
          </div>
        )}
        {type !== 'drop' && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color: maxed ? 'var(--text-dim)' : '#f87171' }}>
            {maxed
              ? 'Consommé depuis l\'inventaire champions — ton exemplaire 7★ reste dans ta collection'
              : 'Nécessite le champion maxé (7★) dans ta collection'}
          </div>
        )}
        {clickable && (
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--purple-glow)', marginTop:2 }}>
            → {expDef!.name}
          </div>
        )}
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:16.5, color: ok ? '#4ade80' : '#f87171' }}>
          {have} / {quantity}
        </div>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color: ok ? '#4ade80' : '#f87171', fontWeight:700 }}>
          {ok ? '✓ OK' : (maxed ? '✗ INSUFFISANT' : '✗ NON MAXÉ')}
        </div>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: CraftRecipe }) {
  const { canCraft, craftRecipe, getRunPeakPalier, collection } = useGameStore();
  const [expanded, setExpanded] = useState(false);

  const locked = getRunPeakPalier() < recipe.palierRequired;
  const { ok } = canCraft(recipe.id);
  const alreadyOwned = recipe.reward.type === 'character' && recipe.reward.characterId
    ? !!collection[recipe.reward.characterId] : false;

  const rewardTpl = recipe.reward.characterId ? CHARACTER_POOL.find(c => c.id === recipe.reward.characterId) : null;
  const rewardCfg = rewardTpl ? RARITY_CONFIG[rewardTpl.rarity] : null;

  return (
    <div className="panel" style={{
      borderColor: ok ? 'rgba(147,51,234,0.5)' : alreadyOwned ? 'rgba(74,222,128,0.3)' : 'var(--border)',
      boxShadow: ok ? '0 0 24px rgba(147,51,234,0.2)' : 'none',
      opacity: locked ? 0.5 : 1,
      position:'relative', overflow:'hidden',
    }}>
      {ok && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,var(--purple-hi),transparent)' }} />}

      {/* Header recette */}
      <div style={{ padding:'16px 18px', cursor:'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{
            width:52, height:52, flexShrink:0,
            background: rewardCfg ? `${rewardCfg.color}18` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${rewardCfg ? rewardCfg.color+'44' : 'var(--border)'}`,
            borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26.8, boxShadow: rewardCfg && ok ? `0 0 16px ${rewardCfg.glow}44` : 'none',
          }}>
            {recipe.icon}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:'var(--f-title)', fontSize:15.5, color: ok ? 'var(--purple-glow)' : 'var(--text)', letterSpacing:1 }}>
                {recipe.name}
              </span>
              {rewardTpl && rewardCfg && (
                <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:rewardCfg.color, background:`${rewardCfg.color}15`, border:`1px solid ${rewardCfg.color}33`, borderRadius:4, padding:'2px 8px' }}>
                  {rewardTpl.rarity}
                </span>
              )}
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>{recipe.description}</div>
          </div>
          <div style={{ fontSize:14.4, color:'var(--text-dim)', flexShrink:0, paddingTop:4 }}>{expanded ? '▲' : '▼'}</div>
        </div>

        {/* Statut rapide */}
        <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
          {alreadyOwned
            ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#4ade80', fontWeight:700 }}>✅ Déjà forgé</div>
            : locked
              ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', fontWeight:700 }}>🔒 Palier {recipe.palierRequired} requis</div>
              : ok
                ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--purple-glow)', fontWeight:700, animation:'ultraPulse 1.5s ease-in-out infinite' }}>✦ PRÊT À FORGER</div>
                : <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', fontWeight:700 }}>⚗ {recipe.ingredients.length} ingrédients requis</div>
          }
        </div>
      </div>

      {/* Détails (expandable) */}
      {expanded && (
        <div style={{ padding:'0 18px 18px', borderTop:'1px solid var(--border)', paddingTop:14, display:'flex', flexDirection:'column', gap:12 }}>
          {/* Ingrédients */}
          <div>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:1.5, marginBottom:8 }}>INGRÉDIENTS REQUIS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {recipe.ingredients.map((ing, i) => (
                <IngredientRow key={i} type={ing.type} id={ing.id} quantity={ing.quantity} label={ing.label} />
              ))}
            </div>
          </div>

          {/* Lore */}
          <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.5)', fontStyle:'italic', lineHeight:1.6 }}>
            {recipe.lore}
          </div>

          {/* Comment obtenir */}
          {!ok && !alreadyOwned && !locked && (
            <div style={{ background:'rgba(147,51,234,0.06)', border:'1px solid rgba(147,51,234,0.2)', borderRadius:8, padding:'10px 14px' }}>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--purple-glow)', letterSpacing:1, marginBottom:6 }}>
                💡 COMMENT OBTENIR LES INGRÉDIENTS
              </div>
              {recipe.ingredients.map((ing, i) => {
                if (ing.type === 'drop') {
                  const drop = PALIER_DROPS.find(d => d.id === ing.id);
                  const expDef = drop ? EXPEDITION_DEFS.find(x => x.rewards.dropId === ing.id) : null;
                  return drop ? (
                    <div key={i}
                      onClick={expDef ? () => useGameStore.getState().focusExpedition(expDef.id) : undefined}
                      style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginBottom:3, cursor: expDef ? 'pointer' : 'default', textDecoration: expDef ? 'underline' : 'none', textDecorationColor: 'rgba(192,132,252,0.4)' }}>
                      {drop.icon} <strong style={{ color:'var(--text-sub)' }}>{drop.name}</strong> → {expDef ? expDef.name : `Expédition palier ${drop.palier}`} ({drop.universName})
                    </div>
                  ) : null;
                }
                return (
                  <div key={i} style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginBottom:3 }}>
                    👤 <strong style={{ color:'var(--text-sub)' }}>{ing.label}</strong> → Obtiens le personnage via Gacha, puis re-tirez-le pour avoir un doublon
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton craft */}
          {!alreadyOwned && !locked && (
            <button
              onClick={() => craftRecipe(recipe.id)}
              disabled={!ok}
              className={ok ? 'btn-primary' : 'btn-secondary'}
              style={{ padding:'12px', fontSize:14.4, display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
              <span>⚗ FORGER</span>
              <span style={{ fontFamily:'var(--f-ui)', fontSize:12.4, opacity:0.7 }}>{recipe.reward.icon} {recipe.reward.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WeaponFusionCard({ rarity }: { rarity: Rarity }) {
  const { equipmentInventory, fuseSpecialWeapons } = useGameStore();
  const [lastResult, setLastResult] = useState<string | null>(null);

  const cfg = RARITY_CONFIG[rarity];
  const pool = getSpecialWeaponGroup(rarity);
  const qty = pool.reduce((sum, item) => sum + (equipmentInventory[item.id] ?? 0), 0);
  const maxFusions = Math.floor(qty / SPECIAL_WEAPON_FUSION_COST);

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
    <div className="panel" style={{ padding:'16px 18px', borderColor:`${cfg.color}40` }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:44, height:44, flexShrink:0, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:22, background:`${cfg.color}18`, border:`1px solid ${cfg.color}44`,
        }}>
          ⚔️
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:14.4, color:cfg.color, letterSpacing:1 }}>Armes {cfg.label}</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>
            {qty} arme{qty !== 1 ? 's' : ''} spéciale{qty !== 1 ? 's' : ''} en stock ({pool.length} arme{pool.length !== 1 ? 's' : ''} possible{pool.length !== 1 ? 's' : ''} en sortie)
          </div>
        </div>
        <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18, color: maxFusions > 0 ? '#4ade80' : 'var(--text-muted)', flexShrink:0 }}>
          {maxFusions} fusion{maxFusions !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
        <button
          onClick={() => doFuse(1)}
          disabled={maxFusions < 1}
          className={maxFusions >= 1 ? 'btn-primary' : 'btn-secondary'}
          style={{ padding:'8px 14px', fontSize:12.4 }}>
          Fusionner ×{SPECIAL_WEAPON_FUSION_COST} → 1
        </button>
        {maxFusions > 1 && (
          <button onClick={() => doFuse(maxFusions)} className="btn-secondary" style={{ padding:'8px 14px', fontSize:12.4 }}>
            Fusionner ×{maxFusions} (max)
          </button>
        )}
      </div>

      {lastResult && (
        <div style={{ marginTop:10, fontFamily:'var(--f-ui)', fontSize:12, color:cfg.color, background:`${cfg.color}10`, border:`1px solid ${cfg.color}30`, borderRadius:8, padding:'8px 12px' }}>
          {lastResult}
        </div>
      )}
    </div>
  );
}

export function ForgePage() {
  const { expeditionDropInventory: dropInventory } = useGameStore();
  const [tab, setTab] = useState<'recipes' | 'inventory' | 'weapons'>('recipes');

  const ownedDrops = PALIER_DROPS.filter(d => (dropInventory[d.id] ?? 0) > 0);

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div className="panel" style={{ padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
            <div style={{ width:4, height:18, background:'linear-gradient(180deg,#e879f9,#c084fc)', borderRadius:2, boxShadow:'0 0 8px #e879f9' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:700, color:'#e879f9', letterSpacing:'2px' }}>FORGE ⚗</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)' }}>
            Combine des drops rares récoltés en expédition pour forger des personnages uniques
          </div>
        </div>

        {/* Onglets */}
        <div style={{ display:'flex', gap:8 }}>
          {([
            { k:'recipes'   as const, label:`⚗ RECETTES (${CRAFT_RECIPES.length})` },
            { k:'weapons'   as const, label:'⚔ FUSION D\'ARMES' },
            { k:'inventory' as const, label:`🎒 MES DROPS (${ownedDrops.length})` },
          ]).map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ padding:'8px 16px', borderRadius:8, cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4,
                background: tab===t.k ? 'rgba(232,121,249,0.15)' : 'var(--bg-card)',
                border: `1px solid ${tab===t.k ? 'rgba(232,121,249,0.4)' : 'var(--border)'}`,
                color: tab===t.k ? '#e879f9' : 'var(--text-dim)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'recipes' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {CRAFT_RECIPES.map(r => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        ) : tab === 'weapons' ? (
          /* ── Fusion d'armes spéciales ── */
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="panel" style={{ padding:'14px 16px', fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)', lineHeight:1.6 }}>
              Fusionne {SPECIAL_WEAPON_FUSION_COST} armes spéciales (liées à un personnage) d&apos;une même rareté pour obtenir une arme spéciale <strong style={{ color:'var(--text)' }}>aléatoire de cette même rareté</strong> — pratique pour recycler les doublons d&apos;armes de persos déjà possédées. Contrairement à la fusion d&apos;équipement, la rareté ne change pas, d&apos;où un coût réduit.
            </div>
            {SPECIAL_WEAPON_FUSION_RARITIES.map(r => <WeaponFusionCard key={r} rarity={r} />)}
          </div>
        ) : (
          /* ── Inventaire drops ── */
          <div>
            {ownedDrops.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontFamily:'var(--f-ui)', fontSize:13.4 }}>
                Aucun drop pour l&apos;instant. Lance des expéditions pour récolter des objets rares !
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
                {PALIER_DROPS.map(drop => {
                  const count = dropInventory[drop.id] ?? 0;
                  if (count === 0) return null;
                  const expDef = EXPEDITION_DEFS.find(x => x.rewards.dropId === drop.id);
                  return (
                    <div key={drop.id} className="panel"
                      onClick={expDef ? () => useGameStore.getState().focusExpedition(expDef.id) : undefined}
                      style={{ padding:'14px 16px', borderColor:'rgba(192,132,252,0.25)', cursor: expDef ? 'pointer' : 'default', transition:'transform 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={expDef ? e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(192,132,252,0.15)'; } : undefined}
                      onMouseLeave={expDef ? e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } : undefined}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:28.8 }}>{drop.icon}</span>
                        <div>
                          <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24.7, color:'#c084fc', lineHeight:1 }}>{count}</div>
                          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:1 }}>EN STOCK</div>
                        </div>
                      </div>
                      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:'var(--text)', marginBottom:3 }}>{drop.name}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', lineHeight:1.4 }}>{drop.description}</div>
                      <div style={{ marginTop:6, fontFamily:'var(--f-ui)', fontSize:12, color:'var(--purple-glow)', fontWeight:700 }}>
                        📍 {drop.universName} — Palier {drop.palier}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
