// Dessins SVG des 63 équipements PERSONNALISÉS (bonusFor), un par objet.
// Utilisé par scripts/generate-equipment-icons.mjs, qui écrit
// public/sprites/equipment/<id>.svg. Grille 64×64, même langage visuel que
// les icônes génériques : dégradé + contour sombre, décor de fond selon la
// rareté (orbite = Cosmique, flammes = Primordial, halo = Transcendant).
//
// Ajouter un objet personnalisé : lui écrire une entrée dans ART et dans
// UNIQUE_RARITY, puis relancer le script (un test vérifie que chaque objet
// personnalisé a son fichier).

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

const RAR = {
  T:  { label: 'Transcendant', color: '#e879f9', glow: '#d946ef' },
  P:  { label: 'Primordial',   color: '#ff6b35', glow: '#ff4500' },
  CO: { label: 'Cosmique',     color: '#34d399', glow: '#10b981' },
};

// ─── Petit moteur de dessin (grille 64×64) ─────────────────────────────
let UID = 0;
function makeCtx() {
  const id = 'u' + (UID++), defs = [], gmap = new Map(), out = [];
  const grad = col => {
    if (!gmap.has(col)) {
      const gid = `${id}g${gmap.size}`; gmap.set(col, gid);
      defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${mix(col, '#ffffff', .42)}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${mix(col, '#0a0818', .5)}"/></linearGradient>`);
    }
    return `url(#${gmap.get(col)})`;
  };
  const ink = col => mix(col, '#0a0818', .82);
  const at = (col, o = {}) => {
    const st = o.noStroke ? '' : ` stroke="${o.stroke ?? ink(col)}" stroke-width="${o.sw ?? 1.8}" stroke-linejoin="round"`;
    return `fill="${o.flat ? col : grad(col)}"${st}${o.op != null ? ` opacity="${o.op}"` : ''}${o.tr ? ` transform="${o.tr}"` : ''}`;
  };
  const c = {
    id, defs, out, ink,
    p: (d, col, o) => out.push(`<path d="${d}" ${at(col, o)}/>`),
    c: (x, y, r, col, o) => out.push(`<circle cx="${x}" cy="${y}" r="${r}" ${at(col, o)}/>`),
    e: (x, y, rx, ry, col, o) => out.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${at(col, o)}/>`),
    r: (x, y, w, h, rx, col, o) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${at(col, o)}/>`),
    l: (d, col, w = 2, o = {}) => out.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.op != null ? ` opacity="${o.op}"` : ''}${o.tr ? ` transform="${o.tr}"` : ''}/>`),
    g: (tr, fn) => { out.push(`<g transform="${tr}">`); fn(); out.push('</g>'); },
    raw: s => out.push(s),
  };
  // Formes récurrentes
  c.star = (x, y, r, col = '#ffffff') => { const s = r * .28; c.p(`M${x} ${y - r}L${x + s} ${y - s}L${x + r} ${y}L${x + s} ${y + s}L${x} ${y + r}L${x - s} ${y + s}L${x - r} ${y}L${x - s} ${y - s}Z`, col, { flat: true, noStroke: true }); };
  c.heart = (x, y, s, col, o) => c.p(`M${x} ${y + s * .8}C${x - s * 1.2} ${y - s * .1} ${x - s * .6} ${y - s} ${x} ${y - s * .35}C${x + s * .6} ${y - s} ${x + s * 1.2} ${y - s * .1} ${x} ${y + s * .8}Z`, col, o);
  c.drop = (x, y, s, col, o) => c.p(`M${x} ${y - s}C${x + s * .7} ${y - s * .1} ${x + s * .7} ${y + s * .7} ${x} ${y + s * .7}C${x - s * .7} ${y + s * .7} ${x - s * .7} ${y - s * .1} ${x} ${y - s}Z`, col, o);
  c.bolt = (x, y, s, col, o) => { const P = [[.15, -1], [-.45, .1], [0, .1], [-.2, 1], [.45, -.2], [0, -.2], [.3, -1]]; c.p('M' + P.map(([a, b]) => `${x + a * s} ${y + b * s}`).join('L') + 'Z', col, o); };
  c.flame = (cx, by, w, h, col, o) => c.p(`M${cx} ${by - h}C${cx + w * .2} ${by - h * .7} ${cx + w * .6} ${by - h * .55} ${cx + w * .5} ${by - h * .2}C${cx + w * .5} ${by} ${cx - w * .5} ${by} ${cx - w * .5} ${by - h * .25}C${cx - w * .55} ${by - h * .55} ${cx - w * .1} ${by - h * .6} ${cx} ${by - h}Z`, col, o);
  c.petal = (x, y, s, rot, col) => c.p(`M0 ${-s}Q${s * .8} ${-s * .3} 0 ${s}Q${-s * .8} ${-s * .3} 0 ${-s}Z`, col, { tr: `translate(${x} ${y}) rotate(${rot})`, sw: 1 });
  c.crescent = (cx, cy, r, col, o) => c.p(`M${cx} ${cy - r}A${r} ${r} 0 1 0 ${cx} ${cy + r}A${r * 1.3} ${r * 1.3} 0 0 1 ${cx} ${cy - r}Z`, col, o);
  c.poly = (cx, cy, r, n, rot, col, o) => c.p('M' + Array.from({ length: n }, (_, i) => { const a = (rot + i * 360 / n) * Math.PI / 180; return `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`; }).join('L') + 'Z', col, o);
  c.pixels = (rows, pal, cell, ox, oy) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) out.push(`<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${cell + .05}" height="${cell + .05}" fill="${pal[ch]}"/>`); }));
  return c;
}

// Épée verticale centrée en (32,32), tournée de `angle` degrés.
function sword(c, o) {
  const { angle = 45, len = 54, w = 6, blade = '#e2e8f0', guard = '#fbbf24', grip = '#3f2a1d', curve = 0, guardW = 18,
          tsuba = false, noGuard = false, pommel = true, fuller = true, before, after, gripLen } = o;
  const cx = 32, top = 32 - len / 2, gy = top + len * .68, gl = gripLen ?? len * .24, hw = w / 2, mid = (top + gy) / 2;
  c.g(`rotate(${angle} 32 32)`, () => {
    before && before(gy, top);
    c.r(cx - w * .4, gy, w * .8, gl, w * .3, grip);
    if (pommel) c.c(cx, gy + gl + 1.5, Math.max(2.2, w * .45), guard);
    const d = curve
      ? `M${cx - hw} ${gy}Q${cx - hw + curve} ${mid} ${cx + curve * .5} ${top}Q${cx + hw + curve * 1.1} ${mid} ${cx + hw} ${gy}Z`
      : `M${cx - hw} ${gy}L${cx - hw} ${top + w}L${cx} ${top}L${cx + hw} ${top + w}L${cx + hw} ${gy}Z`;
    c.p(d, blade);
    const shine = mix(blade, '#ffffff', .6);
    if (fuller && !curve) c.l(`M${cx} ${top + w + 2}L${cx} ${gy - 3}`, shine, Math.max(1, w * .22), { op: .8 });
    if (fuller && curve) c.l(`M${cx + hw * .3} ${gy - 3}Q${cx + hw * .3 + curve} ${mid} ${cx + curve * .5} ${top + 4}`, shine, 1.1, { op: .8 });
    if (!noGuard) { if (tsuba) c.e(cx, gy, guardW / 2, 2.6, guard); else c.r(cx - guardW / 2, gy - 2, guardW, 4, 1.6, guard); }
    after && after(gy, top);
  });
}

// Décor de fond selon la rareté (même langage que les icônes génériques).
function deco(c, rk) {
  const r = RAR[rk];
  c.defs.push(`<radialGradient id="${c.id}rg"><stop offset="0" stop-color="${r.glow}" stop-opacity=".42"/><stop offset="1" stop-color="${r.glow}" stop-opacity="0"/></radialGradient>`);
  c.raw(`<circle cx="32" cy="32" r="31" fill="url(#${c.id}rg)"/>`);
  if (rk === 'CO') c.raw(`<ellipse cx="32" cy="33" rx="30" ry="9" fill="none" stroke="${mix(r.color, '#ffffff', .4)}" stroke-width="1.4" stroke-opacity=".45" transform="rotate(-22 32 33)"/>`);
  if (rk === 'P') c.raw(`<path d="M10 60 C4 46 12 38 12 28 C17 35 17 40 20 42 C20 32 26 24 26 14 C33 24 32 32 32 36 C34 28 40 22 40 12 C46 22 44 32 44 40 C47 36 49 32 52 28 C54 38 60 46 54 60 Z" fill="${r.glow}" opacity=".12"/>`);
  if (rk === 'T') c.raw(`<ellipse cx="32" cy="4.5" rx="12" ry="3" fill="none" stroke="#fcd34d" stroke-width="1.8" opacity=".9"/>`);
}

// ─── Les 63 dessins ─────────────────────────────────────────────────────
const STEEL = '#e2e8f0', GOLD = '#fbbf24', DARK = '#1f1b2e';
export const ART = {
  // ── Transcendant ──
  weapon_transcendant: c => {            // Cigarette électronique
    c.g('rotate(45 32 32)', () => {
      c.r(27, 15, 10, 34, 3, '#334155');
      c.r(29, 8, 6, 8, 2, '#94a3b8');
      c.r(27, 25, 10, 3, 1, '#e879f9', { sw: 1 });
      c.r(30, 37, 4, 6, 1, '#22d3ee', { flat: true, sw: 1 });
    });
    [[50, 11, 5], [56, 16, 3.6], [45, 6, 3.2]].forEach(([x, y, r]) => c.c(x, y, r, '#e2e8f0', { op: .9, sw: 1.2 }));
  },
  weapon_transcendant_griffon: c => sword(c, { len: 56, w: 6, curve: 5, blade: STEEL, guard: GOLD, grip: '#1f2937',
    after: (gy) => c.l(`M41 ${gy}Q45 ${gy + 8} 35 ${gy + 14}`, GOLD, 2.6) }),
  weapon_transcendant_alte_alarmer: c => {
    c.l('M28.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', '#b45309', 2.6);
    c.p('M18 44Q18 18 32 16Q46 18 46 44L50 48L14 48Z', GOLD);
    c.l('M19 38L45 38', '#fde68a', 1.8);
    c.p('M32 25L36 30L32 35L28 30Z', '#dc2626', { sw: 1 });
    c.c(32, 51, 3.6, '#b45309');
    c.l('M32 54.5L32 61', '#dc2626', 2.4);
    c.l('M10 27Q6.5 33 10 39M54 27Q57.5 33 54 39', '#fde68a', 2, { op: .8 });
  },
  weapon_transcendant_nightmare_grimm: c => sword(c, { len: 56, w: 8, blade: DARK, guard: '#b91c1c', grip: '#111827', guardW: 22,
    before: (gy, top) => c.p(`M28 ${gy - 2}Q21 ${gy - 8} 26 ${gy - 13}Q19 ${gy - 19} 25 ${gy - 24}Q20 ${gy - 30} 27 ${top + 6}L29 ${top + 8}L29 ${gy - 2}Z`, '#ef4444', { op: .9, sw: 1.2 }),
    after: (gy) => { c.p(`M21 ${gy - 2}L16 ${gy - 8}L23 ${gy - 2}Z M43 ${gy - 2}L48 ${gy - 8}L41 ${gy - 2}Z`, '#b91c1c', { sw: 1 }); } }),
  weapon_transcendant_gojo: c => {
    c.l('M15 21L10 14M24 15.5L22 8.5M40 15.5L42 8.5M49 21L54 14', '#e2e8f0', 2.4);
    c.p('M5 32Q32 7 59 32Q32 57 5 32Z', '#f1f5f9');
    c.c(32, 32, 11.5, '#38bdf8');
    c.c(32, 32, 4.6, '#0c4a6e', { flat: true, sw: 1 });
    c.c(28, 28, 2.6, '#ffffff', { flat: true, noStroke: true });
    c.star(52, 46, 4, '#bae6fd'); c.star(11, 46, 3, '#bae6fd');
  },
  weapon_transcendant_niyunishi: c => c.g('rotate(-35 32 32)', () => {
    c.p('M47 32L58 22L55.5 32L58 42Z', '#9ca38f');
    c.e(30, 32, 19, 9, '#9ca38f');
    c.l('M13 33Q30 38 48 33', '#f9a8d4', 3.2);
    [[24, 27], [30, 26], [36, 27.5], [40, 26.5]].forEach(([x, y]) => c.c(x, y, 1.1, '#3f3f2a', { flat: true, noStroke: true }));
    c.c(18, 30.5, 2.2, '#111827', { flat: true, noStroke: true });
    c.p('M28 23L33 17L36 24Z', '#7c8669', { sw: 1.2 });
  }),

  // ── Primordial ──
  weapon_primordial_aatrox: c => sword(c, { len: 58, w: 12, blade: '#7f1d1d', guard: '#450a0a', grip: '#292524', guardW: 26,
    after: (gy, top) => {
      c.l(`M32 ${top + 10}L30 ${top + 18}L34 ${top + 24}L30 ${top + 30}L33 ${gy - 4}`, '#f87171', 1.6, { op: .9 });
      c.e(32, gy, 4.5, 2.6, GOLD, { sw: 1 }); c.c(32, gy, 1.4, '#111827', { flat: true, noStroke: true });
    } }),
  weapon_primordial_hogyoku: c => {
    c.p('M32 6L40 24L58 32L40 40L32 58L24 40L6 32L24 24Z', '#e9d5ff', { op: .9 });
    c.c(32, 32, 13, '#a855f7');
    c.c(32, 32, 6, '#f5d0fe', { flat: true, noStroke: true, op: .85 });
    c.c(27.5, 27.5, 2.6, '#ffffff', { flat: true, noStroke: true });
  },
  weapon_primordial_dawn: c => {
    c.p('M4 48A15 15 0 0 1 34 48Z', '#fdba74', { flat: true, noStroke: true, op: .75 });
    c.l('M19 30L19 26M8 36L5 33M30 36L33 33', '#fdba74', 2, { op: .75 });
    sword(c, { len: 56, w: 5, blade: '#a5f3fc', guard: GOLD, grip: '#0e7490', guardW: 16 });
  },
  weapon_primordial_benimaru: c => c.g('rotate(28 32 32)', () => {
    c.r(30.5, 22, 3, 40, 1.5, '#a16207');
    c.p('M22 20L42 20L40 36L24 36Z', '#f8fafc');
    c.l('M27 22L27.5 35M32 22L32 35M37 22L36.5 35', '#cbd5e1', 1.4);
    c.r(23, 10, 18, 11, 2, '#dc2626');
    c.c(32, 7, 3.2, GOLD);
  }),
  weapon_primordial_brume: c => {
    c.r(29.5, 16, 5, 38, 1, '#d6b48a');
    c.l('M29.5 22L34.5 24M29.5 28L34.5 30M29.5 40L34.5 42', '#a1825c', 1.2);
    c.r(14, 52, 36, 6, 2, '#7c3aed');
    c.r(30, 34, 24, 5, 2, '#a78bfa');
    c.r(12, 18, 24, 5, 2, '#a78bfa');
    c.p('M17 13L17 5L21.5 10Z M31 13L31 5L26.5 10Z', '#374151', { sw: 1.2 });
    c.e(24, 13.5, 7.5, 5.5, '#374151');
    c.c(21.5, 13, 1.1, '#facc15', { flat: true, noStroke: true }); c.c(26.5, 13, 1.1, '#facc15', { flat: true, noStroke: true });
    c.l('M31 17Q39 14 37 7', '#374151', 2.4);
  },
  weapon_primordial_brunhilde: c => {
    c.r(12, 12, 40, 40, 8, '#334155');
    c.l('M14 14L50 50M50 14L14 50', '#94a3b8', 3, { op: .85 });
    c.c(32, 32, 13, '#1e293b', { flat: true, sw: 1.2 });
    c.l('M26 26Q26 19 32 19Q38.5 19 38.5 25Q38.5 29.5 32 31L32 35', '#0a0818', 7.5);
    c.l('M26 26Q26 19 32 19Q38.5 19 38.5 25Q38.5 29.5 32 31L32 35', '#fde68a', 4.2);
    c.c(32, 41.5, 2.6, '#fde68a', { flat: true, stroke: '#0a0818', sw: 1.4 });
  },
  weapon_primordial_chara: c => {
    c.g('rotate(45 32 32)', () => {
      c.r(28.5, 36, 7, 18, 3, '#92400e');
      c.r(26.5, 34.5, 11, 3, 1, '#78350f');
      c.p('M29 35L29 9Q37 15 35 35Z', STEEL);
    });
    c.heart(15, 47, 7, '#ef4444');
  },
  weapon_primordial_dva: c => {
    c.r(5, 26, 9, 18, 3, '#475569'); c.r(50, 26, 9, 18, 3, '#475569');
    c.r(20, 44, 8, 12, 2, '#e2e8f0'); c.r(36, 44, 8, 12, 2, '#e2e8f0');
    c.e(32, 33, 19, 15, '#f9a8d4');
    c.p('M20 29Q32 21 44 29L42 43Q32 49 22 43Z', '#fdf2f8', { sw: 1.4 });
    c.e(29.3, 29.5, 1.7, 4.2, '#ec4899', { flat: true, noStroke: true }); c.e(34.7, 29.5, 1.7, 4.2, '#ec4899', { flat: true, noStroke: true });
    c.c(32, 35.5, 3.8, '#ec4899', { flat: true, noStroke: true });
  },
  weapon_primordial_eren: c => {
    c.g('rotate(45 32 32)', () => {
      c.r(30.5, 30, 3, 30, 1.5, '#57534e');
      c.r(27, 17, 10, 14, 2, '#9ca3af');
      c.l('M27 22L37 22M27 26L37 26', '#4b5563', 1.2);
      c.p('M28 17L32 3L36 17Z', STEEL);
    });
    c.bolt(15, 46, 12, '#facc15');
  },
  chest_primordial_gi_fusion: c => {
    c.p('M18 12L26 12L32 30L38 12L46 12L54 20L50 31L46 29L46 54L18 54L18 29L14 31L10 20Z', '#1e293b');
    c.p('M26 12L32 30L38 12Z', '#f5c39b', { sw: 1.2 });
    c.e(15, 18, 7.5, 5.5, '#f59e0b'); c.e(49, 18, 7.5, 5.5, '#f59e0b');
    c.r(18, 44, 28, 5, 1, '#38bdf8');
    c.l('M22 30L22 43M42 30L42 43', '#334155', 1.4);
  },
  weapon_primordial_magic: c => {
    [[13, 51, 6], [20, 48, 6.5], [8, 46, 5], [19, 55, 5]].forEach(([x, y, r]) => c.c(x, y, r, '#fcd34d', { sw: 1.4 }));
    c.g('rotate(45 32 32)', () => {
      c.r(30, 6, 4, 52, 2, '#dc2626');
      c.r(29, 4, 6, 7, 1.5, GOLD); c.r(29, 53, 6, 7, 1.5, GOLD);
    });
    c.star(51, 49, 4.2, '#fde68a'); c.star(12, 13, 3.4, '#fde68a');
  },
  weapon_primordial_draconic: c => sword(c, { len: 56, w: 8, blade: '#4c1d95', guard: '#1e3a8a', grip: '#1e3a8a', guardW: 14,
    before: (gy) => { c.p(`M26 ${gy}Q15 ${gy - 9} 12 ${gy - 3}Q18 ${gy + 2} 26 ${gy + 3}Z`, '#38bdf8', { sw: 1.4 }); c.p(`M38 ${gy}Q49 ${gy - 9} 52 ${gy - 3}Q46 ${gy + 2} 38 ${gy + 3}Z`, '#38bdf8', { sw: 1.4 }); },
    after: (gy) => c.p(`M32 ${gy - 3}L35 ${gy}L32 ${gy + 3}L29 ${gy}Z`, '#7dd3fc', { sw: 1 }) }),
  weapon_primordial_antidepresseur: c => {
    c.g('rotate(-35 32 32)', () => {
      c.r(12, 25, 40, 14, 7, '#f1f5f9');
      c.p('M32 25L45 25A7 7 0 0 1 45 39L32 39Z', '#f472b6', { sw: 1.4 });
      c.l('M17 28.5L28 28.5', '#ffffff', 1.6, { op: .9 });
    });
    c.heart(51, 47, 4.5, '#f472b6'); c.heart(13, 15, 3.6, '#f9a8d4');
  },
  weapon_primordial_rayquaza: c => {
    c.p('M10 32A22 22 0 0 1 54 32Z', '#7c3aed');
    c.p('M10 32A22 22 0 0 0 54 32Z', '#f8fafc');
    c.e(20.5, 23, 4, 3.2, '#f472b6', { sw: 1 }); c.e(43.5, 23, 4, 3.2, '#f472b6', { sw: 1 });
    c.l('M27.5 26L27.5 16.5L32 21.5L36.5 16.5L36.5 26', '#ffffff', 2.2);
    c.l('M10 32L54 32', '#1f1b2e', 3.2);
    c.c(32, 32, 6, '#f8fafc', { stroke: '#1f1b2e', sw: 3 });
  },
  weapon_primordial_steve: c => c.pixels([
    '............ooo.',
    '...........olmo.',
    '..........olmdo.',
    '.........olmdo..',
    '........olmdo...',
    '.......olmdo....',
    '......olmdo.....',
    '.oo..olmdo......',
    '.omoolmdo.......',
    '..omlmdo........',
    '...ommo.........',
    '..ohoomo........',
    '.ohho.omo.......',
    'ohho...oo.......',
    'oho.............',
    'oo..............',
  ], { o: '#1c1621', l: '#a99bb6', m: '#6b5e78', d: '#463c51', h: '#5b3a24' }, 3.5, 4, 4),
  weapon_primordial_theknight: c => {
    sword(c, { len: 52, w: 6, blade: '#e7e5e4', grip: '#57534e', noGuard: true, pommel: false, fuller: false,
      after: (gy) => c.l(`M29.5 ${gy + 3}L34.5 ${gy + 5}M29.5 ${gy + 7}L34.5 ${gy + 9}`, '#a8a29e', 1.2) });
    c.p('M10 40L8 31L13 37Z M22 40L24 31L19 37Z', '#f8fafc', { sw: 1.2 });
    c.e(16, 47, 7, 8, '#f8fafc');
    c.e(13.5, 47, 1.8, 2.8, '#0a0818', { flat: true, noStroke: true }); c.e(18.5, 47, 1.8, 2.8, '#0a0818', { flat: true, noStroke: true });
  },
  weapon_primordial_vegeto: c => c.g('rotate(45 32 32)', () => {
    c.p('M26 46L26 12L32 1L38 12L38 46Z', '#22d3ee', { flat: true, noStroke: true, op: .35 });
    c.p('M29 46L29 12L32 5L35 12L35 46Z', '#a5f3fc', { sw: 1.2, stroke: '#0891b2' });
    c.l('M32 10L32 44', '#ffffff', 1.4);
    c.c(32, 50, 6, '#f5c39b');
    c.r(26.5, 54.5, 11, 6, 2, '#1d4ed8');
  }),
  weapon_primordial_yoriichi: c => sword(c, { len: 56, w: 5.5, curve: 4, blade: '#dc2626', grip: '#111827', guard: GOLD, tsuba: true, guardW: 13,
    after: (gy) => {
      c.l(`M32 ${gy - 6}L32 ${gy - 4}M32 ${gy + 4}L32 ${gy + 6}M24 ${gy}L22 ${gy}M40 ${gy}L42 ${gy}`, GOLD, 1.6);
      c.l(`M29.8 ${gy + 4}L34.2 ${gy + 7}M34.2 ${gy + 4}L29.8 ${gy + 7}M29.8 ${gy + 9}L34.2 ${gy + 12}`, '#e5e7eb', 1);
    } }),
  weapon_primordial_shawn_frost: c => {
    c.p('M17 49L20 60L23 49Z M28 52L31 62L34 52Z M40 50L43 59L46 50Z', '#7dd3fc', { sw: 1 });
    c.c(32, 31, 21, '#e0f2fe');
    c.poly(32, 31, 7.5, 5, 0, '#0ea5e9', { sw: 1.2 });
    [[0], [72], [144], [216], [288]].forEach(([a]) => { const r = a * Math.PI / 180; c.l(`M${32 + 7.5 * Math.sin(r)} ${31 - 7.5 * Math.cos(r)}L${32 + 16 * Math.sin(r)} ${31 - 16 * Math.cos(r)}`, '#38bdf8', 1.4); });
    c.l('M52 8L52 18M47.5 10.5L56.5 15.5M47.5 15.5L56.5 10.5', '#bae6fd', 1.6);
  },
  weapon_primordial_frieren: c => c.g('rotate(28 32 32)', () => {
    c.r(30.5, 18, 3, 44, 1.5, '#f5f5f4');
    c.l('M24 18Q24 6 32 5Q40 6 40 18', GOLD, 2.6);
    c.p('M24 18L20 13L26 16Z M40 18L44 13L38 16Z', GOLD, { sw: 1 });
    c.c(32, 13, 5.5, '#dc2626');
    c.c(30.5, 11.5, 1.6, '#ffffff', { flat: true, noStroke: true });
  }),
  weapon_primordial_enjin: c => {
    c.l('M32 30L32 53', '#a8a29e', 3);
    c.l('M32 53Q32 60 26 60Q22 60 22 56', '#a8a29e', 3);
    c.p('M8 32Q10 10 32 8Q54 10 56 32Q50 28 44 32Q38 28 32 32Q26 28 20 32Q14 28 8 32Z', '#334155');
    c.l('M32 8L20 31M32 8L32 31M32 8L44 31', '#94a3b8', 1.2, { op: .9 });
    c.p('M8 32L4 36L10 33Z M56 32L60 36L54 33Z M20 32L18 37L22 33Z M44 32L46 37L42 33Z', '#cbd5e1', { sw: .8 });
    c.c(32, 7, 2.2, '#cbd5e1');
  },
  weapon_primordial_garp: c => {
    c.l('M4 30L13 30M2 38L11 38M5 46L12 46', '#cbd5e1', 2, { op: .7 });
    c.c(32, 37, 19, '#374151');
    c.c(25, 30, 4, '#9ca3af', { flat: true, noStroke: true, op: .55 });
    c.l('M42 21Q45 12 51 11', '#a16207', 2.6);
    c.star(52, 10, 5.5, GOLD);
  },
  weapon_primordial_archer: c => {
    sword(c, { angle: 45, len: 50, w: 9, curve: 6, blade: '#1f2937', guard: '#b91c1c', grip: '#7f1d1d', guardW: 12 });
    sword(c, { angle: -45, len: 50, w: 9, curve: -6, blade: '#f1f5f9', guard: '#b91c1c', grip: '#7f1d1d', guardW: 12 });
  },
  weapon_primordial_chiaki: c => c.g('rotate(-10 32 32)', () => {
    c.r(12, 9, 40, 46, 8, '#c084fc');
    c.r(18, 14, 28, 20, 3, '#1e1b4b', { flat: true });
    c.heart(32, 24, 4.5, '#f472b6', { flat: true, noStroke: true });
    c.p('M20 41L24 41L24 37L28 37L28 41L32 41L32 45L28 45L28 49L24 49L24 45L20 45Z', '#3b0764', { flat: true, sw: 1 });
    c.c(44, 41, 3, '#f472b6', { sw: 1.2 }); c.c(38.5, 46, 3, '#f472b6', { sw: 1.2 });
  }),
  weapon_primordial_makima: c => {
    for (let i = 0; i < 5; i++) {
      const x = 13 + 9.5 * i, y = 51 - 9.5 * i, rot = i % 2 ? 45 : -45;
      c.raw(`<ellipse cx="${x}" cy="${y}" rx="7" ry="3.6" fill="none" stroke="#3b0a0a" stroke-width="5.6" transform="rotate(${rot} ${x} ${y})"/>`);
      c.raw(`<ellipse cx="${x}" cy="${y}" rx="7" ry="3.6" fill="none" stroke="#dc2626" stroke-width="3.2" transform="rotate(${rot} ${x} ${y})"/>`);
      c.raw(`<ellipse cx="${x}" cy="${y}" rx="7" ry="3.6" fill="none" stroke="#fca5a5" stroke-width=".9" opacity=".7" transform="rotate(${rot} ${x} ${y})"/>`);
    }
    c.drop(50, 47, 4.2, '#dc2626'); c.drop(57, 57, 3, '#dc2626');
  },
  weapon_primordial_maliketh: c => sword(c, { len: 56, w: 9, curve: 3, blade: '#111827', guard: '#a16207', grip: '#292524', guardW: 16,
    before: (gy, top) => c.p(`M36 ${gy - 4}Q44 ${gy - 14} 38 ${gy - 20}Q46 ${gy - 28} 37 ${top + 6}L35 ${top + 10}L35 ${gy - 4}Z`, '#7f1d1d', { op: .85, sw: 1 }),
    after: (gy, top) => c.l(`M31 ${top + 12}L33 ${top + 14}M30.5 ${top + 20}L33 ${top + 22}M31 ${top + 28}L33.5 ${top + 30}`, GOLD, 1.3) }),

  // ── Cosmique ──
  chest_primordial_cid: c => {
    c.p('M20 8L26 6L32 14L38 6L44 8L54 22L50 34L46 32L48 58L36 58L32 30L28 58L16 58L18 32L14 34L10 22Z', DARK);
    c.p('M24 6L32 18L40 6Q32 1 24 6Z', '#312e81', { sw: 1.4 });
    c.l('M18 33L16.5 57M46 33L47.5 57M32 30L32 20', '#a78bfa', 1.4, { op: .9 });
    c.l('M21 40L28 40M36 40L43 40', GOLD, 1.4);
  },
  weapon_cosmic_aizen: c => {
    sword(c, { len: 56, w: 5.5, curve: 3, blade: STEEL, guard: '#a3a3a3', grip: '#4d7c0f', tsuba: true, guardW: 12 });
    c.petal(12, 16, 4, 20, '#f9a8d4'); c.petal(50, 50, 3.6, -40, '#f9a8d4'); c.petal(16, 46, 3, 70, '#fbcfe8');
  },
  weapon_cosmic_gilgamesh: c => {
    c.raw(`<ellipse cx="18" cy="48" rx="14" ry="5" fill="none" stroke="${GOLD}" stroke-width="1.6" opacity=".6" transform="rotate(-45 18 48)"/>`);
    c.g('rotate(45 32 32)', () => {
      c.r(29, 42, 6, 14, 2, GOLD);
      c.r(24, 40.5, 16, 3.5, 1.5, GOLD);
      c.r(23, 30, 18, 11, 2, DARK); c.r(24.5, 20, 15, 11, 2, DARK); c.r(26, 11, 12, 10, 2, DARK);
      c.p('M27 11L32 3L37 11Z', DARK);
      c.l('M23.5 35L40.5 35M25 25.5L39 25.5M26.5 16L37.5 16', '#dc2626', 1.6);
    });
  },
  weapon_cosmic_jinkazama: c => {
    const wing = 'M30 48Q12 48 5 22Q14 29 16 20Q22 29 24 15Q28 31 32 27Q34 40 30 48Z';
    c.p(wing, '#3b0764'); c.p(wing, '#3b0764', { tr: 'translate(64 0) scale(-1 1)' });
    c.p('M32 29L36.5 38L32 47L27.5 38Z', '#dc2626');
    c.l('M28 18L26 10M36 18L38 10', '#dc2626', 2.4);
  },
  weapon_cosmic_linkmidona: c => {
    c.p('M24 46L40 46L46 58L18 58Z', '#334155');
    c.c(32, 28, 20, '#475569');
    c.c(32, 28, 14, '#0f172a', { flat: true, sw: 1.2 });
    c.c(32, 28, 14, '#2dd4bf', { flat: true, noStroke: true, op: .18 });
    c.l('M22 20Q32 12 42 20M20 35Q32 44 44 35', '#2dd4bf', 1.6);
    c.l('M32 20L38.5 32L25.5 32Z', '#5eead4', 1.6);
  },
  weapon_cosmic_shinra: c => {
    c.flame(32, 50, 34, 46, '#f8fafc', { stroke: '#93c5fd' });
    c.flame(32, 49, 18, 28, '#93c5fd', { noStroke: true, op: .9 });
    c.p('M16 46L34 46L48 52L48 57L16 57Z', '#111827');
    c.l('M16 53L48 53', '#f8fafc', 1.4);
  },
  weapon_cosmic_jinwoo: c => {
    const glow = (gy) => c.l(`M32 ${gy - 30}L32 ${gy - 4}`, '#60a5fa', 1.2, { op: .9 });
    sword(c, { angle: 40, len: 44, w: 6, blade: '#4c1d95', guard: '#1e1b4b', grip: '#111827', guardW: 12, fuller: false, after: glow });
    sword(c, { angle: -40, len: 44, w: 6, blade: '#4c1d95', guard: '#1e1b4b', grip: '#111827', guardW: 12, fuller: false, after: glow });
  },
  weapon_cosmic_vegeta: c => {
    c.r(8, 28, 15, 22, 5, '#cbd5e1');
    c.c(15.5, 39, 4, '#94a3b8', { sw: 1.2 });
    c.r(21, 27, 22, 4.5, 2, '#94a3b8');
    c.p('M40 16L57 16L57 34L40 34Q37.5 25 40 16Z', '#4ade80', { op: .8 });
    c.l('M44 21L53 21M44 25L50 25M44 29L52 29', '#14532d', 1.4);
  },
  weapon_cosmic_pourfenda: c => {
    c.p('M8 42Q28 10 57 13Q35 19 19 46Z', '#2e1065', { op: .85, stroke: '#7c3aed', sw: 1.2 });
    sword(c, { len: 56, w: 5.5, curve: 3, blade: '#cbd5e1', guard: '#1f2937', grip: '#111827', tsuba: true, guardW: 12 });
  },
  weapon_cosmic_zorua: c => {
    c.p('M10 32A22 22 0 0 1 54 32Z', '#1f2937');
    c.p('M10 32A22 22 0 0 0 54 32Z', '#f8fafc');
    c.p('M16 17L23 12L26 30L19 31Z', '#facc15', { sw: 1 }); c.p('M48 17L41 12L38 30L45 31Z', '#facc15', { sw: 1 });
    c.l('M10 32L54 32', '#1f1b2e', 3.2);
    c.c(32, 32, 6, '#f8fafc', { stroke: '#1f1b2e', sw: 3 });
  },
  weapon_cosmic_luffy: c => {
    c.l('M32 17Q33 10 38 7', '#4d7c0f', 3);
    c.p('M37 10Q46 4 50 11Q43 15 37 10Z', '#65a30d', { sw: 1.2 });
    c.c(32, 37, 20, '#7c3aed');
    const sp = (x, y, r) => c.l(`M${x - r} ${y}A${r} ${r} 0 1 1 ${x} ${y + r}A${r * .6} ${r * .6} 0 1 1 ${x + r * .2} ${y - r * .2}`, '#c4b5fd', 2);
    sp(24, 34, 6); sp(40, 32, 5); sp(32, 47, 5);
  },
  weapon_cosmic_roi_sans_nom: c => {
    c.bolt(15, 44, 15, '#fde047');
    c.g('rotate(45 32 32)', () => {
      c.r(31, 28, 2.6, 34, 1.3, '#a16207');
      c.r(26, 28, 12, 3.2, 1.5, GOLD);
      c.p('M28.5 28L28.5 12L32 2L35.5 12L35.5 28Z', STEEL);
      c.l('M32 8L32 26', '#ffffff', 1, { op: .8 });
    });
  },
  weapon_cosmic_leon: c => {
    c.p('M8 22L50 22L53 26L50 31L29 31L27 35L23 51L12 51L16 35L8 31Z', '#cbd5e1');
    c.p('M16 35L27 35L23 51L12 51Z', '#475569', { sw: 1.2 });
    c.l('M27 35Q27 42 33 42L35 31', '#94a3b8', 1.8);
    c.l('M12 25.5L46 25.5', '#ffffff', 1.2, { op: .7 });
    c.r(50, 23.5, 4, 3.5, .8, '#64748b', { sw: 1 });
  },
  weapon_cosmic_izuku: c => {
    c.bolt(10, 20, 9, '#4ade80'); c.bolt(54, 28, 8, '#4ade80'); c.bolt(52, 52, 6, '#86efac');
    c.r(22, 44, 20, 14, 3, '#16a34a');
    c.r(17, 20, 30, 26, 9, '#f5c39b');
    c.l('M24 22L24 30M31 21L31 30M38 22L38 30', '#c48a65', 1.6);
    c.l('M19 33Q28 36 30 30', '#c48a65', 1.6);
  },
  weapon_cosmic_sukuna: c => c.g('rotate(25 32 32)', () => {
    c.r(25, 8, 14, 48, 7, '#7c5a4a');
    c.r(27.5, 9.5, 9, 8, 3.5, '#c2a093', { sw: 1.2 });
    c.l('M27 24Q32 26 37 24M27 38Q32 40 37 38', '#3f2a1d', 1.4);
    c.l('M29 28L31 33M35 28L33 33', '#111827', 1.6);
    c.r(23, 42, 18, 8, 1, '#f8fafc', { sw: 1.2 });
    c.l('M28 46L36 46M32 43.5L32 48.5', '#dc2626', 1.6);
  }),
  weapon_cosmic_verso: c => {
    c.l('M10 54Q20 30 40 22Q50 18 56 8', '#fbbf24', 7, { op: .55 });
    sword(c, { len: 54, w: 6, blade: '#f1f5f9', guard: '#1f2937', grip: '#111827', guardW: 16 });
    c.drop(12, 18, 3.6, '#fbbf24'); c.drop(52, 52, 3, '#fbbf24');
  },
  weapon_cosmic_sunraku: c => {
    c.e(23, 14, 4.5, 11, '#f8fafc'); c.e(41, 14, 4.5, 11, '#f8fafc');
    c.e(23, 15, 2, 7.5, '#f9a8d4', { flat: true, noStroke: true }); c.e(41, 15, 2, 7.5, '#f9a8d4', { flat: true, noStroke: true });
    sword(c, { angle: 40, len: 40, w: 6, curve: 3, blade: STEEL, guard: '#475569', grip: '#1f2937', guardW: 10 });
    sword(c, { angle: -40, len: 40, w: 6, curve: -3, blade: STEEL, guard: '#475569', grip: '#1f2937', guardW: 10 });
  },
  weapon_cosmic_ushiwaka: c => {
    c.crescent(17, 18, 12, '#fde68a');
    c.g('rotate(45 32 32)', () => {
      c.r(29, 4, 6, 56, 3, '#fef3c7');
      [14, 22, 30, 38].forEach(y => c.c(32, y, 1.6, '#3f2a1d', { flat: true, noStroke: true }));
      c.r(29, 48, 6, 3, 1, '#16a34a', { sw: 1 });
    });
  },
  weapon_cosmic_reyna: c => {
    c.c(47, 14, 8, '#a855f7');
    c.e(47, 14, 4, 2.4, '#f5d0fe', { flat: true, noStroke: true });
    c.c(47, 14, 1.3, '#3b0764', { flat: true, noStroke: true });
    c.p('M4 30L44 30L48 26L59 26L59 32L50 34L44 36L30 36L28 46L22 46L22 38L14 38L10 44L4 44Z', '#334155');
    c.l('M8 33L40 33', '#a855f7', 1.6);
  },
  weapon_cosmic_stark: c => c.g('rotate(28 32 32)', () => {
    c.r(30.5, 10, 3, 50, 1.5, '#78350f');
    c.p('M34 12Q53 9 55 29Q46 26 34 30Z', '#cbd5e1');
    c.p('M30 14Q20 14 18 24Q24 22 30 26Z', '#cbd5e1');
    c.p('M30.5 10L32 3L33.5 10Z', '#cbd5e1', { sw: 1 });
    c.l('M37 15Q49 14 51 25', '#ffffff', 1.2, { op: .7 });
  }),
  weapon_cosmic_rudo: c => {
    [[16, 8, 7, 15], [24, 5, 7, 17], [32, 5, 7, 17], [40, 9, 6.5, 14]].forEach(([x, y, w, h]) => c.r(x, y, w, h, 3, '#64748b'));
    c.r(15, 18, 32, 28, 8, '#475569');
    c.r(15, 18, 32, 6.5, 2, '#f97316');
    c.r(20, 43, 22, 13, 3, '#1f2937');
    c.c(23, 34, 1.8, '#cbd5e1', { sw: .8 }); c.c(39, 34, 1.8, '#cbd5e1', { sw: .8 });
  },
  weapon_cosmic_joseph: c => {
    c.l('M32 15L17 41M32 15L47 41', '#e5e7eb', 1.6);
    c.l('M27.5 11a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0', '#cbd5e1', 2.4);
    c.c(16, 46, 9, '#ef4444'); c.c(48, 46, 9, '#ef4444');
    c.c(13, 43, 2.4, '#fecaca', { flat: true, noStroke: true }); c.c(45, 43, 2.4, '#fecaca', { flat: true, noStroke: true });
    c.l('M4 36Q2 46 6 54M60 36Q62 46 58 54', '#fca5a5', 1.6, { op: .7 });
  },
  weapon_cosmic_kuroro: c => {
    c.r(46, 12, 5, 42, 1, '#f5f5f4', { sw: 1.2 });
    c.r(13, 9, 36, 47, 3, DARK);
    c.r(13, 9, 6, 47, 1.5, '#0a0818', { flat: true, sw: 1 });
    c.e(34, 38, 6, 7, '#dc2626', { flat: true, noStroke: true });
    [[26.5, 29, -25], [30, 25.5, -10], [34.5, 25, 0], [38.5, 27, 12], [41, 36, 45]].forEach(([x, y, r]) =>
      c.e(x, y, 1.9, 4.4, '#dc2626', { flat: true, noStroke: true, tr: `rotate(${r} ${x} ${y})` }));
    c.l('M26 16L42 16', GOLD, 1.4, { op: .8 });
  },
  weapon_cosmic_sasuke: c => {
    sword(c, { len: 54, w: 5, blade: STEEL, guard: '#94a3b8', grip: '#cbd5e1', guardW: 8 });
    c.bolt(14, 20, 10, '#93c5fd', { stroke: '#1d4ed8', sw: 1.2 });
    c.bolt(48, 46, 9, '#e0f2fe', { stroke: '#1d4ed8', sw: 1.2 });
    c.bolt(50, 22, 6, '#bfdbfe', { noStroke: true });
  },
  weapon_cosmic_luminus: c => sword(c, { len: 56, w: 4, blade: '#e11d48', guard: '#1f1b2e', grip: '#4c0519', noGuard: true,
    after: (gy) => {
      c.p(`M32 ${gy}Q24 ${gy - 8} 16 ${gy - 6}Q20 ${gy - 2} 18 ${gy + 2}Q24 ${gy} 26 ${gy + 3}Q28 ${gy} 32 ${gy + 2}Z`, DARK, { sw: 1.4 });
      c.p(`M32 ${gy}Q40 ${gy - 8} 48 ${gy - 6}Q44 ${gy - 2} 46 ${gy + 2}Q40 ${gy} 38 ${gy + 3}Q36 ${gy} 32 ${gy + 2}Z`, DARK, { sw: 1.4 });
    } }),
  weapon_cosmic_ender_dragon: c => {
    c.r(27.5, 5, 9, 6, 2, '#a16207');
    c.r(28, 10, 8, 10, 1, '#e9d5ff', { op: .55 });
    c.c(32, 39, 18, '#e9d5ff', { flat: true, op: .4, stroke: '#e9d5ff', sw: 2 });
    c.p('M14.5 40Q32 33 49.5 40A17.5 17.5 0 0 1 14.5 40Z', '#a855f7', { stroke: '#581c87', sw: 1.2 });
    [[24, 46, 1.8], [36, 44, 1.4], [30, 52, 1.6], [41, 50, 1.2], [22, 30, 1.2], [40, 28, 1.5]].forEach(([x, y, r]) => c.c(x, y, r, '#f0abfc', { flat: true, noStroke: true }));
    c.l('M22 26Q24 22 28 22', '#ffffff', 1.6, { op: .7 });
  },
  weapon_cosmic_mori_ogai: c => {
    c.g('rotate(45 32 32)', () => {
      c.r(30, 26, 4, 32, 2, '#9ca3af');
      c.l('M30 36L34 36M30 40L34 40M30 44L34 44', '#6b7280', 1);
      c.p('M30 26L30 13Q34 4 36 15L34 26Z', '#f1f5f9');
    });
    c.drop(48, 50, 4.5, '#dc2626');
  },
  weapon_cosmic_giyu: c => {
    c.l('M4 50Q10 44 16 50T28 50T40 50', '#7dd3fc', 2.6, { op: .85 });
    c.l('M10 58Q16 52 22 58T34 58', '#38bdf8', 2.2, { op: .7 });
    sword(c, { len: 56, w: 5.5, curve: 3, blade: '#3b82f6', guard: '#1f2937', grip: '#1e3a8a', tsuba: true, guardW: 12 });
  },
  weapon_cosmic_puppet: c => {
    c.r(12, 33, 40, 23, 3, '#7c3aed');
    c.r(29, 33, 6, 23, 1, '#facc15', { sw: 1 });
    c.e(32, 22, 9, 10, '#f8fafc');
    c.e(28.5, 20.5, 1.8, 2.6, '#0a0818', { flat: true, noStroke: true }); c.e(35.5, 20.5, 1.8, 2.6, '#0a0818', { flat: true, noStroke: true });
    c.c(26.5, 26, 1.8, '#f43f5e', { flat: true, noStroke: true }); c.c(37.5, 26, 1.8, '#f43f5e', { flat: true, noStroke: true });
    c.l('M28.5 23.5L28.5 28M35.5 23.5L35.5 28', '#7c3aed', 1);
    c.r(9, 25, 44, 8, 2, '#6d28d9', { tr: 'rotate(-14 31 29)' });
  },
  weapon_cosmic_rokoul_ayro: c => {
    c.c(51, 49, 6, '#4338ca'); c.c(56, 40, 4.6, '#4f46e5');
    c.g('rotate(-12 32 32)', () => {
      c.r(19, 8, 24, 48, 5, '#1d4ed8');
      c.r(19, 8, 24, 5, 2, '#cbd5e1'); c.r(19, 51, 24, 5, 2, '#cbd5e1');
      c.r(19, 30, 24, 8, 1, '#7c3aed', { sw: 1 });
      c.p('M31 18L36 23L31 28L26 23Z', '#e5e7eb', { sw: 1 });
    });
  },
  weapon_cosmic_kinger: c => {
    c.r(17, 50, 30, 8, 2, '#94a3b8');
    c.p('M22 50Q24 35 26 29L38 29Q40 35 42 50Z', '#cbd5e1');
    c.r(21, 24.5, 22, 5, 2, '#94a3b8');
    c.c(32, 18, 7, '#cbd5e1');
    c.r(30.5, 3, 3, 10, 1, '#94a3b8', { sw: 1.2 }); c.r(27.5, 5.5, 9, 3, 1, '#94a3b8', { sw: 1.2 });
    c.l('M26 36L38 36', '#ffffff', 1.2, { op: .7 });
  },
};

export const UNIQUE_RARITY = {
  weapon_transcendant: 'T',
  weapon_transcendant_griffon: 'T',
  weapon_transcendant_alte_alarmer: 'T',
  weapon_transcendant_nightmare_grimm: 'T',
  weapon_transcendant_gojo: 'T',
  weapon_transcendant_niyunishi: 'T',
  weapon_primordial_aatrox: 'P',
  weapon_primordial_hogyoku: 'P',
  weapon_primordial_dawn: 'P',
  weapon_primordial_benimaru: 'P',
  weapon_primordial_brume: 'P',
  weapon_primordial_brunhilde: 'P',
  weapon_primordial_chara: 'P',
  weapon_primordial_dva: 'P',
  weapon_primordial_eren: 'P',
  chest_primordial_gi_fusion: 'P',
  weapon_primordial_magic: 'P',
  weapon_primordial_draconic: 'P',
  weapon_primordial_antidepresseur: 'P',
  weapon_primordial_rayquaza: 'P',
  weapon_primordial_steve: 'P',
  weapon_primordial_theknight: 'P',
  weapon_primordial_vegeto: 'P',
  weapon_primordial_yoriichi: 'P',
  weapon_primordial_shawn_frost: 'P',
  weapon_primordial_frieren: 'P',
  weapon_primordial_enjin: 'P',
  weapon_primordial_garp: 'P',
  weapon_primordial_archer: 'P',
  weapon_primordial_chiaki: 'P',
  weapon_primordial_makima: 'P',
  weapon_primordial_maliketh: 'P',
  chest_primordial_cid: 'CO',
  weapon_cosmic_aizen: 'CO',
  weapon_cosmic_gilgamesh: 'CO',
  weapon_cosmic_jinkazama: 'CO',
  weapon_cosmic_linkmidona: 'CO',
  weapon_cosmic_shinra: 'CO',
  weapon_cosmic_jinwoo: 'CO',
  weapon_cosmic_vegeta: 'CO',
  weapon_cosmic_pourfenda: 'CO',
  weapon_cosmic_zorua: 'CO',
  weapon_cosmic_luffy: 'CO',
  weapon_cosmic_roi_sans_nom: 'CO',
  weapon_cosmic_leon: 'CO',
  weapon_cosmic_izuku: 'CO',
  weapon_cosmic_sukuna: 'CO',
  weapon_cosmic_verso: 'CO',
  weapon_cosmic_sunraku: 'CO',
  weapon_cosmic_ushiwaka: 'CO',
  weapon_cosmic_reyna: 'CO',
  weapon_cosmic_stark: 'CO',
  weapon_cosmic_rudo: 'CO',
  weapon_cosmic_joseph: 'CO',
  weapon_cosmic_kuroro: 'CO',
  weapon_cosmic_sasuke: 'CO',
  weapon_cosmic_luminus: 'CO',
  weapon_cosmic_ender_dragon: 'CO',
  weapon_cosmic_mori_ogai: 'CO',
  weapon_cosmic_giyu: 'CO',
  weapon_cosmic_puppet: 'CO',
  weapon_cosmic_rokoul_ayro: 'CO',
  weapon_cosmic_kinger: 'CO',
};

function svgFor(id, rk) {
  const c = makeCtx();
  deco(c, rk);
  ART[id](c);
  if (rk === 'T') { c.star(8, 10, 3.4, '#fde68a'); c.star(57, 56, 2.8, '#fde68a'); }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${c.defs.join('')}</defs>${c.out.join('')}</svg>
`;
}

/** SVG complet d'un objet personnalisé (id d'EQUIPMENT_DEFS). */
export function uniqueIconSvg(id) {
  return svgFor(id, UNIQUE_RARITY[id]);
}
