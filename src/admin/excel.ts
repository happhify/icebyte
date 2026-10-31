import { METHOD_LABELS, formatDateLong } from '../lib/order'
import type { StoredOrder } from '../types'
import type { ProductionSummary } from './production'

type CellValue = string | number

const wibParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "dd/MM/yyyy HH:mm" dalam WIB. */
export function formatWib(iso: string): string {
  const p = Object.fromEntries(wibParts.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]))
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

export const ORDER_COLUMNS: { header: string; value: (o: StoredOrder) => CellValue }[] = [
  { header: 'ID', value: (o) => o.id },
  { header: 'Waktu', value: (o) => formatWib(o.createdAt) },
  { header: 'Sumber', value: (o) => o.source },
  { header: 'Batch', value: (o) => o.batch },
  { header: 'Tanggal antar', value: (o) => formatDateLong(o.deliveryDate) },
  { header: 'Nama', value: (o) => o.name },
  { header: 'No. WA', value: (o) => o.phone },
  { header: 'Metode', value: (o) => METHOD_LABELS[o.method] },
  { header: 'Lokasi', value: (o) => o.address },
  { header: 'Pesanan', value: (o) => o.itemsSummary },
  { header: 'Total', value: (o) => o.total },
  { header: 'Catatan', value: (o) => o.notes },
  { header: 'Admin', value: (o) => o.admin },
  { header: 'Status', value: (o) => o.status },
]

export function buildOrderRows(orders: StoredOrder[]): CellValue[][] {
  return [ORDER_COLUMNS.map((c) => c.header), ...orders.map((o) => ORDER_COLUMNS.map((c) => c.value(o)))]
}

export function buildProductionRows(summary: ProductionSummary): CellValue[][] {
  return [
    ['Produk', 'Varian', 'Jumlah'],
    ...summary.units.map((u) => [u.product, u.variant, u.qty]),
    ['Total', '', summary.totalPcs],
    ['Omzet', '', summary.revenue],
  ]
}

export const excelFileName = (batchLabel: string) => `IceByte-Rekap-${batchLabel.trim().replace(/\s+/g, '-')}.xlsx`

/** Unduh rekap sebagai .xlsx (sheet Pesanan + Produksi). Library dimuat hanya saat tombol diklik. */
export async function downloadExcel(orders: StoredOrder[], summary: ProductionSummary, batchLabel: string) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  // Teks selalu ditulis sebagai sel string (bukan rumus), angka sebagai angka.
  const toSheet = (rows: CellValue[][]) =>
    rows.map((row) => row.map((value) => (typeof value === 'number' ? { value, type: Number } : { value, type: String })))
  await writeXlsxFile([
    { sheet: 'Pesanan', data: toSheet(buildOrderRows(orders)) },
    { sheet: 'Produksi', data: toSheet(buildProductionRows(summary)) },
  ]).toFile(excelFileName(batchLabel))
}
