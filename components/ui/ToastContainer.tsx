'use client';
import { useEffect, useState } from 'react';
import { useToastStore, Toast } from '@/hooks/useToast';

const TYPE_STYLE: Record<string, { accent: string; glow: string; bar: string }> = {
  loot   : { accent:'#c084fc', glow:'rgba(192,132,252,0.25)', bar:'linear-gradient(90deg,#5b21b6,#c084fc)' },
  quest  : { accent:'#34d399', glow:'rgba(52,211,153,0.2)',   bar:'linear-gradient(90deg,#065f46,#34d399)' },
  levelup: { accent:'#fbbf24', glow:'rgba(251,191,36,0.25)',  bar:'linear-gradient(90deg,#78350f,#fbbf24)' },
  palier : { accent:'#e879f9', glow:'rgba(232,121,249,0.3)',  bar:'linear-gradient(90deg,#701a75,#e879f9)' },
  error  : { accent:'#f87171', glow:'rgba(248,113,113,0.25)', bar:'linear-gradient(90deg,#7f1d1d,#f87171)' },
  info   : { accent:'#60a5fa', glow:'rgba(96,165,250,0.2)',   bar:'linear-gradient(90deg,#1e3a8a,#60a5fa)' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const style = TYPE_STYLE[toast.type] ?? TYPE_STYLE.info;
  const dur = toast.duration ?? 3500;

  useEffect(() => {
    // Mount → slide in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Start exit slightly before dismiss
    const t2 = setTimeout(() => setLeaving(true), dur - 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [dur]);

  return (
    <div
      onClick={() => { setLeaving(true); setTimeout(onDismiss, 340); }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '300px',
        background: 'linear-gradient(135deg, rgba(15,12,30,0.97), rgba(8,6,18,0.97))',
        border: `1px solid ${style.accent}55`,
        borderRadius: '10px',
        padding: '12px 14px 14px',
        cursor: 'pointer',
        boxShadow: `0 4px 28px rgba(0,0,0,0.5), 0 0 16px ${style.glow}`,
        backdropFilter: 'blur(8px)',
        // Slide in from right, exit to right
        transform: visible && !leaving ? 'translateX(0) scale(1)' : 'translateX(110%) scale(0.96)',
        opacity: visible && !leaving ? 1 : 0,
        transition: leaving
          ? 'transform 0.3s cubic-bezier(0.4,0,1,1), opacity 0.3s ease'
          : 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease',
      }}
    >
      {/* Top accent line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:style.bar }} />

      {/* Content */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
        {/* Icon */}
        <div style={{
          width: 32, height: 32, flexShrink: 0,
          background: `${style.accent}18`,
          border: `1px solid ${style.accent}44`,
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16.5px',
        }}>
          {toast.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--f-ui)',
            fontWeight: 800,
            fontSize: '13.4px',
            color: style.accent,
            letterSpacing: '0.3px',
            marginBottom: toast.message ? '3px' : 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {toast.title}
          </div>
          {toast.message && (
            <div style={{
              fontFamily: 'var(--f-ui)',
              fontSize: '11.3px',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
              fontWeight: 600,
            }}>
              {toast.message}
            </div>
          )}
        </div>

        {/* Dismiss X */}
        <div style={{ fontSize: '11.3px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>✕</div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '2px',
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: '100%',
          background: style.bar,
          animation: `toastProgress ${dur}ms linear forwards`,
        }} />
      </div>

      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div style={{
      position: 'fixed',
      top: '68px',   // sous la top bar
      right: '16px',
      zIndex: 9998,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
