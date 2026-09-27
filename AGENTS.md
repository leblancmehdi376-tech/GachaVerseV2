<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Patch notes

The game has an in-app Patch Notes popup (accessible from the left navbar in `components/layout/GameLayout.tsx`, rendered by `components/layout/PatchNotesModal.tsx`), backed by `lib/game/patchNotes.ts`.

**At every change made to the game** (feature, rename, rebalance, bugfix, visual tweak, etc.), add a new entry to the top of the `PATCH_NOTES` array in `lib/game/patchNotes.ts` describing what changed, in French, from the player's perspective. Skip this only for changes with no player-visible effect (refactors, internal tooling, this file itself).

Each entry looks like:
```ts
{
  date: '13/09/2026',   // dd/mm/yyyy, date of the change
  title: 'Titre court de la mise à jour',
  changes: [
    "Description du changement, une phrase par ligne.",
  ],
},
```

Don't hesitate to use the richer display to keep notes easy to read:
- Wrap key words in `**double asterisks**` to render them in bold (names, numbers, feature names).
- Keep each line short: one idea per line.
- For bigger updates, use `sections` instead of `changes`, grouping lines by theme with an emoji icon:
```ts
{
  date: '27/09/2026',
  title: 'Maj v2.6',
  sections: [
    {
      icon: '⚔️',
      title: 'Combat',
      changes: [
        "**Paliers 41 à 65** : 25 nouveaux mondes.",
      ],
    },
  ],
},
```
