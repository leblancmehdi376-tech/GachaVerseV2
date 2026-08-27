'use client';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { bnToNumber } from '@/lib/game/bignum';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { computeActiveSynergies } from '@/lib/game/synergies';
import { makeInstanceKey } from '@/lib/game/editions';
import {
  trackBossKills, trackBossCrowns, trackPalier, trackCoins, trackDps, trackCollection,
  trackEquippedTeam, trackKills, trackQuestsCompleted, trackUpgrades, trackGems, trackPrestige,
  trackVoidOrbs, trackUnlockedTitles, trackGachaPulls, trackShinyEditions, trackRank7, trackSynergyMax,
} from '@/store/achievementTrackers';

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
  } = useGameStore();
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const unlockedTitlesCount = useGameStore(s => s.unlockedTitles.length);

  useEffect(() => { trackBossKills(totalBossKills); }, [totalBossKills]);
  useEffect(() => { trackBossCrowns(totalBossCrownsEarned); }, [totalBossCrownsEarned]);
  useEffect(() => { trackPalier(maxPalierReached); }, [maxPalierReached]);
  useEffect(() => { trackCoins(bnToNumber(pixelCoins)); }, [pixelCoins]);
  useEffect(() => { trackGems(nekoGems); }, [nekoGems]);
  useEffect(() => { trackPrestige(prestigeLevel); }, [prestigeLevel]);
  useEffect(() => { trackVoidOrbs(totalVoidOrbsEarned); }, [totalVoidOrbsEarned]);
  useEffect(() => { trackUnlockedTitles(unlockedTitlesCount); }, [unlockedTitlesCount]);
  useEffect(() => { trackGachaPulls(totalGachaPulls); }, [totalGachaPulls]);
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
    // Possédé si N'IMPORTE QUELLE édition l'est (Base/Or/Diamant) — sinon un
    // perso obtenu uniquement en shiny ne compterait pas pour ces succès.
    const owned = CHARACTER_POOL.filter((c: {id: string}) =>
      (['base', 'gold', 'diamond'] as const).some(ed => !!col[makeInstanceKey(c.id, ed)])
    );
    const hasL  = owned.some((c: {rarity: string}) => ['L','M','S','CO','P','T'].includes(c.rarity));
    const hasT  = owned.some((c: {rarity: string}) => c.rarity === 'T');
    const transcendantCount = owned.filter((c: {rarity: string}) => c.rarity === 'T').length;
    trackCollection(owned.length, hasL, hasT, CHARACTER_POOL.length, transcendantCount);
    trackEquippedTeam(equippedTeam.filter(Boolean).length);

    // Éditions shiny : scan direct des instances de collection (les clés
    // composites "id::gold"/"id::diamond" encodent déjà l'édition).
    const instances = Object.values(col) as { templateId: string; edition?: string; rank: number }[];
    const goldOrDiamond = instances.filter(o => o.edition === 'gold' || o.edition === 'diamond');
    const hasGold    = instances.some(o => o.edition === 'gold');
    const hasDiamond = instances.some(o => o.edition === 'diamond');
    const diamondTemplates = new Set(instances.filter(o => o.edition === 'diamond').map(o => o.templateId));
    // Trio parfait : un templateId présent avec ses 3 éditions à la fois.
    const byTemplate: Record<string, Set<string>> = {};
    for (const o of instances) (byTemplate[o.templateId] ??= new Set()).add(o.edition ?? 'base');
    const trioTemplates = Object.values(byTemplate).filter(s => s.has('base') && s.has('gold') && s.has('diamond'));
    const hasTrio = trioTemplates.length > 0;
    trackShinyEditions(goldOrDiamond.length, hasGold, hasDiamond, diamondTemplates.size, hasTrio, trioTemplates.length);

    // Rangs 7★ : combien de personnages DIFFÉRENTS au rang max (dédupliqué par
    // templateId, une même carte en plusieurs éditions ne doit compter qu'une
    // fois), et l'équipe entière l'est-elle ?
    const count7Star = new Set(instances.filter(o => o.rank >= 7).map(o => o.templateId)).size;
    const fullTeamRank7 = equippedTeam.length === 4 && equippedTeam.every(id => id && col[id]?.rank >= 7);
    trackRank7(count7Star, fullTeamRank7);
  }, [col, equippedTeam]);
}
