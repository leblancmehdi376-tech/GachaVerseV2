'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PixelSprite } from '@/components/ui/PixelSprite';
import { RarityBadge, RankStars } from '@/components/ui/RarityBadge';
import { getCharacterById, getCharSprite, getCharFormName } from '@/lib/game/characters';
import { calcCharDps } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { RARITY_CONFIG } from '@/types/game';
import { RARITY_GATES } from '@/lib/game/gacha';

export function CollectionMiniPanel() {
  const { collection, equippedTeam, equipCharacter, unequipCharacter, maxPalierReached } = useGameStore();
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const owned = Object.values(collection);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px', height:'100%' }}>

      {/* ── Slots équipe ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
        {equippedTeam.map((tid, i) => {
          const tpl  = tid ? getCharacterById(tid) : null;
          const own  = tid ? collection[tid] : null;
          const isSel= selSlot === i;
          const cfg  = tpl ? RARITY_CONFIG[tpl.rarity] : null;
          return (
            <div key={i} onClick={() => setSelSlot(isSel ? null : i)}
              style={{ background: isSel ? `rgba(168,85,247,0.12)` : tpl ? `${cfg!.color}0c` : 'rgba(255,255,255,0.02)', border:`1px solid ${isSel?'var(--purple-hi)':tpl?cfg!.color+'55':'var(--border)'}`, borderRadius:'8px', padding:'8px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer', transition:'all 0.15s', minHeight:'90px', justifyContent:'center', boxShadow: isSel ? '0 0 14px rgba(168,85,247,0.2)' : tpl ? `0 0 10px ${cfg!.glow}15` : 'none' }}>
              {tpl && own ? (
                <>
                  <PixelSprite src={getCharSprite(tpl, own.currentForm)} alt={getCharFormName(tpl, own.currentForm)} size={40} rarity={tpl.rarity} />
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'11.3px', color:'var(--text-sub)', textAlign:'center', lineHeight:1.2, maxWidth:'70px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tpl.name}</span>
                  <RankStars rank={own.rank} />
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--green)' }}>{formatNumber(calcCharDps(tpl, own))}/s</span>
                  <button onClick={e=>{e.stopPropagation(); unequipCharacter(i);}}
                    style={{ fontFamily:'var(--f-ui)', fontSize:'10.3px', color:'var(--red)', background:'none', border:'none', cursor:'pointer', padding:'0', marginTop:'2px', opacity:0.7 }}>
                    ✕ Retirer
                  </button>
                </>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:34, height:34, border:`2px dashed ${isSel?'var(--purple-hi)':'rgba(255,255,255,0.1)'}`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18.5px', color: isSel?'var(--purple-glow)':'rgba(255,255,255,0.2)', transition:'all 0.15s' }}>{isSel?'✓':'+'}</div>
                  <span style={{ fontFamily:'var(--f-ui)', fontSize:'10.3px', fontWeight:600, color: isSel?'var(--purple-glow)':'var(--text-muted)' }}>SLOT {i+1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selSlot !== null && (
        <div style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'11.3px', color:'var(--purple-glow)', textAlign:'center', animation:'warnFlash 1.2s infinite', letterSpacing:'0.5px' }}>
          ↓ Sélectionne un allié pour le slot {selSlot+1}
        </div>
      )}

      {/* ── Collection mini-liste scrollable ── */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'4px' }}>
        {owned.length === 0 ? (
          <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-dim)', fontFamily:'var(--f-ui)', fontSize:'12.4px' }}>
            Aucun allié invoqué
          </div>
        ) : owned.map(o => {
          const tpl = getCharacterById(o.templateId);
          if (!tpl) return null;
          const cfg  = RARITY_CONFIG[tpl.rarity];
          const isEq = equippedTeam.includes(tpl.id);
          const rarLocked = maxPalierReached < RARITY_GATES[tpl.rarity].unlockPalier;
          const canClick = selSlot !== null && !rarLocked;
          return (
            <div key={tpl.id} onClick={() => { if (canClick) { equipCharacter(tpl.id, selSlot!); setSelSlot(null); }}}
              style={{ display:'flex', gap:'8px', alignItems:'center', padding:'7px 8px', background: isEq?`${cfg.color}0d`:'rgba(255,255,255,0.02)', border:`1px solid ${selSlot!==null?'var(--purple-dim)':isEq?cfg.color+'55':'var(--border)'}`, borderRadius:'7px', cursor: canClick?'pointer':'default', opacity: rarLocked?0.4:1, transition:'all 0.15s', position:'relative', overflow:'hidden' }}>
              {/* Rarity stripe */}
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'3px', background:cfg.color, boxShadow:`0 0 6px ${cfg.glow}` }} />
              <div style={{ marginLeft:'5px' }}>
                <PixelSprite src={getCharSprite(tpl, o.currentForm)} alt={getCharFormName(tpl, o.currentForm)} size={38} rarity={tpl.rarity} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tpl.name}</span>
                  {isEq && <span style={{ fontFamily:'var(--f-ui)', fontSize:'9.3px', color:cfg.color, fontWeight:700, flexShrink:0, marginLeft:'4px' }}>⚔</span>}
                  {rarLocked && <span style={{ fontFamily:'var(--f-ui)', fontSize:'9.3px', color:'#f87171', fontWeight:700, flexShrink:0, marginLeft:'4px' }}>🔒 P{RARITY_GATES[tpl.rarity].unlockPalier}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'3px' }}>
                  <RarityBadge rarity={tpl.rarity} size="xs" />
                  <RankStars rank={o.rank} />
                </div>
              </div>
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--green)', flexShrink:0 }}>{formatNumber(calcCharDps(tpl, o))}/s</span>
            </div>
          );
        })}
      </div>

      <button style={{ width:'100%', padding:'9px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'7px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--text-sub)', cursor:'pointer', letterSpacing:'1px', transition:'all 0.15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border-lit)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; }}>
        GÉRER L&apos;ÉQUIPE COMPLÈTE
      </button>
    </div>
  );
}
