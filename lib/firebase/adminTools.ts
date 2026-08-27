import { doc, getDoc, updateDoc, deleteField, increment, FieldPath } from 'firebase/firestore';
import { db } from './config';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { makeInstanceKey, CardEdition } from '@/lib/game/editions';
import { getItemDef, getEquipmentDef } from '@/lib/game/items';
import { Rarity, RARITY_ORDER_ASC } from '@/types/game';
import { logger } from '../logger';
import { coerceBigNum, type BigNum } from '@/lib/game/bignum';

export interface PlayerSaveSummary {
  pixelCoins: BigNum;
  nekoGems: number;
  totalGemsSpent: number;
  totalGachaPulls: number;
  bossCrowns: number;
  palier: number;
  wave: number;
  maxPalierReached: number;
  lastSaved: number | null;
}

// Résumé léger d'un personnage possédé, pour l'affichage dans l'outil admin.
export interface OwnedCharacterSummary {
  instanceKey: string;
  templateId: string;
  name: string;      // nom lisible, résolu via CHARACTER_POOL
  rarity: Rarity;
  edition: string;
  level: number;
  rank: number;
  currentForm: number;
  formsCount: number; // formes connues pour ce perso (0/1 = pas d'évolution)
  formName: string;   // nom affiché pour la forme actuelle (= name si pas d'évolution)
}

// Résumé léger d'un objet (évolution) ou équipement possédé en quantité, pour
// l'affichage dans l'outil admin — `qty` est soit le stock total affiché,
// soit la quantité ajoutée lors d'un patch local optimiste (voir PlayerEditor).
export interface OwnedItemSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  qty: number;
}
export interface OwnedEquipmentSummary extends OwnedItemSummary {
  rarity: Rarity;
}

// Rareté la plus élevée d'abord (T > CO > ... > C), comme dans CollectionPage —
// puis alphabétique à rareté égale.
const RARITY_ORDER_DESC = RARITY_ORDER_ASC.slice().reverse();
export function sortOwnedCharacters(chars: OwnedCharacterSummary[]): OwnedCharacterSummary[] {
  return [...chars].sort((a, b) => {
    const diff = RARITY_ORDER_DESC.indexOf(a.rarity) - RARITY_ORDER_DESC.indexOf(b.rarity);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}
export function sortOwnedEquipment(items: OwnedEquipmentSummary[]): OwnedEquipmentSummary[] {
  return [...items].sort((a, b) => {
    const diff = RARITY_ORDER_DESC.indexOf(a.rarity) - RARITY_ORDER_DESC.indexOf(b.rarity);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });
}

function summarizeCollection(raw: Record<string, { templateId: string; edition?: string; level: number; rank: number; currentForm?: number }>): OwnedCharacterSummary[] {
  const chars = Object.entries(raw).map(([instanceKey, c]) => {
    const tpl = getCharacterById(c.templateId);
    const currentForm = c.currentForm ?? 0;
    return {
      instanceKey,
      templateId: c.templateId,
      name: tpl?.name ?? c.templateId,
      rarity: tpl?.rarity ?? 'C',
      edition: c.edition ?? 'base',
      level: c.level ?? 1,
      rank: c.rank ?? 1,
      currentForm,
      formsCount: tpl?.forms?.length ?? 0,
      formName: tpl ? getCharFormName(tpl, currentForm) : c.templateId,
    };
  });
  return sortOwnedCharacters(chars);
}

function summarizeItems(raw: Record<string, number> = {}): OwnedItemSummary[] {
  return Object.entries(raw)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const def = getItemDef(id);
      return { id, name: def?.name ?? id, icon: def?.icon ?? '❔', color: def?.color ?? '#9ca3af', qty };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function summarizeEquipment(raw: Record<string, number> = {}): OwnedEquipmentSummary[] {
  const equipment = Object.entries(raw)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const def = getEquipmentDef(id);
      return { id, name: def?.name ?? id, icon: def?.icon ?? '❔', color: def?.color ?? '#9ca3af', rarity: (def?.rarity as Rarity) ?? 'C', qty };
    });
  return sortOwnedEquipment(equipment);
}

export interface PlayerDetail {
  save: PlayerSaveSummary | null;
  chars: OwnedCharacterSummary[];
  items: OwnedItemSummary[];
  equipment: OwnedEquipmentSummary[];
}
const EMPTY_PLAYER_DETAIL: PlayerDetail = { save: null, chars: [], items: [], equipment: [] };

/**
 * Lit en UNE SEULE lecture tout ce qu'affiche le panel admin pour un joueur —
 * solde, collection de personnages, objets d'évolution et équipement ("drops")
 * — puisque tout vit dans le même doc `saves/{uid}`. Avant ce correctif,
 * getPlayerSave + getPlayerCollection relisaient séparément ce même document.
 */
export async function getPlayerDetail(uid: string): Promise<PlayerDetail> {
  if (!db) return EMPTY_PLAYER_DETAIL;
  try {
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return EMPTY_PLAYER_DETAIL;
    const d = snap.data();
    const save: PlayerSaveSummary = {
      pixelCoins:       coerceBigNum(d.pixelCoins),
      nekoGems:         d.nekoGems ?? 0,
      totalGemsSpent:   d.totalGemsSpent ?? 0,
      totalGachaPulls:  d.totalGachaPulls ?? 0,
      bossCrowns:       d.bossCrowns ?? 0,
      palier:           d.palier ?? 1,
      wave:             d.wave ?? 1,
      maxPalierReached: d.maxPalierReached ?? 1,
      lastSaved:        d.lastSaved ?? null,
    };
    return {
      save,
      chars: summarizeCollection(d.collection ?? {}),
      items: summarizeItems(d.inventory),
      equipment: summarizeEquipment(d.equipmentInventory),
    };
  } catch (e) {
    logger.error('[AdminTools] getPlayerDetail:', e);
    return EMPTY_PLAYER_DETAIL;
  }
}

/**
 * Corrige le solde d'un joueur sur sa sauvegarde CLOUD, et met à jour
 * lastSaved à MAINTENANT — indispensable pour que la correction ne soit pas
 * écrasée par l'ancienne sauvegarde locale (localStorage) du joueur à sa
 * prochaine connexion (le jeu charge toujours la version la plus récente).
 *
 * `adminCorrectionAt` est un signal séparé écouté EN DIRECT par le client du
 * joueur (voir useCloudSave.ts) : si le joueur est déjà connecté et en train
 * de jouer au moment de la correction, son propre autosave (toutes les 30s
 * en local / 10min sur Firebase) écraserait sinon la correction avant même
 * qu'il ne se reconnecte. Ce signal permet d'appliquer la correction tout de
 * suite dans son état de jeu en cours, sans attendre un rechargement.
 */
export async function correctPlayerBalance(
  uid: string,
  updates: { pixelCoins?: number; nekoGems?: number; bossCrowns?: number }
): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid), {
      ...updates,
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    });
    return true;
  } catch (e) {
    logger.error('[AdminTools] correctPlayerBalance:', e);
    return false;
  }
}

/**
 * Corrige la progression d'un joueur (palier, vague, palier max atteint) —
 * utile pour annuler une avancée obtenue via un bug/exploit. Même mécanisme
 * `adminCorrectionAt` que correctPlayerBalance : appliqué en direct si le
 * joueur est déjà connecté, sans attendre qu'il se reconnecte.
 */
export async function correctPlayerProgress(
  uid: string,
  updates: { palier?: number; wave?: number; maxPalierReached?: number }
): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid), {
      ...updates,
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    });
    return true;
  } catch (e) {
    logger.error('[AdminTools] correctPlayerProgress:', e);
    return false;
  }
}

// ── Gestion de la collection de personnages ────────────────────────────────
// removePlayerCharacter/setPlayerCharacterLevel ciblent directement la clé
// `collection.{instanceKey}` du doc via FieldPath, au lieu de lire tout le
// doc pour réécrire toute la map `collection` — pas de lecture du tout pour
// ces deux actions (le panel admin n'appelle ces fonctions que sur des
// personnages déjà listés depuis une recherche précédente, donc déjà
// vérifiés existants).

/** Retire un personnage (une édition précise) de la collection d'un joueur. */
export async function removePlayerCharacter(uid: string, instanceKey: string): Promise<boolean> {
  if (!db) return false;
  try {
    // adminCorrectionAt : même mécanisme que pour le solde — permet au client
    // du joueur (s'il est en ligne) d'appliquer le changement en direct au
    // lieu de le laisser écraser par son propre autosave (voir useCloudSave.ts).
    await updateDoc(doc(db, 'saves', uid),
      new FieldPath('collection', instanceKey), deleteField(),
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    return true;
  } catch (e) {
    logger.error('[AdminTools] removePlayerCharacter:', e);
    return false;
  }
}

/**
 * Ajoute (ou remplace si déjà possédé) un personnage à la collection d'un
 * joueur, avec le niveau/rang/forme donnés. Le templateId est vérifié contre
 * la vraie liste des personnages du jeu pour éviter de créer une entrée
 * invalide, et `currentForm` est borné aux formes que le personnage possède
 * réellement (0 pour les persos sans évolution).
 */
export async function addPlayerCharacter(
  uid: string, templateId: string, edition: CardEdition, level: number, rank: number, currentForm: number = 0
): Promise<{ ok: boolean; error?: string; char?: OwnedCharacterSummary }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const tpl = getCharacterById(templateId);
  if (!tpl) return { ok: false, error: `Personnage "${templateId}" introuvable — vérifie l'id exact` };
  try {
    // Lecture nécessaire ici (contrairement à remove/setLevel ci-dessous) :
    // pour un perso déjà possédé, il faut préserver copies/xp/equippedItems —
    // des champs invisibles côté résumé admin, donc pas déductibles de l'état
    // déjà affiché dans le panel.
    const snap = await getDoc(doc(db, 'saves', uid));
    if (!snap.exists()) return { ok: false, error: 'Sauvegarde introuvable pour ce joueur' };
    const instanceKey = makeInstanceKey(templateId, edition);
    const existing = (snap.data().collection ?? {})[instanceKey];
    const clampedLevel = Math.max(1, Math.min(999, Math.floor(level)));
    const clampedRank  = Math.max(1, Math.min(7, Math.floor(rank)));
    const maxFormIndex = tpl.forms && tpl.forms.length > 0 ? tpl.forms.length - 1 : 0;
    const clampedForm  = Math.max(0, Math.min(maxFormIndex, Math.floor(currentForm)));
    const entry = {
      templateId,
      edition,
      level: clampedLevel,
      rank: clampedRank,
      copies: existing?.copies ?? 1,
      currentForm: clampedForm,
      xp: existing?.xp ?? 0,
      ...(existing?.equippedItems ? { equippedItems: existing.equippedItems } : {}),
    };
    await updateDoc(doc(db, 'saves', uid),
      new FieldPath('collection', instanceKey), entry,
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    return {
      ok: true,
      char: {
        instanceKey, templateId, edition, name: tpl.name, rarity: tpl.rarity,
        level: clampedLevel, rank: clampedRank, currentForm: clampedForm,
        formsCount: tpl.forms?.length ?? 0, formName: getCharFormName(tpl, clampedForm),
      },
    };
  } catch (e) {
    logger.error('[AdminTools] addPlayerCharacter:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}

/** Change juste le niveau d'un personnage déjà possédé (sans toucher au reste). */
export async function setPlayerCharacterLevel(uid: string, instanceKey: string, newLevel: number): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid),
      new FieldPath('collection', instanceKey, 'level'), Math.max(1, Math.min(999, Math.floor(newLevel))),
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    return true;
  } catch (e) {
    logger.error('[AdminTools] setPlayerCharacterLevel:', e);
    return false;
  }
}

// ── Objets d'évolution et équipement ("drops") ──────────────────────────────
// increment() permet d'ajouter une quantité de façon atomique SANS lire le
// doc au préalable (contrairement à addPlayerCharacter, qui doit préserver
// des champs invisibles pour un perso déjà possédé) — la valeur ajoutée est
// simplement additionnée au stock déjà présent, quel qu'il soit.

/** Ajoute une quantité d'un objet d'évolution (ITEM_DEFS) à l'inventaire d'un joueur. */
export async function addPlayerItem(uid: string, itemId: string, qty: number): Promise<{ ok: boolean; error?: string; item?: OwnedItemSummary }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const def = getItemDef(itemId);
  if (!def) return { ok: false, error: `Objet "${itemId}" introuvable — vérifie l'id exact` };
  const addedQty = Math.max(1, Math.min(999999, Math.floor(qty)));
  try {
    await updateDoc(doc(db, 'saves', uid),
      new FieldPath('inventory', itemId), increment(addedQty),
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    return { ok: true, item: { id: itemId, name: def.name, icon: def.icon, color: def.color, qty: addedQty } };
  } catch (e) {
    logger.error('[AdminTools] addPlayerItem:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}

/** Ajoute une quantité d'un équipement ("drop", EQUIPMENT_DEFS) au stock non-équipé d'un joueur. */
export async function addPlayerEquipment(uid: string, equipmentId: string, qty: number): Promise<{ ok: boolean; error?: string; equipment?: OwnedEquipmentSummary }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const def = getEquipmentDef(equipmentId);
  if (!def) return { ok: false, error: `Équipement "${equipmentId}" introuvable — vérifie l'id exact` };
  const addedQty = Math.max(1, Math.min(999999, Math.floor(qty)));
  try {
    await updateDoc(doc(db, 'saves', uid),
      new FieldPath('equipmentInventory', equipmentId), increment(addedQty),
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    return { ok: true, equipment: { id: equipmentId, name: def.name, icon: def.icon, color: def.color, rarity: def.rarity as Rarity, qty: addedQty } };
  } catch (e) {
    logger.error('[AdminTools] addPlayerEquipment:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}