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
  // Abonnements limités à CE perso : la carte ne se re-rend que quand son
  // propre état change (niveau, cooldown, file, DPS), pas à chaque tick.
  const owned    = useGameStore(s => s.collection[templateId]);
  const cd       = useGameStore(s => s.ultCooldowns[templateId] ?? 0);
  const isActive = useGameStore(s => s.ultActiveUlts.some(a => a.templateId === templateId));
  // Position dans la file des ultis stackés (1 = le prochain), 0 = pas en file.
  const queuePos = useGameStore(s => s.ultQueue.findIndex(q => q.templateId === templateId) + 1);
  const breakdown = useGameStore(s => s.getCharDpsBreakdown(templateId)); // mis en cache dans le store
  const activateCharacterUltimate = useGameStore(s => s.activateCharacterUltimate);
  const pureId = parseInstanceKey(templateId).templateId; // clé composite -> id pur (art/nom/ulti partagés entre éditions)
  const tpl   = getCharacterById(pureId);

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
        @media (max-width: 820px) {
          .ally-card-empty-illu { width: 72px !important; }
        }
      `}</style>
      <div className="ally-card-empty-illu" style={{ width:'100%', aspectRatio:'287 / 458', border:'2px dashed rgba(255,255,255,0.12)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.02)', flexDirection:'column', gap:6 }}>
        <span style={{ fontSize:24, color:'rgba(255,255,255,0.2)' }}>+</span>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'rgba(255,255,255,0.55)', fontWeight:600, letterSpacing:1 }}>VIDE</span>
      </div>
    </div>
  );

  const ready    = cd === 0;
  const queued   = queuePos > 0;
  const clickable = ready || queued; // re-cliquer un ulti en file l'annule
  const mins     = Math.floor(cd / 60);
  const secs     = cd % 60;
  const ultLabel = `${mins}:${String(secs).padStart(2,'0')}`;
  const formIdx  = owned.currentForm;
  const name     = getCharFormName(tpl, formIdx);

  const rc  = RARITY_CONFIG[tpl.rarity];
  const ult = getUltimateDef(pureId);
  const { base, typeMult, final } = breakdown;
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
      {/* À partir de 1800px, et sur téléphone (≤820px, où les compagnons
          passent en grille 2×2 — voir TeamBar), les infos (+ le badge LV)
          passent à droite de l'illustration ; entre les deux, on garde
          l'empilement vertical d'origine. Sur téléphone la colonne d'infos
          est étroite : libellé du DPS au-dessus de sa valeur, et « ULTI PRÊT »
          peut passer sur deux lignes. */}
      <style>{`
        .ally-card-badge-inline { display: none; }
        .ally-card-stat { display: flex; flex-direction: column; align-items: center; gap: 1px; line-height: 1.1; }
        .ally-card-type-empty { display: none !important; }
        @media (min-width: 1800px), (max-width: 820px) {
          .ally-card-root { flex-direction: row !important; }
          .ally-card-illu { width: 84px !important; flex-shrink: 0; }
          .ally-card-info { flex: 1; min-width: 0; border-top: none !important; justify-content: flex-start !important; padding: 4px 10px 6px !important; }
          .ally-card-type-empty { display: flex !important; visibility: hidden; }
          .ally-card-badge-float { display: none !important; }
          .ally-card-badge-inline { display: inline-flex !important; }
        }
        @media (min-width: 1800px) {
          .ally-card-stat { flex-direction: row; justify-content: space-between; align-items: baseline; gap: 4px; }
        }
        @media (max-width: 820px) {
          .ally-card-root { padding-top: 0 !important; }
          /* Marge haute : le logo d'édition déborde de 8px au-dessus de
             l'illustration (CharacterCardThumb) et serait coupé par
             l'overflow hidden de la carte. */
          .ally-card-illu { width: 72px !important; margin: 9px 0 6px; }
          .ally-card-info { padding: 4px 6px 6px !important; align-items: stretch; }
          .ally-card-badge-inline { justify-content: center; }
          .ally-card-ult-label { white-space: normal !important; text-align: center; line-height: 1.1; }
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

      {/* Pied : ULTI / DPS — empilés en lignes pleine largeur
          (au lieu d'un badge en overlay sur l'illustration, qui se lisait mal
          une fois superposé à l'art). La carte ne fait que ~88px de large :
          chaque stat met son libellé AU-DESSUS de sa valeur (.ally-card-stat)
          pour que les deux tiennent en 14px ; libellé et valeur repassent
          côte à côte au-delà de 1800px, où les infos passent à droite de
          l'illustration via .ally-card-info. */}
      <div className="ally-card-info" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 6px', borderTop: `1px solid ${rc.color}22` }}>
        {/* Niveau — repris ici pour l'affichage large (voir
            .ally-card-badge-float, masqué au-delà de 1800px). */}
        <div className="ally-card-badge-inline" style={{ alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>Lv</span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)' }}>{owned.level}</span>
        </div>
        <div onClick={() => clickable && activateCharacterUltimate(templateId, formIdx)}
          title={queued ? "En file d'attente — cliquer pour annuler" : undefined}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '3px 4px', borderRadius: 6, cursor: clickable ? 'pointer' : 'default',
            background: queued ? 'rgba(59,130,246,0.18)' : ready ? 'rgba(251,191,36,0.12)' : 'transparent',
            border: queued ? '1px solid rgba(96,165,250,0.5)' : ready ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.08)' }}>
          {!ready && !queued && <span style={{ fontSize: 14, opacity: 0.6 }}>⏳</span>}
          <span className="ally-card-ult-label" style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: queued ? '#bfdbfe' : ready ? '#fde68a' : 'rgba(255,255,255,0.5)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
            {queued ? `EN FILE #${queuePos}` : ready ? 'ULTI PRÊT' : ultLabel}
          </span>
        </div>
        {/* DPS final seul : BASE et TYPE (DPS = base × type) sont regroupés
            dans l'infobulle, et le multiplicateur de type n'apparaît à côté
            du libellé que lorsqu'il n'est pas neutre. */}
        <div className="ally-card-stat" title={`Base ${formatNumber(base)} · Type ${multTxt}`}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, flexShrink: 0, whiteSpace: 'nowrap' }}>
            DPS
          </span>
          <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 900, color: finalCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{formatNumber(final)}</span>
        </div>
        {/* Multiplicateur de type sur sa propre ligne : à côté du libellé, il
            faisait déborder la ligne DPS hors de la carte. Quand le type est
            neutre, la ligne reste présente mais invisible dans les affichages
            côte à côte (.ally-card-type-empty), pour que toutes les cartes
            gardent les mêmes positions de lignes. */}
        {typeMult === 1 ? (
          <div className="ally-card-stat ally-card-type-empty" aria-hidden style={{ marginTop: -4 }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>Type</span>
            <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 800, lineHeight: 1 }}>×1.00</span>
          </div>
        ) : (
          <div className="ally-card-stat" style={{ marginTop: -4 }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>Type</span>
            <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 800, color: multCol, lineHeight: 1, whiteSpace: 'nowrap' }}>{multTxt}</span>
          </div>
        )}
      </div>
    </div>
  );
}
