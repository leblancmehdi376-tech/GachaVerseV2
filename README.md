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

## Arborescence

```
app/            Routing Next.js (App Router) — peu de routes, l'app est quasi mono-page
components/
  game/         Éléments de gameplay actif (zone de combat, animations, events)
  pages/        Un composant par écran du jeu (Gacha, Collection, Forge, Prestige, ...)
  layout/       Structure globale (layout du jeu, sidebar, auth, maintenance)
  ui/           Composants réutilisables génériques (badges, tooltips, sprites...)
  system/       Écrans système (splash screen, détection d'onglet dupliqué)
lib/
  game/         Logique de jeu pure (formules, gacha, prestige, expéditions...), testée
  firebase/     Accès aux données (sauvegarde, leaderboard, marketplace, sessions...)
store/          État global Zustand, découpé en slices par domaine (store/slices/)
hooks/          Hooks React custom (auth, sauvegarde cloud, tick DPS, toasts...)
types/          Types TypeScript partagés
scripts/        Scripts utilitaires (ex: synchro des pseudos)
public/         Assets statiques (sprites, sons, backgrounds)
```

**Pattern général** : séparation entre logique de jeu pure et testée (`lib/game`), état global (`store`), accès données (`lib/firebase`) et présentation (`components`).

## Stack

Next.js 16 · React 19 · TypeScript · Zustand · Firebase · Tailwind CSS · Vitest
