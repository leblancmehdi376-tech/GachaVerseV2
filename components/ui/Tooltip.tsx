"use client";
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({ top: 0, left: 0, placement: 'top' });

  useLayoutEffect(() => {
    if (!visible) return;
    const a = anchorRef.current;
    const t = tipRef.current;
    if (!a || !t) return;
    const gap = 8;
    const aRect = a.getBoundingClientRect();
    const tRect = t.getBoundingClientRect();
    const center = aRect.left + aRect.width / 2;
    let top = aRect.top - tRect.height - gap;
    let placement: 'top' | 'bottom' = 'top';
    if (top < 8) { top = aRect.bottom + gap; placement = 'bottom'; }
    let left = center - tRect.width / 2;
    const minLeft = 8;
    const maxLeft = window.innerWidth - tRect.width - 8;
    left = Math.min(Math.max(left, minLeft), Math.max(maxLeft, minLeft));
    setPos({ top: Math.round(top), left: Math.round(left), placement });
  }, [visible, content]);

  useEffect(() => {
    if (!visible) return;
    const h = () => { if (tipRef.current) setPos(p => ({ ...p })); };
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, { passive: true });
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h); };
  }, [visible]);

  const tip = (
    <span ref={tipRef} style={{ position: 'fixed', top: pos.top, left: pos.left, background: 'rgba(10,10,14,0.96)', color: 'white', padding: '6px 8px', borderRadius: 8, fontSize: 12.4, zIndex: 9999, pointerEvents: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.6)', maxWidth: '70vw' }}>
      {content}
    </span>
  );

  return (
    <span ref={anchorRef} style={{ display: 'inline-flex' }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && createPortal(tip, document.body)}
    </span>
  );
}

export default Tooltip;
