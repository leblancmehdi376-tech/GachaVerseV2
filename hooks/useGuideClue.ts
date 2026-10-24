'use client';
import { useGameStore } from '@/store/gameStore';
import { GUIDE_CLUES, isClueVisible, type GuideClue } from '@/lib/game/nekozGuide';

// Texte d'un indice discret de NekoZ-guide, ou null tant que le joueur n'a pas
// atteint la quête qui le débloque (voir GUIDE_CLUES).
export function useGuideClue(clue: GuideClue): string | null {
  const visible = useGameStore(s => isClueVisible(s.nekozGuide, clue));
  return visible ? GUIDE_CLUES[clue].text : null;
}
