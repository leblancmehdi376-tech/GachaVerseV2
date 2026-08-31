'use client';
import { useState } from 'react';
import { formatNumber } from '@/lib/game/format';

type Quest = { id:string; icon:string; label:string; current:number; target:number; reward:number; rewardType:string; done:boolean };

// Grossissement au survol : le petit encart de la sidebar (224px) n'a pas la
// place d'afficher un libellé complet ni une barre de progression lisible.
// Au lieu d'agrandir la carte en place (ce qui pousserait ses voisines, et
// resterait de toute façon découpé par l'overflow:auto de la liste), on clone
// la carte survolée dans un calque `position:fixed` — non affecté par
// l'overflow:hidden des ancêtres — pointant exactement sur son rectangle
// d'origine, puis on l'agrandit via `transform: scale()` : elle peut ainsi
// déborder visuellement par-dessus la zone de jeu sans être rognée.
const HOVER_SCALE = 1.32;

export function QuestsCard({ quests, claimQuest }: { quests: Quest[]; claimQuest: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState<{ id: string; rect: DOMRect; right: number; grown: boolean } | null>(null);
  const claimableCount = (quests ?? []).filter(q => q.current >= q.target && !q.done).length;

  const startHover = (q: Quest, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const right = window.innerWidth - rect.right;
    setHover({ id: q.id, rect, right, grown: false });
    // Double rAF : laisse le navigateur peindre l'état initial (scale 1, même
    // position que la carte d'origine) avant de déclencher la transition vers
    // l'état agrandi, sinon le changement est appliqué instantanément.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setHover(h => (h && h.id === q.id) ? { ...h, grown: true } : h);
    }));
  };
  const endHover = (id: string) => setHover(h => (h?.id === id ? null : h));

  const renderQuestBody = (q: Quest, expanded = false) => {
    const pct = Math.min((q.current/q.target)*100, 100);
    const canClaim = q.current >= q.target && !q.done;
    return (
      <>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
            <span style={{ fontSize:'13.4px', flexShrink:0 }}>{q.icon}</span>
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'12.4px', color:'var(--text-sub)', lineHeight:1.3,
              overflow: expanded ? 'visible' : 'hidden', textOverflow: expanded ? 'clip' : 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>{q.label}</span>
          </div>
          {q.done ? <span style={{ fontSize:'15.5px', flexShrink:0 }}>✅</span>
            : canClaim ? (
              <button onClick={() => claimQuest(q.id)}
                style={{ background:'linear-gradient(135deg,#3b0764,#5b21b6)', border:'1px solid var(--purple)', borderRadius:'6px', padding:'6px 9px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'white', flexShrink:0, boxShadow:'0 0 8px rgba(124,58,237,0.35)', whiteSpace:'nowrap' }}>
                RÉCUP
              </button>
            ) : (
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--gold)', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', padding:'2px 7px', borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                {q.rewardType==='gems'?'💎':'🪙'} {q.reward}
              </span>
            )
          }
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:q.done?'linear-gradient(90deg,#166534,#4ade80)':'linear-gradient(90deg,#4c1d95,#a855f7)', borderRadius:'3px', transition:'width 0.3s', boxShadow:canClaim?'0 0 6px #a855f766':undefined }} />
          </div>
          <span style={{ fontFamily:'var(--f-num)', fontSize:'11px', color:'var(--text-muted)', flexShrink:0 }}>{formatNumber(q.current)}/{formatNumber(q.target)}</span>
        </div>
      </>
    );
  };

  const hoveredQuest = hover ? (quests ?? []).find(q => q.id === hover.id) ?? null : null;

  return (
    <div className="panel panel--flat" style={{ padding:'12px 14px', flex: collapsed ? '0 0 auto' : 1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <button onClick={() => setCollapsed(v => !v)}
        style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, marginBottom: collapsed ? 0 : '10px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--text-dim)', letterSpacing:'2px' }}>QUÊTES QUOTIDIENNES</span>
        <span style={{ display:'flex', alignItems:'center', gap:6 }}>
          {claimableCount > 0 && (
            <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'12px', color:'#e9d5ff', background:'rgba(168,85,247,0.18)', borderRadius:'999px', padding:'1px 7px' }}>{claimableCount}</span>
          )}
          <span style={{ color:'var(--text-muted)', fontSize:'11px', transform: collapsed ? 'rotate(-90deg)' : 'none', transition:'transform 0.15s' }}>▾</span>
        </span>
      </button>
      {!collapsed && (
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
          {(quests ?? []).map(q => {
            const canClaim = q.current >= q.target && !q.done;
            return (
              // Pas de onMouseLeave ici : dès que le calque agrandi apparaît,
              // il couvre exactement cette carte et devient l'élément sous le
              // curseur. Un onMouseLeave ici se déclencherait donc aussitôt
              // (la carte d'origine perd le survol au profit du calque),
              // fermant le calque, qui redécouvre la carte, qui reçoit un
              // nouveau mouseenter... boucle infinie clignotante. Seul le
              // calque (plus bas) sait quand la souris quitte vraiment la zone.
              <div key={q.id}
                onMouseEnter={e => startHover(q, e.currentTarget)}
                style={{ background:'var(--bg-card)', border:`1px solid ${canClaim?'rgba(168,85,247,0.4)':q.done?'rgba(74,222,128,0.2)':'transparent'}`, borderRadius:'8px', padding:'7px 10px' }}>
                {renderQuestBody(q)}
              </div>
            );
          })}
        </div>
      )}

      {/* Calque agrandi — voir commentaire HOVER_SCALE plus haut */}
      {hover && hoveredQuest && (() => {
        const canClaim = hoveredQuest.current >= hoveredQuest.target && !hoveredQuest.done;
        return (
          <div
            onMouseEnter={() => setHover(h => h)}
            onMouseLeave={() => endHover(hoveredQuest.id)}
            style={{
              position:'fixed',
              // Ancré par le bord DROIT (fixe) plutôt que par la gauche : un nom
              // trop long pour tenir dans les 224px de la sidebar doit pouvoir
              // s'étaler vers la GAUCHE, par-dessus la zone de jeu, sans jamais
              // sortir de l'écran à droite.
              right: hover.right,
              top: hover.rect.top,
              width:'max-content',
              minWidth: hover.rect.width,
              maxWidth:'min(360px, 90vw)',
              zIndex: 200,
              background:'var(--bg-card)',
              border:`1px solid ${canClaim?'rgba(168,85,247,0.6)':hoveredQuest.done?'rgba(74,222,128,0.35)':'rgba(168,85,247,0.3)'}`,
              borderRadius:'8px', padding:'7px 10px',
              // Ancrée à droite (comme `right` ci-dessus) : le zoom grossit
              // uniquement vers la gauche, jamais vers la droite — sinon un
              // scale centré pousserait le bord droit hors de l'écran.
              transformOrigin:'right center',
              transform: hover.grown ? `scale(${HOVER_SCALE})` : 'scale(1)',
              boxShadow: hover.grown ? '0 16px 40px rgba(0,0,0,0.55), 0 0 26px rgba(168,85,247,0.35)' : 'none',
              transition:'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease-out',
              pointerEvents:'auto',
            }}>
            {renderQuestBody(hoveredQuest, true)}
          </div>
        );
      })()}
    </div>
  );
}
