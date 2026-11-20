import { getRepository } from '../server/db.js'
import { noDatabase, readJson, toResponse } from '../server/http.js'
import { handlePublicOrder } from '../server/orders.js'
import { MAX_ORDER_BODY_BYTES } from '../server/proof.js'
import { nowInJakarta } from '../server/time.js'

/** Simpan pesanan dari form website (beserta foto bukti bayar). */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_ORDER_BODY_BYTES)
  if (!body.ok) return body.response
  const repo = getRepository()
  if (!repo) return noDatabase()
  try {
    return toResponse(await handlePublicOrder(body.value, { repo, now: nowInJakarta() }))
  } catch (error) {
    console.error('Gagal menyimpan pesanan', error)
    return noDatabase()
  }
}
