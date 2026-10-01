'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  getPlayerDetail, correctPlayerBalance, correctPlayerProgress, correctPlayerPrestige, resetPlayerRaidQuests,
  removePlayerCharacter, addPlayerCharacter, setPlayerCharacterLevel, sortOwnedCharacters,
  addPlayerItem, addPlayerEquipment, sortOwnedEquipment,
  PlayerSaveSummary, PlayerDetail, OwnedCharacterSummary, OwnedItemSummary, OwnedEquipmentSummary,
} from '@/lib/firebase/adminTools';
import { CHARACTER_POOL, getCharacterById } from '@/lib/game/characters';
import { ITEM_DEFS, EQUIPMENT_DEFS } from '@/lib/game/items';
import { RARITY_CONFIG } from '@/types/game';
import { EDITION_CONFIG, EDITION_ORDER, type CardEdition } from '@/lib/game/editions';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';
import { PRESTIGE_BONUS_DEFS, PRESTIGE_BONUS_TYPES, STONE_MEMORY_MAX_LEVEL, formatBonusValue } from '@/lib/game/prestige';
import { formatNumber } from '@/lib/game/format';
import { PlayerHistoryCharts } from './PlayerHistoryCharts';
import { Button, Card, Empty, Feedback, Field, SectionHeader, Segmented, SelectInput, StatTile, TextInput, cx } from './ui';

// Listes proposables à l'ajout (les héros ne vivent pas dans `collection`,
// donc exclus) — calculées une fois, réutilisées pour les suggestions d'id
// qui se rétrécissent au fur et à mesure de la saisie (datalist natif).
const ADDABLE_CHARACTERS = CHARACTER_POOL.filter(t => !t.isHero);
const ADDABLE_ITEMS = Object.values(ITEM_DEFS);
const ADDABLE_EQUIPMENT = Object.values(EQUIPMENT_DEFS);

const EMPTY_DETAIL: PlayerDetail = { save: null, chars: [], items: [], equipment: [] };

// Cache module-level (comme accountsCache dans app/admin/page.tsx) : rouvrir
// une ligne déjà consultée dans la même session ne relit pas Firestore une
// deuxième fois. Le solde/palier initial vient déjà de la liste (via
// `initialSave`, fusionné sans coût réseau par getAllUsers) — seuls la
// collection, les objets et l'équipement justifient encore une lecture, à
// l'ouverture.
const detailCache = new Map<string, PlayerDetail>();

// Sous-onglet de la fiche : mémorisé pour la session, pour qu'en passant d'un
// joueur à l'autre on retombe sur la même section (ex : comparer les graphes).
type EditorTab = 'history' | 'fix' | 'inventory';
let lastEditorTab: EditorTab = 'history';

function fieldsFromSave(save: PlayerSaveSummary | null) {
  return {
    coins:  save ? String(Math.floor(bnToNumber(save.pixelCoins))) : '',
    gems:   save ? String(save.nekoGems) : '',
    crowns: save ? String(save.bossCrowns) : '',
    palier: save ? String(save.palier) : '',
    wave:   save ? String(save.wave) : '',
    prestigeLevel:  save ? String(save.prestigeLevel) : '',
    prestigeTokens: save ? String(save.prestigeTokens) : '',
  };
}

// Ajoute `delta` à la quantité d'une entrée déjà listée, ou l'insère si
// nouvelle — évite de refetch tout l'inventaire après un simple ajout.
function bumpQty<T extends { id: string; qty: number }>(list: T[], entry: T): T[] {
  const idx = list.findIndex(x => x.id === entry.id);
  if (idx === -1) return [...list, entry];
  return list.map(x => x.id === entry.id ? { ...x, qty: x.qty + entry.qty } : x);
}

interface PlayerEditorProps {
  uid: string;
  initialSave: PlayerSaveSummary | null;
  // Répercute les corrections vers la ligne du tableau parent (PlayersTab)
  // pour qu'elle affiche les nouvelles valeurs sans "Actualiser".
  onSaveUpdate: (patch: Partial<PlayerSaveSummary>) => void;
}

export function PlayerEditor({ uid, initialSave, onSaveUpdate }: PlayerEditorProps) {
  const cachedAtMount = detailCache.get(uid);
  const [playerSave, setPlayerSave]   = useState<PlayerSaveSummary | null>(cachedAtMount?.save ?? initialSave);
  const [playerChars, setPlayerChars] = useState<OwnedCharacterSummary[]>(cachedAtMount?.chars ?? []);
  const [playerItems, setPlayerItems] = useState<OwnedItemSummary[]>(cachedAtMount?.items ?? []);
  const [playerEquipment, setPlayerEquipment] = useState<OwnedEquipmentSummary[]>(cachedAtMount?.equipment ?? []);
  const [detailLoading, setDetailLoading] = useState(!cachedAtMount);
  // Incrémenté par le bouton "Actualiser" : relit le doc en ignorant le cache.
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<EditorTab>(lastEditorTab);
  const selectTab = (t: EditorTab) => { lastEditorTab = t; setTab(t); };

  const initFields = fieldsFromSave(cachedAtMount?.save ?? initialSave);
  const [editCoins, setEditCoins]   = useState(initFields.coins);
  const [editGems, setEditGems]     = useState(initFields.gems);
  const [editCrowns, setEditCrowns] = useState(initFields.crowns);
  const [editPrestigeLevel, setEditPrestigeLevel]   = useState(initFields.prestigeLevel);
  const [editPrestigeTokens, setEditPrestigeTokens] = useState(initFields.prestigeTokens);
  const [prestigeBusy, setPrestigeBusy] = useState(false);
  const [prestigeMsg, setPrestigeMsg]   = useState<string | null>(null);
  const [editPalier, setEditPalier] = useState(initFields.palier);
  const [editWave, setEditWave]     = useState(initFields.wave);
  const [capMaxPalier, setCapMaxPalier] = useState(true);
  const [progressBusy, setProgressBusy] = useState(false);
  const [progressMsg, setProgressMsg]   = useState<string | null>(null);
  const [correctBusy, setCorrectBusy] = useState(false);
  const [correctMsg, setCorrectMsg]   = useState<string | null>(null);
  const [questsBusy, setQuestsBusy]   = useState(false);
  const [questsMsg, setQuestsMsg]     = useState<string | null>(null);

  const [charBusy, setCharBusy]       = useState<string | null>(null);
  const [levelEdits, setLevelEdits]   = useState<Record<string, string>>({});
  const [newCharId, setNewCharId]     = useState('');
  const [newCharEdition, setNewCharEdition] = useState<CardEdition>('base');
  const [newCharLevel, setNewCharLevel]     = useState('1');
  const [newCharForm, setNewCharForm]       = useState('0');
  const [addCharMsg, setAddCharMsg]   = useState<string | null>(null);
  const [addCharBusy, setAddCharBusy] = useState(false);

  const [newItemId, setNewItemId]     = useState('');
  const [newItemQty, setNewItemQty]   = useState('1');
  const [addItemMsg, setAddItemMsg]   = useState<string | null>(null);
  const [addItemBusy, setAddItemBusy] = useState(false);

  const [newEquipId, setNewEquipId]     = useState('');
  const [newEquipQty, setNewEquipQty]   = useState('1');
  const [addEquipMsg, setAddEquipMsg]   = useState<string | null>(null);
  const [addEquipBusy, setAddEquipBusy] = useState(false);

  // Résolu à chaque frappe pour peupler le sélecteur de forme avec les
  // VRAIES formes du personnage tapé (sinon vide/désactivé — la plupart des
  // persos n'ont pas d'évolution).
  const resolvedNewCharTpl = useMemo(() => getCharacterById(newCharId.trim()), [newCharId]);
  const newCharForms = resolvedNewCharTpl?.forms ?? [];

  useEffect(() => {
    // Déjà en cache (ligne rouverte dans la même session) — l'état initial
    // du composant l'a déjà pris en compte (voir cachedAtMount ci-dessus),
    // rien à refaire.
    if (reloadKey === 0 && detailCache.has(uid)) return;
    // detailLoading est déjà à true ici : à l'initialisation (pas de cache)
    // ou via reloadDetail (bouton "Actualiser").
    let cancelled = false;
    getPlayerDetail(uid).then(detail => {
      if (cancelled) return;
      detailCache.set(uid, detail);
      setPlayerChars(detail.chars);
      setPlayerItems(detail.items);
      setPlayerEquipment(detail.equipment);
      if (detail.save) setPlayerSave(detail.save);
      setDetailLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid, reloadKey]);

  const reloadDetail = () => {
    setDetailLoading(true);
    setReloadKey(k => k + 1);
  };

  const patchCache = (patch: Partial<PlayerDetail>) => {
    const cached = detailCache.get(uid) ?? EMPTY_DETAIL;
    detailCache.set(uid, { ...cached, ...patch });
  };

  const patchChars = (updater: (chars: OwnedCharacterSummary[]) => OwnedCharacterSummary[]) => {
    setPlayerChars(chars => {
      const updated = updater(chars);
      patchCache({ chars: updated });
      return updated;
    });
  };

  const handleRemoveChar = async (instanceKey: string) => {
    setCharBusy(instanceKey);
    const ok = await removePlayerCharacter(uid, instanceKey);
    if (ok) patchChars(chars => chars.filter(c => c.instanceKey !== instanceKey));
    setCharBusy(null);
  };

  const handleSetLevel = async (instanceKey: string) => {
    const val = Number(levelEdits[instanceKey]);
    if (!val || val < 1) return;
    setCharBusy(instanceKey);
    const ok = await setPlayerCharacterLevel(uid, instanceKey, val);
    if (ok) patchChars(chars => chars.map(c => c.instanceKey === instanceKey ? { ...c, level: val } : c));
    setCharBusy(null);
  };

  const handleAddChar = async () => {
    if (!newCharId.trim()) return;
    setAddCharBusy(true); setAddCharMsg(null);
    const res = await addPlayerCharacter(uid, newCharId.trim(), newCharEdition, Number(newCharLevel) || 1, Number(newCharForm) || 0);
    setAddCharMsg(res.ok ? '✅ Personnage ajouté.' : `❌ ${res.error}`);
    if (res.ok && res.char) {
      const added = res.char;
      patchChars(chars => sortOwnedCharacters([...chars.filter(c => c.instanceKey !== added.instanceKey), added]));
      setNewCharId('');
      setNewCharForm('0');
    }
    setAddCharBusy(false);
  };

  const handleAddItem = async () => {
    if (!newItemId.trim()) return;
    setAddItemBusy(true); setAddItemMsg(null);
    const res = await addPlayerItem(uid, newItemId.trim(), Number(newItemQty) || 1);
    setAddItemMsg(res.ok ? '✅ Objet ajouté.' : `❌ ${res.error}`);
    if (res.ok && res.item) {
      const added = res.item;
      setPlayerItems(items => {
        const updated = bumpQty(items, added).sort((a, b) => a.name.localeCompare(b.name));
        patchCache({ items: updated });
        return updated;
      });
      setNewItemId('');
    }
    setAddItemBusy(false);
  };

  const handleAddEquipment = async () => {
    if (!newEquipId.trim()) return;
    setAddEquipBusy(true); setAddEquipMsg(null);
    const res = await addPlayerEquipment(uid, newEquipId.trim(), Number(newEquipQty) || 1);
    setAddEquipMsg(res.ok ? '✅ Équipement ajouté.' : `❌ ${res.error}`);
    if (res.ok && res.equipment) {
      const added = res.equipment;
      setPlayerEquipment(equipment => {
        const updated = sortOwnedEquipment(bumpQty(equipment, added));
        patchCache({ equipment: updated });
        return updated;
      });
      setNewEquipId('');
    }
    setAddEquipBusy(false);
  };

  const handleCorrect = async () => {
    setCorrectBusy(true); setCorrectMsg(null);
    const newCoins  = Math.max(0, Number(editCoins) || 0);
    const newGems   = Math.max(0, Number(editGems) || 0);
    const newCrowns = Math.max(0, Number(editCrowns) || 0);
    const ok = await correctPlayerBalance(uid, { pixelCoins: newCoins, nekoGems: newGems, bossCrowns: newCrowns });
    setCorrectMsg(ok ? '✅ Corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) {
      const patch = { pixelCoins: bnFromNumber(newCoins), nekoGems: newGems, bossCrowns: newCrowns };
      setPlayerSave(s => s ? { ...s, ...patch } : s);
      patchCache({ save: playerSave ? { ...playerSave, ...patch } : null });
      onSaveUpdate(patch);
    }
    setCorrectBusy(false);
  };

  const handleCorrectProgress = async () => {
    if (!playerSave) return;
    setProgressBusy(true); setProgressMsg(null);
    const newPalier = Math.max(1, Number(editPalier) || 1);
    const newWave   = Math.max(1, Math.min(10, Number(editWave) || 1));
    const newMaxPalierReached = capMaxPalier
      ? Math.min(playerSave.maxPalierReached, newPalier)
      : Math.max(playerSave.maxPalierReached, newPalier);
    // Le pic de palier de la run en cours (runPeakPalier) gate l'éligibilité
    // au Prestige — sans le corriger en même temps que maxPalierReached,
    // l'onglet Prestige du joueur resterait bloqué sur l'ancien pic (voir
    // runPeakPalierOf côté client, et le commentaire dans correctPlayerProgress).
    const currentRunPeak = playerSave.runPeakPalier ?? playerSave.maxPalierReached;
    const newRunPeakPalier = capMaxPalier
      ? Math.min(currentRunPeak, newPalier)
      : Math.max(currentRunPeak, newPalier);
    const ok = await correctPlayerProgress(uid, { palier: newPalier, wave: newWave, maxPalierReached: newMaxPalierReached, runPeakPalier: newRunPeakPalier });
    setProgressMsg(ok ? '✅ Palier corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) {
      const patch = { palier: newPalier, wave: newWave, maxPalierReached: newMaxPalierReached, runPeakPalier: newRunPeakPalier };
      const updatedSave = { ...playerSave, ...patch };
      setPlayerSave(updatedSave);
      patchCache({ save: updatedSave });
      onSaveUpdate(patch);
    }
    setProgressBusy(false);
  };

  const handleCorrectPrestige = async () => {
    if (!playerSave) return;
    setPrestigeBusy(true); setPrestigeMsg(null);
    const patch = {
      prestigeLevel:  Math.max(0, Math.floor(Number(editPrestigeLevel) || 0)),
      prestigeTokens: Math.max(0, Math.floor(Number(editPrestigeTokens) || 0)),
    };
    const ok = await correctPlayerPrestige(uid, patch);
    setPrestigeMsg(ok ? '✅ Prestige corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) {
      const updatedSave = { ...playerSave, ...patch };
      setPlayerSave(updatedSave);
      patchCache({ save: updatedSave });
      onSaveUpdate(patch);
    }
    setPrestigeBusy(false);
  };

  const handleResetEventQuests = async () => {
    if (!confirm('Réinitialiser les quêtes de raid de ce joueur ? Sa progression sur toutes les quêtes de raid repassera à zéro.')) return;
    setQuestsBusy(true); setQuestsMsg(null);
    const ok = await resetPlayerRaidQuests(uid);
    setQuestsMsg(ok ? '✅ Quêtes de raid réinitialisées (effectif à la prochaine connexion/sauvegarde du joueur).' : '❌ Échec de la réinitialisation.');
    setQuestsBusy(false);
  };

  if (!playerSave) {
    return (
      <div className="px-3 py-4 text-sm text-white/70">
        {detailLoading ? 'Chargement…' : 'Aucune sauvegarde pour ce joueur (jamais joué).'}
      </div>
    );
  }

  const editorTabs: { id: EditorTab; label: string }[] = [
    { id: 'history', label: '📈 Historique' },
    { id: 'fix', label: '🛠️ Corrections' },
    { id: 'inventory', label: `🎒 Inventaire${detailLoading ? '' : ` · ${playerChars.length + playerItems.length + playerEquipment.length}`}` },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-black/20 p-3 sm:p-4">
      {/* ── En-tête : infos clés + actualisation ───────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 text-sm leading-relaxed text-white/70">
          <div>Dernière sauvegarde : <span className="text-white/80">{playerSave.lastSaved ? new Date(playerSave.lastSaved).toLocaleString('fr-FR') : 'jamais'}</span></div>
          {(playerSave.lastSavedBy || playerSave.lastSavedReason) && (
            <div className="break-all">Écrite par : {playerSave.lastSavedBy ?? '?'} — raison : {playerSave.lastSavedReason ?? '?'}</div>
          )}
        </div>
        <Button size="sm" onClick={reloadDetail} disabled={detailLoading} title="Relire la fiche du joueur depuis Firestore">
          {detailLoading ? 'Chargement…' : '↻ Actualiser la fiche'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Pixel-Coins" value={<>🪙 {formatNumber(playerSave.pixelCoins)}</>} tone="amber" />
        <StatTile label="Neko-Gemmes" value={<>💎 {formatNumber(playerSave.nekoGems)}</>} tone="purple" />
        <StatTile label="Palier · vague" value={<>⛰️ {playerSave.palier} · {playerSave.wave}/10</>} tone="cyan" hint={`Palier max atteint : ${playerSave.maxPalierReached}`} />
        <StatTile label="Prestiges" value={<>✨ {playerSave.prestigeLevel.toLocaleString('fr-FR')}</>} tone="purple" />
        <StatTile label="Gemmes dépensées" value={formatNumber(playerSave.totalGemsSpent)} tone="purple" hint="Total de gemmes dépensées" />
        <StatTile label="Invocations" value={<>✦ {playerSave.totalGachaPulls.toLocaleString('fr-FR')}</>} tone="cyan" hint="Total d'invocations (gacha)" />
      </div>

      <Segmented label="Sections de la fiche joueur" value={tab} options={editorTabs} onChange={selectTab} tone="amber" className="self-start" />

      {/* ── Historique coins/gemmes/paliers/prestige ─────────────
          Alimenté sans coût Firestore additionnel (voir PlayerHistoryCharts
          et le commentaire sur CurrencySnapshot) : le champ voyage dans le
          même doc `saves/{uid}` déjà lu par getPlayerDetail ci-dessus. */}
      {tab === 'history' && (
        <Card>
          {detailLoading ? (
            <div className="text-sm text-white/70">Chargement de l&apos;historique…</div>
          ) : (
            <PlayerHistoryCharts history={playerSave.currencyHistory ?? []} />
          )}
        </Card>
      )}

      {tab === 'fix' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Soldes ─────────────────────────────────────────── */}
          <Card>
            <SectionHeader icon="💰" title="Soldes" subtitle="Remplace les soldes du joueur par ces valeurs." />
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="🪙 Pixel-Coins">
                <TextInput value={editCoins} onChange={e => setEditCoins(e.target.value)} type="number" inputMode="numeric" />
              </Field>
              <Field label="💎 Neko-Gemmes">
                <TextInput value={editGems} onChange={e => setEditGems(e.target.value)} type="number" inputMode="numeric" />
              </Field>
              <Field label="👑 Couronnes">
                <TextInput value={editCrowns} onChange={e => setEditCrowns(e.target.value)} type="number" inputMode="numeric" />
              </Field>
            </div>
            <Button tone="green" onClick={handleCorrect} disabled={correctBusy} className="w-full sm:w-auto">
              {correctBusy ? 'Correction en cours…' : '✅ Appliquer la correction'}
            </Button>
            <Feedback msg={correctMsg} className="mt-3" />
          </Card>

          {/* ── Palier / progression (ex: annuler une avance obtenue via un bug) ── */}
          <Card>
            <SectionHeader icon="⛰️" title="Palier / progression"
              subtitle={`Palier actuel : ${playerSave.palier} · Vague : ${playerSave.wave}/10 · Palier max atteint : ${playerSave.maxPalierReached}`} />
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Field label="⛰️ Palier">
                <TextInput value={editPalier} onChange={e => setEditPalier(e.target.value)} type="number" min={1} inputMode="numeric" />
              </Field>
              <Field label="🌊 Vague (1-10)">
                <TextInput value={editWave} onChange={e => setEditWave(e.target.value)} type="number" min={1} max={10} inputMode="numeric" />
              </Field>
            </div>
            <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1">
              <input type="checkbox" checked={capMaxPalier} onChange={e => setCapMaxPalier(e.target.checked)} className="size-4 shrink-0 accent-sky-400" />
              <span className="text-sm text-white/80">
                Limiter aussi le &quot;palier max atteint&quot; à cette valeur (à cocher pour annuler une avance obtenue via un bug)
              </span>
            </label>
            <Button tone="blue" onClick={handleCorrectProgress} disabled={progressBusy} className="w-full sm:w-auto">
              {progressBusy ? 'Correction en cours…' : '✅ Appliquer le palier'}
            </Button>
            <Feedback msg={progressMsg} className="mt-3" />
          </Card>

          {/* ── Prestige : jetons non dépensés + niveaux de bonus tirés ── */}
          <Card className="lg:col-span-2">
            <SectionHeader icon="✨" title="Prestige" right={
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-fuchsia-300">Prestiges : <b>{playerSave.prestigeLevel.toLocaleString('fr-FR')}</b></span>
                <span className="text-amber-200">🎫 Jetons disponibles : <b>{formatNumber(playerSave.prestigeTokens)}</b></span>
                <span className="text-white/80">💎 Mémoire des Pierres : <b>{playerSave.prestigeRankRecoveryLevel}/{STONE_MEMORY_MAX_LEVEL}</b></span>
              </div>
            } />
            <div className="mb-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {PRESTIGE_BONUS_TYPES.map(type => {
                const def = PRESTIGE_BONUS_DEFS[type];
                const level = playerSave.prestigeBonusLevels[type];
                return (
                  <div key={type} className={cx('flex min-w-0 items-center gap-2.5 rounded-lg border border-white/15 bg-[#0a0818] px-3 py-2', level <= 0 && 'opacity-70')}>
                    <span className="text-xl" aria-hidden>{def.icon}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-white/85" title={def.label}>{def.label}</div>
                      <div className="text-sm font-bold text-white">
                        Niv. {level}{def.maxLevel ? `/${def.maxLevel}` : ''}
                        <span className="ml-1.5 text-emerald-300">{formatBonusValue(type, level)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="✨ Nombre de prestiges" className="sm:w-48">
                <TextInput value={editPrestigeLevel} onChange={e => setEditPrestigeLevel(e.target.value)} type="number" min={0} inputMode="numeric" />
              </Field>
              <Field label="🎫 Jetons de prestige" className="sm:w-48">
                <TextInput value={editPrestigeTokens} onChange={e => setEditPrestigeTokens(e.target.value)} type="number" min={0} inputMode="numeric" />
              </Field>
              <Button tone="purple" onClick={handleCorrectPrestige} disabled={prestigeBusy}>
                {prestigeBusy ? 'Correction en cours…' : '✅ Appliquer le prestige'}
              </Button>
            </div>
            <Feedback msg={prestigeMsg} className="mt-3" />
          </Card>

          {/* ── Quêtes de raid ───────────────────────────────────── */}
          <Card className="lg:col-span-2">
            <SectionHeader icon="🗡️" title="Quêtes de raid"
              subtitle="Remet à zéro la progression et le statut de toutes les quêtes de raid de ce joueur."
              right={
                <Button tone="amber" onClick={handleResetEventQuests} disabled={questsBusy}>
                  {questsBusy ? 'Réinitialisation en cours…' : '♻️ Réinitialiser les quêtes de raid'}
                </Button>
              } />
            <Feedback msg={questsMsg} />
          </Card>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="flex flex-col gap-4">
          {/* ── Gestion de la collection de personnages ────────────── */}
          <Card>
            <SectionHeader icon="🧙" title={`Personnages possédés ${detailLoading ? '…' : `(${playerChars.length})`}`} />
            <div className="mb-5 flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
              {detailLoading && <div className="text-sm text-white/70">Chargement…</div>}
              {!detailLoading && playerChars.length === 0 && <Empty>Aucun personnage.</Empty>}
              {playerChars.map(c => (
                <div key={c.instanceKey} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/15 bg-white/[0.02] px-3 py-2 text-sm">
                  <div className="flex min-w-0 flex-1 basis-48 flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="font-bold" style={{ color: RARITY_CONFIG[c.rarity].color }}>{c.name}</span>
                    {c.edition !== 'base' && EDITION_CONFIG[c.edition as CardEdition] && (
                      <span style={{ color: EDITION_CONFIG[c.edition as CardEdition].color }}>
                        {EDITION_CONFIG[c.edition as CardEdition].icon} {EDITION_CONFIG[c.edition as CardEdition].label}
                      </span>
                    )}
                    {c.formsCount > 1 && (
                      <span className="text-sm text-white/75">Forme {c.currentForm + 1}/{c.formsCount} · {c.formName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TextInput
                      type="number"
                      aria-label={`Niveau de ${c.name}`}
                      defaultValue={c.level}
                      onChange={e => setLevelEdits(s => ({ ...s, [c.instanceKey]: e.target.value }))}
                      className="!min-h-10 w-24 !text-sm"
                    />
                    <Button size="sm" tone="blue" onClick={() => handleSetLevel(c.instanceKey)} disabled={charBusy === c.instanceKey}>
                      Niveau
                    </Button>
                    <Button size="sm" tone="red" onClick={() => handleRemoveChar(c.instanceKey)} disabled={charBusy === c.instanceKey}>
                      {charBusy === c.instanceKey ? '…' : 'Retirer'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.03] p-3">
              <div className="mb-3 text-sm font-bold text-violet-200">➕ Ajouter un personnage</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] md:items-end">
                <Field label="Id exact" className="col-span-2 md:col-span-1">
                  <TextInput
                    value={newCharId}
                    onChange={e => { setNewCharId(e.target.value); setNewCharForm('0'); }}
                    placeholder="ex: goku"
                    list="admin-char-id-suggestions" />
                  {/* Suggestions natives du navigateur, filtrées automatiquement au
                      fur et à mesure de la saisie — pas de dropdown custom à gérer. */}
                  <datalist id="admin-char-id-suggestions">
                    {ADDABLE_CHARACTERS.map(t => (
                      <option key={t.id} value={t.id} label={`${t.name} — ${RARITY_CONFIG[t.rarity].label}`} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Édition">
                  <SelectInput value={newCharEdition} onChange={e => setNewCharEdition(e.target.value as CardEdition)}>
                    {EDITION_ORDER.map(ed => (
                      <option key={ed} value={ed}>{EDITION_CONFIG[ed].icon} {EDITION_CONFIG[ed].label}</option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Forme">
                  <SelectInput value={newCharForm} onChange={e => setNewCharForm(e.target.value)} disabled={newCharForms.length === 0}>
                    {newCharForms.length === 0 ? (
                      <option value="0">Forme unique</option>
                    ) : (
                      newCharForms.map((f, i) => <option key={f.formId} value={i}>{i + 1}. {f.name}</option>)
                    )}
                  </SelectInput>
                </Field>
                <Field label="Niveau">
                  <TextInput value={newCharLevel} onChange={e => setNewCharLevel(e.target.value)} type="number" min={1} inputMode="numeric" />
                </Field>
                <Button tone="purple" onClick={handleAddChar} disabled={addCharBusy || !newCharId.trim()} className="col-span-2 md:col-span-1">
                  {addCharBusy ? '…' : '+ Ajouter'}
                </Button>
              </div>
              <Feedback msg={addCharMsg} className="mt-3" />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* ── Objets d'évolution ──────────────────────────────────── */}
            <Card>
              <SectionHeader icon="🧪" title={`Objets d'évolution ${detailLoading ? '…' : `(${playerItems.length})`}`} />
              <div className="mb-4 flex flex-wrap gap-1.5">
                {detailLoading && <div className="text-sm text-white/70">Chargement…</div>}
                {!detailLoading && playerItems.length === 0 && <div className="text-sm text-white/70">Aucun objet.</div>}
                {playerItems.map(item => (
                  <span key={item.id} title={item.id} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-bold"
                    style={{ background: `${item.color}15`, borderColor: `${item.color}55`, color: item.color }}>
                    {item.icon} {item.name} ×{item.qty}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto] sm:items-end">
                <Field label="Id exact">
                  <TextInput value={newItemId} onChange={e => setNewItemId(e.target.value)} placeholder="ex: elixir_vie" list="admin-item-id-suggestions" />
                  <datalist id="admin-item-id-suggestions">
                    {ADDABLE_ITEMS.map(t => <option key={t.id} value={t.id} label={t.name} />)}
                  </datalist>
                </Field>
                <Field label="Quantité">
                  <TextInput value={newItemQty} onChange={e => setNewItemQty(e.target.value)} type="number" min={1} inputMode="numeric" />
                </Field>
                <Button tone="purple" onClick={handleAddItem} disabled={addItemBusy || !newItemId.trim()} className="col-span-2 sm:col-span-1">
                  {addItemBusy ? '…' : '+ Ajouter'}
                </Button>
              </div>
              <Feedback msg={addItemMsg} className="mt-3" />
            </Card>

            {/* ── Équipement ("drops") ────────────────────────────────── */}
            <Card>
              <SectionHeader icon="🛡️" title={`Équipement (drops) ${detailLoading ? '…' : `(${playerEquipment.length})`}`} />
              <div className="mb-4 flex flex-wrap gap-1.5">
                {detailLoading && <div className="text-sm text-white/70">Chargement…</div>}
                {!detailLoading && playerEquipment.length === 0 && <div className="text-sm text-white/70">Aucun équipement.</div>}
                {playerEquipment.map(eq => {
                  const color = RARITY_CONFIG[eq.rarity].color;
                  return (
                    <span key={eq.id} title={eq.id} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm font-bold"
                      style={{ background: `${color}15`, borderColor: `${color}55`, color }}>
                      {eq.icon} {eq.name} ×{eq.qty}
                    </span>
                  );
                })}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto] sm:items-end">
                <Field label="Id exact">
                  <TextInput value={newEquipId} onChange={e => setNewEquipId(e.target.value)} placeholder="ex: helmet_legendary" list="admin-equipment-id-suggestions" />
                  <datalist id="admin-equipment-id-suggestions">
                    {ADDABLE_EQUIPMENT.map(t => <option key={t.id} value={t.id} label={`${t.name} — ${RARITY_CONFIG[t.rarity as keyof typeof RARITY_CONFIG]?.label ?? t.rarity}`} />)}
                  </datalist>
                </Field>
                <Field label="Quantité">
                  <TextInput value={newEquipQty} onChange={e => setNewEquipQty(e.target.value)} type="number" min={1} inputMode="numeric" />
                </Field>
                <Button tone="purple" onClick={handleAddEquipment} disabled={addEquipBusy || !newEquipId.trim()} className="col-span-2 sm:col-span-1">
                  {addEquipBusy ? '…' : '+ Ajouter'}
                </Button>
              </div>
              <Feedback msg={addEquipMsg} className="mt-3" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
