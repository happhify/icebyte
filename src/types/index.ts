export type Texture = 'sandwich' | 'drink'

export interface TextureInfo {
  id: Texture
  label: string
}

/** Grup pilihan varian, mis. "Saus" dengan pilihan Karamel / Cokelat. */
export interface OptionGroup {
  /** Unik di dalam satu produk, mis. "saus". */
  id: string
  label: string
  choices: string[]
}

export interface Product {
  id: string
  name: string
  /** Nama menu versi "Byte", mis. CrunchByte. */
  codename: string
  description: string
  texture: Texture
  price: number
  /** false = tidak bisa dipesan dengan metode antar. */
  deliverable: boolean
  /** Info ketersediaan khusus, tampil sebagai badge. */
  availability?: string
  optionGroups: OptionGroup[]
  /** Otomatis ditambahkan ke form & pesan WA kalau produk ini dipesan. */
  packagingNote?: string
  /** Path foto asli (mis. "images/gabin.jpg", tanpa "/" di depan). Kosong = tampil placeholder. */
  image?: string
  /** Label placeholder foto sekaligus alt text. */
  imageLabel: string
  /** Foto tambahan (mis. per rasa), tampil sebagai tombol di bawah foto utama. */
  gallery?: GalleryImage[]
}

export interface GalleryImage {
  label: string
  /** Path foto, sama seperti `image`. */
  image: string
}

export interface BundleItem {
  productId: string
  qty: number
  /** Varian tetap, key = id grup opsi (mis. { rasa: 'Strawberry' }). Grup yang diisi di sini tidak ditanyakan di form. */
  options?: Record<string, string>
}

export interface Bundle {
  id: string
  name: string
  description: string
  price: number
  items: BundleItem[]
}

export interface Testimonial {
  name: string
  quote: string
  /** Mis. "Mahasiswa Teknik Sipil" atau "via Instagram". */
  source?: string
}

export interface PoBatch {
  name: string
  /** YYYY-MM-DD, hari pertama form PO dibuka. */
  orderStart: string
  /** YYYY-MM-DD, hari terakhir form PO dibuka (ikut dihitung). */
  orderEnd: string
  /** YYYY-MM-DD, tanggal ambil/antar semua pesanan batch ini. */
  fulfillmentDate: string
}

export interface WhatsAppAdmin {
  label: string
  /** Ditampilkan apa adanya. Format 08xx, +62, atau 62xx diterima. */
  phone: string
}

export interface FaqItem {
  question: string
  answer: string
  /** Poin tambahan, tampil sebagai daftar di bawah jawaban. */
  points?: string[]
}

export interface SiteConfig {
  brand: {
    name: string
    version: string
    slogan: string
    tagline: string
    valueProp: string
    heroDescription: string
  }
  campus: {
    name: string
  }
  contact: {
    /** Admin penerima PO. Pembeli memilih salah satu di form; semuanya tampil di footer. */
    whatsappAdmins: WhatsAppAdmin[]
    instagram: string
  }
  about: {
    intro: string
    nameStory: string
    /** Cerita di balik IceByte, satu string = satu paragraf. */
    inspiration: string[]
  }
  textures: TextureInfo[]
  /** PO dibuka per batch. Di luar masa batch, form PO ditutup. */
  batches: PoBatch[]
  products: Product[]
  bundles: Bundle[]
  /** Metode yang bisa dipilih di form. Kalau cuma satu, pilihan metode tidak ditampilkan. */
  fulfillmentMethods: FulfillmentMethod[]
  delivery: {
    /** Area jangkauan antar, mis. "sekitar Telkom University". */
    area: string
    /** Kosong = tidak ditampilkan. */
    fee: string
  }
  payment: {
    methods: string[]
  }
  byteSquad: {
    stampsNeeded: number
    stampRewardProductId: string
    terms: string[]
  }
  patchUpdate: {
    version: string
    title: string
    description: string
  }
  testimonials: Testimonial[]
  faq: FaqItem[]
}

export type ItemKind = 'product' | 'bundle'

export interface OrderLine {
  /** Key lokal untuk React & pemetaan error. */
  key: string
  kind: ItemKind
  /** '' = belum dipilih. */
  itemId: string
  qty: number
  /** Key: `${productId}.${optionGroupId}`, value: pilihan. */
  options: Record<string, string>
}

export type FulfillmentMethod = 'pickup' | 'delivery'

export interface OrderForm {
  name: string
  phone: string
  lines: OrderLine[]
  method: FulfillmentMethod | ''
  address: string
  notes: string
}

export interface LineErrors {
  item?: string
  qty?: string
  options?: Record<string, string>
}

export interface OrderErrors {
  name?: string
  phone?: string
  items?: string
  lines?: Record<string, LineErrors>
  batch?: string
  method?: string
  address?: string
}
