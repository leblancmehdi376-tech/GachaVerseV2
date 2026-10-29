// Contenu en ligne actif pour cette session. Fixé par ContentGate AVANT que le
// code du jeu soit chargé ; les fichiers de données (paliers, ennemis,
// personnages, bannières) le lisent une seule fois, au moment où ils sont
// évalués. Aucune donnée de jeu ne doit être importée ici.
import type { ContentOverrides } from './schema';

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
