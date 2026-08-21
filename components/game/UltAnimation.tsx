'use client';
import { useState, useEffect } from 'react';
import { useUltimateStore } from '@/store/ultimateStore';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { getUltimateDef } from '@/lib/game/ultimates';
import { parseInstanceKey } from '@/lib/game/editions';
import { useFallbackImage, buildImageCandidates } from '@/lib/image-fallback';

// Image bannière d'ult avec cascade de candidats — si aucun ne charge,
// ne rend rien (le fond coloré dégradé suffit alors).
function UltBannerImg({ candidates, alt }: { candidates: string[]; alt: string }) {
  const { src, failed, onError } = useFallbackImage(candidates);
  if (failed || !src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.6))',
      }}
      onError={onError}
    />
  );
}

// ── Animation plein écran de combat ──────────────────────────────────────
// S'affiche DANS la zone de combat (pas en overlay global)
export function UltCombatOverlay() {
  const animating    = useUltimateStore(s => s.animating);
  const { collection } = useGameStore();
  const [visible, setVisible] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    if (animating) {
      setCurrentId(animating);
      setVisible(true);
    } else {
      // Petit délai avant de cacher pour laisser l'animation de sortie
      setTimeout(() => setVisible(false), 300);
    }
  }, [animating]);

  if (!visible || !currentId) return null;

  const pureId = parseInstanceKey(currentId).templateId; // clé composite -> id pur (art/ulti partagés entre éditions)
  const tpl    = getCharacterById(pureId);
  const owned  = collection[currentId];
  const def    = getUltimateDef(pureId);
  if (!tpl || !def) return null;

  const formIdx = owned?.currentForm ?? 0;
  const isLeaving = !animating;

  // Candidats du visuel ult (banner panoramique) : forme évoluée -> base,
  // chacun essayé sous plusieurs extensions au cas où le fichier renommé
  // ne serait pas un vrai .png.
  const ultEvoCandidates  = formIdx > 0 ? buildImageCandidates(`/sprites/ults/${pureId}_ult_evo${formIdx}`) : [];
  const ultBaseCandidates = buildImageCandidates(`/sprites/ults/${pureId}_ult`);
  const ultCandidates = [...ultEvoCandidates, ...ultBaseCandidates];

  const name = getCharFormName(tpl, formIdx);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      animation: isLeaving ? 'ultOut 0.3s ease-in forwards' : 'ultIn 0.25s ease-out',
      pointerEvents: 'none',
    }}>
      {/* Fond sombre semi-transparent */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }} />

      {/* Lueur colorée */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.25) 0%, transparent 70%)',
        animation: 'ultPulse 0.5s ease-out',
      }} />

      {/* BANNER ULT — couvre tout l'écran de combat */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'ultBannerIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
      }}>
        <UltBannerImg candidates={ultCandidates} alt={`${name} ult`} />
      </div>

      {/* Texte nom + ult en bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 24px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
        animation: 'ultSlideUp 0.4s 0.1s ease-out both',
        zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'var(--f-title)', fontSize: 22.7, fontWeight: 900,
          color: 'white', letterSpacing: 3, lineHeight: 1.2,
          textShadow: '0 0 20px rgba(168,85,247,0.8)',
        }}>{name}</div>
        <div style={{
          fontFamily: 'var(--f-title)', fontSize: 16.5, fontWeight: 700,
          color: '#c084fc', letterSpacing: 2, marginTop: 4,
          textShadow: '0 0 12px rgba(168,85,247,0.6)',
        }}>✦ {def.name}</div>
        <div style={{
          fontFamily: 'var(--f-ui)', fontSize: 12.4, color: 'rgba(255,255,255,0.65)',
          marginTop: 4,
        }}>{def.description}</div>
      </div>

      <style>{`
        @keyframes ultIn          { from{opacity:0;transform:scale(1.05)} to{opacity:1;transform:scale(1)} }
        @keyframes ultOut         { from{opacity:1} to{opacity:0} }
        @keyframes ultPulse       { 0%{opacity:0;transform:scale(0.8)} 60%{opacity:1;transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes ultBannerIn    { from{opacity:0;transform:scale(1.08)} to{opacity:1;transform:scale(1)} }
        @keyframes ultSlideUp     { from{opacity:0;transform:translateY(15px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── Overlay global (pour le texte par-dessus tout) ────────────────────────
// Gardé pour rétro-compatibilité mais vide maintenant
export function UltAnimation() {
  return null;
}

// ── Barre effets actifs dans la zone de combat ────────────────────────────
export function ActiveUltsBar() {
  const activeUlts = useUltimateStore(s => s.activeUlts);
  const [, setTick] = useState(0);

  // Refresh chaque seconde pour le timer
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (activeUlts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, zIndex: 15, pointerEvents: 'none',
    }}>
      {activeUlts.map(a => {
        const adef = getUltimateDef(parseInstanceKey(a.templateId).templateId);
        if (!adef) return null;
        const remaining = Math.max(0, Math.round((a.endsAt - Date.now()) / 1000));
        const pct = (remaining / adef.duration) * 100;
        return (
          <div key={a.templateId} style={{
            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(168,85,247,0.6)',
            borderRadius: 8, padding: '5px 10px', minWidth: 88,
            boxShadow: '0 0 10px rgba(168,85,247,0.3)',
          }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#c084fc', marginBottom:3, whiteSpace:'nowrap' }}>
              ⚡ {adef.name}
            </div>
            <div style={{ height:3, background:'rgba(255,255,255,0.1)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#7c3aed,#c084fc)', borderRadius:2, transition:'width 1s linear' }} />
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2, textAlign:'right' }}>{remaining}s</div>
          </div>
        );
      })}
    </div>
  );
}
