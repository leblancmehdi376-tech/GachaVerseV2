'use client';
import { useEffect, useRef } from 'react';

// Capteur de performances (outil de dev, voir scripts/perf-monitor) : mesure
// en continu FPS, temps de frame, long tasks, long animation frames, heap JS,
// nœuds DOM, animations actives, CLS et latence des interactions, puis envoie
// un échantillon par seconde au moniteur local (npm run perf). Chargé
// uniquement avec NEXT_PUBLIC_PERF_MONITOR=1 (voir GameLayout ; posé
// automatiquement par npm run dev:perf / start:perf). Si le moniteur ne
// répond pas, les envois échouent et s'espacent toutes les 5 s.

const MONITOR_URL = process.env.NEXT_PUBLIC_PERF_MONITOR_URL || 'http://localhost:4321';
const SAMPLE_MS = 1000;
const RETRY_MS = 5000;

interface LoafScript { source: string; duration: number; invoker: string }
interface LoafEntry { duration: number; blocking: number; scripts: LoafScript[]; ts: number }

type PerfEntryWithExtras = PerformanceEntry & {
  value?: number; hadRecentInput?: boolean; interactionId?: number;
  blockingDuration?: number;
  scripts?: { sourceURL?: string; sourceFunctionName?: string; invoker?: string; duration: number }[];
};

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function shortSource(s: LoafScript['source']) {
  return s.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
}

export default function PerfReporter({ page }: { page: string }) {
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    const sessionId = Math.random().toString(36).slice(2, 10);
    let frames: number[] = [];
    // -1 : pas encore de frame de référence (l'horodatage de la première frame
    // peut précéder le démarrage du capteur, d'où un delta négatif).
    let last = -1;
    let rafId = 0;
    let longTasks = 0, longTaskMs = 0;
    let cls = 0;
    let worstInteraction = 0;
    let loafs: LoafEntry[] = [];
    let nextSendAt = 0;
    const observers: PerformanceObserver[] = [];

    const loop = (now: number) => {
      if (last >= 0 && now > last) frames.push(now - last);
      last = now;
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    // rAF est suspendu en arrière-plan : sans ça, le retour sur l'onglet
    // compterait toute l'absence comme une seule frame géante.
    const onVisibility = () => { frames = []; last = -1; };
    document.addEventListener('visibilitychange', onVisibility);

    const observe = (type: string, cb: (e: PerfEntryWithExtras) => void, extra: Record<string, unknown> = {}) => {
      try {
        const po = new PerformanceObserver(list => list.getEntries().forEach(e => cb(e as PerfEntryWithExtras)));
        po.observe({ type, buffered: false, ...extra } as PerformanceObserverInit);
        observers.push(po);
      } catch { /* type non supporté par ce navigateur */ }
    };
    observe('longtask', e => { longTasks++; longTaskMs += e.duration; });
    observe('layout-shift', e => { if (!e.hadRecentInput) cls += e.value ?? 0; });
    observe('event', e => { if (e.interactionId) worstInteraction = Math.max(worstInteraction, e.duration); }, { durationThreshold: 16 });
    observe('long-animation-frame', e => {
      loafs.push({
        duration: Math.round(e.duration),
        blocking: Math.round(e.blockingDuration ?? 0),
        ts: Date.now(),
        // Copie : le tableau fourni par le navigateur est figé (sort() sur
        // place lève « Cannot assign to read only property »).
        scripts: [...(e.scripts ?? [])]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3)
          .map(s => ({
            source: shortSource(`${s.sourceURL || '?'}${s.sourceFunctionName ? ` → ${s.sourceFunctionName}` : ''}`),
            duration: Math.round(s.duration),
            invoker: s.invoker ?? '',
          })),
      });
    });

    const send = () => {
      const now = performance.now();
      const deltas = frames;
      frames = [];
      const hidden = document.visibilityState === 'hidden';
      const sorted = [...deltas].sort((a, b) => a - b);
      const total = deltas.reduce((a, b) => a + b, 0);
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      const sample = {
        sessionId,
        t: Date.now(),
        page: pageRef.current,
        hidden,
        fps: total > 0 ? (deltas.length * 1000) / total : 0,
        frameAvg: deltas.length ? total / deltas.length : 0,
        frameP95: percentile(sorted, 0.95),
        frameMax: sorted[sorted.length - 1] ?? 0,
        jank: deltas.filter(d => d > 50).length,
        dropped: deltas.reduce((n, d) => n + Math.max(0, Math.round(d / 16.67) - 1), 0),
        longTasks, longTaskMs: Math.round(longTaskMs),
        cls: Math.round(cls * 1000) / 1000,
        inp: Math.round(worstInteraction),
        heapMB: mem ? mem.usedJSHeapSize / 1048576 : null,
        heapTotalMB: mem ? mem.totalJSHeapSize / 1048576 : null,
        domNodes: document.getElementsByTagName('*').length,
        animations: typeof document.getAnimations === 'function'
          ? document.getAnimations().filter(a => a.playState === 'running').length : null,
        ecoMode: document.documentElement.hasAttribute('data-lowfx'),
        sleep: document.documentElement.getAttribute('data-sleep') ?? 'awake',
        viewport: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
        ua: navigator.userAgent,
        loafs,
      };
      longTasks = 0; longTaskMs = 0; worstInteraction = 0; loafs = [];

      if (now < nextSendAt) return;
      fetch(`${MONITOR_URL}/ingest`, {
        method: 'POST',
        // text/plain : requête "simple", pas de pré-vol CORS
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(sample),
        keepalive: true,
      }).catch(() => { nextSendAt = performance.now() + RETRY_MS; });
    };
    const interval = setInterval(send, SAMPLE_MS);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
      observers.forEach(o => o.disconnect());
    };
  }, []);

  return null;
}
