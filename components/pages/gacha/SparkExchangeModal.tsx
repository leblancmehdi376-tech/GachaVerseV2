'use client';
import { useEffect, useState } from 'react';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { EditionBadge } from '@/components/ui/EditionBadge';
import { getFeaturedCharacters, SPARK_COSTS } from '@/lib/game/featuredBanner';
import { RARITY_GATES } from '@/lib/game/gacha';
import { EDITION_MAX_POINTS, getEditionPoints } from '@/lib/game/editions';
import { formatNumber } from '@/lib/game/format';
import type { OwnedCharacter } from '@/types/game';

const GOLD = '#f59e0b';
const GOLD_HI = '#fcd34d';

// Échange d'Étincelles (bannière vedette) : un perso de l'univers du jour
// au choix, prix selon sa rareté (voir SPARK_COSTS). Deux appuis
// (ÉCHANGER puis CONFIRMER) pour qu'un clic égaré ne dépense rien.
export function SparkExchangeModal({ universe, sparks, runPeakPalier, collection, onExchange, onClose }: {
  universe: string;
  sparks: number;
  runPeakPalier: number;
  collection: Record<string, OwnedCharacter>;
  onExchange: (templateId: string) => void;
  onClose: () => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:12, background:'rgba(3,2,8,0.88)' }}>
      <div role="dialog" aria-modal="true" aria-label="Échange d'Étincelles" onClick={e => e.stopPropagation()}
        style={{ width:'min(620px, 100%)', maxHeight:'90vh', overflowY:'auto', borderRadius:14, border:`1px solid ${GOLD}77`, background:'#0f0c20', boxShadow:'0 20px 60px rgba(0,0,0,0.6)', padding:'14px 16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:18, fontWeight:800, letterSpacing:2, color:GOLD_HI }}>✨ ÉCHANGE D&apos;ÉTINCELLES</div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ flexShrink:0, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-dim)', fontSize:22, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
        <div style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)', lineHeight:1.5 }}>
          Tu as <b style={{ color:GOLD_HI, fontFamily:'var(--f-num)' }}>{formatNumber(sparks)} ✨</b>. Choisis un perso <b style={{ color:'var(--text-sub)' }}>{universe}</b> :
          il rejoint ta collection comme une invocation (édition tirée au hasard).
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {getFeaturedCharacters(universe).map(tpl => {
            const owned = collection[tpl.id];
            const cost = SPARK_COSTS[tpl.rarity];
            const unlockPalier = RARITY_GATES[tpl.rarity].unlockPalier;
            const locked = runPeakPalier < unlockPalier;
            const maxed = !!owned && getEditionPoints(owned) >= EDITION_MAX_POINTS;
            const missing = cost - sparks;
            const status = locked ? `🔒 Palier ${unlockPalier}` : maxed ? 'Déjà Prismatique' : missing > 0 ? `Encore ${formatNumber(missing)} ✨` : null;
            const confirming = confirmId === tpl.id;
            return (
              <div key={tpl.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:`1px solid ${confirming ? GOLD : 'var(--border)'}` }}>
                <CharacterCardThumb templateId={tpl.id} formIndex={owned?.currentForm ?? 0} name={tpl.name} rarity={tpl.rarity} edition={owned?.edition} width={52} height={72} frameOverlay />
                <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:16, color:'var(--text)', overflowWrap:'anywhere' }}>{tpl.name}</span>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                    <RarityBadge rarity={tpl.rarity} size="xs" />
                    {owned ? <EditionBadge edition={owned.edition} /> : <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)' }}>Non obtenu</span>}
                  </div>
                </div>
                <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  {confirming ? (
                    <>
                      <button onClick={() => { setConfirmId(null); onExchange(tpl.id); }}
                        style={{ minHeight:44, padding:'0 14px', borderRadius:10, cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:14, letterSpacing:1, color:'#1a1003', background:`linear-gradient(135deg, ${GOLD_HI}, ${GOLD})`, border:'none' }}>
                        CONFIRMER
                      </button>
                      <button onClick={() => setConfirmId(null)}
                        style={{ minHeight:44, padding:'0 10px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-dim)' }}>
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(tpl.id)} disabled={!!status}
                      style={{ minHeight:44, minWidth:96, padding:'0 12px', borderRadius:10, cursor:status ? 'not-allowed' : 'pointer', opacity:status ? 0.45 : 1,
                        fontFamily:'var(--f-num)', fontWeight:900, fontSize:16, color:GOLD_HI, background:`${GOLD}1f`, border:`1px solid ${GOLD}88` }}>
                      ✨ {formatNumber(cost)}
                    </button>
                  )}
                  {status && !confirming && <span style={{ fontFamily:'var(--f-ui)', fontSize:14, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{status}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
