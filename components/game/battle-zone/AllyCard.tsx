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
  const { ultCooldowns: cooldowns, ultActiveUlts: activeUlts, ultQueue } = useGameStore();
  const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/nom/ulti partagés entre éditions)
  const tpl   = getCharacterById(pureId);
  const owned = collection[templateId];

  // Slot vide — largeur alignée sur .ally-card-illu pour garder la même
  // hauteur que les cartes occupées (sinon le placeholder s'étirait sur
  // toute la largeur élargie du slot en affichage large, donnant une case
  // bien plus haute que ses voisines remplies).
  if (!tpl || !owned) return (
    <div onClick={onManage} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', opacity:0.5 }}>
      <style>{`
        @media (min-width: 1800px) {
          .ally-card-empty-illu { width: 84px !important; }
        }
      `}</style>
      <div className="ally-card-empty-illu" style={{ width:'100%', aspectRatio:'287 / 458', border:'2px dashed rgba(255,255,255,0.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.02)', flexDirection:'column', gap:6 }}>
        <span style={{ fontSize:24, color:'rgba(255,255,255,0.2)' }}>+</span>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(255,255,255,0.55)', fontWeight:600, letterSpacing:1 }}>VIDE</span>
      </div>
    </div>
  );

  const cd       = cooldowns[templateId] ?? 0;
  const ready    = cd === 0;
  const isActive = activeUlts.some(a => a.templateId === templateId);
  // Position dans la file des ultis stackés (1 = le prochain), 0 = pas en file.
  const queuePos = ultQueue.findIndex(q => q.templateId === templateId) + 1;
  const queued   = queuePos > 0;
  const clickable = ready || queued; // re-cliquer un ulti en file l'annule
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
  const multTxt = typeMult === 1 ? 'OK' : `×${typeMult.toFixed(2)}`;
  const finalCol = strong ? '#4ade80' : weak ? '#f87171' : 'var(--green)';

  return (
    <div className="ally-card-root" style={{
      width: '100%', borderRadius: 7, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(20,14,40,0.96), rgba(10,8,20,0.96))',
      border: `1.5px solid ${isActive ? '#c084fc' : queued ? '#60a5fa' : ready ? '#fbbf24aa' : rc.color + '55'}`,
      boxShadow: isActive ? '0 0 14px #c084fc77' : ready ? `0 0 10px ${rc.glow}44` : '0 3px 12px rgba(0,0,0,0.5)',
      transition: 'box-shadow 0.2s, border-color 0.2s',
      paddingTop: 8,
    }}>
      {/* À partir de 1800px, les infos (+ le badge LV/rang) passent à droite
          de l'illustration (meilleure lisibilité) ; en dessous, on garde
          l'empilement vertical d'origine. */}
      <style>{`
        .ally-card-badge-inline { display: none; }
        .ally-card-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; line-height: 1.1; }
        @media (min-width: 1800px) {
          .ally-card-stat { flex-direction: row; justify-content: space-between; align-items: baseline; gap: 4px; }
          .ally-card-root { flex-direction: row !important; }
          .ally-card-illu { width: 84px !important; flex-shrink: 0; }
          .ally-card-info { flex: 1; border-top: none !important; border-left: 1px solid rgba(255,255,255,0.08); justify-content: center !important; }
          .ally-card-badge-float { display: none !important; }
          .ally-card-badge-inline { display: inline-flex !important; }
        }
      `}</style>

      {/* Illustration + cadre illustré par rareté — la hauteur suit le ratio
          exact du cadre (RARITY_FRAME_RATIO), pas de aspectRatio fixe ici pour
          éviter tout décalage entre ce wrapper et la boîte de CharacterCardThumb. */}
      <SkillTooltip ult={ult}>
        <div className="ally-card-illu" style={{ position: 'relative', width: '100%', cursor: clickable ? 'pointer' : 'default' }}
          onClick={() => clickable && activateCharacterUltimate(templateId, formIdx)}>
          <CharacterCardThumb templateId={pureId} formIndex={formIdx} name={name} rarity={tpl.rarity} edition={owned.edition}
            width={88} height={149} frameOverlay style={{ width: '100%' }} />

          {/* Niveau — flotte au-dessus de l'illustration en dessous de
              1800px ; masqué au-delà (repris par .ally-card-badge-inline,
              placé dans le bloc d'infos à droite). */}
          <div className="ally-card-badge-float" style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', zIndex: 30, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.4)', border: `1px solid ${rc.color}55`, borderRadius: 999, padding: '1px 7px', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>LV{owned.level}</span>
          </div>
        </div>
      </SkillTooltip>

      {/* Pied : ULTI / BASE / TYPE / DPS — empilés en lignes pleine largeur
          (au lieu d'un badge en overlay sur l'illustration, qui se lisait mal
          une fois superposé à l'art). La carte ne fait que ~88px de large :
          chaque stat met son libellé AU-DESSUS de sa valeur (.ally-card-stat)
          pour que les deux tiennent en 14px ; libellé et valeur repassent
          côte à côte au-delà de 1800px, où les infos passent à droite de
          l'illustration via .ally-card-info. */}
      <div className="ally-card-info" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 4px', background: 'rgba(0,0,0,0.32)', borderTop: `1px solid ${rc.color}22` }}>
        {/* Niveau — repris ici pour l'affichage large (voir
            .ally-card-badge-float, masqué au-delà de 1800px). */}
        <div className="ally-card-badge-inline" style={{ alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>LV{owned.level}</span>
        </div>
        <div onClick={() => clickable && activateCharacterUltimate(templateId, formIdx)}
          title={queued ? "En file d'attente — cliquer pour annuler" : undefined}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '3px 4px', marginBottom: 2, borderRadius: 4, cursor: clickable ? 'pointer' : 'default',
            background: queued ? 'rgba(59,130,246,0.35)' : ready ? 'rgba(88,28,135,0.55)' : 'rgba(255,255,255,0.04)',
            border: queued ? '1px solid #60a5fa' : ready ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)' }}>
          {!ready && !queued && <span style={{ fontSize: 14 }}>⏳</span>}
          <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: queued ? '#bfdbfe' : ready ? '#fde68a' : 'rgba(255,255,255,0.55)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            {queued ? `EN FILE #${queuePos}` : ready ? 'ULTI PRÊT' : ultLabel}
          </span>
        </div>
        <div className="ally-card-stat">
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, flexShrink: 0 }}>BASE</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.8)', lineHeight: 1, whiteSpace: 'nowrap' }}>{formatNumber(base)}</span>
        </div>
        <div className="ally-card-stat">
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, flexShrink: 0 }}>TYPE</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 900, color: multCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{multTxt}</span>
        </div>
        <div className="ally-card-stat" style={{ marginTop: 2, paddingTop: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, flexShrink: 0 }}>DPS</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 900, color: finalCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{formatNumber(final)}</span>
        </div>
      </div>
    </div>
  );
}
