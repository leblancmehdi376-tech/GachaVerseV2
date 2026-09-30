'use client';
import { useCallback, useEffect, useRef, useState, type RefObject, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Ouverture d'une infobulle : au survol à la souris, à l'appui au doigt.
 * Avec de simples onMouseEnter/onMouseLeave, un tap sur mobile déclenche un
 * mouseenter émulé qui ouvre l'infobulle sans jamais la refermer (elle reste
 * collée par-dessus la page). Ici le toucher bascule l'infobulle, et un appui
 * n'importe où en dehors de l'ancre (et de la popup `popupRef`, qu'on peut
 * alors faire défiler au doigt) la referme. Un tap SUR la popup la referme
 * aussi : brancher `popupProps` sur son élément (un glissement pour la faire
 * défiler ne déclenche pas de clic, il reste donc possible).
 */
export function useHoverTap(anchorRef: RefObject<HTMLElement | null>, onOpen?: () => void, popupRef?: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  const pointerType = useRef('mouse');

  useEffect(() => {
    if (!visible) return;
    const close = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!anchorRef.current?.contains(target) && !popupRef?.current?.contains(target)) setVisible(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [visible, anchorRef, popupRef]);

  const open = () => { onOpen?.(); setVisible(true); };

  const triggerProps = {
    onPointerDown: (e: ReactPointerEvent) => { pointerType.current = e.pointerType; },
    onPointerEnter: (e: ReactPointerEvent) => { if (e.pointerType === 'mouse') open(); },
    onPointerLeave: (e: ReactPointerEvent) => { if (e.pointerType === 'mouse') setVisible(false); },
    onClick: (e: ReactMouseEvent) => {
      // Un clic dans une popup rendue en portail remonte jusqu'ici par l'arbre
      // React : on l'ignore, sinon toucher la popup la refermerait.
      if (!anchorRef.current?.contains(e.target as Node)) return;
      if (pointerType.current === 'mouse') return;
      if (visible) setVisible(false); else open();
    },
  };

  const hide = useCallback(() => setVisible(false), []);

  const popupProps = { onClick: hide };

  return { visible, hide, triggerProps, popupProps };
}
