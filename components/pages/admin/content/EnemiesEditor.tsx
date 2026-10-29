'use client';
import { useEffect, useState } from 'react';
import { getPalierEnemyDefs } from '@/lib/game/enemies';
import { PALIERS } from '@/lib/game/paliers';
import { ENEMIES_PER_PALIER } from '@/lib/game/content/apply';
import { isContentImageRef, type ContentOverrides, type EnemyInput } from '@/lib/game/content/schema';
import { draftPaliersCount, effectivePalier } from '@/lib/game/content/draftView';
import { getSpriteCandidates } from '@/components/ui/PixelSprite';
import { Button, Field, SelectInput, TextInput } from '../ui';
import { ImagePicker } from './ImagePicker';
import type { EditorProps } from './ContentTab';

const blankEnemies = (): EnemyInput[] =>
  Array.from({ length: ENEMIES_PER_PALIER }, (_, i) => ({ name: '', sprite: '', ...(i === ENEMIES_PER_PALIER - 1 && { isBoss: true }) }));

function codeEnemies(palier: number): EnemyInput[] | null {
  const base = getPalierEnemyDefs(palier);
  return base.length === ENEMIES_PER_PALIER ? base.map(e => ({ name: e.name, sprite: e.sprite, hpMult: e.hpMult, isBoss: e.isBoss })) : null;
}

// Les 10 ennemis tels que le jeu les affichera : brouillon, sinon code.
function effectiveEnemies(draft: ContentOverrides, palier: number): EnemyInput[] {
  const own = draft.enemies[palier];
  return own ? own.map(e => ({ ...e })) : codeEnemies(palier) ?? blankEnemies();
}

const spriteCandidates = (sprite: string) =>
  !sprite || isContentImageRef(sprite) ? [] : getSpriteCandidates(`/${sprite}`);

export function EnemiesEditor({ draft, onChange, onEditing }: EditorProps) {
  const count = draftPaliersCount(draft);
  const [palier, setPalier] = useState(1);
  const [list, setList] = useState<EnemyInput[]>(() => effectiveEnemies(draft, 1));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onEditing(dirty); }, [dirty, onEditing]);

  const choose = (p: number) => {
    setPalier(p);
    setList(effectiveEnemies(draft, p));
    setDirty(false);
  };
  const edit = (next: EnemyInput[]) => { setList(next); setDirty(true); };
  const update = (i: number, patch: Partial<EnemyInput>) => edit(list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    edit(next);
  };
  const copyFrom = (source: number) => {
    if (!source) return;
    edit(effectiveEnemies(draft, source));
  };
  const save = () => {
    onChange({ ...draft, enemies: { ...draft.enemies, [palier]: list.map(e => ({ ...e, name: e.name.trim() })) } });
    setDirty(false);
  };
  const revert = () => {
    const enemies = { ...draft.enemies };
    delete enemies[palier];
    onChange({ ...draft, enemies });
    setList(codeEnemies(palier) ?? blankEnemies());
    setDirty(false);
  };

  const p = effectivePalier(draft, palier);
  const isNewPalier = palier > PALIERS.length;
  const complete = list.every(e => e.name.trim() && e.sprite);
  const paliers = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Palier" className="w-full sm:w-80">
          <SelectInput value={palier} onChange={e => choose(Number(e.target.value))} disabled={dirty}>
            {paliers.map(id => (
              <option key={id} value={id}>
                #{id} · {effectivePalier(draft, id)?.name}{draft.enemies[id] ? ' (modifié)' : id > PALIERS.length ? ' (sans ennemis)' : ''}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Partir des ennemis du palier…" className="w-full sm:w-72">
          <SelectInput value="" onChange={e => copyFrom(Number(e.target.value))}>
            <option value="">— Copier depuis —</option>
            {paliers.filter(id => id !== palier).map(id => <option key={id} value={id}>#{id} · {effectivePalier(draft, id)?.name}</option>)}
          </SelectInput>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button tone="purple" onClick={save} disabled={!dirty || !complete}>Valider les ennemis</Button>
        {dirty && <Button onClick={() => choose(palier)}>Annuler</Button>}
        {!dirty && draft.enemies[palier] && !isNewPalier && <Button tone="red" onClick={revert}>Rétablir ceux du code</Button>}
        {dirty && <span className="text-sm text-amber-300">Modifications en cours : valide ou annule avant de changer de palier.</span>}
      </div>
      {!complete && <p className="text-sm text-amber-300">Chaque ennemi a besoin d&apos;un nom et d&apos;une image.</p>}

      <div className="overflow-hidden rounded-xl border border-white/15">
        <div className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-white/80 sm:px-4">
          {p?.universe} · {p?.name} <span className="font-normal text-white/60">— 10 vagues ; la case Boss marque le boss (par défaut, le 10e)</span>
        </div>
        {list.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 border-b border-white/10 px-3 py-2.5 last:border-b-0 sm:px-4">
            <div className="flex shrink-0 flex-col items-center">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"
                className="min-h-8 min-w-10 cursor-pointer text-white/60 hover:text-white disabled:cursor-default disabled:opacity-25">▲</button>
              <span className="text-sm font-bold tabular-nums text-white/60">{i + 1}</span>
              <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Descendre"
                className="min-h-8 min-w-10 cursor-pointer text-white/60 hover:text-white disabled:cursor-default disabled:opacity-25">▼</button>
            </div>
            <ImagePicker value={isContentImageRef(e.sprite) ? e.sprite : undefined} fallback={spriteCandidates(e.sprite)}
              onChange={ref => update(i, { sprite: ref })} maxW={512} maxH={512} />
            <Field label="Nom" className="min-w-40 flex-1">
              <TextInput value={e.name} onChange={ev => update(i, { name: ev.target.value })} placeholder="Nom de l'ennemi" />
            </Field>
            <Field label="× PV" className="w-24">
              <TextInput type="number" step={0.05} min={0.1} value={e.hpMult ?? ''} placeholder="1"
                onChange={ev => update(i, { hpMult: ev.target.value === '' ? undefined : Number(ev.target.value) })} />
            </Field>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
              <input type="checkbox" className="h-5 w-5 cursor-pointer accent-violet-500" checked={!!e.isBoss}
                onChange={ev => update(i, { isBoss: ev.target.checked || undefined })} />
              Boss
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
