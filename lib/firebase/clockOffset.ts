// Décalage (ms) entre l'horloge de CET appareil et celle de Firestore, mesuré
// une fois par session au login (voir probeClockOffset dans saveGame.ts) puis
// réutilisé en mémoire pour tous les `savedAt`/`lastSaved` de la session —
// sans repayer un aller-retour réseau à chaque sauvegarde.
// Reste à 0 (= horloge locale brute) tant qu'aucune sonde n'a répondu, ce qui
// correspond exactement à l'ancien comportement (pas de régression pour un
// joueur hors-ligne/invité, qui ne se connecte jamais à Firestore).
let clockOffsetMs = 0;

export function setClockOffset(ms: number) {
  clockOffsetMs = ms;
}

// Horloge corrigée : à utiliser pour tout timestamp comparé ENTRE appareils
// (savedAt/lastSaved, "plus récent gagne"). Ne pas utiliser pour un simple
// horodatage local sans enjeu de comparaison cross-device (ex: throttle
// anti-rafale) — Date.now() brut suffit dans ce cas.
export function correctedNow(): number {
  return Date.now() + clockOffsetMs;
}
