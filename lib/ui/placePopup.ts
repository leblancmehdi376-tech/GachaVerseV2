// Placement d'une infobulle/popup en position fixed, entièrement dans l'écran.
// Au-dessus de l'ancre si elle y tient, sinon en dessous, sinon collée au bord
// bas (la popup doit alors avoir un max-height de 100dvh - 2×margin pour
// tenir, voir .dps-tip__pop). Horizontalement : centrée sur l'ancre, ou calée
// sur son bord droit (`align: 'end'`), puis ramenée dans l'écran.
export function placePopup(
  anchor: DOMRect,
  popup: { width: number; height: number },
  { gap = 8, margin = 8, align = 'center' }: { gap?: number; margin?: number; align?: 'center' | 'end' } = {},
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const wantedLeft = align === 'end' ? anchor.right - popup.width : anchor.left + anchor.width / 2 - popup.width / 2;
  const left = Math.min(Math.max(wantedLeft, margin), Math.max(vw - popup.width - margin, margin));

  const above = anchor.top - popup.height - gap;
  const below = anchor.bottom + gap;
  let top: number;
  if (above >= margin) top = above;
  else if (below + popup.height <= vh - margin) top = below;
  else top = Math.max(margin, vh - popup.height - margin);

  return { left: Math.round(left), top: Math.round(top) };
}
