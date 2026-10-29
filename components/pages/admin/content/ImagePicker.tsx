'use client';
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useFallbackImage } from '@/lib/image-fallback';
import { uploadContentImage, resolveContentImage } from '@/lib/game/content/images';
import { isContentImageRef } from '@/lib/game/content/schema';
import type { CropRect } from '@/lib/game/content/crop';
import { ImageCropper, type CropFormat } from './ImageCropper';
import { cx } from '../ui';

// Aperçu d'une image + moyens d'en mettre une nouvelle (convertie en .webp et
// stockée par le configurateur) : fichier, presse-papier (bouton « Coller » ou
// Ctrl+V sur l'aperçu) ou glisser-déposer sur l'aperçu. Chaque nouvelle image
// passe par la fenêtre de recadrage ; « Recadrer » la rouvre sur l'image
// actuelle. `fallback` : visuels actuels du jeu à afficher tant qu'aucune
// image du configurateur n'est choisie. `aspect` : proportions de l'image en
// jeu (largeur / hauteur), proposées par défaut au recadrage.

// Originaux des images recadrées pendant cette session : « Recadrer » repart
// de l'image d'origine (pleine résolution) et du dernier cadre, plutôt que de
// recadrer une image déjà réduite.
interface CropSource { source: Blob; crop?: CropRect; format: string }
const sources = new Map<string, CropSource>();
const MAX_SOURCES = 40;

function rememberSource(ref: string, s: CropSource) {
  sources.delete(ref);
  sources.set(ref, s);
  if (sources.size > MAX_SOURCES) sources.delete(sources.keys().next().value!);
}

async function imageSize(url: string): Promise<{ W: number; H: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return { W: img.naturalWidth, H: img.naturalHeight };
}

export function ImagePicker({ value, fallback = [], onChange, maxW, maxH, aspect, aspectLabel, size = 56, label = 'Image', rounded = 'rounded-lg' }: {
  value?: string;
  fallback?: string[];
  onChange: (ref: string) => void;
  maxW: number;
  maxH: number;
  aspect?: number;
  aspectLabel?: string;
  size?: number;
  label?: string;
  rounded?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropping, setCropping] = useState<{ source: Blob; url: string; W: number; H: number; initial?: { crop?: CropRect; format?: string } } | null>(null);
  const own = value && isContentImageRef(value) ? resolveContentImage(value) : null;
  const { src, failed, onError } = useFallbackImage(own ? [own] : fallback);

  const formats: CropFormat[] = aspect
    ? [{ id: 'game', label: aspectLabel ?? 'Format du jeu', aspect }, { id: 'free', label: 'Libre' }]
    : [{ id: 'free', label: 'Libre' }, { id: 'square', label: 'Carré', aspect: 1 }];

  const upload = async (source: Blob, crop: CropRect | undefined, format: string) => {
    setBusy(true);
    setError(null);
    try {
      const ref = await uploadContentImage(source, maxW, maxH, crop);
      rememberSource(ref, { source, crop, format });
      onChange(ref);
      closeCropper();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  // Ouvre la fenêtre de recadrage (ou envoie directement une image dont le
  // navigateur ne donne pas la taille, ex. certains SVG).
  const openCropper = async (source: Blob, initial?: { crop?: CropRect; format?: string }) => {
    setError(null);
    const url = URL.createObjectURL(source);
    let dims: { W: number; H: number };
    try {
      dims = await imageSize(url);
    } catch {
      URL.revokeObjectURL(url);
      setError('Image illisible.');
      return;
    }
    if (!dims.W || !dims.H) { URL.revokeObjectURL(url); await upload(source, undefined, formats[0].id); return; }
    setCropping({ source, url, ...dims, initial });
  };

  function closeCropper() {
    if (cropping) URL.revokeObjectURL(cropping.url);
    setCropping(null);
    if (input.current) input.current.value = '';
  }

  const send = async (file: Blob | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Ce n’est pas une image.'); return; }
    await openCropper(file);
  };

  // « Recadrer » : repart de l'original si l'image a été envoyée pendant
  // cette session, sinon de l'image affichée (y compris un visuel du jeu).
  const recrop = async () => {
    const saved = value ? sources.get(value) : undefined;
    if (saved) { await openCropper(saved.source, { crop: saved.crop, format: saved.format }); return; }
    if (!src) return;
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error();
      await openCropper(await res.blob());
    } catch {
      setError('Image actuelle illisible : envoie-la de nouveau.');
    }
  };

  // Bouton « Coller » : lit l'image du presse-papier (le navigateur peut
  // demander l'autorisation la première fois).
  const pasteFromClipboard = async () => {
    setError(null);
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find(t => t.startsWith('image/'));
        if (type) { await send(await item.getType(type)); return; }
      }
      setError('Aucune image dans le presse-papier.');
    } catch {
      setError('Presse-papier inaccessible : clique sur l’aperçu puis fais Ctrl+V.');
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.files].find(f => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    send(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    send([...e.dataTransfer.files].find(f => f.type.startsWith('image/')));
  };

  const buttonClass = 'min-h-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-white/[0.04] px-3 text-sm font-bold text-white/85 hover:bg-white/10 disabled:opacity-50';

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {/* Aperçu focusable : clic puis Ctrl+V pour coller, ou dépôt d'un fichier. */}
      <div tabIndex={0} role="button" aria-label="Aperçu : clique puis Ctrl+V pour coller une image, ou dépose un fichier"
        title="Clique puis Ctrl+V pour coller, ou dépose une image ici"
        onPaste={onPaste}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cx('flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border bg-black/40 outline-none',
          'focus-visible:border-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40',
          dragOver ? 'border-violet-400 ring-2 ring-violet-400/40' : 'border-white/20', rounded)}
        style={{ width: size, height: size }}>
        {busy
          ? <span className="text-sm text-white/70">…</span>
          : src && !failed
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={src} alt="" onError={onError} className="pointer-events-none h-full w-full object-cover" />
            : <span className="text-sm text-white/50">?</span>}
      </div>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={buttonClass}>
        {busy ? 'Envoi…' : label}
      </button>
      <button type="button" onClick={pasteFromClipboard} disabled={busy} title="Coller l'image copiée" className={buttonClass}>
        📋 Coller
      </button>
      {src && !failed && (
        <button type="button" onClick={recrop} disabled={busy} title="Recadrer l'image actuelle" className={buttonClass}>
          ✂️ Recadrer
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => send(e.target.files?.[0])} />
      {error && !cropping && <span className="min-w-0 basis-full text-sm text-red-300">{error}</span>}
      {cropping && (
        <ImageCropper url={cropping.url} W={cropping.W} H={cropping.H} formats={formats} initial={cropping.initial}
          maxW={maxW} maxH={maxH} busy={busy} error={error}
          onConfirm={(crop, format) => upload(cropping.source, crop, format)}
          onCancel={() => { if (!busy) { setError(null); closeCropper(); } }} />
      )}
    </div>
  );
}
