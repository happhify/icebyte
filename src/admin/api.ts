import type { OrderInput, OrderStatus, StoredOrder } from '../types'

/** Sesi admin habis / belum login. */
export class UnauthorizedError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (response.status === 401) throw new UnauthorizedError('Sesi berakhir, silakan login lagi.')
  if (response.status === 204) return undefined as T
  // Balasan bukan JSON (mis. halaman HTML karena /api tidak tersedia) tidak boleh dianggap data.
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
  const body = isJson ? ((await response.json().catch(() => null)) as { error?: string } | null) : null
  if (!response.ok) throw new Error(body?.error ?? `Gagal (${response.status}). Coba lagi.`)
  if (!body) throw new Error('Server rekap tidak merespons dengan benar. Coba lagi nanti.')
  return body as T
}

export async function login(password: string): Promise<void> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (response.ok) return
  const body = (await response.json().catch(() => ({}))) as { error?: string }
  throw new Error(body.error ?? 'Gagal masuk. Coba lagi.')
}

export const logout = () => request<void>('/api/admin/logout', { method: 'POST' })

export const fetchOrders = (batch: string | null) =>
  request<{ orders: StoredOrder[]; batches: string[] }>(
    `/api/admin/orders${batch === null ? '' : `?batch=${encodeURIComponent(batch)}`}`,
  )

export async function createOrder(input: OrderInput & { batch: string }): Promise<StoredOrder> {
  const { order } = await request<{ order: StoredOrder }>('/api/admin/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return order
}

export async function updateStatus(id: string, status: OrderStatus): Promise<StoredOrder> {
  const { order } = await request<{ order: StoredOrder }>(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return order
}
