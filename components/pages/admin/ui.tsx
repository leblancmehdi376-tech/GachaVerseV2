'use client';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

// Petites briques visuelles partagées par tous les onglets du panel admin :
// une seule source pour les couleurs, tailles de boutons et champs, pour que
// les écrans restent cohérents (et lisibles sur mobile : cibles ≥ 44px).

export type Tone = 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'orange' | 'cyan' | 'neutral';

// Classes écrites en entier (pas de concaténation) pour que Tailwind les détecte.
const TONE_BUTTON: Record<Tone, string> = {
  green:   'bg-emerald-400/10 border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/20',
  blue:    'bg-sky-400/10 border-sky-400/40 text-sky-300 hover:bg-sky-400/20',
  purple:  'bg-violet-400/10 border-violet-400/40 text-violet-300 hover:bg-violet-400/20',
  amber:   'bg-amber-400/10 border-amber-400/40 text-amber-300 hover:bg-amber-400/20',
  red:     'bg-red-400/10 border-red-400/40 text-red-300 hover:bg-red-400/20',
  orange:  'bg-orange-400/10 border-orange-400/40 text-orange-300 hover:bg-orange-400/20',
  cyan:    'bg-cyan-400/10 border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/20',
  neutral: 'bg-white/[0.03] border-white/15 text-white/85 hover:bg-white/[0.08] hover:text-white',
};

const TONE_TEXT: Record<Tone, string> = {
  green: 'text-emerald-300', blue: 'text-sky-300', purple: 'text-violet-300', amber: 'text-amber-300',
  red: 'text-red-300', orange: 'text-orange-300', cyan: 'text-cyan-300', neutral: 'text-white/80',
};

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Button({ tone = 'neutral', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone; size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-bold whitespace-nowrap transition-colors',
        'cursor-pointer disabled:cursor-default disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
        size === 'sm' ? 'min-h-10 px-3 text-sm' : 'min-h-11 px-4 text-base',
        TONE_BUTTON[tone],
        className,
      )}
    />
  );
}

// Groupe de boutons exclusifs (onglets, filtres, périodes). Défile
// horizontalement sur mobile plutôt que de déborder.
export function Segmented<T extends string>({ value, options, onChange, tone = 'purple', label, className }: {
  value: T;
  options: { id: T; label: ReactNode }[];
  onChange: (v: T) => void;
  tone?: Tone;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx('flex max-w-full gap-1 overflow-x-auto rounded-xl border border-white/20 bg-black/30 p-1', className)}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cx(
              'min-h-10 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-bold whitespace-nowrap transition-colors',
              active ? cx('bg-white/10 shadow-sm', TONE_TEXT[tone]) : 'text-white/75 hover:bg-white/5 hover:text-white/90',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ children, className, tone }: { children: ReactNode; className?: string; tone?: Tone }) {
  return (
    <div className={cx(
      'min-w-0 rounded-2xl border bg-white/[0.025] p-4 sm:p-5',
      tone === 'amber' ? 'border-amber-400/25' : tone === 'orange' ? 'border-orange-400/25' : 'border-white/15',
      className,
    )}>
      {children}
    </div>
  );
}

export function SectionHeader({ icon, title, subtitle, right }: {
  icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-white">
          {icon && <span aria-hidden>{icon}</span>}{title}
        </h3>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-white/75">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function StatTile({ label, value, tone = 'neutral', hint }: { label: ReactNode; value: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div title={hint} className="min-w-0 rounded-xl border border-white/15 bg-black/25 px-3 py-2.5">
      <div className={cx('truncate text-xl font-black tabular-nums leading-tight', TONE_TEXT[tone])}>{value}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-white/80">{label}</div>
    </div>
  );
}

const FIELD_CLASS = 'w-full min-h-11 rounded-lg border border-white/25 bg-[#0a0818] px-3 text-sm text-white placeholder:text-white/50 focus:border-violet-400/70 focus:outline-none disabled:text-white/65';

export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-sm font-semibold text-white/75">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(FIELD_CLASS, className)} />;
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(FIELD_CLASS, 'cursor-pointer', className)} />;
}

// Message de retour d'une action : la couleur suit l'emoji de tête (✅ / ⚠️ / ❌).
export function Feedback({ msg, className }: { msg: string | null; className?: string }) {
  if (!msg) return null;
  const tone = msg.startsWith('✅') ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    : msg.startsWith('⚠️') ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
    : 'border-red-400/30 bg-red-400/10 text-red-300';
  return <div role="status" className={cx('rounded-lg border px-3 py-2 text-sm font-semibold', tone, className)}>{msg}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-white/70">{children}</div>;
}
