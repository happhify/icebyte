import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'ib_admin'
/** 30 hari. */
export const SESSION_MAX_AGE = 2_592_000

const COOKIE_ATTRS = 'HttpOnly; Secure; SameSite=Strict; Path=/api/admin'

function sign(expiry: string, secret: string): string {
  return createHmac('sha256', secret).update(expiry).digest('hex')
}

/** Token sesi: "<expiryMs>.<HMAC-SHA256(expiryMs)>". */
export function createSessionToken(secret: string, nowMs: number = Date.now(), maxAgeSec = SESSION_MAX_AGE): string {
  const expiry = String(nowMs + maxAgeSec * 1000)
  return `${expiry}.${sign(expiry, secret)}`
}

export function verifySessionToken(token: string | undefined, secret: string, nowMs: number = Date.now()): boolean {
  if (!token || !secret) return false
  const match = /^(\d+)\.([0-9a-f]{64})$/.exec(token)
  if (!match) return false
  const [, expiry, signature] = match
  const expected = Buffer.from(sign(expiry, secret), 'hex')
  const given = Buffer.from(signature, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false
  return Number(expiry) > nowMs
}

/** Bandingkan password tanpa membocorkan panjang/isi lewat waktu. Password kosong tidak pernah lolos. */
export function checkPassword(input: string, expected: string): boolean {
  if (!input || !expected) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(input), digest(expected))
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; ${COOKIE_ATTRS}; Max-Age=${SESSION_MAX_AGE}`
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${COOKIE_ATTRS}; Max-Age=0`
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=')
    if (index !== -1 && pair.slice(0, index).trim() === name) return pair.slice(index + 1).trim()
  }
  return undefined
}
