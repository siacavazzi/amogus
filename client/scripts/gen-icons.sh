#!/usr/bin/env bash
# Generate favicon + PWA + OG image assets from a single source PNG.
#
# Usage:
#   ./scripts/gen-icons.sh path/to/sus-party-logo.png
#
# Drop the generated files into client/public/.
# Requires macOS `sips` and `iconutil` (built-in). For PNG -> ICO we use
# ImageMagick if available; otherwise we just keep .png favicons (modern
# browsers handle that fine — the .ico is only for legacy IE/Edge).

set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" || ! -f "$SRC" ]]; then
    echo "Usage: $0 <source.png>"
    echo "  Source should be a square PNG, ideally 1024x1024 or larger."
    exit 1
fi

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public"
mkdir -p "$OUT_DIR"

echo "Generating icons from $SRC into $OUT_DIR"

# PWA icons
sips -Z 192 -s format png "$SRC" --out "$OUT_DIR/logo192.png" >/dev/null
sips -Z 512 -s format png "$SRC" --out "$OUT_DIR/logo512.png" >/dev/null
echo "  ✓ logo192.png"
echo "  ✓ logo512.png"

# Apple touch icon (180x180 is the modern standard)
sips -Z 180 -s format png "$SRC" --out "$OUT_DIR/apple-touch-icon.png" >/dev/null
echo "  ✓ apple-touch-icon.png"

# Open Graph image (1200x630, letterbox the square logo on a dark bg).
# JPG keeps file size under ~150 KB which is well below scraper limits.
if command -v magick >/dev/null 2>&1; then
    magick -size 1200x630 xc:'#0f172a' \
        \( "$SRC" -resize 540x540 \) -gravity center -composite \
        -strip -quality 88 "$OUT_DIR/og-image.jpg"
    rm -f "$OUT_DIR/og-image.png"
    echo "  ✓ og-image.jpg (1200x630, ImageMagick)"
else
    sips -Z 1200 -s format jpeg -s formatOptions 85 "$SRC" --out "$OUT_DIR/og-image.jpg" >/dev/null
    echo "  ✓ og-image.jpg (square fallback — install ImageMagick for proper 1200x630)"
fi

# Favicon — generate a multi-size .ico if ImageMagick is available
if command -v magick >/dev/null 2>&1; then
    magick "$SRC" -define icon:auto-resize=64,48,32,24,16 "$OUT_DIR/favicon.ico"
    echo "  ✓ favicon.ico (multi-size)"
else
    sips -Z 64 -s format png "$SRC" --out "$OUT_DIR/favicon-64.png" >/dev/null
    cp "$OUT_DIR/favicon-64.png" "$OUT_DIR/favicon.ico"
    echo "  ✓ favicon.ico (single size — install ImageMagick for multi-size)"
fi

echo ""
echo "Done. Now run: npm run build"
