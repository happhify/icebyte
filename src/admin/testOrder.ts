import type { StoredOrder } from '../types'

/** Pesanan lengkap untuk test; isi yang relevan lewat `patch`. */
export function order(patch: Partial<StoredOrder> = {}): StoredOrder {
  return {
    id: 'IB-1031-AAAA',
    createdAt: '2026-10-31T03:00:00.000Z',
    updatedAt: '2026-10-31T03:00:00.000Z',
    source: 'Website',
    batch: 'Batch 1',
    deliveryDate: '2026-11-08',
    name: 'Rara',
    phone: '0812-3456-7890',
    method: 'delivery',
    address: 'Kos Melati',
    notes: '',
    admin: 'Admin 1',
    lines: [],
    units: [],
    itemsSummary: '',
    total: 0,
    status: 'Baru',
    ...patch,
  }
}
