// Récompenses de connexion journalière — cycle de 28 jours (4 semaines), qui
// boucle ensuite sur la semaine 1 (voir dailyRewardSlice.ts pour la logique
// de progression/reset). Semaines 2 à 4 reprennent les mêmes types de
// récompense que la semaine 1 (orbes/gemmes/hors-ligne/couronnes) avec un
// multiplicateur croissant — valeurs précalculées ici pour rester lisibles.
export type DailyRewardKind = 'voidOrbs' | 'gems' | 'offlineHours' | 'crowns' | 'title';

export interface DailyRewardItem {
  kind: DailyRewardKind;
  amount?: number; // voidOrbs / gems / offlineHours / crowns
  title?: string;  // kind === 'title'
  icon: string;
}

export interface DailyRewardDay {
  day: number; // 1-28
  items: DailyRewardItem[];
}

export const DAILY_REWARD_CYCLE_LENGTH = 28;

export const DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1,  items: [{ kind: 'voidOrbs',     amount: 5,    icon: '🔮' }] },
  { day: 2,  items: [{ kind: 'gems',         amount: 10,   icon: '💎' }] },
  { day: 3,  items: [{ kind: 'offlineHours', amount: 1,    icon: '🌙' }] },
  { day: 4,  items: [{ kind: 'gems',         amount: 100,  icon: '💎' }] },
  { day: 5,  items: [{ kind: 'offlineHours', amount: 2,    icon: '🌙' }] },
  { day: 6,  items: [{ kind: 'crowns',       amount: 5,    icon: '👑' }] },
  { day: 7,  items: [
    { kind: 'gems',  amount: 1000, icon: '💎' },
    { kind: 'title', title: '⚡ Le Protagoniste Prometteur', icon: '🏷️' },
  ] },
  // ── Semaine 2 : x10 orbes, x2 gemmes, +5 couronnes ──
  { day: 8,  items: [{ kind: 'voidOrbs',     amount: 50,   icon: '🔮' }] },
  { day: 9,  items: [{ kind: 'gems',         amount: 20,   icon: '💎' }] },
  { day: 10, items: [{ kind: 'offlineHours', amount: 1,    icon: '🌙' }] },
  { day: 11, items: [{ kind: 'gems',         amount: 200,  icon: '💎' }] },
  { day: 12, items: [{ kind: 'offlineHours', amount: 2,    icon: '🌙' }] },
  { day: 13, items: [{ kind: 'crowns',       amount: 10,   icon: '👑' }] },
  { day: 14, items: [{ kind: 'gems',         amount: 2000, icon: '💎' }] },
  // ── Semaine 3 : x100 orbes, x3 gemmes, +10 couronnes ──
  { day: 15, items: [{ kind: 'voidOrbs',     amount: 500,  icon: '🔮' }] },
  { day: 16, items: [{ kind: 'gems',         amount: 30,   icon: '💎' }] },
  { day: 17, items: [{ kind: 'offlineHours', amount: 1,    icon: '🌙' }] },
  { day: 18, items: [{ kind: 'gems',         amount: 300,  icon: '💎' }] },
  { day: 19, items: [{ kind: 'offlineHours', amount: 2,    icon: '🌙' }] },
  { day: 20, items: [{ kind: 'crowns',       amount: 15,   icon: '👑' }] },
  { day: 21, items: [{ kind: 'gems',         amount: 3000, icon: '💎' }] },
  // ── Semaine 4 : x1000 orbes, x4 gemmes, +15 couronnes ──
  { day: 22, items: [{ kind: 'voidOrbs',     amount: 5000, icon: '🔮' }] },
  { day: 23, items: [{ kind: 'gems',         amount: 40,   icon: '💎' }] },
  { day: 24, items: [{ kind: 'offlineHours', amount: 1,    icon: '🌙' }] },
  { day: 25, items: [{ kind: 'gems',         amount: 400,  icon: '💎' }] },
  { day: 26, items: [{ kind: 'offlineHours', amount: 2,    icon: '🌙' }] },
  { day: 27, items: [{ kind: 'crowns',       amount: 20,   icon: '👑' }] },
  { day: 28, items: [
    { kind: 'gems',  amount: 4000, icon: '💎' },
    { kind: 'title', title: '🌌 Briseur de Limites', icon: '🏷️' },
  ] },
];

export function getDailyRewardDay(day: number): DailyRewardDay | undefined {
  return DAILY_REWARDS.find(d => d.day === day);
}

export interface DailyRewardTitle {
  day: number;
  title: string;
}

// Titres distribués par le calendrier de connexion (jours 7 et 28 actuellement)
// — utilisé par l'onglet "Titres" pour les lister, en plus des titres liés aux
// succès et aux événements (ces titres-là ne sont rattachés à aucun succès).
export const DAILY_REWARD_TITLES: DailyRewardTitle[] = DAILY_REWARDS.flatMap(d =>
  d.items
    .filter((i): i is DailyRewardItem & { title: string } => i.kind === 'title' && !!i.title)
    .map(i => ({ day: d.day, title: i.title }))
);

export function formatDailyRewardLabel(item: DailyRewardItem): string {
  switch (item.kind) {
    case 'voidOrbs':     return `${item.amount} Orbes du Néant`;
    case 'gems':         return `${item.amount} Gemmes`;
    case 'offlineHours': return `${item.amount}h de gains de coins hors ligne`;
    case 'crowns':       return `${item.amount} Couronnes de Boss`;
    case 'title':        return `Titre : "${item.title}"`;
  }
}
