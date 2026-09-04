import { doc, getDoc, updateDoc, deleteField, FieldPath } from 'firebase/firestore';
import { db } from './config';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { makeInstanceKey, CardEdition } from '@/lib/game/editions';
import { getItemDef, getEquipmentDef } from '@/lib/game/items';
import { generateEnemy } from '@/lib/game/enemies';
import { getPalierConfig } from '@/lib/game/paliers';
import { EVENT_QUESTS } from '@/store/gameStoreHelpers';
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
  runPeakPalier: number | null;
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
      runPeakPalier:    d.runPeakPalier ?? null,
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
 * Corrige la progression d'un joueur (palier, vague, palier max atteint,
 * pic de palier de la run en cours) — utile pour annuler une avancée obtenue
 * via un bug/exploit. Même mécanisme `adminCorrectionAt` que
 * correctPlayerBalance : appliqué en direct si le joueur est déjà connecté,
 * sans attendre qu'il se reconnecte.
 *
 * `runPeakPalier` DOIT être corrigé en même temps que `palier`/
 * `maxPalierReached` : c'est lui (et non maxPalierReached, le lifetime) qui
 * gate l'éligibilité au Prestige (voir runPeakPalierOf côté client) — sans
 * ça, l'onglet Prestige reste bloqué sur l'ancien pic malgré la correction.
 *
 * `currentEnemy` (+ état de combat associé) est régénéré pour le nouveau
 * palier/vague, comme le fait travelToPalier/challengeBoss côté jeu — sinon
 * le joueur reste avec le mob de l'ANCIEN palier jusqu'à son prochain combat.
 */
export async function correctPlayerProgress(
  uid: string,
  updates: { palier?: number; wave?: number; maxPalierReached?: number; runPeakPalier?: number }
): Promise<boolean> {
  if (!db) return false;
  try {
    const patch: Record<string, unknown> = {
      ...updates,
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    };
    if (updates.palier !== undefined && updates.wave !== undefined) {
      const runPeak = updates.runPeakPalier ?? updates.maxPalierReached ?? updates.palier;
      const isBossWave = updates.wave === 10;
      patch.currentEnemy    = generateEnemy(updates.wave, updates.palier, runPeak);
      patch.bossActive      = isBossWave;
      patch.bossTimeLeft    = isBossWave ? getPalierConfig(updates.palier).bossTimerSeconds : 0;
      patch.bossAvoided     = false;
      patch.ultUsedThisFight = [];
    }
    await updateDoc(doc(db, 'saves', uid), patch);
    return true;
  } catch (e) {
    logger.error('[AdminTools] correctPlayerProgress:', e);
    return false;
  }
}

/**
 * Réinitialise les quêtes d'événement d'un joueur à zéro (progression et
 * statut "terminée" remis à l'état initial) — utile pour un joueur bloqué
 * après un bug, ou pour relancer l'événement en cours. Même mécanisme
 * `adminCorrectionAt` que les autres corrections : appliqué en direct si le
 * joueur est déjà connecté, sans attendre qu'il se reconnecte.
 */
export async function resetPlayerEventQuests(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    await updateDoc(doc(db, 'saves', uid), {
      eventQuests: EVENT_QUESTS.map(q => ({ ...q, current: 0, done: false })),
      lastSaved: Date.now(),
      adminCorrectionAt: Date.now(),
    });
    return true;
  } catch (e) {
    logger.error('[AdminTools] resetPlayerEventQuests:', e);
    return false;
  }
}

// ── Filet de sécurité contre une collision avec l'autosave du joueur ───────
// Depuis que saveGameToFirestore (côté joueur) écrit `collection`/
// `inventory`/`equipmentInventory` via mergeFields (remplacement ENTIER de
// ces champs, voir saveGame.ts), une correction ciblée par FieldPath peut se
// faire écraser si l'autosave du joueur part d'un état local qui ne connaît
// pas encore cette correction (le listener temps réel de useCloudSave.ts
// l'aurait normalement rattrapée avant, mais rien ne garantit l'ordre en cas
// de collision serrée — ex: joueur qui enchaîne des urgent saves pendant
// qu'un admin corrige sa sauvegarde). On revérifie donc une fois, après un
// court délai, et on réapplique si la valeur a divergé. Fire-and-forget côté
// appelant (le panel admin ne doit pas attendre ce délai pour afficher un
// résultat) — les erreurs sont juste loguées.
const CORRECTION_VERIFY_DELAY_MS = 2500;

function getAtPath(obj: unknown, path: string[]): unknown {
  let cur = obj;
  for (const seg of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function verifyAndReapply(uid: string, path: string[], expected: unknown, reapply: () => Promise<unknown>): void {
  const database = db;
  if (!database) return;
  setTimeout(async () => {
    try {
      const snap = await getDoc(doc(database, 'saves', uid));
      if (!snap.exists()) return;
      const actual = getAtPath(snap.data(), path);
      if (JSON.stringify(actual) === JSON.stringify(expected)) return;
      logger.warn(`[AdminTools] Correction sur "${path.join('.')}" écrasée par une écriture concurrente, réapplication:`, uid);
      await reapply();
    } catch (e) {
      logger.error('[AdminTools] verifyAndReapply:', e);
    }
  }, CORRECTION_VERIFY_DELAY_MS);
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
  const database = db;
  try {
    // adminCorrectionAt : même mécanisme que pour le solde — permet au client
    // du joueur (s'il est en ligne) d'appliquer le changement en direct au
    // lieu de le laisser écraser par son propre autosave (voir useCloudSave.ts).
    const write = () => updateDoc(doc(database, 'saves', uid),
      new FieldPath('collection', instanceKey), deleteField(),
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    await write();
    verifyAndReapply(uid, ['collection', instanceKey], undefined, write);
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
  const database = db;
  const tpl = getCharacterById(templateId);
  if (!tpl) return { ok: false, error: `Personnage "${templateId}" introuvable — vérifie l'id exact` };
  try {
    // Lecture nécessaire ici (contrairement à remove/setLevel ci-dessous) :
    // pour un perso déjà possédé, il faut préserver copies/xp/equippedItems —
    // des champs invisibles côté résumé admin, donc pas déductibles de l'état
    // déjà affiché dans le panel.
    const snap = await getDoc(doc(database, 'saves', uid));
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
    const write = () => updateDoc(doc(database, 'saves', uid),
      new FieldPath('collection', instanceKey), entry,
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    await write();
    verifyAndReapply(uid, ['collection', instanceKey], entry, write);
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
  const database = db;
  try {
    const clampedLevel = Math.max(1, Math.min(999, Math.floor(newLevel)));
    const write = () => updateDoc(doc(database, 'saves', uid),
      new FieldPath('collection', instanceKey, 'level'), clampedLevel,
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    await write();
    verifyAndReapply(uid, ['collection', instanceKey, 'level'], clampedLevel, write);
    return true;
  } catch (e) {
    logger.error('[AdminTools] setPlayerCharacterLevel:', e);
    return false;
  }
}

// ── Objets d'évolution et équipement ("drops") ──────────────────────────────
// Valeur absolue (lecture + calcul + écriture), pas increment() : increment()
// est atomique côté serveur mais ça ne protège pas contre le vrai risque ici
// — l'autosave du joueur qui remplace tout `inventory`/`equipmentInventory`
// (mergeFields, voir saveGame.ts) SANS connaître notre ajout. La correction
// serait alors silencieusement perdue quel que soit le mécanisme d'écriture.
// Passer en valeur absolue permet à verifyAndReapply de vérifier et
// réappliquer la correction si ça arrive — au prix d'un léger risque de
// "lost update" si DEUX corrections admin visent le même objet au même
// instant (acceptable : action manuelle rare, un seul opérateur à la fois).

/** Ajoute une quantité d'un objet d'évolution (ITEM_DEFS) à l'inventaire d'un joueur. */
export async function addPlayerItem(uid: string, itemId: string, qty: number): Promise<{ ok: boolean; error?: string; item?: OwnedItemSummary }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const database = db;
  const def = getItemDef(itemId);
  if (!def) return { ok: false, error: `Objet "${itemId}" introuvable — vérifie l'id exact` };
  const addedQty = Math.max(1, Math.min(999999, Math.floor(qty)));
  try {
    const snap = await getDoc(doc(database, 'saves', uid));
    if (!snap.exists()) return { ok: false, error: 'Sauvegarde introuvable pour ce joueur' };
    const current = (snap.data().inventory ?? {})[itemId] ?? 0;
    const newQty = current + addedQty;
    const write = () => updateDoc(doc(database, 'saves', uid),
      new FieldPath('inventory', itemId), newQty,
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    await write();
    verifyAndReapply(uid, ['inventory', itemId], newQty, write);
    return { ok: true, item: { id: itemId, name: def.name, icon: def.icon, color: def.color, qty: addedQty } };
  } catch (e) {
    logger.error('[AdminTools] addPlayerItem:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}

/** Ajoute une quantité d'un équipement ("drop", EQUIPMENT_DEFS) au stock non-équipé d'un joueur. */
export async function addPlayerEquipment(uid: string, equipmentId: string, qty: number): Promise<{ ok: boolean; error?: string; equipment?: OwnedEquipmentSummary }> {
  if (!db) return { ok: false, error: 'Firebase non configuré' };
  const database = db;
  const def = getEquipmentDef(equipmentId);
  if (!def) return { ok: false, error: `Équipement "${equipmentId}" introuvable — vérifie l'id exact` };
  const addedQty = Math.max(1, Math.min(999999, Math.floor(qty)));
  try {
    const snap = await getDoc(doc(database, 'saves', uid));
    if (!snap.exists()) return { ok: false, error: 'Sauvegarde introuvable pour ce joueur' };
    const current = (snap.data().equipmentInventory ?? {})[equipmentId] ?? 0;
    const newQty = current + addedQty;
    const write = () => updateDoc(doc(database, 'saves', uid),
      new FieldPath('equipmentInventory', equipmentId), newQty,
      'lastSaved', Date.now(),
      'adminCorrectionAt', Date.now(),
    );
    await write();
    verifyAndReapply(uid, ['equipmentInventory', equipmentId], newQty, write);
    return { ok: true, equipment: { id: equipmentId, name: def.name, icon: def.icon, color: def.color, rarity: def.rarity as Rarity, qty: addedQty } };
  } catch (e) {
    logger.error('[AdminTools] addPlayerEquipment:', e);
    return { ok: false, error: 'Erreur lors de l\'écriture' };
  }
}