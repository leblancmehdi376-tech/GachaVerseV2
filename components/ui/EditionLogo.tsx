'use client';
// Propositions de logos d'édition (page Test visuels) — chaque variante dessine
// les 8 éditions en SVG, à comparer avant d'en retenir une pour le badge de
// carte (voir CharacterCardThumb, prop `badge`).
import { useId } from 'react';
import { EDITION_CONFIG, EDITION_ORDER, editionTier, nextEdition, type CardEdition } from '@/lib/game/editions';

export type EditionLogoVariant = 'emoji' | 'gem' | 'cuts' | 'ring' | 'hex' | 'hex2' | 'hex3' | 'hex4' | 'hex5' | 'hex6' | 'hex7' | 'hex8' | 'hex9' | 'hex10' | 'hex11' | 'hex12' | 'hex13' | 'hex14'
  | 'ring2' | 'ring3' | 'ring4' | 'ring5' | 'ring6' | 'ring7' | 'ring8' | 'ring9' | 'ring10' | 'ring11' | 'ring12' | 'ring13' | 'ring14'
  | 'ring15' | 'ring16' | 'ring17' | 'ring18' | 'ring19' | 'ring20';

export const EDITION_LOGO_VARIANTS: { id: EditionLogoVariant; label: string; description: string }[] = [
  { id: 'emoji', label: 'A · Emojis (actuel)', description: 'Pastille ronde avec un emoji. Rapide, mais le rendu change selon le téléphone.' },
  { id: 'gem',   label: 'B · Gemmes facettées', description: 'Une vraie taille de joaillerie par édition, avec ses facettes : ronde, coussin, émeraude, ovale, brillant, éclat, trillion.' },
  { id: 'cuts',  label: 'C · Pierres taillées', description: 'Une forme différente par édition : pièce, étoile, émeraude, cœur, brillant, éclat, prisme. Lisible même sans les couleurs.' },
  { id: 'ring',  label: 'D · Anneau de progression', description: 'La gemme de l\'édition au centre, entourée d\'un anneau épais qui se remplit d\'un septième par palier. La progression se voit même en petit.' },
  { id: 'ring2', label: 'D2 · Rond biseauté', description: 'Itération de D : pierre ronde à 8 facettes en biseau autour d\'une table claire, chiffre romain.' },
  { id: 'ring3', label: 'D3 · Rond serti', description: 'Itération de D : pierre ronde sertie dans un cadre de métal sombre à liseré clair, chiffre gravé.' },
  { id: 'ring4', label: 'D4 · Rond chiffre arabe', description: 'Itération de D : chiffre arabe (1 à 7) bien lisible, reflet en haut de la pierre.' },
  { id: 'ring5', label: 'D5 · Rond à arcs', description: 'Itération de D : le contour est découpé en 6 arcs, aucun allumé au Bronze, tous (arc-en-ciel) au Prismatique. Chiffre romain au centre.' },
  { id: 'ring6', label: 'D6 · Serti + chiffre arabe', description: 'Synthèse de D3 et D4 : cadre serti et gros chiffre arabe blanc.' },
  { id: 'ring7', label: 'D7 · Biseauté + serti', description: 'Synthèse de D2 et D3 : pierre ronde biseautée sertie dans le métal, chiffre arabe.' },
  { id: 'ring8', label: 'D8 · Biseauté + serti + arcs', description: 'D7 dont le cadre de métal s\'allume arc par arc : aucun au Bronze, cadre complet (arc-en-ciel) au Prismatique.' },
  { id: 'ring9', label: 'D9 · Biseauté + serti (romain)', description: 'D7 avec le palier en chiffre romain (I à VII).' },
  { id: 'ring10', label: 'D10 · Biseauté + serti + arcs (romain)', description: 'D8 avec le palier en chiffre romain (I à VII).' },
  { id: 'ring11', label: 'D11 · D10 en police noire', description: 'D10 avec le chiffre romain en noir, détouré clair.' },
  { id: 'ring12', label: 'D12 · D10 à police contrastée', description: 'D10 dont le chiffre prend la couleur (noir ou blanc) qui contraste le plus avec la pierre.' },
  { id: 'ring13', label: 'D13 · D12 sans sertissage', description: 'D12 sans le cadre de métal : la pierre occupe tout le badge, les arcs s\'allument sur son contour.' },
  { id: 'ring14', label: 'D14 · D12 sans biseautage', description: 'D12 avec une pierre lisse (sans facettes ni table centrale).' },
  { id: 'ring15', label: 'D15 · Anneau des éditions', description: 'L\'anneau est découpé en 6 arcs, chacun à la couleur d\'une édition (Bronze, Or, Émeraude, Rubis, Diamant, Obsidienne). Ils s\'allument au fil des paliers : l\'anneau raconte le parcours de la carte.' },
  { id: 'ring16', label: 'D16 · Éclosion', description: 'Des pétales poussent autour de la gemme : 1 au Bronze, 7 au Prismatique (arc-en-ciel). La fleur s\'ouvre au fil des paliers.' },
  { id: 'ring17', label: 'D17 · Rayonnement', description: 'La gemme rayonne : 4 rayons au Bronze, 2 de plus par palier, 16 au Prismatique. Plus la carte est rare, plus elle brille.' },
  { id: 'ring18', label: 'D18 · Fiole', description: 'Une fiole ronde qui se remplit du liquide de l\'édition : un septième par palier, pleine et arc-en-ciel au Prismatique.' },
  { id: 'ring19', label: 'D19 · Anneau dégradé', description: 'D avec l\'anneau peint du même dégradé que les jauges d\'édition (couleur actuelle vers la suivante).' },
  { id: 'ring20', label: 'D20 · Comète', description: 'L\'anneau devient une comète : une traînée qui s\'estompe et une tête lumineuse qui avance d\'un septième par palier.' },
  { id: 'hex',   label: 'E · Hexagone numéroté', description: 'Hexagone teinté avec le palier en chiffre romain (I à VII). Sobre, façon rang.' },
  { id: 'hex2',  label: 'E2 · Hexagone biseauté', description: 'Itération de E : 6 facettes en biseau autour d\'une table centrale plus claire, comme une pierre vue de dessus. Le chiffre ressort sur la table.' },
  { id: 'hex3',  label: 'E3 · Hexagone serti', description: 'Itération de E : pierre teintée sertie dans un cadre de métal sombre à liseré clair, chiffre gravé. Plus « bijou », bon contraste sur les cadres de rareté.' },
  { id: 'hex4',  label: 'E4 · Hexagone chiffre arabe', description: 'Itération de E : chiffre arabe (1 à 7) plus gros et plus lisible que le romain en petit, reflet en haut de la pierre.' },
  { id: 'hex5',  label: 'E5 · Hexagone à arêtes', description: 'Itération de E : aucune arête allumée au Bronze, une de plus par palier, contour complet (arc-en-ciel) au Prismatique. Le chiffre au centre : le palier se lit deux fois.' },
  { id: 'hex6',  label: 'E6 · Serti + chiffre arabe', description: 'Synthèse de E3 et E4 : le cadre de métal serti, avec le gros chiffre arabe blanc. Garde l\'aspect bijou tout en restant lisible sur les petites cartes.' },
  { id: 'hex7',  label: 'E7 · Biseauté + serti', description: 'Synthèse de E2 et E3 : la pierre biseautée (facettes éclairées en haut, table claire au centre) sertie dans le cadre de métal. Chiffre arabe pour rester lisible en petit.' },
  { id: 'hex8',  label: 'E8 · Biseauté + serti + arêtes', description: 'E7 dont le cadre de métal s\'allume arête par arête : aucune au Bronze, une de plus par palier, cadre complet (arc-en-ciel) au Prismatique.' },
  { id: 'hex9',  label: 'E9 · Biseauté + serti (romain)', description: 'E7 avec le palier en chiffre romain (I à VII).' },
  { id: 'hex10', label: 'E10 · Biseauté + serti + arêtes (romain)', description: 'E8 avec le palier en chiffre romain (I à VII).' },
  { id: 'hex11', label: 'E11 · E10 en police noire', description: 'E10 avec le chiffre romain en noir, détouré clair, au lieu du blanc.' },
  { id: 'hex12', label: 'E12 · E10 à police contrastée', description: 'E10 dont le chiffre prend, pour chaque édition, la couleur (noir ou blanc) qui contraste le plus avec la pierre.' },
  { id: 'hex13', label: 'E13 · E12 sans sertissage', description: 'E12 sans le cadre de métal : la pierre biseautée occupe tout le badge et ses arêtes s’allument directement sur son contour.' },
  { id: 'hex14', label: 'E14 · E12 sans biseautage', description: 'E12 avec une pierre lisse (sans facettes ni table centrale) : cadre serti, arêtes allumées, chiffre romain à police contrastée.' },
];

// ── Famille D (pierre ronde) : configuration de chaque itération ──────────
type RoundVariant = 'ring2' | 'ring3' | 'ring4' | 'ring5' | 'ring6' | 'ring7' | 'ring8' | 'ring9' | 'ring10' | 'ring11' | 'ring12' | 'ring13' | 'ring14';
interface RoundCfg { set: boolean; bevel: boolean; edges: boolean; reflect: boolean; num: 'roman' | 'arabic'; ink: 'white' | 'black' | 'contrast' }
const R = (o: Partial<RoundCfg>): RoundCfg => ({ set: false, bevel: false, edges: false, reflect: false, num: 'roman', ink: 'white', ...o });
const ROUND_VARIANTS: Record<RoundVariant, RoundCfg> = {
  ring2:  R({ bevel: true }),
  ring3:  R({ set: true, ink: 'black' }),
  ring4:  R({ reflect: true, num: 'arabic' }),
  ring5:  R({ edges: true }),
  ring6:  R({ set: true, reflect: true, num: 'arabic' }),
  ring7:  R({ set: true, bevel: true, num: 'arabic' }),
  ring8:  R({ set: true, bevel: true, edges: true, num: 'arabic' }),
  ring9:  R({ set: true, bevel: true }),
  ring10: R({ set: true, bevel: true, edges: true }),
  ring11: R({ set: true, bevel: true, edges: true, ink: 'black' }),
  ring12: R({ set: true, bevel: true, edges: true, ink: 'contrast' }),
  ring13: R({ bevel: true, edges: true, ink: 'contrast' }),
  ring14: R({ set: true, edges: true, ink: 'contrast' }),
};

// Luminance relative WCAG d'une couleur #rrggbb, et couleur de texte (noir ou
// blanc) offrant le meilleur contraste sur un fond donné.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function mixHex(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map(i => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('');
}
function bestInk(bg: string): '#ffffff' | '#0b0a12' {
  const L = luminance(bg);
  const vsWhite = 1.05 / (L + 0.05);
  const vsBlack = (L + 0.05) / (luminance('#0b0a12') + 0.05);
  return vsWhite >= vsBlack ? '#ffffff' : '#0b0a12';
}

// Hexagone pointe en haut, centré (20,20), "rayon" r.
const hexPts = (r: number): Pt[] => ring(6, r, r, -Math.PI / 2);

// ── Variante B : gemmes facettées ─────────────────────────────────────────
// `outline` = contour ; `girdle`/`table` = points reliés deux à deux pour
// dessiner les facettes (table = polygone central, rayons table → contour).
type Pt = [number, number];
const ring = (n: number, rx: number, ry: number, rot = 0): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = rot + (2 * Math.PI * i) / n;
    return [20 + Math.cos(a) * rx, 20 + Math.sin(a) * ry];
  });
const poly = (pts: Pt[]) => `M${pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L')}Z`;

const FACETED: Record<CardEdition, { outline: string; girdle: Pt[]; table: Pt[] }> = {
  base:      { outline: 'M20 4a16 16 0 1 0 0.01 0z', girdle: ring(8, 16, 16, Math.PI / 8), table: ring(8, 8, 8, Math.PI / 8) },
  bronze:    { outline: 'M20 4a16 16 0 1 0 0.01 0z', girdle: ring(8, 16, 16, Math.PI / 8), table: ring(8, 8, 8, Math.PI / 8) },       // ronde
  gold:      { outline: 'M10 5h20a5 5 0 0 1 5 5v20a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5z',                                  // coussin
               girdle: [[6.5, 6.5], [33.5, 6.5], [33.5, 33.5], [6.5, 33.5]], table: [[13, 13], [27, 13], [27, 27], [13, 27]] },
  emerald:   { outline: 'M13 4h14l8 8v16l-8 8H13l-8-8V12z',                                                                         // émeraude
               girdle: [[13, 4], [27, 4], [35, 12], [35, 28], [27, 36], [13, 36], [5, 28], [5, 12]],
               table: [[15.5, 11], [24.5, 11], [28, 14.5], [28, 25.5], [24.5, 29], [15.5, 29], [12, 25.5], [12, 14.5]] },
  ruby:      { outline: 'M20 3a12.5 17 0 1 0 0.01 0z', girdle: ring(8, 12.5, 17, Math.PI / 8), table: ring(8, 6, 9, Math.PI / 8) },   // ovale
  diamond:   { outline: 'M11 7h18l7 9-16 19L4 16z',                                                                                // brillant
               girdle: [[11, 7], [29, 7], [36, 16], [20, 35], [4, 16]], table: [[16, 16], [24, 16], [24, 16], [20, 35], [16, 16]] },
  obsidian:  { outline: 'M22 3l11 14-6 18-14 2-6-15z',                                                                             // éclat
               girdle: [[22, 3], [33, 17], [27, 35], [13, 37], [7, 22]], table: [[19, 19], [19, 19], [19, 19], [19, 19], [19, 19]] },
  prismatic: { outline: 'M20 4L36 33H4z',                                                                                          // trillion
               girdle: [[20, 4], [36, 33], [4, 33]], table: [[20, 14], [28.5, 28.5], [11.5, 28.5]] },
};

function FacetedGem({ edition, fill, light, dark }: { edition: CardEdition; fill: string; light: string; dark: string }) {
  const { outline, girdle, table } = FACETED[edition];
  const tableIsPoint = table.every(p => p[0] === table[0][0] && p[1] === table[0][1]);
  const rays = girdle.map((g, i) => `M${table[i][0]} ${table[i][1]}L${g[0]} ${g[1]}`).join('');
  return (
    <>
      <path d={outline} fill={fill} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
      <path d={rays} fill="none" stroke={light} strokeOpacity={0.55} strokeWidth={0.9} />
      {!tableIsPoint && edition !== 'diamond' && (
        <path d={poly(table)} fill={light} fillOpacity={0.22} stroke={light} strokeOpacity={0.8} strokeWidth={0.9} strokeLinejoin="round" />
      )}
      {edition === 'diamond' && <path d="M4 16h32M11 7l5 9M29 7l-5 9" fill="none" stroke={light} strokeOpacity={0.7} strokeWidth={0.9} />}
      <path d="M13.5 11.5l3-2.5" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.8} strokeLinecap="round" />
    </>
  );
}

// clair / moyen / sombre par édition (Prismatique : dégradé arc-en-ciel à part).
const PALETTE: Record<CardEdition, [string, string, string]> = {
  base:      ['#e5e7eb', '#9ca3af', '#4b5563'],
  bronze:    ['#f0b27a', '#cd7f32', '#6b3410'],
  gold:      ['#fde68a', '#f59e0b', '#92400e'],
  emerald:   ['#6ee7b7', '#059669', '#064e3b'],
  ruby:      ['#fda4af', '#e11d48', '#881337'],
  diamond:   ['#ecfeff', '#22d3ee', '#0e7490'],
  obsidian:  ['#a78bfa', '#2e1065', '#0a0a0f'],
  prismatic: ['#ffffff', '#e879f9', '#6d28d9'],
};
const RAINBOW = ['#f87171', '#fbbf24', '#4ade80', '#22d3ee', '#818cf8', '#e879f9'];
const EMOJI: Record<CardEdition, string> = {
  base: '', bronze: '🪙', gold: '✨', emerald: '❇️', ruby: '♦️', diamond: '💎', obsidian: '🌑', prismatic: '🌈',
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Silhouettes de la variante "Pierres taillées" (viewBox 0 0 40 40).
const CUT_PATHS: Record<CardEdition, string> = {
  base:      'M20 6a14 14 0 1 0 0.01 0z',
  bronze:    'M20 5a15 15 0 1 0 0.01 0z',                                              // pièce
  gold:      'M20 4l4.6 10.2 11 1.1-8.3 7.4 2.4 10.9L20 28l-9.7 5.6 2.4-10.9-8.3-7.4 11-1.1z', // étoile
  emerald:   'M13 5h14l8 8v14l-8 8H13l-8-8V13z',                                        // taille émeraude
  ruby:      'M20 35C9 27 4 20.5 4 14.5 4 9 8 5.5 12.6 5.5c3.2 0 5.6 1.8 7.4 4.4 1.8-2.6 4.2-4.4 7.4-4.4C32 5.5 36 9 36 14.5 36 20.5 31 27 20 35z', // cœur
  diamond:   'M11 7h18l7 9-16 19L4 16z',                                                // brillant
  obsidian:  'M22 3l11 14-6 18-14 2-6-15z',                                             // éclat
  prismatic: 'M20 3l15 9v16l-15 9-15-9V12z',                                            // prisme
};

function Fill({ id, edition }: { id: string; edition: CardEdition }) {
  if (edition === 'prismatic') {
    return (
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        {RAINBOW.map((c, i) => <stop key={c} offset={`${(i / (RAINBOW.length - 1)) * 100}%`} stopColor={c} />)}
      </linearGradient>
    );
  }
  const [light, mid, dark] = PALETTE[edition];
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={light} />
      <stop offset="55%" stopColor={mid} />
      <stop offset="100%" stopColor={dark} />
    </linearGradient>
  );
}

export function EditionLogo({ edition, variant, size = 32 }: { edition: CardEdition; variant: EditionLogoVariant; size?: number }) {
  const uid = useId().replace(/:/g, '');
  const fillId = `ed-fill-${uid}`;
  const [light, mid, dark] = PALETTE[edition];
  const tier = editionTier(edition);
  const glow = edition === 'prismatic' ? '#e879f9' : mid;
  const anim = edition === 'prismatic' ? 'editionPrism 4s linear infinite' : undefined;

  if (variant === 'emoji') {
    return (
      <span style={{
        width: size, height: size, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `radial-gradient(circle at 35% 30%, #fff, ${mid})`, border: `1.5px solid ${mid}`,
        boxShadow: `0 0 10px ${glow}`, fontSize: Math.round(size * 0.55), animation: anim, flexShrink: 0,
      }}>
        {EMOJI[edition] || '·'}
      </span>
    );
  }

  const shadow = { filter: `drop-shadow(0 0 ${Math.max(2, size / 8)}px ${glow})`, animation: anim, flexShrink: 0 } as const;

  if (variant === 'gem') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <FacetedGem edition={edition} fill={`url(#${fillId})`} light={light} dark={dark} />
      </svg>
    );
  }

  if (variant === 'cuts') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <path d={CUT_PATHS[edition]} fill={`url(#${fillId})`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M13 13l5-4" stroke="#fff" strokeOpacity={0.75} strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'ring15' || variant === 'ring16' || variant === 'ring17' || variant === 'ring18' || variant === 'ring19' || variant === 'ring20') {
    // Famille D, pistes indépendantes de E : la gemme centrale reste, c'est
    // ce qui l'entoure qui raconte la progression.
    const gem = (scale: number) => (
      <g transform={`translate(${20 - 20 * scale} ${20 - 20 * scale}) scale(${scale})`}>
        <FacetedGem edition={edition} fill={`url(#${fillId})`} light={light} dark={dark} />
      </g>
    );
    const pt = (a: number, r: number) => `${(20 + Math.cos(a) * r).toFixed(2)} ${(20 + Math.sin(a) * r).toFixed(2)}`;
    const arcPath = (a1: number, a2: number, r: number) =>
      `M${pt(a1, r)}A${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${pt(a2, r)}`;
    const TOP = -Math.PI / 2;
    const frac = tier / 7;

    if (variant === 'ring15') {
      // 6 arcs aux couleurs des éditions Bronze → Obsidienne, allumés jusqu'au palier.
      const lit = Math.max(0, Math.min(tier - 1, 6));
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
          <defs><Fill id={fillId} edition={edition} /></defs>
          <circle cx="20" cy="20" r="18.6" fill="#0b0a12" />
          {Array.from({ length: 6 }, (_, i) => {
            const ed = EDITION_ORDER[i + 1];
            const a1 = TOP + (Math.PI / 3) * i + 0.1, a2 = TOP + (Math.PI / 3) * (i + 1) - 0.1;
            return <path key={i} d={arcPath(a1, a2, 15.8)} fill="none" strokeWidth={4.4} strokeLinecap="round"
              stroke={i < lit ? EDITION_CONFIG[ed].color : 'rgba(255,255,255,0.1)'} />;
          })}
          {gem(0.5)}
        </svg>
      );
    }

    if (variant === 'ring16') {
      // Pétales : un par palier.
      const n = Math.max(1, tier);
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
          <defs><Fill id={fillId} edition={edition} /></defs>
          {Array.from({ length: n }, (_, i) => {
            const a = (360 / n) * i;
            return <ellipse key={i} cx="20" cy="8.5" rx="4.6" ry="8" transform={`rotate(${a} 20 20)`}
              fill={edition === 'prismatic' ? RAINBOW[i % RAINBOW.length] : edition === 'obsidian' ? light : mid} fillOpacity={0.9} stroke={dark} strokeWidth={0.8} />;
          })}
          <circle cx="20" cy="20" r="9.5" fill="#0b0a12" fillOpacity={0.55} />
          {gem(0.5)}
        </svg>
      );
    }

    if (variant === 'ring17') {
      // Rayons : 4 au Bronze, +2 par palier.
      const n = 2 + tier * 2;
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
          <defs><Fill id={fillId} edition={edition} /></defs>
          {Array.from({ length: n }, (_, i) => {
            const a = TOP + ((2 * Math.PI) / n) * i, w = Math.min(0.22, 1.4 / n);
            return <path key={i} d={`M${pt(a - w, 9)}L${pt(a, 19)}L${pt(a + w, 9)}Z`}
              fill={edition === 'prismatic' ? RAINBOW[i % RAINBOW.length] : light} fillOpacity={0.9} />;
          })}
          {gem(0.58)}
        </svg>
      );
    }

    if (variant === 'ring18') {
      // Fiole : niveau de liquide = palier / 7, surface ondulée.
      const clipId = `${fillId}-clip`;
      const level = 36 - 32 * frac; // y de la surface (36 = vide, 4 = plein)
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
          <defs>
            <Fill id={fillId} edition={edition} />
            <clipPath id={clipId}><circle cx="20" cy="20" r="16" /></clipPath>
          </defs>
          <circle cx="20" cy="20" r="17" fill="#0b0a12" stroke={light} strokeOpacity={0.8} strokeWidth={1.4} />
          <g clipPath={`url(#${clipId})`}>
            <path d={`M2 ${level}q4.5 -2.6 9 0t9 0t9 0t9 0t9 0V40H2Z`} fill={`url(#${fillId})`} />
            {tier > 0 && <circle cx="15" cy={Math.min(33, level + 6)} r="1.2" fill="#fff" fillOpacity={0.5} />}
            {tier > 2 && <circle cx="24" cy={Math.min(34, level + 10)} r="0.9" fill="#fff" fillOpacity={0.45} />}
          </g>
          <path d="M11 11.5a12 12 0 0 1 8-4.5" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      );
    }

    if (variant === 'ring19') {
      // Anneau peint du dégradé des jauges d'édition (couleur actuelle → suivante).
      const C = 2 * Math.PI * 16;
      const next = nextEdition(edition);
      const gradId = `${fillId}-g`;
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
          <defs>
            <Fill id={fillId} edition={edition} />
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              {edition === 'prismatic'
                ? RAINBOW.map((c, i) => <stop key={c} offset={`${(i / (RAINBOW.length - 1)) * 100}%`} stopColor={c} />)
                : <>
                    <stop offset="0%" stopColor={EDITION_CONFIG[edition].glow} />
                    <stop offset="100%" stopColor={next ? EDITION_CONFIG[next].color : EDITION_CONFIG[edition].color} />
                  </>}
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="18.5" fill="#0b0a12" />
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={5} />
          <circle cx="20" cy="20" r="16" fill="none" stroke={`url(#${gradId})`} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 20 20)" />
          {gem(0.475)}
        </svg>
      );
    }

    // ring20 — Comète : traînée qui s'estompe + tête lumineuse au bout de la progression.
    const end = TOP + 2 * Math.PI * frac - 0.001;
    const segs = 10;
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <circle cx="20" cy="20" r="18.5" fill="#0b0a12" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        {tier > 0 && Array.from({ length: segs }, (_, i) => {
          const a1 = TOP + (end - TOP) * (i / segs), a2 = TOP + (end - TOP) * ((i + 1) / segs);
          return <path key={i} d={arcPath(a1, a2, 16)} fill="none" strokeWidth={1.5 + 2.5 * (i / segs)}
            stroke={edition === 'prismatic' ? RAINBOW[i % RAINBOW.length] : light} strokeOpacity={0.15 + 0.85 * (i / segs)} />;
        })}
        {tier > 0 && <circle cx={20 + Math.cos(end) * 16} cy={20 + Math.sin(end) * 16} r="3.2" fill="#fff" stroke={mid} strokeWidth={1.2} />}
        {gem(0.475)}
      </svg>
    );
  }

  if (variant === 'ring') {
    // Anneau épais (r=16) rempli de tier/7, gemme facettée réduite au centre.
    const C = 2 * Math.PI * 16;
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <circle cx="20" cy="20" r="18.5" fill="#0b0a12" />
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={5} />
        <circle cx="20" cy="20" r="16" fill="none" stroke={`url(#${fillId})`} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${(C * tier) / 7} ${C}`} transform="rotate(-90 20 20)" />
        <g transform="translate(10.5 10.5) scale(0.475)">
          <FacetedGem edition={edition} fill={`url(#${fillId})`} light={light} dark={dark} />
        </g>
      </svg>
    );
  }

  const numeral = (text: string, fontSize: number, y = 20, fill = '#fff', stroke = dark) => (
    <text x="20" y={y} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={900}
      fontFamily="var(--f-num), system-ui, sans-serif" fill={fill} stroke={stroke} strokeWidth={1} paintOrder="stroke">
      {text}
    </text>
  );

  if (variant in ROUND_VARIANTS) {
    // Famille D (pierre ronde) : mêmes itérations que la famille E, transposées
    // au rond — sertissage, biseau (8 facettes), arcs allumés, chiffres.
    const cfg = ROUND_VARIANTS[variant as RoundVariant];
    const rStone = cfg.set ? 14 : 16.8;
    const girdle = ring(8, rStone, rStone, -Math.PI / 2 + Math.PI / 8);
    const table = ring(8, rStone * 0.6, rStone * 0.6, -Math.PI / 2 + Math.PI / 8);
    const rEdge = cfg.set ? 17.4 : rStone;
    const litCount = Math.max(0, Math.min(tier - 1, 6));
    const bg = cfg.bevel ? mixHex(mid, light, 0.3) : mid;
    const contrastInk = bestInk(bg);
    const [ink, inkStroke] = cfg.ink === 'black' ? ['#0b0a12', light]
      : cfg.ink === 'contrast' ? [contrastInk, contrastInk === '#ffffff' ? '#0b0a12' : light]
      : ['#fff', '#0b0a12'];
    const big = cfg.set ? 0 : 1.5;
    const label = cfg.num === 'arabic'
      ? numeral(tier ? String(tier) : '·', 14 + big * 2, 20.8, ink, inkStroke)
      : numeral(ROMAN[tier] || '·', (tier >= 7 ? 9 : tier >= 4 ? 10.5 : 12) + big, 20.6, ink, inkStroke);
    const arc = (i: number, r: number) => {
      const gap = 0.12;
      const a1 = -Math.PI / 2 + (Math.PI / 3) * i + gap, a2 = -Math.PI / 2 + (Math.PI / 3) * (i + 1) - gap;
      return `M${(20 + Math.cos(a1) * r).toFixed(2)} ${(20 + Math.sin(a1) * r).toFixed(2)}A${r} ${r} 0 0 1 ${(20 + Math.cos(a2) * r).toFixed(2)} ${(20 + Math.sin(a2) * r).toFixed(2)}`;
    };
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs>
          <Fill id={fillId} edition={edition} />
          <linearGradient id={`${fillId}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b4560" />
            <stop offset="100%" stopColor="#151320" />
          </linearGradient>
          <linearGradient id={`${fillId}-t`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light} stopOpacity={0.55} />
            <stop offset="100%" stopColor={light} stopOpacity={0.12} />
          </linearGradient>
        </defs>
        {cfg.set && <circle cx="20" cy="20" r="18.6" fill={`url(#${fillId}-m)`} stroke={cfg.edges ? 'none' : light} strokeOpacity={0.9} strokeWidth={1} />}
        <circle cx="20" cy="20" r={rStone} fill={`url(#${fillId})`} stroke="#0b0a12" strokeWidth={1.2} />
        {cfg.bevel && girdle.map((p, i) => {
          const q = girdle[(i + 1) % 8], t1 = table[i], t2 = table[(i + 1) % 8];
          const lit = i === 6 || i === 7 || i === 0;
          const shade = i === 2 || i === 3 || i === 4;
          return <path key={i} d={poly([p, q, t2, t1])} fill={lit ? '#fff' : shade ? '#000' : 'transparent'}
            fillOpacity={lit || shade ? 0.2 : 0} stroke={light} strokeOpacity={0.3} strokeWidth={0.5} />;
        })}
        {cfg.bevel && <path d={poly(table)} fill={`url(#${fillId}-t)`} stroke={light} strokeOpacity={0.7} strokeWidth={0.7} strokeLinejoin="round" />}
        {cfg.reflect && <ellipse cx="20" cy={20 - rStone * 0.55} rx={rStone * 0.62} ry={rStone * 0.26} fill="#fff" fillOpacity={0.22} />}
        {cfg.edges && Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={arc(i, rEdge)} fill="none" strokeLinecap="round" strokeWidth={2.6}
            stroke={i < litCount ? (tier >= 7 ? RAINBOW[i] : light) : cfg.set ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.45)'} />
        ))}
        {label}
      </svg>
    );
  }

  if (variant === 'hex2') {
    // Biseau : 6 facettes entre le contour et une table centrale plus claire.
    const outer = hexPts(17), table = hexPts(10.5);
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs>
          <Fill id={fillId} edition={edition} />
          <linearGradient id={`${fillId}-t`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light} stopOpacity={0.55} />
            <stop offset="100%" stopColor={light} stopOpacity={0.12} />
          </linearGradient>
        </defs>
        <path d={poly(outer)} fill={`url(#${fillId})`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
        {/* facettes du haut éclairées, du bas assombries */}
        {outer.map((p, i) => {
          const q = outer[(i + 1) % 6], t1 = table[i], t2 = table[(i + 1) % 6];
          const lit = i === 5 || i === 0;
          const shade = i === 2 || i === 3;
          return <path key={i} d={poly([p, q, t2, t1])} fill={lit ? '#fff' : shade ? '#000' : 'transparent'}
            fillOpacity={lit ? 0.22 : shade ? 0.22 : 0} stroke={light} strokeOpacity={0.35} strokeWidth={0.6} />;
        })}
        <path d={poly(table)} fill={`url(#${fillId}-t)`} stroke={light} strokeOpacity={0.7} strokeWidth={0.8} strokeLinejoin="round" />
        {numeral(ROMAN[tier] || '·', tier >= 7 ? 9.5 : 11.5)}
      </svg>
    );
  }

  if (variant === 'hex7' || variant === 'hex8' || variant === 'hex9' || variant === 'hex10' || variant === 'hex11' || variant === 'hex12' || variant === 'hex13' || variant === 'hex14') {
    // Biseauté (E2) + serti (E3), + arêtes allumées sur le cadre pour E8/E10.
    // E9/E10 = E7/E8 en chiffres romains ; E11 = E10 en police noire ;
    // E12 = E10 en police la plus contrastée ; E13 = E12 sans le cadre serti ;
    // E14 = E12 sans biseautage (pierre lisse).
    const set = variant !== 'hex13';
    const bevel = variant !== 'hex14';
    const frame = hexPts(17.6);
    const stone = set ? hexPts(14) : hexPts(16.8);
    const table = set ? hexPts(8.5) : hexPts(10.2);
    const withEdges = variant === 'hex8' || variant === 'hex10' || variant === 'hex11' || variant === 'hex12' || variant === 'hex13' || variant === 'hex14';
    const roman = variant === 'hex9' || variant === 'hex10' || variant === 'hex11' || variant === 'hex12' || variant === 'hex13' || variant === 'hex14';
    // Fond réel sous le chiffre : la pierre éclaircie par la table (voir dégradé -t).
    const contrastInk = bestInk(bevel ? mixHex(mid, light, 0.3) : mid);
    const [ink, inkStroke] = variant === 'hex11' ? ['#0b0a12', light]
      : variant === 'hex12' || variant === 'hex13' || variant === 'hex14' ? [contrastInk, contrastInk === '#ffffff' ? '#0b0a12' : light]
      : ['#fff', '#0b0a12'];
    const edgePath = set ? frame : stone;
    // Bronze = 0 arête allumée … Prismatique = les 6 (hexagone complet).
    const litCount = Math.max(0, Math.min(tier - 1, 6));
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs>
          <Fill id={fillId} edition={edition} />
          <linearGradient id={`${fillId}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b4560" />
            <stop offset="100%" stopColor="#151320" />
          </linearGradient>
          <linearGradient id={`${fillId}-t`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={light} stopOpacity={0.55} />
            <stop offset="100%" stopColor={light} stopOpacity={0.12} />
          </linearGradient>
        </defs>
        {/* Cadre serti */}
        {set && <path d={poly(frame)} fill={`url(#${fillId}-m)`} stroke={withEdges ? 'none' : light} strokeOpacity={0.9} strokeWidth={1} strokeLinejoin="round" />}
        {set && withEdges && frame.map((p, i) => {
          const q = frame[(i + 1) % 6];
          const on = i < litCount;
          return <path key={i} d={`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`} strokeLinecap="round" strokeWidth={2.6}
            stroke={on ? (tier >= 7 ? RAINBOW[i] : light) : 'rgba(255,255,255,0.12)'} />;
        })}
        {/* Pierre biseautée */}
        <path d={poly(stone)} fill={`url(#${fillId})`} stroke="#0b0a12" strokeWidth={1.2} strokeLinejoin="round" />
        {bevel && stone.map((p, i) => {
          const q = stone[(i + 1) % 6], t1 = table[i], t2 = table[(i + 1) % 6];
          const lit = i === 5 || i === 0;
          const shade = i === 2 || i === 3;
          return <path key={i} d={poly([p, q, t2, t1])} fill={lit ? '#fff' : shade ? '#000' : 'transparent'}
            fillOpacity={lit || shade ? 0.22 : 0} stroke={light} strokeOpacity={0.3} strokeWidth={0.5} />;
        })}
        {bevel && <path d={poly(table)} fill={`url(#${fillId}-t)`} stroke={light} strokeOpacity={0.7} strokeWidth={0.7} strokeLinejoin="round" />}
        {/* Sans sertissage : les arêtes s'allument directement sur le contour de la pierre */}
        {!set && withEdges && edgePath.map((p, i) => {
          const q = edgePath[(i + 1) % 6];
          const on = i < litCount;
          return <path key={i} d={`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`} strokeLinecap="round" strokeWidth={2.6}
            stroke={on ? (tier >= 7 ? RAINBOW[i] : light) : 'rgba(0,0,0,0.45)'} />;
        })}
        {roman
          ? numeral(ROMAN[tier] || '·', tier >= 7 ? 9 : tier >= 4 ? 10.5 : 12, 20.6, ink, inkStroke)
          : numeral(tier ? String(tier) : '·', 14, 20.6, '#fff', '#0b0a12')}
      </svg>
    );
  }

  if (variant === 'hex6') {
    // Synthèse E3 + E4 : cadre serti, pierre teintée avec reflet, gros chiffre arabe.
    const stone = hexPts(14.5);
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs>
          <Fill id={fillId} edition={edition} />
          <linearGradient id={`${fillId}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b4560" />
            <stop offset="100%" stopColor="#151320" />
          </linearGradient>
        </defs>
        <path d={poly(hexPts(18.5))} fill={`url(#${fillId}-m)`} stroke={light} strokeOpacity={0.9} strokeWidth={1} strokeLinejoin="round" />
        <path d={poly(stone)} fill={`url(#${fillId})`} stroke="#0b0a12" strokeWidth={1.2} strokeLinejoin="round" />
        <path d={poly([stone[5], stone[0], stone[1], [20, 14]])} fill="#fff" fillOpacity={0.22} />
        {numeral(tier ? String(tier) : '·', 16.5, 21, '#fff', '#0b0a12')}
      </svg>
    );
  }

  if (variant === 'hex3') {
    // Serti : cadre métal sombre + liseré clair, pierre teintée, chiffre gravé.
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs>
          <Fill id={fillId} edition={edition} />
          <linearGradient id={`${fillId}-m`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4b4560" />
            <stop offset="100%" stopColor="#151320" />
          </linearGradient>
        </defs>
        <path d={poly(hexPts(18.5))} fill={`url(#${fillId}-m)`} stroke={light} strokeOpacity={0.9} strokeWidth={1} strokeLinejoin="round" />
        <path d={poly(hexPts(14))} fill={`url(#${fillId})`} stroke="#0b0a12" strokeWidth={1.2} strokeLinejoin="round" />
        <path d={`M${hexPts(14)[5].join(' ')}L${hexPts(14)[0].join(' ')}L${hexPts(14)[1].join(' ')}`} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} strokeLinejoin="round" />
        {numeral(ROMAN[tier] || '·', tier >= 7 ? 10 : 12.5, 20.8, '#0b0a12', light)}
      </svg>
    );
  }

  if (variant === 'hex4') {
    // Chiffre arabe, plus lisible en petit, reflet sur le haut de la pierre.
    const outer = hexPts(17.5);
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <path d={poly(outer)} fill={`url(#${fillId})`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
        <path d={poly([outer[5], outer[0], outer[1], [20, 13]])} fill="#fff" fillOpacity={0.25} />
        {numeral(tier ? String(tier) : '·', 19, 21)}
      </svg>
    );
  }

  if (variant === 'hex5') {
    // Bronze = 0 arête allumée, +1 par palier ; Prismatique = les 6, arc-en-ciel.
    const outer = hexPts(16.5);
    const litCount = Math.max(0, Math.min(tier - 1, 6));
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
        <defs><Fill id={fillId} edition={edition} /></defs>
        <path d={poly(hexPts(15))} fill={`url(#${fillId})`} fillOpacity={0.85} />
        {outer.map((p, i) => {
          const q = outer[(i + 1) % 6];
          const on = i < litCount;
          return <path key={i} d={`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`} strokeLinecap="round" strokeWidth={3.4}
            stroke={on ? (tier >= 7 ? RAINBOW[i] : light) : 'rgba(0,0,0,0.55)'} />;
        })}
        {numeral(ROMAN[tier] || '·', tier >= 7 ? 10 : 12.5)}
      </svg>
    );
  }

  // hex
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={shadow} aria-hidden>
      <defs><Fill id={fillId} edition={edition} /></defs>
      <path d={CUT_PATHS.prismatic} fill={`url(#${fillId})`} stroke={dark} strokeWidth={1.5} strokeLinejoin="round" />
      <text x="20" y="25" textAnchor="middle" fontSize={tier >= 7 ? 11 : 13} fontWeight={900}
        fontFamily="var(--f-num), system-ui, sans-serif" fill="#fff" stroke={dark} strokeWidth={0.8} paintOrder="stroke">
        {ROMAN[tier] || '·'}
      </text>
    </svg>
  );
}

export const LOGO_EDITIONS = EDITION_ORDER.filter(ed => ed !== 'base');

// ── Logo officiel en jeu ────────────────────────────────────────────────
// Variante retenue après les essais de la page Test visuels : E12 (hexagone
// biseauté, serti, arêtes allumées, chiffre romain à police contrastée).
export const OFFICIAL_EDITION_LOGO: EditionLogoVariant = 'hex12';

// Logo d'édition en ligne (badges, jauges, textes) ; rien pour Normale.
export function EditionIcon({ edition, size = 14 }: { edition?: CardEdition; size?: number }) {
  if (!edition || edition === 'base') return null;
  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'middle', lineHeight: 0 }}>
      <EditionLogo edition={edition} variant={OFFICIAL_EDITION_LOGO} size={size} />
    </span>
  );
}
