#!/usr/bin/env python3
"""
Convert all PNG/JPG images in a directory to WebP format.
Usage: python3 convert_to_webp.py [path_to_public_folder]
Default path: ./public
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Installation de Pillow...")
    os.system("pip install Pillow --break-system-packages -q")
    from PIL import Image

def convert_to_webp(folder: str, quality: int = 82):
    folder = Path(folder)
    if not folder.exists():
        print(f"❌ Dossier introuvable : {folder}")
        sys.exit(1)

    extensions = {'.png', '.jpg', '.jpeg'}
    files = [f for f in folder.rglob('*') if f.suffix.lower() in extensions]

    if not files:
        print("Aucun fichier PNG/JPG trouvé.")
        sys.exit(0)

    print(f"🔍 {len(files)} fichier(s) trouvé(s) dans {folder}\n")

    total_before = 0
    total_after  = 0
    converted    = 0
    errors       = 0

    for f in files:
        try:
            size_before = f.stat().st_size
            out = f.with_suffix('.webp')

            img = Image.open(f).convert('RGBA')
            img.save(out, 'WEBP', quality=quality, method=6)

            size_after = out.stat().st_size
            reduction  = (1 - size_after / size_before) * 100

            total_before += size_before
            total_after  += size_after
            converted    += 1

            print(f"  ✅ {f.name:40s}  {size_before/1024:>7.1f} Ko → {size_after/1024:>7.1f} Ko  (-{reduction:.0f}%)")
        except Exception as e:
            errors += 1
            print(f"  ❌ {f.name}: {e}")

    print(f"""
{'─'*65}
✅ {converted} fichier(s) convertis  |  ❌ {errors} erreur(s)
📦 Taille avant : {total_before/1024/1024:.2f} Mo
📦 Taille après : {total_after/1024/1024:.2f} Mo
💾 Économie     : {(total_before - total_after)/1024/1024:.2f} Mo ({(1 - total_after/total_before)*100:.0f}% de réduction)

⚠️  Les fichiers .webp ont été créés à côté des originaux.
    Vérifie que tout s'affiche bien, puis supprime les PNG/JPG originaux.
""")

if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else './public'
    convert_to_webp(folder)
