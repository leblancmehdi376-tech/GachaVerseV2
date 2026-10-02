// Génère les icônes SVG de tous les équipements dans public/sprites/equipment/,
// lues par components/ui/EquipmentIcon.tsx :
//  - les 50 GÉNÉRIQUES (5 emplacements × 10 raretés) : <slot>_<rareté>.svg ;
//  - les objets PERSONNALISÉS (bonusFor) : <id>.svg, dessinés un par un dans
//    scripts/equipment-unique-art.mjs.
//
// Une silhouette par emplacement ; chaque rareté ajoute un ornement à la
// précédente (rivets → liseré → gemme → filigrane doré → pointes → étincelles
// → orbite → flammes → halo). Pour retoucher un dessin, modifier ce fichier
// puis relancer :  node scripts/generate-equipment-icons.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNIQUE_RARITY, uniqueIconSvg } from './equipment-unique-art.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites', 'equipment');

// Couleurs de RARITY_CONFIG (types/game.ts), sauf Stellaire : #ffffff ne
// laisse aucune nuance au dégradé, on prend un blanc légèrement bleuté.
const RARITIES = [
  { k: 'C',  color: '#9ca3af', glow: '#9ca3af' },
  { k: 'U',  color: '#86efac', glow: '#22c55e' },
  { k: 'R',  color: '#60a5fa', glow: '#3b82f6' },
  { k: 'E',  color: '#c084fc', glow: '#a855f7' },
  { k: 'L',  color: '#fbbf24', glow: '#f59e0b' },
  { k: 'M',  color: '#f87171', glow: '#ef4444' },
  { k: 'S',  color: '#e2e8f0', glow: '#fbbf24' },
  { k: 'CO', color: '#34d399', glow: '#10b981' },
  { k: 'P',  color: '#ff6b35', glow: '#ff4500' },
  { k: 'T',  color: '#e879f9', glow: '#d946ef' },
];

// Silhouettes sur une grille 64×64, avec leurs points d'accroche pour les ornements.
const SLOTS = [
  { k: 'helmet',
    body: 'M13 40 C13 21 21 9 32 9 C43 9 51 21 51 40 L51 52 L42 52 L42 41 C42 37 38 34.5 32 34.5 C26 34.5 22 37 22 41 L22 52 L13 52 Z',
    shade: 'M32 9 C43 9 51 21 51 40 L51 52 L42 52 L42 41 C42 37 38 34.5 32 34.5 Z',
    trim: 'M16 30 C20 22 25 18 32 18 C39 18 44 22 48 30', crest: 'M29 9 L32 3 L35 9',
    rivets: [[17.5, 45], [46.5, 45]], gem: [32, 25], gemR: 4.2,
    spikes: 'M16 27 L5 13 L21 21 Z M48 27 L59 13 L43 21 Z' },
  { k: 'chest',
    body: 'M18 11 L26 13 Q32 18 38 13 L46 11 L57 19 L53 31 L48 28.5 L48 51 Q32 59 16 51 L16 28.5 L11 31 L7 19 Z',
    shade: 'M32 16 Q35 15.5 38 13 L46 11 L57 19 L53 31 L48 28.5 L48 51 Q40 55 32 55.5 Z',
    trim: 'M32 20 L32 52 M20 34 Q32 39 44 34', crest: '',
    rivets: [[21, 45], [43, 45]], gem: [32, 28], gemR: 4.5,
    spikes: 'M10 19 L3 8 L17 15 Z M54 19 L61 8 L47 15 Z' },
  { k: 'pants',
    body: 'M17 9 L47 9 L49 18 L45 57 L35.5 57 L32 27 L28.5 57 L19 57 L15 18 Z',
    shade: 'M32 9 L47 9 L49 18 L45 57 L35.5 57 L32 27 Z',
    trim: 'M16 16.5 L48 16.5 M22 52 L28.8 52 M35.2 52 L42 52', crest: '',
    rivets: [[23, 13], [41, 13]], gem: [32, 12.8], gemR: 3.6,
    spikes: 'M18.5 37 L8 35 L19 42 Z M45.5 37 L56 35 L45 42 Z' },
  { k: 'boots',
    body: 'M21 7 L39 7 L39 37 L51 42 Q57 44.5 57 50 L57 55 L17 55 L17 46 Q19 40 21 35 Z',
    shade: 'M30 7 L39 7 L39 37 L51 42 Q57 44.5 57 50 L57 55 L30 55 Z',
    trim: 'M21 15 L39 15 M17 49 L57 49', crest: '',
    rivets: [[30, 25], [30, 31]], gem: [30, 11], gemR: 3.4,
    spikes: 'M17 47 L6 50 L17 53 Z M39 22 L47 17 L39 28 Z' },
  { k: 'weapon', rotate: 45,
    body: 'M29 8 L32 2 L35 8 L35 40 L46 40 L46 45.5 L34.8 45.5 L34.8 54 A4 4 0 1 1 29.2 54 L29.2 45.5 L18 45.5 L18 40 L29 40 Z',
    shade: 'M32 2 L35 8 L35 40 L46 40 L46 45.5 L34.8 45.5 L34.8 54 A4 4 0 0 1 32 61.5 Z',
    trim: 'M32 9 L32 37', crest: '',
    rivets: [[22, 42.7], [42, 42.7]], gem: [32, 42.7], gemR: 3.6,
    spikes: 'M18 40 L11 33 L18 45.5 Z M46 40 L53 33 L46 45.5 Z' },
];

const GOLD = '#fcd34d';

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function star(cx, cy, r) {
  const s = r * 0.28;
  return `M${cx} ${cy - r} L${cx + s} ${cy - s} L${cx + r} ${cy} L${cx + s} ${cy + s} L${cx} ${cy + r} L${cx - s} ${cy + s} L${cx - r} ${cy} L${cx - s} ${cy - s} Z`;
}

export function iconSvg(slot, t) {
  const r = RARITIES[t];
  const light = mix(r.color, '#ffffff', 0.45), base = r.color, dark = mix(r.color, '#0a0818', 0.55), ink = mix(r.color, '#0a0818', 0.82);
  const top = t === 0 ? mix(base, '#ffffff', 0.2) : light; // Commun : métal terne
  const rot = slot.rotate ? ` transform="rotate(${slot.rotate} 32 32)"` : '';
  const out = [];

  // Arrière-plan : rayonnement (L+), orbite (CO), flammes (P+), halo (T).
  if (t >= 4) out.push(`<circle cx="32" cy="32" r="30" fill="url(#g)"/>`);
  if (t === 7) out.push(`<ellipse cx="32" cy="33" rx="30" ry="9" fill="none" stroke="${light}" stroke-width="1.6" stroke-opacity=".75" transform="rotate(-22 32 33)"/><circle cx="59" cy="22" r="2.4" fill="${light}"/>`);
  if (t >= 8) out.push(`<path d="M10 58 C4 44 12 36 12 26 C17 33 17 38 20 40 C20 30 26 22 26 12 C33 22 32 30 32 34 C34 26 40 20 40 10 C46 20 44 30 44 38 C47 34 49 30 52 26 C54 36 60 44 54 58 Z" fill="${r.glow}" opacity=".45"/>`);
  if (t === 9) out.push(`<ellipse cx="32" cy="5.5" rx="14" ry="3.6" fill="none" stroke="${GOLD}" stroke-width="2.2"/>`);

  out.push(`<g${rot}>`);
  // Pointes (M+), sous la silhouette pour qu'elles en sortent.
  if (t >= 5) out.push(`<path d="${slot.spikes}" fill="${dark}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`);
  out.push(`<path d="${slot.body}" fill="url(#f)" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`);
  out.push(`<path d="${slot.shade}" fill="${dark}" opacity=".35"/>`);
  if (slot.crest) out.push(`<path d="${slot.crest}" fill="${base}" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`);
  if (t >= 4) out.push(`<path d="${slot.body}" fill="none" stroke="${GOLD}" stroke-width="1.1" stroke-linejoin="round" opacity=".9" transform="translate(32 32) scale(.9) translate(-32 -32)"/>`);
  if (t >= 2) out.push(`<path d="${slot.trim}" fill="none" stroke="${t >= 4 ? GOLD : light}" stroke-width="1.8" stroke-linecap="round" opacity=".95"/>`);
  if (t >= 1) out.push(slot.rivets.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="${light}" stroke="${ink}" stroke-width=".9"/>`).join(''));
  if (t >= 3) {
    const [gx, gy] = slot.gem, g = slot.gemR;
    const gemC = t >= 9 ? '#ffffff' : mix(r.glow, '#ffffff', 0.25);
    out.push(`<path d="M${gx} ${gy - g} L${gx + g} ${gy} L${gx} ${gy + g} L${gx - g} ${gy} Z" fill="${gemC}" stroke="${ink}" stroke-width="1"/>`);
    out.push(`<path d="M${gx} ${gy - g} L${gx + g * 0.45} ${gy} L${gx} ${gy}" fill="#ffffff" opacity=".7"/>`);
  }
  out.push('</g>');
  // Étincelles (S+), hors rotation.
  if (t >= 6) out.push([[9, 10, 4.5], [55, 50, 3.6], [52, 9, 2.6]].map(([x, y, s]) => `<path d="${star(x, y, s)}" fill="${t === 6 ? '#ffffff' : light}"/>`).join(''));

  // Chaque fichier est un document à part : des id fixes ne peuvent pas entrer en collision.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">`
    + `<defs><linearGradient id="f" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`
    + `<radialGradient id="g"><stop offset="0" stop-color="${r.glow}" stop-opacity=".45"/><stop offset="1" stop-color="${r.glow}" stop-opacity="0"/></radialGradient></defs>`
    + out.join('') + `</svg>\n`;
}

mkdirSync(OUT_DIR, { recursive: true });
let n = 0;
for (const slot of SLOTS) {
  RARITIES.forEach((r, t) => {
    writeFileSync(join(OUT_DIR, `${slot.k}_${r.k}.svg`), iconSvg(slot, t));
    n++;
  });
}
for (const id of Object.keys(UNIQUE_RARITY)) {
  writeFileSync(join(OUT_DIR, `${id}.svg`), uniqueIconSvg(id));
  n++;
}
console.log(`${n} icônes écrites dans ${OUT_DIR}`);
