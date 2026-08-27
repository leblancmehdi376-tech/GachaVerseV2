// Expéditions et craft/forge. Fusionné dans gameStore depuis l'ancien
// store/expeditionStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { EXPEDITION_DEFS, CRAFT_RECIPES, getExpeditionTeamDps, hasRealUniverse, rollExpeditionRewards } from '@/lib/game/expeditions';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG, getPrevRarity } from '@/types/game';
import { parseInstanceKey } from '@/lib/game/editions';
import { Affinity, AFFINITY_ORDER, AFFINITY_CONFIG, getAffinityForId } from '@/lib/game/affinities';
import { toast } from '@/hooks/useToast';
import { formatNumber } from '@/lib/game/format';
import { correctedNow } from '@/lib/firebase/clockOffset';
import { requestUrgentSave } from '../gameStoreHelpers';
import type { GameStore, ExpeditionActions, ActiveExpedition } from '../gameStore.types';
import { bnAdd, bnFromNumber, bnLt } from '@/lib/game/bignum';

function rollAffinity(): Affinity {
  return AFFINITY_ORDER[Math.floor(Math.random() * AFFINITY_ORDER.length)];
}

// Nombre maximum d'expéditions simultanées de base (une seule à la fois) —
// augmentable en BossCrowns via upgradeExpeditionSlot() (voir ShopPage.tsx).
export const BASE_MAX_ACTIVE_EXPEDITIONS = 1;
export const EXPEDITION_SLOT_COSTS = [25, 60, 120]; // coût en 👑 de chaque emplacement supplémentaire

let _seq = 0;

// Tire un type initial pour chaque expédition sans univers de perso réel —
// calculé une fois au chargement du module (liste d'expéditions statique).
export function initialDefAffinities(): Record<string, Affinity> {
  const out: Record<string, Affinity> = {};
  for (const def of EXPEDITION_DEFS) {
    if (!hasRealUniverse(def)) out[def.id] = rollAffinity();
  }
  return out;
}

export const createExpeditionSlice: StateCreator<GameStore, [], [], ExpeditionActions> = (set, get) => ({
  getExpeditionAffinity: (defId) => get().expeditionDefAffinities[defId] ?? rollAffinity(),

  getMaxActiveExpeditions: () => BASE_MAX_ACTIVE_EXPEDITIONS + (get().expeditionSlotLevel ?? 0),

  getExpeditionSlotCost: () => {
    const lvl = get().expeditionSlotLevel ?? 0;
    return lvl >= EXPEDITION_SLOT_COSTS.length ? null : EXPEDITION_SLOT_COSTS[lvl];
  },

  upgradeExpeditionSlot: () => {
    const cost = get().getExpeditionSlotCost();
    if (cost === null) return;
    if (get().bossCrowns < cost) return;
    set(s => ({ bossCrowns: s.bossCrowns - cost, expeditionSlotLevel: (s.expeditionSlotLevel ?? 0) + 1 }));
  },

  getDropCount: (dropId) => get().expeditionDropInventory[dropId] ?? 0,

  consumeDrop: (dropId, quantity) => {
    const have = get().expeditionDropInventory[dropId] ?? 0;
    if (have < quantity) return false;
    set(s => ({ expeditionDropInventory: { ...s.expeditionDropInventory, [dropId]: have - quantity } }));
    return true;
  },

  getActiveForChar: (charId) =>
    get().expeditionActive.find(e => !e.claimed && e.characterIds.includes(charId)),

  isCharOnExpedition: (charId) => !!get().getActiveForChar(charId),

  getFinished: () =>
    get().expeditionActive.filter(e => !e.claimed && correctedNow() >= e.endTime),

  canStart: (defId, characterIds) => {
    const def = EXPEDITION_DEFS.find(d => d.id === defId);
    if (!def) return { ok:false, reason:'Expédition introuvable' };

    // Limite d'expéditions simultanées (base + emplacements achetés en BossCrowns).
    // Filtre défensif sur !claimed : d'anciennes sauvegardes peuvent contenir des
    // entrées "claimed" jamais nettoyées (bug corrigé dans claimExpedition).
    if (get().expeditionActive.filter(e => !e.claimed).length >= get().getMaxActiveExpeditions())
      return { ok:false, reason:'Toutes tes expéditions sont déjà occupées' };

    const gs = get();
    if (gs.getRunPeakPalier() < def.palierRequired)
      return { ok:false, reason:`Palier ${def.palierRequired} requis` };

    // Déblocages d'équipement (fusion / drop) : impossible de sauter une
    // rareté, il faut avoir terminé l'expédition de la rareté précédente.
    // Impossible aussi de refaire une expédition dont la rareté est déjà
    // débloquée (c'est un déblocage one-shot, pas une expédition de farm).
    if (def.unlocksEquipRarity) {
      if (gs.unlockedEquipRarities.includes(def.unlocksEquipRarity)) {
        return { ok:false, reason:`Fusion ${RARITY_CONFIG[def.unlocksEquipRarity].label} déjà débloquée` };
      }
      const prev = getPrevRarity(def.unlocksEquipRarity);
      if (prev && !gs.unlockedEquipRarities.includes(prev)) {
        return { ok:false, reason:`Termine d'abord l'atelier de rareté ${RARITY_CONFIG[prev].label}` };
      }
    }
    if (def.unlocksEquipDropRarity) {
      if (gs.unlockedEquipDropRarities.includes(def.unlocksEquipDropRarity)) {
        return { ok:false, reason:`Drop ${RARITY_CONFIG[def.unlocksEquipDropRarity].label} déjà débloqué` };
      }
      const prev = getPrevRarity(def.unlocksEquipDropRarity);
      if (prev && !gs.unlockedEquipDropRarities.includes(prev)) {
        return { ok:false, reason:`Termine d'abord la chasse de rareté ${RARITY_CONFIG[prev].label}` };
      }
    }

    if (characterIds.length < 1)
      return { ok:false, reason:'Sélectionne au moins 1 personnage' };
    if (characterIds.length > def.slots)
      return { ok:false, reason:`Max ${def.slots} personnages` };

    // Vérifier que les persos ne sont pas déjà en expédition, ni dans
    // l'équipe active (exclusivité dans les deux sens — voir aussi
    // equipCharacter dans gameStore.ts qui bloque le sens inverse).
    const equippedPure = gs.equippedTeam
      .filter((t): t is string => !!t)
      .map(t => parseInstanceKey(t).templateId);
    for (const cid of characterIds) {
      if (get().isCharOnExpedition(cid))
        return { ok:false, reason:`${cid} est déjà en expédition` };
      if (equippedPure.includes(cid))
        return { ok:false, reason:`${cid} est dans l'équipe active` };
    }

    // Exigence d'univers (ou de type si l'expédition n'a pas d'univers de
    // perso réel) : TOUTE l'équipe envoyée doit correspondre.
    if (hasRealUniverse(def)) {
      for (const cid of characterIds) {
        const tpl = CHARACTER_POOL.find(c => c.id === cid);
        if (!tpl || tpl.universe !== def.universe)
          return { ok:false, reason:`Toute l'équipe doit être de l'univers ${def.universe}` };
      }
    } else {
      const required = get().getExpeditionAffinity(def.id);
      for (const cid of characterIds) {
        if (getAffinityForId(cid) !== required)
          return { ok:false, reason:`Toute l'équipe doit être de type ${AFFINITY_CONFIG[required].label}` };
      }
    }

    // Vérifier le DPS minimum de l'équipe d'expédition
    const teamDps = getExpeditionTeamDps(gs.collection, characterIds);
    if (bnLt(teamDps, bnFromNumber(def.minTeamDps)))
      return { ok:false, reason:`DPS d'équipe insuffisant (${formatNumber(teamDps)}/${formatNumber(def.minTeamDps)})` };

    return { ok: true };
  },

  startExpedition: (defId, characterIds) => {
    const { ok, reason } = get().canStart(defId, characterIds);
    if (!ok) { toast.error('Expédition impossible', reason); return; }

    const def = EXPEDITION_DEFS.find(d => d.id === defId)!;
    const now = correctedNow();
    const inst: ActiveExpedition = {
      id: `exp_${now}_${_seq++}`,
      defId,
      characterIds,
      startTime: now,
      endTime:   now + def.duration * 1000,
      claimed:   false,
    };
    set(s => ({ expeditionActive: [...s.expeditionActive, inst] }));
    toast.info(`${def.icon} Expédition lancée`, `${def.name} — ${Math.round(def.duration / 3600)}h`);

    // Événement majeur : sauvegarde immédiate, sinon une expédition tout
    // juste lancée n'atteint le cloud qu'au prochain cycle périodique
    // (jusqu'à 10min plus tard) — invisible depuis un autre appareil
    // pendant tout ce temps, alors que claimExpedition, lui, le fait déjà.
    requestUrgentSave('expedition_start');
  },

  claimExpedition: (instanceId) => {
    const exp = get().expeditionActive.find(e => e.id === instanceId);
    if (!exp || exp.claimed || correctedNow() < exp.endTime) return;

    const def = EXPEDITION_DEFS.find(d => d.id === exp.defId);
    if (!def) return;

    const gs = get();

    // Récompenses (formules centralisées dans lib/game/expeditions.ts —
    // c'est là qu'il faut les modifier, pas ici).
    const teamDps = getExpeditionTeamDps(gs.collection, exp.characterIds);
    const { coins, gems, dropGained } = rollExpeditionRewards(def, teamDps);

    // Appliquer les récompenses monétaires
    set(s => ({
      pixelCoins: bnAdd(s.pixelCoins, bnFromNumber(coins)),
      nekoGems:   s.nekoGems   + gems,
    }));
    // Quêtes "terminer N expédition(s)"
    get().bumpQuestProgress('w_expedition_1', 1);
    get().bumpQuestProgress('e_expedition_5', 1);

    // Appliquer le drop spécial
    if (dropGained > 0 && def.rewards.dropId) {
      const dropId = def.rewards.dropId;
      set(s => ({
        expeditionDropInventory: {
          ...s.expeditionDropInventory,
          [dropId]: (s.expeditionDropInventory[dropId] ?? 0) + dropGained,
        },
      }));
    }

    // Retire l'expédition du tableau (comme cancelExpedition) au lieu de
    // juste la marquer "claimed" : sinon elle reste bloquée à vie dans
    // `expeditionActive`, gonfle le compteur, et empêche à terme tout nouveau
    // lancement dès que la limite d'expéditions actives est atteinte pour de faux.
    set(s => ({
      expeditionActive: s.expeditionActive.filter(e => e.id !== instanceId),
    }));

    // Nouveau type requis pour la prochaine tentative (expéditions sans
    // univers de perso réel — voir hasRealUniverse).
    if (!hasRealUniverse(def)) {
      set(s => ({ expeditionDefAffinities: { ...s.expeditionDefAffinities, [def.id]: rollAffinity() } }));
    }

    // Déblocage de la fusion et/ou du drop d'équipement pour cette rareté
    // (voir EQUIP_UNLOCK_EXPEDITIONS / EQUIP_DROP_UNLOCK_EXPEDITIONS dans
    // lib/game/expeditions.ts).
    if (def.unlocksEquipRarity) {
      get().unlockEquipRarity(def.unlocksEquipRarity);
    }
    if (def.unlocksEquipDropRarity) {
      get().unlockEquipDropRarity(def.unlocksEquipDropRarity);
    }

    // Toast de résultat
    const parts = [`🪙 +${formatNumber(coins)}`];
    if (gems > 0)       parts.push(`💎 +${gems}`);
    if (dropGained > 0) parts.push(`${dropGained > 0 ? '✦ ' : ''}+${dropGained} drop`);
    if (def.unlocksEquipRarity)     parts.push(`🔓 Fusion ${RARITY_CONFIG[def.unlocksEquipRarity].label} débloquée`);
    if (def.unlocksEquipDropRarity) parts.push(`🔓 Drop ${RARITY_CONFIG[def.unlocksEquipDropRarity].label} débloqué`);
    toast.loot(`${def.icon} ${def.name} terminée !`, parts.join('  '));

    // Événement majeur : sauvegarde immédiate (pas d'attente du prochain
    // cycle périodique) pour ne jamais perdre une récompense d'expédition.
    requestUrgentSave('expedition_claim');
  },

  cancelExpedition: (instanceId) => {
    set(s => ({
      expeditionActive: s.expeditionActive.filter(e => e.id !== instanceId),
    }));
  },

  canCraft: (recipeId) => {
    const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return { ok:false, missing:['Recette introuvable'] };

    const gs = get();
    const missing: string[] = [];

    for (const ing of recipe.ingredients) {
      if (ing.type === 'drop') {
        const have = get().expeditionDropInventory[ing.id] ?? 0;
        if (have < ing.quantity)
          missing.push(`${ing.label} (${have}/${ing.quantity})`);
      } else {
        // champion_dupe : le champion doit être maxé (7★) ET avoir des
        // doublons en attente dans championInventory (obtenu une fois de plus après le max)
        const owned = gs.collection[ing.id];
        const spares = gs.championInventory[ing.id] ?? 0;
        if (!owned || owned.rank < 7)
          missing.push(`${ing.label} (champion non maxé 7★)`);
        else if (spares < ing.quantity)
          missing.push(`${ing.label} (doublons insuffisants : ${spares}/${ing.quantity})`);
      }
    }

    // Perso déjà possédé ?
    if (recipe.reward.type === 'character' && recipe.reward.characterId) {
      const alreadyOwned = !!gs.collection[recipe.reward.characterId];
      if (alreadyOwned) missing.push('Personnage déjà obtenu');
    }

    return { ok: missing.length === 0, missing };
  },

  craftRecipe: (recipeId) => {
    const { ok, missing } = get().canCraft(recipeId);
    if (!ok) {
      toast.error('Impossible de forger', missing[0]);
      return false;
    }

    const recipe = CRAFT_RECIPES.find(r => r.id === recipeId)!;

    // Consommer les ingrédients
    const newDropInv = { ...get().expeditionDropInventory };
    for (const ing of recipe.ingredients) {
      if (ing.type === 'drop') {
        newDropInv[ing.id] = (newDropInv[ing.id] ?? 0) - ing.quantity;
      } else {
        // Consommer les doublons champion (maxés 7★, en attente dans championInventory)
        for (let i = 0; i < ing.quantity; i++) {
          get().removeChampion(ing.id);
        }
      }
    }
    set(s => ({
      expeditionDropInventory: newDropInv,
      expeditionCraftedRecipes: [...s.expeditionCraftedRecipes, recipeId],
    }));

    // Appliquer la récompense
    if (recipe.reward.type === 'character' && recipe.reward.characterId) {
      get().addToCollection(recipe.reward.characterId);
      get().bumpQuestProgress('e_forge_1', 1);
      toast.palier(`⚗ FORGE RÉUSSIE`, `${recipe.reward.icon} ${recipe.reward.label} obtenu !`);
    } else if (recipe.reward.type === 'gems' && recipe.reward.amount) {
      set(s => ({ nekoGems: s.nekoGems + (recipe.reward.amount ?? 0) }));
      toast.loot('Forge réussie !', `${recipe.reward.icon} ${recipe.reward.label}`);
    }

    return true;
  },
});
