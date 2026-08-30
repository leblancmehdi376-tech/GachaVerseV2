import { describe, it, expect } from 'vitest';
import { canAffordListing, getListingLabel, getListingIcon } from './MarketplacePage';
import type { MarketplaceListing } from '@/lib/firebase/marketplace';
import { ITEM_DEFS, EQUIPMENT_DEFS } from '@/lib/game/items';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { bnFromNumber } from '@/lib/game/bignum';

// On s'appuie sur le vrai contenu du jeu (ITEM_DEFS / EQUIPMENT_DEFS /
// CHARACTER_POOL) sans coder en dur d'id précis — cf. convention de
// CompanionsPage.test.ts.
const itemId = Object.keys(ITEM_DEFS)[0];
const equipmentId = Object.keys(EQUIPMENT_DEFS)[0];
const character = CHARACTER_POOL[0];

function makeListing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    id: 'l1', sellerId: 's1', sellerName: 'Vendeur', type: 'item', itemId,
    quantity: 1, price: 100, currency: 'coins', createdAt: 0, status: 'active',
    ...overrides,
  };
}

describe('canAffordListing', () => {
  const balances = { nekoGems: 50, bossCrowns: 20, pixelCoins: bnFromNumber(1000) };

  it('gems : compare au solde de Neko-Gemmes', () => {
    expect(canAffordListing('gems', 50, balances)).toBe(true);
    expect(canAffordListing('gems', 51, balances)).toBe(false);
  });

  it('crowns : compare au solde de BossCrowns', () => {
    expect(canAffordListing('crowns', 20, balances)).toBe(true);
    expect(canAffordListing('crowns', 21, balances)).toBe(false);
  });

  it('coins : compare au solde de Pixel-Coins (BigNum)', () => {
    expect(canAffordListing('coins', 1000, balances)).toBe(true);
    expect(canAffordListing('coins', 1001, balances)).toBe(false);
  });
});

describe('getListingLabel', () => {
  it('résout le nom pour un item', () => {
    expect(getListingLabel(makeListing({ type: 'item', itemId }))).toBe(ITEM_DEFS[itemId].name);
  });

  it('résout le nom pour un équipement', () => {
    expect(getListingLabel(makeListing({ type: 'equipment', itemId: equipmentId }))).toBe(EQUIPMENT_DEFS[equipmentId].name);
  });

  it('résout le nom pour un personnage via son templateId', () => {
    expect(getListingLabel(makeListing({ type: 'character', itemId: character.id }))).toBe(character.name);
  });

  it("retombe sur l'itemId brut quand l'id est inconnu", () => {
    expect(getListingLabel(makeListing({ type: 'item', itemId: 'id_inexistant' }))).toBe('id_inexistant');
  });
});

describe('getListingIcon', () => {
  it('utilise une icône fixe pour les personnages', () => {
    expect(getListingIcon(makeListing({ type: 'character', itemId: character.id }))).toBe('🧬');
  });

  it("résout l'icône de l'équipement", () => {
    expect(getListingIcon(makeListing({ type: 'equipment', itemId: equipmentId }))).toBe(EQUIPMENT_DEFS[equipmentId].icon);
  });

  it("résout l'icône de l'item", () => {
    expect(getListingIcon(makeListing({ type: 'item', itemId }))).toBe(ITEM_DEFS[itemId].icon);
  });
});
