import { clearSessionCookie } from '../../server/session.js'

export async function POST(): Promise<Response> {
  return new Response(null, { status: 204, headers: { 'set-cookie': clearSessionCookie(), 'cache-control': 'no-store' } })
}
