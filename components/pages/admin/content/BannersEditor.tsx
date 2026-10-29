'use client';
import { useState } from 'react';
import { GACHA_BANNERS } from '@/lib/game/gacha';
import { GACHA_EXCLUDED_IDS, getCharacterById } from '@/lib/game/characters';
import type { BannerInput, BannerThemeInput, ContentOverrides } from '@/lib/game/content/schema';
import { Button, Field, TextInput } from '../ui';
import { draftCharacters } from './CharactersEditor';

export interface EditableBanner {
  id: string;
  title: string;
  subtitle: string;
  theme: BannerThemeInput;
  isNew: boolean;
  hidden: boolean;
  featuredIds: string[];
  inCode: boolean;       // vol1, vol2 : bannières du code
  memberIds: string[];   // persos tirables sur cette bannière, brouillon compris
  lockedIds: string[];   // persos du code, qu'on ne peut pas retirer d'une bannière du code
}

const DEFAULT_THEME: BannerThemeInput = { accent: '#22d3ee', hi: '#a5f3fc', dark: '#04161c', deep: '#0e5466', glow: 'rgba(34,211,238,0.35)' };

const isTirable = (draft: ContentOverrides, id: string) =>
  !GACHA_EXCLUDED_IDS.has(id) && !draft.characters[id]?.excludeFromGacha && !getCharacterById(id)?.isHero;

// Bannières telles que le jeu les verra avec le brouillon.
export function editableBanners(draft: ContentOverrides): EditableBanner[] {
  const tirable = draftCharacters(draft).filter(r => isTirable(draft, r.id)).map(r => r.id);
  const known = new Set(tirable);
  const fromCode = GACHA_BANNERS.map(b => {
    const input = draft.banners[b.id] ?? {};
    const base = b.pool.map(t => t.id);
    const extra = (input.characterIds ?? []).filter(id => known.has(id) && !base.includes(id));
    return {
      id: b.id, title: input.title ?? b.title, subtitle: input.subtitle ?? b.subtitle, theme: input.theme ?? b.theme,
      isNew: input.isNew ?? !!b.isNew, hidden: input.hidden ?? !!b.hidden, featuredIds: input.featuredIds ?? b.featuredIds,
      inCode: true, memberIds: b.id === 'vol1' ? tirable : [...base, ...extra], lockedIds: b.id === 'vol1' ? tirable : base,
    };
  });
  const added = Object.entries(draft.banners).filter(([id]) => !GACHA_BANNERS.some(b => b.id === id)).map(([id, input]) => ({
    id, title: input.title ?? id, subtitle: input.subtitle ?? '', theme: input.theme ?? DEFAULT_THEME,
    isNew: !!input.isNew, hidden: !!input.hidden, featuredIds: input.featuredIds ?? [],
    inCode: false, memberIds: (input.characterIds ?? []).filter(id2 => known.has(id2)), lockedIds: [],
  }));
  return [...fromCode, ...added];
}

/** Ajoute ou retire un perso d'une bannière dans le brouillon (sans effet sur la Vol.1, qui contient tout). */
export function setBannerMember(draft: ContentOverrides, bannerId: string, charId: string, member: boolean): ContentOverrides {
  if (bannerId === 'vol1') return draft;
  const codePool = GACHA_BANNERS.find(b => b.id === bannerId)?.pool.map(t => t.id) ?? [];
  if (codePool.includes(charId)) return draft; // déjà dans la bannière du code
  const input: BannerInput = { ...(draft.banners[bannerId] ?? {}) };
  const ids = new Set(input.characterIds ?? []);
  if (member) ids.add(charId); else ids.delete(charId);
  if (ids.size === (input.characterIds ?? []).length && [...ids].every(id => input.characterIds?.includes(id))) return draft;
  input.characterIds = [...ids];
  if (!member) input.featuredIds = input.featuredIds?.filter(f => f !== charId);
  return { ...draft, banners: { ...draft.banners, [bannerId]: input } };
}

const glowOf = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return Number.isNaN(n) ? 'rgba(168,85,247,0.35)' : `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.35)`;
};

const COLOR_FIELDS: { key: keyof Omit<BannerThemeInput, 'glow'>; label: string }[] = [
  { key: 'accent', label: 'Couleur principale' }, { key: 'hi', label: 'Couleur claire' },
  { key: 'deep', label: 'Fond saturé' }, { key: 'dark', label: 'Fond sombre' },
];

export function BannersEditor({ draft, onChange }: { draft: ContentOverrides; onChange: (d: ContentOverrides) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EditableBanner | null>(null);
  const [adding, setAdding] = useState('');
  const banners = editableBanners(draft);
  const rows = draftCharacters(draft);
  const nameOf = (id: string) => rows.find(r => r.id === id)?.name ?? id;
  const tirable = rows.filter(r => isTirable(draft, r.id));

  const open = (b: EditableBanner) => { setEditing(b.id); setForm(structuredClone(b)); setAdding(''); };
  const create = () => {
    let n = 3;
    while (banners.some(b => b.id === `vol${n}`)) n++;
    open({ id: `vol${n}`, title: `GACHA VERSE VOL.${n}`, subtitle: 'Nouveaux personnages', theme: DEFAULT_THEME, isNew: true, hidden: false,
      featuredIds: [], inCode: false, memberIds: [], lockedIds: [] });
  };

  const save = () => {
    if (!form) return;
    const code = GACHA_BANNERS.find(b => b.id === form.id);
    const input: BannerInput = {};
    if (!code || form.title !== code.title) input.title = form.title.trim();
    if (!code || form.subtitle !== code.subtitle) input.subtitle = form.subtitle.trim();
    if (!code || JSON.stringify(form.theme) !== JSON.stringify(code.theme)) input.theme = form.theme;
    if (!code || form.isNew !== !!code.isNew) input.isNew = form.isNew;
    if (form.hidden !== !!code?.hidden) input.hidden = form.hidden;
    if (!code || JSON.stringify(form.featuredIds) !== JSON.stringify(code.featuredIds)) input.featuredIds = form.featuredIds;
    const extra = form.memberIds.filter(id => !form.lockedIds.includes(id));
    if (form.id !== 'vol1' && (!code || extra.length)) input.characterIds = extra;
    const next = { ...draft.banners };
    if (Object.keys(input).length) next[form.id] = input; else delete next[form.id];
    onChange({ ...draft, banners: next });
    setEditing(null);
  };

  const revert = (id: string) => {
    const next = { ...draft.banners };
    delete next[id];
    onChange({ ...draft, banners: next });
  };

  const setTheme = (key: keyof BannerThemeInput, v: string) =>
    setForm(f => f && ({ ...f, theme: { ...f.theme, [key]: v, ...(key === 'accent' && { glow: glowOf(v) }) } }));
  const addMember = () => {
    const r = tirable.find(x => x.id === adding || x.name === adding);
    // Vol.1 : tout le monde y est déjà, « Ajouter » sert à choisir un perso vedette.
    if (r && form?.id === 'vol1') { if (!form.featuredIds.includes(r.id)) toggleFeatured(r.id); }
    else if (r && form && !form.memberIds.includes(r.id)) setForm({ ...form, memberIds: [...form.memberIds, r.id] });
    setAdding('');
  };
  const toggleFeatured = (id: string) => setForm(f => {
    if (!f) return f;
    const on = f.featuredIds.includes(id);
    if (!on && f.featuredIds.length >= 6) return f;
    return { ...f, featuredIds: on ? f.featuredIds.filter(x => x !== id) : [...f.featuredIds, id] };
  });

  const problems = form ? [
    !form.title.trim() && 'titre manquant',
    form.id !== 'vol1' && form.memberIds.length === 0 && 'aucun perso',
  ].filter(Boolean) as string[] : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/75">{banners.length} bannière(s), plus la Bannière Vedette (automatique)</p>
        <Button tone="green" onClick={create} disabled={editing !== null}>+ Nouvelle bannière</Button>
      </div>
      <datalist id="gv-tirable">{tirable.map(r => <option key={r.id} value={r.name}>{r.universe}</option>)}</datalist>

      <div className="overflow-hidden rounded-xl border border-white/15">
        {[...banners, ...(form && editing && !banners.some(b => b.id === editing) ? [form] : [])].map(b => {
          const shown = editing === b.id && form ? form : b;
          return (
            <div key={b.id} className="border-b border-white/10 last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="h-10 w-10 shrink-0 rounded-lg border border-white/20" style={{ background: `linear-gradient(135deg, ${shown.theme.deep}, ${shown.theme.dark})`, boxShadow: `0 0 12px ${shown.theme.glow}` }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold" style={{ color: shown.theme.hi }}>{shown.title}</div>
                  <div className="truncate text-sm text-white/70">{shown.subtitle || '—'} · {shown.memberIds.length} persos</div>
                </div>
                {!b.inCode && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-sm font-bold text-emerald-300">Nouvelle</span>}
                {b.inCode && draft.banners[b.id] && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-sm font-bold text-amber-300">Modifiée</span>}
                {shown.hidden && <span className="rounded-full bg-white/10 px-2 py-0.5 text-sm font-bold text-white/70">Masquée</span>}
                {editing !== b.id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(b)} disabled={editing !== null}>Modifier</Button>
                    {draft.banners[b.id] && <Button size="sm" tone="red" onClick={() => revert(b.id)} disabled={editing !== null}>{b.inCode ? 'Rétablir' : 'Retirer'}</Button>}
                  </div>
                )}
              </div>

              {editing === b.id && form && (
                <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-black/25 px-3 py-4 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
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
                  <div className="flex flex-wrap gap-x-5 sm:col-span-2 lg:col-span-4">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
                      <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={form.isNew} onChange={e => setForm({ ...form, isNew: e.target.checked })} />
                      Badge « NEW »
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
                      Persos {form.id === 'vol1' ? '(la Vol.1 contient automatiquement tous les persos tirables)' : `(${form.memberIds.length})`} — ⭐ = mis en avant sur le visuel ({form.featuredIds.length}/6)
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
                          <span key={id} className="flex min-h-10 items-center gap-1 rounded-lg border border-white/15 bg-white/[0.03] pl-2 text-sm text-white/85">
                            <button type="button" onClick={() => toggleFeatured(id)} title="Mettre en avant"
                              className={featured ? 'min-h-10 cursor-pointer px-1 text-amber-300' : 'min-h-10 cursor-pointer px-1 text-white/40 hover:text-white/80'}>⭐</button>
                            {nameOf(id)}
                            {!form.lockedIds.includes(id) && (
                              <button type="button" onClick={() => setForm({ ...form, memberIds: form.memberIds.filter(x => x !== id), featuredIds: form.featuredIds.filter(x => x !== id) })}
                                className="min-h-10 min-w-10 cursor-pointer text-red-300 hover:text-red-200" aria-label={`Retirer ${nameOf(id)}`}>✕</button>
                            )}
                            {form.lockedIds.includes(id) && <span className="w-2" />}
                          </span>
                        );
                      })}
                    </div>
                    {form.id === 'vol1' && <span className="text-sm text-white/60">Seuls les persos vedettes et ceux du brouillon sont listés ici.</span>}
                  </div>

                  {problems.length > 0 && <p className="text-sm text-amber-300 sm:col-span-2 lg:col-span-4">À compléter : {problems.join(', ')}.</p>}
                  <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                    <Button tone="purple" onClick={save} disabled={problems.length > 0}>Enregistrer</Button>
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
