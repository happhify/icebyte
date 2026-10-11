import type { Bundle, FaqItem, Product, SiteConfig } from '../types'

/**
 * ============================================================
 *  SATU-SATUNYA SUMBER DATA WEBSITE ICEBYTE
 * ============================================================
 *  - Bagian bertanda DRAFT sudah terisi tapi sebaiknya dicek ulang tim.
 *  - Kalau menambah data yang belum pasti, tulis sebagai placeholder dalam
 *    [KURUNG_SIKU], mis. "[ISI_...]", supaya mudah dicari.
 *  - Harga masih ESTIMASI. Ubah angka di sini -> otomatis berubah di
 *    kartu menu, bundle (termasuk harga coret & hemat), dan total form PO.
 * ============================================================
 */

const contact = {
  // Pembeli memilih admin di form PO. Nomor ditampilkan apa adanya;
  // format "0812...", "+62 812..." atau "62812..." otomatis diubah ke "62812..." untuk link WA.
  whatsappAdmins: [
    { label: 'Admin Baik', phone: '0882-7947-0512' },
    { label: 'Admin Ganteng', phone: '0821-8226-2358' },
  ],
  // Username saja, tanpa "@" dan tanpa link.
  instagram: 'byte.ice',
}

const campus = {
  name: 'Telkom University',
}

const delivery = {
  // Ditampilkan sebagai "Area antar: ...".
  area: 'sekitar Telkom University',
  // Kosong = tidak ditampilkan. Isi mis. "Gratis" atau "Rp2.000" kalau sudah pasti
  // (tidak ikut dihitung di total form).
  fee: '',
}

const payment = {
  methods: ['QRIS', 'Tunai'],
}

const products: Product[] = [
  {
    id: 'sandwich',
    name: 'Es Krim Gabin',
    codename: 'SandByte',
    description:
      'Es krim dingin dijepit dua keping biskuit crackers yang renyah. Simpel, praktis, dan pas buat jajan di sela kelas.',
    texture: 'sandwich',
    price: 13000,
    deliverable: true,
    optionGroups: [{ id: 'rasa', label: 'Rasa', choices: ['Oreo Mint', 'Strawberry', 'Cokelat'] }],
    image: 'images/gabin.jpg',
    imageLabel: 'Es Krim Gabin',
    gallery: [
      { label: 'Semua', image: 'images/gabin.jpg' },
      { label: 'Oreo Mint', image: 'images/gabin-oreo-mint.jpg' },
      { label: 'Strawberry', image: 'images/gabin-strawberry.jpg' },
      { label: 'Cokelat', image: 'images/gabin-cokelat.jpg' },
    ],
  },
  {
    id: 'milk-tea',
    name: 'Roasted Milk Tea',
    // DRAFT — codename & deskripsi silakan disesuaikan tim.
    codename: 'SipByte',
    description:
      'Teh susu dengan aroma teh panggang yang khas, manis dan creamy. Pas jadi teman es krim gabin di sela kelas.',
    texture: 'drink',
    price: 13000,
    deliverable: true,
    optionGroups: [],
    image: 'images/milk-tea.jpg',
    imageLabel: 'Roasted Milk Tea dalam botol',
  },
]

// Kosong = section Bundle, menu navbar Bundle, dan pilihan bundle di form disembunyikan.
const bundles: Bundle[] = [
  {
    id: 'full-stack',
    name: 'Full Stack',
    description: 'Satu Es Krim Gabin rasa pilihanmu plus satu Roasted Milk Tea. Paket lengkap: yang dingin-renyah dan yang bisa diseruput.',
    price: 22000,
    items: [
      { productId: 'sandwich', qty: 1 },
      { productId: 'milk-tea', qty: 1 },
    ],
  },
  {
    id: 'byte-trio',
    name: 'Byte Trio',
    description: 'Tiga Es Krim Gabin, satu dari tiap rasa. Cobain semua varian sekaligus!',
    price: 27000,
    items: [
      { productId: 'sandwich', qty: 1, options: { rasa: 'Oreo Mint' } },
      { productId: 'sandwich', qty: 1, options: { rasa: 'Strawberry' } },
      { productId: 'sandwich', qty: 1, options: { rasa: 'Cokelat' } },
    ],
  },
  {
    id: 'byte-pair',
    name: 'Byte Pair',
    description: 'Dua Roasted Milk Tea buat kamu dan bestie. Berdua lebih hemat.',
    price: 25000,
    items: [{ productId: 'milk-tea', qty: 2 }],
  },
]

const deliverableNames = products.filter((p) => p.deliverable).map((p) => p.name)
const pickupOnly = products.filter((p) => !p.deliverable)
const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id

const faq: FaqItem[] = [
  {
    question: 'Es krimnya tahan berapa lama kalau dibawa?',
    answer:
      'Di suhu ruang, es krim mulai meleleh sekitar 10–15 menit setelah diterima, jadi paling enak langsung dinikmati. Beberapa tips supaya tetap enak:',
    points: [
      'Belum mau dimakan? Simpan di freezer dan habiskan di hari yang sama.',
      'Kalau dibawa agak jauh, pakai tas atau cooler bag dan hindari sinar matahari langsung.',
    ],
  },
  {
    question: 'Bisa diantar? Sampai mana?',
    answer: [
      `Bisa untuk ${pickupOnly.length === 0 ? 'semua menu' : deliverableNames.join(', ')}, area ${delivery.area}.`,
      delivery.fee ? `Ongkos antar: ${delivery.fee}.` : '',
      ...pickupOnly.map((p) => `${p.name} tidak untuk pengantaran — hanya di ${(p.availability ?? 'booth').toLowerCase()}.`),
    ]
      .filter(Boolean)
      .join(' '),
  },
  {
    question: 'Kapan PO ditutup?',
    answer:
      'Pre-order ditutup H-1, jadi pesan paling lambat sehari sebelum tanggal ambil. Pesanan baru diproses setelah dikonfirmasi admin lewat WhatsApp.',
  },
  {
    question: 'Bayarnya pakai apa?',
    answer: `Bisa ${payment.methods.join(' atau ')}. Detail pembayaran dikirim admin waktu konfirmasi pesanan di WhatsApp.`,
  },
  {
    question: 'Bisa PO untuk acara himpunan, UKM, atau kepanitiaan?',
    answer: 'Bisa banget! Chat admin lewat WhatsApp dengan info tanggal, jumlah, dan lokasi acara. Ketentuannya:',
    // DRAFT — sesuaikan angka (minimal order, H-berapa, DP) dengan kesepakatan tim.
    points: [
      'Minimal 20 pcs per pesanan, boleh campur menu dan varian.',
      'Pesan paling lambat H-3 sebelum acara supaya bahan dan produksi siap.',
      'DP 50% saat pesanan dikonfirmasi, pelunasan saat pesanan diambil atau diantar.',
      `Pengantaran untuk area ${delivery.area}.`,
      'Perubahan jumlah paling lambat H-2. DP tidak dikembalikan kalau pesanan dibatalkan.',
    ],
  },
]

const stampsNeeded = 8
const stampReward = 'sandwich'
const stampsPerBundle = bundles
  .map((b) => `${b.name} = ${b.items.reduce((n, item) => n + item.qty, 0)} stamp`)
  .join(', ')

export const site: SiteConfig = {
  brand: {
    name: 'IceByte',
    version: 'v1.0',
    slogan: 'Take a Byte!',
    tagline: 'Es Krim Gabin & Roasted Milk Tea — pick your Byte.',
    valueProp: 'Es krim gabin dan roasted milk tea dalam satu gerai kampus, dengan harga mahasiswa.',
    heroDescription: `Es krim gabin tiga rasa dan roasted milk tea buatan mahasiswa ${campus.name}. Harganya ramah di kantong — pilih favoritmu dan pesan langsung lewat WhatsApp.`,
  },
  campus,
  contact,
  about: {
    intro: `IceByte adalah usaha es krim yang dijalankan sepuluh mahasiswa S1 Teknik Komputer di ${campus.name}.`,
    nameStory:
      'Namanya gabungan dua dunia kami: "Ice" dari es krim, dan "Byte" dari satuan data di komputer — sekaligus plesetan "bite", alias gigitan.',
    // DRAFT — silakan disesuaikan dengan cerita asli tim.
    inspiration: [
      `Kami bersepuluh adalah mahasiswa S1 Teknik Komputer ${campus.name}. Hari-hari kami diisi coding, praktikum, dan debugging sampai larut — dan di sela semua itu, jajanan manis selalu jadi penyelamat.`,
      'Dari obrolan di sela tugas, muncul ide: kenapa nggak bikin jajanan sendiri yang enak, beda, dan tetap ramah di kantong mahasiswa? Kami mulai dari es krim gabin dengan tiga varian rasa — Oreo Mint, Strawberry, dan Cokelat — ditemani roasted milk tea buat yang mau seruput sesuatu.',
      'IceByte kami jalankan seperti satu tim proyek: ada yang pegang produksi, keuangan, promosi, sampai website ini. Cara kerjanya pun ala anak Teknik Komputer — coba, evaluasi, perbaiki, lalu rilis versi yang lebih baik. Ini baru v1.0, dan kami akan terus update.',
    ],
  },
  textures: [
    { id: 'sandwich', label: 'Es Krim' },
    { id: 'drink', label: 'Minuman' },
  ],
  products,
  bundles,
  delivery,
  payment,
  byteSquad: {
    stampsNeeded,
    stampRewardProductId: stampReward,
    // DRAFT — sesuaikan dengan aturan yang disepakati tim.
    terms: [
      `Dapat 1 stamp untuk setiap 1 menu yang dibeli${bundles.length > 0 ? `, termasuk isi bundle (${stampsPerBundle})` : ''}.`,
      'Kartu stamp gratis, minta di booth. Pesanan PO lewat WhatsApp dapat stamp saat pesanan diambil atau diantar.',
      `Kartu penuh (${stampsNeeded} stamp) bisa ditukar dengan 1 ${productName(stampReward)} gratis. Satu kartu untuk satu hadiah.`,
      'Stamp dan hadiah tidak bisa diuangkan, dan kartu yang hilang tidak bisa diganti.',
      `Ketentuan bisa berubah sewaktu-waktu — info terbaru di Instagram @${contact.instagram}.`,
    ],
  },
  patchUpdate: {
    version: 'v1.1',
    title: 'Rasa musiman sedang di-compile…',
    description:
      'Varian baru lagi disiapkan buat rilis berikutnya. Mau rasa apa yang di-deploy duluan? Ikut voting di Instagram kami!',
  },
  // Isi HANYA dengan testimoni asli (dengan izin pelanggan). Biarkan kosong kalau belum ada.
  testimonials: [],
  faq,
}
