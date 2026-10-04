#!/usr/bin/env python3
"""
Traite les nouveaux artworks de assets-src/new_cards_raw/ (déjà nommés
"Nom_Univers_EvoN.ext" par convention, voir lib/game/cardAssets.ts) :
  1. conversion en WebP
  2. recadrage centré au ratio des cartes déjà traitées (300x480, soit 0.625)
  3. recadrage supplémentaire en 300xFRAME_H (garde le haut, voir FRAME_H
     ci-dessous) pour ne garder que la portion visible une fois le cadre de
     rareté posé dessus
  4. écriture dans public/sprites/new_cards_processed/

Les sources brutes sont hors de public/ : elles pèsent plus de 150 Mo
et le jeu n'affiche que les versions traitées, il n'y a donc aucune
raison de les déployer ni de les rendre téléchargeables.

Les fichiers ne suivant pas la convention de nommage sont ignorés (pool de
sources brutes non triées, encore en attente de traitement manuel).

Usage: python3 scripts/process_new_cards.py [base_name ...]
  Sans argument : traite tous les fichiers de new_cards_raw/ suivant la
  convention. Avec un ou plusieurs "base_name" (ex: Loki_ValkyrieApocalypse_Evo1),
  ne (re)traite que ceux-là.
"""

import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageFilter

RAW_DIR = Path('assets-src/new_cards_raw')
OUT_DIR = Path('public/sprites/new_cards_processed')
TARGET_W, TARGET_H = 300, 480
TARGET_RATIO = TARGET_W / TARGET_H
NAME_RE = re.compile(r'^([A-Za-z0-9]+_[A-Za-z0-9]+_Evo[0-9]+)\.[A-Za-z]+$')

# Le fichier final écrit dans OUT_DIR est recadré à 300xFRAME_H (garde le
# haut) après le recadrage 300x480 ci-dessus : une fois le cadre de rareté
# (CharacterCardThumb, frameOverlay) posé dessus, son bandeau de nom masque
# en permanence le dernier quart de l'image, quelle que soit la rareté
# (mesuré sur le canal alpha des fichiers de public/sprites/frameworks — le
# bas de la fenêtre visible varie entre 72.9% et 76.5% de la hauteur selon
# la rareté). Recadrer à la source évite de gaspiller de la résolution sur
# une zone qui ne s'affiche jamais, et CharacterCardThumb cale son portrait
# sur cette même hauteur (portraitHeightPct) pour rester cohérent. Si tu
# retouches ce nombre, applique aussi le même recadrage aux fichiers déjà
# traités dans OUT_DIR (voir historique git pour le script utilisé).
FRAME_H = 355

# Décalage horizontal du centre de recadrage (0.0 = bord gauche, 1.0 = bord
# droit) pour les sources où le sujet n'est pas centré — déterminé par
# inspection visuelle de chaque image large/paysage avant traitement.
X_CENTER_OVERRIDES = {
    'Aatrox_LeagueofLegends_Evo0': 0.40,
    'Carapuce_Pokemon_Evo1': 0.40,
    'Claudio_Tekken_Evo0': 0.53,
    'Claudio_Tekken_Evo1': 0.58,
    'DVa_Overwatch_Evo0': 0.63,
    # Planche manga : le perso occupe la partie droite du cadre, du texte
    # de titre prend toute la partie gauche.
    'Arthur_FireForce_Evo1': 0.85,
    # Photo : le chien est à droite, un panneau texte "IGLOO PRISONNIER"
    # occupe la partie gauche du cadre.
    'Igloo_NosAnimaux_Evo0': 0.65,
    # Bannière Vol.2
    'Lune_ClairObscur_Evo0': 0.60,
    'AxelBlaze_InazumaEleven_Evo1': 0.42,
    'Fern_Frieren_Evo0': 0.62,
    'Kojiro_TheElusiveSamurai_Evo0': 0.62,
    'LuckyCyan_ToBeHeroX_Evo0': 0.38,
    'LightYagami_DeathNote_Evo0': 0.76,
    'L_DeathNote_Evo0': 0.60,
    'ReiAyanami_Evangelion_Evo0': 0.33,
    'Pappag_OnePiece_Evo0': 0.20,
    # Latios et Latias sur la même image : Latias est la rouge, à droite.
    'Latias_Pokemon_Evo0': 0.80,
    'EnderDragon_Minecraft_Evo1': 0.30,
    'Bastion_Overwatch_Evo1': 0.35,
    'Makima_ChainsawMan_Evo0': 0.42,
    'Makima_ChainsawMan_Evo1': 0.38,
    'Amumu_LeagueofLegends_Evo0': 0.62,
    'Shaco_LeagueofLegends_Evo0': 0.58,
    'Jack8_Tekken_Evo0': 0.27,
    # Recentrages demandés après coup (sujet trop à gauche / à droite).
    'Garp_OnePiece_Evo0': 0.50,
    'Frieren_Frieren_Evo0': 0.45,
    'JosephJoestar_JoJosBizarreAdventure_Evo0': 0.70,
    'Kinger_DigitalCircus_Evo0': 0.37,
    'Pride_FullmetalAlchemistBrotherhood_Evo0': 0.43,
    'Yui_SwordArtOnline_Evo0': 0.42,
    'Yui_SwordArtOnline_Evo1': 0.47,
    'Ahri_LeagueofLegends_Evo0': 0.62,
    'DioBrando_JoJosBizarreAdventure_Evo0': 0.56,
    'SoulEvans_SoulEater_Evo0': 0.36,
    'JillValentine_ResidentEvil_Evo0': 0.42,
    'Shisui_LesCarnetsdelApothicaire_Evo0': 0.43,
    'Hades_ValkyrieApocalypse_Evo0': 0.55,
    'Maliketh_EldenRing_Evo1': 0.68,
    'Capuchon_NosAnimaux_Evo0': 0.58,
    # Bulle de texte japonais sur le bord droit.
    'DioBrando_JoJosBizarreAdventure_Evo1': 0.44,
}

# Zoom par perso (>1 = fenêtre de recadrage plus petite que la plus grande
# possible ; <1 = dézoom, le débordement est comblé par un fond flouté) : permet de décaler le sujet sur l'axe qui ne serait sinon pas
# rogné (ex: remonter un sujet trop bas sur une image paysage), en combinaison
# avec X_CENTER_OVERRIDES / VERTICAL_BIAS_OVERRIDES.
ZOOM_OVERRIDES = {
    'Garp_OnePiece_Evo0': 1.35,
    'Hades_ValkyrieApocalypse_Evo0': 1.1,
    'JosephJoestar_JoJosBizarreAdventure_Evo0': 1.4,
    'DioBrando_JoJosBizarreAdventure_Evo0': 1.3,
    'Emolga_Pokemon_Evo0': 1.4,
    'SoulEvans_SoulEater_Evo0': 1.25,
    'Ryuk_DeathNote_Evo0': 1.5,
    'RyomenSukuna_JujutsuKaisen_Evo0': 1.1,
    # Dézoom : le bas de la fenêtre (flouté) reste caché sous le bandeau.
    'Maliketh_EldenRing_Evo1': 0.8,
    'Makima_ChainsawMan_Evo1': 0.85,
}

# Quand il faut rogner en hauteur (image plus étroite que la cible), on
# privilégie le haut de l'image (visage) plutôt qu'un centrage strict.
VERTICAL_BIAS = 0.35  # 0.5 = centré ; <0.5 = garde davantage le haut

# Override par perso du biais vertical par défaut, pour les sources où le
# sujet est encore plus haut dans le cadre (ex: portrait très allongé).
VERTICAL_BIAS_OVERRIDES = {
    'Loki_ValkyrieApocalypse_Evo1': 0.12,
    # Sujets tout en bas de portraits très allongés.
    'IzukuMidoriya_MyHeroAcademia_Evo3': 0.90,
    'JosephJoestar_JoJosBizarreAdventure_Evo0': 1.0,
    'Temari_Naruto_Evo0': 0.90,
    'Garp_OnePiece_Evo0': 1.0,
    'Garp_OnePiece_Evo2': 1.0,
    'RyomenSukuna_JujutsuKaisen_Evo0': 1.0,
    'Maliketh_EldenRing_Evo1': 0.0,
    'Makima_ChainsawMan_Evo1': 0.0,
    'DioBrando_JoJosBizarreAdventure_Evo0': 1.0,
    'Emolga_Pokemon_Evo0': 1.0,
    'Ryuk_DeathNote_Evo0': 1.0,
    'SoulEvans_SoulEater_Evo0': 0.30,
    'Hades_ValkyrieApocalypse_Evo0': 0.7,
    # Chignon coupé avec le biais par défaut.
    'Gyokuyo_LesCarnetsdelApothicaire_Evo1': 0.05,
}


def crop_to_ratio(img: Image.Image, base: str) -> Image.Image:
    w, h = img.size
    ratio = w / h
    zoom = ZOOM_OVERRIDES.get(base, 1.0)

    if abs(ratio - TARGET_RATIO) < 1e-6 and zoom == 1.0:
        return img

    # Plus grande fenêtre au ratio cible, réduite d'un facteur `zoom`.
    if ratio > TARGET_RATIO:
        new_w, new_h = h * TARGET_RATIO, h
    else:
        new_w, new_h = w, w / TARGET_RATIO
    new_w, new_h = round(new_w / zoom), round(new_h / zoom)

    x_center = X_CENTER_OVERRIDES.get(base, 0.5)
    x0 = round(x_center * w - new_w / 2)
    x0 = max(min(0, w - new_w), min(x0, max(0, w - new_w)))

    vertical_bias = VERTICAL_BIAS_OVERRIDES.get(base, VERTICAL_BIAS)
    y0 = round((h - new_h) * vertical_bias)
    y0 = max(min(0, h - new_h), min(y0, max(0, h - new_h)))

    if new_w <= w and new_h <= h:
        return img.crop((x0, y0, x0 + new_w, y0 + new_h))

    # Zoom < 1 : la fenêtre déborde de l'image, on comble avec une version
    # floutée et agrandie de l'image elle-même.
    scale = max(new_w / w, new_h / h)
    bg = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    bx, by = (bg.width - new_w) // 2, (bg.height - new_h) // 2
    bg = bg.crop((bx, by, bx + new_w, by + new_h)).filter(ImageFilter.GaussianBlur(24))
    bg.paste(img, (-x0, -y0))
    return bg


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(os.listdir(RAW_DIR))
    only = set(sys.argv[1:])

    processed = 0
    skipped = 0

    for fname in files:
        m = NAME_RE.match(fname)
        if not m:
            continue
        base = m.group(1)
        if only and base not in only:
            continue
        out_path = OUT_DIR / f'{base}.webp'

        try:
            img = Image.open(RAW_DIR / fname).convert('RGBA')
            cropped = crop_to_ratio(img, base)
            resized = cropped.resize((TARGET_W, TARGET_H), Image.LANCZOS)
            final = resized.crop((0, 0, TARGET_W, FRAME_H))
            final.save(out_path, 'WEBP', quality=82, method=6)
            processed += 1
            print(f'  ✅ {fname:55s} -> {out_path.name}  ({img.size[0]}x{img.size[1]} -> {TARGET_W}x{FRAME_H})')
        except Exception as e:
            skipped += 1
            print(f'  ❌ {fname}: {e}')

    print(f'\n{processed} carte(s) traitée(s), {skipped} erreur(s).')


if __name__ == '__main__':
    main()
