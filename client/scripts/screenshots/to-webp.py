"""Turn the PNGs capture.spec.js wrote into the site's WebP screenshots.

    python3 scripts/screenshots/to-webp.py [/tmp/sus-screens]

Full size (860 px phones, 2048 px reactor) goes to public/images/gameplay/. The screens in the
round tour under each page's headline also get a 430 px copy in gameplay/sm/ for the small strip.
"""
import pathlib
import sys

from PIL import Image

SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/sus-screens')
OUT = pathlib.Path(__file__).resolve().parents[2] / 'public' / 'images' / 'gameplay'
SMALL = OUT / 'sm'
# Captured for reference only; not used on the site.
SKIP = {'vote-selected', 'reactor-vote-result', 'intruder-caught', 'avatar-screen', 'reactor-victory'}
TOUR = {'role-crew', 'crew-task', 'intruder-cards', 'meeting-ready', 'vote', 'cleanup-task'}
# A phone set to another language shows whichever role it was dealt; the tour calls it role-crew.
RENAME = {'role': 'role-crew'}

SMALL.mkdir(exist_ok=True)
for png in sorted(SRC.glob('*.png')):
    base, _, lang = png.stem.partition('.')
    if base in SKIP:
        continue
    base = RENAME.get(base, base)
    stem = f'{base}.{lang}' if lang else base
    image = Image.open(png).convert('RGB')
    image.save(OUT / f'{stem}.webp', 'WEBP', quality=78, method=6)
    print(f'{stem}.webp')

# Small copies for the tour, from the full-size WebP (cleanup-task comes from an earlier capture).
for full in sorted(OUT.glob('*.webp')):
    if full.stem.partition('.')[0] in TOUR:
        image = Image.open(full).convert('RGB')
        image.resize((430, round(image.height * 430 / image.width)), Image.LANCZOS).save(
            SMALL / full.name, 'WEBP', quality=80, method=6)
