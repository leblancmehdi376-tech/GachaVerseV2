#!/usr/bin/env python3
"""
Traite les nouveaux artworks de public/sprites/new_cards_raw/ (déjà nommés
"Nom_Univers_EvoN.ext" par convention, voir lib/game/cardAssets.ts) :
  1. conversion en WebP
  2. recadrage centré au ratio des cartes déjà traitées (300x480, soit 0.625)
  3. écriture dans public/sprites/new_cards_processed/

Les fichiers ne suivant pas la convention de nommage sont ignorés (pool de
sources brutes non triées, encore en attente de traitement manuel).

Usage: python3 scripts/process_new_cards.py
"""

import os
import re
from pathlib import Path

from PIL import Image

RAW_DIR = Path('public/sprites/new_cards_raw')
OUT_DIR = Path('public/sprites/new_cards_processed')
TARGET_W, TARGET_H = 300, 480
TARGET_RATIO = TARGET_W / TARGET_H
NAME_RE = re.compile(r'^([A-Za-z0-9]+_[A-Za-z0-9]+_Evo[0-9]+)\.[A-Za-z]+$')

# Décalage horizontal du centre de recadrage (0.0 = bord gauche, 1.0 = bord
# droit) pour les sources où le sujet n'est pas centré — déterminé par
# inspection visuelle de chaque image large/paysage avant traitement.
X_CENTER_OVERRIDES = {
    'Aatrox_LeagueofLegends_Evo0': 0.40,
    'Carapuce_Pokemon_Evo1': 0.40,
    'Claudio_Tekken_Evo0': 0.53,
    'Claudio_Tekken_Evo1': 0.58,
    'DVa_Overwatch_Evo0': 0.63,
}

# Quand il faut rogner en hauteur (image plus étroite que la cible), on
# privilégie le haut de l'image (visage) plutôt qu'un centrage strict.
VERTICAL_BIAS = 0.35  # 0.5 = centré ; <0.5 = garde davantage le haut


def crop_to_ratio(img: Image.Image, base: str) -> Image.Image:
    w, h = img.size
    ratio = w / h

    if abs(ratio - TARGET_RATIO) < 1e-6:
        return img

    if ratio > TARGET_RATIO:
        # Image trop large : on rogne en largeur.
        new_w = round(h * TARGET_RATIO)
        x_center = X_CENTER_OVERRIDES.get(base, 0.5)
        x0 = round(x_center * w - new_w / 2)
        x0 = max(0, min(x0, w - new_w))
        return img.crop((x0, 0, x0 + new_w, h))
    else:
        # Image trop haute/étroite : on rogne en hauteur.
        new_h = round(w / TARGET_RATIO)
        excess = h - new_h
        y0 = round(excess * VERTICAL_BIAS)
        y0 = max(0, min(y0, h - new_h))
        return img.crop((0, y0, w, y0 + new_h))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(os.listdir(RAW_DIR))

    processed = 0
    skipped = 0

    for fname in files:
        m = NAME_RE.match(fname)
        if not m:
            continue
        base = m.group(1)
        out_path = OUT_DIR / f'{base}.webp'

        try:
            img = Image.open(RAW_DIR / fname).convert('RGBA')
            cropped = crop_to_ratio(img, base)
            resized = cropped.resize((TARGET_W, TARGET_H), Image.LANCZOS)
            resized.save(out_path, 'WEBP', quality=82, method=6)
            processed += 1
            print(f'  ✅ {fname:55s} -> {out_path.name}  ({img.size[0]}x{img.size[1]} -> {TARGET_W}x{TARGET_H})')
        except Exception as e:
            skipped += 1
            print(f'  ❌ {fname}: {e}')

    print(f'\n{processed} carte(s) traitée(s), {skipped} erreur(s).')


if __name__ == '__main__':
    main()
