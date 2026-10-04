# GachaVerse

Jeu gacha/idle en React/TypeScript (Next.js App Router) avec Firebase pour le backend et Zustand pour l'état global.

## Démarrage

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` / `npm run start` — build de production
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — tests Vitest

### Moniteur de performances (local)

Tableau de bord en direct des performances graphiques du jeu (FPS, temps de frame, long tasks, mémoire JS, nœuds DOM, animations actives, veille), sur [http://localhost:4321](http://localhost:4321).

- `npm run perf` — moniteur seul (à lancer à côté de `npm run dev`)
- `npm run dev:perf` — moniteur + serveur de développement
- `npm run start:perf` — moniteur + build de production instrumenté + `next start` (chiffres réalistes)

Le capteur (`components/system/PerfReporter.tsx`) n'est chargé qu'en développement, ou dans un build fait avec `NEXT_PUBLIC_PERF_MONITOR=1` (ce que fait `start:perf`). Un `npm run build` normal ne le contient pas. Port modifiable avec `PERF_MONITOR_PORT` (côté jeu : `NEXT_PUBLIC_PERF_MONITOR_URL`). Code : `scripts/perf-monitor/`.

## Arborescence

```
app/            Routing Next.js (App Router) — peu de routes, l'app est quasi mono-page
components/
  game/         Éléments de gameplay actif (zone de combat, animations, events)
  pages/        Un composant par écran du jeu (Gacha, Collection, Forge, Prestige, ...)
  layout/       Structure globale (layout du jeu, sidebar, auth, maintenance)
  ui/           Composants réutilisables génériques (badges, tooltips, sprites...)
  system/       Écrans et outils système (splash screen, onglet dupliqué, veille, capteur de perfs)
lib/
  game/         Logique de jeu pure (formules, gacha, prestige, expéditions...), testée
  firebase/     Accès aux données (sauvegarde, leaderboard, marketplace, sessions...)
store/          État global Zustand, découpé en slices par domaine (store/slices/)
hooks/          Hooks React custom (auth, sauvegarde cloud, tick DPS, toasts...)
types/          Types TypeScript partagés
scripts/        Scripts utilitaires (synchro des pseudos, moniteur de perfs perf-monitor/...)
public/         Assets statiques (sprites, sons, backgrounds)
```

**Pattern général** : séparation entre logique de jeu pure et testée (`lib/game`), état global (`store`), accès données (`lib/firebase`) et présentation (`components`).

## Stack

Next.js 16 · React 19 · TypeScript · Zustand · Firebase · Tailwind CSS · Vitest
