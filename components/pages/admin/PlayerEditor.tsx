'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  getPlayerDetail, correctPlayerBalance, correctPlayerProgress, resetPlayerEventQuests,
  removePlayerCharacter, addPlayerCharacter, setPlayerCharacterLevel, sortOwnedCharacters,
  addPlayerItem, addPlayerEquipment, sortOwnedEquipment,
  PlayerSaveSummary, PlayerDetail, OwnedCharacterSummary, OwnedItemSummary, OwnedEquipmentSummary,
} from '@/lib/firebase/adminTools';
import { CHARACTER_POOL, getCharacterById } from '@/lib/game/characters';
import { ITEM_DEFS, EQUIPMENT_DEFS } from '@/lib/game/items';
import { RARITY_CONFIG } from '@/types/game';
import { bnFromNumber, bnToNumber } from '@/lib/game/bignum';

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

function fieldsFromSave(save: PlayerSaveSummary | null) {
  return {
    coins:  save ? String(Math.floor(bnToNumber(save.pixelCoins))) : '',
    gems:   save ? String(save.nekoGems) : '',
    crowns: save ? String(save.bossCrowns) : '',
    palier: save ? String(save.palier) : '',
    wave:   save ? String(save.wave) : '',
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

  const initFields = fieldsFromSave(cachedAtMount?.save ?? initialSave);
  const [editCoins, setEditCoins]   = useState(initFields.coins);
  const [editGems, setEditGems]     = useState(initFields.gems);
  const [editCrowns, setEditCrowns] = useState(initFields.crowns);
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
  const [newCharEdition, setNewCharEdition] = useState<'base'|'gold'|'diamond'>('base');
  const [newCharLevel, setNewCharLevel]     = useState('1');
  const [newCharRank, setNewCharRank]       = useState('1');
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
    if (detailCache.has(uid)) return;
    let cancelled = false;
    setDetailLoading(true);
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
  }, [uid]);

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
    const res = await addPlayerCharacter(uid, newCharId.trim(), newCharEdition, Number(newCharLevel) || 1, Number(newCharRank) || 1, Number(newCharForm) || 0);
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
    const ok = await correctPlayerProgress(uid, { palier: newPalier, wave: newWave, maxPalierReached: newMaxPalierReached });
    setProgressMsg(ok ? '✅ Palier corrigé — appliqué immédiatement s\'il est en ligne.' : '❌ Échec de la correction.');
    if (ok) {
      const patch = { palier: newPalier, wave: newWave, maxPalierReached: newMaxPalierReached };
      const updatedSave = { ...playerSave, ...patch };
      setPlayerSave(updatedSave);
      patchCache({ save: updatedSave });
      onSaveUpdate(patch);
    }
    setProgressBusy(false);
  };

  const handleResetEventQuests = async () => {
    if (!confirm('Réinitialiser les quêtes d\'événement de ce joueur ? Sa progression sur toutes les quêtes d\'événement repassera à zéro.')) return;
    setQuestsBusy(true); setQuestsMsg(null);
    const ok = await resetPlayerEventQuests(uid);
    setQuestsMsg(ok ? '✅ Quêtes d\'événement réinitialisées (effectif à la prochaine connexion/sauvegarde du joueur).' : '❌ Échec de la réinitialisation.');
    setQuestsBusy(false);
  };

  if (!playerSave) {
    return (
      <div style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13.4 }}>
        {detailLoading ? 'Chargement…' : 'Aucune sauvegarde pour ce joueur (jamais joué).'}
      </div>
    );
  }

  return (
    <div style={{ padding: '18px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(251,191,36,0.25)', marginTop: 8, marginBottom: 8 }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 4 }}>
        Dernière sauvegarde : {playerSave.lastSaved ? new Date(playerSave.lastSaved).toLocaleString('fr-FR') : 'jamais'}
      </div>
      <div style={{ color: '#c084fc', fontSize: 12.4, fontWeight: 700, marginBottom: 4 }}>
        💎 Total de gemmes dépensées : {playerSave.totalGemsSpent.toLocaleString('fr-FR')}
      </div>
      <div style={{ color: '#22d3ee', fontSize: 12.4, fontWeight: 700, marginBottom: 16 }}>
        ✦ Total d&apos;invocations (gacha) : {playerSave.totalGachaPulls.toLocaleString('fr-FR')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 5 }}>🪙 Pixel-Coins</label>
          <input value={editCoins} onChange={e => setEditCoins(e.target.value)} type="number"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 5 }}>💎 Neko-Gemmes</label>
          <input value={editGems} onChange={e => setEditGems(e.target.value)} type="number"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 5 }}>👑 Couronnes</label>
          <input value={editCrowns} onChange={e => setEditCrowns(e.target.value)} type="number"
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }} />
        </div>
      </div>

      <button onClick={handleCorrect} disabled={correctBusy} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.5)', color: '#4ade80', cursor: 'pointer', fontWeight: 700, fontSize: 13.4 }}>
        {correctBusy ? 'Correction en cours…' : '✅ Appliquer la correction'}
      </button>
      {correctMsg && <div style={{ marginTop: 10, fontSize: 12.4, color: correctMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{correctMsg}</div>}

      {/* ── Palier / progression (ex: annuler une avance obtenue via un bug) ── */}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14.4, marginBottom: 4 }}>Palier / progression</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 }}>
          Palier actuel : {playerSave.palier} · Vague : {playerSave.wave}/10 · Palier max atteint : {playerSave.maxPalierReached}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 5 }}>⛰️ Palier</label>
            <input value={editPalier} onChange={e => setEditPalier(e.target.value)} type="number" min={1}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 5 }}>🌊 Vague (1-10)</label>
            <input value={editWave} onChange={e => setEditWave(e.target.value)} type="number" min={1} max={10}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13.4, boxSizing: 'border-box' }} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={capMaxPalier} onChange={e => setCapMaxPalier(e.target.checked)} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.4 }}>
            Limiter aussi le &quot;palier max atteint&quot; à cette valeur (à cocher pour annuler une avance obtenue via un bug)
          </span>
        </label>

        <button onClick={handleCorrectProgress} disabled={progressBusy} style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.5)', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: 13.4 }}>
          {progressBusy ? 'Correction en cours…' : '✅ Appliquer le palier'}
        </button>
        {progressMsg && <div style={{ marginTop: 10, fontSize: 12.4, color: progressMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{progressMsg}</div>}
      </div>

      {/* ── Quêtes d'événement ───────────────────────────────────── */}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14.4, marginBottom: 4 }}>Quêtes d&apos;événement</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 14 }}>
          Remet à zéro la progression et le statut de toutes les quêtes d&apos;événement de ce joueur.
        </div>
        <button onClick={handleResetEventQuests} disabled={questsBusy}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.5)', color: '#fbbf24', cursor: 'pointer', fontWeight: 700, fontSize: 13.4 }}>
          {questsBusy ? 'Réinitialisation en cours…' : '♻️ Réinitialiser les quêtes d\'événement'}
        </button>
        {questsMsg && <div style={{ marginTop: 10, fontSize: 12.4, color: questsMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{questsMsg}</div>}
      </div>

      {/* ── Gestion de la collection de personnages ────────────── */}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14.4, marginBottom: 12 }}>
          Personnages possédés {detailLoading ? '…' : `(${playerChars.length})`}
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {detailLoading && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Chargement…</div>}
          {!detailLoading && playerChars.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Aucun personnage.</div>}
          {playerChars.map(c => (
            <div key={c.instanceKey} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', fontSize: 12.4 }}>
              <span style={{ color: RARITY_CONFIG[c.rarity].color, fontWeight: 700, minWidth: 130 }}>{c.name}</span>
              <span style={{ color: c.edition === 'diamond' ? '#67e8f9' : c.edition === 'gold' ? '#fbbf24' : 'rgba(255,255,255,0.4)', minWidth: 60 }}>
                {c.edition === 'base' ? '' : c.edition === 'gold' ? '✨ Or' : '💎 Diamant'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', minWidth: 40 }}>{c.rank}★</span>
              {c.formsCount > 1 && (
                <span style={{ color: 'rgba(255,255,255,0.45)', minWidth: 90, fontSize: 11.5 }}>
                  Forme {c.currentForm + 1}/{c.formsCount} · {c.formName}
                </span>
              )}
              <input
                type="number"
                defaultValue={c.level}
                onChange={e => setLevelEdits(s => ({ ...s, [c.instanceKey]: e.target.value }))}
                style={{ width: 70, padding: '5px 8px', borderRadius: 6, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4 }}
              />
              <button onClick={() => handleSetLevel(c.instanceKey)} disabled={charBusy === c.instanceKey}
                style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.4)', color: '#60a5fa', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Niveau
              </button>
              <button onClick={() => handleRemoveChar(c.instanceKey)} disabled={charBusy === c.instanceKey}
                style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700, marginLeft: 'auto' }}>
                {charBusy === c.instanceKey ? '...' : 'Retirer'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.4, fontWeight: 700, marginBottom: 8 }}>Ajouter un personnage</div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Id exact</label>
            <input
              value={newCharId}
              onChange={e => { setNewCharId(e.target.value); setNewCharForm('0'); }}
              placeholder="ex: goku"
              list="admin-char-id-suggestions"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
            {/* Suggestions natives du navigateur, filtrées automatiquement au
                fur et à mesure de la saisie — pas de dropdown custom à gérer. */}
            <datalist id="admin-char-id-suggestions">
              {ADDABLE_CHARACTERS.map(t => (
                <option key={t.id} value={t.id} label={`${t.name} — ${RARITY_CONFIG[t.rarity].label}`} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Édition</label>
            <select value={newCharEdition} onChange={e => setNewCharEdition(e.target.value as 'base'|'gold'|'diamond')}
              style={{ padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4 }}>
              <option value="base">Base</option>
              <option value="gold">✨ Or</option>
              <option value="diamond">💎 Diamant</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Niveau</label>
            <input value={newCharLevel} onChange={e => setNewCharLevel(e.target.value)} type="number" min={1}
              style={{ width: 80, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Nombre d&apos;étoiles</label>
            <input value={newCharRank} onChange={e => setNewCharRank(e.target.value)} type="number" min={1} max={7}
              style={{ width: 80, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Forme</label>
            <select
              value={newCharForm}
              onChange={e => setNewCharForm(e.target.value)}
              disabled={newCharForms.length === 0}
              style={{ padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: newCharForms.length === 0 ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 12.4, minWidth: 140 }}>
              {newCharForms.length === 0 ? (
                <option value="0">Forme unique</option>
              ) : (
                newCharForms.map((f, i) => <option key={f.formId} value={i}>{i + 1}. {f.name}</option>)
              )}
            </select>
          </div>
          <button onClick={handleAddChar} disabled={addCharBusy || !newCharId.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.18)', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12.4 }}>
            {addCharBusy ? '...' : '+ Ajouter'}
          </button>
        </div>
        {addCharMsg && <div style={{ marginTop: 8, fontSize: 12.4, color: addCharMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{addCharMsg}</div>}
      </div>

      {/* ── Objets d'évolution ──────────────────────────────────── */}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14.4, marginBottom: 12 }}>
          Objets d&apos;évolution {detailLoading ? '…' : `(${playerItems.length})`}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {detailLoading && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Chargement…</div>}
          {!detailLoading && playerItems.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Aucun objet.</div>}
          {playerItems.map(item => (
            <span key={item.id} title={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}55`, color: item.color, fontSize: 12, fontWeight: 700 }}>
              {item.icon} {item.name} ×{item.qty}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Id exact</label>
            <input
              value={newItemId}
              onChange={e => setNewItemId(e.target.value)}
              placeholder="ex: elixir_vie"
              list="admin-item-id-suggestions"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
            <datalist id="admin-item-id-suggestions">
              {ADDABLE_ITEMS.map(t => <option key={t.id} value={t.id} label={t.name} />)}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Quantité</label>
            <input value={newItemQty} onChange={e => setNewItemQty(e.target.value)} type="number" min={1}
              style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAddItem} disabled={addItemBusy || !newItemId.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.18)', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12.4 }}>
            {addItemBusy ? '...' : '+ Ajouter'}
          </button>
        </div>
        {addItemMsg && <div style={{ marginTop: 8, fontSize: 12.4, color: addItemMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{addItemMsg}</div>}
      </div>

      {/* ── Équipement ("drops") ────────────────────────────────── */}
      <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 14.4, marginBottom: 12 }}>
          Équipement (drops) {detailLoading ? '…' : `(${playerEquipment.length})`}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {detailLoading && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Chargement…</div>}
          {!detailLoading && playerEquipment.length === 0 && <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12.4 }}>Aucun équipement.</div>}
          {playerEquipment.map(eq => (
            <span key={eq.id} title={eq.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: `${RARITY_CONFIG[eq.rarity].color}15`, border: `1px solid ${RARITY_CONFIG[eq.rarity].color}55`, color: RARITY_CONFIG[eq.rarity].color, fontSize: 12, fontWeight: 700 }}>
              {eq.icon} {eq.name} ×{eq.qty}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Id exact</label>
            <input
              value={newEquipId}
              onChange={e => setNewEquipId(e.target.value)}
              placeholder="ex: helmet_legendary"
              list="admin-equipment-id-suggestions"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
            <datalist id="admin-equipment-id-suggestions">
              {ADDABLE_EQUIPMENT.map(t => <option key={t.id} value={t.id} label={`${t.name} — ${RARITY_CONFIG[t.rarity as keyof typeof RARITY_CONFIG]?.label ?? t.rarity}`} />)}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 11.5, marginBottom: 4 }}>Quantité</label>
            <input value={newEquipQty} onChange={e => setNewEquipQty(e.target.value)} type="number" min={1}
              style={{ width: 90, padding: '8px 10px', borderRadius: 8, background: '#0a0818', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 12.4, boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleAddEquipment} disabled={addEquipBusy || !newEquipId.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.18)', border: '1px solid #8b5cf6', color: '#a78bfa', cursor: 'pointer', fontWeight: 700, fontSize: 12.4 }}>
            {addEquipBusy ? '...' : '+ Ajouter'}
          </button>
        </div>
        {addEquipMsg && <div style={{ marginTop: 8, fontSize: 12.4, color: addEquipMsg.startsWith('✅') ? '#4ade80' : '#f87171' }}>{addEquipMsg}</div>}
      </div>
    </div>
  );
}
