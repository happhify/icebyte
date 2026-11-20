import type { OrderStatus, StoredOrder } from '../src/types/index.js'
import type { Proof } from './proof.js'

/** Pesanan baru: semua data kecuali yang diisi database (waktu, status, ada/tidaknya bukti bayar). */
export type NewOrder = Omit<StoredOrder, 'createdAt' | 'updatedAt' | 'status' | 'hasProof'>

export interface OrderRepository {
  /**
   * `duplicate` kalau ID sudah ada — data lama (termasuk foto) tidak ditimpa.
   * Foto hanya disimpan bersama pesanan yang baru dibuat, dalam satu operasi.
   */
  insert(order: NewOrder, proof?: Proof): Promise<'created' | 'duplicate'>
  getProof(id: string): Promise<Proof | null>
  /** Terbaru dulu. Tanpa batch = semua. */
  list(batch?: string): Promise<StoredOrder[]>
  /** Nama batch yang ada di data. */
  batchNames(): Promise<string[]>
  updateStatus(id: string, status: OrderStatus): Promise<StoredOrder | null>
}

/** Repository di memori, untuk test. */
export function createMemoryRepository(): OrderRepository {
  const rows: StoredOrder[] = []
  const proofs = new Map<string, Proof>()
  return {
    async insert(order, proof) {
      if (rows.some((row) => row.id === order.id)) return 'duplicate'
      const now = new Date().toISOString()
      rows.push({ ...order, createdAt: now, updatedAt: now, status: 'Baru', hasProof: proof !== undefined })
      if (proof) proofs.set(order.id, proof)
      return 'created'
    },
    async getProof(id) {
      return proofs.get(id) ?? null
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
