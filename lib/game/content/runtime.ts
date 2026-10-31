// Contenu en ligne actif pour cette session. Fixé par ContentGate AVANT que le
// code du jeu soit chargé ; les fichiers de données (paliers, ennemis,
// personnages, bannières) le lisent une seule fois, au moment où ils sont
// évalués. Aucune donnée de jeu ne doit être importée ici.
import { compareReleaseVersions, type ContentOverrides } from './schema';
import { GAME_VERSION } from '@/lib/game/version';

let loaded: ContentOverrides | null = null;
// Version vue par les fichiers de données : -1 = pas encore lus.
let consumedVersion = -1;

export function setLoadedContent(content: ContentOverrides | null): void {
  loaded = content;
}

export function getLoadedContent(): ContentOverrides | null {
  consumedVersion = loaded?.version ?? 0;
  return loaded;
}

// Vrai si les données de jeu ont déjà été évaluées avec une AUTRE version du
// contenu (ex : passage de /admin vers le jeu sans recharger la page) : il
// faut alors recharger la page pour que le jeu utilise la bonne version.
export function isContentStale(version: number): boolean {
  return consumedVersion !== -1 && consumedVersion !== version;
}

// Majs publiées depuis le configurateur, pour les Patch Notes (ne compte pas
// comme une lecture des données de jeu).
export function getLoadedReleases() {
  return loaded?.releases ?? [];
}

/** Version affichée : celle du code, ou la dernière maj publiée si elle est plus récente. */
export function getDisplayedVersion(): string {
  const v = getLoadedReleases()[0]?.version;
  return v && compareReleaseVersions(v, GAME_VERSION) > 0 ? v : GAME_VERSION;
}
