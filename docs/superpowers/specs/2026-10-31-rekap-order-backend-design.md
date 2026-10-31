# Rekap Order IceByte: Backend + Database + Halaman Admin

- **Tanggal:** 2026-10-31
- **Status:** Disetujui per bagian lewat chat. Menunggu review dokumen.
- **Menggantikan:** rekap via Google Form (commit `3947676`)

## 1. Tujuan

Setiap pesanan yang dikirim lewat form pre-order di website tersimpan otomatis. Tim bisa melihat, mengelola, dan
mengunduh rekapnya sebagai Excel dari satu halaman admin, tanpa Google Form atau Google Sheets.

**Berhasil kalau:**

1. Pesanan dari website langsung muncul di `/admin`, tanpa langkah manual.
2. Admin bisa menyaring per batch, mengubah status, melihat total produksi per rasa, dan mengunduh `.xlsx`.
3. Pesanan dari chat WhatsApp bisa dicatat lewat halaman admin.
4. Pengalaman pembeli tidak berubah: WhatsApp tetap langsung terbuka, dan gangguan server tidak menghalangi pesanan.
5. Langkah setup oleh tim hanya di dashboard Vercel (±5 menit, tanpa SQL, tanpa akun selain Vercel).

## 2. Keputusan yang sudah diambil

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Pendekatan | Backend + database sendiri (opsi C) | Pilihan tim, tidak bergantung pada Google |
| Hosting | Tetap di Vercel (`icebyte.vercel.app`), Vercel Functions di `api/` | Sudah live di sana, satu repo, satu proyek |
| Database | Neon Postgres lewat Vercel Marketplace | Tanpa akun terpisah; `DATABASE_URL` tersambung otomatis |
| Login admin | Satu password bersama (`ADMIN_PASSWORD`) | Paling sederhana, tanpa layanan tambahan |
| Pesanan chat WA | Diinput dari halaman admin; mode `?admin` publik dihapus | Input jadi terkunci password |
| Fitur admin | Tabel + filter batch, ubah status, ringkasan produksi, unduh Excel | Dipilih tim |

## 3. Arsitektur

```
icebyte/
  api/                          Vercel Functions (tipis: parsing HTTP → panggil server/)
    orders.ts                   POST   publik: simpan pesanan dari website
    admin/login.ts              POST   cek password → set cookie sesi
    admin/logout.ts             POST   hapus cookie sesi
    admin/orders.ts             GET    daftar pesanan (?batch=)  ·  POST tambah pesanan chat WA
    admin/orders/[id].ts        PATCH  ubah status
  server/                       Logika backend murni, dites dengan Vitest
    db.ts                       koneksi Neon + CREATE TABLE IF NOT EXISTS (sekali per instance)
    repository.ts               interface OrderRepository + implementasi Postgres
    orders.ts                   parse & validasi input, susun record (pakai src/lib/order.ts)
    session.ts                  tanda tangan/verifikasi cookie (HMAC-SHA256)
    time.ts                     waktu "sekarang" dalam WIB
    http.ts                     helper respons JSON & error
  admin.html                    entry Vite kedua (halaman admin, bundle terpisah)
  src/admin/                    React: App, LoginForm, BatchFilter, ProductionSummary, OrderTable, AddOrderDialog
  src/admin/production.ts       hitung ringkasan produksi (murni, dites)
  src/admin/excel.ts            susun baris Excel (murni, dites) + unduh via write-excel-file
  src/components/LineEditor.tsx dipisah dari PreorderForm.tsx supaya dipakai ulang admin
  vercel.json                   cleanUrls (/admin → admin.html)
```

**Batas tanggung jawab:**

- `src/lib/order.ts` tetap menjadi satu-satunya sumber aturan pesanan: harga, validasi, ringkasan item, dan ID order.
  Dipakai bersama oleh browser dan server.
- `api/*` hanya menerjemahkan HTTP. Semua keputusan ada di `server/*`, yang menerima `OrderRepository` lewat
  parameter, sehingga bisa dites dengan repository tiruan di memori.
- Halaman admin adalah entry Vite terpisah, jadi website publik tidak ikut memuat kode admin maupun library Excel.

**Tambahan dependensi:** `@neondatabase/serverless` (server), `write-excel-file` (admin, dimuat saat tombol unduh
diklik), `@vercel/node` (dev, tipe saja). TypeScript untuk `api/` dan `server/` dicek lewat `tsconfig.server.json`
yang dirujuk dari `tsconfig.json`, sehingga `npm run build` tetap memeriksa semuanya.

## 4. Data

Satu tabel. Dibuat otomatis oleh `server/db.ts` (`CREATE TABLE IF NOT EXISTS`) saat pertama kali dipakai.

```sql
CREATE TABLE IF NOT EXISTS orders (
  id            text PRIMARY KEY,                 -- "IB-1031-K3F9"
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL CHECK (source IN ('Website', 'Chat WA')),
  batch         text NOT NULL,                    -- nama batch, mis. "Batch 1"
  delivery_date date NOT NULL,                    -- fulfillmentDate batch
  name          text NOT NULL,
  phone         text NOT NULL,
  method        text NOT NULL CHECK (method IN ('pickup', 'delivery')),
  address       text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  admin         text NOT NULL DEFAULT '',         -- label admin WA tujuan, mis. "Admin 1"
  lines         jsonb NOT NULL,                   -- baris pesanan asli: [{kind, itemId, qty, options}]
  units         jsonb NOT NULL,                   -- snapshot produksi: [{product, variant, qty}]
  items_summary text NOT NULL,                    -- teks satu sel, dari summarizeOrder()
  total         integer NOT NULL,                 -- dihitung server, rupiah
  status        text NOT NULL DEFAULT 'Baru'
                CHECK (status IN ('Baru', 'Lunas', 'Diantar', 'Batal'))
);
CREATE INDEX IF NOT EXISTS orders_batch_idx ON orders (batch, created_at);
```

**Snapshot saat pesanan disimpan:** nama produk, varian, isi bundle, dan total disimpan apa adanya (`units`,
`items_summary`, `total`). Kalau menu atau harga di `site.ts` berubah (misalnya produk dihapus seperti Roasted Milk
Tea), rekap lama tetap benar.

`units` adalah isi pesanan yang sudah dipecah ke satuan produksi. Contoh: 1× Byte Trio menjadi
`[{product:"Es Krim Gabin", variant:"Oreo Mint", qty:1}, {…Strawberry…}, {…Cokelat…}]`. Varian ditulis sebagai label
pilihan (beberapa grup digabung dengan " / "), atau kosong kalau produk tanpa varian.

## 5. API

Semua body dan respons berupa JSON. Error berformat `{ "error": "pesan", "fields"?: {...} }`.

### `POST /api/orders` (publik)

```jsonc
{
  "id": "IB-1031-K3F9",
  "name": "Rara", "phone": "0812-3456-7890",
  "method": "delivery", "address": "Kos Melati No. 3", "notes": "",
  "admin": "Admin 1",
  "lines": [{ "kind": "bundle", "itemId": "byte-trio", "qty": 1, "options": {} }],
  "website": ""                    // honeypot; harus kosong
}
```

| Hasil | Kode |
| --- | --- |
| Tersimpan | `201 { id }` |
| ID sudah ada (klik kirim berulang) | `200 { id, duplicate: true }`, data lama tidak ditimpa |
| Honeypot terisi | `201 { id }` palsu, tidak disimpan |
| Input tidak valid | `400 { error, fields }` |
| Di luar masa batch | `409 { error }` |
| Body > 16 KB / bukan JSON | `413` / `415` |
| `DATABASE_URL` tidak ada / DB gagal | `503 { error: "Database belum tersambung" }` |

**Validasi server** (`server/orders.ts`):

- Bentuk data diperiksa ketat: `id` cocok `^IB-\d{4}-[A-HJ-NP-Z2-9]{4}$`; nama ≤ 80, WA ≤ 30, alamat ≤ 200,
  catatan ≤ 300 karakter; 1–20 baris; `qty` bilangan bulat 1–99; `admin` harus salah satu label di config.
- Lalu `validateOrder()` dari `src/lib/order.ts` (item ada di menu, varian valid, metode, alamat, batch buka), dengan
  waktu "sekarang" dalam WIB.
- `total` dan `items_summary` dihitung ulang di server; nilai dari browser diabaikan.

### `POST /api/admin/login` · `POST /api/admin/logout`

Login: `{ "password": "..." }` menghasilkan `204` + `Set-Cookie`, atau `401` setelah jeda ±1 detik. Logout:
`204` + cookie dihapus.

### `GET /api/admin/orders?batch=Batch%201` (perlu sesi)

`200 { orders: Order[], batches: string[] }`. Tanpa `batch` berarti semua. Urut dari yang terbaru. `batches` berisi
nama batch dari config ditambah nama batch yang ada di data (supaya batch lama yang sudah dihapus dari config tetap
bisa disaring).

### `POST /api/admin/orders` (perlu sesi)

Body sama dengan endpoint publik, plus `"batch": "Batch 1"` (wajib, harus ada di config), tanpa `id` dan
`website`. Server membuat ID sendiri, memberi `source = 'Chat WA'`, dan **tidak** memeriksa apakah batch sedang buka.
Hasilnya `201 { order }`.

### `PATCH /api/admin/orders/:id` (perlu sesi)

`{ "status": "Lunas" }` menghasilkan `200 { order }`, `400` untuk status tidak dikenal, atau `404`. `updated_at`
ikut diperbarui.

Semua `/api/admin/*` tanpa sesi valid membalas `401`.

## 6. Waktu (WIB)

Server Vercel berjalan dalam UTC, sedangkan logika batch di `src/lib/order.ts` memakai getter waktu lokal.
`server/time.ts` → `nowInJakarta()` mengambil komponen tanggal dan jam `Asia/Jakarta` lewat `Intl.DateTimeFormat`,
lalu membuat `Date` lokal dari komponen itu, sehingga `getOpenBatch()` dan `createOrderId()` menghasilkan tanggal WIB
di zona waktu server mana pun. `created_at` disimpan sebagai `timestamptz` dan ditampilkan di admin dengan
`timeZone: 'Asia/Jakarta'`.

## 7. Alur di website publik

`PreorderForm` saat tombol "Kirim ke WhatsApp" ditekan (validasi browser lolos):

1. Buat ID (seperti sekarang, termasuk logika "klik berulang tanpa perubahan = ID sama").
2. `fetch('/api/orders', { method: 'POST', keepalive: true, ... })` tanpa ditunggu; error diabaikan. Body ikut
   membawa nilai honeypot `website` dari input tersembunyi di form (`aria-hidden`, `tabIndex={-1}`,
   `autoComplete="off"`, disembunyikan lewat CSS).
3. Langsung buka WhatsApp dengan pesan yang memuat ID order.

Dihapus: `orderLog` (config dan tipe), `buildOrderLogFormBody`, `buildOrderLogRecord`, `OrderLogRecord`, mode
`?admin`, dan bagian README "Rekap order (Google Form → Google Sheets)". Tetap dipakai: `createOrderId`,
`summarizeOrder`. `LineEditor` dipindah ke `src/components/LineEditor.tsx` tanpa perubahan perilaku.

## 8. Halaman admin (`/admin`)

- **Belum login:** satu kolom password dan tombol Masuk.
- **Sudah login,** dari atas ke bawah:
  1. **Filter batch:** dropdown berisi batch dan "Semua". Defaultnya batch yang sedang buka; kalau tidak ada, batch
     terakhir di config.
  2. **Ringkasan produksi** (`src/admin/production.ts`), tanpa menghitung pesanan Batal: total qty per
     produk+varian dari `units`, total pcs, total omzet, dan jumlah pesanan per status.
  3. **Tabel pesanan:** ID, waktu (WIB), sumber, nama, WA (tautan `wa.me`), metode/lokasi, pesanan, total, catatan,
     dan dropdown status. Di layar kecil, tiap pesanan tampil sebagai kartu. Perubahan status langsung tampil di
     layar dan kembali seperti semula disertai pesan kalau gagal.
  4. **Unduh Excel:** `IceByte-Rekap-<batch>.xlsx` dengan sheet **Pesanan** (kolom sama dengan tabel) dan sheet
     **Produksi** (produk, varian, jumlah, plus baris total). Library dimuat lewat dynamic import.
  5. **Tambah pesanan dari chat WA:** dialog berisi nama, WA, `LineEditor`, metode, lokasi, catatan, admin, dan
     batch. Setelah tersimpan, ID ditampilkan dengan tombol salin, dan tabel diperbarui.
  6. **Keluar.**
- Gaya visual mengikuti website (token warna dan Tailwind yang sama), dengan `<meta name="robots" content="noindex">`.
- Respons `401` mengembalikan admin ke login. Gagal jaringan menampilkan banner "Gagal memuat" dengan tombol Coba lagi.

## 9. Keamanan

- **Sesi:** cookie `ib_admin` berisi `<expiry>.<HMAC-SHA256(expiry, SESSION_SECRET)>`, dengan atribut `HttpOnly;
  Secure; SameSite=Strict; Path=/api/admin; Max-Age=2592000` (30 hari). Verifikasi memakai `timingSafeEqual`.
- **Password:** dibandingkan lewat hash SHA-256 kedua sisi dengan `timingSafeEqual`, sehingga panjangnya tidak bocor.
  Gagal login diberi jeda ±1 detik.
- **CSRF:** `SameSite=Strict` ditambah kewajiban `Content-Type: application/json` pada semua mutasi.
- **Endpoint publik** hanya bisa menambah data, dengan validasi ketat, honeypot, batas ukuran body, dan ID idempoten.
  Rate limit di Vercel Firewall bisa ditambahkan nanti kalau ada spam (di luar cakupan).
- **Data pribadi** (nama, WA, alamat) hanya bisa dibaca lewat `/api/admin/*`. Isi Excel ditulis sebagai sel string,
  bukan rumus.

## 10. Penanganan error

| Situasi | Perilaku |
| --- | --- |
| Penyimpanan gagal di website publik | Diam saja; WhatsApp tetap terbuka; admin bisa input manual dari chat |
| `DATABASE_URL` belum ada | API `503`; form publik tetap jalan; admin menampilkan "Database belum tersambung" |
| `ADMIN_PASSWORD` / `SESSION_SECRET` belum ada | Login `503` dengan pesan "Password admin belum diatur" |
| Ubah status gagal | Kembali ke status sebelumnya + pesan |
| Sesi kedaluwarsa | Kembali ke layar login |

## 11. Pengujian

**Vitest (unit, tanpa jaringan)**, `include` diperluas ke `server/**/*.test.ts`:

- `server/orders.test.ts`: input valid tersimpan; total palsu diabaikan; item, varian, atau admin tidak dikenal
  ditolak; batas panjang; batch tutup `409`; honeypot; ID duplikat `200 duplicate`; pesanan admin melewati cek batch
  dan memberi sumber Chat WA.
- `server/time.test.ts`: 31 Okt 23:30 UTC = 1 Nov WIB; batas `orderEnd` di jam 00:00 WIB.
- `server/session.test.ts`: token valid, kedaluwarsa, tanda tangan salah, dan format rusak.
- `src/admin/production.test.ts`: Byte Trio dipecah per rasa; pesanan Batal tidak dihitung; total omzet.
- `src/admin/excel.test.ts`: kolom dan urutan sheet Pesanan dan Produksi.
- Handler API dites dengan `OrderRepository` di memori.
- Tes yang sudah ada tetap lolos, setelah tes Google Form diganti tes `summarizeOrder`/`createOrderId`.

**Uji nyata di Preview Deployment Vercel** (push branch → URL preview, setelah database dan env diatur untuk
lingkungan Preview dan Production): pesan dari form; cek muncul di `/admin`; klik kirim dua kali tetap satu baris;
ubah status; tambah pesanan chat WA; unduh Excel dan buka filenya; login salah ditolak; cek tampilan HP. Baru setelah
itu digabung ke `main`.

## 12. Setup oleh tim (sekali saja)

1. Vercel → proyek **icebyte** → **Storage → Create Database → Neon** → Connect ke lingkungan Production dan Preview.
2. **Settings → Environment Variables:** `ADMIN_PASSWORD` (password pilihan tim) dan `SESSION_SECRET` (string acak
   ≥ 32 karakter, dibuatkan saat implementasi), untuk Production dan Preview.
3. Push branch, uji di URL preview, lalu gabung ke `main`.

Pengembangan lokal untuk API memakai `vercel dev` (perlu Vercel CLI dan `vercel env pull`). `npm run dev` tetap
jalan untuk website publik. Setup Docker/nginx hanya menyajikan website statis tanpa API dan admin, dan ini dicatat
di README.

## 13. Di luar cakupan

Pencarian, edit isi pesanan, hapus pesanan, akun per admin, riwayat perubahan, grafik, notifikasi, rate limiting,
dan pembayaran online.
