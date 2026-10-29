'use client';
import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useFallbackImage } from '@/lib/image-fallback';
import { uploadContentImage, resolveContentImage } from '@/lib/game/content/images';
import { isContentImageRef } from '@/lib/game/content/schema';
import { cx } from '../ui';

// Aperçu d'une image + moyens d'en mettre une nouvelle (convertie en .webp et
// stockée par le configurateur) : fichier, presse-papier (bouton « Coller » ou
// Ctrl+V sur l'aperçu) ou glisser-déposer sur l'aperçu. `fallback` : visuels
// actuels du jeu à afficher tant qu'aucune image du configurateur n'est choisie.
export function ImagePicker({ value, fallback = [], onChange, maxW, maxH, size = 56, label = 'Image', rounded = 'rounded-lg' }: {
  value?: string;
  fallback?: string[];
  onChange: (ref: string) => void;
  maxW: number;
  maxH: number;
  size?: number;
  label?: string;
  rounded?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const own = value && isContentImageRef(value) ? resolveContentImage(value) : null;
  const { src, failed, onError } = useFallbackImage(own ? [own] : fallback);

  const send = async (file: Blob | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Ce n’est pas une image.'); return; }
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadContentImage(file, maxW, maxH));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
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
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="min-h-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-white/[0.04] px-3 text-sm font-bold text-white/85 hover:bg-white/10 disabled:opacity-50">
        {busy ? 'Envoi…' : label}
      </button>
      <button type="button" onClick={pasteFromClipboard} disabled={busy} title="Coller l'image copiée"
        className="min-h-10 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-white/[0.04] px-3 text-sm font-bold text-white/85 hover:bg-white/10 disabled:opacity-50">
        📋 Coller
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => send(e.target.files?.[0])} />
      {error && <span className="min-w-0 basis-full text-sm text-red-300">{error}</span>}
    </div>
  );
}
