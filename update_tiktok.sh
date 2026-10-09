#!/bin/bash
# Update the website's TikTok gallery: new posts + fresh view counts, then publish.
# Run on your Mac (the cloud can't reach TikTok):   ./update_tiktok.sh
# Only captions and cover images are downloaded (no video files) — the website plays videos from TikTok.
# Edits made in the admin app (Katalog Web: title, category, hidden, unggulan) stay in place.
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:-$HOME/premiumperabot}"
ACCOUNT="https://www.tiktok.com/@premiumperabot"

command -v yt-dlp >/dev/null || { echo "yt-dlp belum ada. Pasang dulu: brew install yt-dlp"; exit 1; }
git pull --ff-only

before=$(grep -o '"id": "[0-9]*"' data/products.js | wc -l | tr -d ' ')
mkdir -p "$SRC"
echo "Mengambil daftar video dari $ACCOUNT …"
# A few posts may fail (deleted, private, region-locked); keep going with the rest.
yt-dlp --skip-download --write-info-json --write-thumbnail --no-write-playlist-metafiles \
  --ignore-errors --no-warnings --sleep-requests 1 \
  -o "$SRC/%(id)s.%(ext)s" "$ACCOUNT" || true

python3 build_site.py --src "$SRC"
python3 build_pages.py >/dev/null
after=$(grep -o '"id": "[0-9]*"' data/products.js | wc -l | tr -d ' ')
echo "Produk di galeri: $before → $after"

if git diff --quiet -- data img; then
  echo "Tidak ada perubahan. Selesai."
  exit 0
fi
git add data img ./*.html
git commit -m "Update katalog dari TikTok ($before → $after produk)"
git push
echo "Selesai. Website diperbarui dalam 1–2 menit: https://premiumperabot.com/katalog.html"
