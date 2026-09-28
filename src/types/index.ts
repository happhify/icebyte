export type Texture = 'crunchy' | 'sandwich' | 'crispy'

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
  /** Path foto asli (mis. "/images/karambol.jpg"). Kosong = tampil placeholder. */
  image?: string
  /** Label placeholder foto sekaligus alt text. */
  imageLabel: string
}

export interface BundleItem {
  productId: string
  qty: number
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
    /** Format internasional tanpa +, mis. 6281234567890. Format 08xx juga diterima. */
    whatsapp: string
    instagram: string
  }
  about: {
    intro: string
    nameStory: string
    /** Cerita di balik IceByte, satu string = satu paragraf. */
    inspiration: string[]
  }
  textures: TextureInfo[]
  products: Product[]
  bundles: Bundle[]
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
    referralReward: string
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
  /** YYYY-MM-DD */
  date: string
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
  date?: string
  method?: string
  address?: string
}
