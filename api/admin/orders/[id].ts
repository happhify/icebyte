import { getRepository } from '../../../server/db.js'
import { noDatabase, readJson, requireAdmin, toResponse } from '../../../server/http.js'
import { handleDeleteOrder, handleUpdateStatus } from '../../../server/orders.js'

const orderId = (request: Request) => decodeURIComponent(new URL(request.url).pathname.split('/').pop() ?? '')

/** Ubah status pesanan. */
export async function PATCH(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const body = await readJson(request, 1024)
  if (!body.ok) return body.response
  const repo = getRepository()
  if (!repo) return noDatabase()
  const id = orderId(request)
  try {
    return toResponse(await handleUpdateStatus(id, body.value, { repo }))
  } catch (error) {
    console.error('Gagal mengubah status', error)
    return noDatabase()
  }
}

/** Hapus pesanan (permanen, termasuk bukti bayar). */
export async function DELETE(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const repo = getRepository()
  if (!repo) return noDatabase()
  try {
    return toResponse(await handleDeleteOrder(orderId(request), { repo }))
  } catch (error) {
    console.error('Gagal menghapus pesanan', error)
    return noDatabase()
  }
}
