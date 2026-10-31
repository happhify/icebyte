import { afterEach, describe, expect, it, vi } from 'vitest'
import { UnauthorizedError, fetchOrders } from './api'

const respond = (body: string, status: number, type: string) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status, headers: { 'content-type': type } })))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('klien API admin', () => {
  it('balasan 200 berisi HTML (bukan API) dianggap error, bukan data kosong', async () => {
    respond('<!doctype html><title>IceByte</title>', 200, 'text/html')
    await expect(fetchOrders(null)).rejects.toThrow('Server rekap tidak merespons dengan benar')
  })

  it('401 → UnauthorizedError', async () => {
    respond('{"error":"Sesi berakhir"}', 401, 'application/json')
    await expect(fetchOrders(null)).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('503 → pesan error dari server', async () => {
    respond('{"error":"Database belum tersambung"}', 503, 'application/json')
    await expect(fetchOrders(null)).rejects.toThrow('Database belum tersambung')
  })

  it('200 JSON → data', async () => {
    respond('{"orders":[],"batches":["Batch 1"]}', 200, 'application/json')
    await expect(fetchOrders(null)).resolves.toEqual({ orders: [], batches: ['Batch 1'] })
  })
})
