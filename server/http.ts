import type { ApiResult } from './orders.js'
import { SESSION_COOKIE, readCookie, verifySessionToken } from './session.js'

export function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  const response = new Response(JSON.stringify(body), { status, headers })
  response.headers.set('content-type', 'application/json; charset=utf-8')
  response.headers.set('cache-control', 'no-store')
  return response
}

export const toResponse = (result: ApiResult): Response => json(result.status, result.body)

export const noDatabase = (): Response => json(503, { error: 'Database belum tersambung' })

/** Baca body JSON dengan batas ukuran. Mutasi wajib `application/json` (bagian dari perlindungan CSRF). */
export async function readJson(
  request: Request,
  maxBytes = 16_384,
): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const type = request.headers.get('content-type') ?? ''
  if (!/^application\/json\b/i.test(type)) {
    return { ok: false, response: json(415, { error: 'Kirim data sebagai application/json.' }) }
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, response: json(413, { error: 'Data terlalu besar.' }) }
  }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, response: json(400, { error: 'JSON tidak valid.' }) }
  }
}

export function adminEnv(): { password: string; secret: string } | null {
  const password = process.env.ADMIN_PASSWORD ?? ''
  const secret = process.env.SESSION_SECRET ?? ''
  return password && secret ? { password, secret } : null
}

/** null = boleh lanjut; selain itu respons error yang langsung dikembalikan. */
export function requireAdmin(request: Request): Response | null {
  const env = adminEnv()
  if (!env) return json(503, { error: 'Password admin belum diatur' })
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE)
  if (!verifySessionToken(token, env.secret)) return json(401, { error: 'Sesi berakhir, silakan login lagi.' })
  return null
}
