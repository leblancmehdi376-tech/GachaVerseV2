'use client';
import { useState } from 'react';
import { PALIERS, type PalierConfig } from '@/lib/game/paliers';
import type { ContentOverrides, PalierPatch } from '@/lib/game/content/schema';
import { buildImageCandidates } from '@/lib/image-fallback';
import { Button, Field, TextInput, cx } from '../ui';
import { ImagePicker } from './ImagePicker';

// Champs éditables d'un palier (id exclu).
type PalierForm = Omit<PalierConfig, 'id'>;
const FIELDS: (keyof PalierPatch)[] = ['name', 'universe', 'arc', 'subtitle', 'bgGradient', 'accentColor', 'bossTimerSeconds', 'monstersPerPalier', 'bgImage'];

const NEW_PALIER: PalierForm = {
  name: '', universe: '', arc: '', subtitle: '', bgGradient: 'linear-gradient(180deg,#0a0a14,#05050a)',
  accentColor: '#a855f7', bossTimerSeconds: 90, monstersPerPalier: 10,
};

// Palier tel que le jeu l'affichera : code + modifications du brouillon.
export function effectivePalier(draft: ContentOverrides, id: number): PalierForm | null {
  const base = PALIERS[id - 1];
  const patch = draft.paliers[id];
  if (!base && !patch) return null;
  return { ...NEW_PALIER, ...(base ?? {}), ...(patch ?? {}) };
}

// Nombre de paliers une fois le brouillon appliqué (les nouveaux se suivent).
export function draftPaliersCount(draft: ContentOverrides): number {
  let n = PALIERS.length;
  while (draft.paliers[n + 1]) n++;
  return n;
}

// Ne garde que ce qui diffère du code : un champ revenu à sa valeur d'origine
// n'est plus une modification.
function toPatch(form: PalierForm, base: PalierConfig | undefined): PalierPatch {
  const patch: PalierPatch = {};
  for (const k of FIELDS) {
    const v = form[k as keyof PalierForm];
    if (v === undefined || v === '' ) continue;
    if (base && base[k as keyof PalierConfig] === v) continue;
    (patch as Record<string, unknown>)[k] = v;
  }
  return patch;
}

export function PaliersEditor({ draft, onChange }: { draft: ContentOverrides; onChange: (d: ContentOverrides) => void }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<PalierForm>(NEW_PALIER);
  const count = draftPaliersCount(draft);

  const open = (id: number) => {
    setEditing(id);
    setForm(effectivePalier(draft, id) ?? { ...NEW_PALIER });
  };

  const save = () => {
    if (editing === null) return;
    const base = PALIERS[editing - 1];
    const patch = toPatch(form, base);
    const paliers = { ...draft.paliers };
    if (Object.keys(patch).length) paliers[editing] = patch; else delete paliers[editing];
    onChange({ ...draft, paliers });
    setEditing(null);
  };

  const revert = (id: number) => {
    const paliers = { ...draft.paliers };
    delete paliers[id];
    // Supprimer un nouveau palier retire aussi ses ennemis et ceux qui le suivent.
    const enemies = { ...draft.enemies };
    if (id > PALIERS.length) {
      for (const k of Object.keys(paliers).map(Number)) if (k > id) delete paliers[k];
      for (const k of Object.keys(enemies).map(Number)) if (k >= id) delete enemies[k];
    }
    onChange({ ...draft, paliers, enemies });
    if (editing === id) setEditing(null);
  };

  const set = <K extends keyof PalierForm>(k: K, v: PalierForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const ids = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-white/75">{count} paliers · {Object.keys(draft.paliers).length} modifié(s) ou ajouté(s) dans le brouillon</p>
        <Button tone="green" onClick={() => open(count + 1)} disabled={editing !== null}>+ Ajouter le palier {count + 1}</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/15">
        {[...ids, ...(editing === count + 1 ? [count + 1] : [])].map(id => {
          const p = id === editing ? form : effectivePalier(draft, id);
          if (!p) return null;
          const isNew = id > PALIERS.length;
          const modified = !!draft.paliers[id];
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
                {!isNew && modified && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-sm font-bold text-amber-300">Modifié</span>}
                {editing !== id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(id)} disabled={editing !== null}>Modifier</Button>
                    {(modified || isNew) && (
                      <Button size="sm" tone="red" onClick={() => revert(id)} disabled={editing !== null}
                        title={isNew ? 'Retirer ce palier du brouillon' : 'Revenir aux valeurs du code'}>
                        {isNew ? 'Retirer' : 'Rétablir'}
                      </Button>
                    )}
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
                  <Field label="Dégradé de secours" className="sm:col-span-2">
                    <TextInput value={form.bgGradient} onChange={e => set('bgGradient', e.target.value)} />
                  </Field>
                  <Field label="Image de fond" className="sm:col-span-2 lg:col-span-4">
                    <ImagePicker value={form.bgImage} onChange={ref => set('bgImage', ref)} maxW={1600} maxH={900} size={72}
                      fallback={id <= PALIERS.length ? buildImageCandidates(`/backgrounds/bg_palier_${id}`) : []} label="Changer le fond" />
                  </Field>
                  <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                    <Button tone="purple" onClick={save} disabled={!form.name.trim() || !form.universe.trim()}>Enregistrer</Button>
                    <Button onClick={() => setEditing(null)}>Annuler</Button>
                    {isNew && <span className={cx('self-center text-sm text-amber-300')}>N&apos;oublie pas ses 10 ennemis (onglet Ennemis).</span>}
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
