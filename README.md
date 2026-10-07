# Premium Perabot — Website

Website promosi Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh.
Katalog produk diambil dari video TikTok [@premiumperabot](https://www.tiktok.com/@premiumperabot).

## Edit kontak
Ubah nomor WhatsApp, Instagram, dan lokasi Google Maps di bagian atas `app.js` (`CONFIG`).

## Perbarui katalog
1. Download video TikTok terbaru dengan yt-dlp ke folder `~/premiumperabot`.
2. Jalankan `python3 build_site.py` lalu `python3 build_pages.py` di folder ini (build_pages memperbarui kode versi file, supaya browser tidak memakai versi lama).
3. Commit dan push — GitHub Pages akan memperbarui situs otomatis.

## Login & akun pelanggan
- Bar atas (semua halaman): **Login · Keranjang · Pesanan Saya**.
- Login punya 3 tab: **Admin** (Google, membuka `admin/`), **Staf** (nama + PIN → membuka `staf/` sudah masuk),
  **Guest** (nomor HP + password; ada Daftar dan Lupa password).
- Tanpa login pengunjung hanya bisa melihat-lihat. Memesan perlu akun; keranjang dan alamat tersimpan di akun.
- Pesanan Saya hanya menampilkan pesanan dari akun itu, plus pesanan lama yang ditambahkan dengan nomor nota.
- Semua data akun ada di aplikasi admin (sheet `AKUN_WEB`). Reset password: Pengaturan → Akun pelanggan website.
