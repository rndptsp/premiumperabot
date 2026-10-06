#!/usr/bin/env python3
"""
Build the website pages from pages/*.html (page bodies) + the shared layout below.

    python3 build_pages.py

Each body file starts with two comment lines:
    <!-- nav: Katalog -->            (menu item to highlight)
    <!-- title: Katalog Produk — … --> (browser tab title)
Edit the body files or the layout here, then run this script and commit the generated *.html.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAV = [
    ("index.html", "Beranda"),
    ("katalog.html", "Katalog"),
    ("tentang.html", "Tentang Kami"),
    ("pesan.html", "Pesan"),
    ("lacak.html", "Lacak Pesanan"),
    ("kontak.html", "Kontak"),
]
DESCRIPTION = ("Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh. Kamar set, sofa, meja makan dan lemari model "
               "terbaru dengan harga gudang. Konsultasi gratis, bisa custom, diantar ke rumah.")
WA_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 '
           '18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 '
           '1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 '
           '0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z"/></svg>')

LAYOUT = """<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="Kamar set, sofa, meja makan & lemari langsung dari gudang di Payakumbuh.">
  <meta property="og:image" content="video/hero-poster.jpg">
  <meta name="theme-color" content="#2c2c2c">
  <link rel="icon" href="img/logo-mark.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body data-page="{slug}">
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a href="index.html" class="brand" aria-label="Premium Perabot — Beranda"><img class="logo-mark" src="img/logo-mark.svg" alt="" width="46" height="32"><span class="logo-text"><b>PREMIUM</b><i>PERABOT</i></span></a>
      <nav class="nav" id="site-nav" aria-label="Menu utama">
{nav}
      </nav>
      <div class="topbar-actions">
        <a class="btn btn-wa btn-sm js-wa" href="#" target="_blank" rel="noopener">WhatsApp</a>
        <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="site-nav" aria-label="Buka menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <main>
{body}
  </main>

  <footer class="footer">
    <div class="wrap footer-inner">
      <div>
        <p class="brand brand-light"><img class="logo-mark" src="img/logo-mark.svg" alt="" width="46" height="32"><span class="logo-text"><b>PREMIUM</b><i>PERABOT</i></span></p>
        <p>Tanjung Pauh, Payakumbuh Barat<br>Kota Payakumbuh, Sumatera Barat 26223</p>
      </div>
      <nav class="footer-nav" aria-label="Menu bawah">
{footer_nav}
      </nav>
      <p class="footer-copy">© <span id="year"></span> Warehouse Premium Perabot · <a class="footer-link js-staff" href="#" target="_blank" rel="noopener">Login Staf</a></p>
    </div>
  </footer>

  <a class="wa-float js-wa" href="#" target="_blank" rel="noopener" aria-label="Chat WhatsApp">
    {wa_icon}
  </a>
  <div class="toast" id="toast" role="status" hidden></div>

  <dialog id="player" class="player">
    <div class="player-inner">
      <button class="player-close" id="player-close" aria-label="Tutup">×</button>
      <div class="player-frame"><iframe id="player-iframe" title="Video TikTok" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>
      <div class="player-info">
        <p class="player-cat" id="player-cat"></p>
        <h3 id="player-title"></h3>
        <p class="price" id="player-price"></p>
        <a class="btn btn-wa" id="player-wa" target="_blank" rel="noopener">Tanya via WhatsApp</a>
        <button class="btn btn-outline" id="player-order" type="button" style="margin-top:8px">+ Tambah ke pesanan</button>
        <a class="player-link" id="player-link" target="_blank" rel="noopener">Buka di TikTok ↗</a>
      </div>
    </div>
  </dialog>

  <script src="data/products.js"></script>
  <script src="app.js"></script>
</body>
</html>
"""


def build():
    for body_file in sorted((ROOT / "pages").glob("*.html")):
        slug = body_file.stem
        text = body_file.read_text()
        nav_name = re.search(r"<!-- nav: (.*?) -->", text).group(1)
        title = re.search(r"<!-- title: (.*?) -->", text).group(1)
        body = re.sub(r"<!-- (nav|title): .*? -->\n", "", text).rstrip()
        current = ' aria-current="page"'
        badge = ' <span class="cart-count" id="cart-count" hidden></span>'
        nav = "\n".join(
            f'        <a href="{href}"{current if name == nav_name else ""}>{name}{badge if href == "pesan.html" else ""}</a>'
            for href, name in NAV)
        footer_nav = "\n".join(f'        <a href="{href}">{name}</a>' for href, name in NAV)
        html = LAYOUT.format(title=title, description=DESCRIPTION, slug=slug, nav=nav, body=body,
                             footer_nav=footer_nav, wa_icon=WA_ICON)
        (ROOT / f"{slug}.html").write_text(html)
        print("built", f"{slug}.html")


if __name__ == "__main__":
    build()
