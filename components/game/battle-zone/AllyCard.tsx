'use client';
import { useGameStore } from '@/store/gameStore';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { formatNumber } from '@/lib/game/format';
import { RARITY_CONFIG } from '@/types/game';
import { parseInstanceKey } from '@/lib/game/editions';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef } from '@/lib/game/ultimates';
import { SkillTooltip } from '@/components/ui/SkillTooltip';

// ── Carte alliée style gacha ──────────────────────────────────────────────
export function AllyCard({ templateId, onManage }: { templateId: string; onManage: () => void }) {
  const { collection, activateCharacterUltimate, getCharDpsBreakdown } = useGameStore();
  const { ultCooldowns: cooldowns, ultActiveUlts: activeUlts } = useGameStore();
  const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/nom/ulti partagés entre éditions)
  const tpl   = getCharacterById(pureId);
  const owned = collection[templateId];

  // Slot vide
  if (!tpl || !owned) return (
    <div onClick={onManage} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', opacity:0.5 }}>
      <div style={{ width:'100%', aspectRatio:'306 / 517', border:'2px dashed rgba(255,255,255,0.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.02)', flexDirection:'column', gap:6 }}>
        <span style={{ fontSize:22.7, color:'rgba(255,255,255,0.2)' }}>+</span>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.2)', fontWeight:600, letterSpacing:1 }}>VIDE</span>
      </div>
    </div>
  );

  const cd       = cooldowns[templateId] ?? 0;
  const ready    = cd === 0;
  const isActive = activeUlts.some(a => a.templateId === templateId);
  const mins     = Math.floor(cd / 60);
  const secs     = cd % 60;
  const ultLabel = `${mins}:${String(secs).padStart(2,'0')}`;
  const formIdx  = owned.currentForm;
  const name     = getCharFormName(tpl, formIdx);

  const rc  = RARITY_CONFIG[tpl.rarity];
  const ult = getUltimateDef(pureId);
  const { base, typeMult, final } = getCharDpsBreakdown(templateId);
  const strong = typeMult > 1, weak = typeMult < 1;
  const multCol = strong ? '#4ade80' : weak ? '#f87171' : 'rgba(255,255,255,0.5)';
  const multTxt = typeMult === 1 ? 'OK' : `×${typeMult}`;
  const finalCol = strong ? '#4ade80' : weak ? '#f87171' : 'var(--green)';

  return (
    <div style={{
      width: '100%', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(20,14,40,0.96), rgba(10,8,20,0.96))',
      border: `1.5px solid ${isActive ? '#c084fc' : ready ? '#fbbf24aa' : rc.color + '55'}`,
      boxShadow: isActive ? '0 0 14px #c084fc77' : ready ? `0 0 10px ${rc.glow}44` : '0 3px 12px rgba(0,0,0,0.5)',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}>
      {/* Illustration (le nom est déjà sur la carte) — cliquable pour l'ult, survol = compétence */}
      <SkillTooltip ult={ult}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '306 / 517', cursor: ready ? 'pointer' : 'default' }}
          onClick={() => ready && activateCharacterUltimate(templateId, formIdx)}>
          <CharacterCardThumb templateId={pureId} formIndex={formIdx} name={name} rarity={tpl.rarity} edition={owned.edition}
            width={88} height={149} style={{ border: 'none', boxShadow: 'none', borderRadius: 0, objectFit: 'contain', width: '100%', height: '100%' }} />

          {/* Niveau + rang — overlay haut-gauche */}
          <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 4, padding: '1px 4px' }}>LV{owned.level}</span>
            {owned.rank > 0 && <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 800, color: '#fbbf24', background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 4, padding: '1px 4px' }}>★{owned.rank}</span>}
          </div>

        </div>
      </SkillTooltip>

      {/* Pied : ULTI / BASE / TYPE / DPS — empilés en lignes pleine largeur
          (au lieu d'un badge en overlay sur l'illustration, qui se lisait mal
          une fois superposé à l'art) pour laisser assez de place aux valeurs
          formatées (ex: "447.00T") sans qu'elles se chevauchent, la carte
          faisant seulement 88px de large. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 7px', background: 'rgba(0,0,0,0.32)', borderTop: `1px solid ${rc.color}22` }}>
        <div onClick={() => ready && activateCharacterUltimate(templateId, formIdx)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 4px', marginBottom: 2, borderRadius: 4, cursor: ready ? 'pointer' : 'default',
            background: ready ? 'rgba(88,28,135,0.55)' : 'rgba(255,255,255,0.04)',
            border: ready ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)' }}>
          {!ready && <span style={{ fontSize: 12 }}>⏳</span>}
          <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 12, color: ready ? '#fde68a' : 'rgba(255,255,255,0.55)', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {ready ? 'ULTI PRÊT' : ultLabel}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, flexShrink: 0 }}>BASE</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.8)', lineHeight: 1, whiteSpace: 'nowrap' }}>{formatNumber(base)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5, flexShrink: 0 }}>TYPE</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 900, color: multCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{multTxt}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4, marginTop: 2, paddingTop: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, flexShrink: 0 }}>DPS</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 12, fontWeight: 900, color: finalCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{formatNumber(final)}</span>
        </div>
      </div>
    </div>
  );
}
