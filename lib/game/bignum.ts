// Représentation des grandeurs économiques non-plafonnées (pixelCoins, PV
// d'ennemi, DPS...) sous forme mantisse/exposant, pour ne jamais déborder vers
// Infinity comme le ferait un double JS classique sur Math.pow(1.13, n) à
// très haut palier (voir bnPow, qui calcule en espace log pour cette raison).
export interface BigNum {
  mantissa: number; // dans [1, 10), sauf pour la valeur zéro
  exponent: number;
}

const ZERO: BigNum = { mantissa: 0, exponent: 0 };
export const BN_ZERO: BigNum = ZERO;

function normalize(mantissa: number, exponent: number): BigNum {
  // Ces grandeurs (coins, PV, DPS) ne sont jamais négatives dans le jeu — un
  // mantissa <= 0 clampe à zéro plutôt que de boucler indéfiniment ci-dessous
  // (mantissa < 1 ne convergerait jamais pour une valeur négative ou nulle).
  if (mantissa <= 0 || !isFinite(mantissa)) return ZERO;
  while (mantissa >= 10) { mantissa /= 10; exponent++; }
  while (mantissa < 1) { mantissa *= 10; exponent--; }
  return { mantissa, exponent };
}

export function bnFromNumber(n: number): BigNum {
  if (!isFinite(n) || n === 0) return ZERO;
  const exponent = Math.floor(Math.log10(Math.abs(n)));
  return normalize(n / Math.pow(10, exponent), exponent);
}

// Sûr uniquement pour des valeurs restant dans les limites de précision d'un
// double (exponent < ~15) — au-delà, utiliser bnFormat/bnCompare, jamais ceci.
export function bnToNumber(b: BigNum): number {
  return b.mantissa * Math.pow(10, b.exponent);
}

// Remplace Math.pow(base, exponent) pour les courbes de croissance à exposant
// non-plafonné : calcule en espace log donc ne déborde jamais vers Infinity,
// quelle que soit la taille de `exponent`.
export function bnPow(base: number, exponent: number): BigNum {
  if (exponent <= 0) return bnFromNumber(1);
  const totalLog = exponent * Math.log10(base);
  const e = Math.floor(totalLog);
  const m = Math.pow(10, totalLog - e);
  return normalize(m, e);
}

export function bnMulScalar(b: BigNum, scalar: number): BigNum {
  if (scalar === 0 || b.mantissa === 0) return ZERO;
  return normalize(b.mantissa * scalar, b.exponent);
}

// Multiplication de deux BigNum (contrairement à bnMulScalar, sûr même si le
// second facteur est lui-même issu d'une courbe non-plafonnée, ex :
// bnPow(1.2, goldUpgradeLevel) où goldUpgradeLevel suit maxPalierReached).
export function bnMul(a: BigNum, b: BigNum): BigNum {
  if (a.mantissa === 0 || b.mantissa === 0) return ZERO;
  return normalize(a.mantissa * b.mantissa, a.exponent + b.exponent);
}

export function bnAdd(a: BigNum, b: BigNum): BigNum {
  if (a.mantissa === 0) return b;
  if (b.mantissa === 0) return a;
  const big = a.exponent >= b.exponent ? a : b;
  const small = a.exponent >= b.exponent ? b : a;
  const diff = big.exponent - small.exponent;
  if (diff > 17) return big; // small est négligeable face à big en précision double
  return normalize(big.mantissa + small.mantissa / Math.pow(10, diff), big.exponent);
}

// Clampe à zéro si b >= a, comme le Math.max(0, a - b) utilisé partout dans
// le combat aujourd'hui.
export function bnSub(a: BigNum, b: BigNum): BigNum {
  if (bnCompare(a, b) <= 0) return ZERO;
  const diff = a.exponent - b.exponent;
  if (diff > 17) return a;
  return normalize(a.mantissa - b.mantissa / Math.pow(10, diff), a.exponent);
}

export function bnCompare(a: BigNum, b: BigNum): number {
  if (a.mantissa === 0 && b.mantissa === 0) return 0;
  if (a.mantissa === 0) return -1;
  if (b.mantissa === 0) return 1;
  if (a.exponent !== b.exponent) return a.exponent > b.exponent ? 1 : -1;
  if (a.mantissa === b.mantissa) return 0;
  return a.mantissa > b.mantissa ? 1 : -1;
}

export const bnGt  = (a: BigNum, b: BigNum): boolean => bnCompare(a, b) > 0;
export const bnGte = (a: BigNum, b: BigNum): boolean => bnCompare(a, b) >= 0;
export const bnLt  = (a: BigNum, b: BigNum): boolean => bnCompare(a, b) < 0;
export const bnLte = (a: BigNum, b: BigNum): boolean => bnCompare(a, b) <= 0;
export const bnMax = (a: BigNum, b: BigNum): BigNum => bnCompare(a, b) >= 0 ? a : b;
export const bnMin = (a: BigNum, b: BigNum): BigNum => bnCompare(a, b) <= 0 ? a : b;
export const bnIsZero = (b: BigNum): boolean => b.mantissa === 0;

// log10(b) en tant que number classique — jamais de débordement (contrairement
// à bnDivRatio) puisqu'il ne dépend que de l'exposant, pas de sa magnitude.
// À utiliser pour tout ratio potentiellement non-borné entre deux BigNum
// (ex : teamDps / seuil), en calculant log10(a) - log10(b) plutôt que a/b.
export function bnLog10(b: BigNum): number {
  if (b.mantissa === 0) return -Infinity;
  return b.exponent + Math.log10(b.mantissa);
}

// Ratio a/b en tant que number classique — SEULEMENT pour des ratios dont on
// sait qu'ils restent bornés (ex : barres de vie currentHp/maxHp, toujours
// dans [0,1]). Si le ratio lui-même peut devenir arbitrairement grand, utiliser
// bnLog10(a) - bnLog10(b) à la place (voir bnLog10) pour ne jamais déborder.
export function bnDivRatio(a: BigNum, b: BigNum): number {
  if (b.mantissa === 0) return 0;
  if (a.mantissa === 0) return 0;
  return (a.mantissa / b.mantissa) * Math.pow(10, a.exponent - b.exponent);
}

// Pont de compat/migration : les anciennes sauvegardes stockent encore ces
// champs en `number` brut (ou `null`/`undefined` si déjà corrompues par le
// bug de débordement vers Infinity que cette migration corrige).
export function coerceBigNum(x: unknown): BigNum {
  if (x == null) return ZERO;
  if (typeof x === 'number') return bnFromNumber(x);
  if (typeof x === 'object' && 'mantissa' in x && 'exponent' in x) {
    const b = x as BigNum;
    return typeof b.mantissa === 'number' && typeof b.exponent === 'number' ? normalize(b.mantissa, b.exponent) : ZERO;
  }
  return ZERO;
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qt', 'Sx', 'Sp', 'Oc', 'No'];

export function bnFormat(b: BigNum): string {
  if (b.mantissa === 0) return '0';
  const suffixIdx = Math.floor(b.exponent / 3);
  if (suffixIdx >= 0 && suffixIdx < SUFFIXES.length) {
    const scaledExp = b.exponent - suffixIdx * 3;
    const display = b.mantissa * Math.pow(10, scaledExp);
    const formatted = display >= 100 ? Math.round(display).toString() : display.toFixed(1).replace(/\.0$/, '');
    return formatted + SUFFIXES[suffixIdx];
  }
  if (suffixIdx < 0) return Math.floor(bnToNumber(b)).toString(); // < 1000, pas de suffixe
  return `${b.mantissa.toFixed(2)}e${b.exponent}`;
}
