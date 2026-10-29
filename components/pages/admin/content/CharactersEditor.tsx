'use client';
import { useEffect, useMemo, useState } from 'react';
import { GACHA_EXCLUDED_IDS, getCharacterById } from '@/lib/game/characters';
import { getCharacterGender, GENDER_CONFIG, type Gender } from '@/lib/game/characterGenders';
import { getCardImageCandidates } from '@/lib/game/cardAssets';
import { RARITY_CONFIG, RARITY_ORDER_ASC, type Rarity } from '@/types/game';
import { isValidContentId, type CharacterInput, type ContentOverrides, type KitInput } from '@/lib/game/content/schema';
import { getCharacterKit } from '@/lib/game/nakimeKits';
import { CombatFields, codeUltimateName, fitKit, initialKit } from './CombatFields';
import { draftCharacters, editableBanners, setBannerMember } from '@/lib/game/content/draftView';
import { resolveContentImage } from '@/lib/game/content/images';
import { useFallbackImage } from '@/lib/image-fallback';
import { Button, Field, SelectInput, TextInput } from '../ui';
import { ImagePicker } from './ImagePicker';
import type { EditorProps } from './ContentTab';

// Taille des visuels de carte envoyés (les fichiers du jeu font 300 × 355).
const CARD_MAX_W = 600;
const CARD_MAX_H = 710;
const PAGE = 40;
const RARITIES_DESC = [...RARITY_ORDER_ASC].reverse();

interface FormState {
  id: string;
  name: string;
  rarity: Rarity;
  baseDps: number;
  universe: string;
  description: string;
  gender: Gender;
  excludeFromGacha: boolean;
  bannerOnly: boolean;
  forms: { name: string; image?: string }[];
  ultName: string;
  ultFrom: string;
  kit: KitInput;
}

function formFor(draft: ContentOverrides, id: string | null): FormState {
  const base = id ? getCharacterById(id) : undefined;
  const input: CharacterInput = (id && draft.characters[id]) || {};
  const baseForms = base?.forms?.length ? base.forms.map(f => ({ name: f.name })) : base ? [{ name: base.name }] : [{ name: '' }];
  return {
    id: id ?? '',
    name: input.name ?? base?.name ?? '',
    rarity: input.rarity ?? base?.rarity ?? 'C',
    baseDps: input.baseDps ?? base?.baseDps ?? 10,
    universe: input.universe ?? base?.universe ?? '',
    description: input.description ?? (base && base.description !== base.name ? base.description : ''),
    gender: input.gender ?? (base ? getCharacterGender(base.id) : 'male'),
    excludeFromGacha: !!input.excludeFromGacha || (!!base && GACHA_EXCLUDED_IDS.has(base.id)),
    bannerOnly: !!input.bannerOnly,
    forms: input.forms ? input.forms.map(f => ({ ...f })) : baseForms,
    ultName: input.ultimate?.name ?? (base ? codeUltimateName(base.id) : ''),
    ultFrom: input.ultimate?.from ?? '',
    kit: input.kit ? structuredClone(input.kit) : initialKit(id ?? ''),
  };
}

// Forme de base sans nom : elle prend celui du perso.
const formName = (form: FormState, i: number) => form.forms[i].name.trim() || (i === 0 ? form.name.trim() : '');

// Ne garde que ce qui diffère du code (perso existant), tout pour un nouveau perso.
function toInput(form: FormState): CharacterInput {
  const base = getCharacterById(form.id);
  const input: CharacterInput = {};
  if (!base || form.name !== base.name) input.name = form.name.trim();
  if (!base || form.rarity !== base.rarity) input.rarity = form.rarity;
  if (!base || form.baseDps !== base.baseDps) input.baseDps = form.baseDps;
  if (!base || form.universe !== base.universe) input.universe = form.universe.trim();
  if (form.description.trim() && form.description !== base?.description) input.description = form.description.trim();
  if (!base || form.gender !== getCharacterGender(base.id)) input.gender = form.gender;
  if (form.excludeFromGacha && !(base && GACHA_EXCLUDED_IDS.has(base.id))) input.excludeFromGacha = true;
  if (form.bannerOnly && !form.excludeFromGacha) input.bannerOnly = true;
  const baseNames = base?.forms?.length ? base.forms.map(f => f.name) : base ? [base.name] : [];
  const formsChanged = !base || form.forms.length !== baseNames.length
    || form.forms.some((f, i) => f.image || formName(form, i) !== baseNames[i]);
  if (formsChanged) input.forms = form.forms.map((f, i) => ({ name: formName(form, i), ...(f.image && { image: f.image }) }));
  // Ultime : seulement s'il change du code (nom ou puissance reprise d'un autre perso).
  const ultName = form.ultName.trim();
  if (ultName && (!base || ultName !== codeUltimateName(base.id) || form.ultFrom)) {
    input.ultimate = { name: ultName, ...(form.ultFrom && { from: form.ultFrom }) };
  }
  // Château : kit ramené à la rareté, gardé seulement s'il diffère de celui du code.
  const kit = fitKit(form.kit, form.rarity);
  const codeKit = base ? getCharacterKit(base.id) : undefined;
  if (!codeKit || JSON.stringify(kit) !== JSON.stringify(fitKit(codeKit, form.rarity))) input.kit = kit;
  return input;
}

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

// Vignette de carte : image du brouillon, sinon visuel actuel du jeu.
export function CardThumb({ id, image, className = 'h-12 w-10' }: { id: string; image?: string; className?: string }) {
  const tpl = getCharacterById(id);
  const own = image ? resolveContentImage(image) : null;
  const { src, failed, onError } = useFallbackImage(own ? [own] : tpl ? getCardImageCandidates(tpl, 0) : []);
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-md border border-white/20 bg-black/40`}>
      {src && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" loading="lazy" onError={onError} className="h-full w-full object-cover object-top" />
        : null}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'cyan' | 'neutral'; children: string }) {
  const cls = {
    green: 'bg-emerald-400/15 text-emerald-300', amber: 'bg-amber-400/15 text-amber-300', red: 'bg-red-400/15 text-red-300',
    cyan: 'bg-cyan-400/15 text-cyan-300', neutral: 'bg-white/10 text-white/75',
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${cls}`}>{children}</span>;
}

export function CharactersEditor({ draft, onChange, onEditing }: EditorProps) {
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState<Rarity | ''>('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<string | null>(null); // id, ou '' pour un nouveau perso
  const [form, setForm] = useState<FormState>(() => formFor(draft, null));
  const [members, setMembers] = useState<Record<string, boolean>>({});
  useEffect(() => { onEditing(editing !== null); }, [editing, onEditing]);

  const rows = useMemo(() => draftCharacters(draft), [draft]);
  const universes = useMemo(() => [...new Set(rows.map(r => r.universe).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [rows]);
  const banners = editableBanners(draft).filter(b => b.id !== 'vol1');

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(r =>
    (!q || r.name.toLowerCase().includes(q) || r.universe.toLowerCase().includes(q) || r.id.includes(q))
    && (!rarity || r.rarity === rarity) && (!onlyChanged || r.modified));

  const open = (id: string | null) => {
    setForm(formFor(draft, id));
    setEditing(id ?? '');
    setMembers(Object.fromEntries(banners.map(b => [b.id, !!id && b.memberIds.includes(id)])));
  };

  const base = getCharacterById(form.id);
  const isNew = editing === '' || (!!editing && !base);
  const codeExcluded = !!base && GACHA_EXCLUDED_IDS.has(base.id);
  const idTaken = editing === '' && (!!getCharacterById(form.id) || !!draft.characters[form.id]);
  const problems = [
    !form.name.trim() && 'nom manquant',
    !form.universe.trim() && 'univers manquant',
    isNew && !isValidContentId(form.id) && 'identifiant invalide (2 à 40 caractères : a-z, 0-9, _)',
    idTaken && 'identifiant déjà utilisé',
    isNew && !form.forms[0]?.image && 'image de la première forme manquante',
    form.forms.some((_, i) => !formName(form, i)) && 'une forme d’évolution n’a pas de nom',
    fitKit(form.kit, form.rarity).moves.some(m => !m.name.trim()) && 'une technique du Château n’a pas de nom',
    !!form.ultFrom && !rows.some(r => r.id === form.ultFrom) && 'ultime repris d’un perso inconnu',
  ].filter(Boolean) as string[];

  const save = () => {
    if (problems.length) return;
    const input = toInput(form);
    const characters = { ...draft.characters };
    if (Object.keys(input).length) characters[form.id] = input; else delete characters[form.id];
    let next: ContentOverrides = { ...draft, characters };
    for (const b of banners) next = setBannerMember(next, b.id, form.id, !!members[b.id] && !form.excludeFromGacha);
    onChange(next);
    setEditing(null);
  };

  const revert = (id: string, isNewChar: boolean) => {
    if (isNewChar && !window.confirm('Supprimer ce perso du brouillon ? (S’il est déjà publié, la publication sera refusée : coche plutôt « Retiré du gacha ».)')) return;
    const characters = { ...draft.characters };
    delete characters[id];
    let next: ContentOverrides = { ...draft, characters };
    if (isNewChar) for (const b of banners) next = setBannerMember(next, b.id, id, false);
    onChange(next);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const setFormAt = (i: number, patch: Partial<FormState['forms'][number]>) =>
    setForm(f => ({ ...f, forms: f.forms.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const baseFormCount = base?.forms?.length ?? 1;

  const editor = (
    <div className="grid grid-cols-1 gap-3 border-t border-white/10 bg-black/25 px-3 py-4 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
      <Field label="Nom du perso">
        <TextInput value={form.name} placeholder="Ichigo Kurosaki"
          onChange={e => setForm(f => ({ ...f, name: e.target.value, ...(editing === '' && { id: slugify(e.target.value) }) }))} />
      </Field>
      <Field label="Univers (licence)">
        <TextInput value={form.universe} onChange={e => set('universe', e.target.value)} list="gv-universes" placeholder="Bleach" />
      </Field>
      <Field label="Rareté">
        <SelectInput value={form.rarity} onChange={e => set('rarity', e.target.value as Rarity)}>
          {RARITIES_DESC.map(r => <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>)}
        </SelectInput>
      </Field>
      <Field label="DPS de base">
        <TextInput type="number" min={0} value={form.baseDps} onChange={e => set('baseDps', Number(e.target.value))} />
      </Field>
      <Field label="Genre (GachaDle)">
        <SelectInput value={form.gender} onChange={e => set('gender', e.target.value as Gender)}>
          {(Object.keys(GENDER_CONFIG) as Gender[]).map(g => <option key={g} value={g}>{GENDER_CONFIG[g].label}</option>)}
        </SelectInput>
      </Field>
      <Field label="Identifiant (définitif)">
        <TextInput value={form.id} disabled={editing !== ''} onChange={e => set('id', slugify(e.target.value))} />
      </Field>
      <Field label="Description" className="sm:col-span-2">
        <TextInput value={form.description} onChange={e => set('description', e.target.value)} placeholder="Facultatif" />
      </Field>

      <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
        <span className="text-sm font-semibold text-white/75">Où l&apos;obtenir</span>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-white/85">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-violet-500" checked={form.excludeFromGacha} disabled={codeExcluded}
            onChange={e => set('excludeFromGacha', e.target.checked)} />
          <span><b>Retiré du gacha</b> : plus tirable nulle part (perso de Forge ou de raid, ou qu&apos;on ne veut plus distribuer). Ceux qui l&apos;ont le gardent.</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-white/85">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-violet-500" checked={form.bannerOnly && !form.excludeFromGacha} disabled={form.excludeFromGacha}
            onChange={e => set('bannerOnly', e.target.checked)} />
          <span><b>Exclusif à ses bannières</b> : perso limité, absent de la Vol.1 et de la Bannière Vedette.</span>
        </label>
        {!form.excludeFromGacha && banners.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4">
            <span className="text-sm text-white/75">Bannières :</span>
            {banners.map(b => {
              const locked = b.lockedIds.includes(form.id);
              return (
                <label key={b.id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
                  <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={locked || !!members[b.id]} disabled={locked}
                    onChange={e => setMembers(m => ({ ...m, [b.id]: e.target.checked }))} />
                  {b.title}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
        <span className="text-sm font-semibold text-white/75">Formes d&apos;évolution (forme 1 = base ×1 DPS, forme 2 = ×2…) · images 600 × 710 conseillé</span>
        {form.forms.map((f, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
            <span className="w-6 text-sm font-bold tabular-nums text-white/60">{i + 1}</span>
            <ImagePicker value={f.image} onChange={ref => setFormAt(i, { image: ref })} maxW={CARD_MAX_W} maxH={CARD_MAX_H} size={72}
              fallback={base ? getCardImageCandidates(base, i) : []} rounded="rounded-md" />
            <TextInput value={f.name} onChange={e => setFormAt(i, { name: e.target.value })} className="min-w-40 flex-1"
              placeholder={i === 0 ? `Nom de la forme (par défaut : ${form.name || 'nom du perso'})` : 'Nom de la forme'} />
            {i > 0 && i === form.forms.length - 1 && i >= (isNew ? 1 : baseFormCount) && (
              <Button size="sm" tone="red" onClick={() => setForm(x => ({ ...x, forms: x.forms.slice(0, -1) }))}>Retirer</Button>
            )}
          </div>
        ))}
        {form.forms.length < 8 && (
          <Button size="sm" className="self-start" onClick={() => setForm(x => ({ ...x, forms: [...x.forms, { name: `${x.name} — Évolution ${x.forms.length}` }] }))}>
            + Ajouter une forme
          </Button>
        )}
      </div>

      <CombatFields rarity={form.rarity} kit={form.kit} onKit={kit => set('kit', kit)}
        ultName={form.ultName} onUltName={v => set('ultName', v)} ultFrom={form.ultFrom} onUltFrom={v => set('ultFrom', v)}
        characterNames={rows} />

      {problems.length > 0 && <p className="text-sm text-amber-300 sm:col-span-2 lg:col-span-4">À compléter : {problems.join(', ')}.</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button tone="purple" onClick={save} disabled={problems.length > 0}>Valider</Button>
        <Button onClick={() => setEditing(null)}>Annuler</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <datalist id="gv-universes">{universes.map(u => <option key={u} value={u} />)}</datalist>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Rechercher" className="min-w-0 flex-1 basis-56">
          <TextInput value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Nom, univers ou identifiant" />
        </Field>
        <Field label="Rareté" className="w-full sm:w-44">
          <SelectInput value={rarity} onChange={e => { setRarity(e.target.value as Rarity | ''); setShown(PAGE); }}>
            <option value="">Toutes</option>
            {RARITIES_DESC.map(r => <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>)}
          </SelectInput>
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white/85">
          <input type="checkbox" className="h-5 w-5 accent-violet-500" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} />
          Modifiés seulement
        </label>
        <Button tone="green" onClick={() => open(null)} disabled={editing !== null}>+ Nouveau perso</Button>
      </div>
      <p className="text-sm text-white/75">{filtered.length} perso(s) · {Object.keys(draft.characters).length} modifié(s) ou ajouté(s) dans le brouillon</p>

      <div className="overflow-hidden rounded-xl border border-white/15">
        {editing === '' && (
          <div className="border-b border-white/10">
            <div className="px-3 py-2.5 text-base font-bold text-emerald-300 sm:px-4">Nouveau perso</div>
            {editor}
          </div>
        )}
        {filtered.slice(0, shown).map(r => {
          const cfg = RARITY_CONFIG[r.rarity];
          return (
            <div key={r.id} className="border-b border-white/10 last:border-b-0">
              <div className="flex flex-wrap items-center gap-3 px-3 py-2 sm:px-4">
                <CardThumb id={r.id} image={r.image} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-white">{r.name}</div>
                  <div className="truncate text-sm text-white/70">{r.universe}</div>
                </div>
                <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                {r.isNew && <Badge tone="green">Nouveau</Badge>}
                {!r.isNew && r.modified && <Badge tone="amber">Modifié</Badge>}
                {r.excluded && <Badge tone="red">Hors gacha</Badge>}
                {!r.excluded && r.bannerOnly && <Badge tone="cyan">Limité</Badge>}
                {editing !== r.id && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => open(r.id)} disabled={editing !== null}>Modifier</Button>
                    {r.modified && (
                      <Button size="sm" tone="red" onClick={() => revert(r.id, r.isNew)} disabled={editing !== null}>{r.isNew ? 'Supprimer' : 'Rétablir'}</Button>
                    )}
                  </div>
                )}
              </div>
              {editing === r.id && editor}
            </div>
          );
        })}
      </div>
      {filtered.length > shown && (
        <Button className="self-center" onClick={() => setShown(s => s + PAGE)}>Afficher plus ({filtered.length - shown} restants)</Button>
      )}
    </div>
  );
}
