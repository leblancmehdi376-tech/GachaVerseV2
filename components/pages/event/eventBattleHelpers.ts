// Helpers purs (sans JSX) pour le combat de boss d'événement — extraits de
// EventPage.tsx pour séparer la logique des composants.
import { Affinity, AFFINITY_ORDER, affinityMatchupKind, getAffinityForId } from '@/lib/game/affinities';
import { getItemDef } from '@/lib/game/items';
import { DropResult } from '@/lib/game/eventBoss';
import { TITLE_GOLD_BONUS_PCT } from '@/lib/game/titles';

// ── Compagnons d'event : jusqu'à 3 alliés hors équipe/expédition qui
// influencent la durée du combat selon leur type vs celui (aléatoire) du boss.
export const MAX_EVENT_COMPANIONS = 3;
export const COMPANION_DURATION_STEP = 0.10; // ±10% par compagnon fort/faible

export interface Dmg { id: number; x: number; y: number; val: number; crit: boolean; }

export function rollBossAffinity(): Affinity {
  return AFFINITY_ORDER[Math.floor(Math.random() * AFFINITY_ORDER.length)];
}

export function computeDurationMult(companionIds: string[], bossAffinity: Affinity): number {
  let mult = 1;
  for (const cid of companionIds) {
    const kind = affinityMatchupKind(getAffinityForId(cid), bossAffinity);
    if (kind === 'strong') mult -= COMPANION_DURATION_STEP;
    else if (kind === 'weak') mult += COMPANION_DURATION_STEP;
  }
  return Math.max(0.1, mult);
}

export function describeDrop(drop: DropResult): { icon: string; title: string; sub: string; color: string } {
  if (drop.type === 'item' && drop.id) {
    const item = getItemDef(drop.id);
    const qty = drop.qty ?? 1;
    return {
      icon: item?.icon ?? '📦',
      title: item?.isCoin ? `+${qty} ${item.name}` : (item?.name ?? drop.id),
      sub: item?.isCoin ? "Monnaie d'événement" : "Objet d'évolution",
      color: item?.color ?? '#c084fc',
    };
  }
  if (drop.type === 'gems') return { icon: '💎', title: `+${drop.qty} Gemmes`, sub: '', color: 'var(--cyan)' };
  if (drop.type === 'bossCrowns') return { icon: '👑', title: `+${drop.qty} BossCrowns`, sub: '', color: '#fbbf24' };
  if (drop.type === 'title' && drop.id) {
    return { icon: '🏆', title: `Titre : ${drop.id}`, sub: `+${TITLE_GOLD_BONUS_PCT[drop.id] ?? 0}% d'or (équipable)`, color: '#fbbf24' };
  }
  return { icon: '💨', title: 'Rien cette fois...', sub: '', color: 'var(--text-dim)' };
}
