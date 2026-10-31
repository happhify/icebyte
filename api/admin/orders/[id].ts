import { getRepository } from '../../../server/db.js'
import { noDatabase, readJson, requireAdmin, toResponse } from '../../../server/http.js'
import { handleUpdateStatus } from '../../../server/orders.js'

/** Ubah status pesanan. */
export async function PATCH(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const body = await readJson(request, 1024)
  if (!body.ok) return body.response
  const repo = getRepository()
  if (!repo) return noDatabase()
  const id = decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '')
  try {
    return toResponse(await handleUpdateStatus(id, body.value, { repo }))
  } catch (error) {
    console.error('Gagal mengubah status', error)
    return noDatabase()
  }
}
