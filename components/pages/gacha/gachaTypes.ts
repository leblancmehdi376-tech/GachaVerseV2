// Types et constantes partagés par les composants du tirage gacha — extraits
// de GachaPage.tsx pour séparer les composants dans leurs propres fichiers.
import { Rarity, CardEdition } from '@/types/game';

export const HIGH_RARITY: Rarity[] = ['L','M','S','CO','P','T'];
export const ULTRA_RARITY: Rarity[] = ['S','CO','P','T'];
export const TEASED_RARITY: Rarity[] = ['P','T']; // déclenchent l'écran de brouillard avant le flip

export type Res = { templateId: string; isNew: boolean; edition: CardEdition };
