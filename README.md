# Premium Perabot — Website

Website promosi Warehouse Premium Perabot, Tanjung Pauh, Payakumbuh.
Katalog produk diambil dari video TikTok [@premiumperabot](https://www.tiktok.com/@premiumperabot).

## Edit kontak
Ubah nomor WhatsApp, Instagram, dan lokasi Google Maps di bagian atas `app.js` (`CONFIG`).

## Perbarui katalog dari TikTok
Di Mac, dari folder ini: `./update_tiktok.sh`
Script mengambil caption + gambar sampul semua video (tanpa file video), memperbarui jumlah views,
menambah video baru, lalu commit & push. Butuh `yt-dlp` (`brew install yt-dlp`).
Editan di aplikasi (Katalog Web: judul, kategori, sembunyikan, unggulan) tetap berlaku.
Catatan: hanya video yang captionnya menyebut harga (mis. "5 Jutaan") dianggap produk; video pengantaran masuk bagian Pengantaran.

## Login & akun pelanggan
- Bar atas (semua halaman): **Login · Keranjang · Pesanan Saya**.
- Login punya 3 tab: **Admin** (Google, membuka `admin/`), **Staf** (nama + PIN → membuka `staf/` sudah masuk),
  **Guest** (nomor HP + password; ada Daftar dan Lupa password).
- Tanpa login pengunjung hanya bisa melihat-lihat. Memesan perlu akun; keranjang dan alamat tersimpan di akun.
- Pesanan Saya hanya menampilkan pesanan dari akun itu, plus pesanan lama yang ditambahkan dengan nomor nota.
- Semua data akun ada di aplikasi admin (sheet `AKUN_WEB`). Reset password: Pengaturan → Akun pelanggan website.
