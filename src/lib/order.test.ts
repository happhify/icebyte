import { describe, expect, it } from 'vitest'
import { site } from '../config/site'
import type { OrderForm, OrderLine, Product } from '../types'
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateOrderTotal,
  createLine,
  formatRupiah,
  getBundleNormalPrice,
  getBundleSavings,
  getDeliveryConflict,
  getLineTotal,
  getMinPickupDate,
  getOptionFields,
  getPackagingNotes,
  hasErrors,
  normalizePhone,
  validateOrder,
  validatePhone,
  validatePickupDate,
} from './order'

// Semua ekspektasi harga diambil dari config, jadi test tetap valid saat harga diubah.
const product = (id: string) => {
  const found = site.products.find((p) => p.id === id)
  if (!found) throw new Error(`produk ${id} tidak ada di config`)
  return found
}
const bundle = (id: string) => {
  const found = site.bundles.find((b) => b.id === id)
  if (!found) throw new Error(`bundle ${id} tidak ada di config`)
  return found
}

/** Ubah sementara data sebuah produk di config selama satu test, lalu kembalikan seperti semula. */
function withProduct(id: string, patch: Partial<Product>, run: () => void) {
  const target = product(id)
  const original = { ...target }
  Object.assign(target, patch)
  try {
    run()
  } finally {
    for (const key of Object.keys(patch)) Reflect.deleteProperty(target, key)
    Object.assign(target, original)
  }
}

function line(partial: Partial<OrderLine> & Pick<OrderLine, 'kind' | 'itemId'>): OrderLine {
  return { ...createLine(), ...partial }
}

const karambolLine = (qty = 1): OrderLine =>
  line({
    kind: 'product',
    itemId: 'karambol',
    qty,
    options: { 'karambol.topping': 'Lotus Biscoff' },
  })
const sandwichLine = (qty = 1): OrderLine =>
  line({ kind: 'product', itemId: 'sandwich', qty, options: { 'sandwich.rasa': 'Vanila' } })
const gorengLine = (qty = 1): OrderLine => line({ kind: 'product', itemId: 'goreng', qty })
const fullStackLine = (qty = 1): OrderLine =>
  line({
    kind: 'bundle',
    itemId: 'full-stack',
    qty,
    options: { 'karambol.topping': 'Oreo', 'sandwich.rasa': 'Cookies & Cream' },
  })

// Senin, 28 September 2026 jam 10:00 waktu lokal.
const NOW = new Date(2026, 8, 28, 10, 0)

function validForm(overrides: Partial<OrderForm> = {}): OrderForm {
  return {
    name: 'Rara',
    phone: '0812-3456-7890',
    lines: [karambolLine(2)],
    date: '2026-09-29',
    method: 'pickup',
    address: '',
    notes: '',
    ...overrides,
  }
}

describe('formatRupiah', () => {
  it('memformat tanpa spasi dengan pemisah ribuan titik', () => {
    expect(formatRupiah(12000)).toBe('Rp12.000')
    expect(formatRupiah(7000)).toBe('Rp7.000')
    expect(formatRupiah(1250000)).toBe('Rp1.250.000')
    expect(formatRupiah(0)).toBe('Rp0')
  })
})

describe('hitung total', () => {
  it('produk satuan = harga x jumlah', () => {
    expect(getLineTotal(karambolLine(3))).toBe(product('karambol').price * 3)
  })

  it('bundle memakai harga bundle, bukan jumlah harga isinya', () => {
    expect(getLineTotal(fullStackLine(2))).toBe(bundle('full-stack').price * 2)
  })

  it('menjumlahkan campuran produk dan bundle', () => {
    const lines = [karambolLine(2), sandwichLine(1), fullStackLine(1)]
    expect(calculateOrderTotal(lines)).toBe(
      product('karambol').price * 2 + product('sandwich').price + bundle('full-stack').price,
    )
  })

  it('baris kosong atau jumlah tidak valid bernilai 0', () => {
    expect(calculateOrderTotal([createLine(), karambolLine(0), karambolLine(Number.NaN)])).toBe(0)
  })

  it('harga normal & hemat bundle dihitung dari harga produk', () => {
    const fullStack = bundle('full-stack')
    const normal = product('karambol').price + product('sandwich').price + product('goreng').price
    expect(getBundleNormalPrice(fullStack)).toBe(normal)
    expect(getBundleSavings(fullStack)).toBe(normal - fullStack.price)

    const pair = bundle('byte-pair')
    expect(getBundleNormalPrice(pair)).toBe(product('karambol').price * 2)
    expect(getBundleSavings(pair)).toBe(product('karambol').price * 2 - pair.price)
  })
})

describe('validasi tanggal (PO ditutup H-1)', () => {
  it('tanggal minimal adalah besok', () => {
    expect(getMinPickupDate(NOW)).toBe('2026-09-29')
  })

  it('menolak hari ini dan tanggal lampau', () => {
    expect(validatePickupDate('2026-09-28', NOW)).toMatch(/H-1/)
    expect(validatePickupDate('2026-09-01', NOW)).toMatch(/H-1/)
  })

  it('menerima besok dan setelahnya', () => {
    expect(validatePickupDate('2026-09-29', NOW)).toBeUndefined()
    expect(validatePickupDate('2026-12-24', NOW)).toBeUndefined()
  })

  it('tetap benar di akhir hari, akhir bulan, dan akhir tahun', () => {
    expect(getMinPickupDate(new Date(2026, 8, 28, 23, 59))).toBe('2026-09-29')
    expect(getMinPickupDate(new Date(2026, 8, 30, 12))).toBe('2026-10-01')
    expect(getMinPickupDate(new Date(2026, 11, 31, 12))).toBe('2027-01-01')
  })

  it('menolak tanggal kosong atau tidak valid', () => {
    expect(validatePickupDate('', NOW)).toBeDefined()
    expect(validatePickupDate('besok', NOW)).toBeDefined()
    expect(validatePickupDate('2026-02-30', NOW)).toBeDefined()
  })
})

describe('aturan pengantaran', () => {
  // Saat ini semua menu bisa diantar; aturan dites dengan menandai Es Krim Goreng sementara sebagai non-deliverable.
  const pickupOnly: Partial<Product> = { deliverable: false, availability: 'Booth/event tertentu' }

  it('produk non-deliverable + antar ditolak dengan pesan jelas', () => {
    withProduct('goreng', pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [gorengLine()], method: 'delivery', address: 'Kos Melati' }), NOW)
      expect(errors.method).toContain(product('goreng').name)
      expect(errors.method).toContain('tidak bisa diantar')
      expect(errors.method).toContain('booth/event tertentu')
    })
  })

  it('bundle yang berisi produk non-deliverable juga ditolak', () => {
    withProduct('goreng', pickupOnly, () => {
      const conflict = getDeliveryConflict([fullStackLine()])
      expect(conflict).toContain(bundle('full-stack').name)
      expect(conflict).toContain(product('goreng').name)
    })
  })

  it('produk non-deliverable boleh diambil di booth', () => {
    withProduct('goreng', pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [gorengLine(), fullStackLine()], method: 'pickup' }), NOW)
      expect(hasErrors(errors)).toBe(false)
    })
  })

  it('produk deliverable boleh diantar asal lokasi diisi', () => {
    withProduct('goreng', { deliverable: true }, () => {
      const lines = [karambolLine(), sandwichLine(), gorengLine(), fullStackLine()]
      expect(getDeliveryConflict(lines)).toBeUndefined()
      expect(validateOrder(validForm({ lines, method: 'delivery', address: '' }), NOW).address).toBeDefined()
      expect(hasErrors(validateOrder(validForm({ lines, method: 'delivery', address: 'Gedung B' }), NOW))).toBe(false)
    })
  })
})

describe('validasi form', () => {
  it('form lengkap lolos validasi', () => {
    expect(validateOrder(validForm(), NOW)).toEqual({})
  })

  it('field wajib kosong ditolak', () => {
    const errors = validateOrder(
      { name: ' ', phone: '', lines: [], date: '', method: '', address: '', notes: '' },
      NOW,
    )
    expect(Object.keys(errors).sort()).toEqual(['date', 'items', 'method', 'name', 'phone'])
  })

  it('jumlah harus bilangan bulat >= 1', () => {
    const bad = karambolLine(0)
    expect(validateOrder(validForm({ lines: [bad] }), NOW).lines?.[bad.key]?.qty).toBeDefined()
    const frac = karambolLine(1.5)
    expect(validateOrder(validForm({ lines: [frac] }), NOW).lines?.[frac.key]?.qty).toBeDefined()
  })

  it('item dan varian wajib dipilih', () => {
    const empty = createLine()
    const noOptions = line({ kind: 'product', itemId: 'karambol' })
    const errors = validateOrder(validForm({ lines: [empty, noOptions] }), NOW)
    expect(errors.lines?.[empty.key]?.item).toBeDefined()
    expect(Object.keys(errors.lines?.[noOptions.key]?.options ?? {})).toEqual(['karambol.topping'])
  })

  it('varian bundle mencakup semua produk di dalamnya', () => {
    const keys = getOptionFields({ kind: 'bundle', itemId: 'full-stack' }).map((f) => f.key)
    expect(keys).toEqual(['karambol.topping', 'sandwich.rasa'])
  })

  it('nomor WhatsApp dinormalisasi & divalidasi', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizePhone('[ISI_NOMOR_WA]')).toBe('')
    expect(validatePhone('081234567890')).toBeUndefined()
    expect(validatePhone('12345')).toBeDefined()
    expect(validatePhone('08abc')).toBeDefined()
  })
})

describe('catatan kemasan', () => {
  it('muncul untuk produk yang punya packagingNote, termasuk di dalam bundle', () => {
    withProduct('karambol', { packagingNote: 'Topping dikemas terpisah.' }, () => {
      expect(getPackagingNotes([karambolLine()])).toEqual(['Topping dikemas terpisah.'])
      expect(getPackagingNotes([fullStackLine(), karambolLine()])).toEqual(['Topping dikemas terpisah.'])
      expect(getPackagingNotes([sandwichLine()])).toEqual([])
      expect(buildWhatsAppMessage(validForm())).toContain('_Info: Topping dikemas terpisah._')
    })
  })
})

describe('pesan WhatsApp', () => {
  const form = validForm({
    name: 'Budi & Sari',
    lines: [karambolLine(2), fullStackLine(1)],
    notes: 'Saus #1 + ekstra 50%? Makasih',
  })
  const message = buildWhatsAppMessage(form)

  it('berisi rangkuman lengkap', () => {
    expect(message).toContain('*Nama:* Budi & Sari')
    expect(message).toContain('*No. WA:* 0812-3456-7890')
    expect(message).toContain(`1. ${product('karambol').name}`)
    expect(message).toContain(`2 x ${formatRupiah(product('karambol').price)} = ${formatRupiah(product('karambol').price * 2)}`)
    expect(message).toContain('Topping: Lotus Biscoff')
    expect(message).toContain('1x Es Krim Karambol (Topping: Oreo)')
    expect(message).toContain(`2. ${bundle('full-stack').name} (bundle)`)
    expect(message).toContain('Rasa: Cookies & Cream')
    expect(message).toContain(`*Total:* ${formatRupiah(calculateOrderTotal(form.lines))}`)
    expect(message).toContain('*Tanggal ambil:* Selasa, 29 September 2026')
    expect(message).toContain('*Metode:* Ambil di booth')
    expect(message).toContain('*Catatan:* Saus #1 + ekstra 50%? Makasih')
  })

  it('menyertakan lokasi antar kalau metode antar', () => {
    const msg = buildWhatsAppMessage(validForm({ method: 'delivery', address: 'Kos Melati No. 3' }))
    expect(msg).toContain('*Metode:* Antar')
    expect(msg).toContain('*Lokasi antar:* Kos Melati No. 3')
  })

  it('URL wa.me ter-encode dengan benar', () => {
    const url = buildWhatsAppUrl('0812-3456-7890', message)
    expect(url.startsWith('https://wa.me/6281234567890?text=')).toBe(true)

    const encoded = url.split('?text=')[1]
    // Karakter spesial harus ter-encode supaya tidak memotong/merusak query string.
    for (const raw of ['&', '#', '+', '?', '\n', ' ']) {
      expect(encoded).not.toContain(raw)
    }
    expect(encoded).toContain('%26') // &
    expect(encoded).toContain('%23') // #
    expect(encoded).toContain('%2B') // +
    expect(encoded).toContain('%25') // %
    expect(encoded).toContain('%0A') // baris baru

    // Round-trip: hasil decode identik dengan pesan asli.
    expect(new URL(url).searchParams.get('text')).toBe(message)
    expect(decodeURIComponent(encoded)).toBe(message)
  })
})
