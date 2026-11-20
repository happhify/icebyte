# Upload bukti bayar di website

## Kenapa
Pembeli sudah bayar QRIS tapi bukti bayar hanya dikirim manual lewat chat WA, dan pesanan baru tercatat kalau tombol
kirim ditekan. Dengan upload di website, setiap pesanan tersimpan **bersama** bukti bayarnya di dashboard admin, jadi
admin bisa cek lalu tandai Lunas tanpa mencari-cari foto di chat. WhatsApp tetap dipakai sebagai konfirmasi & notifikasi.

## Tujuan / bukan tujuan
- Tujuan: pembeli upload bukti bayar di panel QRIS → pesanan + foto tersimpan → tombol konfirmasi ke WA admin.
  Admin melihat bukti bayar per pesanan di `/admin`.
- Bukan tujuan: verifikasi pembayaran otomatis, kompres/resize foto, upload bukti untuk pesanan "Chat WA" di admin,
  Vercel Blob.
- Gagal kalau: bukti bayar bisa dibuka orang lain selain admin; pesanan tidak bisa dikirim sama sekali saat server bermasalah.

## Pendekatan (dipilih: A)
- **A. Simpan di Neon (tabel terpisah, `bytea`)** — tanpa setup tambahan, otomatis privat. Dipilih.
- B. Vercel Blob private — tempat file yang semestinya, tapi butuh setup & library baru.
- Foto **tidak diperkecil** (keputusan pemilik): disimpan asli, maksimal **5 MB**; lebih besar ditolak dengan pesan
  "pakai screenshot". Target < 1000 pesanan.

## Rancangan
**Panel QRIS (pembeli)**
1. Total, salin nominal, gambar QRIS, simpan QRIS — tetap.
2. Input "Upload bukti bayar" (`accept="image/*"`) + pratinjau. Ditolak di browser bila > 5 MB atau bukan gambar.
3. Tombol "Kirim pesanan & bukti bayar" → `POST /api/orders` (ditunggu, bukan keepalive) dengan status "Mengirim…".
4. Berhasil → "✓ Pesanan IB-… tersimpan" + tombol "Konfirmasi ke WhatsApp {admin}" (klik langsung = tidak diblokir
   popup blocker). Pesan WA: `*Pembayaran:* QRIS — bukti bayar sudah diupload di website`.
5. Gagal (server/jaringan) → pesan error + coba lagi, dan link cadangan "Kirim lewat WhatsApp saja" (pesan WA lama,
   bukti dilampirkan manual) supaya pembeli tidak terjebak.
6. Kotak "Penting" disesuaikan: pesanan masuk setelah bukti diupload dan dikonfirmasi ke WA.

**Server**
- Tabel baru `payment_proofs (order_id PK → orders.id ON DELETE CASCADE, mime, size, data bytea, created_at)`,
  dibuat otomatis di `ensureSchema`.
- `POST /api/orders`: body JSON boleh sampai ±7 MB; field wajib `proof: { data: base64 }`. Server memeriksa ukuran
  hasil decode ≤ 5 MB dan **jenis dari isi file** (magic bytes JPEG/PNG/WebP), bukan dari klaim browser.
  Pesanan + foto disimpan dalam satu transaksi. ID duplikat tetap `duplicate` (data lama tidak ditimpa).
- `StoredOrder.hasProof` (daftar pesanan tidak memuat isi foto).
- `GET /api/admin/proof?id=…` — wajib login admin; mengirim gambar dengan `cache-control: private, no-store`.

**Admin**
- Tiap pesanan: tombol "Lihat bukti" (atau "—" bila tidak ada) → dialog berisi gambar besar + link buka di tab baru.
- Excel: kolom "Bukti bayar" (Ada/–).

## Diserahkan ke builder
Teks persis tombol/pesan, tata letak pratinjau & dialog, penamaan fungsi internal.
