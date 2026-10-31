import { site } from '../src/config/site.js'
import {
  ORDER_STATUSES,
  calculateOrderTotal,
  createOrderId,
  getOpenBatch,
  getProductionUnits,
  hasErrors,
  summarizeOrder,
  validateOrder,
} from '../src/lib/order.js'
import type { OrderErrors, OrderInput, OrderLine, OrderSource, OrderStatus, PoBatch } from '../src/types/index.js'
import type { NewOrder, OrderRepository } from './repository.js'

export interface ApiResult {
  status: number
  body: unknown
}

const ORDER_ID = /^IB-\d{4}-[A-HJ-NP-Z2-9]{4}$/
const LIMITS = { name: 80, phone: 30, address: 200, notes: 300 } as const
const MAX_LINES = 20
const MAX_QTY = 99

const invalid = (error: string, fields?: OrderErrors): ApiResult => ({
  status: 400,
  body: fields ? { error, fields } : { error },
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

type Parsed<T> = { ok: true; value: T } | { ok: false; result: ApiResult }

/** Periksa bentuk & batas data mentah dari JSON. Aturan bisnis (menu, varian, batch) dicek validateOrder. */
function parseOrderInput(body: unknown): Parsed<OrderInput> {
  if (!isRecord(body)) return { ok: false, result: invalid('Format pesanan tidak dikenali.') }

  const text: Partial<Record<keyof typeof LIMITS, string>> = {}
  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const raw = body[field] ?? ''
    if (typeof raw !== 'string') return { ok: false, result: invalid(`Kolom ${field} harus berupa teks.`) }
    const value = raw.trim()
    if (value.length > LIMITS[field]) {
      return { ok: false, result: invalid(`Kolom ${field} maksimal ${LIMITS[field]} karakter.`) }
    }
    text[field] = value
  }

  if (body.method !== 'pickup' && body.method !== 'delivery') {
    return { ok: false, result: invalid('Metode tidak dikenali.') }
  }
  if (!site.contact.whatsappAdmins.some((admin) => admin.label === body.admin)) {
    return { ok: false, result: invalid('Admin tidak dikenali.') }
  }

  const rawLines = body.lines
  if (!Array.isArray(rawLines) || rawLines.length === 0 || rawLines.length > MAX_LINES) {
    return { ok: false, result: invalid(`Pesanan harus berisi 1–${MAX_LINES} item.`) }
  }
  const lines: OrderInput['lines'] = []
  for (const line of rawLines) {
    if (
      !isRecord(line) ||
      (line.kind !== 'product' && line.kind !== 'bundle') ||
      typeof line.itemId !== 'string' ||
      !Number.isInteger(line.qty) ||
      (line.qty as number) < 1 ||
      (line.qty as number) > MAX_QTY ||
      !isRecord(line.options ?? {}) ||
      !Object.values(line.options ?? {}).every((v) => typeof v === 'string')
    ) {
      return { ok: false, result: invalid(`Item pesanan tidak valid (jumlah 1–${MAX_QTY}).`) }
    }
    lines.push({
      kind: line.kind,
      itemId: line.itemId,
      qty: line.qty as number,
      options: { ...(line.options as Record<string, string> | undefined) },
    })
  }

  return {
    ok: true,
    value: {
      name: text.name ?? '',
      phone: text.phone ?? '',
      address: text.address ?? '',
      notes: text.notes ?? '',
      method: body.method,
      admin: body.admin as string,
      lines,
    },
  }
}

const toOrderLines = (input: OrderInput): OrderLine[] => input.lines.map((line, i) => ({ key: `l${i}`, ...line }))

/** Aturan bisnis dari src/lib/order.ts. `errors.batch` dikembalikan terpisah: publik → 409, admin → diabaikan. */
function checkBusinessRules(input: OrderInput, now: Date): { errors: OrderErrors; batchError?: string } {
  const { batch, ...errors } = validateOrder({ ...input, lines: toOrderLines(input) }, now)
  return { errors, batchError: batch }
}

function buildNewOrder(input: OrderInput, id: string, source: OrderSource, batch: PoBatch): NewOrder {
  const lines = toOrderLines(input)
  return {
    id,
    source,
    batch: batch.name,
    deliveryDate: batch.fulfillmentDate,
    name: input.name,
    phone: input.phone,
    method: input.method,
    address: input.method === 'delivery' ? input.address : '',
    notes: input.notes,
    admin: input.admin,
    lines: input.lines,
    units: getProductionUnits(lines),
    itemsSummary: summarizeOrder(lines),
    total: calculateOrderTotal(lines),
  }
}

/** POST /api/orders — pesanan dari form website. `now` sudah dalam WIB. */
export async function handlePublicOrder(
  body: unknown,
  { repo, now }: { repo: OrderRepository; now: Date },
): Promise<ApiResult> {
  if (isRecord(body) && typeof body.website === 'string' && body.website.trim() !== '') {
    // Honeypot terisi: kemungkinan bot. Pura-pura berhasil supaya bot tidak mencoba cara lain.
    return { status: 201, body: { id: typeof body.id === 'string' ? body.id : '' } }
  }
  if (!isRecord(body) || typeof body.id !== 'string' || !ORDER_ID.test(body.id)) {
    return invalid('ID pesanan tidak valid.')
  }
  const id = body.id
  const parsed = parseOrderInput(body)
  if (!parsed.ok) return parsed.result

  const { errors, batchError } = checkBusinessRules(parsed.value, now)
  if (hasErrors(errors)) return invalid('Data pesanan tidak valid.', errors)
  const batch = getOpenBatch(now)
  if (batchError || !batch) return { status: 409, body: { error: batchError ?? 'PO sedang tutup.' } }

  const outcome = await repo.insert(buildNewOrder(parsed.value, id, 'Website', batch))
  return outcome === 'created' ? { status: 201, body: { id } } : { status: 200, body: { id, duplicate: true } }
}

/** POST /api/admin/orders — pesanan dari chat WA. Batch dipilih admin dan boleh sudah tutup. */
export async function handleAdminCreate(
  body: unknown,
  { repo, now, random = Math.random }: { repo: OrderRepository; now: Date; random?: () => number },
): Promise<ApiResult> {
  const batch = isRecord(body) ? site.batches.find((b) => b.name === body.batch) : undefined
  if (!batch) return invalid('Pilih batch yang ada.')
  const parsed = parseOrderInput(body)
  if (!parsed.ok) return parsed.result
  const { errors } = checkBusinessRules(parsed.value, now)
  if (hasErrors(errors)) return invalid('Data pesanan tidak valid.', errors)

  // ID acak bisa bentrok (sangat jarang); coba beberapa kali.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = createOrderId(now, random)
    if ((await repo.insert(buildNewOrder(parsed.value, id, 'Chat WA', batch))) === 'created') {
      const order = (await repo.list(batch.name)).find((o) => o.id === id)
      return { status: 201, body: { order } }
    }
  }
  return { status: 503, body: { error: 'Gagal membuat ID pesanan, coba lagi.' } }
}

/** GET /api/admin/orders?batch= */
export async function handleListOrders(
  batch: string | null,
  { repo }: { repo: OrderRepository },
): Promise<ApiResult> {
  const [orders, stored] = await Promise.all([repo.list(batch ?? undefined), repo.batchNames()])
  const batches = [...new Set([...site.batches.map((b) => b.name), ...stored])]
  return { status: 200, body: { orders, batches } }
}

/** PATCH /api/admin/orders/:id */
export async function handleUpdateStatus(
  id: string,
  body: unknown,
  { repo }: { repo: OrderRepository },
): Promise<ApiResult> {
  const status = isRecord(body) ? body.status : undefined
  if (!ORDER_STATUSES.includes(status as OrderStatus)) return invalid('Status tidak dikenali.')
  const order = await repo.updateStatus(id, status as OrderStatus)
  return order ? { status: 200, body: { order } } : { status: 404, body: { error: 'Pesanan tidak ditemukan.' } }
}
