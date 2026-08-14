import { getCharacterById } from './characters';
import { getEquipmentDef } from './items';
import { calcCharDps, type OwnedCharacter } from '@/types/game';
import { calcDpsWithSynergies, computeActiveSynergies } from './synergies';

/**
 * Calcule le multiplicateur d'équipement pour un personnage.
 * Inclut les multiplicateurs des armes et des synergies spécifiques.
 */
export function getEquipmentMultiplier(
  ownedChar: OwnedCharacter | undefined,
  tpl: ReturnType<typeof getCharacterById> | null
): number {
  if (!ownedChar || !tpl) return 1;
  const weaponDef = getEquipmentDef(ownedChar.equippedItems?.weapon ?? '');
  const weaponBonusMult =
    weaponDef?.bonusFor?.templateId === tpl.id ? (weaponDef?.bonusFor?.multiplier ?? 1) : 1;
  return (
    Object.values(ownedChar.equippedItems ?? {}).reduce((mult, eqId) => {
      if (!eqId) return mult;
      const def = getEquipmentDef(eqId);
      return def ? mult * def.dpsMultiplier : mult;
    }, 1) * weaponBonusMult
  );
}

/**
 * Calcule le DPS d'un personnage unique avec équipement et synergies.
 * Utile pour calculer le DPS d'un personnage spécifique dans l'équipe.
 */
export function calculateCharacterEquippedDps(
  characterId: string,
  ownedChar: OwnedCharacter,
  activeSynergies: ReturnType<typeof computeActiveSynergies>
): number {
  const tpl = getCharacterById(ownedChar.templateId);
  if (!tpl) return 0;
  const base = calcCharDps(tpl, ownedChar);
  const equippedMult = getEquipmentMultiplier(ownedChar, tpl);
  return calcDpsWithSynergies(characterId, Math.floor(base * equippedMult), activeSynergies);
}

/**
 * Calcule le DPS total de l'équipe équipée avec équipements et synergies.
 * Inclut:
 * - DPS de base de chaque personnage
 * - Multiplicateur d'équipement (armes, bonus de personnage)
 * - Bonus de synergies activées
 */
export function calculateEquippedTeamDps(
  equippedTeam: (string | null)[],
  collection: Record<string, OwnedCharacter>
): number {
  const activeSynergies = computeActiveSynergies(equippedTeam);

  return equippedTeam.reduce((sum, id) => {
    if (!id) return sum;
    const owned = collection[id];
    if (!owned) return sum;
    const tpl = getCharacterById(owned.templateId);
    if (!tpl) return sum;
    const base = calcCharDps(tpl, owned);
    const equippedMult = getEquipmentMultiplier(owned, tpl);
    return sum + calcDpsWithSynergies(id, Math.floor(base * equippedMult), activeSynergies);
  }, 0);
}
