'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RARITY_CONFIG, RARITY_ORDER_ASC, RARITY_FRAME_RATIO } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { EditionBadge } from '@/components/ui/EditionBadge';
import { isEditionAtLeast, editionTier } from '@/lib/game/editions';
import { HIGH_RARITY, HIGH_EDITION, type Res } from './gachaTypes';

// Résumé — affiché après que toutes les cartes sont révélées
export function PullSummary({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const [zoomed, setZoomed] = useState<Res | null>(null);
  const newChars = results.filter(r => r.isNew);
  // Mis en avant : rareté Légendaire+ OU édition Émeraude+ (quelle que soit la rareté).
  // Triés par rareté décroissante, puis par édition décroissante au sein d'une même rareté.
  const highChars = results
    .flatMap(r => {
      const tpl = getCharacterById(r.templateId);
      return tpl && (HIGH_RARITY.includes(tpl.rarity) || isEditionAtLeast(r.edition, HIGH_EDITION))
        ? [{ r, rank: RARITY_ORDER_ASC.indexOf(tpl.rarity) }]
        : [];
    })
    .sort((a, b) => b.rank - a.rank || editionTier(b.r.edition) - editionTier(a.r.edition))
    .map(x => x.r);

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:20,
      animation:'gvFadeUp 0.4s ease',
      width:'100%', maxWidth:1100, padding:'0 16px', maxHeight:'90vh', overflowY:'auto',
    }}>
      {/* Stats rapides */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        {[
          { label:'TIRAGE', val:`×${results.length}`,         color:'var(--purple-glow)' },
          { label:'NOUVEAUX', val:String(newChars.length),    color:'#4ade80'            },
          { label:'RARES+', val:String(highChars.length),     color:'#fbbf24'            },
        ].map((s,i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)',
            borderRadius:10, padding:'10px 18px', textAlign:'center', minWidth:80,
          }}>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:24, color:s.color }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, color:'var(--text-dim)', letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mise en avant des raretés élevées */}
      {highChars.length > 0 && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', letterSpacing:2, marginBottom:10, fontWeight:700 }}>
            ✦ MEILLEURS TIRAGES
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', marginBottom:10 }}>
            Touche une carte pour l'afficher en grand
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {highChars.map((r, i) => {
              const tpl = getCharacterById(r.templateId);
              if (!tpl) return null;
              const cfg = RARITY_CONFIG[tpl.rarity];
              return (
                <button key={i} type="button" onClick={() => setZoomed(r)} style={{
                  background:`${cfg.color}12`, border:`1px solid ${cfg.color}44`,
                  borderRadius:10, padding:'8px 14px', minHeight:44,
                  display:'flex', alignItems:'center', gap:8, textAlign:'left',
                  boxShadow:`0 0 16px ${cfg.glow}44`,
                  animation:'gvCardIn 0.4s ease both',
                  cursor:'pointer', color:'inherit',
                }}>
                  <span style={{ fontSize:18 }}>{cfg.color ? '✦' : '★'}</span>
                  <div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:cfg.color }}>{tpl.name}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <RarityBadge rarity={tpl.rarity} size="xs" />
                      {isEditionAtLeast(r.edition, HIGH_EDITION) && <EditionBadge edition={r.edition} style={{ fontSize:14, padding:'1px 6px' }} />}
                    </div>
                  </div>
                  {r.isNew && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'#4ade80', fontWeight:700 }}>NEW</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton fermer */}
      <button onClick={onClose} className="btn-primary"
        style={{ padding:'12px 40px', fontSize:16, letterSpacing:2 }}>
        CONTINUER
      </button>

      {zoomed && <ZoomedCard res={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}

// Carte agrandie en plein écran — clic n'importe où ou Échap pour fermer.
function ZoomedCard({ res, onClose }: { res: Res; onClose: () => void }) {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const tpl = getCharacterById(res.templateId);
  if (!tpl) return null;
  const cfg = RARITY_CONFIG[tpl.rarity];
  const ratio = RARITY_FRAME_RATIO[tpl.rarity];
  // La carte tient dans l'écran : place réservée pour le titre et le bouton.
  const h = Math.round(Math.max(200, Math.min(560, vp.h - 200, (vp.w - 48) / ratio)));
  const w = Math.round(h * ratio);

  return createPortal(
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:10000,
      background:'rgba(5,4,15,0.88)', backdropFilter:'blur(6px)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:16, padding:16, animation:'gvFadeUp 0.25s ease',
    }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'var(--f-ui)', fontWeight:900, fontSize:22, color:cfg.color, textShadow:`0 0 18px ${cfg.glow}` }}>
          {tpl.name}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexWrap:'wrap', marginTop:6 }}>
          <RarityBadge rarity={tpl.rarity} size="xs" />
          {res.edition !== 'base' && <EditionBadge edition={res.edition} style={{ fontSize:14, padding:'1px 6px' }} />}
          {res.isNew && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'#4ade80', fontWeight:700 }}>NOUVEAU</span>}
        </div>
      </div>
      <div style={{
        position:'relative', width:w, height:h, borderRadius:12,
        boxShadow:`0 0 0 2px ${cfg.color}, 0 0 40px ${cfg.glow}88, 0 12px 40px rgba(0,0,0,0.8)`,
      }}>
        <CharacterCardThumb
          templateId={res.templateId}
          name={tpl.name}
          rarity={tpl.rarity}
          edition={res.edition}
          width={w} height={h}
          frameOverlay
          style={{ border:'none', boxShadow:'none', borderRadius:0, objectFit:'contain' }}
        />
      </div>
      <button type="button" onClick={onClose} className="btn-primary"
        style={{ padding:'12px 32px', fontSize:16, letterSpacing:1, minHeight:44 }}>
        FERMER
      </button>
    </div>,
    document.body,
  );
}
