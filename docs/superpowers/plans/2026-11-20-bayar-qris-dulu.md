# Bayar QRIS Dulu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pembeli membayar lewat QRIS di form (langkah 2) sebelum WhatsApp admin terbuka.

**Architecture:** Config `site.payment` dapat `qrisImage`; pesan WA mencatat pembayaran QRIS; `PreorderForm` punya state
langkah (`'form' | 'pay'`) dan panel pembayaran baru `PaymentPanel.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-bayar-qris-dulu-design.md`

## Global Constraints
- Hanya QRIS: `site.payment.methods = ['QRIS']`, `qrisImage: 'images/qris.jpg'` (file di `public/images/qris.jpg`).
- Pesanan disimpan ke rekap dan WA dibuka **hanya** dari tombol "Sudah bayar, kirim bukti ke WhatsApp".
- Teks pesan WA: baris `*Pembayaran:* QRIS (sudah dibayar)`; penutup
  `Bukti pembayaran QRIS saya lampirkan di chat ini. Mohon dicek & dikonfirmasi ya. Terima kasih!`

## Review Focus
- Pembeli mengubah isian setelah masuk langkah 2 → kembali ke langkah 1 (total di panel tidak boleh basi).
- Batch tutup saat di langkah 2 → tombol kirim memvalidasi ulang dan kembali ke langkah 1 dengan error.
- Klik kirim dua kali tanpa perubahan → ID sama, tidak tersimpan dobel (perilaku `lastLogged` dipertahankan).
- Gambar QRIS gagal dimuat → tombol simpan & nominal tetap ada.
- Clipboard tidak tersedia (http/izin) → tombol salin tidak membuat error, nominal tetap terbaca.

---

### Task 1: Config & pesan WA

**Files:** Modify `src/types/index.ts` (payment), `src/config/site.ts`, `src/lib/order.ts` (`buildWhatsAppMessage`), test `src/lib/order.test.ts`; add `public/images/qris.jpg`.

- [ ] Test (gagal dulu) di `describe('pesan WhatsApp')`:
  `expect(message).toContain('*Pembayaran:* QRIS (sudah dibayar)')` dan
  `expect(message).toContain('Bukti pembayaran QRIS saya lampirkan di chat ini.')`, `not.toContain('Mohon konfirmasi & info pembayarannya')`.
- [ ] Implementasi: `payment: { methods: string[]; qrisImage?: string }`; baris Pembayaran setelah `*Metode:*`; penutup baru.
- [ ] Teks FAQ "Bayarnya pakai apa?" dan langkah 3 `HowToOrder.tsx` (+ daftar lima rasa di langkah 1).
- [ ] `npx vitest run` hijau.

### Task 2: Langkah pembayaran di form

**Files:** Create `src/components/PaymentPanel.tsx`; modify `src/components/PreorderForm.tsx`.

**Interfaces:** `PaymentPanel({ total: number; orderId: string; adminLabel: string; onSend(): void; onBack(): void })`.

- [ ] `PreorderForm`: state `step: 'form' | 'pay'` + `pendingId`. Submit di langkah 1 = validasi → `step='pay'`, ID dibuat (pakai ulang `lastLogged.id` kalau isian sama). Semua `edit`/`updateLine`/`removeLine`/`addLine` → `step='form'`.
- [ ] `onSend`: validasi ulang (batch bisa tutup), simpan (`saveOrder`, aturan `lastLogged` sama), buka WA.
- [ ] `PaymentPanel`: total besar + tombol salin (try/catch clipboard), ID order, gambar QRIS (`site.payment.qrisImage`), `<a download="QRIS-IceByte.jpg">Simpan gambar QRIS</a>`, langkah ①②③, tombol kirim, tombol "Ubah pesanan".
- [ ] Setelah WA terbuka: pengingat lampirkan screenshot + link buka ulang.
- [ ] `npx vitest run`, `npx oxlint`, `npm run build` hijau; cek manual di localhost.
