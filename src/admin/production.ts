import { ORDER_STATUSES } from '../lib/order'
import type { OrderStatus, ProductionUnit, StoredOrder } from '../types'

export interface ProductionSummary {
  /** Digabung per produk + varian, urut produk lalu varian. */
  units: ProductionUnit[]
  totalPcs: number
  revenue: number
  statusCounts: Record<OrderStatus, number>
}

/** Ringkasan produksi dari snapshot `units` tiap pesanan. Pesanan Batal hanya ikut di statusCounts. */
export function summarizeProduction(orders: StoredOrder[]): ProductionSummary {
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  const merged = new Map<string, ProductionUnit>()
  let revenue = 0

  for (const order of orders) {
    statusCounts[order.status] += 1
    if (order.status === 'Batal') continue
    revenue += order.total
    for (const unit of order.units) {
      const key = `${unit.product}\u0000${unit.variant}`
      const existing = merged.get(key)
      if (existing) existing.qty += unit.qty
      else merged.set(key, { ...unit })
    }
  }

  const units = [...merged.values()].sort(
    (a, b) => a.product.localeCompare(b.product, 'id') || a.variant.localeCompare(b.variant, 'id'),
  )
  return { units, totalPcs: units.reduce((sum, u) => sum + u.qty, 0), revenue, statusCounts }
}
