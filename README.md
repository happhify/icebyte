# IceByte — Take a Byte! 🍦

Landing page + form pre-order untuk **IceByte**, usaha es krim kampus yang dijalankan mahasiswa S1 Teknik Komputer
Telkom University. Domain: **https://icebyte.co**
Satu halaman (single page), tanpa backend, tanpa database, tanpa login — pre-order dikirim lewat link `wa.me`.

**Stack:** Vite · React · TypeScript · Tailwind CSS v4 · Vitest · Oxlint (linter bawaan template Vite terbaru)

---

## 1. Cara menjalankan

Butuh **Node.js 22.12+** (Vitest 5 tidak mendukung Node 20; dites dengan Node 22.17).

```bash
npm install        # sekali saja
npm run dev        # server lokal → buka http://localhost:5173
```

Perintah lain:

| Perintah          | Fungsi                                                |
| ----------------- | ----------------------------------------------------- |
| `npm run build`   | Cek TypeScript + build produksi ke folder `dist/`     |
| `npm run preview` | Menjalankan hasil build secara lokal                  |
| `npm run lint`    | Cek kode dengan Oxlint                                |
| `npm test`        | Menjalankan unit test sekali (`vitest run`)           |
| `npm run test:watch` | Unit test mode watch                               |

### Jalankan dengan Docker

Butuh Docker Desktop (atau Docker Engine + Compose). Node tidak perlu terpasang di laptop.

```bash
docker compose up -d --build   # build image + jalankan container
```

Buka **http://localhost:8088**.

| Perintah                          | Fungsi                                         |
| --------------------------------- | ---------------------------------------------- |
| `docker compose up -d --build`    | Build ulang & jalankan (wajib setelah edit kode/config) |
| `docker compose logs -f web`      | Lihat log nginx                                |
| `docker compose down`             | Hentikan & hapus container                     |
| `ICEBYTE_PORT=9000 docker compose up -d` | Pakai port lain kalau 8088 bentrok      |

Cara kerjanya: `Dockerfile` men-build website dengan Node 22 (test, lint, dan build harus lulus — kalau gagal,
image tidak jadi), lalu hasil `dist/` disajikan oleh nginx (`nginx.conf`). Image ini bersifat produksi, jadi setiap
perubahan di `src/config/site.ts` perlu `docker compose up -d --build` lagi. Untuk edit dengan hot reload, pakai
`npm run dev`.

---

## 2. Struktur folder

```
src/
  config/site.ts      ← SATU-SATUNYA sumber data (harga, menu, bundle, topping/varian, WA, sosmed, FAQ, testimoni)
  types/index.ts      ← tipe data
  lib/order.ts        ← hitung total, validasi (tanggal H-1, antar, nomor WA), builder pesan & link WhatsApp
  lib/order.test.ts   ← unit test logika order
  lib/links.ts        ← link Instagram + deteksi placeholder
  hooks/              ← hook kecil (prefers-reduced-motion)
  components/         ← Navbar, Hero, About, Menu, Bundles, HowToOrder, PreorderForm,
                        ByteSquad, Testimonials, PatchUpdate, Faq, Footer (+ komponen kecil pendukung)
  App.tsx             ← urutan section
  index.css           ← design tokens (warna dari logo, font, radius) + Tailwind
  assets/             ← logo.webp (lengkap), logo-mark.webp (scoop), logo-wordmark.webp (tulisan)
public/
  favicon.png, favicon-192.png, apple-touch-icon.png, og-image.png   ← dibuat dari logo
index.html            ← meta title, description, Open Graph
```

---

## 3. Cara edit konten (`src/config/site.ts`)

Semua teks & angka yang sering berubah ada di **`src/config/site.ts`**. Komponen tidak menyimpan harga/teks produk sendiri,
jadi cukup edit file ini lalu simpan — halaman otomatis ter-update.

### Ubah harga

```ts
{ id: 'karambol', ..., price: 12000, ... }
```

Mengubah `price` langsung mengubah: harga di kartu menu, harga coret & "Hemat RpX" di bundle, pilihan di dropdown form,
subtotal, total, dan isi pesan WhatsApp. Harga bundle diatur di `bundles[].price`; harga normal & hemat dihitung otomatis.

### Tambah/ubah topping & varian

```ts
optionGroups: [
  { id: 'topping', label: 'Topping', choices: ['Saus Karamel', 'Lotus Biscoff', 'Oreo'] },
],
```

Form otomatis menampilkan dropdown untuk setiap grup dan mewajibkan pembeli memilih.

### Produk yang tidak bisa diantar

Saat ini semua menu bisa diantar. Kalau suatu saat ada menu yang tidak bisa diantar, set `deliverable: false`
(opsional `availability: 'Booth/event tertentu'`). Form akan menolak metode **Antar** kalau produk ini — atau bundle yang
berisi produk ini — ada di pesanan, dan kartu menu menampilkan badge "Tidak untuk pengantaran".

### Catatan kemasan otomatis

Isi `packagingNote` di produk (mis. `'Topping dikemas terpisah.'`) supaya catatan itu otomatis muncul di form dan di
pesan WhatsApp kalau produk itu dipesan (termasuk lewat bundle). Saat ini tidak ada produk yang memakainya.

### FAQ, ketentuan, dan cerita

- `faq`: setiap item punya `question`, `answer`, dan `points` opsional (tampil sebagai daftar poin).
- `byteSquad.terms`: daftar ketentuan stamp & referral, satu string = satu poin.
- `about.inspiration`: cerita di balik IceByte, satu string = satu paragraf.
- `delivery.fee`: biarkan `''` supaya ongkos antar tidak ditampilkan; isi (mis. `'Gratis'`) kalau sudah pasti.

### Testimoni

Biarkan `testimonials: []` sampai ada testimoni **asli** (dengan izin pelanggan). Selama kosong, halaman menampilkan ajakan
"Jadilah yang pertama". Format:

```ts
testimonials: [{ name: 'Nama', quote: 'Isi testimoni', source: 'via Instagram' }],
```

### Foto produk

Taruh foto di `public/images/` lalu isi `image: 'images/karambol.jpg'` (tanpa `/` di depan) pada produk. Selama `image` kosong, tampil
placeholder berlabel (`imageLabel`, sekaligus jadi alt text).

### Logo, warna, font, radius

- **Logo** ada di `src/assets/` (versi transparan dari logo asli): `logo.webp` dipakai di footer, `logo-mark.webp` di
  navbar & hero, `logo-wordmark.webp` di navbar. Favicon, apple-touch-icon, dan `og-image.png` (preview link di
  WhatsApp/IG) di `public/` juga dibuat dari logo ini — ganti file dengan nama yang sama kalau logo diperbarui.
- **Warna** diambil dari logo dan disimpan sebagai CSS variables di bagian atas **`src/index.css`**: cokelat
  (`--ib-chocolate`), krim (`--ib-cream`), biru "Ice" (`--ib-ice`, `--ib-ice-deep`), biru muda (`--ib-sky`), coral
  (`--ib-coral`), karamel (`--ib-caramel`). Semua sudah dipetakan ke Tailwind (`bg-cream`, `text-ice-deep`, `bg-coral-soft`, ...).
  Biru asli logo (`--ib-ice`) terlalu terang untuk teks, jadi tombol & teks aksen memakai `--ib-ice-deep` (kontras AA).
- **Font** dimuat dari Google Fonts di `index.html` (Fredoka, Plus Jakarta Sans, JetBrains Mono).

---

## 4. Yang masih perlu diisi / dicek

Semua placeholder sudah terisi (WhatsApp admin: **0882-7947-0512**, di `contact.whatsapp`).

Bagian bertanda **DRAFT** di `src/config/site.ts` sudah terisi tapi sebaiknya dicek ulang oleh tim:

- `about.inspiration` — cerita 10 mahasiswa Teknik Komputer di balik IceByte
- `faq` → daya tahan es krim (±10–15 menit di suhu ruang) dan ketentuan PO acara (min. 20 pcs, H-3, DP 50%)
- `byteSquad.terms` — aturan stamp & referral

Sudah final: kampus **Telkom University**, area antar **sekitar Telkom University**, Instagram **@byte.ice**,
domain **https://icebyte.co**, dan logo. Sengaja tidak ditampilkan: jadwal/titik/jam booth, TikTok, ongkos antar,
dan status halal.

> Harga di config masih **estimasi**: Karambol Rp12.000, Sandwich Rp7.000, Goreng Rp13.000, Byte Pair Rp22.000, Full Stack Rp29.000.

---

## 5. Deploy gratis

Jalankan `npm run build` dulu di lokal untuk memastikan tidak ada error. `vite.config.ts` memakai `base: './'`,
jadi hasil build bisa jalan di root domain maupun sub-folder.

### Opsi A — Vercel (paling mudah)

1. Push project ke repository GitHub.
2. Masuk ke [vercel.com](https://vercel.com) pakai akun GitHub → **Add New… → Project** → pilih repo.
3. Framework terdeteksi **Vite** otomatis (Build: `npm run build`, Output: `dist`). Klik **Deploy**.
4. Hubungkan domain: **Project → Settings → Domains** → tambahkan `icebyte.co`, lalu pasang record DNS yang
   ditampilkan Vercel di tempat kamu membeli domain.

Setiap push ke branch utama otomatis ter-deploy ulang.

### Opsi B — GitHub Pages

1. Push project ke GitHub.
2. Buat file `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy ke GitHub Pages
   on:
     push:
       branches: [main]
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: pages
     cancel-in-progress: true
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 22
             cache: npm
         - run: npm ci
         - run: npm test
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

3. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push ke `main`. Situs tersedia di `https://<username>.github.io/<nama-repo>/`.
5. Untuk domain sendiri: **Settings → Pages → Custom domain** → isi `icebyte.co`, lalu pasang record DNS sesuai
   petunjuk GitHub di tempat kamu membeli domain.

---

## 6. Catatan teknis

- **Alur pre-order:** form memvalidasi input (semua wajib kecuali catatan; jumlah ≥ 1; tanggal minimal besok karena PO
  ditutup H-1; produk non-deliverable tidak bisa diantar; lokasi wajib kalau diantar), lalu membuka
  `https://wa.me/<nomor>?text=<pesan ter-encode>`. Semua logika ada di `src/lib/order.ts` dan dites di `order.test.ts`.
- **Tanggal** dihitung dari jam perangkat pengunjung.
- **Aksesibilitas:** label untuk setiap input, pesan error terhubung via `aria-describedby`, fokus keyboard terlihat,
  FAQ memakai pola accordion ARIA, target sentuh ≥ 44px, animasi mati otomatis saat `prefers-reduced-motion`.
- **Linter:** template Vite terbaru (create-vite 9) memakai **Oxlint** sebagai linter bawaan, bukan ESLint.
  Konfigurasi ada di `.oxlintrc.json`.
