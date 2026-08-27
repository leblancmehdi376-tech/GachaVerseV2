'use client';
import { useGameStore } from '@/store/gameStore';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { makeInstanceKey, parseInstanceKey } from '@/lib/game/editions';
import { Affinity, AFFINITY_CONFIG, affinityMatchupKind, getAffinityForId } from '@/lib/game/affinities';
import { MAX_EVENT_COMPANIONS } from './eventBattleHelpers';

export function CompanionSelector({ bossAffinity, selected, onToggle, onClose }: {
  bossAffinity: Affinity;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const { collection, equippedTeam, isCharOnExpedition } = useGameStore();

  const equippedPure = equippedTeam.filter((t): t is string => !!t).map(t => parseInstanceKey(t).templateId);
  const owned = CHARACTER_POOL.filter(c => !c.isHero &&
    (['base', 'gold', 'diamond'] as const).some(ed => !!collection[makeInstanceKey(c.id, ed)]));

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9990, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ width:'100%', maxWidth:640, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:16.5, color:'var(--purple-glow)', letterSpacing:2 }}>🤝 Compagnons ({selected.length}/{MAX_EVENT_COMPANIONS})</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', marginTop:2, display:'flex', alignItems:'center', gap:6 }}>
              Boss : <span style={{ color:AFFINITY_CONFIG[bossAffinity].color, fontWeight:700 }}>{AFFINITY_CONFIG[bossAffinity].icon} {AFFINITY_CONFIG[bossAffinity].label}</span>
              — un type fort réduit le combat de 10%, un type faible l&apos;allonge de 10%
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:20.6 }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {owned.map(tpl => {
            const onExpedition = isCharOnExpedition(tpl.id);
            const inTeam = equippedPure.includes(tpl.id);
            const isSelected = selected.includes(tpl.id);
            const disabled = onExpedition || inTeam || (!isSelected && selected.length >= MAX_EVENT_COMPANIONS);
            const affinity = getAffinityForId(tpl.id);
            const cfg = AFFINITY_CONFIG[affinity];
            const kind = affinityMatchupKind(affinity, bossAffinity);
            const kindLabel = kind === 'strong' ? '▲ -10% durée' : kind === 'weak' ? '▼ +10% durée' : '● neutre';
            const kindColor = kind === 'strong' ? '#4ade80' : kind === 'weak' ? '#f87171' : 'var(--text-dim)';
            return (
              <button key={tpl.id} onClick={() => !disabled && onToggle(tpl.id)}
                style={{ padding:'10px 8px', borderRadius:10, cursor: disabled ? 'not-allowed' : 'pointer',
                  background: isSelected ? `${cfg.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSelected ? cfg.color+'66' : 'var(--border)'}`,
                  opacity: disabled ? 0.4 : 1,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  boxShadow: isSelected ? `0 0 14px ${cfg.glow}44` : 'none',
                  transition:'all 0.15s' }}>
                <span style={{ fontSize:20.6 }}>{isSelected ? '✅' : cfg.icon}</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color: isSelected ? cfg.color : 'var(--text)', textAlign:'center', lineHeight:1.2 }}>{tpl.name}</span>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:kindColor, fontWeight:700 }}>{kindLabel}</div>
                {onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#fb923c' }}>EN MISSION</span>}
                {inTeam && !onExpedition && <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'#60a5fa' }}>DANS L&apos;ÉQUIPE</span>}
              </button>
            );
          })}
          {owned.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--f-ui)', fontSize:12.4, padding:24 }}>
              Aucun personnage disponible.
            </div>
          )}
        </div>

        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn-primary" style={{ padding:'10px 24px', fontSize:13.4 }}>VALIDER</button>
        </div>
      </div>
    </div>
  );
}
