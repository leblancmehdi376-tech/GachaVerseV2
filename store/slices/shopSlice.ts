// Boutiques : BossCrown (boosts/gemmes), Orbe du Néant (persos/gemmes/coffres),
// recyclage de champions, pack de démarrage Early Access.
// Extrait de gameStore.ts (voir Phase 2 du refacto).
import type { StateCreator } from 'zustand';
import { getCharacterById, BANNER_POOL } from '@/lib/game/characters';
import { rollEquipmentChest } from '@/lib/game/items';
import {
  CROWN_GEM_PACKS, ORB_GEM_PACKS, GEM_GOLD_PACKS, getGoldPackCoins, BOOST_COST_CROWNS, BOOST_DURATION_MS,
  getVoidOrbsForRarity, SHOP_CHAR_PRICE_ORBS, getTodayDayKey, generateDailyShopCharacters, getRerollShopCost,
  LAUNCH_TIMESTAMP, STARTER_PACK_WINDOW_MS, STARTER_PACK_REWARDS, EQUIPMENT_CHESTS,
} from '@/lib/game/shop';
import { bumpCoinQuests, getGoldChestMultiplier, requestUrgentSave, resolveEnemyDeath, runPeakPalierOf } from '../gameStoreHelpers';
import type { GameStore, ShopActions } from '../gameStore.types';
import { BN_ZERO, bnAdd, bnIsZero, bnSub, bnToNumber, type BigNum } from '@/lib/game/bignum';

export const createShopSlice: StateCreator<GameStore, [], [], ShopActions> = (set, get) => ({
  // ─── Boutique : BossCrown (boosts + gemmes) ─────────────────────────
  isDpsBoostActive:  () => Date.now() < get().dpsBoostEndsAt,
  isGoldBoostActive: () => Date.now() < get().goldBoostEndsAt,

  buyDpsBoost: () => {
    if (get().bossCrowns < BOOST_COST_CROWNS) return;
    set(state => ({
      bossCrowns: state.bossCrowns - BOOST_COST_CROWNS,
      dpsBoostEndsAt: Math.max(Date.now(), state.dpsBoostEndsAt) + BOOST_DURATION_MS,
    }));
  },
  buyGoldBoost: () => {
    if (get().bossCrowns < BOOST_COST_CROWNS) return;
    set(state => ({
      bossCrowns: state.bossCrowns - BOOST_COST_CROWNS,
      goldBoostEndsAt: Math.max(Date.now(), state.goldBoostEndsAt) + BOOST_DURATION_MS,
    }));
  },

  // ─── API générique pour les événements aléatoires ─────────────────
  // Multiplicateur de DPS temporaire (Ardeur / malus). >1 = boost, <1 = malus.
  getEventDpsMult: () => (Date.now() < get().eventDpsMultEndsAt ? get().eventDpsMult : 1),
  setEventDpsMult: (mult: number, durationMs: number) =>
    set({ eventDpsMult: mult, eventDpsMultEndsAt: Date.now() + durationMs }),

  // Inflige des dégâts instantanés à l'ennemi courant (orbes de Tempête, etc.).
  dealInstantDamage: (dmg: BigNum) => {
    if (bnIsZero(dmg)) return;
    set(s => {
      const newHp = bnSub(s.currentEnemy.currentHp, dmg);
      if (bnIsZero(newHp)) return resolveEnemyDeath({ ...s, weeklyQuests: s.weeklyQuests ?? [], eventQuests: s.eventQuests ?? [], currentEnemy:{ ...s.currentEnemy, currentHp:newHp } });
      return { currentEnemy: { ...s.currentEnemy, currentHp: newHp } };
    });
  },

  // Crédite des récompenses (slots casino, jackpots...).
  grantEventRewards: (coins = BN_ZERO, gems = 0, crowns = 0) =>
    set(s => {
      const crownsGained = Math.max(0, Math.floor(crowns));
      return {
        pixelCoins: bnAdd(s.pixelCoins, coins),
        nekoGems:   s.nekoGems + Math.max(0, Math.floor(gems)),
        bossCrowns: s.bossCrowns + crownsGained,
        totalBossCrownsEarned: (s.totalBossCrownsEarned ?? 0) + crownsGained,
        quests: bumpCoinQuests(s.quests, bnToNumber(coins)),
      };
    }),
  buyGemsWithCrowns: (packId) => {
    const pack = CROWN_GEM_PACKS.find(p => p.id === packId);
    if (!pack || get().bossCrowns < pack.crowns) return;
    set(state => ({ bossCrowns: state.bossCrowns - pack.crowns, nekoGems: state.nekoGems + pack.gems }));
  },
  buyGoldWithGems: (packId) => {
    const pack = GEM_GOLD_PACKS.find(p => p.id === packId);
    if (!pack || get().nekoGems < pack.gems) return;
    const scaledCoins = getGoldPackCoins(pack, get().palier, getGoldChestMultiplier(get().goldUpgradeLevel ?? 0));
    set(state => ({ nekoGems: state.nekoGems - pack.gems, pixelCoins: bnAdd(state.pixelCoins, scaledCoins), totalGemsSpent: (state.totalGemsSpent ?? 0) + pack.gems }));
  },

  // ─── Boutique : Orbe du Néant (persos + gemmes) ─────────────────────
  ensureDailyShop: () => {
    const today = getTodayDayKey();
    if (get().dailyShop.dayKey === today) return; // déjà à jour
    set({ dailyShop: { dayKey: today, characterIds: generateDailyShopCharacters(runPeakPalierOf(get())), purchased: [], rerollCount: 0 } });
  },
  rerollDailyShop: () => {
    const { dailyShop, voidOrbs } = get();
    const cost = getRerollShopCost();
    if (voidOrbs < cost) return;
    set(state => ({
      voidOrbs: state.voidOrbs - cost,
      dailyShop: { ...state.dailyShop, characterIds: generateDailyShopCharacters(runPeakPalierOf(get())), purchased: [], rerollCount: (state.dailyShop.rerollCount ?? 0) + 1 },
    }));
    requestUrgentSave('shop');
  },
  buyShopCharacter: (slotIndex) => {
    const { dailyShop, voidOrbs } = get();
    const templateId = dailyShop.characterIds[slotIndex];
    if (!templateId || dailyShop.purchased.includes(templateId)) return;
    const tpl = getCharacterById(templateId);
    if (!tpl) return;
    const price = SHOP_CHAR_PRICE_ORBS[tpl.rarity];
    if (voidOrbs < price) return;
    set(state => ({
      voidOrbs: state.voidOrbs - price,
      dailyShop: { ...state.dailyShop, purchased: [...state.dailyShop.purchased, templateId] },
    }));
    get().addToCollection(templateId);
  },
  buyGemsWithOrbs: (packId) => {
    const pack = ORB_GEM_PACKS.find(p => p.id === packId);
    if (!pack || get().voidOrbs < pack.orbs) return;
    set(state => ({ voidOrbs: state.voidOrbs - pack.orbs, nekoGems: state.nekoGems + pack.gems }));
  },

  buyEquipmentChest: (tier) => {
    const def = EQUIPMENT_CHESTS.find(c => c.id === `chest_${tier}`);
    if (!def || get().nekoGems < def.gems) return null;
    const itemId = rollEquipmentChest(tier);
    set(state => ({
      nekoGems: state.nekoGems - def.gems,
      totalGemsSpent: (state.totalGemsSpent ?? 0) + def.gems,
      equipmentInventory: {
        ...state.equipmentInventory,
        [itemId]: (state.equipmentInventory[itemId] ?? 0) + 1,
      },
    }));
    requestUrgentSave('shop');
    return itemId;
  },

  recycleChampion: (templateId) => {
    const qty = get().championInventory[templateId] ?? 0;
    if (qty <= 0) return;
    const tpl  = getCharacterById(templateId);
    const orbs = tpl ? getVoidOrbsForRarity(tpl.rarity) : 1;
    set(state => {
      const inv = { ...state.championInventory };
      if (inv[templateId] <= 1) delete inv[templateId];
      else inv[templateId] -= 1;
      return { championInventory: inv, voidOrbs: state.voidOrbs + orbs, totalVoidOrbsEarned: (state.totalVoidOrbsEarned ?? 0) + orbs };
    });
  },

  recycleChampionsByRarity: (rarity) => {
    const inv = get().championInventory;
    const orbsPerUnit = getVoidOrbsForRarity(rarity);
    let count = 0;
    let orbs = 0;
    const nextInv = { ...inv };
    for (const [templateId, qty] of Object.entries(inv)) {
      if ((qty ?? 0) <= 0) continue;
      if (getCharacterById(templateId)?.rarity !== rarity) continue;
      count += qty;
      orbs += qty * orbsPerUnit;
      delete nextInv[templateId];
    }
    if (count > 0) {
      set(state => ({ championInventory: nextInv, voidOrbs: state.voidOrbs + orbs, totalVoidOrbsEarned: (state.totalVoidOrbsEarned ?? 0) + orbs }));
    }
    return { count, orbs };
  },

  removeChampion: (templateId) => {
    set(state => {
      const inv = { ...state.championInventory };
      if ((inv[templateId] ?? 0) <= 1) delete inv[templateId];
      else inv[templateId] -= 1;
      return { championInventory: inv };
    });
  },

  // ─── Pack de démarrage Early Access (24h après le lancement) ───────
  isStarterPackAvailable: () => {
    if (get().starterPackClaimed) return false;
    const now = Date.now();
    return now >= LAUNCH_TIMESTAMP && now < LAUNCH_TIMESTAMP + STARTER_PACK_WINDOW_MS;
  },
  claimStarterPack: () => {
    if (!get().isStarterPackAvailable()) return null;
    const stellairePool = BANNER_POOL.filter(c => c.rarity === 'S');
    const templateId = stellairePool[Math.floor(Math.random() * stellairePool.length)].id;
    const edition = get().addToCollection(templateId);
    set(state => ({
      starterPackClaimed: true,
      nekoGems: state.nekoGems + STARTER_PACK_REWARDS.gems,
    }));
    return { templateId, edition };
  },
});
