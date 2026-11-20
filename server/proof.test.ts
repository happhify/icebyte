import { describe, expect, it } from 'vitest'
import { MAX_PROOF_BYTES, parseProof } from './proof.js'

const JPEG = [0xff, 0xd8, 0xff, 0xe0]
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const WEBP = [...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)))

/** File palsu: header tertentu lalu diisi sampai `size` byte, dalam base64. */
function file(header: number[], size = 64): string {
  const bytes = new Uint8Array(size)
  bytes.set(header)
  return Buffer.from(bytes).toString('base64')
}

describe('bukti bayar', () => {
  it.each([
    ['JPEG', JPEG, 'image/jpeg'],
    ['PNG', PNG, 'image/png'],
    ['WebP', WEBP, 'image/webp'],
  ])('%s diterima dengan jenis dari isi file', (_, header, mime) => {
    const result = parseProof({ data: file(header) })
    expect(result.ok && result.value.mime).toBe(mime)
    expect(result.ok && result.value.bytes.length).toBe(64)
  })

  it('jenis ditentukan dari isi, bukan klaim browser', () => {
    const pdf = file([...'%PDF-1.7'].map((c) => c.charCodeAt(0)))
    const result = parseProof({ data: pdf, type: 'image/jpeg' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('JPG, PNG, atau WebP')
  })

  it.each([
    ['tidak ada', undefined],
    ['bukan objek', 'abc'],
    ['data kosong', { data: '' }],
    ['bukan base64', { data: '%%%' }],
  ])('%s → wajib upload', (_, raw) => {
    const result = parseProof(raw)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toMatch(/bukti bayar/i)
  })

  it('tepat 5 MB diterima, lebih 1 byte ditolak', () => {
    expect(parseProof({ data: file(JPEG, MAX_PROOF_BYTES) }).ok).toBe(true)
    const big = parseProof({ data: file(JPEG, MAX_PROOF_BYTES + 1) })
    expect(big.ok).toBe(false)
    expect(!big.ok && big.error).toContain('5 MB')
  })
})
