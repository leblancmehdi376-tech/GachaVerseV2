import { type BigNum, bnFromNumber, bnFormat } from '@/lib/game/bignum';

export function formatNumber(n: number | BigNum): string {
  const b = typeof n === 'number' ? bnFromNumber(n) : n;
  return bnFormat(b);
}
