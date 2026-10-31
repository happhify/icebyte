import { afterAll, describe, expect, it } from 'vitest'
import { site } from '../src/config/site.js'
import type { StoredOrder } from '../src/types/index.js'
import { handleAdminCreate, handleListOrders, handlePublicOrder, handleUpdateStatus } from './orders.js'
import { createMemoryRepository, type NewOrder } from './repository.js'

// Batch contoh yang mencakup NOW, supaya test tidak bergantung pada tanggal batch asli.
const CONFIG_BATCHES = [...site.batches]
site.batches.splice(0, site.batches.length, {
  name: 'Batch Test',
  orderStart: '2026-09-25',
  orderEnd: '2026-09-30',
  fulfillmentDate: '2026-10-03',
})
afterAll(() => {
  site.batches.splice(0, site.batches.length, ...CONFIG_BATCHES)
})

// Senin, 28 September 2026 jam 10:00 (sudah WIB).
const NOW = new Date(2026, 8, 28, 10, 0)
const CLOSED = new Date(2026, 11, 1, 10, 0)

const valid = {
  id: 'IB-0928-K3F9',
  name: 'Rara',
  phone: '0812-3456-7890',
  method: 'delivery',
  address: 'Kos Melati',
  notes: '',
  admin: 'Admin 1',
  lines: [{ kind: 'bundle', itemId: 'byte-trio', qty: 1, options: {} }],
  website: '',
}

describe('pesanan dari website', () => {
  it('pesanan valid tersimpan dengan total dari server', async () => {
    const repo = createMemoryRepository()
    const res = await handlePublicOrder({ ...valid, total: 1 }, { repo, now: NOW })
    expect(res).toEqual({ status: 201, body: { id: 'IB-0928-K3F9' } })
    const [o] = await repo.list()
    expect(o).toMatchObject({
      source: 'Website',
      batch: 'Batch Test',
      deliveryDate: '2026-10-03',
      status: 'Baru',
      total: 27000,
      itemsSummary: expect.stringContaining('Byte Trio'),
    })
    expect(o.units).toHaveLength(3)
  })

  it('ID sama dua kali → 200 duplicate, tetap satu baris, data lama tidak ditimpa', async () => {
    const repo = createMemoryRepository()
    await handlePublicOrder(valid, { repo, now: NOW })
    const res = await handlePublicOrder({ ...valid, name: 'Budi' }, { repo, now: NOW })
    expect(res).toEqual({ status: 200, body: { id: valid.id, duplicate: true } })
    const orders = await repo.list()
    expect(orders).toHaveLength(1)
    expect(orders[0].name).toBe('Rara')
  })

  it('honeypot terisi → 201 tapi tidak tersimpan', async () => {
    const repo = createMemoryRepository()
    const res = await handlePublicOrder({ ...valid, website: 'http://spam' }, { repo, now: NOW })
    expect(res.status).toBe(201)
    expect(await repo.list()).toEqual([])
  })

  it.each([
    ['id salah', { id: 'IB-0928-OOOO' }],
    ['nama kosong', { name: '   ' }],
    ['nama 81 karakter', { name: 'a'.repeat(81) }],
    ['WA 31 karakter', { phone: '0'.repeat(31) }],
    ['alamat 201 karakter', { address: 'a'.repeat(201) }],
    ['catatan 301 karakter', { notes: 'a'.repeat(301) }],
    ['qty 0', { lines: [{ ...valid.lines[0], qty: 0 }] }],
    ['qty 100', { lines: [{ ...valid.lines[0], qty: 100 }] }],
    ['qty 1.5', { lines: [{ ...valid.lines[0], qty: 1.5 }] }],
    ['tanpa baris', { lines: [] }],
    ['21 baris', { lines: Array(21).fill(valid.lines[0]) }],
    ['item tidak ada', { lines: [{ kind: 'product', itemId: 'milk-tea', qty: 1, options: {} }] }],
    ['kind aneh', { lines: [{ ...valid.lines[0], kind: 'combo' }] }],
    ['options bukan string', { lines: [{ ...valid.lines[0], options: { rasa: 1 } }] }],
    ['admin tidak dikenal', { admin: 'Admin 9' }],
    ['method aneh', { method: 'drone' }],
    ['nama bukan string', { name: 42 }],
  ])('%s → 400', async (_, patch) => {
    const res = await handlePublicOrder({ ...valid, ...patch }, { repo: createMemoryRepository(), now: NOW })
    expect(res.status).toBe(400)
  })

  it.each([null, 'teks', [1, 2]])('body bukan objek (%s) → 400', async (body) => {
    expect((await handlePublicOrder(body, { repo: createMemoryRepository(), now: NOW })).status).toBe(400)
  })

  it('varian wajib kosong → 400 dengan fields', async () => {
    const res = await handlePublicOrder(
      { ...valid, lines: [{ kind: 'product', itemId: 'sandwich', qty: 1, options: {} }] },
      { repo: createMemoryRepository(), now: NOW },
    )
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ error: 'Data pesanan tidak valid.', fields: { lines: expect.any(Object) } })
  })

  it('batch tutup → 409', async () => {
    const res = await handlePublicOrder(valid, { repo: createMemoryRepository(), now: CLOSED })
    expect(res.status).toBe(409)
  })

  it('teks aneh tersimpan apa adanya setelah di-trim', async () => {
    const repo = createMemoryRepository()
    await handlePublicOrder({ ...valid, name: '  =SUM(A1) 🍦 ', notes: 'baris1\nbaris2' }, { repo, now: NOW })
    const [o] = await repo.list()
    expect(o.name).toBe('=SUM(A1) 🍦')
    expect(o.notes).toBe('baris1\nbaris2')
  })
})

describe('pesanan dari chat WA (admin)', () => {
  const { id: _id, website: _website, ...rest } = valid

  it('ID dibuat server, sumber Chat WA, batch tutup tetap diterima', async () => {
    const repo = createMemoryRepository()
    const res = await handleAdminCreate({ ...rest, batch: 'Batch Test' }, { repo, now: CLOSED, random: () => 0 })
    expect(res.status).toBe(201)
    expect((res.body as { order: StoredOrder }).order).toMatchObject({
      id: 'IB-1201-AAAA',
      source: 'Chat WA',
      batch: 'Batch Test',
      deliveryDate: '2026-10-03',
      total: 27000,
    })
  })

  it('batch tidak ada di config → 400', async () => {
    const res = await handleAdminCreate({ ...rest, batch: 'Batch 9' }, { repo: createMemoryRepository(), now: NOW })
    expect(res.status).toBe(400)
  })

  it('data tidak valid tetap ditolak', async () => {
    const res = await handleAdminCreate({ ...rest, name: '', batch: 'Batch Test' }, { repo: createMemoryRepository(), now: NOW })
    expect(res.status).toBe(400)
  })
})

function newOrder(patch: Partial<NewOrder>): NewOrder {
  return {
    id: 'IB-0101-AAAA',
    source: 'Website',
    batch: 'Batch Test',
    deliveryDate: '2026-10-03',
    name: 'Rara',
    phone: '0812',
    method: 'delivery',
    address: '',
    notes: '',
    admin: 'Admin 1',
    lines: [],
    units: [],
    itemsSummary: '',
    total: 0,
    ...patch,
  }
}

describe('daftar & status', () => {
  it('filter batch; batch lama yang sudah dihapus dari config tetap muncul di batches', async () => {
    const repo = createMemoryRepository()
    await repo.insert(newOrder({ id: 'IB-0101-AAAA', batch: 'Batch 0' }))
    await repo.insert(newOrder({ id: 'IB-0101-BBBB', batch: 'Batch Test' }))
    const all = await handleListOrders(null, { repo })
    expect(all.status).toBe(200)
    expect(all.body).toMatchObject({ batches: ['Batch Test', 'Batch 0'] })
    expect((all.body as { orders: StoredOrder[] }).orders).toHaveLength(2)
    const filtered = await handleListOrders('Batch 0', { repo })
    expect((filtered.body as { orders: StoredOrder[] }).orders.map((o) => o.id)).toEqual(['IB-0101-AAAA'])
  })

  it('ubah status: valid → 200, status aneh → 400, id tidak ada → 404', async () => {
    const repo = createMemoryRepository()
    await repo.insert(newOrder({}))
    const ok = await handleUpdateStatus('IB-0101-AAAA', { status: 'Lunas' }, { repo })
    expect(ok.status).toBe(200)
    expect((ok.body as { order: StoredOrder }).order.status).toBe('Lunas')
    expect((await handleUpdateStatus('IB-0101-AAAA', { status: 'Hilang' }, { repo })).status).toBe(400)
    expect((await handleUpdateStatus('IB-0101-ZZZZ', { status: 'Lunas' }, { repo })).status).toBe(404)
  })
})
