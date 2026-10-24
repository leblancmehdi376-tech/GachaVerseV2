'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { currentGuideQuest, nextGuideLine, partSpeaker, partText, pendingGuideLine, type GuideLine } from '@/lib/game/nekozGuide';
import { formatNumber } from '@/lib/game/format';
import { getCharacterById } from '@/lib/game/characters';
import { getCardBaseName, NEW_CARDS_ASSET_VERSION } from '@/lib/game/cardAssets';
import { getSafeFormIndex } from '@/store/spoilerStore';

// NekoZ-guide : personnage cliquable sous les quêtes. Chaque clic fait avancer
// sa réplique (une réplique peut tenir en plusieurs bulles), puis en tire une
// nouvelle (voir nextGuideLine). Il propose aussi une chaîne de quêtes.

// [DEV] Boutons « terminer la quête » / « recommencer » affichés uniquement en local, jamais en prod.
function useIsLocalDev() {
  return typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname.startsWith('127.')
  );
}

const devButtonStyle = { flex:'1 1 100px', minHeight:'36px', background:'rgba(232,121,249,0.12)', border:'1px dashed #e879f9', borderRadius:'8px', padding:'6px 8px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'#f0abfc' } as const;

export function GuideCard() {
  const isLocalDev = useIsLocalDev();
  const [line, setLine] = useState<GuideLine | null>(null);
  const [part, setPart] = useState(0);

  // Primitives uniquement (useShallow) : pas de re-rendu à chaque kill.
  const { arrived, hasPending, quest } = useGameStore(useShallow(s => {
    const q = currentGuideQuest(s);
    return {
      arrived: s.nekozGuide?.arrivalPrestige !== null,
      hasPending: pendingGuideLine(s) !== null,
      quest: q ? `${q.def.id}|${q.current}|${q.claimable}` : null,
    };
  }));
  const questInfo = quest ? currentGuideQuest(useGameStore.getState()) : null;

  const talk = () => {
    if (line && part < line.parts.length - 1) { setPart(p => p + 1); return; }
    const store = useGameStore.getState();
    const next = nextGuideLine(store, line?.id ?? null);
    if (!arrived) store.guideArrive();
    store.guideSayLine(next.id);
    setLine(next);
    setPart(0);
  };

  const claim = () => {
    const done = questInfo?.def.outro;
    if (!useGameStore.getState().claimGuideQuest() || !done) return;
    setLine(done);
    setPart(0);
  };

  // Même enchaînement qu'un vrai claim : la réplique de fin s'affiche.
  const devComplete = () => {
    const done = questInfo?.def.outro;
    if (!done) return;
    useGameStore.getState().debugCompleteGuideQuest();
    setLine(done);
    setPart(0);
  };

  const devReset = () => {
    useGameStore.getState().debugResetGuide();
    setLine(null);
    setPart(0);
  };

  const current = line?.parts[part];
  const bubble = current !== undefined ? partText(current) : arrived ? '…' : '… ?';
  // Bulle dite par un Chill&Cool de l'équipe (acte 3) : portrait de sa carte à la place du guide.
  const speaker = current !== undefined ? getCharacterById(partSpeaker(current) ?? '') : undefined;
  // Forme actuelle du perso chez le joueur, sauf univers protégé par l'anti-spoil.
  const speakerForm = speaker
    ? getSafeFormIndex(speaker.universe ?? '', useGameStore.getState().collection[speaker.id]?.currentForm ?? 0)
    : 0;
  const portrait = speaker
    ? `/sprites/new_cards_processed/${getCardBaseName(speaker, speakerForm)}.webp?v=${NEW_CARDS_ASSET_VERSION}`
    : '/sprites/guide/nekoz_guide.webp';
  const moreParts = !!line && part < line.parts.length - 1;
  const notify = hasPending || !!questInfo?.claimable;

  return (
    <div className="panel panel--flat" style={{ padding:'12px 14px', flexShrink:0, display:'flex', flexDirection:'column', gap:'10px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'var(--text-dim)', letterSpacing:'2px' }}>???</span>
        {notify && (
          <span aria-label="Nouveauté" style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'14px', color:'#e9d5ff', background:'rgba(168,85,247,0.18)', borderRadius:'999px', padding:'1px 8px' }}>!</span>
        )}
      </div>

      {/* Toute la zone personnage + bulle est cliquable (cible tactile large). */}
      <button onClick={talk} aria-label="Parler au guide"
        style={{ display:'flex', alignItems:'flex-end', gap:'8px', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', minHeight:'88px', width:'100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={portrait} alt={speaker?.name ?? ''} width={84} height={84}
          style={speaker
            ? { width:'84px', height:'84px', flexShrink:0, objectFit:'cover', objectPosition:'top', borderRadius:'12px', border:'2px solid #818cf8', boxShadow:'0 0 12px rgba(99,102,241,0.45)' }
            : { width:'84px', height:'84px', flexShrink:0, objectFit:'contain', filter:'drop-shadow(0 4px 10px rgba(99,102,241,0.35))', animation: notify ? 'idleFloat 3s ease-in-out infinite' : undefined }} />
        <div key={`${line?.id ?? 'idle'}-${part}`}
          style={{ position:'relative', flex:1, minWidth:0, alignSelf:'stretch', display:'flex', flexDirection:'column', justifyContent:'center', background: speaker ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)', border:`1px solid ${speaker ? 'rgba(129,140,248,0.6)' : 'rgba(129,140,248,0.3)'}`, borderRadius:'10px', padding:'8px 10px', animation:'fadeIn 0.25s ease-out' }}>
          {speaker && (
            <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'#a5b4fc', marginBottom:'2px' }}>{speaker.name}</span>
          )}
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'14px', color:'var(--text-sub)', lineHeight:1.35 }}>{bubble}</span>
          {(moreParts || !line) && (
            <span style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-muted)', marginTop:'4px', textAlign:'right' }}>{moreParts ? '▸' : 'Touche-le'}</span>
          )}
        </div>
      </button>

      {questInfo && (
        <div style={{ background:'var(--bg-card)', border:`1px solid ${questInfo.claimable ? 'rgba(168,85,247,0.4)' : 'transparent'}`, borderRadius:'8px', padding:'7px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
            <span style={{ fontSize:'16px', flexShrink:0 }}>{questInfo.def.icon}</span>
            <span style={{ flex:1, minWidth:0, fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'14px', color:'var(--text-sub)', lineHeight:1.3 }}>{questInfo.def.label}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 80px', height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:'100%', transformOrigin:'left', transform:`scaleX(${questInfo.current / questInfo.def.target})`, background:'linear-gradient(90deg,#3730a3,#818cf8)', borderRadius:'3px', transition:'transform 0.3s' }} />
            </div>
            <span style={{ fontFamily:'var(--f-num)', fontSize:'14px', color:'var(--text-muted)', flexShrink:0 }}>{formatNumber(questInfo.current)}/{formatNumber(questInfo.def.target)}</span>
            {questInfo.claimable ? (
              <button onClick={claim}
                style={{ background:'linear-gradient(135deg,#3b0764,#5b21b6)', border:'1px solid var(--purple)', borderRadius:'6px', padding:'8px 10px', minHeight:'36px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'white', flexShrink:0, boxShadow:'0 0 8px rgba(124,58,237,0.35)', whiteSpace:'nowrap' }}>
                RÉCUP 💎 {questInfo.def.reward}
              </button>
            ) : (
              <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color:'var(--gold)', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', padding:'2px 7px', borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                💎 {questInfo.def.reward}
              </span>
            )}
          </div>
        </div>
      )}

      {isLocalDev && (
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {questInfo && (
            <button onClick={devComplete} title="[DEV] Terminer la quête en cours, sans récompense (localhost uniquement)" style={devButtonStyle}>
              🛠️ Finir la quête
            </button>
          )}
          <button onClick={devReset} title="[DEV] Recommencer l'histoire du guide depuis le début (localhost uniquement)" style={devButtonStyle}>
            🛠️ Recommencer
          </button>
        </div>
      )}
    </div>
  );
}
