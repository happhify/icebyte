import { adminEnv, json, readJson } from '../../server/http.js'
import { checkPassword, createSessionToken, sessionCookie } from '../../server/session.js'

const FAILED_LOGIN_DELAY_MS = 1000

export async function POST(request: Request): Promise<Response> {
  const env = adminEnv()
  if (!env) return json(503, { error: 'Password admin belum diatur' })
  const body = await readJson(request, 1024)
  if (!body.ok) return body.response
  const password =
    typeof body.value === 'object' && body.value !== null ? (body.value as { password?: unknown }).password : undefined
  if (typeof password !== 'string' || !checkPassword(password, env.password)) {
    // Jeda supaya password sulit ditebak beruntun.
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS))
    return json(401, { error: 'Password salah.' })
  }
  return new Response(null, {
    status: 204,
    headers: { 'set-cookie': sessionCookie(createSessionToken(env.secret)), 'cache-control': 'no-store' },
  })
}
