'use client';
import { useEffect, useState } from 'react';
import { GACHA_BANNERS, FEATURED_RATE_UP } from '@/lib/game/gacha';
import { RARITY_ORDER_ASC } from '@/types/game';
import type { BannerInput, BannerThemeInput } from '@/lib/game/content/schema';
import {
  DEFAULT_BANNER_THEME, bannerStatus, draftCharacters, editableBanners, isTirableIn, reorderBanners,
  type BannerStatus, type EditableBanner,
} from '@/lib/game/content/draftView';
import { formatTimeLeft } from '@/lib/game/format';
import { useNow } from '@/hooks/useNow';
import { Button, Field, TextInput } from '../ui';
import { Badge, CardThumb } from './CharactersEditor';
import type { EditorProps } from './ContentTab';

const STATUS: Record<BannerStatus, { label: string; tone: 'green' | 'cyan' | 'neutral' | 'red' }> = {
  live: { label: 'En cours', tone: 'green' }, scheduled: { label: 'Programmée', tone: 'cyan' },
  ended: { label: 'Terminée', tone: 'neutral' }, hidden: { label: 'Masquée', tone: 'red' },
};

const glowOf = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return Number.isNaN(n) ? 'rgba(168,85,247,0.35)' : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.35)`;
};

const COLOR_FIELDS: { key: keyof Omit<BannerThemeInput, 'glow'>; label: string }[] = [
  { key: 'accent', label: 'Couleur principale' }, { key: 'hi', label: 'Couleur claire' },
  { key: 'deep', label: 'Fond saturé' }, { key: 'dark', label: 'Fond sombre' },
];

// <input type="datetime-local"> travaille en heure locale, sans fuseau.
const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (s: string): number | undefined => (s ? new Date(s).getTime() : undefined);
const formatDate = (ms: number) => new Date(ms).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

export function BannersEditor({ draft, onChange, onEditing }: EditorProps) {
  const now = useNow(60_000);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditableBanner | null>(null);
  const [adding, setAdding] = useState('');
  useEffect(() => { onEditing(editing !== null); }, [editing, onEditing]);

  const banners = editableBanners(draft);
  const rows = draftCharacters(draft);
  const rowOf = new Map(rows.map(r => [r.id, r]));
  const nameOf = (id: string) => rowOf.get(id)?.name ?? id;

  // Visuel : vedettes choisies, sinon les 6 persos de plus haute rareté (comme en jeu).
  const visualIds = (b: EditableBanner) => {
    if (b.featuredIds.length) return b.featuredIds;
    const rank = (id: string) => RARITY_ORDER_ASC.indexOf(rowOf.get(id)?.rarity ?? 'C');
    return [...b.memberIds].sort((x, y) => rank(y) - rank(x)).slice(0, 6);
  };

  const open = (b: EditableBanner) => { setEditing(b.id); setForm(structuredClone(b)); setAdding(''); };
  const create = () => {
    let n = 3;
    while (banners.some(b => b.id === `vol${n}`)) n++;
    open({
      id: `vol${n}`, title: `GACHA VERSE VOL.${n}`, subtitle: 'Nouveaux personnages', theme: DEFAULT_BANNER_THEME, isNew: true,
      hidden: false, rateUp: false, featuredIds: [], inCode: false, memberIds: [], lockedIds: [],
    });
  };

  const save = () => {
    if (!form) return;
    const code = GACHA_BANNERS.find(b => b.id === form.id);
    const prev = draft.banners[form.id] ?? {};
    const input: BannerInput = { ...(prev.order !== undefined && { order: prev.order }) };
    if (!code || form.title !== code.title) input.title = form.title.trim();
    if (!code || form.subtitle !== code.subtitle) input.subtitle = form.subtitle.trim();
    if (!code || JSON.stringify(form.theme) !== JSON.stringify(code.theme)) input.theme = form.theme;
    if (!code || form.isNew !== !!code.isNew) input.isNew = form.isNew;
    if (form.hidden) input.hidden = true;
    if (form.startsAt) input.startsAt = form.startsAt;
    if (form.endsAt) input.endsAt = form.endsAt;
    if (form.rateUp) input.rateUp = true;
    if (!code || JSON.stringify(form.featuredIds) !== JSON.stringify(code.featuredIds)) input.featuredIds = form.featuredIds;
    const extra = form.memberIds.filter(id => !form.lockedIds.includes(id));
    if (form.id !== 'vol1' && (!code || extra.length)) input.characterIds = extra;
    const next = { ...draft.banners };
    if (Object.keys(input).length) next[form.id] = input; else delete next[form.id];
    onChange({ ...draft, banners: next });
    setEditing(null);
  };

  const remove = (b: EditableBanner) => {
    const msg = b.inCode
      ? `Rétablir « ${b.title} » telle qu'elle est dans le code ?`
      : `Supprimer la bannière « ${b.title} » ? Elle disparaîtra du Gacha à la prochaine publication (les persos obtenus restent).`;
    if (!window.confirm(msg)) return;
    const next = { ...draft.banners };
    delete next[b.id];
    onChange({ ...draft, banners: next });
  };

  const move = (i: number, d: -1 | 1) => {
    const ids = banners.map(b => b.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    onChange(reorderBanners(draft, ids));
  };

  const setTheme = (key: keyof BannerThemeInput, v: string) =>
    setForm(f => f && ({ ...f, theme: { ...f.theme, [key]: v, ...(key === 'accent' && { glow: glowOf(v) }) } }));
  const toggleFeatured = (id: string) => setForm(f => {
    if (!f) return f;
    const on = f.featuredIds.includes(id);
    if (!on && f.featuredIds.length >= 6) return f;
    return { ...f, featuredIds: on ? f.featuredIds.filter(x => x !== id) : [...f.featuredIds, id] };
  });
  const addMember = () => {
    if (!form) return;
    const r = rows.find(x => (x.id === adding || x.name === adding) && isTirableIn(x, form.id));
    // Vol.1 : tout le monde y est déjà, « Ajouter » sert à choisir un perso vedette.
    if (r && form.id === 'vol1') { if (!form.featuredIds.includes(r.id)) toggleFeatured(r.id); }
    else if (r && !form.memberIds.includes(r.id)) setForm({ ...form, memberIds: [...form.memberIds, r.id] });
    setAdding('');
  };

  const problems = form ? [
    !form.title.trim() && 'titre manquant',
    form.id !== 'vol1' && form.memberIds.length === 0 && 'aucun perso',
    form.startsAt && form.endsAt && form.endsAt <= form.startsAt && 'la fin doit être après le début',
  ].filter(Boolean) as string[] : [];

  const list = [...banners, ...(form && editing && !banners.some(b => b.id === editing) ? [form] : [])];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/75">{banners.length} bannière(s) dans cet ordre d&apos;onglets, plus la Bannière Vedette (automatique, toujours à droite)</p>
        <Button tone="green" onClick={create} disabled={editing !== null}>+ Nouvelle bannière</Button>
      </div>
      {form && (
        <datalist id="gv-tirable">
          {rows.filter(r => isTirableIn(r, form.id)).map(r => <option key={r.id} value={r.name}>{r.universe}</option>)}
        </datalist>
      )}

      <div className="overflow-hidden rounded-xl border border-white/15">
        {list.map((b, i) => {
          const shown = editing === b.id && form ? form : b;
          const status = bannerStatus(shown, now);
          return (
            <div key={b.id} className="border-b border-white/10 last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
                {editing === null && (
                  <div className="flex shrink-0 flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Onglet vers la gauche"
                      className="min-h-6 min-w-10 cursor-pointer text-white/60 hover:text-white disabled:cursor-default disabled:opacity-25">▲</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === banners.length - 1} aria-label="Onglet vers la droite"
                      className="min-h-6 min-w-10 cursor-pointer text-white/60 hover:text-white disabled:cursor-default disabled:opacity-25">▼</button>
                  </div>
                )}
                <span className="h-10 w-10 shrink-0 rounded-lg border border-white/20" style={{ background: `linear-gradient(135deg, ${shown.theme.deep}, ${shown.theme.dark})`, boxShadow: `0 0 12px ${shown.theme.glow}` }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold" style={{ color: shown.theme.hi }}>{shown.title}</div>
                  <div className="truncate text-sm text-white/70">
                    {shown.subtitle || '—'} · {shown.memberIds.length} persos
                    {status === 'scheduled' && shown.startsAt && <> · ouvre le {formatDate(shown.startsAt)}</>}
                    {status === 'live' && shown.endsAt && <> · fin dans {formatTimeLeft(shown.endsAt - now)}</>}
                  </div>
                </div>
                <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
                {!b.inCode && <Badge tone="green">Ajoutée</Badge>}
                {b.inCode && draft.banners[b.id] && <Badge tone="amber">Modifiée</Badge>}
                {shown.rateUp && <Badge tone="amber">{`Vedettes ×${FEATURED_RATE_UP}`}</Badge>}
                {editing !== b.id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(b)} disabled={editing !== null}>Modifier</Button>
                    {(!b.inCode || draft.banners[b.id]) && (
                      <Button size="sm" tone="red" onClick={() => remove(b)} disabled={editing !== null}>{b.inCode ? 'Rétablir' : 'Supprimer'}</Button>
                    )}
                  </div>
                )}
              </div>

              {editing === b.id && form && (
                <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-black/25 px-3 py-4 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
                  {/* Aperçu du visuel, comme en jeu */}
                  <div className="flex min-h-28 items-end justify-center gap-2 overflow-hidden rounded-xl border px-3 pt-3 sm:col-span-2 lg:col-span-4"
                    style={{ borderColor: `${form.theme.accent}99`, background: `radial-gradient(ellipse at 50% 35%, ${form.theme.deep} 0%, ${form.theme.dark} 70%)`, boxShadow: `0 0 18px ${form.theme.glow}` }}>
                    {visualIds(form).length === 0 && <span className="self-center text-sm text-white/60">Ajoute des persos pour voir le visuel</span>}
                    {visualIds(form).map(id => <CardThumb key={id} id={id} image={rowOf.get(id)?.image} className="h-24 w-20" />)}
                  </div>

                  <Field label="Titre" className="sm:col-span-2"><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
                  <Field label="Sous-titre" className="sm:col-span-2"><TextInput value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></Field>
                  {COLOR_FIELDS.map(c => (
                    <Field key={c.key} label={c.label}>
                      <div className="flex gap-2">
                        <input type="color" value={form.theme[c.key]} onChange={e => setTheme(c.key, e.target.value)}
                          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/25 bg-transparent" />
                        <TextInput value={form.theme[c.key]} onChange={e => setTheme(c.key, e.target.value)} />
                      </div>
                    </Field>
                  ))}

                  {form.id !== 'vol1' && <>
                  <Field label="Début (vide = tout de suite)" className="sm:col-span-2">
                    <div className="flex gap-2">
                      <TextInput type="datetime-local" value={toLocalInput(form.startsAt)} onChange={e => setForm({ ...form, startsAt: fromLocalInput(e.target.value) })} />
                      {form.startsAt && <Button onClick={() => setForm({ ...form, startsAt: undefined })}>✕</Button>}
                    </div>
                  </Field>
                  <Field label="Fin (vide = permanente)" className="sm:col-span-2">
                    <div className="flex gap-2">
                      <TextInput type="datetime-local" value={toLocalInput(form.endsAt)} onChange={e => setForm({ ...form, endsAt: fromLocalInput(e.target.value) })} />
                      {form.endsAt && <Button onClick={() => setForm({ ...form, endsAt: undefined })}>✕</Button>}
                    </div>
                  </Field>
                  {!form.endsAt && (
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                      <span className="text-sm text-white/75">Durée rapide :</span>
                      {[3, 7, 14, 30].map(d => (
                        <Button key={d} size="sm" onClick={() => setForm({ ...form, endsAt: (form.startsAt ?? Date.now()) + d * 86_400_000 })}>
                          {d} jours
                        </Button>
                      ))}
                    </div>
                  )}
                  </>}

                  <div className="flex flex-wrap gap-x-5 sm:col-span-2 lg:col-span-4">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
                      <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={form.isNew} onChange={e => setForm({ ...form, isNew: e.target.checked })} />
                      Badge « NEW »
                    </label>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
                      <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={form.rateUp} onChange={e => setForm({ ...form, rateUp: e.target.checked })} />
                      Taux augmenté : vedettes ×{FEATURED_RATE_UP} à rareté égale
                    </label>
                    {form.id !== 'vol1' && (
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
                        <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={form.hidden} onChange={e => setForm({ ...form, hidden: e.target.checked })} />
                        Masquée (retirée du Gacha)
                      </label>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
                    <span className="text-sm font-semibold text-white/75">
                      Persos {form.id === 'vol1' ? '(la Vol.1 contient automatiquement tous les persos tirables, sauf les persos limités)' : `(${form.memberIds.length})`} — ⭐ = vedette du visuel ({form.featuredIds.length}/6)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <TextInput value={adding} onChange={e => setAdding(e.target.value)} list="gv-tirable" className="min-w-0 flex-1 basis-56"
                        placeholder={form.id === 'vol1' ? 'Ajouter un perso vedette (nom)' : 'Ajouter un perso (nom)'}
                        onKeyDown={e => { if (e.key === 'Enter') addMember(); }} />
                      <Button onClick={addMember} disabled={!adding}>Ajouter</Button>
                    </div>
                    <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
                      {(form.id === 'vol1' ? form.memberIds.filter(id => form.featuredIds.includes(id) || !!draft.characters[id]) : form.memberIds).map(id => {
                        const featured = form.featuredIds.includes(id);
                        return (
                          <span key={id} className="flex min-h-10 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] pl-1 text-sm text-white/85">
                            <button type="button" onClick={() => toggleFeatured(id)} title="Vedette du visuel"
                              className={featured ? 'min-h-10 min-w-10 cursor-pointer text-amber-300' : 'min-h-10 min-w-10 cursor-pointer text-white/35 hover:text-white/80'}>⭐</button>
                            {nameOf(id)}
                            {form.lockedIds.includes(id)
                              ? <span className="w-3" />
                              : <button type="button" onClick={() => setForm({ ...form, memberIds: form.memberIds.filter(x => x !== id), featuredIds: form.featuredIds.filter(x => x !== id) })}
                                  className="min-h-10 min-w-10 cursor-pointer text-red-300 hover:text-red-200" aria-label={`Retirer ${nameOf(id)}`}>✕</button>}
                          </span>
                        );
                      })}
                    </div>
                    {form.id === 'vol1' && <span className="text-sm text-white/60">Seuls les persos vedettes et ceux du brouillon sont listés ici.</span>}
                  </div>

                  {problems.length > 0 && <p className="text-sm text-amber-300 sm:col-span-2 lg:col-span-4">À compléter : {problems.join(', ')}.</p>}
                  <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                    <Button tone="purple" onClick={save} disabled={problems.length > 0}>Valider</Button>
                    <Button onClick={() => setEditing(null)}>Annuler</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
