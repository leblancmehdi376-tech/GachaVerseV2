import { type BigNum, bnFromNumber, bnFormat } from '@/lib/game/bignum';

export function formatNumber(n: number | BigNum): string {
  const b = typeof n === 'number' ? bnFromNumber(n) : n;
  return bnFormat(b);
}

// Compte à rebours lisible : "5 h 07 min", "42 min" (jamais "0 min" avant l'échéance).
export function formatTimeLeft(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMin / 60);
  return hours > 0 ? `${hours} h ${String(totalMin % 60).padStart(2, '0')} min` : `${totalMin} min`;
}
