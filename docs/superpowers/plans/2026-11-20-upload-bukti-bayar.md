# Upload Bukti Bayar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pembeli upload bukti bayar di panel QRIS; pesanan + foto tersimpan di Neon; admin melihatnya di `/admin`.

**Architecture:** `server/proof.ts` memvalidasi foto (base64 → bytes, ≤ 5 MB, magic bytes). Repository menyimpan
foto di tabel `payment_proofs` (satu transaksi dengan pesanan) dan menandai `StoredOrder.hasProof`. Endpoint admin
`GET /api/admin/proof?id=` mengirim gambar. Plugin Vite dev menjalankan `api/*` di localhost dengan repository memori.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Neon serverless (HTTP), Vercel Functions.

**Spec:** `docs/superpowers/specs/2026-11-20-upload-bukti-bayar-design.md`

## Global Constraints
- `MAX_PROOF_BYTES = 5 * 1024 * 1024`; jenis dari magic bytes: JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`,
  WebP `RIFF????WEBP`. Lainnya ditolak.
- Bukti bayar wajib untuk pesanan Website; pesanan Chat WA (admin) tanpa bukti.
- Endpoint foto wajib `requireAdmin`; header `cache-control: private, no-store`, `x-content-type-options: nosniff`.
- Pesan WA: `*Pembayaran:* QRIS — bukti bayar sudah diupload di website`.

## Review Focus
- ID duplikat (klik kirim dua kali) → 200 duplicate, foto lama tidak ditimpa.
- File berganti ekstensi (mis. PDF dinamai .jpg) → ditolak dari isi file.
- Foto tepat 5 MB diterima, 5 MB + 1 byte ditolak.
- Admin belum login membuka URL foto → 401.
- Upload gagal (jaringan) → pembeli tetap bisa kirim lewat WA (link cadangan).

---

### Task 1: Validasi foto & penyimpanan (server)
**Files:** Create `server/proof.ts`, `server/proof.test.ts`; Modify `server/repository.ts`, `server/db.ts`,
`server/orders.ts`, `server/orders.test.ts`, `src/types/index.ts`, `api/orders.ts`; Create `api/admin/proof.ts`.
- [ ] Test `parseProof`: JPEG/PNG/WebP diterima (mime benar), PDF/teks ditolak, kosong ditolak, 5 MB lolos, 5 MB+1 ditolak.
- [ ] Test `handlePublicOrder`: tanpa `proof` → 400; dengan proof → tersimpan, `hasProof: true`, `repo.getProof(id)` sama.
- [ ] Test `handleGetProof`: tidak ada → 404; ada → 200 + mime.
- [ ] Implementasi; `insert(order, proof?)`, `getProof(id)`, kolom `has_proof` via `EXISTS`.

### Task 2: Pesan WA & payload (client lib)
**Files:** Modify `src/lib/order.ts`, `src/lib/order.test.ts`.
- [ ] Test: `buildWhatsAppMessage(form, now, id, { proofUploaded: true })` memuat teks Global Constraints.
- [ ] `buildOrderPayload(form, id, admin, honeypot, proof)` menyertakan `proof: { data }`.

### Task 3: Panel QRIS & form
**Files:** Modify `src/components/PaymentPanel.tsx`, `src/components/PreorderForm.tsx`.
- [ ] Input file + pratinjau + cek ukuran/jenis; kirim (await) → sukses: tombol WA; gagal: error + coba lagi + link WA cadangan.

### Task 4: Admin
**Files:** Modify `src/admin/OrderTable.tsx`, `src/admin/excel.ts`, `src/admin/excel.test.ts`.
- [ ] "Lihat bukti" → dialog gambar `/api/admin/proof?id=`; kolom Excel "Bukti bayar".

### Task 5: API lokal untuk `npm run dev`
**Files:** Create `server/devApi.ts`; Modify `vite.config.ts`, `server/db.ts`.
- [ ] Middleware dev memetakan `/api/*` ke `api/**/*.ts`, repository memori (`ICEBYTE_MEMORY_DB=1`), cookie tanpa `Secure`.
- [ ] `npx vitest run`, `npx oxlint`, `npm run build` hijau; uji manual di localhost.
