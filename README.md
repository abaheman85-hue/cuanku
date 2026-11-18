# CuanKu

CuanKu adalah website catatan keuangan pribadi yang **100% offline**. Semua transaksi, anggaran, wishlist, tabungan, foto, dan pengaturan disimpan di penyimpanan browser (IndexedDB) pada perangkatmu. Tidak ada akun, server, iklan, pelacakan, maupun koneksi internet yang dibutuhkan setelah aplikasi terbuka pertama kali.

Tampilan memakai gaya neobrutalist dengan latar kuning mentega `#FFE76A`, pola titik `#E8CC45`, kartu mint, border hitam tebal, dan maskot koin bernama **Cuan**.

**Versi online:** <https://abaheman85-hue.github.io/cuanku/>

## Fitur

### Transaksi
- Catat pemasukan dan pengeluaran dengan nominal Rupiah bulat, tanpa desimal.
- Pilih kategori, tanggal, dan catatan opsional.
- Ubah atau hapus transaksi dengan dialog konfirmasi.
- Saring berdasarkan bulan dan jenis transaksi.
- Ringkasan pemasukan, pengeluaran, dan saldo per bulan.
- Grafik batang enam bulan terakhir dan rincian pengeluaran per kategori.

### Wishlist
- Halaman **Wishlist** memuat dua tab: **Wishlist** dan **Tabungan**.
- Simpan barang impian beserta foto lokal (dikompres otomatis), tautan toko opsional, dan catatan.
- Atur target harga, dana yang sudah disisihkan, serta rencana tabungan per bulan.
- Masa tunggu 7 hari sebelum berstatus **Siap dibeli**.
- Perkiraan kapan target tercapai berdasarkan rencana tabungan bulanan.
- Konfirmasi tambahan **"Yakin mau beli sekarang?"** jika membeli sebelum masa tunggu selesai atau saat dana belum cukup.
- Perayaan singkat saat barang ditandai sudah dibeli.
- Dana wishlist dicatat terpisah dan **tidak mengurangi saldo transaksi**.

### Tabungan
- Buat target tabungan dengan nama, nominal target, dan catatan opsional.
- Catat setoran kapan saja; progres dan sisa dana dihitung otomatis.
- Setoran **tidak dihitung sebagai pengeluaran** dan tidak memakai anggaran.
- Saat target tercapai, ambil reward **me time** sekali per target.
- Klaim reward membuat satu transaksi pengeluaran nyata kategori **Me time**, maksimal sejumlah dana yang terkumpul.
- Konfirmasi dipakai untuk menghapus target maupun setoran.

### Anggaran
- Halaman **Anggaran** berisi batas pengeluaran per kategori untuk setiap bulan.
- Anggaran bulan baru disalin dari bulan sebelumnya sekali saja, lalu bisa diubah atau dihapus.
- Peringatan muncul di **80%** dan **100%**, sekali per level, per kategori, per bulan.
- Banner langsung terlihat di aplikasi; notifikasi browser bersifat best-effort saat aplikasi terbuka.
- Anggaran **hanya memberi peringatan**, tidak memblokir transaksi dan tidak memotong saldo.

### Pengaturan
- Pengingat harian dengan jam yang bisa diatur dan sakelar aktif/nonaktif.
- Izin notifikasi browser dan tombol uji notifikasi.
- Kategori bawaan (termasuk **Jajan** dan **Me time**) yang bisa ditambah, diubah nama/warnanya, dan dihapus.
- Backup satu file JSON v3 dan impor dengan konfirmasi; backup v1/v2 lama tetap diterima.
- Hapus semua data dan pulihkan kategori bawaan.
- Tombol pasang aplikasi (PWA) jika browser mendukung.

### Lainnya
- Responsif untuk HP, tablet, dan desktop.
- Navigasi bawah di HP, sidebar di layar lebar.
- Tema kuning mentega dengan pola titik, kartu mint, dan maskot koin lokal.
- Font, ikon, dan gambar dibundel lokal — tanpa CDN.
- Bisa dipasang sebagai PWA dan dibuka offline setelah pemuatan pertama.

## Teknologi

- [Vite](https://vite.dev/) + React + TypeScript
- React Router (`HashRouter`) agar bisa di-hosting di folder mana pun
- [Dexie](https://dexie.org/) untuk IndexedDB
- [lucide-react](https://lucide.dev/) untuk ikon
- [Space Grotesk](https://fontsource.org/fonts/space-grotesk) via `@fontsource` (lokal)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) untuk service worker dan manifest
- Vitest + `fake-indexeddb` untuk pengujian lapisan data

## Menjalankan proyek

Prasyarat: Node.js 20 atau lebih baru dan npm.

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite (biasanya `http://localhost:5173`).

Perintah lain:

```bash
npm run typecheck   # cek TypeScript
npm test            # jalankan seluruh unit test
npm run lint        # ESLint
npm run build       # typecheck + build produksi ke folder dist
npm run preview     # jalankan hasil build secara lokal
npm run icons       # buat ulang ikon PNG PWA dari maskot koin lokal
```

## Build dan hosting

```bash
npm run build
```

Hasil build ada di `dist/`. Folder ini bisa diunggah ke hosting statis apa pun (Netlify, Vercel, GitHub Pages, server sendiri, atau bahkan dibuka lewat server lokal). Konfigurasi memakai `base: './'`, jadi aplikasi tetap bekerja saat diletakkan di subfolder.

Karena memakai `HashRouter`, rute seperti `#/transaksi` tidak memerlukan aturan rewrite di server.

### Hosting gratis di GitHub Pages

Repo ini sudah menyertakan alur kerja `.github/workflows/deploy-pages.yml`. Setiap kali kode di-*push* ke branch `main`, GitHub Actions menjalankan `npm ci`, `npm run build`, lalu menerbitkan isi `dist/` ke GitHub Pages. Tidak perlu Netlify atau server lain.

Sekali saja di awal:

1. Buat repo **publik** di GitHub (misalnya `cuanku`). GitHub Pages gratis hanya tersedia untuk repo publik; repo privat butuh paket berbayar.
2. Push proyek ini ke repo tersebut:
   ```bash
   git init
   git add .
   git commit -m "CuanKu v2.1.0"
   git branch -M main
   git remote add origin https://github.com/NAMA_AKUN/cuanku.git
   git push -u origin main
   ```
3. Di GitHub buka **Settings → Pages → Build and deployment**, lalu pilih **Source: GitHub Actions**.
4. Tunggu tab **Actions** selesai (sekitar 1–2 menit). Alamat aplikasi menjadi `https://NAMA_AKUN.github.io/cuanku/`.

Selanjutnya, pembaruan fitur cukup di-push:

```bash
git add .
git commit -m "Tambah fitur X"
git push
```

GitHub Actions membangun ulang dan menerbitkan versi baru otomatis. Karena service worker memakai `autoUpdate`, versi baru terpakai saat aplikasi dibuka berikutnya.

Catatan penting:

- **Alamat situs menjadi "rumah" data.** Data CuanKu tersimpan di IndexedDB per-alamat. Jika alamat berubah (misalnya ganti nama repo), data lama tidak otomatis terbaca — ekspor backup dulu, lalu impor di alamat baru.
- Kode sumber di repo publik hanya berisi program, bukan data keuanganmu. Data tetap di browser masing-masing perangkat.
- Jangan pernah meng-*commit* file backup JSON ke repo publik.

### Unggah manual (tanpa Git)

Jika tidak ingin memasang Git, buka repo GitHub → **Add file → Upload files**, lalu tarik **isi** folder `dist/` (bukan foldernya) ke sana. Setelah itu atur **Settings → Pages → Deploy from a branch → `main` / `root`**. Cara ini bekerja, tetapi setiap pembaruan harus mengunggah ulang file hasil build secara manual.

## Memasang sebagai aplikasi (PWA)

1. Buka CuanKu di browser (Chrome, Edge, Safari, atau browser pendukung PWA lainnya).
2. Pilih menu browser lalu **Install app** / **Add to Home Screen**.
3. Setelah terpasang, CuanKu bisa dibuka dari layar utama seperti aplikasi biasa.

Service worker menyimpan aset aplikasi setelah pemuatan pertama. Jika ingin benar-benar yakin bisa offline, buka aplikasi sekali dalam keadaan online/tersambung ke server, lalu coba matikan jaringan dan muat ulang.

## Batasan notifikasi

Pengingat harian dan peringatan anggaran bersifat **best-effort**:

- Notifikasi web hanya bisa dikirim saat CuanKu atau PWA-nya sedang terbuka. Browser tidak mengizinkan situs menjadwalkan notifikasi saat aplikasi benar-benar tertutup tanpa push server.
- Jika jam pengingat sudah lewat, hari ini belum ada transaksi, dan pengingat belum ditutup, CuanKu menampilkan **banner pengingat di dalam aplikasi** saat dibuka.
- Peringatan anggaran 80%/100% selalu memakai banner di aplikasi. Notifikasi browser hanya tambahan jika izin diberikan.
- Izin notifikasi bisa ditolak atau diblokir browser. Banner dalam aplikasi tetap berfungsi.
- Pengingat memakai waktu perangkat dan tidak memerlukan internet.

## Backup dan data

- Backup diekspor sebagai satu file JSON bernama `cuanku-backup-YYYY-MM-DD.json`.
- Backup v3 menyimpan foto wishlist sebagai data URL dan menyertakan anggaran serta tabungan target, sehingga tetap satu file.
- Impor **mengganti seluruh data** yang ada di perangkat saat itu dan selalu meminta konfirmasi. Selalu buat backup sebelum mengimpor.
- Format impor tetap kompatibel dengan backup **CuanKu v1** dari aplikasi lama (termasuk foto wishlist pada peta `images`/`image_file`), **v2**, dan **v3**.
- Pembaruan skema bersifat aditif: transaksi, wishlist, kategori, dan pengaturan lama tidak dihapus saat aplikasi diperbarui.
- Data tidak disinkronkan ke perangkat lain. Pindahkan data dengan ekspor lalu impor.
- Menghapus data situs di browser (clear site data) juga menghapus data CuanKu. Rutinlah membuat backup.

## Struktur proyek

```text
public/                 ikon PNG, favicon, aset PWA
scripts/                pembuat ikon dan penyiap maskot koin
src/assets/             maskot koin lokal (PNG transparan)
src/
  components/           komponen UI, maskot, grafik, banner, form
  components/layout/    kerangka sidebar, topbar HP, navigasi bawah
  context/              dialog konfirmasi dan toast
  db/                   skema Dexie, data awal, repository, tipe
  hooks/                useLiveQuery dan useReminder
  lib/                  tanggal, uang, wishlist, backup, gambar, notifikasi, tema
  pages/                Beranda, Transaksi, Anggaran, Wishlist, Pengaturan
  styles/               token desain, gaya responsif, tambahan fitur 2.1
  test/                 setup Vitest (fake-indexeddb)
  App.tsx               rute aplikasi
  main.tsx              boot database, font, registrasi PWA
```

## Pengujian

```bash
npm test
```

Unit test mencakup format uang, tanggal, aturan masa tunggu dan perkiraan tabungan, pengaturan, parser backup v1/v2/v3, penyalinan anggaran bulanan, peringatan 80%/100%, pemisahan setoran tabungan, batas klaim reward, serta operasi repository Dexie. Selain itu, alur utama sudah diuji lewat smoke test browser pada build produksi.

## Privasi

CuanKu tidak mengirim data ke mana pun. Satu-satunya tautan keluar adalah tautan toko yang kamu isi sendiri pada wishlist; tautan itu dibuka di tab baru hanya saat kamu menekannya.
