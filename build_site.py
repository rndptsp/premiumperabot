#!/usr/bin/env python3
"""
Generate the product catalog (data/products.js) and thumbnails (img/) for the
Premium Perabot website from yt-dlp TikTok downloads.

Usage:
    python3 build_site.py                       # reads ~/premiumperabot
    python3 build_site.py --src /path/to/downloads

Re-run after downloading new TikTok posts to refresh the catalog.
Requires macOS `sips` (built in) for thumbnail resizing.
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

SITE = Path(__file__).resolve().parent
IMG_DIR = SITE / "img"
DATA_FILE = SITE / "data" / "products.js"

CATEGORIES = [
    ("kamarset", r"kamar\s*set|kamrset|kamarset|dipan|ranjang"),
    ("sofa", r"sofa|kursi tamu|jaguar|letter\s*l|sudut"),
    ("meja-makan", r"meja makan"),
    ("lemari", r"lemari|bufet|buffet|rak"),
    ("meja-kursi", r"meja|kursi|tempat duduk|backdrop"),
]
DELIVERY = r"pengantaran|pengangkutan|meluncur|kerumah|ke rumah|antar|costumer|customer|pelanggan"


def clean_title(desc: str) -> str:
    text = re.sub(r"#\S*", "", desc)
    text = text.split("Ada Promo")[0]
    text = re.sub(r"[✅🤩☎️📍]", "", text)
    text = re.sub(r"\s+", " ", text).strip(" -,.")
    # common typos in captions
    for wrong, right in {"Kamrset": "Kamarset", "Minimalos": "Minimalis", "Meeah": "Mewah",
                         "Kutaan": "Jutaan", "Keramim": "Keramik", "Epegan": "Elegan", "dnegan": "dengan", "busa": "bisa"}.items():
        text = text.replace(wrong, right)
    return text[:90]


PRICE_IN_TITLE = re.compile(
    r"(?:\b(?:harga|mulai|cuma|hanya)\s*)?(?:rp\.?\s*)?"
    r"(?:\d{1,3}(?:\.\d{3}){1,2}|\d+\s*-\s*\d+\s*(?:jt|jut)\w*|\d+(?:[.,]\d+)?\s*(?:jt|jut)\w*|\d+,\d{1,2}\b)(?:-?an\b)?",
    re.I)


def strip_price(title: str) -> str:
    """Remove prices from a caption title: the website shows 'Call / WhatsApp' instead of TikTok prices."""
    text = PRICE_IN_TITLE.sub("", title)
    text = re.sub(r"\s+([,.])", r"\1", re.sub(r"\s+", " ", text))
    return text.strip(" -,.:")


def parse_price(text: str):
    """Return (value_in_juta, label) or (None, None)."""
    m = re.search(r"(\d{1,3}(?:\.\d{3}){2})", text)  # 5.950.000
    if m:
        rp = int(m.group(1).replace(".", ""))
        return rp / 1_000_000, "Rp " + m.group(1)
    m = re.search(r"(\d+)\s*-\s*(\d+)\s*jut", text, re.I)  # 5-8 Jutaan
    if m:
        return float(m.group(1)), f"Rp {m.group(1)}–{m.group(2)} Jutaan"
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:jt|jut)", text, re.I)  # 5 Jutaan, 3jutaan
    if m:
        v = float(m.group(1).replace(",", "."))
        return v, f"Rp {m.group(1)} Jutaan"
    m = re.search(r"\b(\d+),(\d{1,2})\b", text)  # "7,95 Fullset" -> 7.95 juta
    if m and "promo" in text.lower():
        v = float(f"{m.group(1)}.{m.group(2)}")
        return v, f"Rp {m.group(1)},{m.group(2)} Juta"
    return None, None


def category_of(text: str) -> str:
    low = text.lower()
    for name, pattern in CATEGORIES:
        if re.search(pattern, low):
            return name
    return "lainnya"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--src", default=str(Path.home() / "premiumperabot"))
    args = p.parse_args()
    src = Path(args.src).expanduser()

    IMG_DIR.mkdir(exist_ok=True)
    DATA_FILE.parent.mkdir(exist_ok=True)

    products, deliveries = [], []
    for info_path in sorted(src.rglob("*.info.json")):
        data = json.loads(info_path.read_text())
        if data.get("_type") == "playlist":
            continue
        vid = str(data["id"])
        desc = (data.get("description") or "").strip()
        title = strip_price(clean_title(desc))
        if not title:
            continue

        stem = info_path.name.removesuffix(".info.json")
        thumb_src = next((info_path.with_name(stem + ext) for ext in (".image", ".jpg", ".jpeg", ".webp")
                          if info_path.with_name(stem + ext).exists()), None)
        if not thumb_src:
            continue
        thumb_out = IMG_DIR / f"{vid}.jpg"
        if not thumb_out.exists():
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "70",
                            "-Z", "640", str(thumb_src), "--out", str(thumb_out)],
                           check=True, capture_output=True)

        d = data.get("upload_date") or ""
        item = {
            "id": vid,
            "title": title,
            "date": f"{d[:4]}-{d[4:6]}-{d[6:]}" if len(d) == 8 else "",
            "views": data.get("view_count") or 0,
            "likes": data.get("like_count") or 0,
            "img": f"img/{vid}.jpg",
            "url": data.get("webpage_url") or f"https://www.tiktok.com/@premiumperabot/video/{vid}",
        }
        price, _ = parse_price(desc)
        if price is not None:  # a price in the caption marks a product post; the price itself is not published
            cat = category_of(title)
            item.update(cat=cat if cat != "lainnya" else category_of(desc))
            products.append(item)
        elif re.search(DELIVERY, desc, re.I):
            deliveries.append(item)

    products.sort(key=lambda x: x["date"], reverse=True)
    deliveries.sort(key=lambda x: x["views"], reverse=True)
    stats = {
        "posts": len(list(src.rglob("*.info.json"))),
        "views": sum(json.loads(f.read_text()).get("view_count") or 0 for f in src.rglob("*.info.json")),
    }
    DATA_FILE.write_text(
        "// Generated by build_site.py — do not edit by hand.\n"
        f"window.PRODUCTS = {json.dumps(products, ensure_ascii=False)};\n"
        f"window.DELIVERIES = {json.dumps(deliveries[:8], ensure_ascii=False)};\n"
        f"window.STATS = {json.dumps(stats)};\n"
    )
    cats = {}
    for x in products:
        cats[x["cat"]] = cats.get(x["cat"], 0) + 1
    print(f"{len(products)} products {cats}, {len(deliveries)} delivery posts -> {DATA_FILE}")


if __name__ == "__main__":
    main()
