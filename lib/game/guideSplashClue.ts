// Indice rare de NekoZ-guide sur l'écran de chargement (voir GUIDE_CLUES dans
// nekozGuide.ts). Séparé car l'écran de chargement s'affiche AVANT que le
// code du jeu (et donc le store) ne soit chargé : on lit directement l'état
// du guide dans la sauvegarde locale.
export const SPLASH_CLUE = { text: 'une autre version existe', chance: 1 / 25 } as const;

const SAVE_KEY = 'nekoz-world-v8';

export function rollSplashClue(rnd: () => number = Math.random): string | null {
  try {
    const guide = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')?.state?.nekozGuide;
    return guide && guide.arrivalPrestige != null && rnd() < SPLASH_CLUE.chance ? SPLASH_CLUE.text : null;
  } catch {
    return null;
  }
}
