import { describe, expect, it } from 'vitest'
import {
  checkPassword,
  clearSessionCookie,
  createSessionToken,
  readCookie,
  sessionCookie,
  verifySessionToken,
} from './session.js'

const S = 'rahasia-uji-yang-panjang-sekali-32+'

describe('token sesi', () => {
  it('valid sebelum kedaluwarsa', () => {
    expect(verifySessionToken(createSessionToken(S, 1000, 60), S, 50_000)).toBe(true)
  })
  it('ditolak setelah kedaluwarsa', () => {
    expect(verifySessionToken(createSessionToken(S, 1000, 60), S, 61_001)).toBe(false)
  })
  it('secret lain ditolak', () => {
    expect(verifySessionToken(createSessionToken(S, 1000), 'lain', 2000)).toBe(false)
  })
  it('expiry yang diubah ditolak', () => {
    const [, sig] = createSessionToken(S, 1000, 60).split('.')
    expect(verifySessionToken(`999999999999.${sig}`, S, 2000)).toBe(false)
  })
  it.each([undefined, '', 'abc', '123.', '.ff', '123.zz'])('format rusak %s ditolak', (t) => {
    expect(verifySessionToken(t, S, 0)).toBe(false)
  })
  it('secret kosong tidak pernah valid', () => {
    expect(verifySessionToken(createSessionToken('', 1000), '', 2000)).toBe(false)
  })
})

describe('password', () => {
  it('cocok persis', () => {
    expect(checkPassword('icebyte', 'icebyte')).toBe(true)
    expect(checkPassword('icebyt', 'icebyte')).toBe(false)
    expect(checkPassword('ICEBYTE', 'icebyte')).toBe(false)
  })
  it('password kosong tidak pernah lolos', () => {
    expect(checkPassword('', '')).toBe(false)
  })
})

describe('cookie', () => {
  it('atribut cookie sesi', () => {
    expect(sessionCookie('t')).toBe('ib_admin=t; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=2592000')
    expect(clearSessionCookie()).toBe('ib_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0')
  })
  it('membaca cookie dari header', () => {
    expect(readCookie('a=1; ib_admin=xyz; b=2', 'ib_admin')).toBe('xyz')
    expect(readCookie('ib_admin_x=1', 'ib_admin')).toBeUndefined()
    expect(readCookie(null, 'ib_admin')).toBeUndefined()
  })
})
