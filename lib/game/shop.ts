import { Rarity } from '@/types/game';
import { rollCharacter } from './gacha';
import { COIN_BASE, COIN_GROWTH } from './enemies';

// ── BossCrown : packs de gemmes ───────────────────────────────────────────
export interface CrownGemPack { id: string; crowns: number; gems: number; bonusLabel?: string; }
export const CROWN_GEM_PACKS: CrownGemPack[] = [
  { id:'cg1', crowns:3,  gems:15  },
  { id:'cg2', crowns:8,  gems:90,  bonusLabel:'+20%' },
  { id:'cg3', crowns:15, gems:200, bonusLabel:'+33%' },
];

// ── BossCrown : boosts temporaires ────────────────────────────────────────
export const BOOST_COST_CROWNS  = 3;             // coût d'un boost (DPS ou Or)
export const BOOST_DURATION_MS  = 15 * 60 * 1000; // 15 minutes
export const BOOST_MULTIPLIER   = 1.2;            // +20%

// ── Orbe du Néant : packs de gemmes ───────────────────────────────────────
export interface OrbGemPack { id: string; orbs: number; gems: number; bonusLabel?: string; }
export const ORB_GEM_PACKS: OrbGemPack[] = [
  { id:'og1', orbs:275,  gems:45  },
  { id:'og2', orbs:525, gems:90,  bonusLabel:'+20%' },
  { id:'og3', orbs:1000, gems:180, bonusLabel:'+50%' },
];

// ── Boutique gemmes → Or : packs de pixel coins achetés en gemmes ─────────
// killsEquivalent = combien de "kills" au palier courant le pack rapporte en
// or, calculé sur la MÊME courbe que le gain organique par ennemi
// (pixelCoinsReward, voir generateEnemy dans enemies.ts) — le pack garde
// donc toujours la même valeur relative, à n'importe quel palier, au lieu
// d'un multiplicateur arbitraire déconnecté de l'économie réelle (ancien bug :
// ×1.45/palier faisait exploser la valeur bien plus vite que l'or gagné en
// jouant, rendant ces packs dérisoires en early-game).
export interface GemGoldPack { id: string; killsEquivalent: number; gems: number; bonusLabel?: string; }
export const GEM_GOLD_PACKS: GemGoldPack[] = [
  { id:'gg1', killsEquivalent:40,  gems:50 },
  { id:'gg2', killsEquivalent:200, gems:185 },
  { id:'gg3', killsEquivalent:500, gems:350 },
];

// Repère de calcul : vague 5 (milieu de palier), la même formule que le gain
// par ennemi en combat normal (hors bonus de boss), multipliée par le bonus
// du Coffre d'Or actuel pour que le pack garde sa valeur réelle de
// killsEquivalent kills même quand ce coffre est bien amélioré (avant ce
// correctif, goldChestMult était ignoré et les packs devenaient sous-évalués
// à mesure que le Coffre d'Or progressait).
export function getGoldPackCoins(pack: GemGoldPack, palier: number, goldChestMult: number = 1): number {
  const global = (palier - 1) * 10 + 5;
  const perKill = COIN_BASE * Math.pow(COIN_GROWTH, global - 1) * goldChestMult;
  return Math.floor(perKill * pack.killsEquivalent);
}

// ── Orbe du Néant : recyclage des doublons au rang max (7★) ──────────────
export function getVoidOrbsForRarity(rarity: Rarity): number {
  if (rarity === 'C') return 1;
  if (rarity === 'U') return 2;
  if (rarity === 'R') return 4;
  if (rarity === 'E') return 7;
  if (rarity === 'L') return 10;
  if (rarity === 'M') return 15;
  if (rarity === 'S') return 25;
  if (rarity === 'CO') return 50;
  if (rarity === 'P') return 100;
  return 500; // T
}

// ── Personnages boutique (3 par jour, payés en Orbes du Néant) ───────────
export const SHOP_CHAR_PRICE_ORBS: Record<Rarity, number> = {
  C:5, U:8, R:12, E:20, L:35, M:60, S:150, CO:360, P:850, T:1500,
};

// Reset à 2h du matin heure de Paris (Europe/Paris = UTC+1 hiver, UTC+2 été)
// On soustrait 2h pour que la "journée de jeu" commence à 2h
function getParisOffsetMs(): number {
  // Détermine l'offset actuel de Paris en ms (gère DST automatiquement)
  const now = new Date();
  // Paris est UTC+1 en hiver, UTC+2 en été
  // On utilise Intl pour détecter l'offset réel
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric', minute: 'numeric',
    hour12: false,
  });
  const parts = parisFormatter.formatToParts(now);
  const parisHour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const utcHour = now.getUTCHours();
  // Calcule l'offset (1 ou 2h)
  let offset = parisHour - utcHour;
  if (offset > 12) offset -= 24;
  if (offset < -12) offset += 24;
  return offset * 3600 * 1000;
}

export function getTodayDayKey(): string {
  // Décale le timestamp de -2h pour que le reset se produise à 2h du matin Paris
  const parisOffset = getParisOffsetMs();
  const now = Date.now() + parisOffset;
  const resetMs = 2 * 3600 * 1000; // 2h en ms
  const shifted = new Date(now - resetMs);
  // Clé basée sur la date Paris décalée (YYYY-MM-DD)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}`;
}

export function getThisWeekKey(): string {
  // Clé de la semaine : lundi de la semaine courante (reset lundi 2h Paris)
  const parisOffset = getParisOffsetMs();
  const now = Date.now() + parisOffset;
  const resetMs = 2 * 3600 * 1000;
  const shifted = new Date(now - resetMs);
  const day = shifted.getUTCDay(); // 0=dim, 1=lun...
  // Ramène au lundi précédent
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(shifted.getTime() + diffToMonday * 24 * 3600 * 1000);
  return `week-${monday.getUTCFullYear()}-${String(monday.getUTCMonth()+1).padStart(2,'0')}-${String(monday.getUTCDate()).padStart(2,'0')}`;
}

export function generateDailyShopCharacters(): string[] {
  const ids = new Set<string>();
  let guard = 0;
  while (ids.size < 3 && guard < 200) {
    ids.add(rollCharacter());
    guard++;
  }
  return Array.from(ids);
}

// ── Pack de démarrage Early Access ────────────────────────────────────────
// ⚠️ À AJUSTER : remplacer par l'horodatage réel de mise en ligne sur Vercel.
// ⚠️ Lancement : 00h00 le 14 août 2026 heure française (UTC+2 en été = 22h00 UTC le 13 août)
export const LAUNCH_TIMESTAMP = new Date('2026-08-13T22:00:00Z').getTime();
export const STARTER_PACK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h après le lancement
export const STARTER_PACK_REWARDS = { gems: 1800, stellaire: 1 };

// ── Coffres d'équipement (achetés en gemmes) ──────────────────────────────
export interface EquipmentChestDef {
  id:       string;
  label:    string;
  emoji:    string;
  gems:     number;
  color:    string;
  glow:     string;
  dropRates: { label: string; pct: string; color: string }[];
}

export const EQUIPMENT_CHESTS: EquipmentChestDef[] = [
  {
    id: 'chest_common', label: 'Coffre Commun', emoji: '📦', gems: 80,
    color: '#9ca3af', glow: '#6b7280',
    dropRates: [
      { label:'Commun',      pct:'94.13%', color:'#9ca3af' },
      { label:'Rare',        pct:'3.21%',  color:'#60a5fa' },
      { label:'Épique',      pct:'1.53%',  color:'#c084fc' },
      { label:'Légendaire',  pct:'0.72%',  color:'#fbbf24' },
      { label:'Stellaire',   pct:'0.30%',  color:'#ffffff' },
      { label:'Cosmique',    pct:'0.10%',  color:'#34d399' },
      { label:'Primordial',  pct:'0.01%',  color:'#ff6b35' },
      { label:'Transcendant',pct:'0.00%',  color:'#e879f9' },
    ],
  },
  {
    id: 'chest_rare', label: 'Coffre Rare', emoji: '🎁', gems: 280,
    color: '#60a5fa', glow: '#3b82f6',
    dropRates: [
      { label:'Commun',      pct:'45.92%', color:'#9ca3af' },
      { label:'Rare',        pct:'29.18%', color:'#60a5fa' },
      { label:'Épique',      pct:'14.51%', color:'#c084fc' },
      { label:'Légendaire',  pct:'6.58%',  color:'#fbbf24' },
      { label:'Stellaire',   pct:'1.98%',  color:'#ffffff' },
      { label:'Cosmique',    pct:'1.00%',  color:'#34d399' },
      { label:'Primordial',  pct:'0.78%',  color:'#ff6b35' },
      { label:'Transcendant',pct:'0.05%',  color:'#e879f9' },
    ],
  },
  {
    id: 'chest_epic', label: 'Coffre Épique', emoji: '💎', gems: 500,
    color: '#c084fc', glow: '#9333ea',
    dropRates: [
      { label:'Commun',      pct:'6.54%',  color:'#9ca3af' },
      { label:'Rare',        pct:'14.03%', color:'#60a5fa' },
      { label:'Épique',      pct:'35.72%', color:'#c084fc' },
      { label:'Légendaire',  pct:'16.94%', color:'#fbbf24' },
      { label:'Stellaire',   pct:'10.83%',  color:'#ffffff' },
      { label:'Cosmique',    pct:'8.51%',  color:'#34d399' },
      { label:'Primordial',  pct:'6.52%',  color:'#ff6b35' },
      { label:'Transcendant',pct:'0.91%',  color:'#e879f9' },
    ],
  },
];
