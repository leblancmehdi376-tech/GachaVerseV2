#!/usr/bin/env python3
"""
Réduit les sprites d'ennemis trop grands de public/sprites/enemies/.

Un ennemi s'affiche au plus en ~378x315 px CSS (voir EnemySprite dans
components/game/BattleZone.tsx) : au-delà de MAX_SIDE px (de quoi couvrir un
écran 2x), la résolution supplémentaire n'est jamais visible mais coûte
jusqu'à plusieurs Mo de téléchargement. Les webp animés sont redimensionnés
image par image (durées et boucle conservées).

Un fichier n'est réécrit que si la nouvelle version est plus légère.
Après un passage qui modifie des fichiers, incrémenter
ENEMY_SPRITES_ASSET_VERSION (lib/game/enemies.ts) pour que les joueurs ne
gardent pas l'ancienne version en cache.

Usage: python scripts/optimize_enemy_sprites.py [--dry-run]
"""

import sys
from pathlib import Path

from PIL import Image

ENEMIES_DIR = Path('public/sprites/enemies')
MAX_SIDE = 768
QUALITY = 82


def target_size(w: int, h: int) -> tuple[int, int] | None:
    scale = MAX_SIDE / max(w, h)
    if scale >= 1:
        return None
    return max(1, round(w * scale)), max(1, round(h * scale))


def encode(img: Image.Image, size: tuple[int, int], out: Path) -> None:
    n_frames = getattr(img, 'n_frames', 1)
    if n_frames > 1:
        frames, durations = [], []
        for i in range(n_frames):
            img.seek(i)
            # convert() décode l'image : la durée n'est renseignée dans
            # img.info qu'après ce décodage (avant, elle vaut None).
            frame = img.convert('RGBA')
            durations.append(img.info.get('duration') or 100)
            frames.append(frame.resize(size, Image.LANCZOS))
        frames[0].save(out, 'WEBP', save_all=True, append_images=frames[1:],
                       duration=durations, loop=img.info.get('loop', 0),
                       quality=QUALITY, method=6)
    else:
        img.convert('RGBA').resize(size, Image.LANCZOS).save(out, 'WEBP', quality=QUALITY, method=6)


def main() -> None:
    dry_run = '--dry-run' in sys.argv
    before_total = after_total = changed = 0

    for path in sorted(ENEMIES_DIR.rglob('*.webp')):
        with Image.open(path) as img:
            size = target_size(*img.size)
            if not size:
                continue
            before = path.stat().st_size
            tmp = path.with_suffix('.tmp.webp')
            encode(img, size, tmp)
            orig_size = img.size
        after = tmp.stat().st_size
        if after >= before or dry_run:
            tmp.unlink()
            if after >= before:
                continue
        else:
            tmp.replace(path)
        before_total += before
        after_total += after
        changed += 1
        print(f'  {path.relative_to(ENEMIES_DIR)}  {orig_size[0]}x{orig_size[1]} -> {size[0]}x{size[1]}'
              f'  {before / 1024:.0f} Ko -> {after / 1024:.0f} Ko')

    verb = 'seraient réduits' if dry_run else 'réduits'
    print(f'\n{changed} sprite(s) {verb} : {before_total / 1048576:.1f} Mo -> {after_total / 1048576:.1f} Mo')


if __name__ == '__main__':
    main()
