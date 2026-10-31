'use client';
import { useState } from 'react';
import { bumpReleaseVersion, compareReleaseVersions, isValidReleaseVersion, type ContentOverrides, type ReleaseInput } from '@/lib/game/content/schema';
import type { ContentChange } from '@/lib/game/content/draftView';
import { GAME_VERSION } from '@/lib/game/version';
import { Button, Field, TextInput } from '../ui';

// Maj en préparation : un numéro de version, un titre et des notes pour les
// joueurs. Tout ce qui est modifié dans le brouillon (persos, paliers,
// ennemis, bannières) en fait partie, et part d'un coup à la publication.

/** Version proposée pour une nouvelle maj : la plus récente connue, +1 sur le dernier nombre. */
export function suggestReleaseVersion(live: ContentOverrides | null): string {
  const last = live?.releases?.[0]?.version;
  const base = last && compareReleaseVersions(last, GAME_VERSION) > 0 ? last : GAME_VERSION;
  return bumpReleaseVersion(base);
}

/** Problème bloquant pour publier cette maj, ou null. */
export function releaseError(release: ReleaseInput | undefined, live: ContentOverrides | null): string | null {
  if (!release) return 'Crée d’abord une maj (bouton « Créer une maj »).';
  if (!isValidReleaseVersion(release.version)) return `Numéro de version invalide « ${release.version} » (ex : 2.9.0).`;
  const latest = live?.releases?.[0]?.version;
  if (live?.releases?.some(r => r.version === release.version)) return `La maj v${release.version} a déjà été publiée.`;
  if (latest && compareReleaseVersions(release.version, latest) < 0) return `La maj v${release.version} est plus ancienne que la dernière publiée (v${latest}).`;
  return null;
}

// Notes proposées à partir du contenu de la maj.
export function notesFromChanges(changes: ContentChange[]): string[] {
  return changes.map(c => {
    const what = c.category === 'Ennemis' ? `Ennemis ${c.label}` : `${c.category} **${c.label}**`;
    if (c.kind === 'added') return c.category === 'Ennemis' ? `Nouveaux ennemis ${c.label}.` : `Nouveau ${c.category.toLowerCase()} : **${c.label}**.`;
    if (c.kind === 'removed') return `${what} : retour à la version d'origine.`;
    return `${what} : modifié.`;
  });
}

export function ReleasePanel({ draft, live, changes, onChange, onPush, busy }: {
  draft: ContentOverrides;
  live: ContentOverrides | null;
  changes: ContentChange[];
  onChange: (d: ContentOverrides) => void;
  onPush: () => void;
  busy: boolean;
}) {
  const release = draft.release;
  // Les notes sont éditées en texte libre (une ligne = un changement) : le
  // texte brut est gardé ici pour ne pas perdre les lignes vides en cours de saisie.
  const [notesText, setNotesText] = useState(() => release?.notes.join('\n') ?? '');

  const setRelease = (r: ReleaseInput | undefined) => {
    const next = { ...draft };
    if (r) next.release = r; else delete next.release;
    onChange(next);
  };
  const setNotes = (text: string) => {
    setNotesText(text);
    if (release) setRelease({ ...release, notes: text.split('\n').map(l => l.trim()).filter(Boolean) });
  };

  if (!release) {
    return (
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-400/30 bg-violet-400/[0.05] p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="min-w-0 flex-1 text-sm leading-relaxed text-white/80">
          <b className="text-white">Aucune maj en préparation.</b> Crée une maj (ex : v{suggestReleaseVersion(live)}), ajoute-y tes persos,
          paliers, ennemis et bannières, puis pousse-la d&apos;un coup aux joueurs.
        </div>
        <Button tone="purple" disabled={busy} onClick={() => {
          setNotesText('');
          setRelease({ version: suggestReleaseVersion(live), notes: [] });
        }}>➕ Créer une maj</Button>
      </div>
    );
  }

  const error = releaseError(release, live);
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-violet-400/30 bg-violet-400/[0.05] p-3 sm:p-4">
      <div className="text-base font-extrabold text-white">📦 Maj v{release.version || '…'} en préparation</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Version">
          <TextInput value={release.version} inputMode="decimal" placeholder="2.9.0"
            onChange={e => setRelease({ ...release, version: e.target.value.trim() })} />
        </Field>
        <Field label="Titre (facultatif)">
          <TextInput value={release.title ?? ''} maxLength={80} placeholder="Ex : L'arc de Wano"
            onChange={e => { const { title: _t, ...rest } = release; setRelease(e.target.value ? { ...rest, title: e.target.value } : rest); }} />
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-semibold text-white/75">Contenu de la maj ({changes.length})</div>
        {changes.length === 0
          ? <p className="text-sm text-white/65">Rien pour l&apos;instant : ajoute ou modifie des persos, paliers, ennemis ou bannières dans les onglets ci-dessous.</p>
          : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm text-white/85">
              {changes.map((c, i) => <li key={i}>{c.kind === 'added' ? '➕' : c.kind === 'removed' ? '🗑️' : '✏️'} <b>{c.category}</b> {c.label}</li>)}
            </ul>
          )}
      </div>

      <Field label="Notes pour les joueurs (une ligne par changement, **mot** en gras)">
        <textarea value={notesText} rows={5} onChange={e => setNotes(e.target.value)}
          placeholder="Nouveau perso : **Luffy Gear 5**."
          className="w-full rounded-lg border border-white/25 bg-[#0a0818] px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-violet-400/70 focus:outline-none" />
      </Field>

      {error && <p className="text-sm text-red-300">❌ {error}</p>}
      {!error && release.notes.length === 0 && <p className="text-sm text-amber-300">⚠️ Pas de notes : la maj apparaîtra vide dans les Patch Notes.</p>}

      <div className="flex flex-wrap gap-2">
        <Button tone="green" disabled={busy || !!error || changes.length === 0} onClick={onPush}>🚀 Pousser la maj v{release.version}…</Button>
        <Button disabled={busy || changes.length === 0} onClick={() => setNotes([notesText.trim(), ...notesFromChanges(changes)].filter(Boolean).join('\n'))}>
          ✍️ Notes depuis le contenu
        </Button>
        <Button tone="red" disabled={busy} onClick={() => {
          if (window.confirm(`Supprimer la maj v${release.version} ? Le contenu ajouté reste dans le brouillon.`)) setRelease(undefined);
        }}>Supprimer la maj</Button>
      </div>
    </div>
  );
}
