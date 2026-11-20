# Bayar QRIS dulu sebelum kirim pesanan

## Kenapa
Semua pesanan wajib dibayar di depan lewat QRIS (Tunai tidak diterima lagi), supaya pesanan yang diproses
sudah pasti dibayar. Bukti bayar tetap dikirim pembeli ke WhatsApp admin; admin menandai **Lunas** di halaman
admin setelah mengecek bukti.

## Tujuan / bukan tujuan
- Tujuan: pembeli melihat total + QRIS dan membayar **sebelum** WhatsApp admin terbuka.
- Bukan tujuan: verifikasi pembayaran otomatis, upload bukti bayar ke website, QRIS dinamis per nominal.
- Gagal kalau: pembeli di HP tidak bisa membayar (QR tidak bisa di-scan dari layar sendiri), atau salah nominal.

## Pendekatan (dipilih: A)
- **A. Dua langkah di form** — "Lanjut ke Pembayaran" → panel QRIS → "Sudah bayar, kirim bukti ke WhatsApp". Dipilih: urutannya jelas.
- B. QRIS selalu tampil, satu tombol — paling sederhana, tapi mudah terlewat bayar.
- C. Seperti A dalam pop-up — kurang nyaman di HP, kode lebih banyak.

## Rancangan
- **Aset & config**: foto QRIS di `public/images/qris.jpg`. `site.payment` jadi `{ methods: ['QRIS'], qrisImage: 'images/qris.jpg' }`.
- **Langkah 1**: tombol utama form jadi "Lanjut ke Pembayaran". Validasi sama seperti sekarang; kalau lolos, ID order
  dibuat dan form masuk langkah 2. Belum ada yang disimpan dan WA belum dibuka.
- **Langkah 2** (panel di kolom ringkasan, menggantikan tombol):
  - Total bayar ditulis besar + tombol salin nominal (QRIS statis, pembeli mengetik nominal sendiri).
  - Gambar QRIS + tombol "Simpan gambar QRIS" (unduh), untuk bayar dari HP yang sama lewat "upload dari galeri".
  - Langkah singkat: ① bayar sesuai total ② screenshot bukti ③ kirim ke WA admin & lampirkan screenshot.
  - Tombol "Sudah bayar, kirim bukti ke WhatsApp": baru di sini pesanan disimpan ke rekap (status **Baru**) dan WA dibuka.
  - Link "Ubah pesanan" untuk kembali ke langkah 1. Mengubah isian apa pun juga mengembalikan ke langkah 1.
- **Pesan WA**: tambah baris `*Pembayaran:* QRIS (sudah dibayar)`; penutup jadi
  "Bukti pembayaran QRIS saya lampirkan di chat ini. Mohon dicek & dikonfirmasi ya. Terima kasih!"
- **Setelah WA terbuka**: pengingat "Jangan lupa lampirkan screenshot bukti bayar di chat WhatsApp" + link buka ulang WA.
- **Teks lain** ikut diperbarui: FAQ "Bayarnya pakai apa?", Cara Pesan (langkah 3, sekaligus daftar rasa jadi lima),
  catatan di bawah tombol form.
- **Admin**: tidak berubah; status Lunas dipakai setelah bukti dicek.

## Diserahkan ke builder
Detail tampilan panel (warna, ukuran QR), teks persis tombol dan pengingat.
