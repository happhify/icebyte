import { describe, expect, it } from 'vitest'
import { summarizeProduction } from './production'
import { order } from './testOrder'

describe('ringkasan produksi', () => {
  it('menggabungkan unit yang sama dan mengabaikan Batal', () => {
    const s = summarizeProduction([
      order({ units: [{ product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 2 }], total: 20000 }),
      order({
        units: [
          { product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 1 },
          { product: 'Es Krim Gabin', variant: 'Cokelat', qty: 1 },
        ],
        total: 27000,
        status: 'Lunas',
      }),
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
    expect(summarizeProduction([order({ units: [{ product: 'Roasted Milk Tea', variant: '', qty: 2 }] })]).units).toEqual(
      [{ product: 'Roasted Milk Tea', variant: '', qty: 2 }],
    )
  })

  it('tanpa pesanan: semua nol', () => {
    expect(summarizeProduction([])).toEqual({
      units: [],
      totalPcs: 0,
      revenue: 0,
      statusCounts: { Baru: 0, Lunas: 0, Diantar: 0, Batal: 0 },
    })
  })
})
