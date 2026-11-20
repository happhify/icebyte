/** Foto bukti bayar disimpan apa adanya (tidak diperkecil), jadi ukurannya dibatasi. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024
/** Batas body JSON pesanan yang membawa foto: 5 MB → ±7 MB dalam base64, ditambah data pesanan. */
export const MAX_ORDER_BODY_BYTES = 7_400_000

export type ProofMime = 'image/jpeg' | 'image/png' | 'image/webp'

export interface Proof {
  mime: ProofMime
  bytes: Uint8Array
}

export type ParsedProof = { ok: true; value: Proof } | { ok: false; error: string }

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

const startsWith = (bytes: Uint8Array, header: number[], offset = 0) =>
  header.every((byte, i) => bytes[offset + i] === byte)

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** Jenis gambar dari isi file (magic bytes). Klaim jenis dari browser tidak dipercaya. */
function detectMime(bytes: Uint8Array): ProofMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  return null
}

/** `{ data: base64 }` dari form → foto yang aman disimpan, atau pesan error untuk pembeli. */
export function parseProof(raw: unknown): ParsedProof {
  const data = typeof raw === 'object' && raw !== null ? (raw as { data?: unknown }).data : undefined
  if (typeof data !== 'string' || !BASE64.test(data)) {
    return { ok: false, error: 'Bukti bayar wajib diupload.' }
  }
  // Cek ukuran dari panjang base64 dulu supaya file raksasa tidak perlu di-decode.
  if (Math.floor((data.length * 3) / 4) - 2 > MAX_PROOF_BYTES) {
    return { ok: false, error: 'Bukti bayar maksimal 5 MB. Kirim screenshot bukti bayar saja.' }
  }
  const bytes = new Uint8Array(Buffer.from(data, 'base64'))
  if (bytes.length === 0) return { ok: false, error: 'Bukti bayar wajib diupload.' }
  if (bytes.length > MAX_PROOF_BYTES) {
    return { ok: false, error: 'Bukti bayar maksimal 5 MB. Kirim screenshot bukti bayar saja.' }
  }
  const mime = detectMime(bytes)
  if (!mime) return { ok: false, error: 'Bukti bayar harus berupa foto JPG, PNG, atau WebP.' }
  return { ok: true, value: { mime, bytes } }
}
