import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { OrderStatus, StoredOrder } from '../src/types/index.js'
import type { Proof, ProofMime } from './proof.js'
import { createMemoryRepository, type NewOrder, type OrderRepository } from './repository.js'

type Sql = NeonQueryFunction<false, false>

// Dibuat otomatis saat pertama dipakai, supaya tim tidak perlu menjalankan SQL apa pun.
async function ensureSchema(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id            text PRIMARY KEY,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      source        text NOT NULL CHECK (source IN ('Website', 'Chat WA')),
      batch         text NOT NULL,
      delivery_date date NOT NULL,
      name          text NOT NULL,
      phone         text NOT NULL,
      method        text NOT NULL CHECK (method IN ('pickup', 'delivery')),
      address       text NOT NULL DEFAULT '',
      notes         text NOT NULL DEFAULT '',
      admin         text NOT NULL DEFAULT '',
      lines         jsonb NOT NULL,
      units         jsonb NOT NULL,
      items_summary text NOT NULL,
      total         integer NOT NULL,
      status        text NOT NULL DEFAULT 'Baru' CHECK (status IN ('Baru', 'Lunas', 'Diantar', 'Batal'))
    )`
  await sql`CREATE INDEX IF NOT EXISTS orders_batch_idx ON orders (batch, created_at)`
  // Foto bukti bayar di tabel terpisah supaya daftar pesanan tetap ringan.
  await sql`
    CREATE TABLE IF NOT EXISTS payment_proofs (
      order_id   text PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      mime       text NOT NULL,
      size       integer NOT NULL,
      data       bytea NOT NULL
    )`
}

type Row = Record<string, unknown>

const iso = (value: unknown) => new Date(value as string | Date).toISOString()

function toStoredOrder(row: Row): StoredOrder {
  return {
    id: row.id as string,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    source: row.source as StoredOrder['source'],
    batch: row.batch as string,
    deliveryDate: row.delivery_date as string,
    name: row.name as string,
    phone: row.phone as string,
    method: row.method as StoredOrder['method'],
    address: row.address as string,
    notes: row.notes as string,
    admin: row.admin as string,
    lines: row.lines as StoredOrder['lines'],
    units: row.units as StoredOrder['units'],
    itemsSummary: row.items_summary as string,
    total: Number(row.total),
    status: row.status as OrderStatus,
    hasProof: row.has_proof === true,
  }
}

export function createPostgresRepository(sql: Sql): OrderRepository {
  let ready: Promise<void> | undefined
  const schema = () => {
    ready ??= ensureSchema(sql).catch((error: unknown) => {
      ready = undefined // coba lagi di request berikutnya
      throw error
    })
    return ready
  }
  // Konstanta tetap (bukan input pengguna), jadi aman lewat unsafe().
  const columns = sql.unsafe(
    'id, created_at, updated_at, source, batch, delivery_date::text AS delivery_date, name, phone, method, ' +
      'address, notes, admin, lines, units, items_summary, total, status, ' +
      'EXISTS (SELECT 1 FROM payment_proofs p WHERE p.order_id = orders.id) AS has_proof',
  )

  return {
    async insert(o: NewOrder, proof?: Proof) {
      await schema()
      // Satu statement: foto hanya ikut tersimpan kalau pesanannya benar-benar baru (bukan ID yang sudah ada).
      const rows = await sql`
        WITH new_order AS (
          INSERT INTO orders (id, source, batch, delivery_date, name, phone, method, address, notes, admin, lines,
            units, items_summary, total)
          VALUES (${o.id}, ${o.source}, ${o.batch}, ${o.deliveryDate}, ${o.name}, ${o.phone}, ${o.method},
            ${o.address}, ${o.notes}, ${o.admin}, ${JSON.stringify(o.lines)}::jsonb, ${JSON.stringify(o.units)}::jsonb,
            ${o.itemsSummary}, ${o.total})
          ON CONFLICT (id) DO NOTHING
          RETURNING id
        ), new_proof AS (
          INSERT INTO payment_proofs (order_id, mime, size, data)
          SELECT id, ${proof?.mime ?? ''}::text, ${proof?.bytes.length ?? 0}::integer,
            decode(${proof ? Buffer.from(proof.bytes).toString('hex') : ''}::text, 'hex')
          FROM new_order WHERE ${proof !== undefined}::boolean
        )
        SELECT id FROM new_order`
      return rows.length > 0 ? 'created' : 'duplicate'
    },
    async getProof(id: string) {
      await schema()
      const rows = await sql`SELECT mime, encode(data, 'hex') AS data FROM payment_proofs WHERE order_id = ${id}`
      if (rows.length === 0) return null
      const row = rows[0] as Row
      return { mime: row.mime as ProofMime, bytes: new Uint8Array(Buffer.from(row.data as string, 'hex')) }
    },
    async list(batch?: string) {
      await schema()
      const rows =
        batch === undefined
          ? await sql`SELECT ${columns} FROM orders ORDER BY created_at DESC`
          : await sql`SELECT ${columns} FROM orders WHERE batch = ${batch} ORDER BY created_at DESC`
      return (rows as Row[]).map(toStoredOrder)
    },
    async batchNames() {
      await schema()
      const rows = await sql`SELECT DISTINCT batch FROM orders`
      return (rows as Row[]).map((row) => row.batch as string)
    },
    async updateStatus(id: string, status: OrderStatus) {
      await schema()
      const rows = await sql`
        UPDATE orders SET status = ${status}, updated_at = now() WHERE id = ${id} RETURNING ${columns}`
      return rows.length > 0 ? toStoredOrder(rows[0] as Row) : null
    },
  }
}

let cached: OrderRepository | undefined

/** null kalau database belum disambungkan (DATABASE_URL / POSTGRES_URL kosong). */
export function getRepository(): OrderRepository | null {
  // `npm run dev` (vite.devApi.ts): data di memori, disimpan di globalThis supaya tetap ada saat modul dimuat ulang.
  if (process.env.ICEBYTE_MEMORY_DB === '1') {
    const store = globalThis as { __icebyteMemoryRepo?: OrderRepository }
    store.__icebyteMemoryRepo ??= createMemoryRepository()
    return store.__icebyteMemoryRepo
  }
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) return null
  cached ??= createPostgresRepository(neon(url))
  return cached
}
