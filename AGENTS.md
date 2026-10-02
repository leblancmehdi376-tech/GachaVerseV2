<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Responsive design

**Every UI change must work on all screen sizes, mobile first**: phones (~360–430px wide, portrait), tablets, and desktop. Don't design only for the desktop layout.
- Use responsive utilities/breakpoints (e.g. `sm:`, `md:`, `lg:`) to adapt layouts: stack columns, shrink paddings/fonts, wrap or scroll rows instead of overflowing.
- No horizontal page scroll on mobile: avoid fixed widths that exceed the viewport, prefer `max-w-*`, `w-full`, `flex-wrap`, `min-w-0`.
- Touch targets must stay comfortable to tap (~44px), and nothing important may rely on hover only.
- Modals, popups and overlays must fit the mobile viewport (max height with inner scroll, reachable close button).
- Check how existing components already handle mobile (e.g. `components/layout/GameLayout.tsx`) and stay consistent with them.

# Font sizes

**No text may be smaller than 14px**, on every screen size (desktop, tablet and mobile), including labels, badges, counters, tooltips, notification dots and `@media` overrides.
- Applies to inline `fontSize`, CSS `font-size` (in `app/globals.css` and `<style>` blocks) and Tailwind classes (no `text-xs` or `text-[<14px]`).
- Computed sizes (e.g. `size * 0.3`) must be clamped: `Math.max(14, ...)`.
- If 14px text no longer fits its container, fix the layout (widen it, stack label above value, let rows wrap, enlarge the pill/badge) instead of shrinking the text.
- Exception: text drawn inside SVG icons/logos (e.g. numerals in `components/ui/EditionLogo.tsx`), which scales with the icon.

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

**Versioning**: entries are grouped under a version number in the `title` (e.g. `'Maj v2.6.1'`). When updating the patch notes, bump the **last** number of the most recent version by 1 (e.g. `2.6.9` → `2.6.10`) and create a new entry with that version as title. Only change another digit when the user explicitly asks for it.

**Before adding an entry, check whether the previous one is already on `main`**:
1. Read the most recent entry (or entries) at the top of `PATCH_NOTES`.
2. Compare with `main`: `git fetch origin main` then `git show origin/main:lib/game/patchNotes.ts` (or `git diff origin/main -- lib/game/patchNotes.ts`).
3. If the previous entry is **already on `main`**, it is published: never edit it, add a new entry with the bumped version as described above.
4. If the previous entry is **not on `main` yet** (still only on the current branch), don't pile up a new version next to it when that's not needed: **merge your changes into that unpublished entry** (add lines, or switch it to `sections` if it grows), keeping its version number. Also merge several unpublished entries together when they cover related changes, so a single branch ships one or few versions instead of many tiny ones. When merging, remove lines that later changes made outdated or contradictory.

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
