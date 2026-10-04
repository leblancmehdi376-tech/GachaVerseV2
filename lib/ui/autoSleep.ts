import type { SleepDelay } from '@/store/displaySettingsStore';

// Veille automatique (voir hooks/useAutoSleep.ts) : une fenêtre visible sur un
// deuxième écran n'est pas mise en pause par le navigateur, qui continue de
// tout redessiner même quand le joueur est dans un autre jeu.
//  - 'soft' : effets réduits (mode économie forcé, particules arrêtées) ;
//  - 'full' : le jeu n'est plus dessiné du tout, un écran fixe le remplace.
// La logique du jeu (combat, gains, expéditions) tourne normalement dans les
// deux cas.
export type SleepMode = 'awake' | 'soft' | 'full';

export const SLEEP_DELAY_MS: Record<SleepDelay, number | null> = {
  instant: 0,
  '30s': 30_000,
  '2m': 120_000,
  '5m': 300_000,
  never: null,
};

// Réglage « Jamais » : pas de veille complète, mais veille douce au bout de 5 min.
export const SOFT_SLEEP_MS = 300_000;

// Après un clic / toucher / touche sur la fenêtre, le jeu ne se rendort
// qu'après ce délai sans nouvelle action, même en « Immédiat » (cas
// d'un clic qui ne donne pas le focus à la fenêtre, ex. tactile).
export const INPUT_GRACE_MS = 10_000;

export interface SleepInput {
  now: number;
  focused: boolean;
  blurAt: number;        // moment où la fenêtre a perdu le focus
  lastInputAt: number;   // dernier clic / toucher / touche sur la fenêtre
  delay: SleepDelay;
}

function asleepAfter(ms: number, { now, blurAt, lastInputAt }: SleepInput): boolean {
  // Seules les actions faites APRÈS la perte du focus prolongent l'éveil : le
  // clic dans le jeu juste avant d'en sortir ne doit pas retarder la veille.
  if (lastInputAt <= blurAt) return now >= blurAt + ms;
  return now >= Math.max(blurAt + ms, lastInputAt + Math.max(ms, INPUT_GRACE_MS));
}

export function computeSleepMode(input: SleepInput): SleepMode {
  if (input.focused) return 'awake';
  const fullMs = SLEEP_DELAY_MS[input.delay];
  if (fullMs !== null) return asleepAfter(fullMs, input) ? 'full' : 'awake';
  return asleepAfter(SOFT_SLEEP_MS, input) ? 'soft' : 'awake';
}
