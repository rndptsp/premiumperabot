#!/bin/bash
# Update the website's TikTok gallery from your Mac (the cloud can't reach TikTok), then publish.
#   ./update_tiktok.sh          fast: only new posts among the latest 40 (known videos are skipped)
#   ./update_tiktok.sh semua    slow: re-read every post (refreshes view counts too)
# Only captions and cover images are downloaded (no video files) — the website plays videos from TikTok.
# Edits made in the admin app (Katalog Web: title, category, hidden, unggulan) stay in place.
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-baru}"
SRC="${SRC:-$HOME/premiumperabot}"
ACCOUNT="https://www.tiktok.com/@premiumperabot"

command -v yt-dlp >/dev/null || { echo "yt-dlp belum ada. Pasang dulu: brew install yt-dlp"; exit 1; }
git pull --ff-only

count() { python3 -c 'import json,re; print(len(json.loads(re.search(r"window.PRODUCTS = (.*);\n", open("data/products.js").read()).group(1))))'; }
before=$(count)
mkdir -p "$SRC"
# Videos already downloaded (by id) go into yt-dlp's archive so they are skipped without being fetched.
ARCHIVE="$SRC/.sudah-diambil.txt"
python3 - "$SRC" "$ARCHIVE" <<'PY'
import json, pathlib, sys
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
ids = set()
for f in src.rglob("*.info.json"):
    try:
        d = json.loads(f.read_text())
    except (OSError, ValueError):
        continue
    if d.get("_type") != "playlist" and d.get("id"):
        ids.add(str(d["id"]))
out.write_text("".join(f"tiktok {i}\n" for i in sorted(ids)))
print(f"{len(ids)} video sudah ada di {src}")
PY

COMMON=(--skip-download --write-info-json --write-thumbnail --no-write-playlist-metafiles
        --ignore-errors --no-warnings -o "$SRC/%(id)s.%(ext)s")
# A few posts may fail (deleted, private, region-locked); keep going with the rest.
if [ "$MODE" = "semua" ]; then
  echo "Membaca ulang SEMUA video (lama)…"
  yt-dlp "${COMMON[@]}" --sleep-requests 1 "$ACCOUNT" || true
else
  echo "Mencari video baru di 40 postingan terakhir…"
  yt-dlp "${COMMON[@]}" --download-archive "$ARCHIVE" --playlist-end 40 "$ACCOUNT" || true
fi

python3 build_site.py --src "$SRC"
python3 build_pages.py >/dev/null
after=$(count)
echo "Produk di galeri: $before → $after"

# Safety: a missing/partial download folder must never wipe the live gallery.
if [ "$after" -lt $((before * 9 / 10)) ]; then
  git checkout -- data img ./*.html 2>/dev/null || true
  git clean -fdq -- img 2>/dev/null || true
  echo "BATAL: jumlah produk turun terlalu banyak ($before → $after). Website tidak diubah."
  echo "Kemungkinan folder $SRC tidak lengkap. Coba: ./update_tiktok.sh semua"
  exit 1
fi

if git diff --quiet -- data img; then
  echo "Tidak ada perubahan. Selesai."
  exit 0
fi
git add data img ./*.html
git commit -m "Update katalog dari TikTok ($before → $after produk)"
git push
echo "Selesai. Website diperbarui dalam 1–2 menit: https://premiumperabot.com/katalog.html"
