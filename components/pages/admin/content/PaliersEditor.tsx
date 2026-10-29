'use client';
import { useEffect, useState } from 'react';
import { PALIERS, type PalierConfig } from '@/lib/game/paliers';
import type { PalierPatch } from '@/lib/game/content/schema';
import { NEW_PALIER, draftPaliersCount, effectivePalier, type PalierForm } from '@/lib/game/content/draftView';
import { buildImageCandidates } from '@/lib/image-fallback';
import { Button, Field, TextInput } from '../ui';
import { ImagePicker } from './ImagePicker';
import type { EditorProps } from './ContentTab';

const FIELDS: (keyof PalierPatch)[] = ['name', 'universe', 'arc', 'subtitle', 'bgGradient', 'accentColor', 'bossTimerSeconds', 'monstersPerPalier', 'bgImage'];

// Ne garde que ce qui diffère du code : un champ revenu à sa valeur d'origine
// n'est plus une modification.
function toPatch(form: PalierForm, base: PalierConfig | undefined): PalierPatch {
  const patch: PalierPatch = {};
  for (const k of FIELDS) {
    const v = form[k as keyof PalierForm];
    if (v === undefined || v === '') continue;
    if (base && base[k as keyof PalierConfig] === v) continue;
    (patch as Record<string, unknown>)[k] = v;
  }
  return patch;
}

export function PaliersEditor({ draft, onChange, onEditing }: EditorProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<PalierForm>(NEW_PALIER);
  const [query, setQuery] = useState('');
  const count = draftPaliersCount(draft);
  useEffect(() => { onEditing(editing !== null); }, [editing, onEditing]);

  const open = (id: number) => {
    setEditing(id);
    setForm(effectivePalier(draft, id) ?? { ...NEW_PALIER });
  };

  const save = () => {
    if (editing === null) return;
    const patch = toPatch(form, PALIERS[editing - 1]);
    const paliers = { ...draft.paliers };
    if (Object.keys(patch).length) paliers[editing] = patch; else delete paliers[editing];
    onChange({ ...draft, paliers });
    setEditing(null);
  };

  // Palier du code : retour aux valeurs d'origine. Palier ajouté : on ne peut
  // retirer que le dernier (les paliers se suivent toujours, sans trou).
  const revert = (id: number) => {
    const isNew = id > PALIERS.length;
    if (isNew && !window.confirm(`Supprimer le palier ${id} et ses ennemis du brouillon ?`)) return;
    const paliers = { ...draft.paliers };
    const enemies = { ...draft.enemies };
    delete paliers[id];
    if (isNew) delete enemies[id];
    onChange({ ...draft, paliers, enemies });
  };

  const set = <K extends keyof PalierForm>(k: K, v: PalierForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const q = query.trim().toLowerCase();
  const ids = Array.from({ length: count }, (_, i) => i + 1).filter(id => {
    if (!q || id === editing) return true;
    const p = effectivePalier(draft, id);
    return String(id) === q || !!p && `${p.name} ${p.universe} ${p.arc}`.toLowerCase().includes(q);
  });
  if (editing === count + 1) ids.push(count + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Rechercher" className="min-w-0 flex-1 basis-56">
          <TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="Numéro, nom, univers ou arc" />
        </Field>
        <Button tone="green" onClick={() => open(count + 1)} disabled={editing !== null}>+ Ajouter le palier {count + 1}</Button>
      </div>
      <p className="text-sm text-white/75">{count} paliers · {Object.keys(draft.paliers).length} modifié(s) ou ajouté(s) dans le brouillon</p>

      <div className="overflow-hidden rounded-xl border border-white/15">
        {ids.map(id => {
          const p = id === editing ? form : effectivePalier(draft, id);
          if (!p) return null;
          const isNew = id > PALIERS.length;
          const modified = !!draft.paliers[id];
          const lastAdded = isNew && id === count;
          return (
            <div key={id} className="border-b border-white/10 last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: p.accentColor }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-white">
                    <span className="tabular-nums text-white/60">#{id}</span> {p.name || 'Nouveau palier'}
                  </div>
                  <div className="truncate text-sm text-white/70">{p.universe || '—'} · {p.arc || '—'}</div>
                </div>
                {isNew && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-sm font-bold text-emerald-300">Nouveau</span>}
                {isNew && !draft.enemies[id] && id !== editing && <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-sm font-bold text-red-300">Sans ennemis</span>}
                {!isNew && modified && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-sm font-bold text-amber-300">Modifié</span>}
                {editing !== id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(id)} disabled={editing !== null}>Modifier</Button>
                    {!isNew && modified && <Button size="sm" tone="red" onClick={() => revert(id)} disabled={editing !== null} title="Revenir aux valeurs du code">Rétablir</Button>}
                    {lastAdded && <Button size="sm" tone="red" onClick={() => revert(id)} disabled={editing !== null}>Supprimer</Button>}
                  </div>
                )}
              </div>

              {editing === id && (
                <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-black/25 px-3 py-4 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
                  <Field label="Nom du palier"><TextInput value={form.name} onChange={e => set('name', e.target.value.toUpperCase())} placeholder="EX : ARC SAIYEN" /></Field>
                  <Field label="Univers (licence)"><TextInput value={form.universe} onChange={e => set('universe', e.target.value)} placeholder="Dragon Ball Z" /></Field>
                  <Field label="Arc"><TextInput value={form.arc} onChange={e => set('arc', e.target.value)} /></Field>
                  <Field label="Sous-titre"><TextInput value={form.subtitle} onChange={e => set('subtitle', e.target.value)} /></Field>
                  <Field label="Couleur">
                    <div className="flex gap-2">
                      <input type="color" value={form.accentColor} onChange={e => set('accentColor', e.target.value)}
                        className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/25 bg-transparent" />
                      <TextInput value={form.accentColor} onChange={e => set('accentColor', e.target.value)} />
                    </div>
                  </Field>
                  <Field label="Minuteur du boss (s)">
                    <TextInput type="number" min={10} max={600} value={form.bossTimerSeconds} onChange={e => set('bossTimerSeconds', Number(e.target.value))} />
                  </Field>
                  <Field label="Dégradé de secours (si pas d'image)" className="sm:col-span-2">
                    <TextInput value={form.bgGradient} onChange={e => set('bgGradient', e.target.value)} />
                  </Field>
                  <Field label="Image de fond (1600 × 900 conseillé)" className="sm:col-span-2 lg:col-span-4">
                    <ImagePicker value={form.bgImage} onChange={ref => set('bgImage', ref)} maxW={1600} maxH={900} size={72}
                      fallback={id <= PALIERS.length ? buildImageCandidates(`/backgrounds/bg_palier_${id}`) : []} label="Changer le fond" />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
                    <Button tone="purple" onClick={save} disabled={!form.name.trim() || !form.universe.trim()}>Valider</Button>
                    <Button onClick={() => setEditing(null)}>Annuler</Button>
                    {isNew && <span className="text-sm text-amber-300">Pense à ses 10 ennemis (onglet Ennemis).</span>}
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
