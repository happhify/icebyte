import { getRepository } from '../../server/db.js'
import { noDatabase, requireAdmin, toResponse } from '../../server/http.js'
import { handleGetProof } from '../../server/orders.js'

/** Foto bukti bayar, ?id=IB-…. Hanya untuk admin yang sudah login. */
export async function GET(request: Request): Promise<Response> {
  const denied = requireAdmin(request)
  if (denied) return denied
  const repo = getRepository()
  if (!repo) return noDatabase()
  try {
    const found = await handleGetProof(new URL(request.url).searchParams.get('id') ?? '', { repo })
    if (!found.ok) return toResponse(found.result)
    return new Response(new Uint8Array(found.proof.bytes), {
      headers: {
        'content-type': found.proof.mime,
        'content-disposition': 'inline',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Gagal memuat bukti bayar', error)
    return noDatabase()
  }
}
