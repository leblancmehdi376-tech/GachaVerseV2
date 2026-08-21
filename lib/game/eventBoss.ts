// ── Monarque des Ombres — Boss d'événement ─────────────────────────────
import { EVENT_TITLES } from './titles';

export interface EventBossDef {
  id: string;
  name: string;
  subtitle: string;
  spritePath: string;
  bgImagePath: string;
  description: string;
  bgGradient: string;
  accentColor: string;
  availableUntil: number;
  targetSeconds?: number;
  characterId: string;   // perso obtenu via coinItemId en Boutique (plus de drop direct)
  coinItemId: string;    // ItemDef de la pièce d'événement (lib/game/items.ts)
  buyCost: number;       // nb de pièces requises pour acheter characterId en Boutique
  dropTable: DropEntry[];
}

export interface DropResult {
  type: 'item' | 'gems' | 'bossCrowns' | 'title' | 'nothing';
  id?: string;
  qty?: number;
}

// Table de drop partagée par tous les boss d'événement : seuls les 3 objets
// d'évolution (evoItems) et la pièce (coinItemId) diffèrent d'un boss à
// l'autre. Chaque entrée porte son propre coinQty : chaque kill donne
// TOUJOURS le lot principal ET des pièces en même temps (voir rollEventDrop).
function buildEventDropTable(evoItems: [string, string, string]): DropEntry[] {
  return [
    { weight: 50.0, coinQty: 1, result: { type: 'gems', qty: 10 } },
    { weight: 24.3, coinQty: 2, result: { type: 'gems', qty: 20 } },
    { weight: 13.4, coinQty: 2, result: { type: 'gems', qty: 30 } },
    { weight: 10.0, coinQty: 2, result: { type: 'bossCrowns', qty: 3 } },
    { weight: 1.0,  coinQty: 3, result: { type: 'item', id: evoItems[0], qty: 1 } },
    { weight: 0.8,  coinQty: 3, result: { type: 'item', id: evoItems[1], qty: 1 } },
    { weight: 0.5,  coinQty: 3, result: { type: 'item', id: evoItems[2], qty: 1 } },
  ];
}

// Titre exclusif droppable sur ce boss (1% de chance, en plus du lot
// principal ci-dessus) — voir EVENT_TITLES dans lib/game/titles.ts.
function titleDropEntry(title: string): DropEntry {
  return { weight: 1.0, coinQty: 0, result: { type: 'title', id: title } };
}

export const SHADOW_MONARCH_BOSS: EventBossDef = {
  id:          'shadow_monarch',
  name:        'Monarque des Ombres',
  subtitle:    'Le Roi qui se tient au sommet de tous les Monarques',
  spritePath:  '/sprites/events/shadow_monarch.webp',
  bgImagePath: '/sprites/events/shadow_monarch_bg',
  description: 'Une présence écrasante émane de cette silhouette sombre. Ses soldats de l\'ombre attendent vos ordres... ou votre mort.',
  bgGradient:  'linear-gradient(180deg,#0a0014,#05000a)',
  accentColor: '#c084fc',
  availableUntil: new Date('2026-08-22T23:59:59Z').getTime(),
  targetSeconds: 300,
  characterId: 'jinwoo',
  coinItemId:  'coin_jinwoo',
  buyCost:     100,
  dropTable: [...buildEventDropTable(['elixir_vie', 'manteau_ombre', 'beru']), titleDropEntry(EVENT_TITLES.shadow_monarch)],
};

export const ARTHUR_LEYWIN_BOSS: EventBossDef = {
  id:          'arthur_leywin',
  name:        'Arthur Leywin',
  subtitle:    'Héritier de l’Aube',
  spritePath:  '/sprites/events/arthur_leywin.webp',
  bgImagePath: '/sprites/events/arthur_leywin_bg',
  description: 'Le jeune héritier du soleil, prêt à frapper avec la puissance d\'une lame d\'éther.',
  bgGradient:  'linear-gradient(180deg,#071b2a,#081115)',
  accentColor: '#fbbf24',
  availableUntil: new Date('2026-08-22T23:59:59Z').getTime(),
  targetSeconds: 420,
  characterId: 'arthur_leywin',
  coinItemId:  'coin_arthur_leywin',
  buyCost:     300,
  dropTable: [...buildEventDropTable(['cristal_ether', 'epee_ether', 'sylvia']), titleDropEntry(EVENT_TITLES.arthur_leywin)],
};

export const EMINENCE_SHADOW_BOSS: EventBossDef = {
  id:          'eminence_shadow',
  name:        "L'Éminence de l'Ombre",
  subtitle:    'Celui qui se tapit dans l’ombre',
  spritePath:  '/sprites/events/eminence_shadow.webp',
  bgImagePath: '/sprites/events/eminence_shadow_bg',
  description: "Il ne cherche ni la gloire ni la reconnaissance. Il agit dans l'ombre, et frappe quand nul ne l'attend.",
  bgGradient:  'linear-gradient(180deg,#100a24,#05030d)',
  accentColor: '#a78bfa',
  availableUntil: new Date('2026-08-22T23:59:59Z').getTime(),
  targetSeconds: 360,
  characterId: 'cid_kagenou',
  coinItemId:  'coin_cid_kagenou',
  buyCost:     200,
  dropTable: [...buildEventDropTable(['masque_cid', 'epee_slime', 'slime_eminence']), titleDropEntry(EVENT_TITLES.eminence_shadow)],
};

export const EVENT_BOSSES: EventBossDef[] = [SHADOW_MONARCH_BOSS, ARTHUR_LEYWIN_BOSS, EMINENCE_SHADOW_BOSS];

export interface DropEntry {
  weight: number;
  coinQty: number;
  result: DropResult;
}

// Retourne le lot principal ET les pièces de personnage gagnées en même
// temps (deux résultats simultanés à chaque kill, voir buildEventDropTable).
// unlockedTitles : titres déjà obtenus — leur entrée est retirée de la table
// (chaque titre n'est droppable qu'une seule fois, puis disparaît des drops
// possibles ; les autres poids se répartissent naturellement sur le reste).
export function rollEventDrop(bossId: string, unlockedTitles: string[] = []): DropResult[] {
  const boss = EVENT_BOSSES.find(b => b.id === bossId);
  if (!boss) return [{ type: 'nothing' }];
  const pool = boss.dropTable.filter(e =>
    !(e.result.type === 'title' && e.result.id && unlockedTitles.includes(e.result.id))
  );
  const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return [entry.result, { type: 'item', id: boss.coinItemId, qty: entry.coinQty }];
    }
  }
  return [{ type: 'nothing' }];
}

// ── Calibrage de la difficulté ──────────────────────────────────────────
// Le boss est dimensionné par rapport à la puissance ACTUELLE du joueur
// (DPS d'équipe), pas par un chiffre fixe — ça reste équilibré même
// si l'économie du jeu (ultimates...) est rééquilibrée plus tard.
const FIGHT_TARGET_SECONDS = 300;       // durée visée d'un combat via DPS passif seul (~4 min) pour un joueur déjà puissant
const MIN_POWER_FLOOR      = 50;        // évite un calcul à 0 pour un joueur sans équipe

// durationMult : influence de l'équipe de compagnons (types forts/faibles
// contre le type du boss, ±10% cumulable par compagnon — voir EventPage.tsx).
// Le temps de combat reste "fixe" pour une config donnée : PV = DPS × temps,
// donc le combat dure toujours exactement targetSeconds × durationMult,
// quelle que soit la puissance du joueur.
export function getEventBossMaxHp(boss: EventBossDef, currentPower: number, durationMult: number = 1): number {
  const power = Math.max(currentPower, MIN_POWER_FLOOR);
  const targetSeconds = (boss.targetSeconds ?? FIGHT_TARGET_SECONDS) * durationMult;
  return Math.floor(power * targetSeconds);
}
