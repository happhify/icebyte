import { afterAll, describe, expect, it } from 'vitest'
import { site } from '../config/site'
import type { Bundle, OrderForm, OrderLine, PoBatch, Product } from '../types'
import {
  buildOrderLogFormBody,
  buildOrderLogRecord,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  calculateOrderTotal,
  createLine,
  createOrderId,
  formatRupiah,
  getBundleNormalPrice,
  getBundleSavings,
  getDeliveryConflict,
  getLineTotal,
  getNextBatch,
  getOpenBatch,
  formatDateRange,
  parseISODate,
  getOptionFields,
  getPackagingNotes,
  hasErrors,
  normalizePhone,
  validateOrder,
  validatePhone,
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

// Produk kedua khusus test (config saat ini hanya punya Es Krim Gabin), untuk menguji
// pesanan campuran dan aturan produk yang tidak bisa diantar.
const TEST_DRINK: Product = {
  id: 'drink-test',
  name: 'Minuman Test',
  codename: 'TestByte',
  description: 'Produk contoh khusus test.',
  texture: 'drink',
  price: 13000,
  deliverable: true,
  optionGroups: [],
  imageLabel: 'Minuman Test',
}

// Bundle contoh, supaya test tidak bergantung pada isi bundle di config.
const TEST_BUNDLE: Bundle = {
  id: 'combo-test',
  name: 'Combo Test',
  description: 'Bundle contoh khusus test.',
  price: 18000,
  items: [
    { productId: 'sandwich', qty: 1 },
    { productId: TEST_DRINK.id, qty: 1 },
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
// Batch contoh yang mencakup NOW, supaya test tidak bergantung pada tanggal batch asli.
const TEST_BATCH: PoBatch = {
  name: 'Batch Test',
  orderStart: '2026-09-25',
  orderEnd: '2026-09-30',
  fulfillmentDate: '2026-10-03',
}
const CONFIG_BATCHES = [...site.batches]
const CONFIG_METHODS = [...site.fulfillmentMethods]

// Dipasang saat file dimuat (bukan di beforeAll) karena sebagian pesan dibuat saat describe dikumpulkan.
site.products.push(TEST_DRINK)
site.bundles.push(TEST_BUNDLE, TEST_TRIO)
site.batches.splice(0, site.batches.length, TEST_BATCH)
// Test aturan ambil vs antar butuh kedua metode aktif, apa pun isi config saat ini.
site.fulfillmentMethods.splice(0, site.fulfillmentMethods.length, 'pickup', 'delivery')
afterAll(() => {
  site.fulfillmentMethods.splice(0, site.fulfillmentMethods.length, ...CONFIG_METHODS)
  site.batches.splice(0, site.batches.length, ...CONFIG_BATCHES)
  site.bundles.splice(site.bundles.indexOf(TEST_BUNDLE), 1)
  site.bundles.splice(site.bundles.indexOf(TEST_TRIO), 1)
  site.products.splice(site.products.indexOf(TEST_DRINK), 1)
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
const drinkLine = (qty = 1): OrderLine => line({ kind: 'product', itemId: TEST_DRINK.id, qty })
const comboLine = (qty = 1): OrderLine =>
  line({ kind: 'bundle', itemId: TEST_BUNDLE.id, qty, options: { 'sandwich.rasa': 'Strawberry' } })

// Senin, 28 September 2026 jam 10:00 waktu lokal.
const NOW = new Date(2026, 8, 28, 10, 0)

function validForm(overrides: Partial<OrderForm> = {}): OrderForm {
  return {
    name: 'Rara',
    phone: '0812-3456-7890',
    lines: [gabinLine(2)],
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
    const lines = [gabinLine(2), drinkLine(1), comboLine(1)]
    expect(calculateOrderTotal(lines)).toBe(
      product('sandwich').price * 2 + product(TEST_DRINK.id).price + TEST_BUNDLE.price,
    )
  })

  it('baris kosong atau jumlah tidak valid bernilai 0', () => {
    expect(calculateOrderTotal([createLine(), gabinLine(0), gabinLine(Number.NaN)])).toBe(0)
  })

  it('harga normal & hemat bundle dihitung dari harga produk', () => {
    const combo = bundle(TEST_BUNDLE.id)
    const normal = product('sandwich').price + product(TEST_DRINK.id).price
    expect(getBundleNormalPrice(combo)).toBe(normal)
    expect(getBundleSavings(combo)).toBe(normal - combo.price)
  })
})

describe('batch PO', () => {
  it('buka dari orderStart sampai akhir hari orderEnd', () => {
    expect(getOpenBatch(new Date(2026, 8, 25, 0, 0))?.name).toBe(TEST_BATCH.name)
    expect(getOpenBatch(new Date(2026, 8, 30, 23, 59))?.name).toBe(TEST_BATCH.name)
    expect(getOpenBatch(new Date(2026, 8, 24, 23, 59))).toBeUndefined()
    expect(getOpenBatch(new Date(2026, 9, 1, 0, 0))).toBeUndefined()
  })

  it('di luar masa batch, form ditolak dengan info batch berikutnya', () => {
    const before = new Date(2026, 8, 20, 10)
    expect(getNextBatch(before)?.name).toBe(TEST_BATCH.name)
    expect(validateOrder(validForm(), before).batch).toContain('baru dibuka Jumat, 25 September 2026')

    const after = new Date(2026, 9, 5, 10)
    expect(getNextBatch(after)).toBeUndefined()
    expect(validateOrder(validForm(), after).batch).toContain(`@${site.contact.instagram}`)
  })

  it('rentang tanggal diformat ringkas', () => {
    expect(formatDateRange('2026-10-11', '2026-10-14')).toBe('11–14 Oktober 2026')
    expect(formatDateRange('2026-10-30', '2026-11-02')).toBe('30 Oktober 2026 – 2 November 2026')
  })

  it('semua batch di config valid & berurutan', () => {
    for (const b of CONFIG_BATCHES) {
      for (const value of [b.orderStart, b.orderEnd, b.fulfillmentDate]) {
        expect(parseISODate(value), `${b.name}: ${value}`).not.toBeNull()
      }
      expect(b.orderStart <= b.orderEnd, `${b.name}: orderStart <= orderEnd`).toBe(true)
      expect(b.orderEnd < b.fulfillmentDate, `${b.name}: orderEnd < fulfillmentDate`).toBe(true)
    }
  })
})

describe('aturan pengantaran', () => {
  // Saat ini semua menu bisa diantar; aturan dites dengan menandai produk contoh sementara sebagai non-deliverable.
  const pickupOnly: Partial<Product> = { deliverable: false, availability: 'Booth/event tertentu' }

  it('produk non-deliverable + antar ditolak dengan pesan jelas', () => {
    withProduct(TEST_DRINK.id, pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [drinkLine()], method: 'delivery', address: 'Kos Melati' }), NOW)
      expect(errors.method).toContain(product(TEST_DRINK.id).name)
      expect(errors.method).toContain('tidak bisa diantar')
      expect(errors.method).toContain('booth/event tertentu')
    })
  })

  it('bundle yang berisi produk non-deliverable juga ditolak', () => {
    withProduct(TEST_DRINK.id, pickupOnly, () => {
      const conflict = getDeliveryConflict([comboLine()])
      expect(conflict).toContain(TEST_BUNDLE.name)
      expect(conflict).toContain(product(TEST_DRINK.id).name)
    })
  })

  it('produk non-deliverable boleh diambil di booth', () => {
    withProduct(TEST_DRINK.id, pickupOnly, () => {
      const errors = validateOrder(validForm({ lines: [drinkLine(), comboLine()], method: 'pickup' }), NOW)
      expect(hasErrors(errors)).toBe(false)
    })
  })

  it('kalau hanya antar yang aktif, ambil di booth ditolak', () => {
    site.fulfillmentMethods.splice(0, site.fulfillmentMethods.length, 'delivery')
    try {
      expect(validateOrder(validForm({ method: 'pickup' }), NOW).method).toContain('belum tersedia')
      expect(hasErrors(validateOrder(validForm({ method: 'delivery', address: 'Gedung B' }), NOW))).toBe(false)
      withProduct(TEST_DRINK.id, pickupOnly, () => {
        expect(getDeliveryConflict([drinkLine()])).not.toContain('Ambil di booth')
      })
    } finally {
      site.fulfillmentMethods.splice(0, site.fulfillmentMethods.length, 'pickup', 'delivery')
    }
  })

  it('produk deliverable boleh diantar asal lokasi diisi', () => {
    withProduct(TEST_DRINK.id, { deliverable: true }, () => {
      const lines = [gabinLine(), drinkLine(), comboLine()]
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
      { name: ' ', phone: '', lines: [], method: '', address: '', notes: '' },
      NOW,
    )
    expect(Object.keys(errors).sort()).toEqual(['items', 'method', 'name', 'phone'])
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

    const message = buildWhatsAppMessage(validForm({ lines: [trio] }), NOW)
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
      expect(getPackagingNotes([drinkLine()])).toEqual([])
      expect(buildWhatsAppMessage(validForm(), NOW)).toContain('_Info: Es krim dikemas dengan ice gel._')
    })
  })
})

describe('pesan WhatsApp', () => {
  const form = validForm({
    name: 'Budi & Sari',
    lines: [gabinLine(2), comboLine(1)],
    notes: 'Saus #1 + ekstra 50%? Makasih',
  })
  const message = buildWhatsAppMessage(form, NOW)

  it('berisi rangkuman lengkap', () => {
    expect(message).toContain('*Nama:* Budi & Sari')
    expect(message).toContain('*No. WA:* 0812-3456-7890')
    expect(message).toContain(`1. ${product('sandwich').name}`)
    expect(message).toContain(`2 x ${formatRupiah(product('sandwich').price)} = ${formatRupiah(product('sandwich').price * 2)}`)
    expect(message).toContain('Rasa: Oreo Mint')
    expect(message).toContain('1x Es Krim Gabin (Rasa: Strawberry)')
    expect(message).toContain(`1x ${TEST_DRINK.name}`)
    expect(message).toContain(`2. ${TEST_BUNDLE.name} (bundle)`)
    expect(message).toContain(`*Total:* ${formatRupiah(calculateOrderTotal(form.lines))}`)
    expect(message).toContain('*Batch PO:* Batch Test')
    expect(message).toContain('*Tanggal ambil:* Sabtu, 3 Oktober 2026')
    expect(message).toContain('*Metode:* Ambil di booth')
    expect(message).toContain('*Catatan:* Saus #1 + ekstra 50%? Makasih')
  })

  it('menyertakan lokasi antar kalau metode antar', () => {
    const msg = buildWhatsAppMessage(validForm({ method: 'delivery', address: 'Kos Melati No. 3' }), NOW)
    expect(msg).toContain('*Metode:* Antar')
    expect(msg).toContain('*Tanggal antar:* Sabtu, 3 Oktober 2026')
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

describe('rekap order', () => {
  const form = validForm({
    phone: '+62 812 3456 7890',
    lines: [gabinLine(2), comboLine(1)],
    method: 'delivery',
    address: 'Kos Melati No. 3',
    notes: ' Jangan pedas ',
  })

  it('ID order berisi tanggal + kode acak tanpa huruf yang mirip', () => {
    expect(createOrderId(NOW, () => 0)).toBe('IB-0928-AAAA')
    expect(createOrderId(NOW, () => 0.999)).toBe('IB-0928-9999')
    expect(createOrderId(NOW)).toMatch(/^IB-0928-[A-HJ-NP-Z2-9]{4}$/)
  })

  it('ID order ikut tertulis di pesan WhatsApp', () => {
    expect(buildWhatsAppMessage(form, NOW, 'IB-0928-K3F9')).toContain('*ID Order:* IB-0928-K3F9')
    expect(buildWhatsAppMessage(form, NOW)).not.toContain('ID Order')
  })

  it('satu baris rekap berisi data pesanan lengkap', () => {
    const record = buildOrderLogRecord(form, { id: 'IB-0928-K3F9', now: NOW, admin: 'Admin 1' })
    expect(record).toEqual({
      id: 'IB-0928-K3F9',
      source: 'Website',
      createdAt: '2026-09-28 10:00',
      batch: TEST_BATCH.name,
      deliveryDate: 'Sabtu, 3 Oktober 2026',
      name: 'Rara',
      phone: '+62 812 3456 7890',
      method: 'Antar',
      address: 'Kos Melati No. 3',
      items: [
        '2x Es Krim Gabin — Rasa: Oreo Mint',
        `1x ${TEST_BUNDLE.name} (bundle) — 1x Es Krim Gabin (Rasa: Strawberry); 1x ${TEST_DRINK.name}`,
      ].join('\n'),
      total: calculateOrderTotal(form.lines),
      notes: 'Jangan pedas',
      admin: 'Admin 1',
    })
  })

  it('pesanan dari mode admin ditandai Chat WA', () => {
    const record = buildOrderLogRecord(form, { id: 'x', now: NOW, admin: 'Admin 1', source: 'Chat WA' })
    expect(record.source).toBe('Chat WA')
  })

  it('dikirim ke Google Form hanya untuk data yang punya field', () => {
    const record = buildOrderLogRecord(form, { id: 'IB-0928-K3F9', now: NOW, admin: 'Admin 1' })
    const body = buildOrderLogFormBody(record, { id: 'entry.1', total: 'entry.2', items: 'entry.3' })
    expect([...body.keys()]).toEqual(['entry.1', 'entry.2', 'entry.3'])
    expect(body.get('entry.1')).toBe('IB-0928-K3F9')
    expect(body.get('entry.2')).toBe(String(calculateOrderTotal(form.lines)))
    expect(body.get('entry.3')).toBe(record.items)
    expect(buildOrderLogFormBody(record, {}).toString()).toBe('')
  })

  it('lokasi dikosongkan kalau bukan antar', () => {
    const record = buildOrderLogRecord(validForm({ address: 'sisa ketikan' }), { id: 'x', now: NOW, admin: 'A' })
    expect(record.address).toBe('')
  })
})

