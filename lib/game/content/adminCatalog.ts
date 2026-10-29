// Catalogue des persos pour la page admin : celle-ci charge les données du
// CODE (sans contenu en ligne appliqué, voir ContentTab), mais la fiche
// « Joueurs » doit connaître les persos publiés depuis le configurateur pour
// les afficher dans une collection et pouvoir les donner à un joueur. Les
// templates en ligne sont reconstruits ici sur des COPIES, sans toucher aux
// données du code.
import { useSyncExternalStore } from 'react';
import type { CharacterTemplate } from '@/types/game';
import { CHARACTER_POOL, getCharacterById } from '@/lib/game/characters';
import { applyCharacterContent } from './apply';
import type { ContentOverrides } from './schema';

let live = new Map<string, CharacterTemplate>();
let version = 0;
const listeners = new Set<() => void>();

/** Persos de la version en ligne (null = aucune version publiée). */
export function setAdminLiveContent(content: ContentOverrides | null): void {
  const touched = Object.keys(content?.characters ?? {})
    .map(id => getCharacterById(id))
    .filter((t): t is CharacterTemplate => !!t)
    .map(t => ({ ...t, forms: t.forms?.map(f => ({ ...f })) }));
  applyCharacterContent(touched, new Set(), new Set(), content);
  live = new Map(touched.map(t => [t.id, t]));
  version++;
  for (const l of listeners) l();
}

/** Perso tel qu'il est en ligne (modifié ou ajouté), sinon celui du code. */
export function adminCharacterById(id: string): CharacterTemplate | undefined {
  return live.get(id) ?? getCharacterById(id);
}

/** Tous les persos jouables : ceux du code (avec leurs modifications en ligne), puis les ajouts. */
export function adminCharacterList(): CharacterTemplate[] {
  const fromCode = CHARACTER_POOL.filter(t => !t.isHero).map(t => live.get(t.id) ?? t);
  const added = [...live.values()].filter(t => !getCharacterById(t.id));
  return [...fromCode, ...added];
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Re-rend le composant quand le catalogue change ; renvoie un numéro de version. */
export function useAdminCatalogVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}
