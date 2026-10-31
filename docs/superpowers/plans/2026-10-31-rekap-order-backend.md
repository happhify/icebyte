# Rekap Order Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyimpan setiap pre-order IceByte ke Neon Postgres lewat Vercel Functions, dengan halaman `/admin`
(berpassword) untuk melihat, mengubah status, meringkas produksi, menambah pesanan chat WA, dan mengunduh Excel.

**Architecture:** Vercel Functions bergaya Web (`export async function POST(request: Request): Promise<Response>`) di
`api/` hanya menerjemahkan HTTP. Logika ada di `server/` dan menerima `OrderRepository` sebagai parameter supaya bisa
dites di memori. Aturan pesanan tetap di `src/lib/order.ts` dan dipakai bersama browser dan server. Admin adalah
entry Vite kedua (`admin.html`).

**Tech Stack:** Vite 8, React 19, TypeScript 6, Tailwind v4, Vitest 5, Oxlint, `@neondatabase/serverless` 1.2.x,
`write-excel-file` 4.x, Vercel Functions (Node 22).

**Spec:** `docs/superpowers/specs/2026-10-31-rekap-order-backend-design.md`

## Global Constraints

- Semua teks UI dan komentar dalam Bahasa Indonesia, mengikuti gaya file yang ada.
- Node `>=22.12.0`; `npm test`, `npm run lint`, `npm run build` harus lolos di akhir setiap task.
- Status pesanan: tepat `'Baru' | 'Lunas' | 'Diantar' | 'Batal'`, default `'Baru'`. Sumber: `'Website' | 'Chat WA'`.
- ID order: regex `^IB-\d{4}-[A-HJ-NP-Z2-9]{4}$` (dari `createOrderId`).
- Batas input: nama ≤ 80, WA ≤ 30, alamat ≤ 200, catatan ≤ 300 karakter; 1–20 baris; qty bilangan bulat 1–99;
  body ≤ 16 KB.
- Env: `DATABASE_URL` (fallback `POSTGRES_URL`), `ADMIN_PASSWORD`, `SESSION_SECRET`.
- Cookie: `ib_admin`, `HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=2592000`.
- Zona waktu bisnis: `Asia/Jakarta`.
- **Import relatif di semua file yang terjangkau dari `api/`** (`server/**`, `src/lib/order.ts`, `src/config/site.ts`,
  `src/types/index.ts`, `src/lib/links.ts` kalau terjangkau) **wajib berakhiran `.js`**, karena Vercel menjalankan
  function sebagai ESM (`"type": "module"`).
- Penyimpangan kecil dari spec: `@vercel/node` tidak dipakai, karena handler Web tidak membutuhkannya. Task 8
  memperbarui kalimat itu di spec.
- Commit di branch `rekap-order-dan-menu-gabin`, dengan pesan berbahasa Indonesia dan diakhiri
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Tidak ada push tanpa izin pengguna.

## Review Focus

1. **Function crash di Vercel karena import ESM tanpa ekstensi:** `/api/*` harus membalas JSON, bukan 500
   `ERR_MODULE_NOT_FOUND`. Dipastikan di Checkpoint A dengan `curl` ke preview.
2. **Pesanan di sekitar tengah malam WIB:** pesanan 23:30 WIB di hari `orderEnd` harus diterima, sedangkan 00:05
   WIB keesokan harinya ditolak, walaupun server memakai UTC. Ditangani tes di Task 2.
3. **Menu atau batch berubah setelah pesanan masuk** (produk dihapus, batch dihapus dari config): admin tetap
   menampilkan dan menghitung pesanan lama dari snapshot `units`/`itemsSummary`/`batch`. Ditangani tes di Task 6 dan
   Task 3.
4. **Pembeli menekan kirim lalu WhatsApp langsung mengambil alih halaman di HP:** request penyimpanan tetap
   terkirim. Payload dites di Task 5; pengiriman sungguhan dicek manual di Checkpoint B.
5. **Data pembeli yang aneh** (nama diawali `=`, emoji, catatan multi-baris): tersimpan dan diekspor apa adanya
   sebagai teks. Ditangani tes di Task 3 dan Task 6.

---

### Task 1: Model bersama + import `.js`

**Files:**
- Modify: `src/types/index.ts`, `src/lib/order.ts`, `src/config/site.ts` (import → `.js`)
- Test: `src/lib/order.test.ts`

**Interfaces:**
- Produces (di `src/types/index.ts`):
  - `type OrderStatus = 'Baru' | 'Lunas' | 'Diantar' | 'Batal'`; `const ORDER_STATUSES: OrderStatus[]` (di
    `src/lib/order.ts`, urutan sama)
  - `type OrderSource = 'Website' | 'Chat WA'` (sudah ada, dipertahankan)
  - `interface ProductionUnit { product: string; variant: string; qty: number }`
  - `interface OrderInput { name: string; phone: string; method: FulfillmentMethod; address: string; notes: string;
    admin: string; lines: { kind: ItemKind; itemId: string; qty: number; options: Record<string, string> }[] }`
  - `interface StoredOrder { id; createdAt: string /* ISO */; updatedAt: string; source: OrderSource; batch: string;
    deliveryDate: string /* YYYY-MM-DD */; name; phone; method: FulfillmentMethod; address; notes; admin;
    lines: OrderInput['lines']; units: ProductionUnit[]; itemsSummary: string; total: number; status: OrderStatus }`
- Produces (di `src/lib/order.ts`): `getProductionUnits(lines: OrderLine[]): ProductionUnit[]`

- [ ] **Step 1: Write the failing test**

```ts
describe('satuan produksi', () => {
  it('bundle dipecah per produk dan varian, qty dikali jumlah baris', () => {
    const trio = line({ kind: 'bundle', itemId: TEST_TRIO.id, qty: 2 })
    expect(getProductionUnits([gabinLine(3), trio])).toEqual([
      { product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 3 },
      { product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 2 },
      { product: 'Es Krim Gabin', variant: 'Strawberry', qty: 2 },
    ])
  })
  it('varian dari pilihan pembeli di dalam bundle ikut terbaca; produk tanpa varian = ""', () => {
    expect(getProductionUnits([comboLine(1)])).toEqual([
      { product: 'Es Krim Gabin', variant: 'Strawberry', qty: 1 },
      { product: TEST_DRINK.name, variant: '', qty: 1 },
    ])
  })
  it('baris kosong dilewati', () => {
    expect(getProductionUnits([line({ kind: 'product', itemId: '' })])).toEqual([])
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/order.test.ts`. Expected: FAIL, `getProductionUnits` is not exported.
- [ ] **Step 3: Implement** `getProductionUnits` dengan `getLineContents(line)`. Varian per produk = label pilihan tiap
  `optionGroups` (dari `options?.[group.id]` bundle, atau `line.options[optionKey(product.id, group.id)]`), digabung
  `' / '`. `qty = content.qty * line.qty`. Tanpa penggabungan baris yang sama (penggabungan dilakukan di Task 6).
  Tambahkan tipe-tipe di atas. Ubah semua import relatif di `src/lib/order.ts`, `src/config/site.ts`, dan
  `src/types/index.ts` menjadi berakhiran `.js`.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: semua lolos.
- [ ] **Step 5: Commit** `"Tambah model pesanan bersama dan satuan produksi"`.

### Task 2: Waktu WIB + sesi admin

**Files:**
- Create: `server/time.ts`, `server/session.ts`, `server/time.test.ts`, `server/session.test.ts`
- Modify: `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'server/**/*.test.ts']`)

**Interfaces:**
- Produces:
  - `nowInJakarta(instant?: Date): Date`: Date lokal yang getter-nya memberi komponen waktu WIB
  - `createSessionToken(secret: string, nowMs?: number, maxAgeSec?: number): string`, dengan format
    `<expiryMs>.<hex HMAC-SHA256(expiryMs)>`
  - `verifySessionToken(token: string | undefined, secret: string, nowMs?: number): boolean`
  - `checkPassword(input: string, expected: string): boolean`: SHA-256 kedua sisi lalu `timingSafeEqual`
  - `SESSION_COOKIE = 'ib_admin'`, `SESSION_MAX_AGE = 2592000`
  - `sessionCookie(token: string): string`, `clearSessionCookie(): string`
  - `readCookie(header: string | null, name: string): string | undefined`

- [ ] **Step 1: Write the failing tests**

```ts
// server/time.test.ts
it('23:30 UTC 31 Okt = 06:30 WIB 1 Nov', () => {
  const d = nowInJakarta(new Date('2026-10-31T23:30:00Z'))
  expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 1, 6, 30])
})
it('batas orderEnd mengikuti WIB', () => {
  // batch contoh orderEnd 2026-10-14: 23:30 WIB masih buka, 00:05 WIB tanggal 15 tutup
  expect(getOpenBatch(nowInJakarta(new Date('2026-10-14T16:30:00Z')))?.name).toBe('Batch Test')
  expect(getOpenBatch(nowInJakarta(new Date('2026-10-14T17:05:00Z')))).toBeUndefined()
}) // pasang batch contoh {orderStart:'2026-10-11', orderEnd:'2026-10-14'} lewat splice seperti order.test.ts

// server/session.test.ts
const S = 'rahasia-uji-yang-panjang-sekali-32+'
it('token valid sebelum kedaluwarsa', () => expect(verifySessionToken(createSessionToken(S, 1000, 60), S, 50_000)).toBe(true))
it('kedaluwarsa', () => expect(verifySessionToken(createSessionToken(S, 1000, 60), S, 61_001)).toBe(false))
it('secret lain ditolak', () => expect(verifySessionToken(createSessionToken(S, 1000), 'lain', 2000)).toBe(false))
it.each([undefined, '', 'abc', '123.', '.ff', '123.zz'])('format rusak %s ditolak', (t) =>
  expect(verifySessionToken(t, S, 0)).toBe(false))
it('checkPassword', () => {
  expect(checkPassword('icebyte', 'icebyte')).toBe(true)
  expect(checkPassword('icebyt', 'icebyte')).toBe(false)
  expect(checkPassword('', '')).toBe(false) // password kosong tidak pernah lolos
})
it('cookie', () => {
  expect(sessionCookie('t')).toBe('ib_admin=t; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=2592000')
  expect(clearSessionCookie()).toBe('ib_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0')
  expect(readCookie('a=1; ib_admin=xyz; b=2', 'ib_admin')).toBe('xyz')
  expect(readCookie(null, 'ib_admin')).toBeUndefined()
})
```

- [ ] **Step 2: Run** `npx vitest run server`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.** `nowInJakarta`: `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', hourCycle: 'h23',
  year/month/day/hour/minute/second: 'numeric' }).formatToParts`, lalu `new Date(y, m - 1, d, h, mi, s)`. Sesi memakai
  `node:crypto` (`createHmac`, `createHash`, `timingSafeEqual`); tanda tangan dibandingkan dengan `timingSafeEqual`
  setelah panjangnya dicek.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: lolos.
- [ ] **Step 5: Commit** `"Tambah waktu WIB dan sesi admin untuk server"`.

### Task 3: Validasi dan handler pesanan (repository di memori)

**Files:**
- Create: `server/repository.ts` (interface + `createMemoryRepository()`), `server/orders.ts`, `server/orders.test.ts`

**Interfaces:**
- Consumes: Task 1 types, `getProductionUnits`, `summarizeOrder`, `calculateOrderTotal`, `validateOrder`,
  `createOrderId`, `getOpenBatch`, `nowInJakarta`.
- Produces:
  - `type NewOrder = Omit<StoredOrder, 'createdAt' | 'updatedAt' | 'status'>`
  - `interface OrderRepository { insert(o: NewOrder): Promise<'created' | 'duplicate'>; list(batch?: string):
    Promise<StoredOrder[]> /* terbaru dulu */; batchNames(): Promise<string[]>; updateStatus(id: string, s:
    OrderStatus): Promise<StoredOrder | null> }`
  - `createMemoryRepository(): OrderRepository` (dipakai tes Task 3 dan Task 4)
  - `type ApiResult = { status: number; body: unknown }`
  - `handlePublicOrder(body: unknown, deps: { repo: OrderRepository; now: Date }): Promise<ApiResult>`
  - `handleAdminCreate(body: unknown, deps: { repo; now: Date; random?: () => number }): Promise<ApiResult>`
  - `handleListOrders(batch: string | null, deps: { repo }): Promise<ApiResult>`, yang mengembalikan
    `{ orders, batches }`, dengan `batches` = gabungan unik nama batch config (urutan config) lalu nama dari
    `repo.batchNames()` yang belum ada
  - `handleUpdateStatus(id: string, body: unknown, deps: { repo }): Promise<ApiResult>`
  - `deps.now` selalu sudah dalam WIB (`nowInJakarta()` dipanggil di `api/`)

- [ ] **Step 1: Write the failing tests** (`server/orders.test.ts`, memakai batch contoh yang mencakup NOW seperti
  `order.test.ts`, `const NOW = new Date(2026, 8, 28, 10, 0)`)

```ts
const valid = { id: 'IB-0928-K3F9', name: 'Rara', phone: '0812-3456-7890', method: 'delivery', address: 'Kos Melati',
  notes: '', admin: 'Admin 1', lines: [{ kind: 'bundle', itemId: 'byte-trio', qty: 1, options: {} }], website: '' }

it('pesanan valid tersimpan dengan total dari server', async () => {
  const repo = createMemoryRepository()
  const res = await handlePublicOrder({ ...valid, total: 1 }, { repo, now: NOW })
  expect(res).toEqual({ status: 201, body: { id: 'IB-0928-K3F9' } })
  const [o] = await repo.list()
  expect(o).toMatchObject({ source: 'Website', batch: 'Batch Test', deliveryDate: '2026-10-03', status: 'Baru',
    total: 27000, itemsSummary: expect.stringContaining('Byte Trio') })
  expect(o.units).toHaveLength(3)
})
it('ID sama dua kali → 200 duplicate, tetap satu baris, data lama tidak ditimpa', ...)
  // kedua kirim name 'Budi' → list()[0].name tetap 'Rara'
it('honeypot terisi → 201 tapi tidak tersimpan', ...)   // website: 'http://spam' → repo.list() kosong
it.each([
  ['id salah', { id: 'IB-0928-OOOO' }],          // O tidak ada di alfabet
  ['nama 81 karakter', { name: 'a'.repeat(81) }],
  ['catatan 301', { notes: 'a'.repeat(301) }],
  ['qty 0', { lines: [{ ...valid.lines[0], qty: 0 }] }],
  ['qty 100', { lines: [{ ...valid.lines[0], qty: 100 }] }],
  ['qty 1.5', { lines: [{ ...valid.lines[0], qty: 1.5 }] }],
  ['21 baris', { lines: Array(21).fill(valid.lines[0]) }],
  ['item tidak ada', { lines: [{ kind: 'product', itemId: 'milk-tea', qty: 1, options: {} }] }],
  ['admin tidak dikenal', { admin: 'Admin 9' }],
  ['method aneh', { method: 'drone' }],
  ['bukan objek', null],
])('%s → 400', async (_, patch) => {
  const body = patch === null ? null : { ...valid, ...patch }
  expect((await handlePublicOrder(body, { repo: createMemoryRepository(), now: NOW })).status).toBe(400)
})
it('varian wajib kosong → 400 dengan fields', ...) // product sandwich tanpa options
it('batch tutup → 409', ...)                      // now = new Date(2026, 11, 1)
it('teks aneh tersimpan apa adanya (setelah trim)', ...) // name '=SUM(A1) 🍦', notes 'baris1\nbaris2'
it('admin create: ID dibuat server, sumber Chat WA, batch tutup tetap diterima', async () => {
  const repo = createMemoryRepository()
  const { id: _i, website: _w, ...rest } = valid
  const res = await handleAdminCreate({ ...rest, batch: 'Batch Test' }, { repo, now: new Date(2026, 11, 1), random: () => 0 })
  expect(res.status).toBe(201)
  expect((res.body as { order: StoredOrder }).order).toMatchObject({ id: 'IB-1201-AAAA', source: 'Chat WA', batch: 'Batch Test' })
})
it('admin create: batch tidak ada di config → 400', ...)
it('list: filter batch + batch lama yang sudah dihapus dari config tetap muncul di batches', ...)
  // insert langsung NewOrder dengan batch 'Batch 0' → batches = ['Batch Test', 'Batch 0']
it('update status: valid → 200 order; status aneh → 400; id tidak ada → 404', ...)
```

- [ ] **Step 2: Run** `npx vitest run server/orders.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `parseOrderInput(body, { requireId: boolean })` (privat) memeriksa bentuk dan batas
  sesuai Global Constraints, lalu menghasilkan `OrderInput` dengan string yang sudah di-trim. Bentuk `OrderLine` yang
  diberikan ke `validateOrder` = `{ key: \`l${i}\`, ...line }`. Error `validateOrder` dipetakan menjadi:
  `errors.batch` → 409 (publik) atau diabaikan (admin), sisanya → `400 { error: 'Data pesanan tidak valid.', fields:
  errors }`. Memory repo mengurutkan `list()` dari `createdAt` terbaru, memakai `new Date().toISOString()`.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: lolos.
- [ ] **Step 5: Commit** `"Tambah validasi dan handler pesanan di server"`.

### Task 4: Postgres, HTTP, dan route `api/`

**Files:**
- Create: `server/db.ts`, `server/http.ts`, `server/http.test.ts`, `api/orders.ts`, `api/admin/login.ts`,
  `api/admin/logout.ts`, `api/admin/orders.ts`, `api/admin/orders/[id].ts`, `tsconfig.server.json`, `vercel.json`
- Modify: `tsconfig.json` (tambah reference), `package.json` (`@neondatabase/serverless`)

**Interfaces:**
- Consumes: semua handler Task 3 dan sesi Task 2.
- Produces:
  - `getRepository(): OrderRepository | null`: `null` kalau `DATABASE_URL` dan `POSTGRES_URL` kosong. Menjalankan DDL
    spec §4 sekali per instance (promise di-cache).
  - `json(status: number, body: unknown, headers?: HeadersInit): Response`
  - `readJson(request: Request, maxBytes = 16384): Promise<{ ok: true; value: unknown } | { ok: false; response:
    Response }>`, yang menghasilkan 415 kalau content-type bukan `application/json`, 413 kalau lebih dari maxBytes
    (dicek dari panjang teks), dan 400 kalau JSON rusak
  - `toResponse(r: ApiResult): Response`
  - `requireAdmin(request: Request): Response | null`, yang mengembalikan `503 { error: 'Password admin belum
    diatur' }` kalau env kosong, `401 { error: 'Sesi berakhir, silakan login lagi.' }` kalau cookie tidak valid, atau
    `null` kalau boleh lanjut
  - `NO_DB = json(503, { error: 'Database belum tersambung' })` (dibuat per request)
  - Route: `api/orders.ts` → `POST`; `api/admin/login.ts` → `POST` (`ADMIN_PASSWORD` atau `SESSION_SECRET`
    kosong: 503 `{ error: 'Password admin belum diatur' }`; gagal: tunggu 1000 ms lalu 401
    `{ error: 'Password salah.' }`; sukses: 204 + `Set-Cookie`); `logout.ts` → `POST` 204 + clear cookie;
    `api/admin/orders.ts` → `GET` (query `batch`) dan `POST`; `api/admin/orders/[id].ts` → `PATCH` (id dari segmen
    terakhir `new URL(request.url).pathname`, di-`decodeURIComponent`).
  - `vercel.json`: `{ "cleanUrls": true }`.
  - `tsconfig.server.json`: `include: ["api", "server"]`, `lib: ["ES2023"]`, `types: ["node"]`,
    `module: "esnext"`, `moduleResolution: "bundler"`, `noEmit`, plus aturan linting yang sama dengan
    `tsconfig.app.json`, dan `exclude` untuk `**/*.test.ts`.

- [ ] **Step 1: Write the failing test** (`server/http.test.ts`)

```ts
const req = (body: string, type = 'application/json') =>
  new Request('https://x/api/orders', { method: 'POST', headers: { 'content-type': type }, body })
it('JSON valid', async () => expect(await readJson(req('{"a":1}'))).toEqual({ ok: true, value: { a: 1 } }))
it('content-type salah → 415', async () => expect(await statusOf(readJson(req('{}', 'text/plain')))).toBe(415))
it('terlalu besar → 413', async () => expect(await statusOf(readJson(req(JSON.stringify('a'.repeat(16400)))))).toBe(413))
it('JSON rusak → 400', async () => expect(await statusOf(readJson(req('{')))).toBe(400))
it('requireAdmin: env kosong 503, tanpa cookie 401, cookie valid null', ...) // set/restore process.env
// statusOf = async (p) => { const r = await p; return r.ok ? 200 : r.response.status }
```

- [ ] **Step 2: Run** `npx vitest run server/http.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** file-file di atas. Postgres repo memakai `neon(url)` dengan tagged template. `insert`
  memakai `INSERT ... ON CONFLICT (id) DO NOTHING RETURNING id` (tidak ada baris yang kembali = `'duplicate'`). Kolom
  snake_case dipetakan ke `StoredOrder` camelCase; `delivery_date` dikembalikan sebagai `YYYY-MM-DD` (`::text` di
  SELECT); timestamp dikembalikan dengan `toISOString()`. `npm i @neondatabase/serverless@^1.2.0`.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: lolos, dan `tsc -b` ikut memeriksa
  `api/` dan `server/`.
- [ ] **Step 5: Commit** `"Tambah API pesanan dan admin (Vercel Functions + Neon)"`.

### Checkpoint A: preview deploy (perlu pengguna)

- [ ] Pengguna menyelesaikan spec §12 langkah 1–2 (Neon + env untuk Production **dan** Preview). Buatkan
  `SESSION_SECRET` dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- [ ] Minta izin push branch, lalu `git push -u origin rekap-order-dan-menu-gabin`. Ambil URL preview dari pengguna
  (dashboard Vercel → Deployments).
- [ ] Verifikasi dengan `curl` (Review Focus #1):
  - `POST /api/orders` dengan body `{}` + `content-type: application/json` → `400` JSON, bukan 500 atau HTML
  - `GET /api/admin/orders` → `401`
  - `POST /api/admin/login` dengan password salah → `401` setelah ±1 detik
  - login benar → `204` + `set-cookie: ib_admin=...`
  - `GET /api/admin/orders` dengan cookie itu → `200 {"orders":[],"batches":[...]}`, artinya tabel sudah terbentuk

  Kalau preview diproteksi Vercel Authentication, gunakan skill `vercel:access-protected-vercel-deployment`. Kalau
  ada 500, periksa log function sebelum lanjut.

### Task 5: Form publik mengirim ke API

**Files:**
- Create: `src/components/LineEditor.tsx` (dipindah tanpa perubahan perilaku dari `PreorderForm.tsx:78-245`, beserta
  `FieldError`/`describedBy` yang dipakainya, diekspor dari `src/components/formParts.tsx`)
- Modify: `src/components/PreorderForm.tsx`, `src/lib/order.ts`, `src/lib/order.test.ts`, `src/config/site.ts`,
  `src/types/index.ts`
- Delete code: `orderLog` (config dan tipe `SiteConfig`), `OrderLogRecord`, `buildOrderLogRecord`,
  `buildOrderLogFormBody`, `sendOrderLog`, mode `?admin` (`isAdminMode`, `adminMode`, `savedId`, dan cabang UI-nya)

**Interfaces:**
- Produces:
  - `buildOrderPayload(form: OrderForm, id: string, admin: string, honeypot: string): OrderInput & { id: string;
    website: string }` di `src/lib/order.ts` (baris tanpa `itemId` dibuang; `key` tidak dikirim)
  - `export function LineEditor(props: LineEditorProps)` dari `src/components/LineEditor.tsx` (props tidak berubah)

- [ ] **Step 1: Write the failing test** (ganti `describe('rekap order')` lama: tes `buildOrderLogRecord` dan
  `buildOrderLogFormBody` dihapus, tes `createOrderId` dan ID di pesan WA dipertahankan)

```ts
it('payload API: baris kosong dibuang, key tidak ikut, honeypot ikut', () => {
  const form = validForm({ lines: [gabinLine(2), line({ kind: 'product', itemId: '' })], notes: 'x' })
  expect(buildOrderPayload(form, 'IB-0928-K3F9', 'Admin 1', '')).toEqual({
    id: 'IB-0928-K3F9', name: 'Rara', phone: '0812-3456-7890', method: 'pickup', address: '', notes: 'x',
    admin: 'Admin 1', website: '',
    lines: [{ kind: 'product', itemId: 'sandwich', qty: 2, options: { 'sandwich.rasa': 'Oreo Mint' } }],
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/lib/order.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `PreorderForm`: saat submit valid (dan bukan pengulangan), jalankan
  `fetch('/api/orders', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body:
  JSON.stringify(buildOrderPayload(...)) }).catch(() => {})`, lalu langsung `openWhatsApp`. Honeypot memakai input
  `name="website"` yang tidak terlihat (kelas `sr-only` **tidak** dipakai karena masih terbaca pembaca layar; gunakan
  `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`, dan wrapper `hidden`-by-CSS
  `absolute -left-[9999px]`), dengan state `honeypot`. Pindahkan `LineEditor` ke file sendiri.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Lalu jalankan `npm run dev` dan cek di browser
  bahwa form masih bisa diisi, total benar, dan tombol membuka WA. Pastikan dengan grep bahwa tidak ada lagi
  `orderLog|OrderLogRecord|isAdminMode` di `src/`.
- [ ] **Step 5: Commit** `"Form PO menyimpan pesanan ke API; hapus Google Form dan mode ?admin"`.

### Task 6: Logika admin (produksi, Excel, klien API)

**Files:**
- Create: `src/admin/production.ts`, `src/admin/production.test.ts`, `src/admin/excel.ts`, `src/admin/excel.test.ts`,
  `src/admin/api.ts`
- Modify: `package.json` (`write-excel-file@^4.1.1`)

**Interfaces:**
- Produces:
  - `interface ProductionSummary { units: ProductionUnit[] /* digabung per product+variant, urut product lalu variant
    */; totalPcs: number; revenue: number; statusCounts: Record<OrderStatus, number> }`
  - `summarizeProduction(orders: StoredOrder[]): ProductionSummary`: pesanan Batal tidak ikut di units, totalPcs, dan
    revenue, tapi tetap dihitung di statusCounts
  - `ORDER_COLUMNS: { header: string; value: (o: StoredOrder) => string | number }[]` dengan urutan kolom: ID, Waktu
    (WIB, `dd/MM/yyyy HH:mm`), Sumber, Batch, Tanggal antar, Nama, No. WA, Metode, Lokasi, Pesanan, Total, Catatan,
    Admin, Status
  - `buildOrderRows(orders): (string | number)[][]` (baris header + data), `buildProductionRows(summary): (string |
    number)[][]` (header `Produk, Varian, Jumlah`, isi, lalu baris `Total, '', totalPcs` dan `Omzet, '', revenue`)
  - `downloadExcel(orders: StoredOrder[], summary: ProductionSummary, batchLabel: string): Promise<void>` dengan
    dynamic `import('write-excel-file/browser')`; dua sheet `Pesanan` dan `Produksi`; nama file
    `IceByte-Rekap-${batchLabel.replace(/\s+/g, '-')}.xlsx`; sel string ber-`type: String`
  - `src/admin/api.ts`: `class UnauthorizedError extends Error`; `login(password): Promise<void>`;
    `logout(): Promise<void>`; `fetchOrders(batch: string | null): Promise<{ orders: StoredOrder[]; batches: string[]
    }>`; `createOrder(input: OrderInput & { batch: string }): Promise<StoredOrder>`; `updateStatus(id, status):
    Promise<StoredOrder>`. Respons 401 → `UnauthorizedError`; status lain yang bukan 2xx → `Error(body.error)`.

- [ ] **Step 1: Write the failing tests**

```ts
// production.test.ts: helper order(partial) membuat StoredOrder lengkap
it('menggabungkan unit yang sama dan mengabaikan Batal', () => {
  const s = summarizeProduction([
    order({ units: [{ product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 2 }], total: 20000 }),
    order({ units: [{ product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 1 },
                    { product: 'Es Krim Gabin', variant: 'Cokelat', qty: 1 }], total: 27000, status: 'Lunas' }),
    order({ units: [{ product: 'Es Krim Gabin', variant: 'Strawberry', qty: 5 }], total: 50000, status: 'Batal' }),
  ])
  expect(s.units).toEqual([
    { product: 'Es Krim Gabin', variant: 'Cokelat', qty: 1 },
    { product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 3 },
  ])
  expect([s.totalPcs, s.revenue]).toEqual([4, 47000])
  expect(s.statusCounts).toEqual({ Baru: 1, Lunas: 1, Diantar: 0, Batal: 1 })
})
it('produk yang sudah tidak ada di menu tetap terhitung dari snapshot', () => {
  expect(summarizeProduction([order({ units: [{ product: 'Roasted Milk Tea', variant: '', qty: 2 }] })]).units)
    .toEqual([{ product: 'Roasted Milk Tea', variant: '', qty: 2 }])
})

// excel.test.ts
it('header dan baris pesanan', () => {
  const rows = buildOrderRows([order({ id: 'IB-1031-AAAA', createdAt: '2026-10-31T17:05:00.000Z',
    name: '=SUM(A1) 🍦', itemsSummary: '1x A\n1x B', total: 27000 })])
  expect(rows[0]).toEqual(['ID', 'Waktu', 'Sumber', 'Batch', 'Tanggal antar', 'Nama', 'No. WA', 'Metode', 'Lokasi',
    'Pesanan', 'Total', 'Catatan', 'Admin', 'Status'])
  expect(rows[1].slice(0, 2)).toEqual(['IB-1031-AAAA', '01/11/2026 00:05']) // WIB
  expect(rows[1][5]).toBe('=SUM(A1) 🍦')
  expect(rows[1][9]).toBe('1x A\n1x B')
  expect(rows[1][10]).toBe(27000)
})
it('sheet produksi', () => { /* units 2 baris → header + 2 + Total + Omzet = 5 baris, nilai sesuai */ })
```

- [ ] **Step 2: Run** `npx vitest run src/admin`. Expected: FAIL.
- [ ] **Step 3: Implement** sesuai Interfaces. Metode memakai `METHOD_LABELS`. Tanggal antar diformat dengan
  `formatDateLong`.
- [ ] **Step 4: Run** `npm test && npm run lint && npm run build`. Expected: lolos.
- [ ] **Step 5: Commit** `"Tambah ringkasan produksi, ekspor Excel, dan klien API admin"`.

### Task 7: Halaman admin

**Files:**
- Create: `admin.html`, `src/admin/main.tsx`, `src/admin/AdminApp.tsx`, `src/admin/LoginForm.tsx`,
  `src/admin/ProductionSummary.tsx`, `src/admin/OrderTable.tsx`, `src/admin/AddOrderDialog.tsx`
- Modify: `vite.config.ts` (`build.rollupOptions.input: { main: 'index.html', admin: 'admin.html' }`)

**Interfaces:**
- Consumes: Task 6 (`api.ts`, `summarizeProduction`, `downloadExcel`), `LineEditor` (Task 5), `validateOrder`,
  `site.batches`, `getOpenBatch`, `ORDER_STATUSES`, `formatRupiah`, `normalizePhone`.
- Produces: halaman `/admin` sesuai spec §8.

- [ ] **Step 1: Bangun UI.** Perilaku yang wajib ada:
  - `admin.html` memakai `<title>Admin · IceByte</title>`, `<meta name="robots" content="noindex">`, dan
    `src/index.css` yang sama.
  - `AdminApp` dimulai dari state `checking`, memanggil `fetchOrders`, lalu pindah ke `login` (kalau
    `UnauthorizedError`) atau `ready`. Error lain menampilkan banner "Gagal memuat" dengan tombol Coba lagi, dan
    pesan 503 dari server ditampilkan apa adanya.
  - Default filter: `getOpenBatch(new Date())?.name ?? site.batches.at(-1)?.name ?? null`. Opsi "Semua" = `null`.
  - Dropdown status bersifat optimistis: nilai lama disimpan dan dikembalikan kalau gagal, disertai pesan.
    `UnauthorizedError` di aksi apa pun → kembali ke login.
  - `OrderTable` berupa `<table>` mulai `md:`, dan kartu `<ul>` di bawahnya. Kolom WA menjadi tautan
    `https://wa.me/${normalizePhone(phone)}`. Kolom Pesanan memakai `whitespace-pre-line`.
  - `AddOrderDialog` memakai `<dialog>`, divalidasi dulu dengan `validateOrder` (abaikan `errors.batch`). Setelah
    sukses, tampilkan ID dengan tombol Salin (`navigator.clipboard.writeText`) dan muat ulang daftar.
  - Tombol "Unduh Excel" nonaktif kalau daftar kosong.
- [ ] **Step 2: Run** `npm test && npm run lint && npm run build`. Expected: lolos, dan `dist/admin.html` ada.
- [ ] **Step 3: Cek tampilan** dengan `npm run build && npx vite preview`, lalu buka `/admin.html`. Tanpa API
  harus muncul banner error yang rapi, bukan layar putih. Screenshot desktop dan lebar 390px.
- [ ] **Step 4: Commit** `"Tambah halaman admin rekap pesanan"`.

### Task 8: Dokumentasi + Checkpoint B (uji nyata)

**Files:**
- Modify: `README.md` (ganti bagian "Rekap order (Google Form → Google Sheets)" dengan "Rekap order & halaman
  admin": setup spec §12, cara akses `/admin`, ganti password, `vercel dev` untuk lokal, catatan bahwa Docker hanya
  menyajikan website statis; perbarui struktur folder), dan spec (hapus `@vercel/node` dari §3)

- [ ] **Step 1: Tulis README dan perbaiki spec**, lalu commit `"Dokumentasi rekap order dan halaman admin"`.
- [ ] **Step 2: Push** (dengan izin), lalu jalankan uji nyata di URL preview sesuai spec §11:
  - pesan dari form → muncul di `/admin`
  - klik kirim dua kali → tetap satu baris
  - ubah status → tersimpan setelah reload
  - tambah pesanan chat WA → ID tampil dan bisa disalin
  - unduh Excel → file terbuka, dengan dua sheet dan teks WIB yang benar
  - password salah ditolak; logout → kembali ke login
  - tampilan di HP
  - di HP: tekan kirim → WA terbuka, dan pesanan tetap tercatat (Review Focus #4)
- [ ] **Step 3: Laporkan hasil**, lalu tawarkan merge ke `main` (minta izin terpisah untuk merge dan push).
