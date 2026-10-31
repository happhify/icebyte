import { afterEach, describe, expect, it } from 'vitest'
import { readJson, requireAdmin } from './http.js'
import { createSessionToken } from './session.js'

const req = (body: string, type = 'application/json') =>
  new Request('https://x/api/orders', { method: 'POST', headers: { 'content-type': type }, body })

const statusOf = async (p: ReturnType<typeof readJson>) => {
  const r = await p
  return r.ok ? 200 : r.response.status
}

describe('readJson', () => {
  it('JSON valid', async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ ok: true, value: { a: 1 } })
  })
  it('content-type dengan charset tetap diterima', async () => {
    expect(await statusOf(readJson(req('{}', 'application/json; charset=utf-8')))).toBe(200)
  })
  it('content-type salah → 415', async () => {
    expect(await statusOf(readJson(req('{}', 'text/plain')))).toBe(415)
  })
  it('terlalu besar → 413', async () => {
    expect(await statusOf(readJson(req(JSON.stringify('a'.repeat(16400)))))).toBe(413)
  })
  it('JSON rusak → 400', async () => {
    expect(await statusOf(readJson(req('{')))).toBe(400)
  })
})

describe('requireAdmin', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })
  const withCookie = (cookie?: string) =>
    new Request('https://x/api/admin/orders', cookie ? { headers: { cookie } } : {})

  it('env kosong → 503', async () => {
    delete process.env.ADMIN_PASSWORD
    delete process.env.SESSION_SECRET
    expect(requireAdmin(withCookie())?.status).toBe(503)
  })
  it('password admin kurang dari 12 karakter → 503 dengan pesan jelas', async () => {
    process.env.ADMIN_PASSWORD = 'pendek123'
    process.env.SESSION_SECRET = 'rahasia'
    const res = requireAdmin(withCookie(`ib_admin=${createSessionToken('rahasia')}`))
    expect(res?.status).toBe(503)
    expect(await res?.json()).toEqual({ error: 'Password admin terlalu pendek (minimal 12 karakter)' })
  })
  it('tanpa cookie → 401', async () => {
    process.env.ADMIN_PASSWORD = 'password-panjang-12'
    process.env.SESSION_SECRET = 'rahasia'
    expect(requireAdmin(withCookie())?.status).toBe(401)
  })
  it('cookie valid → null (boleh lanjut)', async () => {
    process.env.ADMIN_PASSWORD = 'password-panjang-12'
    process.env.SESSION_SECRET = 'rahasia'
    expect(requireAdmin(withCookie(`ib_admin=${createSessionToken('rahasia')}`))).toBeNull()
  })
})
