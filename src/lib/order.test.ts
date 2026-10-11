import { afterAll, describe, expect, it } from 'vitest'
import { site } from '../config/site'
import type { Bundle, OrderForm, OrderLine, Product } from '../types'
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

// Config saat ini tidak punya bundle, jadi logika bundle dites dengan bundle contoh.
const TEST_BUNDLE: Bundle = {
  id: 'combo-test',
  name: 'Combo Test',
  description: 'Bundle contoh khusus test.',
  price: 18000,
  items: [
    { productId: 'sandwich', qty: 1 },
    { productId: 'milk-tea', qty: 1 },
  ],
}
const TEST_TRIO: Bundle = {
  id: 'trio-test',
  name: 'Trio Test',
  description: 'Bundle contoh dengan varian tetap.',
  price: 27000,
  items: [
    { productId: 'sandwich', qty: 1, options: { rasa: 'Oreo Mint' } },
    { productId: 'sandwich', qty: 1, options: { rasa: 'Strawberry' } },
  ],
}
// Dipasang saat file dimuat (bukan di beforeAll) karena sebagian pesan dibuat saat describe dikumpulkan.
site.bundles.push(TEST_BUNDLE, TEST_TRIO)
afterAll(() => {
  site.bundles.splice(site.bundles.indexOf(TEST_BUNDLE), 1)
  site.bundles.splice(site.bundles.indexOf(TEST_TRIO), 1)
})

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

const gabinLine = (qty = 1): OrderLine =>
  line({ kind: 'product', itemId: 'sandwich', qty, options: { 'sandwich.rasa': 'Oreo Mint' } })
const milkTeaLine = (qty = 1): OrderLine => line({ kind: 'product', itemId: 'milk-tea', qty })
const comboLine = (qty = 1): OrderLine =>
  line({ kind: 'bundle', itemId: TEST_BUNDLE.id, qty, options: { 'sandwich.rasa': 'Strawberry' } })

// Senin, 28 September 2026 jam 10:00 waktu lokal.
const NOW = new Date(2026, 8, 28, 10, 0)

function validForm(overrides: Partial<OrderForm> = {}): OrderForm {
  return {
    name: 'Rara',
    phone: '0812-3456-7890',
    lines: [gabinLine(2)],
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
    expect(getLineTotal(gabinLine(3))).toBe(product('sandwich').price * 3)
  })

  it('bundle memakai harga bundle, bukan jumlah harga isinya', () => {
    expect(getLineTotal(comboLine(2))).toBe(TEST_BUNDLE.price * 2)
  })

  it('menjumlahkan campuran produk dan bundle', () => {
    const lines = [gabinLine(2), milkTeaLine(1), comboLine(1)]
    expect(calculateOrderTotal(lines)).toBe(
      product('sandwich').price * 2 + product('milk-tea').price + TEST_BUNDLE.price,
    )
  })

  it('baris kosong atau jumlah tidak valid bernilai 0', () => {
    expect(calculateOrderTotal([createLine(), gabinLine(0), gabinLine(Number.NaN)])).toBe(0)
  })

  it('harga normal & hemat bundle dihitung dari harga produk', () => {
    const combo = bundle(TEST_BUNDLE.id)
    const normal = product('sandwich').price + product('milk-tea').price
    expect(getBundleNormalPrice(combo)).toBe(normal)
    expect(getBundleSavings(combo)).toBe(normal - combo.price)
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
  // Saat ini semua menu bisa diantar; aturan dites dengan menandai Roasted Milk Tea sementara sebagai non-deliverable.
  const pickupOnly: Partial<Product> = { deliverable: false, availability: 'Booth/event tertentu' }

  it('produk non-deliverable + antar ditolak dengan pesan jelas', () => {
    withProduct('milk-tea', pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [milkTeaLine()], method: 'delivery', address: 'Kos Melati' }), NOW)
      expect(errors.method).toContain(product('milk-tea').name)
      expect(errors.method).toContain('tidak bisa diantar')
      expect(errors.method).toContain('booth/event tertentu')
    })
  })

  it('bundle yang berisi produk non-deliverable juga ditolak', () => {
    withProduct('milk-tea', pickupOnly, () => {
      const conflict = getDeliveryConflict([comboLine()])
      expect(conflict).toContain(TEST_BUNDLE.name)
      expect(conflict).toContain(product('milk-tea').name)
    })
  })

  it('produk non-deliverable boleh diambil di booth', () => {
    withProduct('milk-tea', pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [milkTeaLine(), comboLine()], method: 'pickup' }), NOW)
      expect(hasErrors(errors)).toBe(false)
    })
  })

  it('produk deliverable boleh diantar asal lokasi diisi', () => {
    withProduct('milk-tea', { deliverable: true }, () => {
      const lines = [gabinLine(), milkTeaLine(), comboLine()]
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
    const bad = gabinLine(0)
    expect(validateOrder(validForm({ lines: [bad] }), NOW).lines?.[bad.key]?.qty).toBeDefined()
    const frac = gabinLine(1.5)
    expect(validateOrder(validForm({ lines: [frac] }), NOW).lines?.[frac.key]?.qty).toBeDefined()
  })

  it('item dan varian wajib dipilih', () => {
    const empty = createLine()
    const noOptions = line({ kind: 'product', itemId: 'sandwich' })
    const errors = validateOrder(validForm({ lines: [empty, noOptions] }), NOW)
    expect(errors.lines?.[empty.key]?.item).toBeDefined()
    expect(Object.keys(errors.lines?.[noOptions.key]?.options ?? {})).toEqual(['sandwich.rasa'])
  })

  it('varian bundle mencakup semua produk di dalamnya', () => {
    const keys = getOptionFields({ kind: 'bundle', itemId: TEST_BUNDLE.id }).map((f) => f.key)
    expect(keys).toEqual(['sandwich.rasa'])
  })

  it('varian tetap di bundle tidak ditanyakan & tampil di pesan WA', () => {
    const trio = line({ kind: 'bundle', itemId: TEST_TRIO.id })
    expect(getOptionFields(trio)).toEqual([])
    expect(validateOrder(validForm({ lines: [trio] }), NOW)).toEqual({})
    expect(getBundleNormalPrice(TEST_TRIO)).toBe(product('sandwich').price * 2)

    const message = buildWhatsAppMessage(validForm({ lines: [trio] }))
    expect(message).toContain('- 1x Es Krim Gabin (Rasa: Oreo Mint)')
    expect(message).toContain('- 1x Es Krim Gabin (Rasa: Strawberry)')
  })

  it('nomor WhatsApp dinormalisasi & divalidasi', () => {
    expect(normalizePhone('0812-3456-7890')).toBe('6281234567890')
    expect(normalizePhone('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizePhone('[ISI_NOMOR_WA]')).toBe('')
    expect(validatePhone('081234567890')).toBeUndefined()
    expect(validatePhone('12345')).toBeDefined()
    expect(validatePhone('08abc')).toBeDefined()
  })

  it('semua nomor admin di config valid', () => {
    expect(site.contact.whatsappAdmins.length).toBeGreaterThan(0)
    for (const admin of site.contact.whatsappAdmins) {
      expect(validatePhone(admin.phone)).toBeUndefined()
    }
  })
})

describe('catatan kemasan', () => {
  it('muncul untuk produk yang punya packagingNote, termasuk di dalam bundle', () => {
    withProduct('sandwich', { packagingNote: 'Es krim dikemas dengan ice gel.' }, () => {
      expect(getPackagingNotes([gabinLine()])).toEqual(['Es krim dikemas dengan ice gel.'])
      expect(getPackagingNotes([comboLine(), gabinLine()])).toEqual(['Es krim dikemas dengan ice gel.'])
      expect(getPackagingNotes([milkTeaLine()])).toEqual([])
      expect(buildWhatsAppMessage(validForm())).toContain('_Info: Es krim dikemas dengan ice gel._')
    })
  })
})

describe('pesan WhatsApp', () => {
  const form = validForm({
    name: 'Budi & Sari',
    lines: [gabinLine(2), comboLine(1)],
    notes: 'Saus #1 + ekstra 50%? Makasih',
  })
  const message = buildWhatsAppMessage(form)

  it('berisi rangkuman lengkap', () => {
    expect(message).toContain('*Nama:* Budi & Sari')
    expect(message).toContain('*No. WA:* 0812-3456-7890')
    expect(message).toContain(`1. ${product('sandwich').name}`)
    expect(message).toContain(`2 x ${formatRupiah(product('sandwich').price)} = ${formatRupiah(product('sandwich').price * 2)}`)
    expect(message).toContain('Rasa: Oreo Mint')
    expect(message).toContain('1x Es Krim Gabin (Rasa: Strawberry)')
    expect(message).toContain('1x Roasted Milk Tea')
    expect(message).toContain(`2. ${TEST_BUNDLE.name} (bundle)`)
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
