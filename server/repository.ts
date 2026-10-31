import type { OrderStatus, StoredOrder } from '../src/types/index.js'

/** Pesanan baru: semua data kecuali yang diisi database (waktu & status). */
export type NewOrder = Omit<StoredOrder, 'createdAt' | 'updatedAt' | 'status'>

export interface OrderRepository {
  /** `duplicate` kalau ID sudah ada — data lama tidak ditimpa. */
  insert(order: NewOrder): Promise<'created' | 'duplicate'>
  /** Terbaru dulu. Tanpa batch = semua. */
  list(batch?: string): Promise<StoredOrder[]>
  /** Nama batch yang ada di data. */
  batchNames(): Promise<string[]>
  updateStatus(id: string, status: OrderStatus): Promise<StoredOrder | null>
}

/** Repository di memori, untuk test. */
export function createMemoryRepository(): OrderRepository {
  const rows: StoredOrder[] = []
  return {
    async insert(order) {
      if (rows.some((row) => row.id === order.id)) return 'duplicate'
      const now = new Date().toISOString()
      rows.push({ ...order, createdAt: now, updatedAt: now, status: 'Baru' })
      return 'created'
    },
    async list(batch) {
      // Urutan sisip dibalik = terbaru dulu (createdAt bisa sama dalam satu milidetik).
      return rows.filter((row) => batch === undefined || row.batch === batch).reverse()
    },
    async batchNames() {
      return [...new Set(rows.map((row) => row.batch))]
    },
    async updateStatus(id, status) {
      const row = rows.find((r) => r.id === id)
      if (!row) return null
      row.status = status
      row.updatedAt = new Date().toISOString()
      return { ...row }
    },
  }
}
