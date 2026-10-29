'use client';
import { ABILITIES, BASIC_ATTACK, ROLE_KITS, abilityCount, describeAbility } from '@/lib/game/nakimeAbilities';
import { ROLE_INFO, NAKIME_ROLES, type NakimeRole } from '@/lib/game/nakimeContent';
import { getCharacterKit } from '@/lib/game/nakimeKits';
import { getUltimateDef } from '@/lib/game/ultimates';
import type { Rarity } from '@/types/game';
import type { KitInput } from '@/lib/game/content/schema';
import { Field, SelectInput, TextInput } from '../ui';

// Sections « Combat » (ultime) et « Château de Nakime » (rôle + techniques)
// de la fiche d'un perso dans le configurateur.

export type KitMove = KitInput['moves'][number];

// Mécaniques jouables (ni l'attaque de base, ni celles des ennemis).
const PLAYABLE = Object.values(ABILITIES).filter(a => a.id !== BASIC_ATTACK && !a.id.startsWith('e_'));
const SKILLS = PLAYABLE.filter(a => !a.ult);
const ULTS = PLAYABLE.filter(a => a.ult);

const move = (ability: string): KitMove => ({ name: ABILITIES[ability].name, ability, icon: ABILITIES[ability].icon });

/** Kit générique d'un rôle : 2 techniques puis l'ultime. */
export function roleKitMoves(role: NakimeRole): KitMove[] {
  const k = ROLE_KITS[role];
  return [move(k.skills[0]), move(k.skills[1]), move(k.ult)];
}

/** Kit de départ d'un perso : ses vraies techniques du code, sinon celles de son rôle. */
export function initialKit(id: string): KitInput {
  const code = getCharacterKit(id);
  if (code) return { role: code.role, moves: code.moves.map(m => ({ ...m })) };
  return { role: 'assaillant', moves: roleKitMoves('assaillant') };
}

/** Les techniques ramenées au nombre voulu par la rareté (1, 2, ou 2 + ultime). */
export function fitKit(kit: KitInput, rarity: Rarity): KitInput {
  const n = abilityCount(rarity);
  const generic = roleKitMoves(kit.role);
  const skills = kit.moves.filter(m => !ABILITIES[m.ability]?.ult);
  const ult = kit.moves.find(m => ABILITIES[m.ability]?.ult) ?? generic[2];
  const out = skills.slice(0, Math.min(n, 2));
  for (const g of generic.slice(0, 2)) if (out.length < Math.min(n, 2) && !out.some(m => m.ability === g.ability)) out.push(g);
  if (n >= 3) out.push(ult);
  return { role: kit.role, moves: out };
}

export function codeUltimateName(id: string): string {
  return getUltimateDef(id)?.name ?? 'Ultime';
}

export function CombatFields({ rarity, kit, onKit, ultName, onUltName, ultFrom, onUltFrom, characterNames }: {
  rarity: Rarity;
  kit: KitInput;
  onKit: (k: KitInput) => void;
  ultName: string;
  onUltName: (v: string) => void;
  ultFrom: string;
  onUltFrom: (v: string) => void;
  characterNames: { id: string; name: string }[];
}) {
  const fitted = fitKit(kit, rarity);
  const setMove = (i: number, patch: Partial<KitMove>) =>
    onKit({ ...fitted, moves: fitted.moves.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const from = ultFrom ? getUltimateDef(ultFrom) : undefined;

  return (
    <>
      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
        <span className="text-sm font-semibold text-white/75">⚡ Ultime en combat</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom de l'ultime">
            <TextInput value={ultName} onChange={e => onUltName(e.target.value)} placeholder="Ex : Getsuga Tenshō" />
          </Field>
          <Field label="Puissance reprise de… (vide = selon la rareté)">
            <TextInput value={ultFrom} onChange={e => onUltFrom(e.target.value.trim())} list="gv-ult-from" placeholder="Identifiant d'un perso, ex : goku" />
          </Field>
        </div>
        <datalist id="gv-ult-from">{characterNames.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</datalist>
        {ultFrom && <span className="text-sm text-white/70">{from ? `Effet : ${from.description} (recharge ${from.cooldown} s)` : 'Perso inconnu : la rareté sera utilisée.'}</span>}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
        <span className="text-sm font-semibold text-white/75">🏯 Château de Nakime — {fitted.moves.length} technique(s) pour cette rareté (la 3e est un ultime)</span>
        <Field label="Rôle" className="w-full sm:w-[28rem]">
          <SelectInput value={fitted.role} onChange={e => {
            const role = e.target.value as NakimeRole;
            onKit({ role, moves: roleKitMoves(role) });
          }}>
            {NAKIME_ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].icon} {ROLE_INFO[r].label} — {ROLE_INFO[r].text}</option>)}
          </SelectInput>
        </Field>
        {fitted.moves.map((m, i) => {
          const isUlt = i === 2;
          return (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 px-3 py-2">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Icône" className="w-20">
                  <TextInput value={m.icon ?? ''} onChange={e => setMove(i, { icon: e.target.value || undefined })} maxLength={8} />
                </Field>
                <Field label={isUlt ? 'Nom de l’ultime' : `Technique ${i + 1}`} className="min-w-40 flex-1">
                  <TextInput value={m.name} onChange={e => setMove(i, { name: e.target.value })} />
                </Field>
                <Field label="Mécanique" className="min-w-0 flex-1 basis-64">
                  <SelectInput value={m.ability} onChange={e => setMove(i, { ability: e.target.value })}>
                    {(isUlt ? ULTS : SKILLS).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </SelectInput>
                </Field>
              </div>
              <span className="text-sm text-white/65">{describeAbility(m.ability)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
