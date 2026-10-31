import { getRepository } from '../../server/db.js'
import { noDatabase, readJson, requireAdmin, toResponse } from '../../server/http.js'
import { handleAdminCreate, handleListOrders } from '../../server/orders.js'
import { nowInJakarta } from '../../server/time.js'

/** Daftar pesanan, opsional ?batch=. */
export async function GET(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const repo = getRepository()
  if (!repo) return noDatabase()
  try {
    return toResponse(await handleListOrders(new URL(request.url).searchParams.get('batch'), { repo }))
  } catch (error) {
    console.error('Gagal memuat pesanan', error)
    return noDatabase()
  }
}

/** Tambah pesanan dari chat WA. */
export async function POST(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const body = await readJson(request)
  if (!body.ok) return body.response
  const repo = getRepository()
  if (!repo) return noDatabase()
  try {
    return toResponse(await handleAdminCreate(body.value, { repo, now: nowInJakarta() }))
  } catch (error) {
    console.error('Gagal menambah pesanan', error)
    return noDatabase()
  }
}
