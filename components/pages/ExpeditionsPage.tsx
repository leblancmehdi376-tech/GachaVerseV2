'use client';
import { useState, useEffect, useRef } from 'react';
import { useExpeditionStore, ActiveExpedition } from '@/store/expeditionStore';
import { useGameStore } from '@/store/gameStore';
import { EXPEDITION_DEFS, ExpeditionDef, getCharacterExpeditionDps, getExpeditionTeamDps, getPalierDrop, hasRealUniverse, getDropTiers, computeDropAttempts, dpsForDropQty } from '@/lib/game/expeditions';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG, getPrevRarity } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { makeInstanceKey, parseInstanceKey } from '@/lib/game/editions';
import { AFFINITY_CONFIG, getAffinityForId } from '@/lib/game/affinities';

/* ── helpers ────────────────────────────────────────────────────────────── */
function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2,'0')}s`;
  return `${s}s`;
}

function fmtDurationLabel(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h >= 24) return `${Math.floor(h/24)}j ${h%24}h`;
  if (h > 0)   return m > 0 ? `${h}h${m}` : `${h}h`;
  return `${m}m`;
}

/* ── Countdown ──────────────────────────────────────────────────────────── */
function Countdown({ endTime }: { endTime: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const rem = Math.max(0, endTime - Date.now());
  return <span style={{ fontFamily:'var(--f-num)', fontWeight:700 }}>{fmtDuration(rem / 1000)}</span>;
}

/* ── Character selector modal ───────────────────────────────────────────── */
function CharSelector({ def, onConfirm, onClose }: {
  def: ExpeditionDef;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { collection, equippedTeam } = useGameStore();
  const { isCharOnExpedition, getExpeditionAffinity } = useExpeditionStore();
  const [selected, setSelected] = useState<string[]>([]);

  // Possédé si N'IMPORTE QUELLE édition l'est (Base/Or/Diamant) — sinon un
  // perso possédé uniquement en shiny serait invisible pour les expéditions.
  // Trié par DPS décroissant (meilleur d'abord).
  const owned = CHARACTER_POOL.filter(c => !c.isHero &&
    (['base', 'gold', 'diamond'] as const).some(ed => !!collection[makeInstanceKey(c.id, ed)]))
    .sort((a, b) => getCharacterExpeditionDps(collection, b.id) - getCharacterExpeditionDps(collection, a.id));
  const equippedPure = equippedTeam.filter((t): t is string => !!t).map(t => parseInstanceKey(t).templateId);
  const score = getExpeditionTeamDps(collection, selected);
  const reqMet = score >= def.minTeamDps;

  // Tentatives de drop (voir computeDropAttempts dans expeditions.ts) : au-delà
  // du seuil minTeamDps, chaque palier supplémentaire (×10 DPS) accorde 1
  // tentative de drop de plus. La barre visualise la progression VERS LE
  // PROCHAIN palier — elle se "reset" à chaque fois qu'un palier est franchi.
  const hasDrop = !!def.rewards.dropId;
  const baseAttempts = def.rewards.dropQuantity ?? 1;
  const cap = def.rewards.dropQuantityCap;
  const attempts = hasDrop && reqMet ? computeDropAttempts(def, score) : 0;
  const atCap = hasDrop && cap !== undefined && attempts >= cap;
  const bonusRolls = Math.max(0, attempts - baseAttempts);

  // Bornes du segment de barre actuellement affiché.
  let segLower = 0;
  let segUpper = def.minTeamDps;
  if (hasDrop && reqMet && !atCap) {
    segLower = dpsForDropQty(def, attempts);
    segUpper = dpsForDropQty(def, attempts + 1);
  } else if (hasDrop && atCap) {
    segLower = dpsForDropQty(def, attempts);
    segUpper = segLower; // plafonné : plus de progression à afficher
  }
  const segProgress = atCap ? 100 : Math.min(Math.max(((score - segLower) / (segUpper - segLower)) * 100, 0), 100);

  // Flash "+1 drop" quand on vient de franchir un palier de tentative.
  const [justGainedRoll, setJustGainedRoll] = useState(false);
  const prevBonusRolls = useRef(bonusRolls);
  useEffect(() => {
    if (bonusRolls > prevBonusRolls.current) {
      setJustGainedRoll(true);
      const t = setTimeout(() => setJustGainedRoll(false), 1200);
      prevBonusRolls.current = bonusRolls;
      return () => clearTimeout(t);
    }
    prevBonusRolls.current = bonusRolls;
  }, [bonusRolls]);

  // Exigence d'univers (ou de type pour les expéditions sans univers de perso
  // réel, ex: Atelier/Chasse/Mystique) : TOUTE l'équipe envoyée doit correspondre.
  const requiresRealUniverse = hasRealUniverse(def);
  const requiredAffinity = requiresRealUniverse ? null : getExpeditionAffinity(def.id);
  const matchesRequirement = (tplId: string) =>
    requiresRealUniverse
      ? CHARACTER_POOL.find(c => c.id === tplId)?.universe === def.universe
      : getAffinityForId(tplId) === requiredAffinity;

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
        : prev.length < def.slots ? [...prev, id]
        : prev
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ width:'100%', maxWidth:640, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:'var(--purple-glow)', letterSpacing:2 }}>{def.icon} {def.name}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginTop:2 }}>
              Sélectionne jusqu&apos;à {def.slots} personnage{def.slots > 1 ? 's' : ''} · DPS requis : {formatNumber(def.minTeamDps)}
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
              {requiresRealUniverse
                ? <>Équipe 100% <span style={{ color:'var(--purple-glow)', fontWeight:700 }}>{def.universe}</span></>
                : <>Équipe 100% type <span style={{ color:AFFINITY_CONFIG[requiredAffinity!].color, fontWeight:700 }}>{AFFINITY_CONFIG[requiredAffinity!].icon} {AFFINITY_CONFIG[requiredAffinity!].label}</span></>
              }
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:20.6 }}>✕</button>
        </div>

        {/* Score */}
        <div style={{ padding:'10px 22px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div className="prog-track" style={{ flex:1 }}>
              <div className="prog-fill" style={{ width:`${segProgress}%`,
                transition: justGainedRoll ? 'none' : undefined,
                background: reqMet ? 'linear-gradient(90deg,#166534,#4ade80)' : undefined,
                boxShadow: reqMet ? (justGainedRoll ? '0 0 16px #4ade80cc' : '0 0 8px #4ade8088') : undefined }} />
            </div>
            <span style={{ fontFamily:'var(--f-num)', fontSize:14.4, color: reqMet ? '#4ade80' : 'var(--text-dim)', whiteSpace:'nowrap' }}>
              {formatNumber(score)} / {atCap ? formatNumber(segLower) : formatNumber(segUpper)}
            </span>
          </div>
          {hasDrop && reqMet && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontFamily:'var(--f-ui)', fontSize:12 }}>
              <span style={{ color:'#c084fc', transform: justGainedRoll ? 'scale(1.15)' : 'scale(1)', transition:'transform 0.25s' }}>
                🎲 {atCap ? `${attempts} tentatives (MAX)` : `${attempts} tentative${attempts > 1 ? 's' : ''} de drop`}
              </span>
              {justGainedRoll && (
                <span style={{ color:'#4ade80', fontWeight:700 }}>+1 tentative de drop !</span>
              )}
            </div>
          )}
        </div>

        {/* Liste persos */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {owned.map(tpl => {
            const cfg = RARITY_CONFIG[tpl.rarity];
            const onExpedition = isCharOnExpedition(tpl.id);
            const inTeam = equippedPure.includes(tpl.id);
            const mismatched = !matchesRequirement(tpl.id);
            const isSelected = selected.includes(tpl.id);
            const disabled = onExpedition || inTeam || mismatched || (!isSelected && selected.length >= def.slots);
            return (
              <button key={tpl.id} onClick={() => !disabled && toggle(tpl.id)}
                style={{ padding:'10px 8px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
                  background: isSelected ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? cfg.color+'66' : 'var(--border)'}`,
                  opacity: disabled ? 0.4 : 1,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  boxShadow: isSelected ? `0 0 14px ${cfg.glow}44` : 'none',
                  transition:'all 0.15s' }}>
                <span style={{ fontSize:20.6 }}>{isSelected ? '✅' : '👤'}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color: isSelected ? cfg.color : 'var(--text)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:cfg.color, background:`${cfg.color}15`, border:`1px solid ${cfg.color}33`, borderRadius:4, padding:'1px 6px' }}>{tpl.rarity}</div>
                <span style={{ fontFamily:'var(--f-num)', fontSize:12, color:'var(--text-dim)' }}>⚡ {formatNumber(getCharacterExpeditionDps(collection, tpl.id))}</span>
                {onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#fb923c' }}>EN MISSION</span>}
                {inTeam && !onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#60a5fa' }}>DANS L&apos;ÉQUIPE</span>}
                {mismatched && !onExpedition && !inTeam && (
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#f87171' }}>
                    {requiresRealUniverse ? '✗ MAUVAIS UNIVERS' : '✗ MAUVAIS TYPE'}
                  </span>
                )}
              </button>
            );
          })}
          {owned.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--f-ui)', fontSize:12.4, padding:24 }}>
              Aucun personnage disponible. Obtenus via le Gacha !
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding:'10px 20px', fontSize:13.4, cursor:'pointer' }}>ANNULER</button>
          <button onClick={() => { if (selected.length > 0 && reqMet) onConfirm(selected); }}
            className="btn-primary"
            disabled={selected.length === 0 || !reqMet}
            style={{ padding:'10px 24px', fontSize:13.4 }}>
            LANCER ({selected.length}/{def.slots})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Carte expédition active ────────────────────────────────────────────── */
function ActiveExpeditionCard({ exp }: { exp: ActiveExpedition }) {
  const { claimExpedition, cancelExpedition } = useExpeditionStore();
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(id); }, []);

  const def = EXPEDITION_DEFS.find(d => d.id === exp.defId);
  if (!def) return null;

  const done = Date.now() >= exp.endTime;
  const pct  = Math.min(((Date.now() - exp.startTime) / (exp.endTime - exp.startTime)) * 100, 100);

  return (
    <div className="panel" style={{ padding:'14px 16px', borderColor: done ? 'rgba(74,222,128,0.4)' : 'var(--border)', boxShadow: done ? '0 0 20px rgba(74,222,128,0.12)' : 'none', transition:'all 0.3s' }}>
      {done && <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:'linear-gradient(90deg,transparent,#4ade80,transparent)', borderRadius:'8px 8px 0 0' }} />}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ fontSize:28.8, flexShrink:0 }}>{def.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14.4, color:'var(--text)', marginBottom:3 }}>{def.name}</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginBottom:8 }}>{def.universe}</div>
          {/* Persos */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
            {exp.characterIds.map(cid => {
              const tpl = CHARACTER_POOL.find(c => c.id === cid);
              if (!tpl) return null;
              const cfg = RARITY_CONFIG[tpl.rarity];
              return (
                <div key={cid} style={{ display:'flex', alignItems:'center', gap:4, background:`${cfg.color}12`, border:`1px solid ${cfg.color}33`, borderRadius:6, padding:'2px 8px' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:cfg.color }}>{tpl.name}</span>
                </div>
              );
            })}
          </div>
          {/* Barre */}
          <div className="prog-track" style={{ marginBottom:5 }}>
            <div className="prog-fill" style={{ width:`${pct}%`,
              background: done ? 'linear-gradient(90deg,#166534,#4ade80)' : undefined,
              boxShadow: done ? '0 0 8px #4ade8066' : undefined,
              transition:'width 0.5s linear' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color: done ? '#4ade80' : 'var(--text-dim)', fontWeight:700 }}>
              {done ? '✅ TERMINÉE !' : <Countdown endTime={exp.endTime} />}
            </span>
            {def.rewards.dropId && (() => {
              const drop = getPalierDrop(def.rewards.dropId);
              return drop ? (
                <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--gold)' }}>
                  {drop.icon} {drop.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>
        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
          {done
            ? <button onClick={() => claimExpedition(exp.id)} className="btn-primary" style={{ padding:'8px 16px', fontSize:12.4 }}>RÉCLAMER</button>
            : <button onClick={() => cancelExpedition(exp.id)} className="btn-secondary" style={{ padding:'6px 12px', fontSize:12, cursor:'pointer' }}>ANNULER</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ── Carte expédition disponible ────────────────────────────────────────── */
function ExpeditionCard({ def, onSelect, busy, highlighted }: { def: ExpeditionDef; onSelect: () => void; busy: boolean; highlighted?: boolean }) {
  const { getRunPeakPalier, unlockedEquipRarities, unlockedEquipDropRarities } = useGameStore();
  const { getExpeditionAffinity } = useExpeditionStore();
  const palierLocked = getRunPeakPalier() < def.palierRequired;
  const requiresRealUniverse = hasRealUniverse(def);
  const requiredAffinity = requiresRealUniverse ? null : getExpeditionAffinity(def.id);

  // Déblocage one-shot déjà obtenu : impossible de relancer l'expédition
  // (voir expeditionStore.canStart, qui applique la même règle côté logique).
  const alreadyUnlocked =
    (!!def.unlocksEquipRarity && unlockedEquipRarities.includes(def.unlocksEquipRarity)) ||
    (!!def.unlocksEquipDropRarity && unlockedEquipDropRarities.includes(def.unlocksEquipDropRarity));

  // Déblocages d'équipement (fusion/drop) : rareté suivante inaccessible tant
  // que la précédente n'est pas terminée (voir expeditionStore.canStart).
  let sequenceLockReason: string | null = null;
  if (!alreadyUnlocked && def.unlocksEquipRarity) {
    const prev = getPrevRarity(def.unlocksEquipRarity);
    if (prev && !unlockedEquipRarities.includes(prev)) sequenceLockReason = `Atelier ${RARITY_CONFIG[prev].label} requis`;
  } else if (!alreadyUnlocked && def.unlocksEquipDropRarity) {
    const prev = getPrevRarity(def.unlocksEquipDropRarity);
    if (prev && !unlockedEquipDropRarities.includes(prev)) sequenceLockReason = `Chasse ${RARITY_CONFIG[prev].label} requise`;
  }

  const locked = palierLocked || !!sequenceLockReason;
  const dimmed = (locked || busy) && !alreadyUnlocked;

  return (
    <div id={`exp-${def.id}`} className="panel" style={{ padding:'16px', opacity: alreadyUnlocked ? 0.7 : dimmed ? 0.5 : 1, position:'relative', overflow:'hidden',
      borderColor: highlighted ? 'var(--purple-glow)' : alreadyUnlocked ? 'rgba(74,222,128,0.35)' : undefined,
      boxShadow: highlighted ? '0 0 0 2px var(--purple-glow), 0 0 30px rgba(192,132,252,0.5)' : undefined,
      transition:'box-shadow 0.3s, border-color 0.3s' }}>
      {def.isFarming && (
        <div style={{ position:'absolute', top:8, right:8, fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--gold)', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:4, padding:'2px 7px', letterSpacing:1 }}>
          ♻ RETOUR
        </div>
      )}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        <div style={{ fontSize:33, flexShrink:0 }}>{def.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:14.4, color:'var(--text)', letterSpacing:1, marginBottom:3 }}>{def.name}</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:5, display:'flex', alignItems:'center', gap:5,
            color: requiresRealUniverse ? 'var(--purple-glow)' : AFFINITY_CONFIG[requiredAffinity!].color }}>
            {requiresRealUniverse ? def.universe : <>{AFFINITY_CONFIG[requiredAffinity!].icon} Type {AFFINITY_CONFIG[requiredAffinity!].label}</>}
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', lineHeight:1.5, marginBottom:10 }}>{def.description}</div>
          {/* Stats */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
            {[
              { icon:'⏱', val: fmtDurationLabel(def.duration), label:'Durée' },
              { icon:'👥', val: `×${def.slots}`, label:'Slots' },
              { icon:'⚡', val: formatNumber(def.minTeamDps), label:'DPS min' },
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px' }}>
                <span style={{ fontSize:12 }}>{s.icon}</span>
                <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:12.4, color:'var(--text)' }}>{s.val}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)' }}>{s.label}</span>
              </div>
            ))}
          </div>
          {/* Récompenses */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--gold)', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:6, padding:'3px 8px' }}>
              🪙 {formatNumber(def.rewards.coinsMin)}–{formatNumber(def.rewards.coinsMax)}
            </div>
            {def.rewards.gemsMin !== undefined && (
              <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--cyan-hi)', background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', borderRadius:6, padding:'3px 8px' }}>
                💎 {def.rewards.gemsMin}–{def.rewards.gemsMax}
              </div>
            )}
            {def.rewards.dropId && (() => {
              const drop = getPalierDrop(def.rewards.dropId);
              return drop ? (
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#c084fc', background:'rgba(192,132,252,0.1)', border:'1px solid rgba(192,132,252,0.25)', borderRadius:6, padding:'3px 8px' }}>
                  ✦ {drop.icon} {drop.name} ({Math.round((def.rewards.dropChance ?? 0) * 100)}%)
                </div>
              ) : null;
            })()}
          </div>
          {/* Paliers de drop selon le DPS d'équipe — pour que le joueur sache */}
          {/* quel DPS viser pour débloquer 2 ou 3 tentatives de drop (chacune */}
          {/* à dropChance, pas une quantité garantie). */}
          {(() => {
            const tiers = getDropTiers(def);
            if (tiers.length <= 1) return null;
            return (
              <div style={{ marginBottom:10, padding:'6px 10px', background:'rgba(192,132,252,0.05)', border:'1px solid rgba(192,132,252,0.15)', borderRadius:6 }}>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginBottom:3 }}>Tentatives de drop (DPS d&apos;équipe) :</div>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {tiers.map(t => (
                    <span key={t.qty} style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#c084fc' }}>
                      {t.qty} dés dès <b>{formatNumber(Math.round(t.dps))}</b>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          {alreadyUnlocked
            ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#4ade80', fontWeight:700 }}>✅ Déjà débloqué</div>
            : locked
              ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', fontWeight:700 }}>
                  🔒 {palierLocked ? `Palier ${def.palierRequired} requis` : sequenceLockReason}
                </div>
              : busy
                ? <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-muted)', fontWeight:700 }}>⏳ Une expédition est déjà en cours</div>
                : <button onClick={onSelect} className="btn-primary" style={{ padding:'9px 20px', fontSize:13.4 }}>ENVOYER ✦</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
// Catégorisation à 3 onglets : spécial (drapeau dédié) > équipement (ateliers/
// chasses) > forge (tout le reste par défaut — items de craft, farm palier,
// expéditions génériques sans drop).
const isEquipUnlock = (d: ExpeditionDef) => !!d.unlocksEquipRarity || !!d.unlocksEquipDropRarity;
type ExpTab = 'forge' | 'equipment' | 'special';
function tabOf(d: ExpeditionDef): ExpTab {
  if (d.isSpecialItem) return 'special';
  if (isEquipUnlock(d)) return 'equipment';
  return 'forge';
}

export function ExpeditionsPage() {
  const { active, getFinished, getMaxActiveExpeditions } = useExpeditionStore();
  const { focusedExpeditionId, focusExpedition } = useGameStore();
  const [selectedDef, setSelectedDef] = useState<ExpeditionDef | null>(null);
  const [filter, setFilter] = useState<ExpTab>('forge');
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const runningExp = active.filter(e => !e.claimed);
  const finished   = getFinished();
  const maxActive  = getMaxActiveExpeditions();

  const filtered = EXPEDITION_DEFS
    .filter(d => tabOf(d) === filter)
    .sort((a, b) => a.minTeamDps - b.minTeamDps || a.duration - b.duration);

  // Arrivée depuis la Forge (clic sur un ingrédient) : bascule sur le bon
  // onglet, scroll jusqu'à la carte et la met en surbrillance quelques secondes.
  useEffect(() => {
    if (!focusedExpeditionId) return;
    const def = EXPEDITION_DEFS.find(d => d.id === focusedExpeditionId);
    if (!def) { focusExpedition(null); return; }
    setFilter(tabOf(def));
    setHighlightId(def.id);
    const scrollTimer = setTimeout(() => {
      document.getElementById(`exp-${def.id}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
    }, 50);
    const clearTimer = setTimeout(() => setHighlightId(null), 3000);
    focusExpedition(null);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [focusedExpeditionId, focusExpedition]);

  return (
    <div style={{ height:'100%', overflowY:'auto', padding:'24px 28px' }}>
      {selectedDef && (
        <CharSelector
          def={selectedDef}
          onConfirm={(ids) => {
            useExpeditionStore.getState().startExpedition(selectedDef.id, ids);
            setSelectedDef(null);
          }}
          onClose={() => setSelectedDef(null)}
        />
      )}

      <div style={{ maxWidth:1000, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div className="panel" style={{ padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
              <div style={{ width:4, height:18, background:'linear-gradient(180deg,#fb923c,#f59e0b)', borderRadius:2, boxShadow:'0 0 8px #fb923c' }} />
              <span style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:700, color:'#fb923c', letterSpacing:'2px' }}>EXPÉDITIONS</span>
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)' }}>
              Envoie tes personnages récolter des ressources et des objets rares
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {finished.length > 0 && (
              <div className="anim-ultra" style={{ background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:8, padding:'6px 14px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12.4, color:'#4ade80' }}>
                ✅ {finished.length} terminée{finished.length > 1 ? 's' : ''}
              </div>
            )}
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px', fontFamily:'var(--f-num)', fontWeight:700, fontSize:12.4, color:'var(--purple-glow)' }}>
              {runningExp.length} / {maxActive} active
            </div>
          </div>
        </div>

        {/* Expéditions actives */}
        {runningExp.length > 0 && (
          <div>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:10 }}>EN COURS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {runningExp.map(e => <ActiveExpeditionCard key={e.id} exp={e} />)}
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display:'flex', gap:8 }}>
          {[
            { k:'forge'     as const, label:'⚒️ ITEM DE FORGE'    },
            { k:'equipment' as const, label:'🛠️ ATELIER ÉQUIPEMENT' },
            { k:'special'   as const, label:'🔷 OBJETS SPÉCIAUX'  },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              style={{ padding:'7px 16px', borderRadius:8, cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, letterSpacing:0.5, transition:'all 0.15s',
                background: filter===f.k ? 'rgba(251,146,60,0.15)' : 'var(--bg-card)',
                border: `1px solid ${filter===f.k ? 'rgba(251,146,60,0.4)' : 'var(--border)'}`,
                color: filter===f.k ? '#fb923c' : 'var(--text-dim)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste expéditions */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12 }}>
          {filtered.map(def => (
            <ExpeditionCard key={def.id} def={def} busy={runningExp.length >= maxActive} onSelect={() => setSelectedDef(def)} highlighted={highlightId === def.id} />
          ))}
        </div>

      </div>
    </div>
  );
}
