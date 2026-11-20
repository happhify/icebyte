import { describe, expect, it } from 'vitest'
import { MAX_PROOF_BYTES, checkProofFile, formatFileSize } from './proofFile'

describe('cek foto bukti bayar di browser', () => {
  it('JPG/PNG/WebP sampai 5 MB lolos', () => {
    expect(checkProofFile({ type: 'image/jpeg', size: MAX_PROOF_BYTES })).toBeNull()
    expect(checkProofFile({ type: 'image/png', size: 1000 })).toBeNull()
    expect(checkProofFile({ type: 'image/webp', size: 1000 })).toBeNull()
  })

  it('format lain (mis. HEIC/PDF) dan > 5 MB ditolak dengan saran screenshot', () => {
    expect(checkProofFile({ type: 'image/heic', size: 1000 })).toContain('JPG atau PNG')
    expect(checkProofFile({ type: 'application/pdf', size: 1000 })).toContain('JPG atau PNG')
    expect(checkProofFile({ type: 'image/jpeg', size: MAX_PROOF_BYTES + 1 })).toContain('maksimal 5 MB')
  })

  it('ukuran mudah dibaca', () => {
    expect(formatFileSize(300)).toBe('1 KB')
    expect(formatFileSize(250 * 1024)).toBe('250 KB')
    expect(formatFileSize(4.2 * 1024 * 1024)).toBe('4.2 MB')
  })
})
