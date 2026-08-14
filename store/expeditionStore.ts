'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EXPEDITION_DEFS, CRAFT_RECIPES, RARITY_SCORE, ExpeditionDef } from '@/lib/game/expeditions';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { RARITY_CONFIG } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/hooks/useToast';

// Nombre maximum d'expéditions simultanées (une seule à la fois).
export const MAX_ACTIVE_EXPEDITIONS = 1;

export interface ActiveExpedition {
  id:           string;  // unique instance id
  defId:        string;
  characterIds: string[];
  startTime:    number;
  endTime:      number;
  claimed:      boolean;
}

interface ExpeditionStore {
  // Expéditions actives
  active:        ActiveExpedition[];
  // Inventaire des drops spéciaux
  dropInventory: Record<string, number>;
  // Recettes déjà craftées (pour éviter les doublons de perso)
  craftedRecipes: string[];

  // ── Actions expéditions ────────────────────────────────────────────────
  canStart:      (defId: string, characterIds: string[]) => { ok: boolean; reason?: string };
  startExpedition:  (defId: string, characterIds: string[]) => void;
  claimExpedition:  (instanceId: string) => void;
  cancelExpedition: (instanceId: string) => void;

  // ── Actions drops/craft ────────────────────────────────────────────────
  getDropCount:  (dropId: string) => number;
  canCraft:      (recipeId: string) => { ok: boolean; missing: string[] };
  craftRecipe:   (recipeId: string) => boolean;

  // ── Utilitaires ────────────────────────────────────────────────────────
  getActiveForChar: (charId: string) => ActiveExpedition | undefined;
  isCharOnExpedition: (charId: string) => boolean;
  getFinished:   () => ActiveExpedition[];
  resetExpeditions: () => void;
}

let _seq = 0;

export const useExpeditionStore = create<ExpeditionStore>()(
  persist(
    (set, get) => ({
      active:        [],
      dropInventory: {},
      craftedRecipes: [],

      // Remet les expéditions à zéro (utilisé par "Réinitialiser mon compte").
      resetExpeditions: () => set({ active: [], dropInventory: {}, craftedRecipes: [] }),

      getDropCount: (dropId) => get().dropInventory[dropId] ?? 0,

      getActiveForChar: (charId) =>
        get().active.find(e => !e.claimed && e.characterIds.includes(charId)),

      isCharOnExpedition: (charId) => !!get().getActiveForChar(charId),

      getFinished: () =>
        get().active.filter(e => !e.claimed && Date.now() >= e.endTime),

      canStart: (defId, characterIds) => {
        const def = EXPEDITION_DEFS.find(d => d.id === defId);
        if (!def) return { ok:false, reason:'Expédition introuvable' };

        // Une seule expédition à la fois : il faut d'abord récupérer/terminer l'actuelle.
        // Filtre défensif sur !claimed : d'anciennes sauvegardes peuvent contenir des
        // entrées "claimed" jamais nettoyées (bug corrigé dans claimExpedition).
        if (get().active.filter(e => !e.claimed).length >= MAX_ACTIVE_EXPEDITIONS)
          return { ok:false, reason:'Une seule expédition à la fois' };

        const gs = useGameStore.getState();
        if (gs.maxPalierReached < def.palierRequired)
          return { ok:false, reason:`Palier ${def.palierRequired} requis` };

        if (characterIds.length < 1)
          return { ok:false, reason:'Sélectionne au moins 1 personnage' };
        if (characterIds.length > def.slots)
          return { ok:false, reason:`Max ${def.slots} personnages` };

        // Vérifier que les persos ne sont pas déjà en expédition
        for (const cid of characterIds) {
          if (get().isCharOnExpedition(cid))
            return { ok:false, reason:`${cid} est déjà en expédition` };
        }

        // Vérifier le score minimum de rareté
        const score = characterIds.reduce((sum, cid) => {
          const tpl = CHARACTER_POOL.find(c => c.id === cid);
          if (!tpl) return sum;
          return sum + (RARITY_SCORE[tpl.rarity] ?? 1);
        }, 0);
        if (score < def.minRarityScore)
          return { ok:false, reason:`Score d'équipe insuffisant (${score}/${def.minRarityScore})` };

        return { ok: true };
      },

      startExpedition: (defId, characterIds) => {
        const { ok, reason } = get().canStart(defId, characterIds);
        if (!ok) { toast.error('Expédition impossible', reason); return; }

        const def = EXPEDITION_DEFS.find(d => d.id === defId)!;
        const now = Date.now();
        const inst: ActiveExpedition = {
          id: `exp_${now}_${_seq++}`,
          defId,
          characterIds,
          startTime: now,
          endTime:   now + def.duration * 1000,
          claimed:   false,
        };
        set(s => ({ active: [...s.active, inst] }));
        toast.info(`${def.icon} Expédition lancée`, `${def.name} — ${Math.round(def.duration / 3600)}h`);
      },

      claimExpedition: (instanceId) => {
        const exp = get().active.find(e => e.id === instanceId);
        if (!exp || exp.claimed || Date.now() < exp.endTime) return;

        const def = EXPEDITION_DEFS.find(d => d.id === exp.defId);
        if (!def) return;

        const gs = useGameStore.getState();

        // Calculer les récompenses
        const coins = Math.floor(
          def.rewards.coinsMin +
          Math.random() * (def.rewards.coinsMax - def.rewards.coinsMin)
        );
        const gems = def.rewards.gemsMin !== undefined
          ? Math.floor(def.rewards.gemsMin + Math.random() * ((def.rewards.gemsMax ?? def.rewards.gemsMin) - def.rewards.gemsMin))
          : 0;

        // Drop spécial — bonus si l'équipe dépasse largement le score requis
        // (jusqu'à x3), pour récompenser le fait de suréquiper l'expédition.
        let dropGained = 0;
        if (def.rewards.dropId && Math.random() < (def.rewards.dropChance ?? 0)) {
          const teamScore = exp.characterIds.reduce((sum, cid) => {
            const tpl = CHARACTER_POOL.find(c => c.id === cid);
            return tpl ? sum + (RARITY_SCORE[tpl.rarity] ?? 1) : sum;
          }, 0);
          const overkillMult = def.minRarityScore > 0
            ? Math.max(1, Math.min(3, Math.floor(teamScore / def.minRarityScore)))
            : 1;
          dropGained = (def.rewards.dropQuantity ?? 1) * overkillMult;
        }

        // Appliquer les récompenses monétaires
        useGameStore.setState(s => ({
          pixelCoins: s.pixelCoins + coins,
          nekoGems:   s.nekoGems   + gems,
        }));
        // Quêtes "terminer N expédition(s)"
        useGameStore.getState().bumpQuestProgress('w_expedition_1', 1);
        useGameStore.getState().bumpQuestProgress('e_expedition_5', 1);

        // Appliquer le drop spécial
        if (dropGained > 0 && def.rewards.dropId) {
          const dropId = def.rewards.dropId;
          set(s => ({
            dropInventory: {
              ...s.dropInventory,
              [dropId]: (s.dropInventory[dropId] ?? 0) + dropGained,
            },
          }));
        }

        // Retire l'expédition du tableau (comme cancelExpedition) au lieu de
        // juste la marquer "claimed" : sinon elle reste bloquée à vie dans
        // `active`, gonfle le compteur, et empêche à terme tout nouveau
        // lancement dès que MAX_ACTIVE_EXPEDITIONS est atteint pour de faux.
        set(s => ({
          active: s.active.filter(e => e.id !== instanceId),
        }));

        // Toast de résultat
        const parts = [`🪙 +${(coins / 1_000_000).toFixed(1)}M`];
        if (gems > 0)       parts.push(`💎 +${gems}`);
        if (dropGained > 0) parts.push(`${dropGained > 0 ? '✦ ' : ''}+${dropGained} drop`);
        toast.loot(`${def.icon} ${def.name} terminée !`, parts.join('  '));
      },

      cancelExpedition: (instanceId) => {
        set(s => ({
          active: s.active.filter(e => e.id !== instanceId),
        }));
      },

      canCraft: (recipeId) => {
        const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return { ok:false, missing:['Recette introuvable'] };

        const gs = useGameStore.getState();
        const missing: string[] = [];

        for (const ing of recipe.ingredients) {
          if (ing.type === 'drop') {
            const have = get().dropInventory[ing.id] ?? 0;
            if (have < ing.quantity)
              missing.push(`${ing.label} (${have}/${ing.quantity})`);
          } else {
            // champion_dupe : besoin de N+1 exemplaires (garder au moins 1)
            const owned = gs.collection[ing.id];
            if (!owned || (owned.copies ?? 0) < ing.quantity)
              missing.push(`${ing.label} (doublons insuffisants)`);
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
        const gs = useGameStore.getState();

        // Consommer les ingrédients
        const newDropInv = { ...get().dropInventory };
        for (const ing of recipe.ingredients) {
          if (ing.type === 'drop') {
            newDropInv[ing.id] = (newDropInv[ing.id] ?? 0) - ing.quantity;
          } else {
            // Consommer un doublon champion
            const owned = gs.collection[ing.id];
            if (owned) {
              useGameStore.setState(s => ({
                collection: {
                  ...s.collection,
                  [ing.id]: { ...owned, dupes: Math.max(0, (owned.copies ?? 0) - ing.quantity) },
                },
              }));
            }
          }
        }
        set(s => ({
          dropInventory: newDropInv,
          craftedRecipes: [...s.craftedRecipes, recipeId],
        }));

        // Appliquer la récompense
        if (recipe.reward.type === 'character' && recipe.reward.characterId) {
          useGameStore.getState().addToCollection(recipe.reward.characterId);
          useGameStore.getState().bumpQuestProgress('e_forge_1', 1);
          toast.palier(`⚗ FORGE RÉUSSIE`, `${recipe.reward.icon} ${recipe.reward.label} obtenu !`);
        } else if (recipe.reward.type === 'gems' && recipe.reward.amount) {
          useGameStore.setState(s => ({ nekoGems: s.nekoGems + (recipe.reward.amount ?? 0) }));
          toast.loot('Forge réussie !', `${recipe.reward.icon} ${recipe.reward.label}`);
        }

        return true;
      },
    }),
    {
      name: 'gachaverse_expeditions',
      partialize: (s) => ({
        active:         s.active,
        dropInventory:  s.dropInventory,
        craftedRecipes: s.craftedRecipes,
      }),
    }
  )
);
