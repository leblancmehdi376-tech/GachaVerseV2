'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  cropFromFractions, cropScale, cropToFractions, croppedSize, initialCrop, moveCrop, resizeCrop, zoomCrop,
  type CropCorner, type CropRect,
} from '@/lib/game/content/crop';
import { Button, Segmented } from '../ui';

// Fenêtre de recadrage d'une image avant son envoi (ImagePicker) : on glisse
// le cadre pour le déplacer, on tire un coin (ou le curseur « Zoom ») pour le
// redimensionner. Le cadre peut suivre les proportions du jeu ou rester libre.

export interface CropFormat { id: string; label: string; aspect?: number }

const CORNERS: { id: CropCorner; left: string; top: string; cursor: string }[] = [
  { id: 'nw', left: '0%', top: '0%', cursor: 'nwse-resize' },
  { id: 'ne', left: '100%', top: '0%', cursor: 'nesw-resize' },
  { id: 'sw', left: '0%', top: '100%', cursor: 'nesw-resize' },
  { id: 'se', left: '100%', top: '100%', cursor: 'nwse-resize' },
];
const MAX_ZOOM = 8;
// Damier visible sous les zones transparentes (sprites d'ennemis).
const CHECKER = { backgroundImage: 'repeating-conic-gradient(#ffffff14 0% 25%, transparent 0% 50%)', backgroundSize: '16px 16px' };

export function ImageCropper({ url, W, H, formats, initial, maxW, maxH, busy, error, onConfirm, onCancel }: {
  url: string;                 // image d'origine (URL d'objet)
  W: number;                   // sa taille réelle, en pixels
  H: number;
  formats: CropFormat[];
  initial?: { crop?: CropRect; format?: string }; // dernier recadrage (en fractions)
  maxW: number;
  maxH: number;
  busy: boolean;
  error: string | null;
  onConfirm: (crop: CropRect | undefined, format: string) => void; // crop en fractions, undefined = image entière
  onCancel: () => void;
}) {
  const [formatId, setFormatId] = useState(() => formats.find(f => f.id === initial?.format)?.id ?? formats[0].id);
  const aspect = formats.find(f => f.id === formatId)?.aspect;
  const [crop, setCrop] = useState<CropRect>(() =>
    initial?.crop ? cropFromFractions(initial.crop, W, H) : initialCrop(W, H, aspect));
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'move' | CropCorner; x: number; y: number; start: CropRect } | null>(null);

  // Échap ferme la fenêtre (sauf pendant l'envoi).
  const cancelRef = useRef(onCancel);
  useEffect(() => { cancelRef.current = onCancel; });
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') cancelRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pixels de l'image par pixel affiché.
  const ratio = () => W / (stage.current?.getBoundingClientRect().width || W);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const mode = (e.target as HTMLElement).closest<HTMLElement>('[data-drag]')?.dataset.drag as 'move' | CropCorner | undefined;
    if (!mode || busy) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: crop };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !stage.current) return;
    const k = ratio();
    if (d.mode === 'move') { setCrop(moveCrop(d.start, (e.clientX - d.x) * k, (e.clientY - d.y) * k, W, H)); return; }
    const b = stage.current.getBoundingClientRect();
    // Le cadre ne descend pas sous ~40 px à l'écran (ses coins se chevaucheraient).
    const min = Math.min(40 * k, W, H);
    setCrop(resizeCrop(d.start, d.mode, (e.clientX - b.left) * k, (e.clientY - b.top) * k, W, H, aspect, min));
  };

  const endDrag = () => { drag.current = null; };

  // Flèches : déplace le cadre de 1 % (10 % avec Maj).
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-W * step, 0], ArrowRight: [W * step, 0], ArrowUp: [0, -H * step], ArrowDown: [0, H * step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setCrop(c => moveCrop(c, m[0], m[1], W, H));
  };

  const chooseFormat = (id: string) => {
    setFormatId(id);
    setCrop(initialCrop(W, H, formats.find(f => f.id === id)?.aspect));
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const out = croppedSize(crop, maxW, maxH);
  const zoom = 1 / cropScale(crop, W, H);
  const preview = {
    backgroundImage: `url("${url}")`,
    backgroundSize: `${(W / crop.w) * 100}% ${(H / crop.h) * 100}%`,
    backgroundPosition: `${crop.w >= W ? 0 : (crop.x / (W - crop.w)) * 100}% ${crop.h >= H ? 0 : (crop.y / (H - crop.h)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  };

  return (
    // Pas de fermeture au clic à côté : un glisser qui finit hors du cadre
    // ferait perdre le recadrage en cours (✕, Annuler ou Échap).
    <div className="fixed inset-0 z-[200] flex items-center justify-center overscroll-contain bg-[#030208]/85 p-2 font-(family-name:--f-ui) backdrop-blur-sm sm:p-6">
      <div role="dialog" aria-modal="true" aria-label="Recadrer l'image"
        className="flex max-h-[96vh] w-full max-w-3xl flex-col gap-3 overflow-y-auto rounded-2xl border border-white/20 bg-[#0f0c20] p-3 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-white sm:text-xl">✂️ Recadrer l&apos;image</div>
            <div className="text-sm text-white/75">Glisse le cadre pour le déplacer, tire un coin pour l&apos;agrandir ou le réduire.</div>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Fermer"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/20 text-lg text-white/80 hover:bg-white/10 disabled:opacity-50">✕</button>
        </div>

        {formats.length > 1 && (
          <Segmented label="Proportions du cadre" value={formatId} onChange={chooseFormat}
            options={formats.map(f => ({ id: f.id, label: f.label }))} className="shrink-0 self-start" />
        )}

        {/* Image affichée en entier ; le cadre et ses coins par-dessus. */}
        <div className="p-4">
          <div ref={stage} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
            className="relative mx-auto touch-none select-none" style={{ ...CHECKER, aspectRatio: `${W} / ${H}`, width: `min(100%, calc(min(45vh, 560px) * ${W / H}))` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" draggable={false} className="pointer-events-none absolute inset-0 block h-full w-full" />
            {/* Zones hors cadre assombries. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/60" style={{ height: pct(crop.y, H) }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60" style={{ top: pct(crop.y + crop.h, H) }} />
            <div className="pointer-events-none absolute left-0 bg-black/60" style={{ top: pct(crop.y, H), height: pct(crop.h, H), width: pct(crop.x, W) }} />
            <div className="pointer-events-none absolute right-0 bg-black/60" style={{ top: pct(crop.y, H), height: pct(crop.h, H), left: pct(crop.x + crop.w, W) }} />
            <div data-drag="move" tabIndex={0} onKeyDown={onKeyDown}
              aria-label="Zone gardée : glisse pour la déplacer (ou flèches du clavier)"
              className="absolute cursor-move border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] outline-none focus-visible:border-violet-300"
              style={{ left: pct(crop.x, W), top: pct(crop.y, H), width: pct(crop.w, W), height: pct(crop.h, H) }}>
              {/* Repères des tiers. */}
              <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/30" />
              <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/30" />
              <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/30" />
              <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/30" />
              {CORNERS.map(c => (
                <div key={c.id} data-drag={c.id} aria-hidden
                  className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ left: c.left, top: c.top, cursor: c.cursor }}>
                  <span className="size-4 rounded-full border-2 border-violet-500 bg-white shadow" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm text-white/80">
          <span className="shrink-0 font-semibold">🔍 Zoom</span>
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={Math.min(zoom, MAX_ZOOM)} disabled={busy}
            onChange={e => setCrop(c => zoomCrop(c, 1 / Number(e.target.value), W, H))}
            className="min-w-0 flex-1 cursor-pointer accent-violet-400" />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <div className="shrink-0 rounded-md border border-white/20" style={{ ...CHECKER, height: 96, aspectRatio: `${crop.w} / ${crop.h}`, maxWidth: '100%' }}>
            <div className="h-full w-full rounded-md" style={preview} />
          </div>
          <div className="flex min-w-0 flex-col text-sm text-white/75">
            <span className="font-semibold text-white/85">Aperçu</span>
            <span>Image finale : {out.w} × {out.h} px</span>
            <span>Original : {W} × {H} px</span>
          </div>
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}

        <div className="flex flex-wrap gap-2">
          <Button tone="purple" onClick={() => onConfirm(cropToFractions(crop, W, H), formatId)} disabled={busy}>
            {busy ? 'Envoi…' : '✅ Valider le recadrage'}
          </Button>
          <Button onClick={() => onConfirm(undefined, formatId)} disabled={busy}>Garder l&apos;image entière</Button>
          <Button onClick={onCancel} disabled={busy}>Annuler</Button>
        </div>
      </div>
    </div>
  );
}
