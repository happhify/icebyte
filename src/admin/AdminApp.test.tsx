// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StoredOrder } from '../types'
import { AdminApp } from './AdminApp'
import { order } from './testOrder'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminApp', () => {
  it('login berhasil tapi database belum tersambung → pesan error tampil, tidak macet di "Memeriksa…"', async () => {
    let loggedIn = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/admin/login') {
          loggedIn = true
          return new Response(null, { status: 204 })
        }
        return loggedIn ? json(503, { error: 'Database belum tersambung' }) : json(401, { error: 'Sesi berakhir' })
      }),
    )
    render(<AdminApp />)
    fireEvent.change(await screen.findByLabelText('Password admin'), { target: { value: 'password-panjang-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))
    expect(await screen.findByText(/Database belum tersambung/)).toBeTruthy()
    expect(screen.queryByText('Memeriksa…')).toBeNull()
  })

  it('ganti filter cepat: balasan batch lama yang datang terlambat tidak menimpa data filter terbaru', async () => {
    let resolveOld: (r: Response) => void = () => {}
    const batch1: StoredOrder[] = [order({ id: 'IB-1011-AAAA', name: 'Pembeli Batch Lama', batch: 'Batch 1' })]
    const all: StoredOrder[] = [order({ id: 'IB-1031-BBBB', name: 'Pembeli Semua', batch: 'Batch 1' })]
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls += 1
        if (calls === 1) return Promise.resolve(json(200, { orders: [], batches: ['Batch 1'] }))
        if (url.includes('batch=')) return new Promise<Response>((r) => (resolveOld = r))
        return Promise.resolve(json(200, { orders: all, batches: ['Batch 1'] }))
      }),
    )
    render(<AdminApp />)
    const select = await screen.findByLabelText('Batch', { selector: '#batch-filter' })
    // Pindah ke "Semua" lalu cepat kembali ke Batch 1, lalu ke Semua lagi: urutan balasan diacak.
    fireEvent.change(select, { target: { value: '__semua__' } })
    fireEvent.change(select, { target: { value: 'Batch 1' } })
    fireEvent.change(select, { target: { value: '__semua__' } })
    await waitFor(() => expect(screen.getAllByText('Pembeli Semua').length).toBeGreaterThan(0))
    await act(async () => resolveOld(json(200, { orders: batch1, batches: ['Batch 1'] })))
    expect(screen.queryAllByText('Pembeli Batch Lama')).toHaveLength(0)
    expect(screen.getAllByText('Pembeli Semua').length).toBeGreaterThan(0)
  })
})
