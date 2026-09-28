import { site } from '../config/site'
import type {
  Bundle,
  FulfillmentMethod,
  LineErrors,
  OptionGroup,
  OrderErrors,
  OrderForm,
  OrderLine,
  Product,
} from '../types'

type ItemRef = Pick<OrderLine, 'kind' | 'itemId'>

/* ------------------------------------------------------------------ */
/* Format                                                              */
/* ------------------------------------------------------------------ */

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** 12000 -> "Rp12.000" (Intl menyisipkan spasi, jadi dibuang). */
export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount).replace(/\s/g, '')
}

const longDateFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "2026-09-29" -> "Selasa, 29 September 2026". */
export function formatDateLong(value: string): string {
  const date = parseISODate(value)
  return date ? longDateFormatter.format(date) : value
}

export const METHOD_LABELS: Record<FulfillmentMethod, string> = {
  pickup: 'Ambil di booth',
  delivery: 'Antar',
}

/* ------------------------------------------------------------------ */
/* Katalog                                                             */
/* ------------------------------------------------------------------ */

export function getProduct(id: string): Product | undefined {
  return site.products.find((p) => p.id === id)
}

export function getBundle(id: string): Bundle | undefined {
  return site.bundles.find((b) => b.id === id)
}

/** Isi 1 unit baris pesanan. Bundle dipecah menjadi produk-produknya. */
export function getLineContents(ref: ItemRef): { product: Product; qty: number }[] {
  if (!ref.itemId) return []
  if (ref.kind === 'product') {
    const product = getProduct(ref.itemId)
    return product ? [{ product, qty: 1 }] : []
  }
  const bundle = getBundle(ref.itemId)
  if (!bundle) return []
  return bundle.items.flatMap((item) => {
    const product = getProduct(item.productId)
    return product ? [{ product, qty: item.qty }] : []
  })
}

export function getItemName(ref: ItemRef): string {
  if (ref.kind === 'bundle') return getBundle(ref.itemId)?.name ?? ''
  return getProduct(ref.itemId)?.name ?? ''
}

export function optionKey(productId: string, groupId: string): string {
  return `${productId}.${groupId}`
}

export interface OptionField {
  key: string
  product: Product
  group: OptionGroup
}

/** Semua pilihan varian yang wajib diisi untuk sebuah baris. */
export function getOptionFields(ref: ItemRef): OptionField[] {
  const seen = new Set<string>()
  return getLineContents(ref).flatMap(({ product }) =>
    product.optionGroups.flatMap((group) => {
      const key = optionKey(product.id, group.id)
      if (seen.has(key)) return []
      seen.add(key)
      return [{ key, product, group }]
    }),
  )
}

/* ------------------------------------------------------------------ */
/* Harga                                                               */
/* ------------------------------------------------------------------ */

export function getUnitPrice(ref: ItemRef): number {
  if (ref.kind === 'bundle') return getBundle(ref.itemId)?.price ?? 0
  return getProduct(ref.itemId)?.price ?? 0
}

function isValidQty(qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1
}

export function getLineTotal(line: OrderLine): number {
  return isValidQty(line.qty) ? getUnitPrice(line) * line.qty : 0
}

export function calculateOrderTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + getLineTotal(line), 0)
}

/** Harga kalau isi bundle dibeli satuan. */
export function getBundleNormalPrice(bundle: Bundle): number {
  return bundle.items.reduce((sum, item) => sum + (getProduct(item.productId)?.price ?? 0) * item.qty, 0)
}

export function getBundleSavings(bundle: Bundle): number {
  return Math.max(0, getBundleNormalPrice(bundle) - bundle.price)
}

/* ------------------------------------------------------------------ */
/* Aturan pengantaran & kemasan                                        */
/* ------------------------------------------------------------------ */

export function isItemDeliverable(ref: ItemRef): boolean {
  return getLineContents(ref).every(({ product }) => product.deliverable)
}

/** Produk non-deliverable (unik) yang ada di pesanan, termasuk yang ada di dalam bundle. */
export function getNonDeliverableProducts(lines: ItemRef[]): Product[] {
  const found = new Map<string, Product>()
  for (const line of lines) {
    for (const { product } of getLineContents(line)) {
      if (!product.deliverable) found.set(product.id, product)
    }
  }
  return [...found.values()]
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} dan ${names[names.length - 1]}`
}

/** Pesan error kalau ada item yang tidak bisa diantar, atau undefined kalau aman. */
export function getDeliveryConflict(lines: ItemRef[]): string | undefined {
  const blockedLines = lines.filter((line) => line.itemId && !isItemDeliverable(line))
  if (blockedLines.length === 0) return undefined

  const labels = blockedLines.map((line) => {
    if (line.kind === 'product') return getItemName(line)
    const inside = getLineContents(line)
      .filter(({ product }) => !product.deliverable)
      .map(({ product }) => product.name)
    return `${getItemName(line)} (berisi ${joinNames(inside)})`
  })
  const uniqueLabels = [...new Set(labels)]
  const availability = getNonDeliverableProducts(lines)
    .map((p) => p.availability)
    .filter(Boolean)
    .join(', ')
    .toLowerCase()

  return `${joinNames(uniqueLabels)} tidak bisa diantar${
    availability ? ` — hanya tersedia di ${availability}` : ''
  }. Pilih "${METHOD_LABELS.pickup}" atau hapus item tersebut.`
}

/** Catatan kemasan (mis. topping dikemas terpisah) untuk produk yang dipesan. */
export function getPackagingNotes(lines: ItemRef[]): string[] {
  const notes = new Set<string>()
  for (const line of lines) {
    for (const { product } of getLineContents(line)) {
      if (product.packagingNote) notes.add(product.packagingNote)
    }
  }
  return [...notes]
}

/* ------------------------------------------------------------------ */
/* Tanggal                                                             */
/* ------------------------------------------------------------------ */

/** Date -> "YYYY-MM-DD" berdasarkan zona waktu lokal perangkat. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "YYYY-MM-DD" -> Date lokal jam 00:00, atau null kalau tidak valid. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

/** PO ditutup H-1, jadi tanggal ambil paling cepat besok. */
export function getMinPickupDate(now: Date = new Date()): string {
  return toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
}

export function validatePickupDate(value: string, now: Date = new Date()): string | undefined {
  if (!value) return 'Pilih tanggal ambil.'
  if (!parseISODate(value)) return 'Format tanggal tidak valid.'
  const min = getMinPickupDate(now)
  // Format YYYY-MM-DD aman dibandingkan sebagai string.
  if (value < min) return `PO ditutup H-1. Pilih tanggal paling cepat ${formatDateLong(min)}.`
  return undefined
}

/* ------------------------------------------------------------------ */
/* Nomor WhatsApp                                                      */
/* ------------------------------------------------------------------ */

/** "0812-3456-7890" / "+62 812..." -> "6281234567890". Placeholder -> "". */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

export function validatePhone(raw: string): string | undefined {
  if (!raw.trim()) return 'Nomor WhatsApp wajib diisi.'
  if (/[^\d\s+().-]/.test(raw) || !/^628\d{7,12}$/.test(normalizePhone(raw))) {
    return 'Nomor WhatsApp tidak valid. Contoh: 081234567890.'
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Validasi form                                                       */
/* ------------------------------------------------------------------ */

export function validateLine(line: OrderLine): LineErrors {
  const errors: LineErrors = {}
  if (!line.itemId || getLineContents(line).length === 0) {
    errors.item = 'Pilih menu atau bundle.'
    return errors
  }
  if (!isValidQty(line.qty)) errors.qty = 'Jumlah minimal 1.'

  const optionErrors: Record<string, string> = {}
  for (const { key, group } of getOptionFields(line)) {
    if (!group.choices.includes(line.options[key] ?? '')) {
      optionErrors[key] = `Pilih ${group.label.toLowerCase()}.`
    }
  }
  if (Object.keys(optionErrors).length > 0) errors.options = optionErrors
  return errors
}

export function validateOrder(form: OrderForm, now: Date = new Date()): OrderErrors {
  const errors: OrderErrors = {}

  if (!form.name.trim()) errors.name = 'Nama wajib diisi.'

  const phoneError = validatePhone(form.phone)
  if (phoneError) errors.phone = phoneError

  if (form.lines.length === 0) {
    errors.items = 'Tambahkan minimal 1 item.'
  } else {
    const lineErrors: Record<string, LineErrors> = {}
    for (const line of form.lines) {
      const result = validateLine(line)
      if (Object.keys(result).length > 0) lineErrors[line.key] = result
    }
    if (Object.keys(lineErrors).length > 0) errors.lines = lineErrors
  }

  const dateError = validatePickupDate(form.date, now)
  if (dateError) errors.date = dateError

  if (!form.method) {
    errors.method = 'Pilih metode: ambil di booth atau antar.'
  } else if (form.method === 'delivery') {
    const conflict = getDeliveryConflict(form.lines)
    if (conflict) errors.method = conflict
    if (!form.address.trim()) errors.address = 'Lokasi antar wajib diisi.'
  }

  return errors
}

export function hasErrors(errors: OrderErrors): boolean {
  return Object.keys(errors).length > 0
}

/* ------------------------------------------------------------------ */
/* Pesan WhatsApp                                                      */
/* ------------------------------------------------------------------ */

function describeOptions(line: OrderLine, productId: string): string {
  return getOptionFields(line)
    .filter((field) => field.product.id === productId)
    .map((field) => `${field.group.label}: ${line.options[field.key] ?? '-'}`)
    .join(', ')
}

function describeLine(line: OrderLine): string[] {
  if (line.kind === 'product') {
    const options = describeOptions(line, line.itemId)
    return options ? [options] : []
  }
  return getLineContents(line).map(({ product, qty }) => {
    const options = describeOptions(line, product.id)
    return `- ${qty}x ${product.name}${options ? ` (${options})` : ''}`
  })
}

export function buildWhatsAppMessage(form: OrderForm): string {
  const out: string[] = [`Halo ${site.brand.name}! Saya mau pre-order ya.`, '']

  out.push(`*Nama:* ${form.name.trim()}`)
  out.push(`*No. WA:* ${form.phone.trim()}`)
  out.push('', '*Pesanan:*')

  form.lines.forEach((line, index) => {
    const suffix = line.kind === 'bundle' ? ' (bundle)' : ''
    out.push(`${index + 1}. ${getItemName(line)}${suffix}`)
    out.push(`   ${line.qty} x ${formatRupiah(getUnitPrice(line))} = ${formatRupiah(getLineTotal(line))}`)
    for (const detail of describeLine(line)) out.push(`   ${detail}`)
  })

  out.push('', `*Total:* ${formatRupiah(calculateOrderTotal(form.lines))}`)
  out.push(`*Tanggal ${form.method === 'delivery' ? 'antar' : 'ambil'}:* ${formatDateLong(form.date)}`)
  out.push(`*Metode:* ${form.method ? METHOD_LABELS[form.method] : '-'}`)
  if (form.method === 'delivery') {
    out.push(`*Lokasi antar:* ${form.address.trim()}`)
  }
  out.push(`*Catatan:* ${form.notes.trim() || '-'}`)

  const infos = [...getPackagingNotes(form.lines)]
  if (form.method === 'delivery') infos.push('Ongkos antar (jika ada) dikonfirmasi admin.')
  if (infos.length > 0) {
    out.push('')
    for (const info of infos) out.push(`_Info: ${info}_`)
  }

  out.push('', `Mohon konfirmasi & info pembayarannya (${site.payment.methods.join('/')}). Terima kasih!`)
  return out.join('\n')
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`
}

/* ------------------------------------------------------------------ */
/* Helper form                                                         */
/* ------------------------------------------------------------------ */

let lineCounter = 0

export function createLine(kind: OrderLine['kind'] = 'product', itemId = ''): OrderLine {
  lineCounter += 1
  return { key: `line-${lineCounter}`, kind, itemId, qty: 1, options: {} }
}
