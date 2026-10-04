import { bnIsZero, bnSub, type BigNum } from '@/lib/game/bignum';

// Récap affiché au réveil de la veille complète (voir hooks/useAutoSleep.ts) :
// un instantané est pris à la mise en veille, puis comparé à l'état au réveil.
// Monnaies : différence de solde (le joueur ne dépense rien pendant la veille).
// Monstres, boss, couronnes et orbes : compteurs à vie, jamais décrémentés.

export interface SleepSource {
  pixelCoins: BigNum;
  nekoGems: number;
  totalKills: number;
  totalBossKills: number;
  totalBossCrownsEarned: number;
  totalVoidOrbsEarned: number;
  palier: number;
  maxPalierReached: number;
  inventory: Record<string, number>;
  equipmentInventory: Record<string, number>;
  raidBossFight: { bossId: string; kills: number } | null;
}

export interface SleepSnapshot {
  at: number;
  coins: BigNum;
  gems: number;
  kills: number;
  bossKills: number;
  crowns: number;
  orbs: number;
  palier: number;
  maxPalier: number;
  inventory: Record<string, number>;
  equipment: Record<string, number>;
  raid: { bossId: string; kills: number } | null;
}

export interface SleepRecapEntry { id: string; qty: number }

export interface SleepRecap {
  seconds: number;
  coins: BigNum;
  gems: number;
  kills: number;
  bossKills: number;
  crowns: number;
  orbs: number;
  palierFrom: number;
  palierTo: number;
  newMaxPalier: number | null;  // nouveau record de palier, sinon null
  items: SleepRecapEntry[];
  equipment: SleepRecapEntry[];
  raid: { bossId: string; kills: number } | null;
}

export function takeSleepSnapshot(s: SleepSource, now: number): SleepSnapshot {
  return {
    at: now,
    coins: s.pixelCoins,
    gems: s.nekoGems,
    kills: s.totalKills,
    bossKills: s.totalBossKills,
    crowns: s.totalBossCrownsEarned,
    orbs: s.totalVoidOrbsEarned,
    palier: s.palier,
    maxPalier: s.maxPalierReached,
    inventory: { ...s.inventory },
    equipment: { ...s.equipmentInventory },
    raid: s.raidBossFight ? { bossId: s.raidBossFight.bossId, kills: s.raidBossFight.kills } : null,
  };
}

function gainedEntries(before: Record<string, number>, after: Record<string, number>): SleepRecapEntry[] {
  return Object.entries(after)
    .map(([id, qty]) => ({ id, qty: qty - (before[id] ?? 0) }))
    .filter(e => e.qty > 0)
    .sort((a, b) => b.qty - a.qty);
}

// null si rien n'a été obtenu pendant la veille.
export function computeSleepRecap(snap: SleepSnapshot, s: SleepSource, now: number): SleepRecap | null {
  const raidKills = snap.raid && s.raidBossFight?.bossId === snap.raid.bossId
    ? s.raidBossFight.kills - snap.raid.kills : 0;
  const recap: SleepRecap = {
    seconds: Math.max(0, Math.round((now - snap.at) / 1000)),
    coins: bnSub(s.pixelCoins, snap.coins),
    gems: Math.max(0, s.nekoGems - snap.gems),
    kills: Math.max(0, s.totalKills - snap.kills),
    bossKills: Math.max(0, s.totalBossKills - snap.bossKills),
    crowns: Math.max(0, s.totalBossCrownsEarned - snap.crowns),
    orbs: Math.max(0, s.totalVoidOrbsEarned - snap.orbs),
    palierFrom: snap.palier,
    palierTo: s.palier,
    newMaxPalier: s.maxPalierReached > snap.maxPalier ? s.maxPalierReached : null,
    items: gainedEntries(snap.inventory, s.inventory),
    equipment: gainedEntries(snap.equipment, s.equipmentInventory),
    raid: raidKills > 0 && snap.raid ? { bossId: snap.raid.bossId, kills: raidKills } : null,
  };
  const empty = bnIsZero(recap.coins) && !recap.gems && !recap.kills && !recap.bossKills
    && !recap.crowns && !recap.orbs && recap.palierTo === recap.palierFrom && !recap.newMaxPalier
    && !recap.items.length && !recap.equipment.length && !recap.raid;
  return empty ? null : recap;
}
