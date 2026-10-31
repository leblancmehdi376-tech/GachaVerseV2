'use client';
import { useEffect, useMemo, useState } from 'react';
import { PALIERS } from '@/lib/game/paliers';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { GACHA_BANNERS } from '@/lib/game/gacha';
import { collectContentImages, emptyContent, type ContentOverrides } from '@/lib/game/content/schema';
import { prepareContentImages } from '@/lib/game/content/images';
import { loadContentForEditing, saveDraft, publishContent, restoreVersion, isLocalContentMode, summarizeContent } from '@/lib/game/content/store';
import { validateDraft, type ValidationResult } from '@/lib/game/content/validate';
import { diffContent, type ContentChange } from '@/lib/game/content/draftView';
import { setAdminLiveContent } from '@/lib/game/content/adminCatalog';
import { Button, Card, Feedback, Segmented, SectionHeader } from '../ui';
import { PaliersEditor } from './PaliersEditor';
import { EnemiesEditor } from './EnemiesEditor';
import { CharactersEditor } from './CharactersEditor';
import { BannersEditor } from './BannersEditor';
import { HistoryPanel } from './HistoryPanel';
import { ReleasePanel, releaseError } from './ReleasePanel';

// Configurateur de contenu : on crée une MAJ (numéro de version + notes), on
// modifie le BROUILLON (enregistré tout seul) pour y mettre son contenu, puis
// on la relit et on la pousse — les joueurs le reçoivent au prochain
// lancement du jeu (voir lib/game/content). Cette page lit toujours les
// données du CODE (elle ne passe pas par ContentGate) : le brouillon ne
// contient que les écarts avec elles.

export interface EditorProps {
  draft: ContentOverrides;
  onChange: (d: ContentOverrides) => void;
  // Une modification est en cours dans l'éditeur (fiche ouverte, liste non validée).
  onEditing: (editing: boolean) => void;
}

type Section = 'paliers' | 'enemies' | 'characters' | 'banners' | 'history';
const EDITORS = ['paliers', 'enemies', 'characters', 'banners'] as const;
const SECTION_LABEL: Record<Section, string> = {
  paliers: '🗺️ Paliers', enemies: '👾 Ennemis', characters: '🃏 Persos', banners: '🎰 Bannières', history: '🕘 Historique',
};

const BASE_INFO = {
  paliersCount: PALIERS.length,
  characterIds: new Set(CHARACTER_POOL.map(c => c.id)),
  bannerIds: new Set(GACHA_BANNERS.map(b => b.id)),
  codeBannerMemberIds: new Set(GACHA_BANNERS.filter(b => b.id !== 'vol1').flatMap(b => b.pool.map(t => t.id))),
  characterRarities: new Map(CHARACTER_POOL.map(c => [c.id, c.rarity])),
};

const AUTOSAVE_MS = 1200;
const CHANGE_ICON: Record<ContentChange['kind'], string> = { added: '➕', modified: '✏️', removed: '🗑️' };
const CHANGE_LABEL: Record<ContentChange['kind'], string> = { added: 'ajouté', modified: 'modifié', removed: 'supprimé' };

export function ContentTab() {
  const [draft, setDraft] = useState<ContentOverrides | null>(null);
  const [live, setLive] = useState<ContentOverrides | null>(null);
  const liveVersion = live?.version ?? 0;
  // Change quand le brouillon est remplacé d'un bloc (publication, abandon,
  // restauration) : les éditeurs repartent alors de ce nouveau brouillon.
  const [generation, setGeneration] = useState(0);
  const [section, setSection] = useState<Section>('paliers');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [review, setReview] = useState<{ check: ValidationResult; changes: ContentChange[] } | null>(null);
  const [editingIn, setEditingIn] = useState<Partial<Record<Section, boolean>>>({});
  // Sauvegarde automatique : chaque modification incrémente `edits`, et le
  // brouillon est enregistré quand on arrête de modifier pendant AUTOSAVE_MS.
  const [edits, setEdits] = useState(0);
  const [savedEdits, setSavedEdits] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const local = isLocalContentMode();

  const onEditing = useMemo(() => Object.fromEntries(EDITORS.map(s => [s, (on: boolean) =>
    setEditingIn(m => (!!m[s] === on ? m : { ...m, [s]: on }))])) as Record<(typeof EDITORS)[number], (on: boolean) => void>, []);
  const editingSections = EDITORS.filter(s => editingIn[s]);

  useEffect(() => {
    let cancelled = false;
    loadContentForEditing()
      .then(async ({ live, draft }) => {
        await prepareContentImages([...collectContentImages(draft), ...(live ? collectContentImages(live) : [])]);
        if (cancelled) return;
        setDraft(draft);
        setLive(live);
        setAdminLiveContent(live);
      })
      .catch(e => { if (!cancelled) setMsg(`❌ Chargement impossible : ${e instanceof Error ? e.message : e}`); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draft || edits === savedEdits) return;
    const version = edits;
    const t = setTimeout(() => {
      saveDraft(draft)
        .then(() => { setSavedEdits(v => Math.max(v, version)); setSaveError(null); })
        .catch(e => setSaveError(e instanceof Error ? e.message : String(e)));
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [draft, edits, savedEdits]);

  // Prévient avant de quitter la page avec un brouillon pas encore enregistré
  // ou une fiche ouverte.
  const unsafe = edits !== savedEdits || editingSections.length > 0;
  useEffect(() => {
    if (!unsafe) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsafe]);

  if (!draft) return <Card><p className="text-sm text-white/75">{msg ?? 'Chargement du contenu…'}</p></Card>;

  const change = (d: ContentOverrides) => { setDraft(d); setEdits(n => n + 1); setReview(null); setMsg(null); };

  // Remplace le brouillon d'un bloc (déjà enregistré par l'appelant).
  const replaceDraft = (d: ContentOverrides) => {
    setDraft(d);
    setGeneration(g => g + 1);
    setSavedEdits(edits);
    setReview(null);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`); }
    setBusy(null);
  };

  const openReview = () => {
    const check = validateDraft(draft, BASE_INFO, live);
    const relErr = releaseError(draft.release, live);
    setReview({ check: relErr ? { ...check, errors: [relErr, ...check.errors] } : check, changes: diffContent(live, draft) });
    setMsg(null);
  };

  const publish = () => run('publish', async () => {
    const published = await publishContent(draft, live);
    const pushed = draft.release?.version;
    setLive(published);
    setAdminLiveContent(published);
    replaceDraft(published);
    setMsg(local
      ? `✅ Maj v${pushed} publiée dans ce navigateur : recharge le jeu (localhost:3000) pour la voir.`
      : `✅ Maj v${pushed} publiée. Les joueurs la reçoivent à leur prochain lancement du jeu.`);
  });

  // Repart de la version en ligne : toutes les modifications non publiées sont perdues.
  const discard = () => run('discard', async () => {
    if (!window.confirm('Abandonner toutes les modifications non publiées du brouillon ?')) return;
    const fresh = structuredClone(live ?? emptyContent());
    if (draft.release) fresh.release = draft.release; // la maj en préparation reste, vide
    await saveDraft(fresh);
    replaceDraft(fresh);
    setMsg('✅ Brouillon remis sur la version en ligne.');
  });

  const restore = (old: ContentOverrides, label: string) => run('restore', async () => {
    if (!window.confirm(`Restaurer : ${label} ?\nCela remplace la version en ligne, et le brouillon actuel sera perdu.`)) return;
    await prepareContentImages(collectContentImages(old));
    const published = await restoreVersion(old, live);
    setLive(published);
    setAdminLiveContent(published);
    replaceDraft(published);
    setMsg(`✅ Version ${published.version} publiée — restauration : ${label}.`);
  });

  const draftChanges = diffContent(live, draft);
  const pendingChanges = draftChanges.length;
  const saveStatus = saveError ? `⚠️ Brouillon non enregistré (${saveError})`
    : edits !== savedEdits ? 'Enregistrement du brouillon…' : 'Brouillon enregistré';

  return (
    <div className="flex flex-col gap-4">
      {local && (
        <Card tone="amber">
          <p className="text-sm leading-relaxed text-amber-200">
            <b>Mode local</b> : Firebase est désactivé sur ce PC. Brouillon, images et publication restent dans ce navigateur,
            et le jeu en local (localhost:3000) utilise la version publiée ici. Rien n&apos;est envoyé aux joueurs.
          </p>
        </Card>
      )}

      <Card>
        <SectionHeader icon="🧩" title="Contenu du jeu"
          subtitle={<>
            En ligne : <b>{live?.releases?.[0] ? `maj v${live.releases[0].version}` : liveVersion ? `version ${liveVersion}` : 'aucune (contenu du code)'}</b> · {pendingChanges ? `${pendingChanges} changement(s) non publié(s)` : 'rien à publier'} · <span className={saveError ? 'text-amber-300' : ''}>{saveStatus}</span>
          </>}
          right={<>
            <Button tone="red" onClick={discard} disabled={!!busy || pendingChanges === 0} title="Repartir de la version en ligne">↺ Abandonner</Button>
            <Button tone="green" onClick={openReview} disabled={!!busy || editingSections.length > 0 || !draft.release}>
              🚀 {draft.release ? `Pousser la maj v${draft.release.version}…` : 'Publier…'}
            </Button>
          </>} />
        {editingSections.length > 0 && (
          <p className="mb-3 text-sm text-amber-300">
            Modification en cours ({editingSections.map(s => SECTION_LABEL[s]).join(', ')}) : valide-la ou annule-la avant de publier.
          </p>
        )}
        <Feedback msg={msg} className="mb-3" />

        {review && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.04] p-3 sm:p-4">
            <div className="text-base font-extrabold text-white">
              Relecture avant de pousser la maj v{draft.release?.version}{draft.release?.title ? ` — ${draft.release.title}` : ''}
            </div>
            {review.changes.length === 0
              ? <p className="text-sm text-white/75">Aucun changement par rapport à la version en ligne.</p>
              : (
                <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm text-white/85">
                  {review.changes.map((c, i) => (
                    <li key={i}>{CHANGE_ICON[c.kind]} <b>{c.category}</b> {c.label} — {CHANGE_LABEL[c.kind]}</li>
                  ))}
                </ul>
              )}
            {review.check.errors.map(e => <p key={e} className="text-sm text-red-300">❌ {e}</p>)}
            {review.check.warnings.map(w => <p key={w} className="text-sm text-amber-300">⚠️ {w}</p>)}
            <p className="text-sm text-white/70">Brouillon : {summarizeContent(draft)}.</p>
            <div className="flex flex-wrap gap-2">
              <Button tone="green" onClick={publish} disabled={!!busy || review.check.errors.length > 0 || review.changes.length === 0}>
                {busy === 'publish' ? 'Envoi…' : `✅ Pousser la maj v${draft.release?.version ?? ''}`}
              </Button>
              <Button onClick={() => setReview(null)}>Retour</Button>
            </div>
          </div>
        )}

        {!review && (
          <ReleasePanel key={generation} draft={draft} live={live} changes={draftChanges} onChange={change}
            onPush={openReview} busy={!!busy || editingSections.length > 0} />
        )}

        <Segmented label="Type de contenu" value={section} onChange={setSection} className="mb-4"
          options={(Object.keys(SECTION_LABEL) as Section[]).map(id => ({ id, label: editingIn[id] ? `${SECTION_LABEL[id]} •` : SECTION_LABEL[id] }))} />
        {/* Les éditeurs restent montés : changer d'onglet ne perd pas une modification en cours. */}
        <div className={section === 'paliers' ? '' : 'hidden'}><PaliersEditor key={generation} draft={draft} onChange={change} onEditing={onEditing.paliers} /></div>
        <div className={section === 'enemies' ? '' : 'hidden'}><EnemiesEditor key={generation} draft={draft} onChange={change} onEditing={onEditing.enemies} /></div>
        <div className={section === 'characters' ? '' : 'hidden'}><CharactersEditor key={generation} draft={draft} onChange={change} onEditing={onEditing.characters} /></div>
        <div className={section === 'banners' ? '' : 'hidden'}><BannersEditor key={generation} draft={draft} onChange={change} onEditing={onEditing.banners} /></div>
        {section === 'history' && <HistoryPanel liveVersion={liveVersion} busy={!!busy} onRestore={restore} />}
      </Card>
    </div>
  );
}
