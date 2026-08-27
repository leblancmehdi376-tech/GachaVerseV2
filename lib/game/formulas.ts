// Formules de calcul (DPS, coûts, éligibilité à l'évolution) — extraites de
// types/game.ts pour séparer la logique métier des définitions de types.
import { getEditionStatMult } from '@/lib/game/editions';
import {
  Rarity, RARITY_CONFIG, RARITY_ORDER_ASC,
  CharacterTemplate, OwnedCharacter, EvoForm, HeroState,
  EVOLUTION_STONE_ITEM_ID,
} from '@/types/game';
import { type BigNum, bnAdd, bnFromNumber, bnGte, bnMulScalar, bnPow } from '@/lib/game/bignum';

// Coût en Pierres d'Évolution (drop d'expédition, voir lib/game/expeditions.ts
// — dropId 'pierre_evolution') : plus la rareté est haute et plus la forme
// actuelle est avancée, plus l'évolution suivante coûte cher en pierres.
// Le facteur de rareté est exponentiel (C -> ×1, T -> ×EVO_RARITY_MULT_MAX) —
// inverse de la courbe log10 des tentatives de drop (lib/game/expeditions.ts
// ::dropBonusMult) : là où le DPS d'équipe a des rendements décroissants, le
// coût en pierres a des rendements CROISSANTS — chaque palier de rareté coûte
// proportionnellement plus cher que le précédent.
const EVO_RARITY_MULT_MAX = 25; // T coûte 25x plus cher que C (écart large)
export function evoStoneCost(rarity: Rarity, currentForm: number): number {
  const rarityIdx = RARITY_ORDER_ASC.indexOf(rarity);
  const rarityMult = Math.pow(EVO_RARITY_MULT_MAX, rarityIdx / (RARITY_ORDER_ASC.length - 1));
  return Math.round(rarityMult * (currentForm + 1) * 3);
}

export function canEvolve(character: CharacterTemplate, owned: OwnedCharacter, inventory: Record<string, number> = {}, dropInventory: Record<string, number> = {}): boolean {
  if (!character.forms || character.forms.length === 0) return false;
  if (owned.currentForm >= character.forms.length - 1) return false;
  const nextForm = character.forms[owned.currentForm + 1];
  if (nextForm.requiredItemIds?.some(id => (inventory[id] ?? 0) < 1)) return false;
  if (character.noEvoStones) return true;
  const stonesNeeded = evoStoneCost(character.rarity, owned.currentForm);
  if ((dropInventory[EVOLUTION_STONE_ITEM_ID] ?? 0) < stonesNeeded) return false;
  return true;
}

export function canEvolveHero(forms: EvoForm[], hero: HeroState): boolean {
  if (!forms || forms.length === 0) return false;
  return hero.currentForm < forms.length - 1;
}

// ── Courbe de DPS perso (retranscrite du Google Sheet de simulation) ─────
// Excel : =ARRONDI(MAX((F$1*F$2^(E5-1)*(ARRONDI(E5/100)+1)*$B$42);(F4+1)))
//   F$1 = baseDps (rareté)     F$2 = pow (rareté, RARITY_CONFIG.dpsMultiplier)
//   E5  = niveau du perso      B42 = numéro de forme
//   F4  = DPS calculé au niveau précédent (garantit au moins +1 DPS/niveau,
//         même quand la courbe exponentielle est encore trop plate en début de jeu)
export function calcCharDps(tpl: CharacterTemplate, owned: OwnedCharacter): BigNum {
  // Le niveau n'est plus plafonné : le numéro de forme sert de multiplicateur
  // (base = ×1, evo1 = ×2, evo2 = ×3, etc.).
  const formMult    = owned.currentForm + 1;
  const rankMult    = [1, 1.4, 1.9, 2.6, 3.5, 5.5, 9.0][Math.min(owned.rank - 1, 6)];
  const editionMult = getEditionStatMult(owned.edition); // ×1 base / ×1.2 or / ×1.5 diamant
  const pow         = RARITY_CONFIG[tpl.rarity].dpsMultiplier; // 1.024 + 0.001 par palier de rareté
  const otherMults  = formMult * rankMult * editionMult;

  const rawDpsAtLevel = (lvl: number): BigNum => {
    const tierMult = Math.round(lvl / 100) + 1; // palier tous les 100 niveaux
    return bnMulScalar(bnPow(pow, lvl - 1), tpl.baseDps * tierMult * otherMults);
  };

  const ONE = bnFromNumber(1);
  let prevDps = rawDpsAtLevel(1);
  for (let lvl = 2; lvl <= owned.level; lvl++) {
    const raw = rawDpsAtLevel(lvl);
    if (bnGte(raw, bnAdd(prevDps, ONE))) {
      // La courbe exponentielle dépasse désormais le palier "+1/niveau" et le
      // dépassera pour tous les niveaux suivants (croissance strictement
      // croissante) : plus besoin de repasser par le MAX, calcul direct.
      return rawDpsAtLevel(owned.level);
    }
    prevDps = bnAdd(prevDps, ONE); // MAX(raw, prevDps+1) avec raw < prevDps+1
  }
  return prevDps;
}

// ── Coûts de niveau ───────────────────────────────────────────────────────
// Excel : =ARRONDI(H$1*H$2^(E5-1))  —  H$1 = base (60), H$2 = pow (1.05), E5 = niveau.
// Coût identique pour toutes les raretés (ne dépend que du niveau).
export function levelUpCost(level: number): BigNum {
  return bnMulScalar(bnPow(1.05, level - 1), 60);
}

export function heroLevelUpCost(level: number): BigNum {
  // Augmenter légèrement le coût de montée du héros pour ralentir la progression
  // 200 × 1.20^(level-1)
  return bnMulScalar(bnPow(1.20, level - 1), 200);
}

// ── Coût d'évolution ─────────────────────────────────────────────────────
export function evoCost(rarity: Rarity, currentForm: number): BigNum {
  const base: Record<Rarity, number> = {
    C:50_000_000,  U:50_000_000,  R:50_000_000,  E:100_000_000,       // Commun à Épique
    L:500_000_000, M:750_000_000, S:1_000_000_000,                     // Légendaire à Stellaire
    CO:2_000_000_000,                                                // Cosmique
    P:4_000_000_000,                                                 // Primordial (entre Cosmique et Transcendant)
    T:10_000_000_000,                                                // Transcendant
  };
  return bnMulScalar(bnPow(3, currentForm), base[rarity] ?? 0);
}
