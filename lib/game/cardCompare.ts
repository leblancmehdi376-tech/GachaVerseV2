// Comparateur de cartes (bouton COMPARER du header) : à niveau égal, quel
// perso (édition + forme d'évolution) est le plus fort, et à quel niveau
// l'autre le rattrape. Hors équipement / bonus : on compare uniquement les cartes.
import { CHARACTER_POOL, getCharacterById } from '@/lib/game/characters';
import { getEditionPowBonus, getEditionStatMult, type CardEdition } from '@/lib/game/editions';
import { calcCharDps } from '@/lib/game/formulas';
import { bnFromNumber, bnLog10, type BigNum } from '@/lib/game/bignum';
import { RARITY_CONFIG, RARITY_ORDER_ASC, type CharacterTemplate } from '@/types/game';

export interface CompareCard { templateId: string; edition: CardEdition; form: number }

export const COMPARE_MAX_LEVEL = 100_000;

// Persos proposés : tout le pool hors héros, du plus rare au plus commun puis par nom.
export const COMPARE_POOL: CharacterTemplate[] = CHARACTER_POOL
  .filter(c => !c.isHero)
  .sort((a, b) => RARITY_ORDER_ASC.indexOf(b.rarity) - RARITY_ORDER_ASC.indexOf(a.rarity) || a.name.localeCompare(b.name, 'fr'));

export function compareFormCount(tpl: CharacterTemplate): number {
  return Math.max(1, tpl.forms?.length ?? 0);
}

function template(card: CompareCard): CharacterTemplate {
  const tpl = getCharacterById(card.templateId);
  if (!tpl) throw new Error(`Perso inconnu : ${card.templateId}`);
  return tpl;
}

function clampForm(card: CompareCard): number {
  return Math.min(Math.max(0, card.form), compareFormCount(template(card)) - 1);
}

export function compareCardDps(card: CompareCard, level: number): BigNum {
  return calcCharDps(template(card), {
    templateId: card.templateId, copies: 1, level, currentForm: clampForm(card), xp: 0, edition: card.edition,
  });
}

export interface CompareResult {
  winner: 'a' | 'b' | 'tie';
  // Combien de fois le gagnant est plus fort (1 en cas d'égalité ; BigNum car l'écart peut être énorme).
  ratio: BigNum;
  // Le perdant rattrape le gagnant à partir de ce niveau (null = jamais).
  overtakeLevel: number | null;
}

export function compareCards(a: CompareCard, b: CompareCard, level: number): CompareResult {
  const diff = bnLog10(compareCardDps(a, level)) - bnLog10(compareCardDps(b, level));
  const winner = Math.abs(diff) < 0.002 ? 'tie' : diff > 0 ? 'a' : 'b';
  const exp = Math.floor(Math.abs(diff));
  const ratio: BigNum = winner === 'tie' ? bnFromNumber(1) : { mantissa: Math.pow(10, Math.abs(diff) - exp), exponent: exp };

  // À niveau égal : DPS = départ × croissance^(niveau−1) (le palier des 100 niveaux s'annule).
  // La carte à la meilleure croissance finit toujours par passer devant.
  const start = (c: CompareCard) => template(c).baseDps * getEditionStatMult(c.edition) * (clampForm(c) + 1);
  const growth = (c: CompareCard) => RARITY_CONFIG[template(c).rarity].dpsMultiplier + getEditionPowBonus(c.edition);
  let overtakeLevel: number | null = null;
  if (winner !== 'tie') {
    const [w, l] = winner === 'a' ? [a, b] : [b, a];
    if (growth(l) > growth(w) + 1e-12) {
      const lvl = 1 + Math.log(start(w) / start(l)) / Math.log(growth(l) / growth(w));
      overtakeLevel = Math.max(level + 1, Math.ceil(lvl));
    }
  }
  return { winner, ratio, overtakeLevel };
}
