import { randomBytes } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

/**
 * Khusus `npm run dev`: menjalankan fungsi di folder api/ langsung di Vite, supaya form PO (termasuk upload bukti
 * bayar) dan halaman /admin bisa dicoba di localhost tanpa Vercel CLI.
 * - Data disimpan di memori (hilang saat dev server berhenti) — database asli tidak pernah tersentuh.
 * - Password admin lokal: ADMIN_PASSWORD di environment, atau "icebyte-lokal-123".
 * Tidak ikut ke build produksi (apply: 'serve').
 */
const ROUTES: [RegExp, string][] = [
  [/^\/api\/orders$/, '/api/orders.ts'],
  [/^\/api\/admin\/login$/, '/api/admin/login.ts'],
  [/^\/api\/admin\/logout$/, '/api/admin/logout.ts'],
  [/^\/api\/admin\/orders$/, '/api/admin/orders.ts'],
  [/^\/api\/admin\/orders\/[^/]+$/, '/api/admin/orders/[id].ts'],
  [/^\/api\/admin\/proof$/, '/api/admin/proof.ts'],
]

export const DEV_ADMIN_PASSWORD = 'icebyte-lokal-123'

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

export function devApi(): Plugin {
  return {
    name: 'icebyte-dev-api',
    apply: 'serve',
    configureServer(server) {
      process.env.ICEBYTE_MEMORY_DB = '1'
      process.env.ADMIN_PASSWORD ||= DEV_ADMIN_PASSWORD
      process.env.SESSION_SECRET ||= randomBytes(32).toString('hex')

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const file = ROUTES.find(([pattern]) => pattern.test(url.pathname))?.[1]
        if (!file) return next()
        try {
          const mod = (await server.ssrLoadModule(file)) as Record<string, (r: Request) => Promise<Response>>
          const handler = mod[req.method ?? 'GET']
          if (!handler) {
            res.statusCode = 405
            res.end()
            return
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
          }
          const response = await handler(
            new Request(url, { method: req.method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          // Safari menolak cookie "Secure" di http://localhost, jadi atribut itu dilepas khusus lokal.
          const cookies = response.headers.getSetCookie().map((c) => c.replace(/;\s*Secure/i, ''))
          if (cookies.length > 0) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(`[dev-api] ${String(error)}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Dev API error, lihat terminal.' }))
        }
      })
    },
  }
}
