import { getRepository } from '../server/db.js'
import { noDatabase, readJson, toResponse } from '../server/http.js'
import { handlePublicOrder } from '../server/orders.js'
import { nowInJakarta } from '../server/time.js'

// Foto bukti bayar maks 5 MB → ±7 MB dalam base64, ditambah data pesanan.
const MAX_BODY_BYTES = 7_400_000

/** Simpan pesanan dari form website (beserta foto bukti bayar). */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, MAX_BODY_BYTES)
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
