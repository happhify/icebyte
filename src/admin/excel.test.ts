import { describe, expect, it } from 'vitest'
import { buildOrderRows, buildProductionRows, excelFileName } from './excel'
import { summarizeProduction } from './production'
import { order } from './testOrder'

describe('Excel: sheet Pesanan', () => {
  it('header dan isi baris, waktu dalam WIB, teks apa adanya', () => {
    const rows = buildOrderRows([
      order({
        id: 'IB-1031-AAAA',
        createdAt: '2026-10-31T17:05:00.000Z',
        name: '=SUM(A1) 🍦',
        itemsSummary: '1x A\n1x B',
        total: 27000,
        status: 'Lunas',
      }),
    ])
    expect(rows[0]).toEqual([
      'ID', 'Waktu', 'Sumber', 'Batch', 'Tanggal antar', 'Nama', 'No. WA', 'Metode', 'Lokasi',
      'Pesanan', 'Total', 'Catatan', 'Admin', 'Status',
    ])
    expect(rows[1].slice(0, 2)).toEqual(['IB-1031-AAAA', '01/11/2026 00:05'])
    expect(rows[1][4]).toBe('Minggu, 8 November 2026')
    expect(rows[1][5]).toBe('=SUM(A1) 🍦')
    expect(rows[1][7]).toBe('Antar')
    expect(rows[1][9]).toBe('1x A\n1x B')
    expect(rows[1][10]).toBe(27000)
    expect(rows[1][13]).toBe('Lunas')
  })
})

describe('Excel: sheet Produksi', () => {
  it('header, isi per varian, lalu Total dan Omzet', () => {
    const summary = summarizeProduction([
      order({
        units: [
          { product: 'Es Krim Gabin', variant: 'Oreo Mint', qty: 2 },
          { product: 'Es Krim Gabin', variant: 'Cokelat', qty: 1 },
        ],
        total: 30000,
      }),
    ])
    expect(buildProductionRows(summary)).toEqual([
      ['Produk', 'Varian', 'Jumlah'],
      ['Es Krim Gabin', 'Cokelat', 1],
      ['Es Krim Gabin', 'Oreo Mint', 2],
      ['Total', '', 3],
      ['Omzet', '', 30000],
    ])
  })
})

it('nama file dari label batch', () => {
  expect(excelFileName('Batch 1')).toBe('IceByte-Rekap-Batch-1.xlsx')
  expect(excelFileName('Semua')).toBe('IceByte-Rekap-Semua.xlsx')
})
