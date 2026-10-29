'use client';
import { useEffect, useState } from 'react';
import { PALIERS } from '@/lib/game/paliers';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { GACHA_BANNERS } from '@/lib/game/gacha';
import { collectContentImages, type ContentOverrides } from '@/lib/game/content/schema';
import { prepareContentImages } from '@/lib/game/content/images';
import { loadContentForEditing, saveDraft, publishContent, isLocalContentMode } from '@/lib/game/content/store';
import { validateDraft, type ValidationResult } from '@/lib/game/content/validate';
import { Button, Card, Feedback, Segmented, SectionHeader } from '../ui';
import { PaliersEditor } from './PaliersEditor';
import { EnemiesEditor } from './EnemiesEditor';

// Configurateur de contenu : on modifie un BROUILLON (paliers, ennemis...), puis
// on le publie — les joueurs le reçoivent au prochain lancement du jeu (voir
// lib/game/content). Cette page lit toujours les données du CODE (elle ne passe
// pas par ContentGate) : le brouillon ne contient que les écarts avec elles.

type Section = 'paliers' | 'enemies';

const BASE_INFO = {
  paliersCount: PALIERS.length,
  characterIds: new Set(CHARACTER_POOL.map(c => c.id)),
  bannerIds: new Set(GACHA_BANNERS.map(b => b.id)),
};

export function ContentTab() {
  const [draft, setDraft] = useState<ContentOverrides | null>(null);
  const [liveVersion, setLiveVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState<Section>('paliers');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [check, setCheck] = useState<ValidationResult | null>(null);
  const local = isLocalContentMode();

  useEffect(() => {
    let cancelled = false;
    loadContentForEditing()
      .then(async ({ live, draft }) => {
        await prepareContentImages([...collectContentImages(draft), ...(live ? collectContentImages(live) : [])]);
        if (cancelled) return;
        setDraft(draft);
        setLiveVersion(live?.version ?? 0);
      })
      .catch(e => { if (!cancelled) setMsg(`❌ Chargement impossible : ${e instanceof Error ? e.message : e}`); });
    return () => { cancelled = true; };
  }, []);

  // Prévient avant de quitter la page avec un brouillon non enregistré.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!draft) return <Card><p className="text-sm text-white/75">{msg ?? 'Chargement du contenu…'}</p></Card>;

  const change = (d: ContentOverrides) => { setDraft(d); setDirty(true); setCheck(null); setMsg(null); };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`); }
    setBusy(null);
  };

  const save = () => run('save', async () => {
    await saveDraft(draft);
    setDirty(false);
    setMsg('✅ Brouillon enregistré.');
  });

  const publish = () => run('publish', async () => {
    const result = validateDraft(draft, BASE_INFO);
    setCheck(result);
    if (result.errors.length) { setMsg('❌ Publication bloquée : corrige les erreurs ci-dessous.'); return; }
    if (!window.confirm(`Publier la version ${liveVersion + 1} ? Les joueurs la recevront à leur prochain lancement du jeu.`)) return;
    const published = await publishContent(draft, liveVersion);
    setDraft(published);
    setLiveVersion(published.version);
    setDirty(false);
    setMsg(local
      ? `✅ Version ${published.version} publiée dans ce navigateur : recharge le jeu (localhost:3000) pour la voir.`
      : `✅ Version ${published.version} publiée.`);
  });

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
          subtitle={`Version publiée : ${liveVersion || 'aucune (contenu du code)'} · ${dirty ? 'brouillon modifié, non enregistré' : 'brouillon enregistré'}`}
          right={<>
            <Button tone="neutral" onClick={save} disabled={!dirty || !!busy}>{busy === 'save' ? 'Enregistrement…' : '💾 Enregistrer le brouillon'}</Button>
            <Button tone="green" onClick={publish} disabled={!!busy}>{busy === 'publish' ? 'Publication…' : '🚀 Publier'}</Button>
          </>} />
        <Feedback msg={msg} className="mb-3" />
        {check && (check.errors.length > 0 || check.warnings.length > 0) && (
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {check.errors.map(e => <li key={e} className="text-red-300">❌ {e}</li>)}
            {check.warnings.map(w => <li key={w} className="text-amber-300">⚠️ {w}</li>)}
          </ul>
        )}
        <Segmented label="Type de contenu" value={section} onChange={setSection} className="mb-4"
          options={[{ id: 'paliers', label: '🗺️ Paliers' }, { id: 'enemies', label: '👾 Ennemis' }]} />
        {section === 'paliers' && <PaliersEditor draft={draft} onChange={change} />}
        {section === 'enemies' && <EnemiesEditor draft={draft} onChange={change} />}
      </Card>
    </div>
  );
}
