'use client';
import { useEffect, useState, type ComponentType } from 'react';
import { SplashScreen } from './SplashScreen';
import { loadLiveContent } from '@/lib/game/content/loader';
import { setLoadedContent, isContentStale } from '@/lib/game/content/runtime';
import { collectContentImages } from '@/lib/game/content/schema';
import { prepareContentImages } from '@/lib/game/content/images';

// Démarrage du jeu en deux temps : pendant l'écran de chargement, on lit le
// contenu en ligne du configurateur (et ses images), PUIS seulement on charge
// le code du jeu. Les fichiers de données (paliers, ennemis, persos,
// bannières) l'appliquent ainsi dès leur évaluation, et tout ce qui en dérive
// est calculé avec le bon contenu. Voir lib/game/content.
//
// Ce composant et ses imports ne doivent JAMAIS charger le store ni une
// donnée de jeu (sinon elles seraient évaluées sans le contenu en ligne).

const IMAGES_TIMEOUT_MS = 4000;

type Game = ComponentType<{ skipSplash?: boolean }>;

export function ContentGate() {
  const [Game, setGame] = useState<Game | null>(null);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const content = await loadLiveContent().catch(() => null);
      // Données déjà évaluées avec une autre version (arrivée depuis /admin
      // sans recharger) : on recharge pour repartir du bon contenu.
      if (isContentStale(content?.version ?? 0)) { window.location.reload(); return; }
      setLoadedContent(content);
      if (content) {
        await Promise.race([
          prepareContentImages(collectContentImages(content)).catch(() => {}),
          new Promise(res => setTimeout(res, IMAGES_TIMEOUT_MS)),
        ]);
      }
      const mod = await import('@/components/layout/GameLayout');
      if (!cancelled) setGame(() => mod.GameLayout);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {/* Le jeu se monte sous l'écran de chargement dès qu'il est prêt, pour
          que la sauvegarde et la connexion démarrent pendant l'animation. */}
      {Game && <Game skipSplash />}
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {splashDone && !Game && (
        <div style={{ position:'fixed', inset:0, zIndex:99999, background:'#030208', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <span style={{ fontFamily:'var(--f-ui)', fontSize:16, color:'rgba(255,255,255,0.6)', letterSpacing:2, textAlign:'center' }}>Synchronisation du multivers…</span>
        </div>
      )}
    </>
  );
}
