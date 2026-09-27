# 🖼️ Backgrounds des Paliers

Un fichier par palier, nommé `bg_palier_<N>.webp` (N = id du palier dans
`lib/game/paliers.ts`). Actuellement : paliers 1 à 65.

## Specs recommandées
- Format : WebP (convertir les PNG/JPG avant de les ajouter — renommer
  l'extension ne suffit pas, le fichier doit être réellement encodé en WebP)
- Résolution : 1280×720 ou 1920×1080
- Si le fichier est absent → fallback sur le dégradé `bgGradient` du palier
- Au-delà du dernier palier défini dans `PALIERS`, le fond boucle
  (voir `components/game/battle-zone/PalierBg.tsx`)

## Tip
Le jeu applique un overlay sombre sur le bas et le haut de l'image
pour que le HUD reste lisible, donc tu peux mettre des couleurs vives.
