# Panduan Agen — CuanKu (web)

## Konteks

CuanKu adalah website keuangan pribadi **offline-first** berbasis Vite + React + TypeScript. Tidak ada backend, autentikasi, iklan, atau panggilan jaringan saat runtime. Semua data disimpan di IndexedDB lewat Dexie. Aplikasi harus tetap berfungsi offline setelah pemuatan pertama (PWA).

## Perintah

Gunakan `npm.cmd` di PowerShell Windows (bukan `npm.ps1`).

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run icons
```

Sebelum menyatakan pekerjaan selesai, jalankan minimal:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Aturan produk

- Seluruh teks antarmuka memakai **Bahasa Indonesia**.
- Nominal adalah Rupiah bilangan bulat: `Rp 1.500.000` (tanpa desimal).
- Gaya visual neobrutalist: border hitam 3px, shadow keras, warna pastel di latar lavender, sudut 20–28px, tombol pill, tombol utama hitam, font Space Grotesk lokal.
- Maskot **Cuan** adalah uang kertas mint orisinal dengan empat mood: `happy`, `panic`, `sleepy`, `cheering`.
- Jangan menambahkan CDN, font eksternal, analytics, atau permintaan jaringan. Semua aset harus lokal.
- Data wishlist terpisah dari saldo transaksi.
- Backup harus tetap bisa mengimpor file **v1** lama (`images`/`image_file`) dan format v2.
- Impor backup selalu meminta konfirmasi karena mengganti seluruh data.
- Pengingat notifikasi bersifat best-effort; jangan menjanjikan notifikasi saat browser/PWA tertutup.

## Arsitektur

- `src/db/db.ts` — skema Dexie dan seed; `resetDatabase` ada di sini.
- `src/db/repositories.ts` — seluruh operasi data; fungsi menerima database opsional sebagai argumen pertama untuk pengujian.
- `src/lib/backup-format.ts` — validasi dan normalisasi backup v1/v2.
- `src/hooks/useLiveQuery.ts` — langganan Dexie; `querierRef` diperbarui **di dalam effect**, bukan saat render.
- `src/context/Feedback.tsx` — dialog konfirmasi dan toast. Gunakan `useFeedback()`, jangan `window.confirm`.
- `src/components/ui/*` — primitif UI. Pertahankan pola yang ada.
- `src/pages/*` — empat halaman: Beranda, Transaksi, Wishlist, Pengaturan.
- `src/styles/global.css` — token desain dan semua gaya responsif.

## Pola penting

- Dialog form **hanya di-mount saat terbuka** (`if (!open) return null` pada wrapper, lalu komponen dalam menginisialisasi state dari props). Jangan menambahkan effect yang menyinkronkan props ke state; aturan ESLint `react-hooks/set-state-in-effect` akan gagal.
- Untuk membuka form lewat URL, gunakan `?tambah=1` yang diturunkan dari search params (`manualFormOpen || addRequested`), bukan effect. Hapus param saat dialog ditutup.
- Semua tombol ikon harus punya `aria-label`.
- Gunakan dialog konfirmasi untuk aksi destruktif dan impor backup.
- Foto wishlist dikompres lewat canvas sebelum disimpan sebagai data URL.
- `HashRouter` dipakai agar build statis bekerja di subfolder mana pun.
- Jangan mengubah format backup tanpa menjaga kompatibilitas impor v1.

## Pengujian

- Test berada di samping sumber (`src/lib/*.test.ts`, `src/db/repositories.test.ts`) dan memakai `fake-indexeddb` dari `src/test/setup.ts`.
- Saat menambah perilaku data, tambahkan test di file terkait.
- Repository test biasanya membuat database Dexie baru dengan nama unik dan menghapusnya setelah selesai.
