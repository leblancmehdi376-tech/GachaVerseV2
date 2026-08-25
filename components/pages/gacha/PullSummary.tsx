'use client';
import { RARITY_CONFIG } from '@/types/game';
import { getCharacterById } from '@/lib/game/characters';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { HIGH_RARITY, type Res } from './gachaTypes';

// Résumé — affiché après que toutes les cartes sont révélées
export function PullSummary({ results, onClose }: { results: Res[]; onClose: () => void }) {
  const newChars = results.filter(r => r.isNew);
  const highChars = results.filter(r => {
    const tpl = getCharacterById(r.templateId);
    return tpl && HIGH_RARITY.includes(tpl.rarity);
  });

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:20,
      animation:'gvFadeUp 0.4s ease',
    }}>
      {/* Stats rapides */}
      <div style={{ display:'flex', gap:12 }}>
        {[
          { label:'TIRAGE', val:`×${results.length}`,         color:'var(--purple-glow)' },
          { label:'NOUVEAUX', val:String(newChars.length),    color:'#4ade80'            },
          { label:'RARES+', val:String(highChars.length),     color:'#fbbf24'            },
        ].map((s,i) => (
          <div key={i} style={{
            background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)',
            borderRadius:10, padding:'10px 18px', textAlign:'center', minWidth:80,
          }}>
            <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:22.7, color:s.color }}>{s.val}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)', letterSpacing:1, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mise en avant des raretés élevées */}
      {highChars.length > 0 && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:10, fontWeight:700 }}>
            ✦ RARETÉS ÉLEVÉES
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {highChars.map((r, i) => {
              const tpl = getCharacterById(r.templateId);
              if (!tpl) return null;
              const cfg = RARITY_CONFIG[tpl.rarity];
              return (
                <div key={i} style={{
                  background:`${cfg.color}12`, border:`1px solid ${cfg.color}44`,
                  borderRadius:10, padding:'8px 14px',
                  display:'flex', alignItems:'center', gap:8,
                  boxShadow:`0 0 16px ${cfg.glow}44`,
                  animation:'gvCardIn 0.4s ease both',
                }}>
                  <span style={{ fontSize:16.5 }}>{cfg.color ? '✦' : '★'}</span>
                  <div>
                    <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:12.4, color:cfg.color }}>{tpl.name}</div>
                    <RarityBadge rarity={tpl.rarity} size="xs" />
                  </div>
                  {r.isNew && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#4ade80', fontWeight:800 }}>NEW</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bouton fermer */}
      <button onClick={onClose} className="btn-primary"
        style={{ padding:'12px 40px', fontSize:14.4, letterSpacing:2 }}>
        CONTINUER
      </button>
    </div>
  );
}
