'use client';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { bnToNumber } from '@/lib/game/bignum';
import { CHARACTER_POOL, GACHA_EXCLUDED_IDS } from '@/lib/game/characters';
import { EGG } from '@/lib/game/achievements';
import { SSR_RARITIES } from '@/lib/game/achievementStats';
import type { Rarity } from '@/types/game';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import { computeActiveSynergies } from '@/lib/game/synergies';
import { isEditionAtLeast, type CardEdition } from '@/lib/game/editions';
import { countSeenCharacters, countSeenEquipment } from '@/lib/game/compadex';
import { countDleQuestsDone } from '@/lib/game/gachadle';
import { getDleStats } from '@/store/slices/gachaDleSlice';
import {
  trackBossKills, trackBossCrowns, trackPalier, trackCoins, trackDps, trackCollection,
  trackEquippedTeam, trackKills, trackQuestsCompleted, trackUpgrades, trackGems, trackPrestige,
  trackVoidOrbs, trackUnlockedTitles, trackGachaPulls, trackShinyEditions, trackRank7, trackSynergyMax,
  trackCompadexCharacters, trackCompadexEquipment, trackCompadexBoth, trackDleQuests,
  trackAchievementStats, trackMastery, trackSeenRarities, trackCompleteSets, trackGemsSpent,
} from '@/store/achievementTrackers';

// Personnages "collectionnables" (hors héros), groupés par licence et par
// rareté — pour les succès "Licence complète" / "Rareté complète". Une
// licence de moins de 3 personnages ne compte pas (trop triviale).
const COLLECTIBLE = CHARACTER_POOL.filter(c => !c.isHero);
const UNIVERSE_SETS = Object.values(COLLECTIBLE.reduce<Record<string, string[]>>((acc, c) => {
  (acc[c.universe ?? '?'] ??= []).push(c.id); return acc;
}, {})).filter(ids => ids.length >= 3);
const RARITY_SETS = Object.values(COLLECTIBLE.reduce<Record<string, string[]>>((acc, c) => {
  (acc[c.rarity] ??= []).push(c.id); return acc;
}, {}));
const MYTHIC_PLUS: Rarity[] = ['M', 'S', 'CO', 'P', 'T'];

// Synchronise en continu les compteurs de jeu vers le store de succès —
// purement des effets de bord, aucun rendu. Extrait de GameLayout.tsx.
export function useAchievementTrackers() {
  // Sélectionne la RÉFÉRENCE de la fonction (stable), pas son résultat : depuis
  // le passage de getTotalDps() en BigNum (objet), l'appeler dans le sélecteur
  // renvoyait un nouvel objet à chaque rendu, cassant la comparaison
  // getServerSnapshot de useSyncExternalStore (boucle infinie détectée par React).
  // On reconvertit ensuite en number : contrairement à pixelCoins (état stocké,
  // référence stable tant que la valeur ne change pas réellement), getTotalDps()
  // est recalculé à CHAQUE rendu — un number reste comparable par valeur dans
  // le tableau de dépendances de l'effet ci-dessous, un objet BigNum frais non.
  const getTotalDps = useGameStore(s => s.getTotalDps);
  const totalDps = bnToNumber(getTotalDps());
  const {
    collection: col, equippedTeam, totalKills, totalQuestsCompleted, totalUpgradesPerformed,
    totalGachaPulls, totalBossKills, totalBossCrownsEarned, totalVoidOrbsEarned,
    pixelCoins, nekoGems, maxPalierReached,
  } = useGameStore(useShallow(s => ({
    collection: s.collection,
    equippedTeam: s.equippedTeam,
    totalKills: s.totalKills,
    totalQuestsCompleted: s.totalQuestsCompleted,
    totalUpgradesPerformed: s.totalUpgradesPerformed,
    totalGachaPulls: s.totalGachaPulls,
    totalBossKills: s.totalBossKills,
    totalBossCrownsEarned: s.totalBossCrownsEarned,
    totalVoidOrbsEarned: s.totalVoidOrbsEarned,
    pixelCoins: s.pixelCoins,
    nekoGems: s.nekoGems,
    maxPalierReached: s.maxPalierReached,
  })));
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const unlockedTitlesCount = useGameStore(s => s.unlockedTitles.length);
  const compadexCharactersSeen = useGameStore(s => s.compadexCharactersSeen);
  const compadexEquipmentSeen = useGameStore(s => s.compadexEquipmentSeen);
  const achievementStats = useGameStore(s => s.achievementStats);
  const charMastery = useGameStore(s => s.charMastery);
  const totalGemsSpent = useGameStore(s => s.totalGemsSpent);
  const dleQuestsDone = useGameStore(s => countDleQuestsDone(getDleStats(s)));

  useEffect(() => { trackAchievementStats(achievementStats ?? {}); }, [achievementStats]);
  useEffect(() => { trackMastery(charMastery ?? {}); }, [charMastery]);
  useEffect(() => { trackGemsSpent(totalGemsSpent ?? 0); }, [totalGemsSpent]);
  // Secret "Six-Seven" : posséder exactement 67 Neko-Gemmes.
  useEffect(() => { if (nekoGems === 67) useGameStore.getState().discover(EGG.sixSeven); }, [nekoGems]);

  useEffect(() => { trackBossKills(totalBossKills); }, [totalBossKills]);
  useEffect(() => { trackBossCrowns(totalBossCrownsEarned); }, [totalBossCrownsEarned]);
  useEffect(() => { trackPalier(maxPalierReached); }, [maxPalierReached]);
  useEffect(() => { trackCoins(bnToNumber(pixelCoins)); }, [pixelCoins]);
  useEffect(() => { trackGems(nekoGems); }, [nekoGems]);
  useEffect(() => { trackPrestige(prestigeLevel); }, [prestigeLevel]);
  useEffect(() => { trackVoidOrbs(totalVoidOrbsEarned); }, [totalVoidOrbsEarned]);
  useEffect(() => { trackUnlockedTitles(unlockedTitlesCount); }, [unlockedTitlesCount]);
  useEffect(() => { trackGachaPulls(totalGachaPulls); }, [totalGachaPulls]);
  useEffect(() => { trackDleQuests(dleQuestsDone); }, [dleQuestsDone]);
  useEffect(() => {
    const active = computeActiveSynergies(equippedTeam);
    const hasMax = active.some((a: { def: { thresholds: unknown[] }; threshold: unknown }) =>
      a.threshold === a.def.thresholds[a.def.thresholds.length - 1]
    );
    trackSynergyMax(hasMax);
  }, [equippedTeam]);
  useEffect(() => { trackDps(totalDps); }, [totalDps]);
  useEffect(() => { trackKills(totalKills); }, [totalKills]);
  useEffect(() => { trackQuestsCompleted(totalQuestsCompleted); }, [totalQuestsCompleted]);
  useEffect(() => { trackUpgrades(totalUpgradesPerformed); }, [totalUpgradesPerformed]);
  useEffect(() => {
    const owned = CHARACTER_POOL.filter((c: {id: string}) => !!col[c.id]);
    const hasL  = owned.some((c: {rarity: string}) => ['L','M','S','CO','P','T'].includes(c.rarity));
    const hasT  = owned.some((c: {rarity: string}) => c.rarity === 'T');
    const transcendantCount = owned.filter((c: {rarity: string}) => c.rarity === 'T').length;
    trackCollection(owned.length, hasL, hasT, CHARACTER_POOL.length, transcendantCount);
    trackEquippedTeam(equippedTeam.filter(Boolean).length);

    // Éditions : une carte par perso, "Or" / "Diamant" = cette édition OU mieux.
    const instances = Object.values(col) as { templateId: string; edition?: CardEdition }[];
    const goldPlus      = instances.filter(o => isEditionAtLeast(o.edition, 'gold')).length;
    const diamondPlus   = instances.filter(o => isEditionAtLeast(o.edition, 'diamond')).length;
    const prismaticCount = instances.filter(o => o.edition === 'prismatic').length;
    trackShinyEditions(goldPlus, goldPlus > 0, diamondPlus > 0, diamondPlus, prismaticCount > 0, prismaticCount);

    // Ex-succès "rang 7★" : personnages en édition Obsidienne ou mieux, et l'équipe entière l'est-elle ?
    const count7Star = instances.filter(o => isEditionAtLeast(o.edition, 'obsidian')).length;
    const fullTeamRank7 = equippedTeam.length === 4 && equippedTeam.every(id => id && isEditionAtLeast(col[id]?.edition, 'obsidian'));
    trackRank7(count7Star, fullTeamRank7);

    const ownedIds = new Set(owned.map(c => c.id));
    trackCompleteSets(
      UNIVERSE_SETS.some(ids => ids.every(id => ownedIds.has(id))),
      RARITY_SETS.some(ids => ids.every(id => ownedIds.has(id))),
    );
    // Maîtrise : plus haut niveau/forme jamais atteints par personnage.
    useGameStore.getState().recordMasteryLevels();
  }, [col, equippedTeam]);

  useEffect(() => {
    const charSeenCount = countSeenCharacters(compadexCharactersSeen);
    const equipSeenCount = countSeenEquipment(compadexEquipmentSeen);
    trackCompadexCharacters(charSeenCount);
    trackCompadexEquipment(equipSeenCount);
    trackCompadexBoth(charSeenCount >= CHARACTER_POOL.length, equipSeenCount >= Object.keys(EQUIPMENT_DEFS).length);

    const seen = CHARACTER_POOL.filter(c => compadexCharactersSeen[c.id]);
    trackSeenRarities(
      seen.some(c => SSR_RARITIES.includes(c.rarity)),
      seen.some(c => MYTHIC_PLUS.includes(c.rarity)),
      seen.some(c => GACHA_EXCLUDED_IDS.has(c.id)),
    );
  }, [compadexCharactersSeen, compadexEquipmentSeen]);
}
